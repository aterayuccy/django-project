import re
import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken


GENERIC_LOGIN_ERROR = "使用者名稱或密碼不正確。"
DUMMY_PASSWORD_HASH = make_password(uuid.uuid4().hex)
USERNAME_VALIDATOR = UnicodeUsernameValidator(
    message="使用者名稱只能包含文字、數字及 @、.、+、-、_ 符號。"
)


def normalize_username(value):
    return value.strip().casefold()


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(
        min_length=2,
        max_length=30,
        trim_whitespace=True,
        validators=[USERNAME_VALIDATOR],
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        min_length=8,
        max_length=64,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        min_length=8,
        max_length=64,
    )

    def validate_username(self, value):
        value = normalize_username(value)

        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("這個使用者名稱已被使用。")

        return value

    def validate(self, attrs):
        password = attrs["password"]

        if password != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "兩次輸入的密碼不一致。"}
            )

        if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
            raise serializers.ValidationError(
                {"password": "密碼至少要包含一個英文字母與一個數字。"}
            )

        candidate_user = User(username=attrs["username"])

        try:
            validate_password(password, user=candidate_user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {"password": list(error.messages)}
            ) from error

        return attrs

    def create(self, validated_data):
        username = validated_data["username"]

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    password=validated_data["password"],
                )
        except IntegrityError as error:
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError(
                    {"username": "這個使用者名稱已被使用。"}
                ) from error

            raise

        return user


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        data = request.data.copy()

        # Keep the previous frontend usable while a rolling deployment switches
        # from `login_name` to the single `username` field.
        if not data.get("username") and data.get("login_name"):
            data["username"] = data["login_name"]

        serializer = RegistrationSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "註冊完成，現在可以登入。"},
            status=status.HTTP_201_CREATED,
        )


class AccountTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        username = normalize_username(
            str(request.data.get("username") or request.data.get("login_name") or "")
        )
        password = str(request.data.get("password") or "")
        user = User.objects.filter(username__iexact=username).first()

        if not user:
            check_password(password, DUMMY_PASSWORD_HASH)
            return Response(
                {"detail": GENERIC_LOGIN_ERROR},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active or not user.check_password(password):
            return Response(
                {"detail": GENERIC_LOGIN_ERROR},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "username": user.username,
            }
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"username": request.user.username})

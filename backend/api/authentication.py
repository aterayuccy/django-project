import re
import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile


GENERIC_LOGIN_ERROR = "登入帳號或密碼不正確。"
DUMMY_PASSWORD_HASH = make_password(uuid.uuid4().hex)
LOGIN_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


def normalize_login_name(value):
    return value.strip().casefold()


def get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": (user.username or "使用者")[:50],
        },
    )
    return profile


class RegistrationSerializer(serializers.Serializer):
    login_name = serializers.CharField(
        min_length=4,
        max_length=30,
        trim_whitespace=True,
    )
    display_name = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
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

    def validate_login_name(self, value):
        value = normalize_login_name(value)

        if not LOGIN_NAME_PATTERN.fullmatch(value):
            raise serializers.ValidationError(
                "登入帳號只能使用英文字母、數字與底線。"
            )

        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("這個登入帳號已被使用。")

        return value

    def validate_display_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("請輸入使用者名稱。")

        return value

    def validate(self, attrs):
        password = attrs["password"]

        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "兩次輸入的密碼不一致。"}
            )

        if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
            raise serializers.ValidationError(
                {"password": "密碼至少要包含一個英文字母與一個數字。"}
            )

        candidate_user = User(username=attrs["login_name"])

        try:
            validate_password(password, user=candidate_user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {"password": list(error.messages)}
            ) from error

        return attrs

    def create(self, validated_data):
        login_name = validated_data["login_name"]

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=login_name,
                    password=validated_data["password"],
                )
                UserProfile.objects.create(
                    user=user,
                    display_name=validated_data["display_name"],
                )
        except IntegrityError as error:
            if User.objects.filter(username__iexact=login_name).exists():
                raise serializers.ValidationError(
                    {"login_name": "這個登入帳號已被使用。"}
                ) from error

            raise

        return user


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
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
        login_name = normalize_login_name(
            str(request.data.get("login_name") or request.data.get("username") or "")
        )
        password = str(request.data.get("password") or "")
        user = User.objects.filter(username__iexact=login_name).first()

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

        profile = get_or_create_profile(user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "display_name": profile.display_name,
            }
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response({"display_name": profile.display_name})

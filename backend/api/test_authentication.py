from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import UserProfile


class AccountSecurityTests(APITestCase):
    password = "A7longerPassphrase"

    def setUp(self):
        cache.clear()

    def registration_payload(
        self,
        login_name="video_user01",
        display_name="小明",
        password=None,
    ):
        chosen_password = password or self.password
        return {
            "login_name": login_name,
            "display_name": display_name,
            "password": chosen_password,
            "password_confirm": chosen_password,
        }

    def register(
        self,
        login_name="video_user01",
        display_name="小明",
        password=None,
    ):
        return self.client.post(
            "/api/user/register/",
            self.registration_payload(login_name, display_name, password),
            format="json",
        )

    def test_registration_creates_active_account_without_email(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.data), {"detail"})

        user = User.objects.get(username="video_user01")
        self.assertTrue(user.is_active)
        self.assertEqual(user.email, "")
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.check_password(self.password))
        self.assertEqual(user.profile.display_name, "小明")

    def test_display_names_can_repeat_but_login_names_cannot(self):
        first = self.register("first_account", "同名使用者")
        second = self.register("second_account", "同名使用者")
        duplicate = self.register("FIRST_ACCOUNT", "另一個名稱")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(
            UserProfile.objects.filter(display_name="同名使用者").count(),
            2,
        )
        self.assertEqual(UserProfile.objects.count(), 2)

    def test_password_requires_eight_characters_letter_and_number(self):
        too_short = self.register("short_account", password="Abc1234")
        no_number = self.register("letter_account", password="LettersOnly")
        no_letter = self.register("number_account", password="123456789")

        self.assertEqual(too_short.status_code, 400)
        self.assertEqual(no_number.status_code, 400)
        self.assertEqual(no_letter.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_login_is_case_insensitive_and_returns_tokens(self):
        self.register("video_user01", "小明")

        login = self.client.post(
            "/api/token/",
            {"login_name": "VIDEO_USER01", "password": self.password},
            format="json",
        )

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["display_name"], "小明")
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

    def test_current_user_exposes_only_display_name(self):
        self.register()
        user = User.objects.get(username="video_user01")
        self.client.force_authenticate(user)

        response = self.client.get("/api/user/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"display_name": "小明"})
        self.assertNotIn("id", response.data)
        self.assertNotIn("username", response.data)
        self.assertNotIn("email", response.data)

    def test_existing_account_gets_profile_on_first_login(self):
        user = User.objects.create_user(
            username="legacy-user",
            password=self.password,
            is_active=True,
        )

        response = self.client.post(
            "/api/token/",
            {"login_name": "legacy-user", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "legacy-user")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

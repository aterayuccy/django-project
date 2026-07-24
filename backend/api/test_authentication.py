from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase


class AccountSecurityTests(APITestCase):
    password = "A7longerPassphrase"

    def setUp(self):
        cache.clear()

    def registration_payload(
        self,
        username="小明01",
        password=None,
    ):
        chosen_password = password or self.password
        return {
            "username": username,
            "password": chosen_password,
            "password_confirm": chosen_password,
        }

    def register(
        self,
        username="小明01",
        password=None,
    ):
        return self.client.post(
            "/api/user/register/",
            self.registration_payload(username, password),
            format="json",
        )

    def test_registration_creates_active_account_without_email(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.data), {"detail"})

        user = User.objects.get(username="小明01")
        self.assertTrue(user.is_active)
        self.assertEqual(user.email, "")
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.check_password(self.password))

    def test_usernames_are_unique_and_case_insensitive(self):
        first = self.register("VideoUser")
        duplicate = self.register("VIDEOUSER")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(User.objects.count(), 1)

    def test_unicode_usernames_are_supported(self):
        response = self.register("兔子老師")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="兔子老師").exists())

    def test_password_requires_eight_characters_letter_and_number(self):
        too_short = self.register("short_user", password="Abc1234")
        no_number = self.register("letter_user", password="LettersOnly")
        no_letter = self.register("number_user", password="123456789")

        self.assertEqual(too_short.status_code, 400)
        self.assertEqual(no_number.status_code, 400)
        self.assertEqual(no_letter.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_login_is_case_insensitive_and_returns_tokens(self):
        self.register("VideoUser")

        login = self.client.post(
            "/api/token/",
            {"username": "VIDEOUSER", "password": self.password},
            format="json",
        )

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["username"], "videouser")
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

    def test_current_user_exposes_only_username(self):
        self.register()
        user = User.objects.get(username="小明01")
        self.client.force_authenticate(user)

        response = self.client.get("/api/user/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"username": "小明01"})
        self.assertNotIn("id", response.data)
        self.assertNotIn("email", response.data)

    def test_previous_login_name_payload_remains_compatible(self):
        response = self.client.post(
            "/api/user/register/",
            {
                "login_name": "legacy_payload",
                "display_name": "舊版顯示名稱",
                "password": self.password,
                "password_confirm": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        login = self.client.post(
            "/api/token/",
            {"login_name": "legacy_payload", "password": self.password},
            format="json",
        )

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["username"], "legacy_payload")

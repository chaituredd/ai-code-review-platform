import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
class TestRegisterView:
    def test_register_success(self):
        client = Client()
        response = client.post(
            "/api/users/register/",
            {
                "username": "newuser",
                "email": "new@example.com",
                "password": "strongpass123",
                "password_confirm": "strongpass123",
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["username"] == "newuser"
        assert User.objects.filter(username="newuser").exists()

    def test_register_password_mismatch(self):
        client = Client()
        response = client.post(
            "/api/users/register/",
            {
                "username": "newuser",
                "email": "new@example.com",
                "password": "strongpass123",
                "password_confirm": "differentpass",
            },
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestLoginView:
    def test_login_success(self):
        User.objects.create_user(username="loginuser", password="testpass123")
        client = Client()
        response = client.post(
            "/api/users/login/",
            {"username": "loginuser", "password": "testpass123"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["username"] == "loginuser"

    def test_login_invalid_credentials(self):
        client = Client()
        response = client.post(
            "/api/users/login/",
            {"username": "noone", "password": "wrongpass"},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestProfileView:
    def test_get_profile_authenticated(self):
        user = User.objects.create_user(username="profuser", password="testpass123")
        client = Client()
        client.force_login(user)
        response = client.get("/api/users/me/")
        assert response.status_code == 200
        assert response.json()["username"] == "profuser"

    def test_get_profile_unauthenticated(self):
        client = Client()
        response = client.get("/api/users/me/")
        assert response.status_code == 403

    def test_update_profile(self):
        user = User.objects.create_user(username="patchuser", password="testpass123")
        client = Client()
        client.force_login(user)
        response = client.patch(
            "/api/users/me/",
            {"bio": "Updated bio", "github_username": "mygh"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["bio"] == "Updated bio"

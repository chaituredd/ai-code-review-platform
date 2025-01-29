import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="securepass123",
        )
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.check_password("securepass123")
        assert user.is_active
        assert not user.is_staff

    def test_user_string_representation(self):
        user = User(username="devuser")
        assert str(user) == "devuser"

    def test_preferred_languages_default(self):
        user = User.objects.create_user(username="languser", password="pass1234")
        assert user.preferred_languages == []

    def test_user_with_profile_fields(self):
        user = User.objects.create_user(
            username="fullprofile",
            password="pass1234",
            github_username="ghuser",
            bio="Senior developer",
            preferred_languages=["python", "typescript"],
        )
        assert user.github_username == "ghuser"
        assert user.bio == "Senior developer"
        assert "python" in user.preferred_languages

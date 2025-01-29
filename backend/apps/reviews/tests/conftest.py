import pytest
from django.contrib.auth import get_user_model

from apps.reviews.models import CodeFile, Repository, ReviewSession

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="reviewer",
        email="reviewer@test.com",
        password="testpass123",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="author",
        email="author@test.com",
        password="testpass123",
    )


@pytest.fixture
def repository(user):
    return Repository.objects.create(
        name="test-repo",
        description="A test repository",
        owner=user,
        language="python",
    )


@pytest.fixture
def code_file(repository):
    return CodeFile.objects.create(
        repository=repository,
        path="src/main.py",
        content='def hello():\n    print("Hello, world!")\n\nhello()\n',
        language="python",
        sha="abc123",
    )


@pytest.fixture
def review_session(repository, other_user, user, code_file):
    session = ReviewSession.objects.create(
        title="Test Review",
        description="Reviewing main.py",
        repository=repository,
        author=other_user,
    )
    session.reviewers.add(user)
    session.files.add(code_file)
    return session

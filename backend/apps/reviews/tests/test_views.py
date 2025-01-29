import pytest
from django.test import Client

from apps.reviews.models import Annotation, Comment, Repository


@pytest.mark.django_db
class TestRepositoryAPI:
    def test_list_repositories(self, user, repository):
        client = Client()
        client.force_login(user)
        response = client.get("/api/reviews/repositories/")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["name"] == "test-repo"

    def test_create_repository(self, user):
        client = Client()
        client.force_login(user)
        response = client.post(
            "/api/reviews/repositories/",
            {"name": "new-repo", "language": "typescript"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert Repository.objects.filter(name="new-repo").exists()

    def test_unauthenticated_access(self):
        client = Client()
        response = client.get("/api/reviews/repositories/")
        assert response.status_code == 403


@pytest.mark.django_db
class TestReviewSessionAPI:
    def test_list_sessions(self, user, review_session):
        client = Client()
        client.force_login(user)
        response = client.get("/api/reviews/sessions/")
        assert response.status_code == 200
        assert response.json()["count"] >= 1

    def test_create_session(self, user, repository):
        client = Client()
        client.force_login(user)
        response = client.post(
            "/api/reviews/sessions/",
            {
                "title": "New Review",
                "repository": str(repository.id),
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["title"] == "New Review"


@pytest.mark.django_db
class TestAnnotationAPI:
    def test_create_annotation(self, user, review_session, code_file):
        client = Client()
        client.force_login(user)
        response = client.post(
            "/api/reviews/annotations/",
            {
                "session": str(review_session.id),
                "file": str(code_file.id),
                "start_line": 1,
                "end_line": 2,
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["start_line"] == 1

    def test_list_annotations_by_session(self, user, review_session, code_file):
        Annotation.objects.create(
            session=review_session, file=code_file, author=user,
            start_line=1, end_line=2,
        )
        client = Client()
        client.force_login(user)
        response = client.get(
            f"/api/reviews/annotations/?session={review_session.id}"
        )
        assert response.status_code == 200
        assert response.json()["count"] == 1


@pytest.mark.django_db
class TestCommentAPI:
    def test_create_comment(self, user, review_session, code_file):
        annotation = Annotation.objects.create(
            session=review_session, file=code_file, author=user,
            start_line=1, end_line=1,
        )
        client = Client()
        client.force_login(user)
        response = client.post(
            "/api/reviews/comments/",
            {"annotation": str(annotation.id), "body": "Looks good!"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["body"] == "Looks good!"


@pytest.mark.django_db
class TestAISuggestionAPI:
    def test_request_suggestion_missing_fields(self, user):
        client = Client()
        client.force_login(user)
        response = client.post(
            "/api/reviews/suggestions/generate/",
            {"session_id": "missing-fields"},
            content_type="application/json",
        )
        assert response.status_code == 400

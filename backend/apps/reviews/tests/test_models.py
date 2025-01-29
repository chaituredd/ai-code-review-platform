import pytest

from apps.reviews.models import Annotation, CodeFile, Comment, Repository, ReviewSession


@pytest.mark.django_db
class TestRepository:
    def test_create_repository(self, repository):
        assert repository.name == "test-repo"
        assert repository.language == "python"
        assert str(repository) == "test-repo"

    def test_repository_owner_relationship(self, repository, user):
        assert repository.owner == user
        assert repository in user.repositories.all()


@pytest.mark.django_db
class TestCodeFile:
    def test_create_code_file(self, code_file):
        assert code_file.path == "src/main.py"
        assert code_file.language == "python"
        assert code_file.line_count == 4

    def test_line_count_auto_calculated(self, repository):
        cf = CodeFile.objects.create(
            repository=repository,
            path="test.py",
            content="line1\nline2\nline3",
        )
        assert cf.line_count == 3

    def test_string_representation(self, code_file):
        assert str(code_file) == "src/main.py"


@pytest.mark.django_db
class TestReviewSession:
    def test_create_session(self, review_session):
        assert review_session.title == "Test Review"
        assert review_session.status == ReviewSession.Status.OPEN

    def test_session_reviewers(self, review_session, user):
        assert user in review_session.reviewers.all()

    def test_session_files(self, review_session, code_file):
        assert code_file in review_session.files.all()

    def test_string_representation(self, review_session):
        assert "Test Review" in str(review_session)
        assert "open" in str(review_session)


@pytest.mark.django_db
class TestAnnotation:
    def test_create_annotation(self, review_session, code_file, user):
        annotation = Annotation.objects.create(
            session=review_session,
            file=code_file,
            author=user,
            start_line=1,
            end_line=2,
        )
        assert annotation.start_line == 1
        assert annotation.end_line == 2
        assert not annotation.resolved

    def test_annotation_string(self, review_session, code_file, user):
        annotation = Annotation.objects.create(
            session=review_session,
            file=code_file,
            author=user,
            start_line=1,
            end_line=3,
        )
        assert "src/main.py:1-3" in str(annotation)


@pytest.mark.django_db
class TestComment:
    def test_create_comment(self, review_session, code_file, user):
        annotation = Annotation.objects.create(
            session=review_session,
            file=code_file,
            author=user,
            start_line=1,
            end_line=1,
        )
        comment = Comment.objects.create(
            annotation=annotation,
            author=user,
            body="Consider using f-strings here.",
        )
        assert comment.body == "Consider using f-strings here."
        assert not comment.is_ai_generated

    def test_ai_generated_comment(self, review_session, code_file, user):
        annotation = Annotation.objects.create(
            session=review_session,
            file=code_file,
            author=user,
            start_line=1,
            end_line=1,
        )
        comment = Comment.objects.create(
            annotation=annotation,
            author=user,
            body="Auto-suggestion: add type hints.",
            is_ai_generated=True,
        )
        assert comment.is_ai_generated
        assert "[AI]" in str(comment)

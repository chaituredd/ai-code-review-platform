from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import (
    AISuggestion, Annotation, CodeFile, Comment,
    Repository, ReviewChunk, ReviewSession,
)


class RepositorySerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    file_count = serializers.SerializerMethodField()

    class Meta:
        model = Repository
        fields = [
            "id", "name", "description", "owner", "language",
            "default_branch", "file_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_file_count(self, obj) -> int:
        return obj.files.count()


class CodeFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeFile
        fields = [
            "id", "repository", "path", "content", "language",
            "sha", "line_count", "created_at",
        ]
        read_only_fields = ["id", "line_count", "created_at"]


class CodeFileListSerializer(serializers.ModelSerializer):
    """Lighter version that omits content — used in list views."""

    class Meta:
        model = CodeFile
        fields = ["id", "path", "language", "sha", "line_count", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "annotation", "author", "body", "is_ai_generated", "created_at"]
        read_only_fields = ["id", "author", "is_ai_generated", "created_at"]


class AnnotationSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Annotation
        fields = [
            "id", "session", "file", "author", "start_line", "end_line",
            "resolved", "comments", "comment_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_comment_count(self, obj) -> int:
        return obj.comments.count()


class ReviewSessionSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    reviewers = UserSerializer(many=True, read_only=True)
    reviewer_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=list,
    )
    file_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False, default=list,
    )
    annotation_count = serializers.SerializerMethodField()

    class Meta:
        model = ReviewSession
        fields = [
            "id", "title", "description", "repository", "author",
            "reviewers", "reviewer_ids", "files", "file_ids", "status",
            "branch", "annotation_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_annotation_count(self, obj) -> int:
        return obj.annotations.count()

    def create(self, validated_data):
        reviewer_ids = validated_data.pop("reviewer_ids", [])
        file_ids = validated_data.pop("file_ids", [])
        session = ReviewSession.objects.create(**validated_data)
        if reviewer_ids:
            session.reviewers.set(reviewer_ids)
        if file_ids:
            session.files.set(file_ids)
        return session


class ReviewSessionListSerializer(serializers.ModelSerializer):
    """Lightweight version for listing sessions."""

    author = UserSerializer(read_only=True)
    annotation_count = serializers.SerializerMethodField()

    class Meta:
        model = ReviewSession
        fields = [
            "id", "title", "repository", "author", "status",
            "branch", "annotation_count", "created_at",
        ]

    def get_annotation_count(self, obj) -> int:
        return obj.annotations.count()


class AISuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISuggestion
        fields = [
            "id", "session", "file", "start_line", "end_line",
            "suggestion_text", "confidence", "accepted", "created_at",
        ]
        read_only_fields = ["id", "suggestion_text", "confidence", "created_at"]


class ReviewChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewChunk
        fields = [
            "id", "repository", "source_file", "content",
            "chunk_type", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

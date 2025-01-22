from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from .models import (
    AISuggestion, Annotation, CodeFile, Comment, Repository, ReviewSession,
)
from .serializers import (
    AISuggestionSerializer, AnnotationSerializer, CodeFileListSerializer,
    CodeFileSerializer, CommentSerializer, RepositorySerializer,
    ReviewSessionListSerializer, ReviewSessionSerializer,
)
from .tasks import generate_ai_suggestion, generate_comment_embedding, generate_file_embeddings


# ── Repositories ──────────────────────────────────

class RepositoryListCreateView(generics.ListCreateAPIView):
    serializer_class = RepositorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description", "language"]
    ordering_fields = ["created_at", "name"]

    def get_queryset(self):
        return Repository.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class RepositoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RepositorySerializer

    def get_queryset(self):
        return Repository.objects.filter(owner=self.request.user)


# ── Code files ────────────────────────────────────

class CodeFileListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["repository", "language"]
    search_fields = ["path"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CodeFileListSerializer
        return CodeFileSerializer

    def get_queryset(self):
        return CodeFile.objects.filter(repository__owner=self.request.user)

    def perform_create(self, serializer):
        code_file = serializer.save()
        generate_file_embeddings.delay(str(code_file.id))


class CodeFileDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = CodeFileSerializer

    def get_queryset(self):
        return CodeFile.objects.filter(repository__owner=self.request.user)


# ── Review sessions ───────────────────────────────

class ReviewSessionListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "repository"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ReviewSessionListSerializer
        return ReviewSessionSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            ReviewSession.objects.filter(author=user)
            | ReviewSession.objects.filter(reviewers=user)
        ).distinct().select_related("author", "repository")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ReviewSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewSessionSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            ReviewSession.objects.filter(author=user)
            | ReviewSession.objects.filter(reviewers=user)
        ).distinct()


# ── Annotations ───────────────────────────────────

class AnnotationListCreateView(generics.ListCreateAPIView):
    serializer_class = AnnotationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["session", "file", "resolved"]

    def get_queryset(self):
        return Annotation.objects.select_related("author", "file").prefetch_related(
            "comments__author"
        )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class AnnotationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AnnotationSerializer
    queryset = Annotation.objects.all()


# ── Comments ──────────────────────────────────────

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["annotation"]

    def get_queryset(self):
        return Comment.objects.select_related("author")

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        generate_comment_embedding.delay(str(comment.id))


# ── AI Suggestions ────────────────────────────────

class AISuggestionListView(generics.ListAPIView):
    serializer_class = AISuggestionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["session", "file", "accepted"]
    ordering_fields = ["confidence", "created_at"]

    def get_queryset(self):
        return AISuggestion.objects.all()


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def request_ai_suggestion(request):
    """Trigger the RAG pipeline for a code region. Returns a task ID
    so the client can poll or wait for the WS broadcast."""
    session_id = request.data.get("session_id")
    file_id = request.data.get("file_id")
    start_line = request.data.get("start_line")
    end_line = request.data.get("end_line")

    if not all([session_id, file_id, start_line, end_line]):
        return Response(
            {"error": "session_id, file_id, start_line, and end_line are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not ReviewSession.objects.filter(id=session_id).exists():
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
    if not CodeFile.objects.filter(id=file_id).exists():
        return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

    task = generate_ai_suggestion.delay(
        session_id=str(session_id),
        file_id=str(file_id),
        start_line=int(start_line),
        end_line=int(end_line),
    )

    return Response(
        {"task_id": task.id, "status": "processing"},
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def accept_suggestion(request, suggestion_id):
    try:
        suggestion = AISuggestion.objects.get(id=suggestion_id)
    except AISuggestion.DoesNotExist:
        return Response({"error": "Suggestion not found."}, status=status.HTTP_404_NOT_FOUND)

    suggestion.accepted = True
    suggestion.save(update_fields=["accepted", "updated_at"])
    return Response(AISuggestionSerializer(suggestion).data)

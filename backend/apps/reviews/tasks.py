"""Celery tasks for background embedding + AI suggestion generation."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_file_embeddings(self, code_file_id: str) -> int:
    """Generate embeddings for a code file. Returns chunk count."""
    from apps.reviews.models import CodeFile
    from apps.reviews.services.embedding_service import EmbeddingService

    try:
        code_file = CodeFile.objects.select_related("repository").get(id=code_file_id)
        chunks = EmbeddingService.embed_code_file(code_file)
        return len(chunks)
    except CodeFile.DoesNotExist:
        logger.error("CodeFile %s not found", code_file_id)
        return 0
    except Exception as exc:
        logger.exception("Embedding task failed for file %s", code_file_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_comment_embedding(self, comment_id: str) -> bool:
    from apps.reviews.models import Comment
    from apps.reviews.services.embedding_service import EmbeddingService

    try:
        comment = Comment.objects.select_related(
            "annotation__session__repository",
            "annotation__file",
            "author",
        ).get(id=comment_id)
        chunk = EmbeddingService.embed_review_comment(comment)
        return chunk is not None
    except Comment.DoesNotExist:
        logger.error("Comment %s not found", comment_id)
        return False
    except Exception as exc:
        logger.exception("Comment embedding failed for %s", comment_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def generate_ai_suggestion(self, session_id: str, file_id: str, start_line: int, end_line: int):
    """Run the full RAG pipeline for a code region."""
    from apps.reviews.models import CodeFile, ReviewSession
    from apps.reviews.services.rag_pipeline import RAGPipelineService

    try:
        session = ReviewSession.objects.get(id=session_id)
        code_file = CodeFile.objects.get(id=file_id)

        pipeline = RAGPipelineService(top_k=5, similarity_threshold=0.3)
        suggestion = pipeline.suggest_for_code_region(
            session=session,
            code_file=code_file,
            start_line=start_line,
            end_line=end_line,
        )

        if suggestion:
            return {
                "id": str(suggestion.id),
                "suggestion_text": suggestion.suggestion_text,
                "confidence": suggestion.confidence,
                "start_line": suggestion.start_line,
                "end_line": suggestion.end_line,
            }
        return None
    except Exception as exc:
        logger.exception("AI suggestion task failed")
        raise self.retry(exc=exc)


@shared_task
def rebuild_repository_embeddings(repository_id: str) -> int:
    """Rebuild all embeddings for a repository. For bulk re-indexing."""
    from apps.reviews.models import Repository
    from apps.reviews.services.embedding_service import EmbeddingService

    try:
        repo = Repository.objects.get(id=repository_id)
        return EmbeddingService.rebuild_repository_embeddings(repo)
    except Repository.DoesNotExist:
        logger.error("Repository %s not found", repository_id)
        return 0

"""
Handles chunking + embedding for code files and review comments.

The embeddings feed into the RAG pipeline — every time a file is uploaded
or a reviewer leaves a comment, we chunk it and store the vectors in
pgvector for later retrieval.
"""

import logging
from typing import Optional

from django.db import transaction

from apps.core.utils import chunk_text, generate_embedding
from apps.reviews.models import CodeFile, Comment, Repository, ReviewChunk

logger = logging.getLogger(__name__)


class EmbeddingService:

    @staticmethod
    def embed_code_file(code_file: CodeFile) -> list[ReviewChunk]:
        """Chunk and embed a code file, storing results in ReviewChunk."""
        chunks = chunk_text(code_file.content, max_tokens=400, overlap=30)
        created = []

        with transaction.atomic():
            # wipe stale chunks for this file before re-embedding
            ReviewChunk.objects.filter(
                repository=code_file.repository,
                source_file=code_file.path,
                chunk_type="code",
            ).delete()

            for i, chunk_content in enumerate(chunks):
                embedding = generate_embedding(chunk_content)
                review_chunk = ReviewChunk.objects.create(
                    repository=code_file.repository,
                    source_file=code_file.path,
                    content=chunk_content,
                    embedding=embedding,
                    chunk_type="code",
                    metadata={
                        "file_id": str(code_file.id),
                        "language": code_file.language,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    },
                )
                created.append(review_chunk)

        logger.info("Embedded %d chunks for file %s", len(created), code_file.path)
        return created

    @staticmethod
    def embed_review_comment(comment: Comment) -> Optional[ReviewChunk]:
        """Embed a review comment so it becomes part of the RAG knowledge base."""
        if not comment.body.strip():
            return None

        annotation = comment.annotation
        session = annotation.session

        # build a richer text for embedding that includes file context
        context_text = (
            f"File: {annotation.file.path} "
            f"Lines {annotation.start_line}-{annotation.end_line}\n"
            f"Review comment: {comment.body}"
        )

        try:
            embedding = generate_embedding(context_text)
            return ReviewChunk.objects.create(
                repository=session.repository,
                source_file=annotation.file.path,
                content=comment.body,
                embedding=embedding,
                chunk_type="review",
                metadata={
                    "session_id": str(session.id),
                    "annotation_id": str(annotation.id),
                    "author": comment.author.username,
                    "start_line": annotation.start_line,
                    "end_line": annotation.end_line,
                    "language": annotation.file.language,
                },
            )
        except Exception:
            logger.exception("Failed to embed comment %s", comment.id)
            return None

    @staticmethod
    def rebuild_repository_embeddings(repository: Repository) -> int:
        """Re-embed all files in a repo. Used for bulk re-indexing."""
        total = 0
        for code_file in repository.files.all():
            chunks = EmbeddingService.embed_code_file(code_file)
            total += len(chunks)
        logger.info("Rebuilt %d total embeddings for repo %s", total, repository.name)
        return total

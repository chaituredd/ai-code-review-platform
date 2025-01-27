"""
RAG pipeline for generating context-aware code review suggestions.

Flow: embed query code → cosine similarity search via pgvector →
build context from top-k chunks → GPT-4o generates suggestion.

I initially tried using langchain for this but the overhead wasn't worth
it for our use case — the retrieval is a single pgvector query and the
generation is one API call, so rolling it by hand was simpler.
"""

import json
import logging

from django.conf import settings
from pgvector.django import CosineDistance

from apps.core.utils import generate_embedding, get_openai_client, truncate_text
from apps.reviews.models import AISuggestion, CodeFile, ReviewChunk, ReviewSession

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an expert code reviewer for a collaborative code review platform.
You are given a code snippet under review and a set of historically relevant
review comments and code patterns retrieved from the team's past reviews.

Your task:
1. Analyze the code snippet for potential issues, improvements, or patterns
   that match historical feedback.
2. Generate a concise, actionable inline suggestion.
3. Rate your confidence (0.0 – 1.0) that this suggestion is relevant.

Respond in JSON:
{
  "suggestion": "<your suggestion text>",
  "confidence": <float>,
  "reasoning": "<brief reasoning>"
}
"""


class RAGPipelineService:
    """Handles the full retrieve-then-generate flow."""

    def __init__(self, top_k: int = 5, similarity_threshold: float = 0.3):
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        self.client = get_openai_client()

    def retrieve_similar_chunks(
        self,
        query_text: str,
        repository_id: str,
        chunk_types: list[str] | None = None,
    ) -> list[ReviewChunk]:
        """Find most similar chunks from pgvector using cosine distance."""
        query_embedding = generate_embedding(query_text)

        qs = ReviewChunk.objects.filter(
            repository_id=repository_id,
        ).annotate(
            distance=CosineDistance("embedding", query_embedding),
        ).filter(
            distance__lt=1 - self.similarity_threshold,  # cosine distance threshold
        ).order_by("distance")

        if chunk_types:
            qs = qs.filter(chunk_type__in=chunk_types)

        return list(qs[: self.top_k])

    def generate_suggestion(
        self,
        code_snippet: str,
        file_path: str,
        start_line: int,
        end_line: int,
        retrieved_chunks: list[ReviewChunk],
    ) -> dict:
        """Call GPT-4o with retrieved context to generate a suggestion."""

        # build context string from retrieved chunks
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            header = f"[{chunk.chunk_type.upper()} from {chunk.source_file}]"
            context_parts.append(f"{i}. {header}\n{truncate_text(chunk.content, 1500)}")

        context_str = "\n\n".join(context_parts) if context_parts else "No historical context available."

        user_prompt = f"""\
## Code Under Review
File: {file_path} (lines {start_line}–{end_line})
```
{truncate_text(code_snippet, 3000)}
```

## Historical Review Context
{context_str}

Generate your inline suggestion.
"""

        try:
            response = self.client.chat.completions.create(
                model=settings.CHAT_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=500,
            )

            result = json.loads(response.choices[0].message.content)
            return {
                "suggestion": result.get("suggestion", ""),
                "confidence": float(result.get("confidence", 0.0)),
                "reasoning": result.get("reasoning", ""),
            }
        except Exception:
            logger.exception("RAG generation failed for %s:%d-%d", file_path, start_line, end_line)
            return {"suggestion": "", "confidence": 0.0, "reasoning": "Generation failed."}

    def suggest_for_code_region(
        self,
        session: ReviewSession,
        code_file: CodeFile,
        start_line: int,
        end_line: int,
    ) -> AISuggestion | None:
        """Full pipeline: retrieve → generate → persist.

        Returns the created AISuggestion or None if nothing useful was generated.
        """
        # extract code snippet from the file
        lines = code_file.content.split("\n")
        snippet_lines = lines[max(0, start_line - 1): end_line]
        code_snippet = "\n".join(snippet_lines)

        if not code_snippet.strip():
            return None

        # step 1: retrieve similar chunks
        retrieved = self.retrieve_similar_chunks(
            query_text=code_snippet,
            repository_id=str(session.repository_id),
            chunk_types=["code", "review"],
        )

        # step 2: generate suggestion via LLM
        result = self.generate_suggestion(
            code_snippet=code_snippet,
            file_path=code_file.path,
            start_line=start_line,
            end_line=end_line,
            retrieved_chunks=retrieved,
        )

        if not result["suggestion"]:
            return None

        # step 3: persist
        suggestion = AISuggestion.objects.create(
            session=session,
            file=code_file,
            start_line=start_line,
            end_line=end_line,
            suggestion_text=result["suggestion"],
            confidence=result["confidence"],
        )

        if retrieved:
            suggestion.context_chunks.set(retrieved)

        logger.info(
            "Generated suggestion for %s:%d-%d (confidence=%.2f)",
            code_file.path, start_line, end_line, result["confidence"],
        )
        return suggestion

import logging
from functools import lru_cache

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector via OpenAI."""
    client = get_openai_client()
    text = text.replace("\n", " ").strip()

    if not text:
        return [0.0] * settings.EMBEDDING_DIMENSIONS

    try:
        response = client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding
    except Exception:
        logger.exception("Failed to generate embedding")
        raise


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks for embedding.

    Went with a simple line-based approach here instead of using langchain's
    splitters — those were overkill for code files and the token counting
    was surprisingly inaccurate for mixed-language content.

    The overlap param keeps context between chunks so the embeddings
    capture cross-boundary patterns (learned this the hard way when
    function signatures kept getting split from their bodies).
    """
    lines = text.split("\n")
    chunks = []
    current_chunk: list[str] = []
    current_length = 0

    for line in lines:
        # rough token estimate — good enough for chunking purposes
        line_tokens = len(line.split())
        if current_length + line_tokens > max_tokens and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = current_chunk[-overlap:] if overlap > 0 else []
            current_length = sum(len(l.split()) for l in current_chunk)

        current_chunk.append(line)
        current_length += line_tokens

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    # TODO: consider using tiktoken for more accurate token counts
    # the word-split approximation drifts ~15% on dense code
    return chunks


def truncate_text(text: str, max_chars: int = 8000) -> str:
    if len(text) <= max_chars:
        return text
    return text[: text.rfind(" ", 0, max_chars)] + "..."


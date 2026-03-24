# AI-Powered Code Review Platform

Real-time collaborative code review tool with a RAG pipeline that generates context-aware inline suggestions from historical review data. Built this to explore how vector search + LLMs can make code reviews faster — the idea is that when you're reviewing code, the system automatically pulls up similar patterns from past reviews and suggests relevant feedback.

## How the RAG pipeline works

This is the interesting part of the project. When code files are uploaded, they get chunked (~400 tokens, line-based with overlap) and embedded using OpenAI's `text-embedding-3-small`. The vectors are stored in PostgreSQL via pgvector with an HNSW index.

When a reviewer highlights a code region and requests a suggestion:
1. The selected code gets embedded
2. Cosine similarity search finds the top 5 most relevant chunks from past code + review comments
3. Those chunks get fed as context to GPT-4o along with the current code
4. GPT-4o returns a suggestion with a confidence score
5. The suggestion gets saved and broadcast to all connected reviewers via WebSocket

I went with pgvector instead of Pinecone/Weaviate because keeping everything in Postgres means one less service to manage. HNSW index handles our scale fine and we get transactional consistency for free.

## Stack

- **Backend**: Django 5, DRF, Django Channels (WebSockets via Daphne)
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query
- **Database**: PostgreSQL 16 + pgvector
- **AI**: OpenAI API (text-embedding-3-small for embeddings, gpt-4o for generation)
- **Async**: Celery + Redis (embedding jobs run in background)
- **Infra**: Docker Compose, GitHub Actions

## Architecture

```
┌──────────────┐     WebSocket      ┌─────────────────────┐
│  React SPA   │◄──────────────────►│  Django Channels    │
│  (Vite)      │     REST API       │  (Daphne ASGI)      │
└──────┬───────┘◄──────────────────►└─────────┬───────────┘
       │                                      │
       │  ┌───────────┐ ┌─────────┐ ┌────────┴───────┐
       │  │ PostgreSQL │ │  Redis  │ │  Celery        │
       │  │ + pgvector │ │         │ │  workers       │
       │  └───────────┘ └─────────┘ └────────┬───────┘
       │                                      │
       │               ┌───────────┐          │
       └───────────────│ OpenAI API│◄─────────┘
                       └───────────┘
```

## Project structure

```
├── backend/
│   ├── config/                     # settings, asgi, celery config
│   ├── apps/
│   │   ├── core/                   # base model, openai utils, chunking
│   │   ├── users/                  # custom user model, auth
│   │   └── reviews/                # <-- main app
│   │       ├── models.py
│   │       ├── consumers.py        # websocket consumer
│   │       ├── services/
│   │       │   ├── embedding_service.py
│   │       │   └── rag_pipeline.py
│   │       ├── tasks.py
│   │       ├── views.py
│   │       └── tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── reviews/            # CodeViewer, AnnotationThread, etc
│   │   │   └── ui/
│   │   ├── hooks/                  # useReviewWebSocket
│   │   ├── store/                  # zustand
│   │   ├── pages/
│   │   └── types/
│   └── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
└── .env.example
```

## Setup

```bash
git clone https://github.com/chaituredd/ai-code-review-platform.git
cd ai-code-review-platform

cp .env.example .env
# fill in OPENAI_API_KEY and DJANGO_SECRET_KEY

docker compose up --build

# first time:
docker compose exec backend uv run python manage.py migrate
docker compose exec backend uv run python manage.py createsuperuser
```

Frontend: http://localhost:5173
Admin: http://localhost:8000/admin/

## Environment variables

See `.env.example` for the full list. The important ones:

- `OPENAI_API_KEY` — required for embeddings and suggestion generation
- `DJANGO_SECRET_KEY` — any random string
- `POSTGRES_*` — database config (defaults work with docker compose)
- `REDIS_URL` — defaults to `redis://redis:6379/0`

## Tests

```bash
docker compose exec backend uv run pytest -v
docker compose exec frontend npm test -- --run
```

## Some design decisions

**pgvector over a dedicated vector DB** — One less service. Postgres handles both relational queries and vector search, and HNSW gives good enough recall without needing to tune IVFFlat's nlist parameter.

**Line-based chunking over token-based** — Less precise but preserves code structure better. With token-based splitting, function signatures kept getting separated from their bodies which hurt retrieval quality.

**Celery for embeddings** — Each embedding call to OpenAI takes ~200ms. Doing that synchronously on file upload would be painful, so it all runs in background workers.

**Django Channels over Socket.IO** — Already using Django for everything else, Channels was the natural choice. Redis channel layer handles pub/sub across Daphne workers.

## TODO

- [ ] GitHub webhook integration for auto-reviewing PRs
- [ ] Diff-based review mode (right now it's full file snapshots)
- [ ] Feedback loop on AI suggestions to improve prompts

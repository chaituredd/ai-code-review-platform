"""
WebSocket consumer for real-time collaborative code review.

Protocol (all messages are JSON with a "type" field):

  Client -> Server:
    annotation.create  : { file_id, start_line, end_line }
    comment.create     : { annotation_id, body }
    annotation.resolve : { annotation_id }
    cursor.move        : { file_id, line, column }
    suggestion.request : { file_id, start_line, end_line }

  Server -> Client (broadcast to room):
    annotation.created  / comment.created / annotation.resolved
    cursor.updated / user.joined / user.left / suggestion.ready
"""

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebSocketConsumer

logger = logging.getLogger(__name__)


class ReviewSessionConsumer(AsyncJsonWebSocketConsumer):

    async def connect(self):
        # FIXME: add rate limiting for connection attempts
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group = f"review_{self.session_id}"
        self.user = self.scope.get("user")

        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        has_access = await self._check_session_access()
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        # let everyone know who joined
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "user_joined",
                "user": {"id": self.user.id, "username": self.user.username},
            },
        )
        logger.info("User %s joined session %s", self.user.username, self.session_id)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group"):
            await self.channel_layer.group_send(
                self.room_group,
                {
                    "type": "user_left",
                    "user": {"id": self.user.id, "username": self.user.username},
                },
            )
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type", "")

        handlers = {
            "annotation.create": self._handle_annotation_create,
            "comment.create": self._handle_comment_create,
            "annotation.resolve": self._handle_annotation_resolve,
            "cursor.move": self._handle_cursor_move,
            "suggestion.request": self._handle_suggestion_request,
        }

        handler = handlers.get(msg_type)
        if handler:
            try:
                await handler(content)
            except Exception:
                logger.exception("Error handling %s", msg_type)
                await self.send_json({"type": "error", "message": "Internal error."})
        else:
            await self.send_json({"type": "error", "message": f"Unknown type: {msg_type}"})

    # ── handlers ──────────────────────────────────

    async def _handle_annotation_create(self, content):
        data = await self._create_annotation(
            file_id=content["file_id"],
            start_line=content["start_line"],
            end_line=content["end_line"],
        )
        await self.channel_layer.group_send(
            self.room_group, {"type": "annotation_created", "annotation": data}
        )

    async def _handle_comment_create(self, content):
        data = await self._create_comment(
            annotation_id=content["annotation_id"],
            body=content["body"],
        )
        if data:
            await self.channel_layer.group_send(
                self.room_group, {"type": "comment_created", "comment": data}
            )

    async def _handle_annotation_resolve(self, content):
        ok = await self._resolve_annotation(content["annotation_id"])
        if ok:
            await self.channel_layer.group_send(
                self.room_group,
                {"type": "annotation_resolved", "annotation_id": content["annotation_id"]},
            )

    async def _handle_cursor_move(self, content):
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "cursor_updated",
                "user": {"id": self.user.id, "username": self.user.username},
                "file_id": content["file_id"],
                "line": content["line"],
                "column": content.get("column", 0),
            },
        )

    async def _handle_suggestion_request(self, content):
        from apps.reviews.tasks import generate_ai_suggestion

        generate_ai_suggestion.delay(
            session_id=self.session_id,
            file_id=content["file_id"],
            start_line=content["start_line"],
            end_line=content["end_line"],
        )
        await self.send_json({"type": "suggestion.queued", "status": "processing"})

    # ── broadcast handlers (called by channel layer) ──

    async def annotation_created(self, event):
        await self.send_json({"type": "annotation.created", "annotation": event["annotation"]})

    async def comment_created(self, event):
        await self.send_json({"type": "comment.created", "comment": event["comment"]})

    async def annotation_resolved(self, event):
        await self.send_json({"type": "annotation.resolved", "annotation_id": event["annotation_id"]})

    async def cursor_updated(self, event):
        # don't echo cursor back to sender
        if event["user"]["id"] != self.user.id:
            await self.send_json({
                "type": "cursor.updated",
                "user": event["user"],
                "file_id": event["file_id"],
                "line": event["line"],
                "column": event["column"],
            })

    async def user_joined(self, event):
        await self.send_json({"type": "user.joined", "user": event["user"]})

    async def user_left(self, event):
        await self.send_json({"type": "user.left", "user": event["user"]})

    async def suggestion_ready(self, event):
        await self.send_json({"type": "suggestion.ready", "suggestion": event["suggestion"]})

    # ── db operations ─────────────────────────────

    @database_sync_to_async
    def _check_session_access(self) -> bool:
        from apps.reviews.models import ReviewSession

        return ReviewSession.objects.filter(
            id=self.session_id, author=self.user,
        ).exists() or ReviewSession.objects.filter(
            id=self.session_id, reviewers=self.user,
        ).exists()

    @database_sync_to_async
    def _create_annotation(self, file_id, start_line, end_line):
        from apps.reviews.models import Annotation, CodeFile

        code_file = CodeFile.objects.get(id=file_id)
        ann = Annotation.objects.create(
            session_id=self.session_id,
            file=code_file,
            author=self.user,
            start_line=start_line,
            end_line=end_line,
        )
        return {
            "id": str(ann.id),
            "file_id": str(code_file.id),
            "file_path": code_file.path,
            "author": {"id": self.user.id, "username": self.user.username},
            "start_line": start_line,
            "end_line": end_line,
            "resolved": False,
            "created_at": ann.created_at.isoformat(),
        }

    @database_sync_to_async
    def _create_comment(self, annotation_id, body):
        from apps.reviews.models import Annotation, Comment
        from apps.reviews.tasks import generate_comment_embedding

        try:
            annotation = Annotation.objects.get(id=annotation_id)
        except Annotation.DoesNotExist:
            return None

        comment = Comment.objects.create(
            annotation=annotation, author=self.user, body=body,
        )
        # fire off async embedding for RAG knowledge base
        generate_comment_embedding.delay(str(comment.id))

        return {
            "id": str(comment.id),
            "annotation_id": str(annotation.id),
            "author": {"id": self.user.id, "username": self.user.username},
            "body": body,
            "is_ai_generated": False,
            "created_at": comment.created_at.isoformat(),
        }

    @database_sync_to_async
    def _resolve_annotation(self, annotation_id) -> bool:
        from apps.reviews.models import Annotation
        return Annotation.objects.filter(id=annotation_id).update(resolved=True) > 0

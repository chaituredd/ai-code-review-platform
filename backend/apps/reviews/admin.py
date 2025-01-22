from django.contrib import admin
from .models import (
    AISuggestion, Annotation, CodeFile, Comment,
    Repository, ReviewChunk, ReviewSession,
)


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "language", "created_at"]
    list_filter = ["language", "created_at"]
    search_fields = ["name", "description"]


@admin.register(CodeFile)
class CodeFileAdmin(admin.ModelAdmin):
    list_display = ["path", "repository", "language", "line_count", "created_at"]
    list_filter = ["language"]
    search_fields = ["path"]


@admin.register(ReviewSession)
class ReviewSessionAdmin(admin.ModelAdmin):
    list_display = ["title", "repository", "author", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["title"]


@admin.register(Annotation)
class AnnotationAdmin(admin.ModelAdmin):
    list_display = ["file", "author", "start_line", "end_line", "resolved"]
    list_filter = ["resolved"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["annotation", "author", "is_ai_generated", "created_at"]
    list_filter = ["is_ai_generated"]


@admin.register(ReviewChunk)
class ReviewChunkAdmin(admin.ModelAdmin):
    list_display = ["source_file", "chunk_type", "repository", "created_at"]
    list_filter = ["chunk_type"]


@admin.register(AISuggestion)
class AISuggestionAdmin(admin.ModelAdmin):
    list_display = ["file", "start_line", "end_line", "confidence", "accepted"]
    list_filter = ["accepted"]

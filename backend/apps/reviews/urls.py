from django.urls import path
from . import views

app_name = "reviews"

urlpatterns = [
    # repos
    path("repositories/", views.RepositoryListCreateView.as_view(), name="repository-list"),
    path("repositories/<uuid:pk>/", views.RepositoryDetailView.as_view(), name="repository-detail"),
    # files
    path("files/", views.CodeFileListCreateView.as_view(), name="file-list"),
    path("files/<uuid:pk>/", views.CodeFileDetailView.as_view(), name="file-detail"),
    # sessions
    path("sessions/", views.ReviewSessionListCreateView.as_view(), name="session-list"),
    path("sessions/<uuid:pk>/", views.ReviewSessionDetailView.as_view(), name="session-detail"),
    # annotations + comments
    path("annotations/", views.AnnotationListCreateView.as_view(), name="annotation-list"),
    path("annotations/<uuid:pk>/", views.AnnotationDetailView.as_view(), name="annotation-detail"),
    path("comments/", views.CommentListCreateView.as_view(), name="comment-list"),
    # ai suggestions
    path("suggestions/", views.AISuggestionListView.as_view(), name="suggestion-list"),
    path("suggestions/generate/", views.request_ai_suggestion, name="suggestion-generate"),
    path("suggestions/<uuid:suggestion_id>/accept/", views.accept_suggestion, name="suggestion-accept"),
]

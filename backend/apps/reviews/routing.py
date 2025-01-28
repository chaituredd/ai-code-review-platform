from django.urls import re_path
from apps.reviews.consumers import ReviewSessionConsumer

websocket_urlpatterns = [
    re_path(r"ws/review/(?P<session_id>[0-9a-f-]+)/$", ReviewSessionConsumer.as_asgi()),
]

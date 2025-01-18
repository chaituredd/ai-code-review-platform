import uuid

from django.db import models


class TimestampedModel(models.Model):
    """Base model — UUID pk + created/updated timestamps.
    
    Everything inherits from this so we get consistent
    IDs and audit trails across the whole app.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

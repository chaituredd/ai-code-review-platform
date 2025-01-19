from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    avatar_url = models.URLField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    github_username = models.CharField(max_length=100, blank=True, default="")
    preferred_languages = models.JSONField(
        default=list,
        help_text="e.g. ['python', 'typescript']",
    )

    class Meta:
        db_table = "users"
        ordering = ["-date_joined"]

    def __str__(self):
        return self.username

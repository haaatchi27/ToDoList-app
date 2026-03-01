from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "is_group",
        "group_type",
        "parent",
        "due_date",
        "is_completed",
        "order",
        "priority",
    ]
    list_filter = ["is_group", "is_completed", "group_type"]
    search_fields = ["title", "description"]
    raw_id_fields = ["parent"]

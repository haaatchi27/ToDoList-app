from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Task, UserProfile


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "is_group",
        "group_type",
        "parent",
        "due_date",
        "recommended_datetime",
        "status",
        "is_completed",
        "is_required",
        "order",
        "priority",
    ]
    list_filter = ["is_group", "is_completed", "is_required", "group_type"]
    search_fields = ["title", "description"]
    raw_id_fields = ["parent"]


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "プロフィール"


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "theme"]
    search_fields = ["user__username"]


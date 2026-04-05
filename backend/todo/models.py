from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    theme = models.CharField("テーマ", max_length=50, default='indigo')

    def __str__(self):
        return f"{self.user.username} Profile"

@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        if not hasattr(instance, 'profile'):
            UserProfile.objects.create(user=instance)
        instance.profile.save()


class Task(models.Model):
    """
    Hierarchical task model using a Composite Pattern.
    A task can be either a single task or a group (containing other tasks).
    Groups support 'RANKED' (ordered) or 'UNRANKED' (unordered) children.
    """

    class GroupType(models.TextChoices):
        RANKED = "RANKED", "順位付き"
        UNRANKED = "UNRANKED", "順位なし"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name="ユーザー",
        null=True,
        blank=True,
    )
    title = models.CharField("タイトル", max_length=255)
    description = models.TextField("説明", blank=True, default="")
    memo = models.TextField("メモ", blank=True, default="")
    due_date = models.DateTimeField("期限", null=True, blank=True)
    class Status(models.TextChoices):
        PENDING = "PENDING", "未実行"
        COMPLETED = "COMPLETED", "完了"
        NOT_REQUIRED = "NOT_REQUIRED", "実施不要"
        FAILED = "FAILED", "失敗（期限超過による消滅）"

    is_completed = models.BooleanField("完了", default=False)
    is_required = models.BooleanField("必須", default=True)
    recommended_datetime = models.DateTimeField("推奨実行日時", null=True, blank=True)
    # Hierarchy
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="親タスク",
    )
    is_group = models.BooleanField("グループタスク", default=False)
    group_type = models.CharField(
        "グループ種別",
        max_length=10,
        choices=GroupType.choices,
        null=True,
        blank=True,
        help_text="グループタスクの場合のみ設定",
    )

    # Ordering within a parent group
    order = models.IntegerField(
        "順序",
        null=True,
        blank=True,
        help_text="RANKED グループ内の順序 (小さいほど先)",
    )

    # Priority (lower means higher priority)
    priority = models.IntegerField(
        "優先度",
        default=99,
        help_text="数値が小さいほど優先度が高い (例: 1=最優先)",
    )

    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        verbose_name = "タスク"
        verbose_name_plural = "タスク"

    def __str__(self):
        prefix = "[Group] " if self.is_group else ""
        return f"{prefix}{self.title}"

    @property
    def status(self):
        if self.is_completed:
            return self.Status.COMPLETED
        if self.due_date:
            from django.utils import timezone
            if self.due_date < timezone.now():
                if not self.is_required:
                    return self.Status.FAILED
        return self.Status.PENDING

    def save(self, *args, **kwargs):
        # 「順位なし」または種別未設定の場合は、優先度を最大値(INT_MAX)に固定
        if self.group_type == self.GroupType.UNRANKED or self.group_type is None:
            self.priority = 2147483647
        super().save(*args, **kwargs)

    # ---- Deadline inheritance logic ----

    @property
    def effective_due_date(self):
        """
        For groups: returns the earliest due_date among uncompleted descendants.
        For single tasks: returns its own due_date (only if uncompleted).
        """
        if not self.is_group:
            # Completed or terminal tasks don't contribute to deadlines
            if self.status in [self.Status.COMPLETED, self.Status.NOT_REQUIRED, self.Status.FAILED]:
                return None
            return self.due_date
        return self._get_earliest_due_date()

    def _get_earliest_due_date(self):
        """Recursively find the earliest due_date among uncompleted descendants."""
        earliest = None
        children = self.children.all()
        for child in children:
            child_due = child.effective_due_date
            if child_due is not None:
                if earliest is None or child_due < earliest:
                    earliest = child_due
        return earliest

    def propagate_due_date(self):
        """
        Update this group's due_date based on children,
        then propagate upward to the parent.
        """
        if self.is_group:
            new_due = self._get_earliest_due_date()
            if self.due_date != new_due:
                self.due_date = new_due
                self.save(update_fields=["due_date", "updated_at"])
        if self.parent and self.parent.is_group:
            self.parent.propagate_due_date()

    @property
    def completion_ratio(self):
        """For groups, returns (completed_count, total_count) of leaf tasks."""
        if not self.is_group:
            return (1 if self.status == self.Status.COMPLETED else 0, 1)

        completed = 0
        total = 0
        for child in self.children.all():
            c, t = child.completion_ratio
            completed += c
            total += t
        return (completed, total)

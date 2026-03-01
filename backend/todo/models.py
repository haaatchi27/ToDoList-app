from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


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
    is_completed = models.BooleanField("完了", default=False)

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
            # Completed tasks don't contribute to deadlines
            if self.is_completed:
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
            return (1 if self.is_completed else 0, 1)

        completed = 0
        total = 0
        for child in self.children.all():
            c, t = child.completion_ratio
            completed += c
            total += t
        return (completed, total)

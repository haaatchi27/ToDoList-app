from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Task",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "title",
                    models.CharField(max_length=255, verbose_name="タイトル"),
                ),
                (
                    "description",
                    models.TextField(blank=True, default="", verbose_name="説明"),
                ),
                (
                    "due_date",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="期限"
                    ),
                ),
                (
                    "is_completed",
                    models.BooleanField(default=False, verbose_name="完了"),
                ),
                (
                    "is_group",
                    models.BooleanField(
                        default=False, verbose_name="グループタスク"
                    ),
                ),
                (
                    "group_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("RANKED", "順位付き"),
                            ("UNRANKED", "順位なし"),
                        ],
                        help_text="グループタスクの場合のみ設定",
                        max_length=10,
                        null=True,
                        verbose_name="グループ種別",
                    ),
                ),
                (
                    "order",
                    models.IntegerField(
                        blank=True,
                        help_text="RANKED グループ内の順序 (小さいほど先)",
                        null=True,
                        verbose_name="順序",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, verbose_name="作成日時"
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True, verbose_name="更新日時"
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="children",
                        to="todo.task",
                        verbose_name="親タスク",
                    ),
                ),
            ],
            options={
                "verbose_name": "タスク",
                "verbose_name_plural": "タスク",
                "ordering": ["order", "created_at"],
            },
        ),
    ]

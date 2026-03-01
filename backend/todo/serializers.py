from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "email"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class TaskSerializer(serializers.ModelSerializer):
    """
    Recursive serializer for hierarchical tasks.
    Includes children for group tasks and computed fields.
    """
    children = serializers.SerializerMethodField()
    effective_due_date = serializers.DateTimeField(read_only=True)
    completion_completed = serializers.SerializerMethodField()
    completion_total = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "due_date",
            "effective_due_date",
            "is_completed",
            "parent",
            "is_group",
            "group_type",
            "order",
            "priority",
            "memo",
            "completion_completed",
            "completion_total",
            "created_at",
            "updated_at",
            "children",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_children(self, obj):
        if not obj.is_group:
            return []
        
        from django.db.models import Case, When, Value
        # 1. 'RANKED'を最優先(0)、その他を次点(1)とする
        # 2. その中で優先度(priority)をソート
        # 3. さらに手動順序(order)を考慮
        children = obj.children.all().order_by(
            Case(When(group_type='RANKED', then=Value(0)), default=Value(1)),
            "priority", 
            "order", 
            "created_at"
        )
            
        return TaskSerializer(children, many=True, context=self.context).data

    def get_completion_completed(self, obj):
        completed, _ = obj.completion_ratio
        return completed

    def get_completion_total(self, obj):
        _, total = obj.completion_ratio
        return total


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tasks (no recursive children)."""

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "due_date",
            "is_completed",
            "parent",
            "is_group",
            "group_type",
            "order",
            "priority",
            "memo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, data):
        is_group = data.get("is_group", False)
        group_type = data.get("group_type")

        if is_group and not group_type:
            raise serializers.ValidationError(
                {"group_type": "グループタスクにはグループ種別が必要です。"}
            )
        # 以前はここで !is_group の場合に group_type を None にしていましたが、
        # 通常のタスクでも「順位付き」等の種別を持てるように制限を解除します。

        # Validate parent is a group
        parent = data.get("parent")
        if parent and not parent.is_group:
            raise serializers.ValidationError(
                {"parent": "親タスクはグループタスクである必要があります。"}
            )
        return data


class TaskReorderSerializer(serializers.Serializer):
    """Serializer for bulk reordering tasks within a group."""
    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="新しい順序でのタスクIDリスト"
    )

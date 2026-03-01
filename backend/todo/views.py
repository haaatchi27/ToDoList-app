from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Task
from .serializers import (
    TaskSerializer,
    TaskCreateUpdateSerializer,
    TaskReorderSerializer,
    UserSerializer,
)
from django.contrib.auth.models import User

VALID_SORT_FIELDS = {"title", "due_date", "created_at"}


def _sort_and_save_order(tasks_qs, sort_by):
    """Sort a queryset by the given field and persist the order."""
    if sort_by == "title":
        sorted_tasks = sorted(tasks_qs, key=lambda t: t.title)
    elif sort_by == "due_date":
        far_future = timezone.datetime.max.replace(tzinfo=timezone.utc)
        sorted_tasks = sorted(
            tasks_qs,
            key=lambda t: t.due_date if t.due_date else far_future,
        )
    else:  # created_at
        sorted_tasks = sorted(tasks_qs, key=lambda t: t.created_at)

    for order, task in enumerate(sorted_tasks):
        Task.objects.filter(id=task.id).update(order=order)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """
    API endpoint for hierarchical tasks.

    GET    /api/tasks/          -> List top-level tasks (with nested children)
    POST   /api/tasks/          -> Create a task
    GET    /api/tasks/{id}/     -> Retrieve a task
    PUT    /api/tasks/{id}/     -> Update a task
    DELETE /api/tasks/{id}/     -> Delete a task (cascades to children)
    POST   /api/tasks/{id}/reorder/ -> Reorder children of a group
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only top-level tasks for the current user."""
        user = self.request.user
        if self.action == "list":
            return Task.objects.filter(user=user, parent__isnull=True).order_by(
                "order", "created_at"
            )
        return Task.objects.filter(user=user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TaskCreateUpdateSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        # Propagate due_date to parent group
        if task.parent and task.parent.is_group:
            task.parent.propagate_due_date()

    def perform_update(self, serializer):
        task = serializer.save()
        # Propagate due_date to parent group
        if task.parent and task.parent.is_group:
            task.parent.propagate_due_date()

    def perform_destroy(self, instance):
        parent = instance.parent
        instance.delete()
        # Propagate due_date after child deletion
        if parent and parent.is_group:
            parent.propagate_due_date()

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder(self, request, pk=None):
        """Reorder children of a group task."""
        group = self.get_object()
        if not group.is_group:
            return Response(
                {"error": "このタスクはグループではありません。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TaskReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task_ids = serializer.validated_data["task_ids"]

        children = group.children.all()
        child_ids = set(children.values_list("id", flat=True))

        if set(task_ids) != child_ids:
            return Response(
                {"error": "タスクIDリストがグループの子タスクと一致しません。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for order, task_id in enumerate(task_ids):
            Task.objects.filter(id=task_id).update(order=order)

        return Response(
            TaskSerializer(group, context={"request": request}).data
        )

    @action(detail=False, methods=["post"], url_path="reorder_top_level")
    def reorder_top_level(self, request):
        """Reorder top-level tasks."""
        serializer = TaskReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task_ids = serializer.validated_data["task_ids"]

        top_level = Task.objects.filter(parent__isnull=True)
        top_level_ids = set(top_level.values_list("id", flat=True))

        if set(task_ids) != top_level_ids:
            return Response(
                {"error": "タスクIDリストがトップレベルタスクと一致しません。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for order, task_id in enumerate(task_ids):
            Task.objects.filter(id=task_id).update(order=order)

        updated_tasks = Task.objects.filter(parent__isnull=True).order_by(
            "order", "created_at"
        )
        return Response(
            TaskSerializer(updated_tasks, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="sort")
    def sort_children(self, request, pk=None):
        """Sort children of a group by a given field."""
        group = self.get_object()
        if not group.is_group:
            return Response(
                {"error": "このタスクはグループではありません。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sort_by = request.data.get("sort_by", "")
        if sort_by not in VALID_SORT_FIELDS:
            return Response(
                {"error": f"sort_by は {', '.join(VALID_SORT_FIELDS)} のいずれかです。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _sort_and_save_order(group.children.all(), sort_by)

        group.refresh_from_db()
        return Response(
            TaskSerializer(group, context={"request": request}).data
        )

    @action(detail=False, methods=["post"], url_path="sort_top_level")
    def sort_top_level(self, request):
        """Sort top-level tasks by a given field."""
        sort_by = request.data.get("sort_by", "")
        if sort_by not in VALID_SORT_FIELDS:
            return Response(
                {"error": f"sort_by は {', '.join(VALID_SORT_FIELDS)} のいずれかです。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        top_level = Task.objects.filter(parent__isnull=True)
        _sort_and_save_order(top_level, sort_by)

        updated_tasks = Task.objects.filter(parent__isnull=True).order_by(
            "order", "created_at"
        )
        return Response(
            TaskSerializer(updated_tasks, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        """Toggle completion status of a task."""
        task = self.get_object()
        task.is_completed = not task.is_completed
        task.save(update_fields=["is_completed", "updated_at"])
        return Response(
            TaskSerializer(task, context={"request": request}).data
        )

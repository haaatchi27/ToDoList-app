from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import os
from django.conf import settings
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


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    authentication_classes = []  # Bypass CSRF checks
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

    def get_queryset(self):
        """Return only top-level tasks for list; all tasks for detail, filtered by user."""
        user = self.request.user
        if self.action == "list":
            from django.db.models import Case, When, Value
            return Task.objects.filter(user=user, parent__isnull=True).order_by(
                Case(When(group_type='RANKED', then=Value(0)), default=Value(1)),
                "priority", 
                "order", 
                "created_at"
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

        top_level = Task.objects.filter(user=request.user, parent__isnull=True)
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

        top_level = Task.objects.filter(user=request.user, parent__isnull=True)
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

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """
        Returns a daily summary grouping of completed and failed tasks.
        """
        from collections import defaultdict
        from django.utils import timezone
        
        user = request.user
        tasks = Task.objects.filter(user=user)
        
        summary = {}
        
        for task in tasks:
            if task.status == Task.Status.COMPLETED:
                localt = timezone.localtime(task.updated_at)
                date_str = localt.strftime("%Y-%m-%d")
                if date_str not in summary:
                    summary[date_str] = {"completed_count": 0, "failed_count": 0, "completed_tasks": [], "failed_tasks": []}
                summary[date_str]["completed_count"] += 1
                summary[date_str]["completed_tasks"].append(TaskSerializer(task, context={"request": request}).data)
            elif task.status == Task.Status.FAILED:
                if task.due_date:
                    localt = timezone.localtime(task.due_date)
                    date_str = localt.strftime("%Y-%m-%d")
                    if date_str not in summary:
                        summary[date_str] = {"completed_count": 0, "failed_count": 0, "completed_tasks": [], "failed_tasks": []}
                    summary[date_str]["failed_count"] += 1
                    summary[date_str]["failed_tasks"].append(TaskSerializer(task, context={"request": request}).data)

        result = []
        for date_str in sorted(summary.keys(), reverse=True):
            data = summary[date_str]
            result.append({
                "date": date_str,
                "completed_count": data["completed_count"],
                "failed_count": data["failed_count"],
                "completed_tasks": data["completed_tasks"],
                "failed_tasks": data["failed_tasks"],
            })
            
        return Response(result)

    @action(detail=False, methods=['get'])
    def flat_sorted(self, request):
        """
        Returns a flat list of all active (uncompleted) tasks, sorted by due_date or recommended_datetime.
        Null values are pushed to the end.
        """
        from django.db.models import F
        user = request.user
        sort_by = request.query_params.get("sort_by", "due_date")
        
        # Base queryset: only uncompleted tasks
        qs = Task.objects.filter(user=user, is_completed=False)
        
        if sort_by == 'recommended_datetime':
            qs = qs.order_by(F('recommended_datetime').asc(nulls_last=True), "priority", "created_at")
        else:
            qs = qs.order_by(F('due_date').asc(nulls_last=True), "priority", "created_at")
            
        # Use TaskCreateUpdateSerializer to get a flat representation without nested children objects
        serializer = TaskCreateUpdateSerializer(qs, many=True, context={"request": request})
        
        # Re-attach computed properties like status that are only computed on the Model cleanly
        # TaskCreateUpdateSerializer is a ModelSerializer but might not explicitly define 'status'.
        # Let's augment the serialized data with 'status' and 'parent_title' for better UI context.
        data = serializer.data
        task_dict = {t.id: t for t in qs}
        for item in data:
            task = task_dict[item["id"]]
            item["status"] = task.status
            item["parent_title"] = task.parent.title if task.parent else None
            
        return Response(data)

class ProfileView(generics.RetrieveUpdateAPIView):
    """View to get or update the current user's profile."""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class AccessLogView(generics.GenericAPIView):
    """View to fetch the content of access.log."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        log_path = os.path.join(settings.BASE_DIR, "access.log")
        if not os.path.exists(log_path):
            return Response({"content": "ログファイルがまだ生成されていません。"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                # Get last 200 lines to keep it manageable
                lines = f.readlines()
                content = "".join(lines[-200:])
            return Response({"content": content})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

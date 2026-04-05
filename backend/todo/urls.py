from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import TaskViewSet, RegisterView, ProfileView
from .views import TaskViewSet, RegisterView, ProfileView, AccessLogView

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", ProfileView.as_view(), name="profile"),
    path("logs/", AccessLogView.as_view(), name="access-logs"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include(router.urls)),
]

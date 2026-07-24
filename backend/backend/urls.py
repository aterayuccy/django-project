from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.urls import re_path
from django.views.static import serve as serve_media
from api.authentication import (
    AccountTokenView,
    CurrentUserView,
    RegisterView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("api/health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path('admin/', admin.site.urls),
    path("api/user/register/", RegisterView.as_view(), name="register"),
    path("api/user/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/token/", AccountTokenView.as_view(), name="get_token"),
    path("api/token/refresh/",TokenRefreshView.as_view(),name="refresh"),
    path("api-auth/",include("rest_framework.urls")),
    path("api/",include("api.urls"))
]

urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve_media, {"document_root": settings.MEDIA_ROOT}),
]


def frontend(request):
    index_path = settings.FRONTEND_DIST / "index.html"
    if not index_path.exists():
        return JsonResponse({"detail": "Frontend build is not installed."}, status=404)
    return FileResponse(index_path.open("rb"), content_type="text/html")


urlpatterns += [
    path("", frontend, name="frontend"),
    re_path(r"^(?!api/|admin/|media/|static/).*$", frontend, name="frontend-fallback"),
]

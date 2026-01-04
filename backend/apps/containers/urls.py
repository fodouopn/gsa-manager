"""
URLs for containers app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContainerViewSet,
    ManifestLineViewSet,
    ReceivedLineViewSet,
    UnloadingSessionViewSet
)

router = DefaultRouter()
router.register(r'manifest-lines', ManifestLineViewSet, basename='manifest-line')
router.register(r'received-lines', ReceivedLineViewSet, basename='received-line')
router.register(r'unloading-sessions', UnloadingSessionViewSet, basename='unloading-session')
router.register(r'', ContainerViewSet, basename='container')

urlpatterns = [
    path('', include(router.urls)),
]

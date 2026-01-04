"""
URLs for users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserPermissionViewSet
from .password_reset_views import request_password_reset, verify_reset_token, reset_password

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')
router.register(r'permissions', UserPermissionViewSet, basename='user-permission')

urlpatterns = [
    path('', include(router.urls)),
    path('password-reset/request/', request_password_reset, name='password-reset-request'),
    path('password-reset/verify/<str:token>/', verify_reset_token, name='password-reset-verify'),
    path('password-reset/reset/<str:token>/', reset_password, name='password-reset'),
]

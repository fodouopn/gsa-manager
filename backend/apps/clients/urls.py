"""
URLs for clients app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, ClientPriceViewSet

router = DefaultRouter()
router.register(r'prices', ClientPriceViewSet, basename='client-price')
router.register(r'', ClientViewSet, basename='client')

urlpatterns = [
    path('', include(router.urls)),
]

"""
URLs for catalog app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, BasePriceViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'base-prices', BasePriceViewSet, basename='base-price')

urlpatterns = [
    path('', include(router.urls)),
]

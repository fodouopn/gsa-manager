"""
URLs for stock app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockMovementViewSet, PurchaseViewSet, PurchaseLineViewSet, PurchasePaymentViewSet

router = DefaultRouter()
router.register(r'movements', StockMovementViewSet, basename='stock-movement')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'purchase-lines', PurchaseLineViewSet, basename='purchase-line')
router.register(r'purchase-payments', PurchasePaymentViewSet, basename='purchase-payment')

urlpatterns = [
    path('', include(router.urls)),
]

"""
URLs for billing app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceLineViewSet, PaymentViewSet, CompanySettingsViewSet
from .public_views import invoice_acceptance, download_pdf, contest_invoice

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'invoice-lines', InvoiceLineViewSet, basename='invoice-line')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'company-settings', CompanySettingsViewSet, basename='company-settings')

urlpatterns = [
    path('', include(router.urls)),
    # Public routes for invoice acceptance (no authentication)
    path('public/invoices/accept/<str:token>/', invoice_acceptance, name='public-invoice-accept'),
    path('public/invoices/contest/<str:token>/', contest_invoice, name='public-invoice-contest'),
    path('public/invoices/pdf/<str:token>/', download_pdf, name='public-invoice-pdf'),
]

"""
Views for catalog app.
"""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, BasePrice
from .serializers import (
    ProductSerializer,
    BasePriceSerializer,
    ProductWithPriceSerializer
)
from apps.users.permissions import IsReadOnlyOrAuthenticated


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product management."""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['actif', 'unite_vente']
    search_fields = ['nom']
    ordering_fields = ['nom', 'created_at', 'updated_at']
    ordering = ['nom']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return ProductWithPriceSerializer
        return ProductSerializer

    @action(detail=True, methods=['get', 'post', 'put', 'patch'])
    def base_price(self, request, pk=None):
        """Get or set base price for a product."""
        try:
            product = self.get_object()
        except Exception as e:
            return Response({'error': str(e)}, status=404)
        
        if request.method == 'GET':
            try:
                base_price = product.base_price
                serializer = BasePriceSerializer(base_price)
                return Response(serializer.data)
            except BasePrice.DoesNotExist:
                return Response({'message': 'No base price set'}, status=404)
            except Exception as e:
                return Response({'error': str(e)}, status=500)
        
        # POST/PUT/PATCH - create or update base price
        try:
            base_price = product.base_price
            serializer = BasePriceSerializer(base_price, data=request.data, partial=True)
        except BasePrice.DoesNotExist:
            serializer = BasePriceSerializer(data={**request.data, 'product': product.id})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
        if serializer.is_valid():
            try:
                serializer.save(product=product)
                return Response(serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=500)
        return Response(serializer.errors, status=400)


class BasePriceViewSet(viewsets.ModelViewSet):
    """ViewSet for BasePrice management."""
    queryset = BasePrice.objects.select_related('product').all()
    serializer_class = BasePriceSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product']
    search_fields = ['product__nom']
    ordering_fields = ['prix_base', 'created_at']
    ordering = ['product__nom']

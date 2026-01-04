"""
Views for dashboard statistics.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Q, Count
from datetime import datetime, timedelta
# Models imported in methods to avoid circular imports


class DashboardViewSet(viewsets.ViewSet):
    """ViewSet for dashboard statistics."""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stock_value(self, request):
        """Get current stock value (sum of stock * base_price for all products)."""
        from apps.stock.models import StockMovement
        from apps.catalog.models import Product, BasePrice
        
        products = Product.objects.filter(actif=True).select_related('base_price')
        total_value = 0
        stock_details = []
        
        for product in products:
            stock = StockMovement.get_current_stock(product)
            base_price = getattr(product, 'base_price', None)
            price = float(base_price.prix_base) if base_price else 0
            value = stock * price
            
            total_value += value
            if stock > 0:
                stock_details.append({
                    'product_id': product.id,
                    'product_name': product.nom,
                    'stock': stock,
                    'price': price,
                    'value': value,
                })
        
        return Response({
            'total_value': total_value,
            'stock_details': stock_details,
        })

    @action(detail=False, methods=['get'])
    def stock_value_at_date(self, request):
        """Get stock value at a specific date."""
        from apps.stock.models import StockMovement
        from apps.catalog.models import Product, BasePrice
        
        date_param = request.query_params.get('date', None)
        if not date_param:
            target_date = timezone.now().date()
        else:
            try:
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        products = Product.objects.filter(actif=True).select_related('base_price')
        total_value = 0
        stock_details = []
        
        for product in products:
            # Get stock at target date
            movements = StockMovement.objects.filter(
                product=product,
                created_at__date__lte=target_date
            )
            stock = movements.aggregate(total=Sum('qty_signee'))['total'] or 0
            
            base_price = getattr(product, 'base_price', None)
            price = float(base_price.prix_base) if base_price else 0
            value = stock * price
            
            total_value += value
            if stock > 0:
                stock_details.append({
                    'product_id': product.id,
                    'product_name': product.nom,
                    'stock': stock,
                    'price': price,
                    'value': value,
                })
        
        return Response({
            'date': target_date.isoformat(),
            'total_value': total_value,
            'stock_details': stock_details,
        })

    @action(detail=False, methods=['get'])
    def sales_revenue(self, request):
        """Get sales revenue (chiffre d'affaires) by period."""
        from apps.billing.models import Invoice, InvoiceStatus
        
        period = request.query_params.get('period', 'month')  # day, week, month, year
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        if not start_date or not end_date:
            # Default to last 30 days
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get validated invoices in date range
        invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            validated_at__date__gte=start_date,
            validated_at__date__lte=end_date
        )
        
        total_revenue = invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
        invoice_count = invoices.count()
        
        # Group by period for chart data
        chart_data = []
        if period == 'day':
            current_date = start_date
            while current_date <= end_date:
                day_invoices = invoices.filter(validated_at__date=current_date)
                day_revenue = day_invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
                chart_data.append({
                    'date': current_date.isoformat(),
                    'revenue': float(day_revenue),
                    'count': day_invoices.count(),
                })
                current_date += timedelta(days=1)
        elif period == 'week':
            # Group by week
            current_date = start_date
            while current_date <= end_date:
                week_end = min(current_date + timedelta(days=6), end_date)
                week_invoices = invoices.filter(
                    validated_at__date__gte=current_date,
                    validated_at__date__lte=week_end
                )
                week_revenue = week_invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
                chart_data.append({
                    'period': f"{current_date.isoformat()} - {week_end.isoformat()}",
                    'revenue': float(week_revenue),
                    'count': week_invoices.count(),
                })
                current_date += timedelta(days=7)
        elif period == 'month':
            # Group by month
            current_date = start_date.replace(day=1)
            while current_date <= end_date:
                if current_date.month == 12:
                    next_month = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    next_month = current_date.replace(month=current_date.month + 1, day=1)
                month_end = min(next_month - timedelta(days=1), end_date)
                
                month_invoices = invoices.filter(
                    validated_at__date__gte=current_date,
                    validated_at__date__lte=month_end
                )
                month_revenue = month_invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
                chart_data.append({
                    'period': current_date.strftime('%Y-%m'),
                    'revenue': float(month_revenue),
                    'count': month_invoices.count(),
                })
                current_date = next_month
        
        return Response({
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_revenue': float(total_revenue),
            'invoice_count': invoice_count,
            'chart_data': chart_data,
        })

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """Get top selling products."""
        from apps.billing.models import InvoiceLine, InvoiceStatus
        
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        # Get invoice lines from validated invoices
        invoice_lines = InvoiceLine.objects.filter(
            invoice__statut=InvoiceStatus.VALIDEE
        ).select_related('product', 'invoice')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                invoice_lines = invoice_lines.filter(invoice__validated_at__date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                invoice_lines = invoice_lines.filter(invoice__validated_at__date__lte=end_date)
            except ValueError:
                pass
        
        # Aggregate by product
        from django.db.models import Sum
        product_stats = invoice_lines.values('product__id', 'product__nom', 'product__unite_vente').annotate(
            total_qty=Sum('qty'),
            total_revenue=Sum('total_ligne')
        ).order_by('-total_qty')[:limit]
        
        return Response({
            'products': list(product_stats),
        })

    @action(detail=False, methods=['get'])
    def company_status(self, request):
        """Get company status: total due, total received, stock value."""
        from apps.stock.models import StockMovement
        from apps.catalog.models import Product, BasePrice
        from apps.billing.models import Invoice, InvoiceStatus, Payment
        
        # Total due (unpaid invoices)
        unpaid_invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0
        )
        total_due = unpaid_invoices.aggregate(total=Sum('reste'))['total'] or 0
        
        # Total received (all payments)
        all_payments = Payment.objects.all()
        total_received = all_payments.aggregate(total=Sum('montant'))['total'] or 0
        
        # Stock value
        products = Product.objects.filter(actif=True).select_related('base_price')
        stock_value = 0
        for product in products:
            stock = StockMovement.get_current_stock(product)
            base_price = getattr(product, 'base_price', None)
            price = float(base_price.prix_base) if base_price else 0
            stock_value += stock * price
        
        # Total sales (all validated invoices)
        total_sales = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE
        ).aggregate(total=Sum('total_ttc'))['total'] or 0
        
        return Response({
            'total_due': float(total_due),
            'total_received': float(total_received),
            'stock_value': float(stock_value),
            'total_sales': float(total_sales),
            'unpaid_invoice_count': unpaid_invoices.count(),
        })

    @action(detail=False, methods=['get'])
    def stock_movements_report(self, request):
        """Get stock movements report (entrées/sorties) by type."""
        from apps.stock.models import StockMovement, MovementType
        
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        movements = StockMovement.objects.all()
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                movements = movements.filter(created_at__date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                movements = movements.filter(created_at__date__lte=end_date)
            except ValueError:
                pass
        
        # Group by type
        movement_stats = movements.values('type').annotate(
            total_qty=Sum('qty_signee'),
            count=Count('id')
        )
        
        report_data = []
        for stat in movement_stats:
            report_data.append({
                'type': stat['type'],
                'type_display': dict(MovementType.choices)[stat['type']],
                'total_qty': stat['total_qty'],
                'count': stat['count'],
            })
        
        return Response({
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None,
            'movements': report_data,
        })

    @action(detail=False, methods=['get'])
    def pending_invoices(self, request):
        """Get pending invoices (validated with remaining amount > 0)."""
        from apps.billing.models import Invoice, InvoiceStatus
        
        today = timezone.now().date()
        pending_invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0
        ).select_related('client').order_by('-prochaine_date_relance', '-validated_at')
        
        # Count invoices with overdue reminders
        overdue_count = pending_invoices.filter(
            prochaine_date_relance__lte=today
        ).count()
        
        total_remaining = pending_invoices.aggregate(total=Sum('reste'))['total'] or 0
        
        # Get list of invoices with overdue reminders
        overdue_invoices = pending_invoices.filter(
            prochaine_date_relance__lte=today
        )[:10]
        
        invoices_list = []
        for invoice in overdue_invoices:
            invoices_list.append({
                'id': invoice.id,
                'numero': invoice.numero,
                'client': invoice.client.nom_complet,
                'reste': float(invoice.reste),
                'prochaine_date_relance': invoice.prochaine_date_relance.isoformat() if invoice.prochaine_date_relance else None,
                'is_overdue': True,
            })
        
        return Response({
            'count': pending_invoices.count(),
            'total_remaining': float(total_remaining),
            'overdue_count': overdue_count,
            'has_overdue': overdue_count > 0,
            'invoices': invoices_list,
        })

    @action(detail=False, methods=['get'])
    def unpaid_invoices(self, request):
        """Get unpaid invoices summary."""
        from apps.billing.models import Invoice, InvoiceStatus
        
        unpaid_invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0
        ).select_related('client')
        
        total_unpaid = unpaid_invoices.aggregate(total=Sum('reste'))['total'] or 0
        unique_clients = unpaid_invoices.values('client').distinct().count()
        
        return Response({
            'total_unpaid': float(total_unpaid),
            'client_count': unique_clients,
            'invoice_count': unpaid_invoices.count(),
        })

    @action(detail=False, methods=['get'])
    def sales_period(self, request):
        """Get sales (CA) for a period."""
        from apps.billing.models import Invoice, InvoiceStatus
        
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        if not start_date or not end_date:
            # Default to today
            end_date = timezone.now().date()
            start_date = end_date
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            validated_at__date__gte=start_date,
            validated_at__date__lte=end_date
        )
        
        total_ca = invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
        invoice_count = invoices.count()
        
        return Response({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_ca': float(total_ca),
            'invoice_count': invoice_count,
        })

    @action(detail=False, methods=['get'])
    def critical_stock(self, request):
        """Get critical stock (products below threshold)."""
        from apps.stock.models import StockMovement
        from apps.catalog.models import Product
        
        products = Product.objects.filter(actif=True)
        critical_products = []
        
        for product in products:
            stock = StockMovement.get_current_stock(product)
            seuil = product.seuil_stock
            
            if stock <= seuil:
                status = 'RUPTURE' if stock == 0 else 'BAS'
                critical_products.append({
                    'id': product.id,
                    'nom': product.nom,
                    'unite_vente': product.unite_vente,
                    'unite_vente_display': product.get_unite_vente_display(),
                    'stock': stock,
                    'seuil': seuil,
                    'status': status,
                })
        
        # Sort by stock (lowest first) and take top 3
        critical_products.sort(key=lambda x: x['stock'])
        top_critical = critical_products[:3]
        
        return Response({
            'count': len(critical_products),
            'top_critical': top_critical,
            'all_critical': critical_products[:10],  # Limit to 10 for performance
        })

    @action(detail=False, methods=['get'])
    def containers_status(self, request):
        """Get containers status (in progress and upcoming)."""
        from apps.containers.models import Container, ContainerStatus
        
        # Containers in progress
        in_progress = Container.objects.filter(
            statut__in=[ContainerStatus.EN_COURS, ContainerStatus.DECHARGE]
        ).order_by('date_arrivee_estimee')
        
        # Upcoming containers (PREVU)
        upcoming = Container.objects.filter(
            statut=ContainerStatus.PREVU
        ).order_by('date_arrivee_estimee')[:5]  # Next 5
        
        in_progress_list = []
        for container in in_progress:
            in_progress_list.append({
                'id': container.id,
                'ref': container.ref,
                'statut': container.statut,
                'statut_display': container.get_statut_display(),
                'date_arrivee_estimee': container.date_arrivee_estimee.isoformat(),
                'date_arrivee_reelle': container.date_arrivee_reelle.isoformat() if container.date_arrivee_reelle else None,
            })
        
        upcoming_list = []
        for container in upcoming:
            upcoming_list.append({
                'id': container.id,
                'ref': container.ref,
                'statut': container.statut,
                'statut_display': container.get_statut_display(),
                'date_arrivee_estimee': container.date_arrivee_estimee.isoformat(),
            })
        
        return Response({
            'in_progress_count': in_progress.count(),
            'in_progress': in_progress_list,
            'upcoming_count': upcoming.count(),
            'upcoming': upcoming_list,
        })

    @action(detail=False, methods=['get'])
    def urgent_actions(self, request):
        """Get urgent actions (overdue invoices, low stock, incomplete containers)."""
        from apps.billing.models import Invoice, InvoiceStatus
        from apps.stock.models import StockMovement
        from apps.containers.models import Container, ContainerStatus, UnloadingSession
        from apps.catalog.models import Product
        
        today = timezone.now().date()
        actions = []
        
        # Overdue invoices
        overdue_invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0,
            prochaine_date_relance__lte=today
        ).select_related('client')[:5]
        
        for invoice in overdue_invoices:
            actions.append({
                'type': 'INVOICE_OVERDUE',
                'priority': 'HIGH',
                'title': f'Facture {invoice.numero} : {invoice.reste}€ en retard',
                'subtitle': f'Client: {invoice.client.nom_complet} - Relance: {invoice.prochaine_date_relance}',
                'link': f'/invoices/{invoice.id}',
                'data': {
                    'invoice_id': invoice.id,
                    'reste': float(invoice.reste),
                }
            })
        
        # Low stock products
        products = Product.objects.filter(actif=True)
        for product in products:
            stock = StockMovement.get_current_stock(product)
            if stock > 0 and stock <= product.seuil_stock:
                actions.append({
                    'type': 'LOW_STOCK',
                    'priority': 'MEDIUM',
                    'title': f'Produit {product.nom} : stock faible ({stock})',
                    'subtitle': f'Seuil: {product.seuil_stock}',
                    'link': f'/stock?product={product.id}',
                    'data': {
                        'product_id': product.id,
                        'stock': stock,
                        'seuil': product.seuil_stock,
                    }
                })
                if len([a for a in actions if a['type'] == 'LOW_STOCK']) >= 5:
                    break
        
        # Incomplete container sessions
        incomplete_sessions = UnloadingSession.objects.filter(
            ended_at__isnull=True
        ).select_related('container')[:3]
        
        for session in incomplete_sessions:
            actions.append({
                'type': 'CONTAINER_INCOMPLETE',
                'priority': 'MEDIUM',
                'title': f'Conteneur {session.container.ref} : session non terminée',
                'subtitle': f'Démarré: {session.started_at.strftime("%d/%m/%Y %H:%M") if session.started_at else "Non démarré"}',
                'link': f'/containers/{session.container.id}',
                'data': {
                    'container_id': session.container.id,
                    'session_id': session.id,
                }
            })
        
        # Sort by priority (HIGH first)
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        actions.sort(key=lambda x: priority_order.get(x['priority'], 99))
        
        return Response({
            'count': len(actions),
            'actions': actions[:10],  # Limit to 10
        })

    @action(detail=False, methods=['get'])
    def recent_sales(self, request):
        """Get recent sales (last 5-10 invoices)."""
        from apps.billing.models import Invoice, InvoiceStatus
        
        limit = int(request.query_params.get('limit', 10))
        
        invoices = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE
        ).select_related('client').order_by('-validated_at')[:limit]
        
        sales = []
        for invoice in invoices:
            # Determine payment status
            if invoice.reste == 0:
                payment_status = 'PAYÉ'
            elif invoice.paye > 0:
                payment_status = 'PARTIEL'
            else:
                payment_status = 'IMPAYÉ'
            
            sales.append({
                'id': invoice.id,
                'numero': invoice.numero,
                'client': invoice.client.nom_complet,
                'montant': float(invoice.total_ttc),
                'payment_status': payment_status,
                'reste': float(invoice.reste),
                'date': invoice.validated_at.date().isoformat() if invoice.validated_at else None,
            })
        
        return Response({
            'sales': sales,
        })

    @action(detail=False, methods=['get'])
    def pending_reminders(self, request):
        """Get pending reminders (invoices to follow up)."""
        from apps.billing.models import Invoice, InvoiceStatus
        from datetime import timedelta
        
        limit = int(request.query_params.get('limit', 10))
        today = timezone.now().date()
        
        # Get all validated invoices with reste > 0
        reminders = Invoice.objects.filter(
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0
        ).select_related('client').order_by('prochaine_date_relance', '-validated_at')
        
        reminders_list = []
        for invoice in reminders:
            # Calculate reminder date if not set
            if not invoice.prochaine_date_relance and invoice.validated_at:
                invoice.prochaine_date_relance = (invoice.validated_at + timedelta(days=30)).date()
                invoice.save(update_fields=['prochaine_date_relance'])
            
            # Calculate reminder date if validated_at exists but prochaine_date_relance is None
            if not invoice.prochaine_date_relance and invoice.validated_at:
                calculated_date = (invoice.validated_at + timedelta(days=30)).date()
            else:
                calculated_date = invoice.prochaine_date_relance
            
            # Include all invoices with reste > 0, prioritizing those with reminder date <= today
            if calculated_date:
                is_overdue = calculated_date < today
                is_due_today = calculated_date == today
                
                reminders_list.append({
                    'id': invoice.id,
                    'numero': invoice.numero or f'Brouillon-{invoice.id}',
                    'client': invoice.client.nom_complet,
                    'reste': float(invoice.reste),
                    'date_relance': calculated_date.isoformat(),
                    'is_overdue': is_overdue,
                    'is_due_today': is_due_today,
                    'priority': 0 if is_overdue else (1 if is_due_today else 2),  # Priority: overdue > today > future
                })
        
        # Sort by priority (overdue first, then today, then future) and then by date
        reminders_list.sort(key=lambda x: (x['priority'], x['date_relance']))
        reminders_list = reminders_list[:limit]
        
        return Response({
            'reminders': reminders_list,
        })

    @action(detail=False, methods=['get'])
    def recent_activities(self, request):
        """Get recent activities from audit logs."""
        from apps.audit.models import AuditLog
        
        limit = int(request.query_params.get('limit', 10))
        
        activities = AuditLog.objects.select_related('user').order_by('-created_at')[:limit]
        
        activities_list = []
        for activity in activities:
            # Format entity type
            entity_type = activity.entity_type.model if activity.entity_type else 'Unknown'
            
            # Format action description
            action_desc = f"{activity.action}"
            if activity.user:
                action_desc = f"{activity.user.username} a {activity.action.lower()}"
            
            activities_list.append({
                'id': activity.id,
                'action': activity.action,
                'action_description': action_desc,
                'entity_type': entity_type,
                'entity_id': activity.entity_id,
                'user': activity.user.username if activity.user else 'Système',
                'timestamp': activity.created_at.isoformat(),
                'reason': activity.reason,
            })
        
        return Response({
            'activities': activities_list,
        })


"""
Custom template filters for billing app.
"""
from django import template
from datetime import timedelta

register = template.Library()


@register.filter
def add_days(value, days):
    """
    Add days to a date.
    Usage: {{ invoice.created_at|add_days:14 }}
    """
    if not value:
        return None
    try:
        days = int(days)
        if hasattr(value, 'date'):
            # It's a datetime object
            return value + timedelta(days=days)
        elif hasattr(value, '__add__'):
            # It's a date object
            return value + timedelta(days=days)
    except (ValueError, TypeError):
        return None
    return None


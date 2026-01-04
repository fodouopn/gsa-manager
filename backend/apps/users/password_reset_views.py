"""
Password reset views.
"""
import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, PasswordResetToken


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request password reset - generates a token."""
    username_or_email = request.data.get('username') or request.data.get('email')
    
    if not username_or_email:
        return Response(
            {'error': 'Username or email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Try to find user by username or email
        user = User.objects.filter(username=username_or_email).first()
        if not user:
            user = User.objects.filter(email=username_or_email).first()
        
        if not user:
            # Don't reveal if user exists for security
            return Response({
                'message': 'Si un compte existe avec cet identifiant, un email de réinitialisation sera envoyé.'
            })
        
        # Generate token
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        
        # Create or update token (invalidate old ones)
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # In a real app, you would send an email here
        # For now, we return the token in the response (only in development)
        # In production, remove the token from the response
        return Response({
            'message': 'Token de réinitialisation généré',
            'token': token,  # Remove this in production, send via email instead
            'reset_url': f'/reset-password/{token}'
        })
        
    except Exception as e:
        return Response(
            {'error': 'Erreur lors de la génération du token'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_reset_token(request, token):
    """Verify if a reset token is valid."""
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        
        if not reset_token.is_valid():
            return Response(
                {'valid': False, 'error': 'Token invalide ou expiré'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'valid': True,
            'username': reset_token.user.username
        })
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'valid': False, 'error': 'Token invalide'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, token):
    """Reset password using a token."""
    new_password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    
    if not new_password:
        return Response(
            {'error': 'Password is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != confirm_password:
        return Response(
            {'error': 'Les mots de passe ne correspondent pas'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        
        if not reset_token.is_valid():
            return Response(
                {'error': 'Token invalide ou expiré'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password
        try:
            validate_password(new_password, reset_token.user)
        except ValidationError as e:
            return Response(
                {'error': 'Mot de passe invalide', 'details': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset password
        reset_token.user.set_password(new_password)
        reset_token.user.save()
        
        # Mark token as used
        reset_token.used = True
        reset_token.save()
        
        return Response({
            'message': 'Mot de passe réinitialisé avec succès'
        })
        
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Token invalide'},
            status=status.HTTP_404_NOT_FOUND
        )


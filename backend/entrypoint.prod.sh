#!/bin/bash
set -e

echo "Starting GSA Backend production entrypoint..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing commands"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create super admin if it doesn't exist
echo "Checking for super admin user..."
python manage.py shell << EOF
from apps.users.models import User
from django.contrib.auth import get_user_model
import os

User = get_user_model()
email = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@gsa.fr')
password = os.environ.get('SUPER_ADMIN_PASSWORD', 'admin123')

if not User.objects.filter(email=email).exists():
    print(f"Creating super admin user: {email}")
    User.objects.create_superuser(
        username=email.split('@')[0],
        email=email,
        password=password,
        role='SUPER_ADMIN'
    )
    print("Super admin user created successfully")
else:
    print(f"Super admin user {email} already exists")
EOF

# Start Gunicorn
echo "Starting Gunicorn..."
exec "$@"


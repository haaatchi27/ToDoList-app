#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Running migrations..."
python manage.py makemigrations todo
python manage.py migrate

echo "Creating superuser if not exists..."
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'adminadmin')"

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000

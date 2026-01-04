# Migration to convert text fournisseur to Client ForeignKey

from django.db import migrations
from django.db.models import Q


def migrate_fournisseur_data(apps, schema_editor):
    """Convert text fournisseur values to Client ForeignKey."""
    Purchase = apps.get_model('stock', 'Purchase')
    Client = apps.get_model('clients', 'Client')
    
    from django.db import connection
    
    # Get all unique fournisseur text values (not numeric)
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT fournisseur 
            FROM stock_purchase 
            WHERE fournisseur IS NOT NULL 
            AND fournisseur !~ '^[0-9]+$'
        """)
        fournisseur_names = [row[0] for row in cursor.fetchall()]
    
    # Create or find clients for each fournisseur name
    for name in fournisseur_names:
        try:
            # Try to find existing client
            client = Client.objects.filter(
                Q(nom__icontains=name) | Q(entreprise__icontains=name)
            ).first()
            
            if not client:
                # Create new client
                client = Client.objects.create(
                    nom=name,
                    prenom='',
                    actif=True
                )
            
            # Update purchases with this fournisseur name to use client ID
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE stock_purchase 
                    SET fournisseur_client_id = %s 
                    WHERE fournisseur = %s 
                    AND fournisseur !~ '^[0-9]+$'
                """, [client.id, name])
        except Exception as e:
            print(f"Error migrating fournisseur '{name}': {e}")
            continue


def reverse_migrate(apps, schema_editor):
    """Reverse migration."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('stock', '0004_add_fournisseur_client_field'),
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_fournisseur_data, reverse_migrate),
    ]


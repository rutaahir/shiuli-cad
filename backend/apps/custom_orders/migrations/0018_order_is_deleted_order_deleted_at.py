# Generated for Shiuli CAD order soft-delete support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_orders', '0017_order_file_edit_request_alter_order_order_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_deleted',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

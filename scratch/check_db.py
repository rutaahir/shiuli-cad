import os, sys, django

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shiuli_backend.settings')
django.setup()

from apps.accounts.models import User
from apps.catalog.models import Category
from apps.custom_orders.models import CustomRequest, MetalAlloy, AestheticStyle

print("Users in DB:")
for u in User.objects.all():
    print(f"ID={u.id}, Username={u.username}, Role={u.role}, Email={u.email}")

print("\nCategories in DB:")
for c in Category.objects.all():
    print(f"ID={c.id}, Name={c.name}, Slug={c.slug}")

print("\nMetal Alloys in DB:")
for m in MetalAlloy.objects.all():
    print(f"ID={m.id}, Name={m.name}")

print("\nAesthetic Styles in DB:")
for a in AestheticStyle.objects.all():
    print(f"ID={a.id}, Name={a.name}")

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shiuli_backend.settings')
django.setup()

from apps.catalog.models import Product, ProductFile

print("=" * 60)
print("DATABASE PRODUCT COUNT AUDIT")
print("=" * 60)
print(f"Total Products in DB : {Product.objects.count()}")
print(f"  - Approved         : {Product.objects.filter(status='approved').count()}")
print(f"  - Pending          : {Product.objects.filter(status='pending').count()}")
print(f"  - Rejected         : {Product.objects.filter(status='rejected').count()}")
print(f"Total ProductFiles   : {ProductFile.objects.count()}")
print(f"  - 3dm files        : {ProductFile.objects.filter(file_type='3dm').count()}")
print(f"  - stl files        : {ProductFile.objects.filter(file_type='stl').count()}")
print(f"  - render files     : {ProductFile.objects.filter(file_type='render').count()}")
print(f"  - video files      : {ProductFile.objects.filter(file_type='video').count()}")
print()
print("Latest 10 products (most recent first):")
for p in Product.objects.all().order_by('-id')[:10]:
    print(f"  ID={p.id:4d}  slug={p.slug:<35s}  status={p.status:<10}  active={p.is_active}")

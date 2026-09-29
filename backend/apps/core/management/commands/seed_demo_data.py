import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils import timezone
from apps.accounts.models import User, StaffProfile
from apps.catalog.models import Category, DesignStyle, Product, ProductImage, ProductFile
from apps.custom_orders.models import CustomRequest, NegotiationMessage, Order, OrderMilestone, OrderDeliverable
from apps.staff_management.models import PlatformSettings
from apps.payments.models import Payment, Settlement

class Command(BaseCommand):
    help = 'Seeds database with realistic demo data for Shiuli CAD Studio development'

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data for Shiuli CAD Studio...")

        # 1. Platform Settings
        settings_obj = PlatformSettings.load()
        settings_obj.default_max_job_limit = 2
        settings_obj.assignment_mode = "first_accept_wins"
        settings_obj.auto_escalation_minutes = 30
        settings_obj.advance_payment_percentage = 50.00
        settings_obj.save()
        self.stdout.write(self.style.SUCCESS("[OK] Platform settings initialized."))

        # 2. Users & Profiles
        # Super Admin
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "shiulicad@gmail.com",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True
            }
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write(self.style.SUCCESS("[OK] Admin user created (admin / admin123)."))

        # Staff 1 (Senior Designer)
        staff1, created = User.objects.get_or_create(
            username="designer_rahul",
            defaults={
                "email": "rahul@shiuli.com",
                "role": User.Role.STAFF,
                "first_name": "Rahul",
                "last_name": "Sharma",
                "phone_number": "+91 98765 43210"
            }
        )
        if created:
            staff1.set_password("staff123")
            staff1.save()
            StaffProfile.objects.update_or_create(
                user=staff1,
                defaults={
                    "max_concurrent_jobs": 3,
                    "specialty_tags": "Diamond, Solitaire Rings, 3D Rhino",
                    "bio": "Expert CAD jewellery designer with 8+ years experience in bridal rings.",
                    "rating_average": 4.90,
                    "total_jobs_completed": 45
                }
            )
            self.stdout.write(self.style.SUCCESS("[OK] Staff 1 created (designer_rahul / staff123)."))

        # Staff 2 (Junior Designer)
        staff2, created = User.objects.get_or_create(
            username="designer_ananya",
            defaults={
                "email": "ananya@shiuli.com",
                "role": User.Role.STAFF,
                "first_name": "Ananya",
                "last_name": "Patel",
                "phone_number": "+91 98765 43211"
            }
        )
        if created:
            staff2.set_password("staff123")
            staff2.save()
            StaffProfile.objects.update_or_create(
                user=staff2,
                defaults={
                    "max_concurrent_jobs": 2,
                    "specialty_tags": "Modern, Antique Necklaces, Matrix Gold",
                    "bio": "Specialized in intricate filigree and royal Indian antique jewellery designs.",
                    "rating_average": 4.80,
                    "total_jobs_completed": 28
                }
            )
            self.stdout.write(self.style.SUCCESS("[OK] Staff 2 created (designer_ananya / staff123)."))

        # Clients
        client1, created = User.objects.get_or_create(
            username="client_vikram",
            defaults={
                "email": "vikram@example.com",
                "role": User.Role.CLIENT,
                "first_name": "Vikram",
                "last_name": "Mehta",
                "phone_number": "+91 91234 56789"
            }
        )
        if created:
            client1.set_password("client123")
            client1.save()
            self.stdout.write(self.style.SUCCESS("[OK] Client 1 created (client_vikram / client123)."))

        client2, created = User.objects.get_or_create(
            username="client_priya",
            defaults={
                "email": "priya@example.com",
                "role": User.Role.CLIENT,
                "first_name": "Priya",
                "last_name": "Kapoor",
                "phone_number": "+91 91234 56790"
            }
        )
        if created:
            client2.set_password("client123")
            client2.save()
            self.stdout.write(self.style.SUCCESS("[OK] Client 2 created (client_priya / client123)."))

        # 3. Categories & Styles
        categories_data = [
            ("Rings", "rings", 1, "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85", "Solitaires, Bands & Bridal Rings"),
            ("Earrings", "earrings", 2, "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85", "Jhumkas, Drops & Diamond Studs"),
            ("Necklaces", "necklaces", 3, "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85", "Chokers, Chains & Bridal Sets"),
            ("Pendants", "pendants", 4, "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85", "Kundan, Diamond & Solitaire Pendants"),
            ("Bracelets & Bangles", "bracelets-bangles", 5, "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85", "Kadas, Bangles & Tennis Bracelets"),
            ("Mangalsutra", "mangalsutra", 6, "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85", "Traditional & Modern Tanmaniya"),
            ("Nose Pins", "nosepins", 7, "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85", "Diamond Studs & Bridal Naths"),
            ("Polki Jewellery", "polki-jewellery", 8, "https://images.unsplash.com/photo-1611591475140-be38b638ed3d?auto=format&fit=crop&w=1000&q=85", "Royal Jadau & Uncut Diamonds"),
        ]

        created_cats = {}
        for name, slug, order, img_url, tagline in categories_data:
            cat, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "display_order": order,
                    "image_url": img_url,
                    "tagline": tagline,
                    "parent": None,
                }
            )
            created_cats[slug] = cat

        rings = created_cats["rings"]
        solitaire, _ = Category.objects.update_or_create(slug="solitaire-rings", defaults={"name": "Solitaire Rings", "parent": rings, "display_order": 1})
        band_rings, _ = Category.objects.update_or_create(slug="band-rings", defaults={"name": "Band Rings", "parent": rings, "display_order": 2})

        necklaces = created_cats["necklaces"]
        pendant = created_cats["pendants"]
        bracelets = created_cats["bracelets-bangles"]
        earrings = created_cats["earrings"]

        style_diamond, _ = DesignStyle.objects.get_or_create(name="Diamond")
        style_modern, _ = DesignStyle.objects.get_or_create(name="Modern")
        style_traditional, _ = DesignStyle.objects.get_or_create(name="Traditional")
        style_antique, _ = DesignStyle.objects.get_or_create(name="Antique")
        style_casting, _ = DesignStyle.objects.get_or_create(name="Casting Ready")

        self.stdout.write(self.style.SUCCESS("[OK] Categories and Design Styles created."))

        # 4. Ready-made Products
        dummy_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

        prod1, p1_created = Product.objects.get_or_create(
            title="Royal Halo Diamond Engagement Ring CAD",
            defaults={
                "category": solitaire,
                "uploaded_by": staff1,
                "price": 1699.00,
                "compare_at_price": 2499.00,
                "description": "Exquisite 18K White Gold Halo Diamond Ring 3D CAD Model. Precision engineered for casting and gemstone setting.",
                "metal_weight_grams": 4.85,
                "stone_count": 37,
                "status": Product.Status.APPROVED,
                "is_active": True,
                "is_bestseller": True,
                "is_new": False,
                "approved_at": timezone.now()
            }
        )
        if p1_created:
            prod1.style_tags.add(style_diamond, style_modern)
            ProductImage.objects.create(
                product=prod1,
                image_url="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=85",
                is_primary=True
            )
            ProductFile.objects.create(product=prod1, file_type=ProductFile.FileType.FILE_3DM, file=ContentFile(b"MOCK 3DM DATA", name="halo_ring.3dm"))
            ProductFile.objects.create(product=prod1, file_type=ProductFile.FileType.STL, file=ContentFile(b"MOCK STL DATA", name="halo_ring.stl"))

        prod2, p2_created = Product.objects.get_or_create(
            title="Antique Peacock Kundan Pendant CAD",
            defaults={
                "category": pendant,
                "uploaded_by": staff2,
                "price": 2499.00,
                "compare_at_price": 3499.00,
                "description": "Handcrafted Indian traditional Kundan peacock pendant CAD model ready for direct wax printing.",
                "metal_weight_grams": 14.20,
                "stone_count": 82,
                "status": Product.Status.APPROVED,
                "is_active": True,
                "is_bestseller": False,
                "is_new": True,
                "approved_at": timezone.now()
            }
        )
        if p2_created:
            prod2.style_tags.add(style_traditional, style_antique)
            ProductImage.objects.create(
                product=prod2,
                image_url="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=85",
                is_primary=True
            )
            ProductFile.objects.create(product=prod2, file_type=ProductFile.FileType.FILE_3DM, file=ContentFile(b"MOCK 3DM DATA", name="peacock_pendant.3dm"))
            ProductFile.objects.create(product=prod2, file_type=ProductFile.FileType.STL, file=ContentFile(b"MOCK STL DATA", name="peacock_pendant.stl"))

        prod3, p3_created = Product.objects.get_or_create(
            title="Futuristic Geometric Bangle CAD",
            defaults={
                "category": bracelets,
                "uploaded_by": staff1,
                "price": 1899.00,
                "compare_at_price": 2799.00,
                "description": "Modern minimalist geometric bangle CAD file with channel-set baguettes.",
                "metal_weight_grams": 18.50,
                "stone_count": 24,
                "status": Product.Status.APPROVED,
                "is_active": True,
                "is_bestseller": False,
                "is_new": True,
                "approved_at": timezone.now()
            }
        )
        if p3_created:
            prod3.style_tags.add(style_modern, style_casting)
            ProductImage.objects.create(
                product=prod3,
                image_url="https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=85",
                is_primary=True
            )

        self.stdout.write(self.style.SUCCESS("[OK] Demo ready-made products created."))

        self.stdout.write(self.style.SUCCESS("Demo data seeding completed successfully!"))


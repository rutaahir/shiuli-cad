import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.catalog.models import Category, Product, ProductImage
from apps.services.models import Testimonial, FAQ
from apps.portfolio.models import PortfolioItem
from apps.blog.models import BlogPost, BlogTag

User = get_user_model()

class Command(BaseCommand):
    help = "Seed production categories, products, testimonials, gallery portfolio, blog, and faqs"

    def handle(self, *args, **options):
        self.stdout.write("--- Seeding Production Content for Shiuli CAD Studio ---")

        # 1. CATEGORIES
        categories_data = [
            {
                'id_slug': 'rings',
                'name': 'Rings',
                'tagline': 'Solitaires, Halos, Three-Stone & Eternity Bands',
                'image_url': '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
                'display_order': 1,
            },
            {
                'id_slug': 'earrings',
                'name': 'Earrings',
                'tagline': 'Jhumkas, Chandbalis, Studs & Royal Drops',
                'image_url': '/unsplash-img/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
                'display_order': 2,
            },
            {
                'id_slug': 'pendants',
                'name': 'Pendants',
                'tagline': 'Filigree Teardrops, Medallions & Solitaire Mounts',
                'image_url': '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
                'display_order': 3,
            },
            {
                'id_slug': 'necklaces',
                'name': 'Necklaces',
                'tagline': 'Bridal Chokers, Rivieras & Diamond Collars',
                'image_url': '/unsplash-img/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80',
                'display_order': 4,
            },
            {
                'id_slug': 'bangles',
                'name': 'Bangles',
                'tagline': 'Kadas, Filigree Bangles & Hinged Polki Sets',
                'image_url': '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80',
                'display_order': 5,
            },
            {
                'id_slug': 'bracelets',
                'name': 'Bracelets',
                'tagline': 'Tennis Bracelets, Cuffs & Modern Charm Chains',
                'image_url': '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=800&q=80',
                'display_order': 6,
            },
            {
                'id_slug': 'nosepins',
                'name': 'Nosepins',
                'tagline': 'Delicate Floral Studs & Traditional Maharashtrian Naths',
                'image_url': '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
                'display_order': 7,
            },
            {
                'id_slug': 'mangalsutra',
                'name': 'Mangalsutra',
                'tagline': 'Contemporary Tanmaniya & Royal Heritage Centerpieces',
                'image_url': '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
                'display_order': 8,
            },
        ]

        cat_map = {}
        for c in categories_data:
            cat, _ = Category.objects.update_or_create(
                slug=c['id_slug'],
                defaults={
                    'name': c['name'],
                    'tagline': c['tagline'],
                    'image_url': c['image_url'],
                    'display_order': c['display_order'],
                }
            )
            cat_map[c['id_slug']] = cat

        self.stdout.write(f"  [+] Seeded {len(cat_map)} Categories.")

        # 2. PRODUCTS
        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.filter(role='admin').first()

        products_data = [
            {
                'slug': 'scs-ring-01',
                'title': 'The Royal Solitaire Diamond Ring (Six-Prong)',
                'category': cat_map.get('rings'),
                'price': 38.00,
                'compare_at_price': 48.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render'],
                'primary_image': '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'Engineered for maximum diamond fire and zero stone rocking during setting. Features calibrated seat angles of 42° and precision under-bezel clearance for ultrasonic cleaning. Formatted with watertight STL topology tested across Formlabs Form 4 and EnvisionTEC castable wax printers.',
                'is_bestseller': True,
                'is_new': False,
                'is_featured': True,
                'metal_weight_grams': 4.18,
                'stone_count': 1,
                'specs': {
                    'metalWeight18k': '4.18 gm',
                    'metalWeight14k': '3.52 gm',
                    'platinumWeight': '5.82 gm',
                    'diamondCount': 1,
                    'diamondTotalWeight': '1.50 ct (7.4mm)',
                    'dimensions': '21.4 x 18.2 x 7.8 mm',
                    'meshTriangles': '248,500 Triangles',
                    'tolerance': '± 0.02 mm',
                    'centerStone': 'Round Brilliant 7.40 mm',
                    'ringSizeStandard': 'US 6.5 / EU 53',
                },
                'casting_tips': 'Recommended 1.25% volumetric shrinkage compensation applied to STL export. Gate sprue at base of shank.',
            },
            {
                'slug': 'scs-pendant-02',
                'title': 'Shiuli Teardrop Sapphire & Diamond Filigree Pendant',
                'category': cat_map.get('pendants'),
                'price': 49.00,
                'compare_at_price': 65.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render', 'Video'],
                'primary_image': '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'The flagship design from our studio brand showcase. Incorporates 28 micro-prong pavé diamonds framing a central 9x6mm pear-cut Ceylon sapphire. Bail is articulated with hidden hinge to prevent chain torsion.',
                'is_bestseller': True,
                'is_new': True,
                'is_featured': True,
                'metal_weight_grams': 6.45,
                'stone_count': 29,
                'specs': {
                    'metalWeight18k': '6.45 gm',
                    'metalWeight14k': '5.40 gm',
                    'platinumWeight': '8.90 gm',
                    'diamondCount': 29,
                    'diamondTotalWeight': '0.68 ct',
                    'dimensions': '34.2 x 19.8 x 5.6 mm',
                    'meshTriangles': '412,000 Triangles',
                    'tolerance': '± 0.015 mm',
                    'centerStone': 'Pear Sapphire 9.0 x 6.0 mm',
                    'sideStones': '28x 1.3mm Round Brilliant Diamonds',
                },
                'casting_tips': 'Use vacuum investment casting at 580°C flask temp to ensure complete fill of delicate inner scrollwork.',
            },
            {
                'slug': 'scs-earrings-03',
                'title': 'Teardrop Sapphire & Diamond Articulated Drop Earrings',
                'category': cat_map.get('earrings'),
                'price': 54.00,
                'compare_at_price': 70.00,
                'formats_available': ['3DM', 'STL', 'Render'],
                'primary_image': '/unsplash-img/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'Engineered as a two-piece articulated drop earring with smooth fluid motion. Balanced center-of-gravity ensures earrings hang perpendicular to the jawline without forward droop.',
                'is_bestseller': True,
                'is_new': False,
                'is_featured': True,
                'metal_weight_grams': 8.20,
                'stone_count': 42,
                'specs': {
                    'metalWeight18k': '8.20 gm (Pair)',
                    'metalWeight14k': '6.90 gm (Pair)',
                    'diamondCount': 42,
                    'diamondTotalWeight': '0.84 ct (Pair)',
                    'dimensions': '38.5 x 14.2 x 4.8 mm',
                    'meshTriangles': '580,000 Triangles',
                    'tolerance': '± 0.02 mm',
                    'centerStone': '2x Pear Cut Sapphire 8.0 x 5.5 mm',
                    'sideStones': '40x 1.2mm Diamonds',
                },
                'casting_tips': 'Cast with separate sprues for upper stud and lower drop components.',
            },
            {
                'slug': 'scs-ring-04',
                'title': 'Art Deco Emerald Cut Diamond Halo Ring',
                'category': cat_map.get('rings'),
                'price': 42.00,
                'compare_at_price': 55.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render'],
                'primary_image': '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'Geometric architectural lines inspired by 1920s Parisian fine jewellery. Includes recessed gallery filigree allowing flush wedding band pairing.',
                'is_bestseller': False,
                'is_new': True,
                'is_featured': True,
                'metal_weight_grams': 4.85,
                'stone_count': 32,
                'specs': {
                    'metalWeight18k': '4.85 gm',
                    'metalWeight14k': '4.10 gm',
                    'diamondCount': 32,
                    'diamondTotalWeight': '1.95 ct',
                    'dimensions': '22.0 x 19.5 x 6.9 mm',
                    'meshTriangles': '310,000 Triangles',
                    'tolerance': '± 0.02 mm',
                    'centerStone': 'Emerald Cut 8.0 x 6.0 mm (1.50 ct)',
                    'sideStones': 'Tapered Baguettes & Round Pavé',
                },
                'casting_tips': 'Precision milled seats ensure minimal burr work needed on baguette prongs.',
            },
            {
                'slug': 'scs-bangle-05',
                'title': 'The Nizam Polki & Diamond Heritage Hinged Bangle',
                'category': cat_map.get('bangles'),
                'price': 68.00,
                'compare_at_price': 90.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render', 'Video'],
                'primary_image': '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'A masterclass in CAD stone-setting architecture. Dual precision tongue-and-groove clasp mechanism with double safety figure-eight clasps. All collets designed with tapered inner walls for ease of foil placement and stone crimping.',
                'is_bestseller': True,
                'is_new': False,
                'is_featured': True,
                'metal_weight_grams': 34.50,
                'stone_count': 64,
                'specs': {
                    'metalWeight18k': '34.50 gm',
                    'metalWeight14k': '29.20 gm',
                    'diamondCount': 64,
                    'diamondTotalWeight': '4.80 ct',
                    'dimensions': 'Diameter 60.0 mm (Size 2.6)',
                    'meshTriangles': '740,000 Triangles',
                    'tolerance': '± 0.025 mm',
                    'centerStone': 'Polki Diamond Cuts (Calibrated)',
                    'sideStones': 'Faceted Brilliant Pavé',
                },
                'casting_tips': 'Cast half-shanks separately to ensure optimal hinge alignment.',
            },
            {
                'slug': 'scs-necklace-06',
                'title': 'The Versailles Royal Diamond & Sapphire Riviera Collar',
                'category': cat_map.get('necklaces'),
                'price': 85.00,
                'compare_at_price': 110.00,
                'formats_available': ['3DM', 'STL', 'Render', 'Video'],
                'primary_image': '/unsplash-img/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'Fully resolved 3D CAD necklace assembly. Each link features laser-precision hidden pin hinges that conform organically to the collarbone without flipping or pinching.',
                'is_bestseller': False,
                'is_new': True,
                'is_featured': True,
                'metal_weight_grams': 48.20,
                'stone_count': 112,
                'specs': {
                    'metalWeight18k': '48.20 gm',
                    'metalWeight14k': '41.00 gm',
                    'diamondCount': 112,
                    'diamondTotalWeight': '12.40 ct',
                    'dimensions': 'Length 420 mm (16.5 inch)',
                    'meshTriangles': '1,120,000 Triangles',
                    'tolerance': '± 0.015 mm',
                    'centerStone': 'Graduated from 4.8mm to 2.8mm',
                },
                'casting_tips': 'High precision link casting tree provided.',
            },
            {
                'slug': 'scs-bracelet-07',
                'title': 'The Celestial Seamless Box-Clasp Tennis Bracelet',
                'category': cat_map.get('bracelets'),
                'price': 36.00,
                'compare_at_price': 48.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render'],
                'primary_image': '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'Includes individual link units, end clasp male/female mechanisms, and ready-to-cast sprue trees for production mass manufacturing.',
                'is_bestseller': True,
                'is_new': False,
                'is_featured': True,
                'metal_weight_grams': 14.80,
                'stone_count': 52,
                'specs': {
                    'metalWeight18k': '14.80 gm (7-inch)',
                    'metalWeight14k': '12.60 gm',
                    'diamondCount': 52,
                    'diamondTotalWeight': '3.12 ct (2.4mm each)',
                    'dimensions': '180 x 3.2 x 2.8 mm',
                    'meshTriangles': '380,000 Triangles',
                    'tolerance': '± 0.02 mm',
                },
                'casting_tips': 'Tree layout included for maximum yield during centrifugal or vacuum casting.',
            },
            {
                'slug': 'scs-ring-08',
                'title': 'The Shiuli Infinity Ribbon Dual-Tone Band',
                'category': cat_map.get('rings'),
                'price': 39.00,
                'compare_at_price': 52.00,
                'formats_available': ['3DM', 'STL', 'OBJ', 'Render'],
                'primary_image': '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                'images': [
                    '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=80',
                    '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
                ],
                'description': 'A sculptural tribute to our studio signature ribbon. Composed of two distinct interlocking CAD bodies (one for yellow gold, one for white/platinum) that assemble seamlessly post-casting.',
                'is_bestseller': True,
                'is_new': True,
                'is_featured': True,
                'metal_weight_grams': 5.60,
                'stone_count': 36,
                'specs': {
                    'metalWeight18k': '5.60 gm',
                    'metalWeight14k': '4.75 gm',
                    'diamondCount': 36,
                    'diamondTotalWeight': '0.45 ct',
                    'dimensions': '21.0 x 6.4 x 2.2 mm',
                    'meshTriangles': '295,000 Triangles',
                    'tolerance': '± 0.015 mm',
                    'ringSizeStandard': 'US 7 / EU 54',
                },
                'casting_tips': 'Cast parts in 18K Yellow and 950 Platinum separately before micro-pin assembly.',
            },
        ]

        for p_data in products_data:
            images = p_data.pop('images', [])
            primary_img = p_data.pop('primary_image', '')

            prod, created = Product.objects.update_or_create(
                slug=p_data['slug'],
                defaults={
                    **p_data,
                    'status': Product.Status.APPROVED,
                    'uploaded_by': admin_user,
                    'approved_at': datetime.datetime.now(datetime.timezone.utc),
                }
            )

            # Seed Images
            prod.images.all().delete()
            if primary_img:
                ProductImage.objects.create(
                    product=prod,
                    image_url=primary_img,
                    is_primary=True,
                    display_order=0
                )
            for idx, img_url in enumerate(images, 1):
                if img_url != primary_img:
                    ProductImage.objects.create(
                        product=prod,
                        image_url=img_url,
                        is_primary=False,
                        display_order=idx
                    )

        self.stdout.write(f"  [+] Seeded {len(products_data)} Signature Products.")

        # 3. TESTIMONIALS
        testimonials_data = [
            {
                'name': 'Laurent Moreau',
                'role_or_company': 'Creative Director, Atelier Moreau Jewellery (Paris)',
                'quote': 'Shiuli CAD Studio is the first digital atelier that truly understands high jewellery tolerances. Their 3DM files require zero cleanup on Rhino, and the casting shrinkage calibration is exact to 0.02mm. We have migrated all our bespoke bridal modeling to them.',
                'avatar_url': '/unsplash-img/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                'rating': 5,
                'project_type': 'Bespoke Bridal Collections',
                'is_featured': True,
                'display_order': 1,
            },
            {
                'name': 'Vikramaditya Singhania',
                'role_or_company': 'Managing Partner, Singhania & Sons Heritage Jewelers (Mumbai)',
                'quote': 'For complex Polki, Kundan, and Jadau pieces, finding CAD artists who understand collet angles and metal crimping is almost impossible. Shiuli CAD delivered 40 heritage CAD models in under 3 weeks with 100% castable watertight STLs.',
                'avatar_url': '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
                'rating': 5,
                'project_type': 'Heritage Jadau Collections',
                'is_featured': True,
                'display_order': 2,
            },
            {
                'name': 'Eleanor Vance',
                'role_or_company': 'Head of Production, Vance & Co. Fine Diamonds (London)',
                'quote': 'The speed is unbelievable—48-hour turnarounds on custom client sketches with pristine 4K turntable renders that our clients sign off immediately. It transformed our custom sales conversion from 40% to over 85%.',
                'avatar_url': '/unsplash-img/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
                'rating': 5,
                'project_type': 'Custom Engagement Renders & CAD',
                'is_featured': True,
                'display_order': 3,
            },
            {
                'name': 'Tariq Al-Mansoor',
                'role_or_company': 'Master Jeweller, Al-Mansoor Royal Gems (Dubai)',
                'quote': 'We test our STL files on solid wax 3D printers every day. Shiuli CAD models come pre-checked for zero non-manifold edges, optimal prong tapers, and perfect seat depths. A truly royal experience.',
                'avatar_url': '/unsplash-img/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
                'rating': 5,
                'project_type': 'High-Jewellery Necklaces & Cuffs',
                'is_featured': True,
                'display_order': 4,
            },
        ]

        Testimonial.objects.all().delete()
        for t in testimonials_data:
            Testimonial.objects.create(**t)

        self.stdout.write(f"  [+] Seeded {len(testimonials_data)} Testimonials.")

        # 4. PORTFOLIO / GALLERY ITEMS
        gallery_data = [
            {
                'title': 'The Solitaire Cathedral Crown Ring',
                'category': cat_map.get('rings'),
                'category_slug': 'rings',
                'primary_image_url': '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80',
                'sketch_image_url': '/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
                'description': 'Initial hand-drawn client gouache sketch transformed into parametric Rhino 3D model with calibrated pavé seats.',
                'tags': ['Solitaire', 'Custom CAD', '18K Yellow Gold', '±0.02mm Tolerance'],
                'specs': {
                    'weight': '4.18 gm 18K',
                    'stones': '1.50 ct Round + 0.32 ct Pavé',
                    'rhinoFile': 'Layered Rhino 7/8 NURBS (.3DM)',
                },
                'is_custom_project': True,
                'is_featured': True,
                'display_order': 1,
            },
            {
                'title': 'Royal Sapphire Teardrop Medallion',
                'category': cat_map.get('pendants'),
                'category_slug': 'pendants',
                'primary_image_url': '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80',
                'sketch_image_url': '/unsplash-img/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
                'description': 'Heritage filigree scrollwork modeled with variable curve thickness for complete casting integrity.',
                'tags': ['Brand Signature', 'Pendant', 'Ceylon Sapphire', 'Filigree'],
                'specs': {
                    'weight': '6.45 gm 18K',
                    'stones': '9x6mm Pear Sapphire + 28x Diamonds',
                    'rhinoFile': 'Watertight STL Mesh + 3DM',
                },
                'is_custom_project': True,
                'is_featured': True,
                'display_order': 2,
            },
            {
                'title': 'Art Deco Geometric Baguette Suite',
                'category': cat_map.get('earrings'),
                'category_slug': 'earrings',
                'primary_image_url': '/unsplash-img/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1200&q=80',
                'description': 'Articulated drop earrings featuring double hinge mechanism and snug seat milling allowances.',
                'tags': ['Art Deco', 'Drop Earrings', 'CAD Engineering'],
                'specs': {
                    'weight': '8.20 gm Pair',
                    'stones': '42 Diamonds (0.84 ct)',
                    'rhinoFile': 'Dual Articulated 3DM Components',
                },
                'is_custom_project': True,
                'is_featured': True,
                'display_order': 3,
            },
            {
                'title': 'Imperial Peacock Polki Heritage Choker',
                'category': cat_map.get('necklaces'),
                'category_slug': 'necklaces',
                'primary_image_url': '/unsplash-img/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1200&q=80',
                'description': 'Traditional Jadau collet design optimized for modern resin 3D printing and zero-void casting.',
                'tags': ['Kundan Polki', 'Bridal Choker', 'High Jewellery'],
                'specs': {
                    'weight': '52.40 gm 18K',
                    'stones': 'Calibrated Polki Slices',
                    'rhinoFile': 'Multi-body Assembly (18 Links)',
                },
                'is_custom_project': True,
                'is_featured': True,
                'display_order': 4,
            },
            {
                'title': 'Continuum Diamond Tennis Bracelet',
                'category': cat_map.get('bracelets'),
                'category_slug': 'bracelets',
                'primary_image_url': '/unsplash-img/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1200&q=80',
                'description': 'Zero-friction internal pin connections engineered for 360-degree wrist contouring without stiff links.',
                'tags': ['Production CAD', 'Sprue Tree Included', 'Tennis Link'],
                'specs': {
                    'weight': '14.80 gm 18K',
                    'stones': '52 Diamonds (3.12 ct)',
                    'rhinoFile': 'Rhino + Formlabs STL Ready',
                },
                'is_custom_project': False,
                'is_featured': True,
                'display_order': 5,
            },
            {
                'title': 'Heritage Floral Diamond Bangle',
                'category': cat_map.get('bangles'),
                'category_slug': 'bangles',
                'primary_image_url': '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1200&q=80',
                'description': 'Carved micro-filigree floral relief pattern with integrated concealed spring push-lock.',
                'tags': ['Kada', 'Push Clasp', '3D Precision'],
                'specs': {
                    'weight': '34.50 gm 18K',
                    'stones': '64 Round Diamonds',
                    'rhinoFile': 'Parametric CAD + STL',
                },
                'is_custom_project': True,
                'is_featured': True,
                'display_order': 6,
            },
        ]

        for g in gallery_data:
            PortfolioItem.objects.update_or_create(
                title=g['title'],
                defaults={
                    **g,
                    'is_published': True,
                }
            )

        self.stdout.write(f"  [+] Seeded {len(gallery_data)} Portfolio & Gallery Items.")

        # 5. BLOG POSTS
        blog_data = [
            {
                'slug': 'jewellery-cad-shrinkage-allowances',
                'title': 'Mastering Shrinkage Allowances in Jewellery CAD: Platinum vs 18K Gold',
                'category': 'Casting & Metallurgy',
                'excerpt': 'How our master modelers calibrate linear and volumetric shrinkage factors for rubber mould versus direct castable wax printing.',
                'content': [
                    'In precision jewellery manufacturing, designing at 1:1 scale without accounting for metal contraction leads to rejected stones, loose prongs, and undersized ring shanks.',
                    'For 18K yellow and rose gold alloys, typical volumetric shrinkage ranges from 1.2% to 1.8%, while 950 Platinum exhibits shrinkage characteristics of up to 2.4% with increased surface porosity risks.',
                    'At Shiuli CAD Studio, every exported STL file is pre-compensated according to your designated casting route—whether you are using direct castable resin (e.g. Formlabs Castable Wax 40) or vulcanized rubber master moulds.',
                ],
                'read_time': '6 min read',
                'date_published': datetime.date(2026, 9, 2),
                'author_name': 'Harshil Shah',
                'author_role': 'Head CAD Engineer & Gemologist',
                'author_avatar_url': '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                'cover_image_url': '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
                'tags': ['Casting Guide', '3D Printing', 'CAD Engineering'],
            },
            {
                'slug': 'micro-pave-seat-angles-cad',
                'title': 'Micro-Pavé Seat Angles: Eliminating Stone Loss in Production Casts',
                'category': 'MatrixGold & Rhino 3D',
                'excerpt': 'Why standard flat drill-holes fail during setting, and how tapered azured under-cutting maximizes light return while securing gems.',
                'content': [
                    'One of the most common flaws in generic CAD marketplace downloads is blind-drilled stone holes. Without precise conical azures and tapered prong tips, setters must spend 3x the time with hand burs.',
                    'We incorporate 42° seat angles with 0.15mm pre-notched bead grooves into every Rhino sub-assembly. This guarantees that 1.0mm to 1.5mm accent melee diamonds snap into position with exact level tables.',
                    'Discover our standard tolerances and why our clients report a 95% reduction in stone setting turnaround times.',
                ],
                'read_time': '5 min read',
                'date_published': datetime.date(2026, 8, 24),
                'author_name': 'Ananya Sharma',
                'author_role': 'Lead MatrixGold Specialist',
                'author_avatar_url': '/unsplash-img/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
                'cover_image_url': '/unsplash-img/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
                'tags': ['Pavé Setting', 'MatrixGold', 'Diamond Tolerances'],
            },
            {
                'slug': 'sketch-to-photorealistic-renders',
                'title': 'From Rough Gouache Sketch to Photorealistic 4K Client Renders',
                'category': '3D Printing Resins',
                'excerpt': 'How presenting ray-traced lighting and caustics closes high-ticket bespoke jewellery sales before cutting a single gram of metal.',
                'content': [
                    'Modern luxury clients do not want to see wireframe lines or plastic-looking CAD mockups. They demand to see how their 3-carat sapphire will refract candlelight on a dinner date.',
                    'Shiuli CAD Studio pairs technical Rhino engineering with physically based rendering (PBR) workflows in Blender and KeyShot. Learn how our clients use our renders to collect 50% non-refundable deposits upfront.',
                ],
                'read_time': '7 min read',
                'date_published': datetime.date(2026, 8, 11),
                'author_name': 'Harshil Shah',
                'author_role': 'Head CAD Engineer',
                'author_avatar_url': '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                'cover_image_url': '/unsplash-img/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
                'tags': ['3D Rendering', 'Client Conversion', 'Bespoke Sales'],
            },
            {
                'slug': 'optimizing-3d-printing-resins-jewellery',
                'title': 'Optimizing Formlabs Castable Wax 40 & EnvisionTEC Resins for Zero Ash Residue',
                'category': '3D Printing Resins',
                'excerpt': 'Burnout curve charts, ramp rates, and post-curing procedures to ensure crisp detail and eliminate gas inclusions in cast gold.',
                'content': [
                    'Photopolymer resins have revolutionized rapid prototyping, but improper burnout leads to porosity and carbon residue in precious metal castings.',
                    'We outline precise temperature ramp schedules (reaching 732°C / 1350°F peak soak) and recommended investment powder mixing ratios (38:100 water-to-powder ratio for Ransom & Randolph Ultra-Vest).',
                    'Following this protocol guarantees mirror-smooth castings directly from your resin models.',
                ],
                'read_time': '8 min read',
                'date_published': datetime.date(2026, 7, 29),
                'author_name': 'Harshil Shah',
                'author_role': 'Head CAD Engineer',
                'author_avatar_url': '/unsplash-img/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                'cover_image_url': '/unsplash-img/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80',
                'tags': ['3D Printing', 'Resin Burnout', 'Foundry'],
            },
        ]

        for b in blog_data:
            tag_names = b.pop('tags', [])
            post, _ = BlogPost.objects.update_or_create(
                slug=b['slug'],
                defaults={
                    **b,
                    'is_published': True,
                }
            )
            for t_name in tag_names:
                tag, _ = BlogTag.objects.get_or_create(name=t_name)
                post.tags.add(tag)

        self.stdout.write(f"  [+] Seeded {len(blog_data)} Blog Posts.")

        # 6. FAQS
        faqs_data = [
            {
                'question': 'What file formats do I receive with ready and custom CAD designs?',
                'answer': 'You receive fully editable native Rhino .3DM files (organized on distinct layers for metal, prongs, stones, and cutters), production-ready watertight .STL meshes calibrated for direct casting/printing (tested with zero non-manifold edges), and high-resolution 4K studio renders. OBJ and turntable animations are included where specified.',
                'category': 'Files & Formats',
                'display_order': 1,
            },
            {
                'question': 'Are the STL files calibrated for casting shrinkage?',
                'answer': 'Yes! By default, our STL files incorporate standard 1.25% volumetric casting shrinkage compensation suitable for 14K/18K gold and platinum investment casting. If your foundry utilizes custom vulcanized rubber moulds with higher shrinkage rates, simply specify in your order notes and we will provide custom offsets.',
                'category': 'Manufacturing',
                'display_order': 2,
            },
            {
                'question': 'What is your turnaround time for custom bespoke CAD requests?',
                'answer': 'Standard custom designs (solitaires, halo rings, classic pendants) are delivered within 48 hours. Express priority turnaround (24 hours) is available upon request. Complex multi-piece suites, articulated bridal necklaces, or Jadau heritage sets typically require 3 to 5 business days with milestone 3D previews provided throughout.',
                'category': 'Turnaround',
                'display_order': 3,
            },
            {
                'question': 'What happens if I or my client requires design revisions?',
                'answer': 'Every custom CAD order includes up to 2 complimentary revision rounds (such as adjusting prong styles, tweaking shank profiles, resizing finger diameters, or modifying stone layouts). Revisions are turned around within 24 hours to keep your client orders on track.',
                'category': 'Revisions',
                'display_order': 4,
            },
            {
                'question': 'Can I manufacture and sell jewellery made from these CAD files?',
                'answer': 'Absolutely. Our Standard License permits unlimited physical jewellery production and casting for individual client orders. Our Commercial License additionally grants full rights for catalogue mass manufacturing, e-commerce marketing, and sub-assembly distribution.',
                'category': 'Licensing',
                'display_order': 5,
            },
            {
                'question': 'How do I submit my sketches or reference photos for a custom quote?',
                'answer': 'You can submit directly through our interactive Custom Design page by uploading pencil sketches, photos, or Pinterest moodboards, along with target stone dimensions and budget. Alternatively, you can message our master CAD team directly on WhatsApp (+91 95747 87098) for instant evaluation.',
                'category': 'Custom Orders',
                'display_order': 6,
            },
        ]

        FAQ.objects.all().delete()
        for f in faqs_data:
            FAQ.objects.create(**f)

        self.stdout.write(f"  [+] Seeded {len(faqs_data)} FAQs.")
        self.stdout.write(self.style.SUCCESS("All Production Data Seeded Successfully!"))

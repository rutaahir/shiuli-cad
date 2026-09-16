from django.core.management.base import BaseCommand
from apps.custom_orders.models import AestheticStyle, MetalAlloy, GemstoneOption, PricingRule
from apps.catalog.models import Category

class Command(BaseCommand):
    help = "Seeds initial configurator options: Metal Alloys, Aesthetic Styles, Gemstones, and Category Pricing Rules."

    def handle(self, *args, **options):
        self.stdout.write("Seeding configurator options...")

        # 1. Metal Alloys with hex swatches
        metals_data = [
            {"name": "18K Yellow Gold", "swatch_color": "#D4AF37", "price_multiplier": 1.00, "display_order": 1},
            {"name": "18K White Gold", "swatch_color": "#E5E4E2", "price_multiplier": 1.05, "display_order": 2},
            {"name": "18K Rose Gold", "swatch_color": "#B76E79", "price_multiplier": 1.05, "display_order": 3},
            {"name": "Platinum 950", "swatch_color": "#E0E0E0", "price_multiplier": 1.35, "display_order": 4},
        ]
        for item in metals_data:
            MetalAlloy.objects.get_or_create(
                name=item["name"],
                defaults={
                    "swatch_color": item["swatch_color"],
                    "price_multiplier": item["price_multiplier"],
                    "display_order": item["display_order"]
                }
            )

        # 2. Aesthetic Styles
        styles_data = [
            {"name": "Royal Filigree", "price_addon": 150.00, "display_order": 1},
            {"name": "Modern Minimalist", "price_addon": 50.00, "display_order": 2},
            {"name": "Vintage Art Deco", "price_addon": 120.00, "display_order": 3},
            {"name": "Solitaire Heritage", "price_addon": 75.00, "display_order": 4},
        ]
        for item in styles_data:
            AestheticStyle.objects.get_or_create(
                name=item["name"],
                defaults={
                    "price_addon": item["price_addon"],
                    "display_order": item["display_order"]
                }
            )

        # 3. Gemstone Options
        gemstones_data = [
            {"stone_type": "Diamond", "cut_type": "Round Brilliant", "price_per_unit": 250.00},
            {"stone_type": "Diamond", "cut_type": "Emerald Cut", "price_per_unit": 280.00},
            {"stone_type": "Diamond", "cut_type": "Oval Cut", "price_per_unit": 260.00},
            {"stone_type": "Royal Sapphire", "cut_type": "Oval Cut", "price_per_unit": 180.00},
            {"stone_type": "Colombian Emerald", "cut_type": "Emerald Cut", "price_per_unit": 220.00},
            {"stone_type": "Burmese Ruby", "cut_type": "Cushion Cut", "price_per_unit": 200.00},
        ]
        for item in gemstones_data:
            GemstoneOption.objects.get_or_create(
                stone_type=item["stone_type"],
                cut_type=item["cut_type"],
                defaults={"price_per_unit": item["price_per_unit"]}
            )

        # 4. Pricing Rules for existing categories
        categories = Category.objects.all()
        for cat in categories:
            rule, created = PricingRule.objects.get_or_create(
                category=cat,
                defaults={"base_price": 100.00}
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded configurator options!"))

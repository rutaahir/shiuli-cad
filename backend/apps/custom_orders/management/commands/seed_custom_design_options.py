from django.core.management.base import BaseCommand
from apps.custom_orders.models import OptionGroup, OptionValue
from apps.catalog.models import Category

class Command(BaseCommand):
    help = "Seed exact option groups and values for the Custom Design wizard."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Custom Design Option Groups & Values...")

        # Find Ring category if it exists
        ring_cat = Category.objects.filter(slug__icontains="ring").first() or Category.objects.filter(name__icontains="ring").first()

        GROUPS_DATA = [
            {
                "key": "ring_type",
                "label": "Ring Type",
                "is_required": True,
                "allows_other": True,
                "display_order": 1,
                "categories": [ring_cat] if ring_cat else [],
                "values": [
                    {"label": "Engagement Ring"},
                    {"label": "Wedding Ring"},
                    {"label": "Solitaire"},
                    {"label": "Signet"},
                    {"label": "Men's Ring"},
                    {"label": "Women's Ring"},
                    {"label": "Bridal Ring"},
                    {"label": "Fashion Ring"},
                ]
            },
            {
                "key": "design_style",
                "label": "Design Style",
                "is_required": True,
                "allows_other": True,
                "display_order": 2,
                "categories": [],
                "values": [
                    {"label": "Classic"},
                    {"label": "Modern"},
                    {"label": "Minimal"},
                    {"label": "Vintage"},
                    {"label": "Antique"},
                    {"label": "Luxury"},
                    {"label": "Royal"},
                    {"label": "Floral"},
                    {"label": "Geometric"},
                    {"label": "Custom"},
                ]
            },
            {
                "key": "stone_shape",
                "label": "Stone Shape",
                "is_required": False,
                "allows_other": True,
                "display_order": 3,
                "categories": [],
                "values": [
                    {"label": "Round", "icon": "circle"},
                    {"label": "Oval", "icon": "ellipse"},
                    {"label": "Princess", "icon": "square"},
                    {"label": "Cushion", "icon": "cushion"},
                    {"label": "Emerald", "icon": "rectangle"},
                    {"label": "Pear", "icon": "drop"},
                    {"label": "Marquise", "icon": "eye"},
                    {"label": "Heart", "icon": "heart"},
                    {"label": "Baguette", "icon": "slim-rectangle"},
                ]
            },
            {
                "key": "stone_setting",
                "label": "Stone Setting",
                "is_required": False,
                "allows_other": True,
                "display_order": 4,
                "categories": [],
                "values": [
                    {"label": "Prong"},
                    {"label": "Bezel"},
                    {"label": "Halo"},
                    {"label": "Pave"},
                    {"label": "Channel"},
                    {"label": "Cluster"},
                    {"label": "Invisible"},
                ]
            },
            {
                "key": "metal",
                "label": "Metal Alloy",
                "is_required": True,
                "allows_other": True,
                "display_order": 5,
                "categories": [],
                "values": [
                    {"label": "Yellow Gold", "swatch_color": "#E8C468"},
                    {"label": "Rose Gold", "swatch_color": "#E0A899"},
                    {"label": "White Gold", "swatch_color": "#E8E8E8"},
                    {"label": "Silver", "swatch_color": "#C0C0C0"},
                    {"label": "Platinum", "swatch_color": "#E5E4E2"},
                ]
            },
            {
                "key": "gold_purity",
                "label": "Gold Purity",
                "is_required": False,
                "allows_other": False,
                "display_order": 6,
                "categories": [],
                "values": [
                    {"label": "9K"},
                    {"label": "10K"},
                    {"label": "14K"},
                    {"label": "18K"},
                    {"label": "22K"},
                    {"label": "24K"},
                ]
            },
            {
                "key": "cad_file_format",
                "label": "CAD File Required",
                "is_required": True,
                "allows_other": False,
                "display_order": 7,
                "categories": [],
                "values": [
                    {"label": "3DM"},
                    {"label": "STL"},
                    {"label": "Both 3DM + STL"},
                ]
            },
            {
                "key": "delivery_speed",
                "label": "Delivery Speed",
                "is_required": True,
                "allows_other": False,
                "display_order": 8,
                "categories": [],
                "values": [
                    {"label": "Standard", "price_modifier": 0},
                    {"label": "Express", "price_modifier": 0},
                ]
            },
        ]

        for gdata in GROUPS_DATA:
            group, created = OptionGroup.objects.get_or_create(
                key=gdata["key"],
                defaults={
                    "label": gdata["label"],
                    "is_required": gdata["is_required"],
                    "allows_other": gdata["allows_other"],
                    "display_order": gdata["display_order"],
                }
            )
            if not created:
                group.label = gdata["label"]
                group.is_required = gdata["is_required"]
                group.allows_other = gdata["allows_other"]
                group.display_order = gdata["display_order"]
                group.save()

            if gdata.get("categories"):
                group.applies_to_categories.set(gdata["categories"])

            for idx, val_data in enumerate(gdata["values"], start=1):
                val, _ = OptionValue.objects.get_or_create(
                    group=group,
                    label=val_data["label"],
                    defaults={
                        "price_modifier": val_data.get("price_modifier", 0),
                        "modifier_type": val_data.get("modifier_type", "flat"),
                        "swatch_color": val_data.get("swatch_color", ""),
                        "icon": val_data.get("icon", ""),
                        "display_order": idx,
                        "is_active": True,
                    }
                )
                val.swatch_color = val_data.get("swatch_color", val.swatch_color)
                val.icon = val_data.get("icon", val.icon)
                val.display_order = idx
                val.save()

        self.stdout.write(self.style.SUCCESS("Successfully seeded Custom Design Option Groups and Values!"))

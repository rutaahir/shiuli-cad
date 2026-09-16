from django.core.management.base import BaseCommand
from apps.services.models import ServicePage, ServicePageFeature
from apps.file_edits.models import ModificationType
from apps.portfolio.models import PortfolioItem
from apps.catalog.models import Category

class Command(BaseCommand):
    help = "Seed CAD Services, About Us sections, Modification Types, and Portfolio items."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Full Site Restructure Data...")

        # 1. SEED MODIFICATION TYPES FOR FILE EDITING (Section 3)
        mod_types_data = [
            ("3dm-file-editing", "3DM File Editing", "Rhino 8 native NURBS surface modification, layer organization, and feature adjustments.", 150.00, "Layers"),
            ("stl-file-editing", "STL File Editing", "Triangle mesh repairing, watertight topological fixes, and polygon sculpting.", 120.00, "Box"),
            ("size-modification", "Size Modification", "Ring size resizing (US, UK, Indian, EU), inner diameter scaling, and shank re-balancing.", 50.00, "Ruler"),
            ("weight-adjustment", "Weight Adjustment", "Gold/Metal gram weight calibration, under-gallery hollowing, and thickness optimization.", 75.00, "Scale"),
            ("stone-size-modification", "Stone Size Modification", "Adjusting stone seat dimensions, bezel boundaries, and table depths.", 80.00, "Gem"),
            ("stone-setting-modification", "Stone Setting Modification", "Switching setting styles (e.g. Prong to Bezel, Pave to Channel, Flush to Micro-Pave).", 100.00, "Sparkles"),
            ("shape-modification", "Shape Modification", "Altering ring shank profiles, halo contours, and motif outlines.", 110.00, "Edit"),
            ("add-remove-stones", "Add / Remove Stones", "Adding accent halo stones, side baguettes, or converting to solid metal band.", 90.00, "Plus"),
            ("name-initial-logo", "Name / Initial / Logo", "Embossing studio logos, hallmarks, initials, or 3D relief emblems.", 65.00, "ShieldCheck"),
            ("engraving", "Engraving Correction", "Calibrating 3D relief text, script fonts, and inside shank calligraphy.", 45.00, "FileText"),
            ("manufacturing-correction", "Manufacturing Correction", "Fixing cold-shuts, thin wall warnings, sprue gates, and prong clearance.", 130.00, "CheckCircle2"),
            ("casting-3d-printing-prep", "Casting & 3D Printing Prep", "Adding sprue feeders, shrinkage allowance (+1.25%), and Formlabs STL export.", 95.00, "Printer"),
        ]

        for idx, (key, label, desc, price, icon) in enumerate(mod_types_data, 1):
            mt, created = ModificationType.objects.get_or_create(
                key=key,
                defaults={
                    "label": label,
                    "description": desc,
                    "base_price": price,
                    "icon": icon,
                    "display_order": idx,
                    "is_active": True
                }
            )
            if not created:
                mt.label = label
                mt.description = desc
                mt.base_price = price
                mt.icon = icon
                mt.display_order = idx
                mt.save()

        self.stdout.write(f"  [+] Seeded {len(mod_types_data)} Modification Types.")

        # 2. SEED 10 CAD SERVICES LANDING PAGES (Section 1)
        rings_cat = Category.objects.filter(slug='rings').first() or Category.objects.first()
        earrings_cat = Category.objects.filter(slug='earrings').first() or rings_cat
        pendants_cat = Category.objects.filter(slug='pendants').first() or rings_cat
        necklaces_cat = Category.objects.filter(slug='necklaces').first() or rings_cat
        bracelets_cat = Category.objects.filter(slug='bracelets').first() or rings_cat

        services_data = [
            ("ring-cad-design", "Ring CAD Design", "Bespoke Solitaire, Halo, Eternity & Cocktail Ring CAD Files", "Precision ring CAD engineering calibrated for exact finger sizes, stone seats, and foundry shrinkage factors.", rings_cat, "Start Your Design", "custom_design"),
            ("earring-cad-design", "Earring CAD Design", "Studs, Jhumkas, Drop Earrings & Ear Cuffs CAD Files", "3D earring CAD modelling with pre-notched post mechanisms, French wire loops, and balanced earlobe weight.", earrings_cat, "Start Your Design", "custom_design"),
            ("pendant-cad-design", "Pendant CAD Design", "Solitaire Drops, Medallions & Filigree Pendant CAD Files", "High-detail pendant CAD models with integrated bail clearance, backplates, and casting sprues.", pendants_cat, "Start Your Design", "custom_design"),
            ("necklace-cad-design", "Necklace CAD Design", "Bridal Chokers, Rivieras & Diamond Collar CAD Files", "Articulated necklace link assemblies with 0.15mm mechanical tolerances for fluid drape and movement.", necklaces_cat, "Start Your Design", "custom_design"),
            ("bracelet-cad-design", "Bracelet CAD Design", "Tennis Bracelets, Hinged Cuffs & Charm Link CAD Files", "Continuous stone channel alignment and secure double-latch box clasp engineering.", bracelets_cat, "Start Your Design", "custom_design"),
            ("bangle-cad-design", "Bangle CAD Design", "Traditional Kadas, Stackable Bangles & Polki CAD Files", "Rigid and hinged bangle CAD files pre-scaled for Indian and international wrist sizing standards.", bracelets_cat, "Start Your Design", "custom_design"),
            ("bridal-jewellery-cad", "Bridal Jewellery CAD", "Haute Joaillerie Engagement & Wedding Suite CAD", "Complete bridal jewelry suites matching ring, pendant, and earring design motifs seamlessly.", rings_cat, "Start Your Design", "custom_design"),
            ("mens-jewellery-cad", "Men's Jewellery CAD", "Signet Rings, Cufflinks & Cuban Chain Link CAD", "Heavy solid-metal design architecture with crisp geometric facets and deep relief engraving.", rings_cat, "Start Your Design", "custom_design"),
            ("jewellery-sets-cad", "Jewellery Sets", "Matching Necklace, Earring, Ring & Bracelet CAD Suites", "Harmonious jewelry sets designed with unified motif proportions and setting aesthetics.", rings_cat, "Start Your Design", "custom_design"),
            ("other-jewellery-cad", "Other Jewellery", "Brooches, Tiara Crowns, Keychains & Specialty Accessories", "Custom 3D CAD modeling for unique accessories, lapel pins, and bespoke jewelry artifacts.", rings_cat, "Start Your Design", "custom_design"),
        ]

        for idx, (slug, title, subtitle, intro, cat, cta_lbl, cta_tgt) in enumerate(services_data, 1):
            sp, _ = ServicePage.objects.get_or_create(
                slug=slug,
                defaults={
                    "section": "cad_service",
                    "title": title,
                    "subtitle": subtitle,
                    "intro_text": intro,
                    "display_order": idx,
                    "linked_category": cat,
                    "cta_label": cta_lbl,
                    "cta_target": cta_tgt,
                    "is_published": True
                }
            )
            # Update fields
            sp.title = title
            sp.subtitle = subtitle
            sp.intro_text = intro
            sp.display_order = idx
            sp.save()

            # Add features
            if sp.features.count() == 0:
                ServicePageFeature.objects.create(page=sp, icon="Sparkles", title="0.02mm Dimensional Accuracy", description="Calibrated prong seats and wall thickness.", display_order=1)
                ServicePageFeature.objects.create(page=sp, icon="ShieldCheck", title="100% Watertight Mesh", description="Zero non-manifold edges ready for wax printing.", display_order=2)
                ServicePageFeature.objects.create(page=sp, icon="Clock", title="Fast Turnaround", description="48-72 hour delivery on standard requests.", display_order=3)

        self.stdout.write(f"  [+] Seeded {len(services_data)} CAD Service landing pages.")

        # 3. SEED 4 ABOUT US SECTIONS (Section 10)
        about_data = [
            ("about-shiuli-cad-studio", "About Shiuli CAD Studio", "Pioneering Fine Jewelry Digital Craftsmanship Since 2012", "Shiuli CAD Studio was founded by master goldsmiths and CAD engineers to bridge the gap between traditional fine jewelry artistry and high-precision 3D digital manufacturing.", "custom_design"),
            ("our-services", "Our Services", "End-to-End 3D Jewelry CAD Modeling, File Editing & AI Design", "Comprehensive CAD engineering suite covering custom design creation, file modification, STL mesh repair, rendering, and production casting preparation.", "custom_design"),
            ("our-experience", "Our Experience", "Over 12+ Years & 15,000+ Master CAD Models Delivered Globally", "Our team combines decades of bench jeweler experience with advanced Rhino 8 & MatrixGold parametric modelling for flawless casting results.", "collections"),
            ("our-technology", "Our Technology", "Industry-Leading 3D Modeling Software & 3D Print Calibration", "Utilizing MatrixGold, Rhino 8, ZBrush, and Magics for watertight mesh validation (+1.25% shrinkage pre-scaled for Formlabs & EnvisionTEC wax printers).", "contact"),
        ]

        for idx, (slug, title, subtitle, intro, cta_tgt) in enumerate(about_data, 1):
            sp, _ = ServicePage.objects.get_or_create(
                slug=slug,
                defaults={
                    "section": "about",
                    "title": title,
                    "subtitle": subtitle,
                    "intro_text": intro,
                    "display_order": idx,
                    "cta_label": "Learn More",
                    "cta_target": cta_tgt,
                    "is_published": True
                }
            )
            sp.title = title
            sp.subtitle = subtitle
            sp.intro_text = intro
            sp.display_order = idx
            sp.save()

        self.stdout.write(f"  [+] Seeded {len(about_data)} About Us sections.")

        # 4. SEED INITIAL PORTFOLIO SHOWCASE ITEMS (Section 7)
        portfolio_data = [
            ("Royal Filigree Emerald Solitaire Ring", "rings", True, False, "Bespoke 18K yellow gold cathedral ring featuring vintage filigree under-gallery and 3.5ct Colombian emerald seat."),
            ("Art Deco Diamond Drop Earrings", "earrings", True, False, "Geometric step-cut diamond drop earrings engineered with micro-pave borders and security screw posts."),
            ("AI-Assisted Floral Medallion Pendant", "pendants", False, True, "Concept generated via Shiuli AI Studio and sculpted into 3DM NURBS geometry with pre-notched bail."),
            ("Riviera Graduated Diamond Collar", "necklaces", True, False, "54-stone graduated diamond Riviera necklace with articulated mechanical joints for effortless neck contouring."),
        ]

        for idx, (p_title, cat_slug, is_custom, is_ai, p_desc) in enumerate(portfolio_data, 1):
            cat = Category.objects.filter(slug=cat_slug).first() or rings_cat
            PortfolioItem.objects.get_or_create(
                title=p_title,
                defaults={
                    "category": cat,
                    "category_slug": cat_slug,
                    "is_custom_project": is_custom,
                    "is_ai_project": is_ai,
                    "description": p_desc,
                    "is_featured": True,
                    "is_published": True,
                    "display_order": idx
                }
            )

        self.stdout.write(f"  [+] Seeded {len(portfolio_data)} Portfolio showcase items.")

        self.stdout.write(self.style.SUCCESS("FULL SITE RESTRUCTURE DATA SEEDED SUCCESSFULLY!"))

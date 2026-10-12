from decimal import Decimal
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.catalog.models import Category, Product
from apps.payments.models import Purchase
from apps.catalog.pricing_service import (
    validate_regional_pricing,
    resolve_product_pricing,
    detect_customer_country,
    get_country_info,
    get_exchange_rate,
)

User = get_user_model()


class CountryTierPricingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rf = RequestFactory()

        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@shiulistudio.com",
            password="adminpassword123",
            role="admin"
        )
        self.staff = User.objects.create_user(
            username="staff_designer",
            email="staff@shiulistudio.com",
            password="staffpassword123",
            role="staff"
        )
        self.customer = User.objects.create_user(
            username="client_buyer",
            email="client@example.com",
            password="clientpassword123",
            role="client"
        )

        self.category = Category.objects.create(
            name="Rings",
            slug="rings",
            commission_percentage=20.00
        )

        # 1. Existing Legacy Global Product
        self.global_product = Product.objects.create(
            title="Heritage Royal Solitaire",
            slug="heritage-royal-solitaire",
            category=self.category,
            price=25000.00,
            compare_at_price=30000.00,
            pricing_mode=Product.PricingMode.GLOBAL,
            status=Product.Status.APPROVED,
            is_active=True,
            uploaded_by=self.admin
        )

        # 2. Regional 5-Tier Product Configuration
        self.sample_regional_config = {
            "base_tier": {
                "name": "Base Country",
                "countries": ["IN"],
                "price_usd": 20.00
            },
            "tier_1": {
                "name": "Tier 1",
                "countries": ["BD", "NP", "LK"],
                "price_usd": 10.00
            },
            "tier_2": {
                "name": "Tier 2",
                "countries": ["US", "CA", "GB"],
                "price_usd": 25.00
            },
            "tier_3": {
                "name": "Tier 3",
                "countries": ["AU", "NZ", "SG"],
                "price_usd": 30.00
            },
            "rest_of_world": {
                "name": "Rest of the World",
                "price_usd": 15.00
            }
        }

        self.regional_product = Product.objects.create(
            title="Parametric Diamond Band",
            slug="parametric-diamond-band",
            category=self.category,
            price=20.00,  # USD fallback
            pricing_mode=Product.PricingMode.REGIONAL,
            regional_pricing=self.sample_regional_config,
            status=Product.Status.APPROVED,
            is_active=True,
            uploaded_by=self.admin
        )

    def test_existing_global_product_preserves_price(self):
        """Scenario 13: Existing global products continue working without price modification."""
        pricing_in = resolve_product_pricing(self.global_product, country_code="IN")
        self.assertEqual(pricing_in["pricing_mode"], "global")
        self.assertEqual(pricing_in["unit_price"], 25000.00)
        self.assertEqual(pricing_in["currency"], "INR")
        self.assertEqual(pricing_in["formatted"], "₹25,000")

        # Global mode preserves same price regardless of country
        pricing_us = resolve_product_pricing(self.global_product, country_code="US")
        self.assertEqual(pricing_us["unit_price"], 25000.00)

    def test_regional_tier_assignment_resolution(self):
        """Scenario 7 & 8: Each country receives its assigned tier price, or falls back to Rest of the World."""
        # 1. Base Country: India -> $20 USD
        p_in = resolve_product_pricing(self.regional_product, country_code="IN")
        self.assertEqual(p_in["tier_key"], "base_tier")
        self.assertEqual(p_in["price_usd"], 20.00)
        self.assertEqual(p_in["currency"], "INR")
        # Converted into INR using authoritative rate
        inr_rate = get_exchange_rate("INR")
        expected_inr = round(20.00 * inr_rate)
        self.assertEqual(p_in["unit_price"], expected_inr)

        # 2. Tier 1: Bangladesh -> $10 USD
        p_bd = resolve_product_pricing(self.regional_product, country_code="BD")
        self.assertEqual(p_bd["tier_key"], "tier_1")
        self.assertEqual(p_bd["price_usd"], 10.00)
        self.assertEqual(p_bd["currency"], "BDT")

        # 3. Tier 2: United States -> $25 USD
        p_us = resolve_product_pricing(self.regional_product, country_code="US")
        self.assertEqual(p_us["tier_key"], "tier_2")
        self.assertEqual(p_us["price_usd"], 25.00)
        self.assertEqual(p_us["currency"], "USD")
        self.assertEqual(p_us["unit_price"], 25.00)

        # 4. Tier 2: United Kingdom -> $25 USD -> GBP
        p_gb = resolve_product_pricing(self.regional_product, country_code="GB")
        self.assertEqual(p_gb["tier_key"], "tier_2")
        self.assertEqual(p_gb["price_usd"], 25.00)
        self.assertEqual(p_gb["currency"], "GBP")

        # 5. Tier 3: Australia -> $30 USD -> AUD
        p_au = resolve_product_pricing(self.regional_product, country_code="AU")
        self.assertEqual(p_au["tier_key"], "tier_3")
        self.assertEqual(p_au["price_usd"], 30.00)
        self.assertEqual(p_au["currency"], "AUD")

        # 6. Rest of the World: Germany (DE) -> $15 USD -> EUR
        p_de = resolve_product_pricing(self.regional_product, country_code="DE")
        self.assertEqual(p_de["tier_key"], "rest_of_world")
        self.assertEqual(p_de["price_usd"], 15.00)
        self.assertEqual(p_de["currency"], "EUR")

    def test_duplicate_country_across_tiers_fails_validation(self):
        """Scenario 6: A country cannot be assigned to multiple tiers."""
        conflicting_config = {
            "base_tier": {"name": "Base Country", "countries": ["IN"], "price_usd": 20.0},
            "tier_1": {"name": "Tier 1", "countries": ["IN", "BD"], "price_usd": 10.0},  # Duplicate IN!
            "tier_2": {"name": "Tier 2", "countries": ["US"], "price_usd": 25.0},
            "tier_3": {"name": "Tier 3", "countries": ["AU"], "price_usd": 30.0},
            "rest_of_world": {"name": "Rest of the World", "price_usd": 15.0}
        }
        with self.assertRaises(ValueError) as ctx:
            validate_regional_pricing(conflicting_config)
        self.assertIn("already assigned", str(ctx.exception).lower())

    def test_negative_tier_price_fails_validation(self):
        """Scenario: Negative prices must be rejected."""
        negative_price_config = {
            "base_tier": {"name": "Base", "countries": ["IN"], "price_usd": -5.0},
            "tier_1": {"name": "Tier 1", "countries": ["BD"], "price_usd": 10.0},
            "tier_2": {"name": "Tier 2", "countries": ["US"], "price_usd": 25.0},
            "tier_3": {"name": "Tier 3", "countries": ["AU"], "price_usd": 30.0},
            "rest_of_world": {"name": "Rest of the World", "price_usd": 15.0}
        }
        with self.assertRaises(ValueError) as ctx:
            validate_regional_pricing(negative_price_config)
        self.assertIn("cannot be negative", str(ctx.exception).lower())

    def test_country_detection_priority(self):
        """Scenario 9: Customer country detection honors priority."""
        # A. Query parameter takes top priority
        req_query = self.rf.get("/api/catalog/products/?country=US")
        country, src = detect_customer_country(req_query)
        self.assertEqual(country, "US")
        self.assertEqual(src, "explicit_selection")

        # B. Header priority
        req_hdr = self.rf.get("/api/catalog/products/", HTTP_X_SELECTED_COUNTRY="CA")
        country, src = detect_customer_country(req_hdr)
        self.assertEqual(country, "CA")

        # C. Default fallback
        req_empty = self.rf.get("/api/catalog/products/")
        country, src = detect_customer_country(req_empty)
        self.assertEqual(country, "IN")
        self.assertEqual(src, "default_fallback")

    def test_admin_api_creates_regional_product(self):
        """Scenario 2: Admin creates a regional-priced product with 5 pricing groups."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            "title": "Emerald Art Deco Solitaire",
            "category": self.category.id,
            "description": "Crafted Rhino 3DM ring file.",
            "pricing_mode": "regional",
            "regional_pricing": self.sample_regional_config,
            "agreed_terms": True
        }
        response = self.client.post("/api/catalog/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_slug = response.data["slug"]

        # Retrieve as US customer
        resp_detail = self.client.get(f"/api/catalog/products/{created_slug}/?country=US")
        self.assertEqual(resp_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_detail.data["pricing_mode"], "regional")
        self.assertEqual(resp_detail.data["resolved_pricing"]["tier_key"], "tier_2")
        self.assertEqual(resp_detail.data["resolved_pricing"]["price_usd"], 25.00)
        self.assertEqual(resp_detail.data["resolved_pricing"]["currency"], "USD")

    def test_unauthorized_client_cannot_edit_pricing(self):
        """Scenario 4: Regular client cannot edit product pricing."""
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(
            f"/api/catalog/products/{self.regional_product.slug}/",
            {"price": 1.00},
            format="json"
        )
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_immutable_pricing_snapshot_on_purchase(self):
        """Scenario 17: Purchases store immutable pricing snapshot."""
        self.client.force_authenticate(user=self.customer)
        purchase_payload = {
            "product_id": self.regional_product.id,
            "license_type": "atelier",
            "country": "US",
            "payment_transaction_id": "TXN_TEST_12345",
            "payment_method": "upi",
            "auto_confirm": True
        }
        response = self.client.post("/api/payments/purchases/", purchase_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        purchase = Purchase.objects.get(payment_transaction_id="TXN_TEST_12345")
        self.assertEqual(purchase.pricing_mode, "regional")
        self.assertEqual(purchase.pricing_tier, "Tier 2")
        self.assertEqual(purchase.currency, "USD")
        self.assertEqual(purchase.original_price_usd, Decimal("25.00"))
        self.assertIn("tier_key", purchase.pricing_snapshot)
        self.assertEqual(purchase.pricing_snapshot["tier_key"], "tier_2")

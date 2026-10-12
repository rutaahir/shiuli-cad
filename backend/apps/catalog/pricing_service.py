"""
pricing_service.py
Centralized, authoritative Country-Based Tier Pricing and Currency Conversion Service for Shiuli Studio.

Features:
1. 5 Pricing Groups:
   - Base Country (e.g. India)
   - Tier 1 (e.g. Bangladesh, Nepal, Sri Lanka)
   - Tier 2 (e.g. United States, Canada, United Kingdom)
   - Tier 3 (e.g. Australia, New Zealand, Singapore)
   - Rest of the World (automatic catch-all fallback)
2. Authoritative USD pricing entered by Admin/Staff.
3. Server-side country detection (Query/Header/Saved/Fallback).
4. Reliable country-to-currency mapping (ISO 3166-1 alpha-2 -> ISO 4217).
5. Cached live exchange rate retrieval with resilient offline fallback table.
6. Decimal-safe calculations and conflict validation (disjoint country assignment).
7. Immutable pricing snapshot generation for purchase and order integrity.
"""

import time
import logging
import urllib.request
import json
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional, Tuple, List

logger = logging.getLogger(__name__)

# ─── 1. Country to Currency & Metadata Mapping ───────────────────────────────

COUNTRIES_DATA: Dict[str, Dict[str, str]] = {
    "IN": {"name": "India", "currency": "INR", "symbol": "₹", "flag": "🇮🇳"},
    "US": {"name": "United States", "currency": "USD", "symbol": "$", "flag": "🇺🇸"},
    "GB": {"name": "United Kingdom", "currency": "GBP", "symbol": "£", "flag": "🇬🇧"},
    "CA": {"name": "Canada", "currency": "CAD", "symbol": "CA$", "flag": "🇨🇦"},
    "AU": {"name": "Australia", "currency": "AUD", "symbol": "A$", "flag": "🇦🇺"},
    "NZ": {"name": "New Zealand", "currency": "NZD", "symbol": "NZ$", "flag": "🇳🇿"},
    "SG": {"name": "Singapore", "currency": "SGD", "symbol": "S$", "flag": "🇸🇬"},
    "BD": {"name": "Bangladesh", "currency": "BDT", "symbol": "৳", "flag": "🇧🇩"},
    "NP": {"name": "Nepal", "currency": "NPR", "symbol": "रू", "flag": "🇳🇵"},
    "LK": {"name": "Sri Lanka", "currency": "LKR", "symbol": "Rs", "flag": "🇱🇰"},
    "AE": {"name": "United Arab Emirates", "currency": "AED", "symbol": "د.إ", "flag": "🇦🇪"},
    "SA": {"name": "Saudi Arabia", "currency": "SAR", "symbol": "﷼", "flag": "🇸🇦"},
    "QA": {"name": "Qatar", "currency": "QAR", "symbol": "QR", "flag": "🇶🇦"},
    "KW": {"name": "Kuwait", "currency": "KWD", "symbol": "KD", "flag": "🇰🇼"},
    "OM": {"name": "Oman", "currency": "OMR", "symbol": "RO", "flag": "🇴🇲"},
    "BH": {"name": "Bahrain", "currency": "BHD", "symbol": "BD", "flag": "🇧🇭"},
    "DE": {"name": "Germany", "currency": "EUR", "symbol": "€", "flag": "🇩🇪"},
    "FR": {"name": "France", "currency": "EUR", "symbol": "€", "flag": "🇫🇷"},
    "IT": {"name": "Italy", "currency": "EUR", "symbol": "€", "flag": "🇮🇹"},
    "ES": {"name": "Spain", "currency": "EUR", "symbol": "€", "flag": "🇪🇸"},
    "NL": {"name": "Netherlands", "currency": "EUR", "symbol": "€", "flag": "🇳🇱"},
    "CH": {"name": "Switzerland", "currency": "CHF", "symbol": "CHF", "flag": "🇨🇭"},
    "SE": {"name": "Sweden", "currency": "SEK", "symbol": "kr", "flag": "🇸🇪"},
    "NO": {"name": "Norway", "currency": "NOK", "symbol": "kr", "flag": "🇳🇴"},
    "DK": {"name": "Denmark", "currency": "DKK", "symbol": "kr", "flag": "🇩🇰"},
    "IE": {"name": "Ireland", "currency": "EUR", "symbol": "€", "flag": "🇮🇪"},
    "BE": {"name": "Belgium", "currency": "EUR", "symbol": "€", "flag": "🇧🇪"},
    "AT": {"name": "Austria", "currency": "EUR", "symbol": "€", "flag": "🇦🇹"},
    "PT": {"name": "Portugal", "currency": "EUR", "symbol": "€", "flag": "🇵🇹"},
    "GR": {"name": "Greece", "currency": "EUR", "symbol": "€", "flag": "🇬🇷"},
    "PL": {"name": "Poland", "currency": "PLN", "symbol": "zł", "flag": "🇵🇱"},
    "JP": {"name": "Japan", "currency": "JPY", "symbol": "¥", "flag": "🇯🇵"},
    "KR": {"name": "South Korea", "currency": "KRW", "symbol": "₩", "flag": "🇰🇷"},
    "HK": {"name": "Hong Kong", "currency": "HKD", "symbol": "HK$", "flag": "🇭🇰"},
    "TW": {"name": "Taiwan", "currency": "TWD", "symbol": "NT$", "flag": "🇹🇼"},
    "MY": {"name": "Malaysia", "currency": "MYR", "symbol": "RM", "flag": "🇲🇾"},
    "TH": {"name": "Thailand", "currency": "THB", "symbol": "฿", "flag": "🇹🇭"},
    "ID": {"name": "Indonesia", "currency": "IDR", "symbol": "Rp", "flag": "🇮🇩"},
    "VN": {"name": "Vietnam", "currency": "VND", "symbol": "₫", "flag": "🇻🇳"},
    "PH": {"name": "Philippines", "currency": "PHP", "symbol": "₱", "flag": "🇵🇭"},
    "ZA": {"name": "South Africa", "currency": "ZAR", "symbol": "R", "flag": "🇿🇦"},
    "EG": {"name": "Egypt", "currency": "EGP", "symbol": "E£", "flag": "🇪🇬"},
    "NG": {"name": "Nigeria", "currency": "NGN", "symbol": "₦", "flag": "🇳🇬"},
    "KE": {"name": "Kenya", "currency": "KES", "symbol": "KSh", "flag": "🇰🇪"},
    "BR": {"name": "Brazil", "currency": "BRL", "symbol": "R$", "flag": "🇧🇷"},
    "MX": {"name": "Mexico", "currency": "MXN", "symbol": "Mex$", "flag": "🇲🇽"},
    "AR": {"name": "Argentina", "currency": "ARS", "symbol": "$", "flag": "🇦🇷"},
    "CL": {"name": "Chile", "currency": "CLP", "symbol": "CLP$", "flag": "🇨🇱"},
    "CO": {"name": "Colombia", "currency": "COP", "symbol": "COL$", "flag": "🇨🇴"},
    "TR": {"name": "Turkey", "currency": "TRY", "symbol": "₺", "flag": "🇹🇷"},
    "IL": {"name": "Israel", "currency": "ILS", "symbol": "₪", "flag": "🇮🇱"},
    "RU": {"name": "Russia", "currency": "RUB", "symbol": "₽", "flag": "🇷🇺"},
}

# ─── 2. Resilient Exchange Rates (Base USD = 1.0) ───────────────────────────

FALLBACK_EXCHANGE_RATES: Dict[str, float] = {
    "USD": 1.0,
    "INR": 86.85,
    "EUR": 0.93,
    "GBP": 0.79,
    "CAD": 1.38,
    "AUD": 1.55,
    "NZD": 1.68,
    "SGD": 1.35,
    "BDT": 121.50,
    "NPR": 139.00,
    "LKR": 295.00,
    "AED": 3.67,
    "SAR": 3.75,
    "QAR": 3.64,
    "KWD": 0.31,
    "OMR": 0.38,
    "BHD": 0.38,
    "CHF": 0.88,
    "SEK": 10.45,
    "NOK": 10.75,
    "DKK": 6.95,
    "PLN": 3.98,
    "JPY": 152.00,
    "KRW": 1380.00,
    "HKD": 7.78,
    "TWD": 32.20,
    "MYR": 4.42,
    "THB": 34.60,
    "IDR": 15950.00,
    "VND": 25300.00,
    "PHP": 58.20,
    "ZAR": 18.25,
    "EGP": 49.20,
    "NGN": 1650.00,
    "KES": 129.50,
    "BRL": 5.75,
    "MXN": 20.35,
    "ARS": 1005.00,
    "CLP": 975.00,
    "COP": 4350.00,
    "TRY": 34.50,
    "ILS": 3.72,
    "RUB": 97.50,
}

_RATES_CACHE: Dict[str, Any] = {
    "rates": FALLBACK_EXCHANGE_RATES.copy(),
    "last_fetched": 0,
    "ttl_seconds": 43200,  # 12 hours
}


def get_latest_exchange_rates() -> Dict[str, float]:
    """
    Returns current exchange rates against base USD.
    Uses memory cache with a 12-hour TTL and falls back smoothly to verified offline rates.
    """
    now = time.time()
    if now - _RATES_CACHE["last_fetched"] < _RATES_CACHE["ttl_seconds"] and _RATES_CACHE["rates"]:
        return _RATES_CACHE["rates"]

    try:
        req = urllib.request.Request(
            "https://open.er-api.com/v6/latest/USD",
            headers={"User-Agent": "ShiuliStudio-PricingService/2.0"}
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and data.get("result") == "success" and "rates" in data:
                live_rates = {k.upper(): float(v) for k, v in data["rates"].items()}
                # Merge on top of fallback table to preserve comprehensive coverage
                merged = FALLBACK_EXCHANGE_RATES.copy()
                merged.update(live_rates)
                _RATES_CACHE["rates"] = merged
                _RATES_CACHE["last_fetched"] = now
                logger.info("[PricingService] Live exchange rates refreshed from Open-ER-API.")
                return merged
    except Exception as e:
        logger.warning(f"[PricingService] Live rate fetch failed ({e}). Using verified fallback table.")

    # In case of network timeout/offline, touch timestamp so we do not spam failing requests on every hit
    _RATES_CACHE["last_fetched"] = now - (_RATES_CACHE["ttl_seconds"] - 1800)  # Retry in 30 mins
    return _RATES_CACHE["rates"]


def get_exchange_rate(currency: str) -> float:
    """Returns exchange rate from USD to target currency."""
    rates = get_latest_exchange_rates()
    return rates.get(currency.upper(), FALLBACK_EXCHANGE_RATES.get(currency.upper(), 1.0))


# ─── 3. Country Information Helpers ──────────────────────────────────────────

def get_country_info(country_code: str) -> Dict[str, str]:
    """Returns metadata for an ISO 3166-1 alpha-2 country code."""
    code = (country_code or "").strip().upper()
    if code in COUNTRIES_DATA:
        return {"code": code, **COUNTRIES_DATA[code]}
    return {
        "code": code or "ROW",
        "name": f"Country ({code})" if code else "Rest of the World",
        "currency": "USD",
        "symbol": "$",
        "flag": "🌐"
    }


def get_all_supported_countries() -> List[Dict[str, str]]:
    """Returns list of all registered countries sorted alphabetically for admin dropdowns."""
    res = []
    for code, info in COUNTRIES_DATA.items():
        res.append({
            "code": code,
            "name": info["name"],
            "currency": info["currency"],
            "symbol": info["symbol"],
            "flag": info["flag"],
        })
    res.sort(key=lambda x: x["name"])
    return res


# ─── 4. Customer Country Detection ───────────────────────────────────────────

def detect_customer_country(request) -> Tuple[str, str]:
    """
    Detects customer country code following strict priority:
    1. Explicit client query param or body param ('country', 'country_code')
    2. Client explicit header 'X-Selected-Country' or 'X-Country-Code'
    3. User profile saved shipping country (if authenticated)
    4. Server-side IP / CDN Geolocation headers ('CF-IPCountry', 'X-GeoIP-Country')
    5. Default Studio Country: 'IN' (India)

    Returns tuple: (country_code, detection_source)
    """
    if not request:
        return "IN", "default"

    # 1. Explicit Parameter in Query or Body
    param_country = None
    if hasattr(request, 'query_params'):
        param_country = request.query_params.get('country') or request.query_params.get('country_code')
    elif hasattr(request, 'GET'):
        param_country = request.GET.get('country') or request.GET.get('country_code')

    if not param_country and hasattr(request, 'data') and isinstance(request.data, dict):
        param_country = request.data.get('country') or request.data.get('country_code')

    if param_country:
        code = str(param_country).strip().upper()
        if len(code) == 2:
            return code, "explicit_selection"

    # 2. Explicit Client Header
    header_country = (
        request.headers.get('X-Selected-Country') or
        request.headers.get('X-Country-Code') or
        request.META.get('HTTP_X_SELECTED_COUNTRY') or
        request.META.get('HTTP_X_COUNTRY_CODE')
    )
    if header_country:
        code = str(header_country).strip().upper()
        if len(code) == 2:
            return code, "client_header"

    # 3. Authenticated User Profile Saved Country
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        user_country = getattr(user, 'country', None) or getattr(user, 'shipping_country', None)
        if user_country and len(str(user_country).strip()) == 2:
            return str(user_country).strip().upper(), "user_profile"

    # 4. Server-Side Geolocation / CDN Country Headers
    cdn_country = (
        request.META.get('HTTP_CF_IPCOUNTRY') or          # Cloudflare
        request.META.get('HTTP_X_REAL_IP_COUNTRY') or     # Nginx GeoIP
        request.META.get('HTTP_GEOIP_COUNTRY_CODE') or    # Apache / Fastly
        request.META.get('GEOIP_COUNTRY_CODE')
    )
    if cdn_country:
        code = str(cdn_country).strip().upper()
        if len(code) == 2 and code != "XX" and code != "T1":
            return code, "server_geoip"

    # 5. Fallback Default Studio Country
    return "IN", "default_fallback"


# ─── 5. Tier Configuration Validation ────────────────────────────────────────

def validate_regional_pricing(data: Any) -> Dict[str, Any]:
    """
    Validates regional pricing payload:
    1. Structure contains all 5 groups: base_tier, tier_1, tier_2, tier_3, rest_of_world.
    2. Validates non-negative numeric USD prices for each tier.
    3. Validates ISO-2 country lists for the 4 explicit tiers.
    4. Guarantees DISJOINT country sets (no country assigned to more than one tier).
    5. Disallows manual country lists on rest_of_world (it is an automatic catch-all).

    Returns sanitized, normalized dictionary or raises ValueError.
    """
    if not isinstance(data, dict):
        raise ValueError("regional_pricing must be a JSON object.")

    required_tiers = ["base_tier", "tier_1", "tier_2", "tier_3", "rest_of_world"]
    sanitized: Dict[str, Any] = {}

    assigned_countries: Dict[str, str] = {}  # country_code -> tier_name

    tier_labels = {
        "base_tier": "Base Country",
        "tier_1": "Tier 1",
        "tier_2": "Tier 2",
        "tier_3": "Tier 3",
        "rest_of_world": "Rest of the World"
    }

    for tier_key in required_tiers:
        tier_cfg = data.get(tier_key)
        if not isinstance(tier_cfg, dict):
            # If missing, provide sensible default
            tier_cfg = {
                "name": tier_labels[tier_key],
                "price_usd": 0.0,
                "countries": [] if tier_key != "rest_of_world" else []
            }

        name = str(tier_cfg.get("name") or tier_labels[tier_key]).strip()

        # Validate Price
        raw_price = tier_cfg.get("price_usd") or tier_cfg.get("price") or 0.0
        try:
            price_usd = round(float(raw_price), 2)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid USD price for tier '{name}': {raw_price}")

        if price_usd < 0:
            raise ValueError(f"Price for '{name}' cannot be negative.")

        # Validate Countries
        if tier_key == "rest_of_world":
            sanitized[tier_key] = {
                "name": name,
                "price_usd": price_usd,
            }
        else:
            raw_countries = tier_cfg.get("countries", [])
            if not isinstance(raw_countries, list):
                raise ValueError(f"Countries for tier '{name}' must be an array of ISO codes.")

            clean_countries = []
            for c in raw_countries:
                c_code = str(c).strip().upper()
                if not c_code:
                    continue
                if len(c_code) != 2 or not c_code.isalpha():
                    raise ValueError(f"Invalid ISO 3166-1 alpha-2 country code '{c}' in tier '{name}'.")

                # Disjoint Country Check
                if c_code in assigned_countries:
                    existing_tier = assigned_countries[c_code]
                    raise ValueError(
                        f"Country '{c_code}' is already assigned to '{existing_tier}'. "
                        f"Each country may belong to only one tier."
                    )

                assigned_countries[c_code] = name
                clean_countries.append(c_code)

            sanitized[tier_key] = {
                "name": name,
                "price_usd": price_usd,
                "countries": clean_countries,
            }

    return sanitized


def get_default_regional_pricing() -> Dict[str, Any]:
    """Returns standard starter template for a product entering regional pricing mode."""
    return {
        "base_tier": {
            "name": "Base Country",
            "countries": ["IN"],
            "price_usd": 20.00,
        },
        "tier_1": {
            "name": "Tier 1",
            "countries": ["BD", "NP", "LK"],
            "price_usd": 10.00,
        },
        "tier_2": {
            "name": "Tier 2",
            "countries": ["US", "CA", "GB"],
            "price_usd": 25.00,
        },
        "tier_3": {
            "name": "Tier 3",
            "countries": ["AU", "NZ", "SG"],
            "price_usd": 30.00,
        },
        "rest_of_world": {
            "name": "Rest of the World",
            "price_usd": 15.00,
        },
    }


# ─── 6. Central Authoritative Price Resolution ──────────────────────────────

def resolve_product_pricing(
    product: Any,
    country_code: Optional[str] = None,
    license_type: str = "atelier"
) -> Dict[str, Any]:
    """
    Authoritative pricing resolver for any product:
    - If product.pricing_mode == 'global': preserves existing global price without changes.
    - If product.pricing_mode == 'regional': determines matching tier, resolves USD price,
      and converts accurately to the customer country's local currency.
    - Generates complete pricing snapshot dictionary for cart, display, and order creation.
    """
    country = (country_code or "IN").strip().upper()
    country_info = get_country_info(country)
    target_currency = country_info["currency"]
    currency_symbol = country_info["symbol"]
    country_name = country_info["name"]

    pricing_mode = getattr(product, "pricing_mode", "global")
    is_commercial = str(license_type).lower() == "commercial"
    commercial_markup_pct = float(getattr(product, "commercial_price_markup", 80.0) or 80.0)

    # ── CASE A: Global Pricing Mode (Legacy & Default) ───────────────────────
    if pricing_mode != "regional":
        base_price_val = float(getattr(product, "price", 0.0) or 0.0)
        compare_val = float(getattr(product, "compare_at_price", 0.0) or 0.0) if getattr(product, "compare_at_price", None) else None

        if is_commercial:
            unit_price = round(base_price_val * (1.0 + (commercial_markup_pct / 100.0)), 2)
            compare_price = round(compare_val * (1.0 + (commercial_markup_pct / 100.0)), 2) if compare_val else None
        else:
            unit_price = base_price_val
            compare_price = compare_val

        # Reference USD equivalent for snapshots (using historical 84 or live rate)
        rate_to_inr = get_exchange_rate("INR") or 86.85
        unit_price_usd = round(unit_price / rate_to_inr, 2) if rate_to_inr > 0 else unit_price

        return {
            "pricing_mode": "global",
            "tier_key": "global",
            "tier_name": "Standard Catalog Price",
            "country_code": country,
            "country_name": country_name,
            "currency": "INR",
            "currency_symbol": "₹",
            "exchange_rate": 1.0,
            "price_usd": unit_price_usd,
            "unit_price": unit_price,
            "compare_at_price": compare_price,
            "license_type": license_type,
            "commercial_markup_pct": commercial_markup_pct if is_commercial else 0.0,
            "formatted": f"₹{int(round(unit_price)):,}",
            "formatted_compare": f"₹{int(round(compare_price)):,}" if compare_price else None,
        }

    # ── CASE B: Country-Based Tier Pricing (5 Groups) ───────────────────────
    regional_cfg = getattr(product, "regional_pricing", {}) or {}
    if not isinstance(regional_cfg, dict) or not regional_cfg:
        regional_cfg = get_default_regional_pricing()

    base_tier = regional_cfg.get("base_tier", {})
    tier_1 = regional_cfg.get("tier_1", {})
    tier_2 = regional_cfg.get("tier_2", {})
    tier_3 = regional_cfg.get("tier_3", {})
    rest_of_world = regional_cfg.get("rest_of_world", {})

    selected_tier_key = "rest_of_world"
    selected_tier_name = rest_of_world.get("name", "Rest of the World")
    usd_tier_price = float(rest_of_world.get("price_usd", 15.00) or 15.00)

    # 1. Base Country
    if country in [c.upper() for c in base_tier.get("countries", [])]:
        selected_tier_key = "base_tier"
        selected_tier_name = base_tier.get("name", "Base Country")
        usd_tier_price = float(base_tier.get("price_usd", 20.00) or 20.00)
    # 2. Tier 1
    elif country in [c.upper() for c in tier_1.get("countries", [])]:
        selected_tier_key = "tier_1"
        selected_tier_name = tier_1.get("name", "Tier 1")
        usd_tier_price = float(tier_1.get("price_usd", 10.00) or 10.00)
    # 3. Tier 2
    elif country in [c.upper() for c in tier_2.get("countries", [])]:
        selected_tier_key = "tier_2"
        selected_tier_name = tier_2.get("name", "Tier 2")
        usd_tier_price = float(tier_2.get("price_usd", 25.00) or 25.00)
    # 4. Tier 3
    elif country in [c.upper() for c in tier_3.get("countries", [])]:
        selected_tier_key = "tier_3"
        selected_tier_name = tier_3.get("name", "Tier 3")
        usd_tier_price = float(tier_3.get("price_usd", 30.00) or 30.00)

    # Apply commercial license multiplier to USD base tier price if selected
    if is_commercial:
        final_usd_price = round(usd_tier_price * (1.0 + (commercial_markup_pct / 100.0)), 2)
    else:
        final_usd_price = round(usd_tier_price, 2)

    # Currency Conversion from authoritative USD
    exchange_rate = get_exchange_rate(target_currency)
    converted_amount = Decimal(str(final_usd_price)) * Decimal(str(exchange_rate))

    # Format according to currency conventions (e.g. INR/JPY/BDT rounded to clean numbers)
    if target_currency in ["INR", "JPY", "KRW", "VND", "IDR"]:
        final_unit_price = float(converted_amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        formatted_display = f"{currency_symbol}{int(final_unit_price):,}"
    else:
        final_unit_price = float(converted_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        formatted_display = f"{currency_symbol}{final_unit_price:,.2f}"

    return {
        "pricing_mode": "regional",
        "tier_key": selected_tier_key,
        "tier_name": selected_tier_name,
        "country_code": country,
        "country_name": country_name,
        "currency": target_currency,
        "currency_symbol": currency_symbol,
        "exchange_rate": round(exchange_rate, 6),
        "price_usd": final_usd_price,
        "unit_price": final_unit_price,
        "compare_at_price": None,
        "license_type": license_type,
        "commercial_markup_pct": commercial_markup_pct if is_commercial else 0.0,
        "formatted": formatted_display,
        "formatted_compare": None,
    }

import urllib.request
import json

# 1. Login
login_url = "http://localhost:8000/api/auth/login/"
login_data = json.dumps({"username": "client_laurent", "password": "client123"}).encode('utf-8')
req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        token = res_data['access']
        print("Logged in successfully. Token acquired.")
except Exception as e:
    print("Login failed:", e)
    exit(1)

# 2. Submit with category = 3 (which might not exist)
submit_url = "http://localhost:8000/api/custom-requests/"
payload = {
    "category": 3,
    "aesthetic_style": 1,
    "metal_alloy": 1,
    "gemstone_preference_open": True,
    "gemstones_data": [],
    "draft_sketch_ids": [],
    "estimated_price_shown": 315.00,
    "timeline": "standard",
    "description": "Bespoke Pendants in 18K White Gold",
    "contact_name": "Rutvika",
    "contact_phone": "8160084326"
}
submit_data = json.dumps(payload).encode('utf-8')
req2 = urllib.request.Request(
    submit_url,
    data=submit_data,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
)

try:
    with urllib.request.urlopen(req2) as resp:
        print("Submit Status:", resp.status)
        print("Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}:", e.read().decode('utf-8'))
except Exception as e:
    print("Submit error:", e)

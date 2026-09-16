import requests

BASE_URL = "http://localhost:8000/api/custom-requests"

def test_endpoints():
    print("--- 1. Fetching Metal Alloys ---")
    r1 = requests.get(f"{BASE_URL}/metal-alloys/")
    print(f"Status: {r1.status_code}, Data: {r1.json()}")

    print("\n--- 2. Fetching Aesthetic Styles ---")
    r2 = requests.get(f"{BASE_URL}/aesthetic-styles/")
    print(f"Status: {r2.status_code}, Data: {r2.json()}")

    print("\n--- 3. Testing Price Estimate Endpoint ---")
    payload = {
        "category_id": 1,
        "metal_alloy_id": 1,
        "aesthetic_style_id": 1,
        "gemstone_preference_open": False,
        "gemstones": [{"stone_type": "Diamond", "cut_type": "Round Brilliant", "quantity": 1}]
    }
    r3 = requests.post(f"{BASE_URL}/estimate/", json=payload)
    print(f"Status: {r3.status_code}, Estimate Output: {r3.json()}")

if __name__ == "__main__":
    test_endpoints()

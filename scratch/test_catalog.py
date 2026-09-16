import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    else:
        body = None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode('utf-8')
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        return e.code, json.loads(content) if content else {}

ts = int(time.time())

# 1. Login as Admin
status, res = make_req(f"{BASE_URL}/auth/login/", method="POST", data={
    "username": "admin@shiuli.com",
    "password": "admin123"
})
print("1. Login status:", status)
token = res.get("access")
headers = {"Authorization": f"Bearer {token}"}

# 2. Test Get Categories
status, res = make_req(f"{BASE_URL}/catalog/categories/")
print("2. Get Categories status:", status, "Count:", len(res))

# 3. Create Top Category
cat_data = {"name": f"Nose Pins {ts}", "slug": f"nose-pins-{ts}", "display_order": 5}
status, res = make_req(f"{BASE_URL}/catalog/categories/", method="POST", data=cat_data, headers=headers)
print("3. Create Category status:", status, res)
cat_id = res.get("id")

# 4. Create Sub-category
subcat_data = {"name": f"Diamond Pins {ts}", "slug": f"diamond-pins-{ts}", "parent": cat_id}
status, res = make_req(f"{BASE_URL}/catalog/categories/", method="POST", data=subcat_data, headers=headers)
print("4. Create Subcategory status:", status, res)
subcat_id = res.get("id")

# 5. Create Product under Subcategory
prod_data = {
    "title": f"Solitaire Nose Pin {ts}",
    "category": subcat_id,
    "price": 149,
    "compare_at_price": 189,
    "description": "Custom solitaire diamond nose pin in 18k yellow gold.",
    "stone_count": 1,
    "is_bestseller": True,
    "is_new": True
}
status, res = make_req(f"{BASE_URL}/catalog/products/", method="POST", data=prod_data, headers=headers)
print("5. Create Product status:", status, res)
prod_slug = res.get("slug")

# 6. Test Sub-category Delete with Product Assigned (Expect HTTP 400 Bad Request)
status, res = make_req(f"{BASE_URL}/catalog/categories/{subcat_id}/", method="DELETE", headers=headers)
print("6. Delete Subcategory with Products status (Should be 400):", status, "Response:", res)

# 7. Approve Product
status, res = make_req(f"{BASE_URL}/catalog/products/{prod_slug}/approve/", method="POST", headers=headers)
print("7. Approve Product status:", status, res)

# 8. Delete Product
status, res = make_req(f"{BASE_URL}/catalog/products/{prod_slug}/", method="DELETE", headers=headers)
print("8. Delete Product status:", status)

# 9. Delete Subcategory (Should be 204 after product deleted)
status, res = make_req(f"{BASE_URL}/catalog/categories/{subcat_id}/", method="DELETE", headers=headers)
print("9. Delete Subcategory status:", status)

# 10. Delete Category (Should be 204)
status, res = make_req(f"{BASE_URL}/catalog/categories/{cat_id}/", method="DELETE", headers=headers)
print("10. Delete Category status:", status)

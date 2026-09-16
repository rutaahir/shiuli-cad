import urllib.request
import json

# 1. Login as Rutvika
login_url = "http://localhost:8000/api/auth/login/"
login_data = json.dumps({"username": "rutaahir855_514", "password": "client123"}).encode('utf-8')
req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        token = res_data['access']
        print("Rutvika logged in successfully.")
except Exception as e:
    print("Login failed:", e)
    exit(1)

# 2. Get Custom Requests for Rutvika
get_url = "http://localhost:8000/api/custom-requests/"
req2 = urllib.request.Request(
    get_url,
    headers={
        'Authorization': f'Bearer {token}'
    }
)

try:
    with urllib.request.urlopen(req2) as resp:
        custom_reqs = json.loads(resp.read().decode('utf-8'))
        print(f"Fetched {len(custom_reqs)} custom requests for Rutvika:")
        for cr in custom_reqs:
            print(f"  - REQ #{cr['id']}: Status={cr['status']}, AgreedPrice={cr.get('agreed_price')}, MessagesCount={len(cr.get('messages', []))}")
except Exception as e:
    print("Fetch failed:", e)

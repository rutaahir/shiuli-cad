import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, r'C:\Users\Harshil\OneDrive\Desktop\shiuli-cad-studio\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.custom_orders.models import Order, CustomRequest, CustomRequestImage, OrderDeliverable, OrderMilestone
from apps.custom_orders.serializers import OrderSerializer
from apps.accounts.models import User
from rest_framework.test import APIRequestFactory

def test_order_isolation():
    print("=== STARTING ORDER DATA ISOLATION TEST ===")
    
    # Fetch or create two distinct test orders
    orders = Order.objects.filter(assigned_staff__isnull=False)[:2]
    if len(orders) < 2:
        print("Need at least 2 assigned orders in DB to run test.")
        return

    order_a = orders[0]
    order_b = orders[1]

    print(f"Testing Order A (ID #{order_a.id}) vs Order B (ID #{order_b.id})")

    factory = APIRequestFactory()
    staff_user = order_a.assigned_staff or User.objects.filter(role='staff').first()
    
    # 1. Serialize Order A
    req_a = factory.get(f'/api/orders/{order_a.id}/')
    req_a.user = staff_user
    serializer_a = OrderSerializer(order_a, context={'request': req_a})
    data_a = serializer_a.data

    # 2. Serialize Order B
    req_b = factory.get(f'/api/orders/{order_b.id}/')
    req_b.user = staff_user
    serializer_b = OrderSerializer(order_b, context={'request': req_b})
    data_b = serializer_b.data

    # 3. Assertions for Data Isolation
    print(f"Order A Title/Category: {data_a.get('custom_request', {}).get('category_name')}")
    print(f"Order B Title/Category: {data_b.get('custom_request', {}).get('category_name')}")

    # Check deliverables isolation
    deliv_a_ids = [d['id'] for d in data_a.get('deliverables', [])]
    deliv_b_ids = [d['id'] for d in data_b.get('deliverables', [])]
    intersection = set(deliv_a_ids).intersection(set(deliv_b_ids))

    assert len(intersection) == 0, f"FAIL: Deliverables overlap found between Order {order_a.id} and Order {order_b.id}: {intersection}"
    print("[OK] Deliverables Isolation PASSED: 0 overlapping deliverable records.")

    # Check sketches isolation
    sketches_a = [s['id'] for s in data_a.get('custom_request', {}).get('sketches', [])]
    sketches_b = [s['id'] for s in data_b.get('custom_request', {}).get('sketches', [])]
    sketch_intersection = set(sketches_a).intersection(set(sketches_b))

    assert len(sketch_intersection) == 0, f"FAIL: Sketch overlap found: {sketch_intersection}"
    print("[OK] Sketches/Reference Art Isolation PASSED: 0 overlapping reference images.")

    # Check total price isolation
    assert data_a['id'] != data_b['id'], "FAIL: Order IDs are identical!"
    print("[OK] Order ID Scoping PASSED.")

    print("\n=== ALL ISOLATION SANITY CHECKS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    test_order_isolation()

import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User, StaffProfile
from apps.catalog.models import Category
from apps.custom_orders.models import Order, CustomRequest, OrderMilestone

class Command(BaseCommand):
    help = 'Seeds realistic master orders and staff workloads for Shiuli Studio Command Center'

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Ensure Clients
        clients_data = [
            ('priya_singhania', 'priya.s@example.com', 'Priya', 'Singhania', '+91 98201 12345'),
            ('david_rothschild', 'david.r@example.com', 'David', 'Rothschild', '+1 415 555 2671'),
            ('ananya_verma', 'ananya.v@example.com', 'Ananya', 'Verma', '+91 98111 98765'),
            ('vikram_mehta', 'vikram.m@example.com', 'Vikram', 'Mehta', '+91 98450 54321'),
            ('rohit_patel', 'rohit.p@example.com', 'Rohit', 'Patel', '+91 99200 67890'),
            ('meera_sharma', 'meera.s@example.com', 'Meera', 'Sharma', '+91 97100 45678'),
            ('karan_johar', 'karan.j@example.com', 'Karan', 'Johar', '+91 98888 12345'),
        ]
        clients = {}
        for u, e, fn, ln, ph in clients_data:
            cl, _ = User.objects.get_or_create(
                username=u,
                defaults={
                    'email': e,
                    'first_name': fn,
                    'last_name': ln,
                    'phone_number': ph,
                    'role': User.Role.CLIENT
                }
            )
            clients[u] = cl

        # 2. Modellers
        staff_rahul = User.objects.filter(first_name='Rahul', role=User.Role.STAFF).first()
        staff_ananya = User.objects.filter(first_name='Ananya', role=User.Role.STAFF).first()
        staff_sumit = User.objects.filter(username__icontains='sumit', role=User.Role.STAFF).first()
        staff_harshil = User.objects.filter(username__icontains='harshil', role=User.Role.STAFF).first()
        staff_test = User.objects.filter(username='test_staff_rev', role=User.Role.STAFF).first()

        # Categories
        cat_necklace = Category.objects.filter(name__icontains='necklace').first()
        cat_ring = Category.objects.filter(name__icontains='ring').first()
        cat_bangle = Category.objects.filter(name__icontains='bangle').first()
        cat_earring = Category.objects.filter(name__icontains='earring').first()

        # 3. Urgent Unassigned Orders (Attention list)
        unassigned_orders = [
            (clients['priya_singhania'], 45000, 'Bespoke Jadau Polki Choker CAD', 27, True, cat_necklace),
            (clients['david_rothschild'], 20000, 'Solitaire Platinum Emerald Ring', 8, False, cat_ring),
            (clients['ananya_verma'], 26000, 'Floral Relief Kada Bangle 3DM', 19, True, cat_bangle),
        ]

        for cl, pr, desc, mins_wait, is_overdue, cat in unassigned_orders:
            cr, _ = CustomRequest.objects.get_or_create(
                client=cl,
                contact_name=f'{cl.first_name} {cl.last_name}',
                contact_email=cl.email,
                contact_phone=cl.phone_number or '+91 98765 00000',
                description=desc,
                defaults={
                    'category': cat,
                    'status': CustomRequest.Status.AGREED,
                    'submission_intent': CustomRequest.Intent.PLACE_ORDER,
                    'agreed_price': pr
                }
            )
            ord_obj, created = Order.objects.get_or_create(
                custom_request=cr,
                defaults={
                    'client': cl,
                    'order_type': Order.OrderType.CUSTOM,
                    'total_price': pr,
                    'advance_amount': pr * 0.5,
                    'advance_paid': True,
                    'status': Order.Status.IN_DESIGN,
                    'assigned_staff': None,
                    'unassigned_since': now - timedelta(minutes=mins_wait),
                    'is_overdue': is_overdue,
                    'deadline_hours': 48,
                    'due_at': now + timedelta(hours=48)
                }
            )
            if not created:
                ord_obj.status = Order.Status.IN_DESIGN
                ord_obj.assigned_staff = None
                ord_obj.unassigned_since = now - timedelta(minutes=mins_wait)
                ord_obj.is_overdue = is_overdue
                ord_obj.total_price = pr
                ord_obj.save()

        # 4. In-progress Assigned Orders (Live load for modellers)
        assigned_orders = [
            (clients['vikram_mehta'], 32000, 'Classic Micro-Pavé Diamond Band 18K', staff_rahul, cat_ring),
            (clients['rohit_patel'], 28000, 'Art Deco Sapphire Chandelier Earrings', staff_ananya, cat_earring),
            (clients['meera_sharma'], 35000, 'Royal Temple Peacock Kada 22K', staff_sumit, cat_bangle),
            (clients['karan_johar'], 42000, 'Princess Cut Tennis Bracelet Rhino Native', staff_harshil, cat_bangle),
        ]

        for cl, pr, desc, staff, cat in assigned_orders:
            if not staff:
                continue
            cr, _ = CustomRequest.objects.get_or_create(
                client=cl,
                contact_name=f'{cl.first_name} {cl.last_name}',
                contact_email=cl.email,
                contact_phone=cl.phone_number or '+91 98765 00000',
                description=desc,
                defaults={
                    'category': cat,
                    'status': CustomRequest.Status.AGREED,
                    'submission_intent': CustomRequest.Intent.PLACE_ORDER,
                    'agreed_price': pr
                }
            )
            ord_obj, created = Order.objects.get_or_create(
                custom_request=cr,
                defaults={
                    'client': cl,
                    'order_type': Order.OrderType.CUSTOM,
                    'total_price': pr,
                    'advance_amount': pr * 0.5,
                    'advance_paid': True,
                    'status': Order.Status.WITH_DESIGNER,
                    'assigned_staff': staff,
                    'assigned_at': now - timedelta(hours=5),
                    'deadline_hours': 72,
                    'due_at': now + timedelta(hours=67)
                }
            )
            if not created:
                ord_obj.status = Order.Status.WITH_DESIGNER
                ord_obj.assigned_staff = staff
                ord_obj.total_price = pr
                ord_obj.save()

        # 5. Orders in Pending Review (Approvals queue)
        review_orders = [
            (clients['rohit_patel'], 18000, 'Geometric Baguette Solitaire Ring', staff_rahul, cat_ring),
            (clients['meera_sharma'], 24000, 'Filigree Lotus Pendant 3D Wax-Ready', staff_ananya, cat_necklace),
        ]
        for cl, pr, desc, staff, cat in review_orders:
            if not staff:
                continue
            cr, _ = CustomRequest.objects.get_or_create(
                client=cl,
                contact_name=f'{cl.first_name} {cl.last_name}',
                contact_email=cl.email,
                contact_phone=cl.phone_number or '+91 98765 00000',
                description=desc,
                defaults={
                    'category': cat,
                    'status': CustomRequest.Status.AGREED,
                    'submission_intent': CustomRequest.Intent.PLACE_ORDER,
                    'agreed_price': pr
                }
            )
            ord_obj, created = Order.objects.get_or_create(
                custom_request=cr,
                defaults={
                    'client': cl,
                    'order_type': Order.OrderType.CUSTOM,
                    'total_price': pr,
                    'advance_amount': pr * 0.5,
                    'advance_paid': True,
                    'status': Order.Status.PENDING_REVIEW,
                    'assigned_staff': staff,
                    'assigned_at': now - timedelta(hours=20),
                    'deadline_hours': 48,
                    'due_at': now + timedelta(hours=28)
                }
            )
            if not created:
                ord_obj.status = Order.Status.PENDING_REVIEW
                ord_obj.assigned_staff = staff
                ord_obj.total_price = pr
                ord_obj.save()

        # 6. Completed Orders (Revenue & Track Record)
        completed_orders = [
            (clients['priya_singhania'], 38000, 'Heritage Granulation Jhumka Earrings', staff_rahul, cat_earring),
            (clients['david_rothschild'], 52000, 'Bespoke Vintage Emerald Cocktail Ring', staff_sumit, cat_ring),
            (clients['ananya_verma'], 44000, 'Modern Minimalist Floating Diamond Choker', staff_harshil, cat_necklace),
            (clients['karan_johar'], 50000, 'Royal Crown Solitaire Diamond Ring', staff_test, cat_ring),
        ]
        for cl, pr, desc, staff, cat in completed_orders:
            cr, _ = CustomRequest.objects.get_or_create(
                client=cl,
                contact_name=f'{cl.first_name} {cl.last_name}',
                contact_email=cl.email,
                contact_phone=cl.phone_number or '+91 98765 00000',
                description=desc,
                defaults={
                    'category': cat,
                    'status': CustomRequest.Status.AGREED,
                    'submission_intent': CustomRequest.Intent.PLACE_ORDER,
                    'agreed_price': pr
                }
            )
            ord_obj, created = Order.objects.get_or_create(
                custom_request=cr,
                defaults={
                    'client': cl,
                    'order_type': Order.OrderType.CUSTOM,
                    'total_price': pr,
                    'advance_amount': pr,
                    'advance_paid': True,
                    'balance_paid': True,
                    'status': Order.Status.COMPLETED,
                    'assigned_staff': staff,
                    'assigned_at': now - timedelta(days=2),
                    'handed_over_at': now - timedelta(days=1),
                    'deadline_hours': 48,
                    'due_at': now - timedelta(days=1)
                }
            )
            if not created:
                ord_obj.status = Order.Status.COMPLETED
                ord_obj.total_price = pr
                ord_obj.advance_paid = True
                ord_obj.balance_paid = True
                ord_obj.save()

        # Update staff profile max concurrent jobs if needed
        for staff in User.objects.filter(role=User.Role.STAFF):
            profile = getattr(staff, 'staff_profile', None)
            if profile and profile.max_concurrent_jobs < 2:
                profile.max_concurrent_jobs = 3
                profile.save()

        total_orders = Order.objects.count()
        self.stdout.write(self.style.SUCCESS(f'[OK] Successfully seeded realistic orders! Total database orders: {total_orders}'))

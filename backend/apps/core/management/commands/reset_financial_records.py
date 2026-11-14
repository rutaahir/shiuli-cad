import os
from django.core.management.base import BaseCommand
from apps.payments.models import Purchase, Payment, Settlement, WalletCreditTransaction, ClientCreditAccount, ClientWallet
from apps.custom_orders.models import Order
from apps.notifications.models import Notification

class Command(BaseCommand):
    help = 'Clears test financial transactions, purchases, settlements, and payment logs for a fresh public launch.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-orders',
            action='store_true',
            help='Do not delete custom orders, only clear purchases, payments, and settlements.',
        )
        parser.add_argument(
            '--clear-clients',
            action='store_true',
            help='Also delete demo/test client accounts (preserves superadmin and staff accounts).',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting financial and transaction reset..."))

        # 1. Purchases (Ready CAD downloads)
        pur_count, _ = Purchase.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {pur_count} purchase record(s)."))

        # 2. Payments
        pay_count, _ = Payment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {pay_count} payment transaction(s)."))

        # 3. Settlements
        settle_count, _ = Settlement.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {settle_count} staff settlement(s)."))

        # 4. Wallet & Credit Transactions
        wallet_tx_count, _ = WalletCreditTransaction.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {wallet_tx_count} wallet/credit transaction(s)."))

        # 5. Reset client balances and used credit
        ClientCreditAccount.objects.all().update(used_credit=0)
        ClientWallet.objects.all().update(balance=0)
        self.stdout.write(self.style.SUCCESS("[OK] Reset client credit lines and wallets to clean zero."))

        # 6. Orders (unless --keep-orders specified)
        if not options['keep_orders']:
            ord_count, _ = Order.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {ord_count} custom order(s)."))

        # 7. Payment-related notifications
        notif_count, _ = Notification.objects.filter(
            notification_type__in=[
                'payment_received',
                'order_status',
                'staff_settlement',
                'payment_approved',
                'payment_declined',
                'file_edit_created'
            ]
        ).delete()
        # 8. CAD File Edit Requests
        from apps.file_edits.models import FileEditRequest
        fe_count, _ = FileEditRequest.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {fe_count} CAD file modification request(s)."))

        # 9. Client Accounts (if --clear-clients specified)
        if options.get('clear_clients'):
            from apps.accounts.models import User
            client_count, _ = User.objects.filter(role=User.Role.CLIENT).delete()
            self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {client_count} client account(s)."))

        self.stdout.write(self.style.SUCCESS("✨ Financial Control & Gateway Audit Log is now 100% clean and ready for public launch!"))

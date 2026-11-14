from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User
from apps.catalog.models import Product
from apps.custom_orders.models import Order, CustomRequest
from apps.file_edits.models import FileEditRequest
from apps.payments.models import (
    Purchase, Payment, Settlement, WalletCreditTransaction,
    ClientCreditAccount, ClientWallet
)
from apps.notifications.models import Notification
from apps.staff_management.models import PlatformSettings

class Command(BaseCommand):
    help = (
        'Performs a clean, proper production fresh start for the live server (shiulicad.com). '
        'Purges test file edits, pending approval submissions, test orders, payments, demo clients, '
        'and sets up official Studio Bank & Treasury details, while strictly protecting staff, admin, '
        'and published catalog products.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--preserve-clients',
            action='store_true',
            help='Do not delete client user accounts, only reset their balances/credits to zero.',
        )
        parser.add_argument(
            '--keep-pending-designs',
            action='store_true',
            help='Keep pending staff catalog designs in the approvals queue.',
        )
        parser.add_argument(
            '--approve-pending-designs',
            action='store_true',
            help='Approve and publish all pending staff catalog designs to the live catalog instead of deleting them.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("=" * 70))
        self.stdout.write(self.style.WARNING("🚀 SHIULI CAD STUDIO — PRODUCTION LIVE SERVER FRESH START"))
        self.stdout.write(self.style.WARNING("=" * 70))

        preserve_clients = options.get('preserve_clients', False)
        keep_pending_designs = options.get('keep_pending_designs', False)
        approve_pending_designs = options.get('approve_pending_designs', False)

        with transaction.atomic():
            # 1. Clear CAD File Edit Requests (FED records)
            fe_count, _ = FileEditRequest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f" [1/8] Cleared {fe_count} CAD File Modification Request(s) (FED records)."))

            # 2. Staff Design Approvals Queue (Pending QC Catalog Submissions)
            pending_products = Product.objects.filter(status=Product.Status.PENDING)
            pending_count = pending_products.count()
            if approve_pending_designs:
                updated_count = pending_products.update(status=Product.Status.APPROVED)
                self.stdout.write(self.style.SUCCESS(f" [2/8] Approved and published {updated_count} pending design(s) to live catalog."))
            elif keep_pending_designs:
                self.stdout.write(self.style.NOTICE(f" [2/8] Preserved {pending_count} pending design approval(s) in queue."))
            else:
                del_count, _ = pending_products.delete()
                self.stdout.write(self.style.SUCCESS(f" [2/8] Cleared {del_count} pending design approval(s) from QC queue."))

            # 3. Custom Orders & Quotes
            ord_count, _ = Order.objects.all().delete()
            req_count, _ = CustomRequest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f" [3/8] Cleared {ord_count} custom order(s) and {req_count} custom design request(s)."))

            # 4. Purchases, Payments, Settlements & Gateway Logs
            pur_count, _ = Purchase.objects.all().delete()
            pay_count, _ = Payment.objects.all().delete()
            settle_count, _ = Settlement.objects.all().delete()
            wallet_tx_count, _ = WalletCreditTransaction.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(
                f" [4/8] Cleared {pur_count} purchase(s), {pay_count} payment(s), "
                f"{settle_count} settlement(s), and {wallet_tx_count} wallet transaction log(s)."
            ))

            # 5. Reset Wallets & Credit Facilities to clean 0
            ClientCreditAccount.objects.all().update(credit_limit=0, used_credit=0)
            ClientWallet.objects.all().update(balance=0)
            self.stdout.write(self.style.SUCCESS(" [5/8] Reset all client credit limits and wallets to ₹0 / $0."))

            # 6. Client Accounts Cleanup (Preserving SuperAdmin and Staff)
            if not preserve_clients:
                client_users = User.objects.filter(role=User.Role.CLIENT)
                client_count = client_users.count()
                client_users.delete()
                self.stdout.write(self.style.SUCCESS(f" [6/8] Cleared {client_count} test/demo client user account(s). Staff and Admins preserved."))
            else:
                self.stdout.write(self.style.NOTICE(" [6/8] Client user accounts preserved as requested."))

            # 7. Notifications
            notif_count, _ = Notification.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f" [7/8] Cleared {notif_count} notification(s)."))

            # 8. Studio Bank & Treasury Details
            if options.get('set_default_bank'):
                settings_obj = PlatformSettings.load()
                settings_obj.bank_beneficiary_name = "Shiuli CAD Studio LLP"
                settings_obj.bank_name = "HDFC Bank Ltd."
                settings_obj.bank_account_number = "50200084739201"
                settings_obj.bank_ifsc_code = "HDFC0000240"
                settings_obj.bank_swift_code = "HDFCINBB"
                settings_obj.bank_branch = "Surat Main Branch, Ring Road, Gujarat"
                settings_obj.bank_account_type = "Current Account"
                settings_obj.bank_notes = (
                    "Please include your registered phone number or Order/Client ID in the wire transfer description."
                )
                settings_obj.studio_upi_id = "shiulicad@okhdfcbank"
                settings_obj.save()
                self.stdout.write(self.style.SUCCESS(" [8/8] Configured Official Studio Bank & Treasury Details in PlatformSettings."))
            else:
                self.stdout.write(self.style.NOTICE(" [8/8] Kept existing Studio Bank & Treasury Details as configured by admin."))

        self.stdout.write(self.style.WARNING("=" * 70))
        self.stdout.write(self.style.SUCCESS("✨ LIVE SERVER FRESH START COMPLETE! Ready for clean public operations."))
        self.stdout.write(self.style.WARNING("=" * 70))

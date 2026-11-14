from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.payments.models import ClientCreditAccount, ClientWallet, WalletCreditTransaction
from apps.notifications.models import Notification

class Command(BaseCommand):
    help = 'Clears test and demo client user accounts, wallet balances, and credit accounts for a fresh public launch. Staff and Admin accounts are strictly preserved.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting client directory and test account cleanup..."))

        # 1. Target client users only (never staff or admin)
        clients_qs = User.objects.filter(role=User.Role.CLIENT)
        total_clients = clients_qs.count()

        if total_clients == 0:
            self.stdout.write(self.style.SUCCESS("[OK] No client accounts found in the directory. Already clean!"))
        else:
            deleted_count, details = clients_qs.delete()
            self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {total_clients} client account(s) ({deleted_count} total cascaded records)."))

        # 2. Reset any leftover credit and wallet records
        ClientCreditAccount.objects.all().update(credit_limit=0, used_credit=0)
        ClientWallet.objects.all().update(balance=0)
        
        # 3. Clear wallet and credit transactions
        tx_count, _ = WalletCreditTransaction.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {tx_count} wallet/credit transaction log(s)."))

        # 4. Clear any CAD file modification requests
        from apps.file_edits.models import FileEditRequest
        fe_count, _ = FileEditRequest.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"[OK] Cleared {fe_count} CAD file modification request(s)."))

        self.stdout.write(self.style.SUCCESS("✨ Client Credits & Wallets directory is 100% clean and ready for public launch!"))

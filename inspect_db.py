import sys
import os

sys.path.append(os.path.abspath('.'))

from backend.database import SessionLocal
from backend.models.domain import User, Account, Transaction
from sqlalchemy import func

def inspect_db():
    db = SessionLocal()
    users = db.query(User).all()
    if not users:
        print("No users found.")
        return

    # Assuming we inspect the first user for now, or the one with -1500 balance
    target_user = None
    for u in users:
        accs = db.query(Account).filter(Account.user_id == u.id).all()
        for a in accs:
            if a.balance == -1500 or a.balance == 1500:
                target_user = u
                break
        if target_user:
            break
            
    if not target_user:
        target_user = users[-1] # Fallback to latest user

    print(f"User: {target_user.email}")
    accounts = db.query(Account).filter(Account.user_id == target_user.id).all()
    print("\nAccounts:")
    for a in accounts:
        print(f" - [{a.id}] {a.name} ({a.type}): {a.balance}")

    print("\nTransactions:")
    transactions = db.query(Transaction).filter(Transaction.user_id == target_user.id).all()
    for t in transactions:
        print(f" - [{t.id}] {t.transaction_date.date()} | {t.type} | Amount: {t.amount} | AccID: {t.account_id} | PM: {t.payment_method}")

    # Calculate what it should be
    print("\nCalculated Balances from Transactions:")
    for a in accounts:
        income = sum(t.amount for t in transactions if t.account_id == a.id and t.type.lower() == 'income')
        expense = sum(t.amount for t in transactions if t.account_id == a.id and t.type.lower() == 'expense')
        print(f" - [{a.id}] {a.name}: Income={income}, Expense={expense}, Expected Balance={income - expense}")

inspect_db()

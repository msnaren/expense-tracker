import sys
import os

sys.path.append(os.path.abspath('.'))

from backend.database import SessionLocal
from backend.models.domain import User, Account, Transaction, Category
from backend.routers.analytics import get_summary
from datetime import datetime

def test_analytics_separation():
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'testuser@example.com').first()
    
    # Ensure a category exists
    cat = db.query(Category).first()
    if not cat:
        cat = Category(id=1, name="Test Cat", type="expense", user_id=user.id)
        db.add(cat)
        db.commit()
    
    # 1. Clean up old data for test user
    db.query(Transaction).filter(Transaction.user_id == user.id).delete()
    db.query(Account).filter(Account.user_id == user.id).delete()
    db.commit()

    # 2. Create strictly separated accounts
    cash_acc = Account(name="Cash Wallet", type="Cash", balance=1000.0, user_id=user.id)
    upi_acc = Account(name="PhonePe", type="UPI", balance=2000.0, user_id=user.id)
    bank_acc = Account(name="HDFC", type="Bank Account", balance=3000.0, user_id=user.id)
    savings_acc = Account(name="Emergency Fund", type="Savings Account", balance=5000.0, user_id=user.id)
    
    db.add_all([cash_acc, upi_acc, bank_acc, savings_acc])
    db.commit()
    
    # 3. Create transactions
    t1 = Transaction(amount=100, description="Test 1", type="Expense", category_id=1, account_id=cash_acc.id, user_id=user.id, transaction_date=datetime.now())
    t2 = Transaction(amount=200, description="Test 2", type="Expense", category_id=1, account_id=upi_acc.id, user_id=user.id, transaction_date=datetime.now())
    t3 = Transaction(amount=300, description="Test 3", type="Expense", category_id=1, account_id=bank_acc.id, user_id=user.id, transaction_date=datetime.now())
    
    # Savings deposit (Income)
    t4 = Transaction(amount=500, description="Test 4", type="Income", category_id=1, account_id=savings_acc.id, user_id=user.id, transaction_date=datetime.now())
    
    db.add_all([t1, t2, t3, t4])
    
    # Update balances to simulate what transactions.py does
    cash_acc.balance -= 100
    upi_acc.balance -= 200
    bank_acc.balance -= 300
    savings_acc.balance += 500
    
    db.commit()

    # 4. Call get_summary
    summary = get_summary(db=db, current_user=user)
    
    print("--- TEST RESULTS ---")
    print(f"Liquid Balance (Expected 6000 - 600 = 5400): {summary['balance']}")
    assert summary['balance'] == 5400.0, f"Failed: balance is {summary['balance']}"
    
    print(f"Total Savings (Expected 5000 + 500 = 5500): {summary['total_savings']}")
    assert summary['total_savings'] == 5500.0, f"Failed: savings is {summary['total_savings']}"
    
    print(f"Cash Balance (Expected 900): {summary['cash_balance']}")
    assert summary['cash_balance'] == 900.0
    
    print(f"UPI Balance (Expected 1800): {summary['upi_balance']}")
    assert summary['upi_balance'] == 1800.0
    
    print(f"Bank Balance (Expected 2700): {summary['bank_balance']}")
    assert summary['bank_balance'] == 2700.0
    
    print(f"Cash Expenses (Expected 100): {summary['cash_expenses']}")
    assert summary['cash_expenses'] == 100.0
    
    print(f"UPI Expenses (Expected 200): {summary['upi_expenses']}")
    assert summary['upi_expenses'] == 200.0
    
    print(f"Bank Expenses (Expected 300): {summary['bank_expenses']}")
    assert summary['bank_expenses'] == 300.0
    
    print(f"Total Liquid Expenses (Expected 600): {summary['total_expenses']}")
    assert summary['total_expenses'] == 600.0
    
    print(f"Total Liquid Income (Expected 0 - Savings excluded): {summary['total_income']}")
    assert summary['total_income'] == 0.0

    print("\nALL SEPARATION TESTS PASSED!")

if __name__ == "__main__":
    test_analytics_separation()

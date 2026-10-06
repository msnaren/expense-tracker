import sys
import os

sys.path.append(os.path.abspath('.'))

from backend.database import SessionLocal
from backend.models.domain import User, Account, Transaction
from backend.schemas.schemas import TransactionCreate
from backend.routers.transactions import create_transaction, update_transaction, delete_transaction
from datetime import datetime

def test_fix():
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'testuser@example.com').first()
    
    # Ensure a Cash account exists
    cash_acc = db.query(Account).filter(Account.user_id == user.id, Account.type == 'Cash').first()
    if not cash_acc:
        cash_acc = Account(name="Wallet", type="Cash", balance=0.0, user_id=user.id)
        db.add(cash_acc)
        db.commit()
        db.refresh(cash_acc)

    # Ensure a UPI account exists
    upi_acc = db.query(Account).filter(Account.user_id == user.id, Account.type == 'UPI').first()
    if not upi_acc:
        upi_acc = Account(name="PhonePe", type="UPI", balance=0.0, user_id=user.id)
        db.add(upi_acc)
        db.commit()
        db.refresh(upi_acc)

    # Clean up transactions to start fresh
    db.query(Transaction).filter(Transaction.user_id == user.id).delete()
    cash_acc.balance = 0.0
    upi_acc.balance = 0.0
    db.commit()

    print(f"Initial Balances -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")

    # TEST 1: Create 100 expense using Cash
    tx1_data = TransactionCreate(
        amount=100.0,
        description="Lunch",
        type="Expense",
        category_id=1,
        account_id=cash_acc.id,
        payment_method="Cash",
        transaction_date=datetime.now()
    )
    
    # We simulate API call
    from fastapi import Depends
    
    tx1 = create_transaction(transaction=tx1_data, db=db, current_user=user)
    db.refresh(cash_acc)
    print(f"After Cash Expense (100) -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    assert cash_acc.balance == -100.0

    # Delete the expense
    delete_transaction(transaction_id=tx1.id, db=db, current_user=user)
    db.refresh(cash_acc)
    print(f"After Deleting Cash Expense -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    assert cash_acc.balance == 0.0

    # TEST 2: Create 100 expense using UPI
    tx2_data = TransactionCreate(
        amount=100.0,
        description="Coffee",
        type="Expense",
        category_id=1,
        account_id=upi_acc.id,
        payment_method="UPI",
        transaction_date=datetime.now()
    )
    tx2 = create_transaction(transaction=tx2_data, db=db, current_user=user)
    db.refresh(upi_acc)
    print(f"After UPI Expense (100) -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    assert upi_acc.balance == -100.0

    # Delete the expense
    delete_transaction(transaction_id=tx2.id, db=db, current_user=user)
    db.refresh(upi_acc)
    print(f"After Deleting UPI Expense -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    assert upi_acc.balance == 0.0

    # TEST 3: Create Cash expense, update to UPI
    tx3_data = TransactionCreate(
        amount=200.0,
        description="Dinner",
        type="Expense",
        category_id=1,
        account_id=cash_acc.id,
        payment_method="Cash",
        transaction_date=datetime.now()
    )
    tx3 = create_transaction(transaction=tx3_data, db=db, current_user=user)
    db.refresh(cash_acc)
    db.refresh(upi_acc)
    print(f"After Cash Expense (200) -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    
    # Update to UPI
    tx3_update_data = TransactionCreate(
        amount=200.0,
        description="Dinner",
        type="Expense",
        category_id=1,
        account_id=upi_acc.id,
        payment_method="UPI",
        transaction_date=datetime.now()
    )
    update_transaction(transaction_id=tx3.id, transaction_data=tx3_update_data, db=db, current_user=user)
    db.refresh(cash_acc)
    db.refresh(upi_acc)
    print(f"After Updating to UPI -> Cash: {cash_acc.balance}, UPI: {upi_acc.balance}")
    assert cash_acc.balance == 0.0
    assert upi_acc.balance == -200.0

    print("All tests passed successfully!")

if __name__ == "__main__":
    test_fix()

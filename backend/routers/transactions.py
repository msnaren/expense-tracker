from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_, func

from backend.database import get_db
from backend.models.domain import Transaction, User, Account, Category, Budget, Notification
from backend.schemas.schemas import TransactionCreate, TransactionResponse
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"]
)

def check_and_create_budget_notification(db: Session, user_id: int, category_id: int, tx_date: datetime):
    month = tx_date.month
    year = tx_date.year
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category_id == category_id,
        Budget.month == month,
        Budget.year == year
    ).first()

    if not budget or budget.amount <= 0:
        return

    # Total expenses for this category in month/year
    total_spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id,
        Transaction.category_id == category_id,
        Transaction.type.ilike('expense'),
        func.extract('month', Transaction.transaction_date) == month,
        func.extract('year', Transaction.transaction_date) == year
    ).scalar() or 0.0

    category = db.query(Category).filter(Category.id == category_id).first()
    cat_name = category.name if category else "Category"

    if total_spent >= budget.amount:
        notif = Notification(
            user_id=user_id,
            title=f"🚨 Budget Exceeded: {cat_name}",
            message=f"You have spent ₹{total_spent:,.2f}, exceeding your monthly budget of ₹{budget.amount:,.2f} for {cat_name}.",
            type="error"
        )
        db.add(notif)
    elif total_spent >= budget.amount * 0.8:
        pct = round((total_spent / budget.amount) * 100)
        notif = Notification(
            user_id=user_id,
            title=f"⚠️ Budget Alert: {cat_name}",
            message=f"You have used {pct}% (₹{total_spent:,.2f} of ₹{budget.amount:,.2f}) of your {cat_name} budget.",
            type="warning"
        )
        db.add(notif)


@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    type: Optional[str] = None,
    category_id: Optional[int] = None,
    account_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    order: Optional[str] = "desc",
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if type:
        query = query.filter(Transaction.type.ilike(type))
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if payment_method:
        query = query.filter(Transaction.payment_method.ilike(f"%{payment_method}%"))
    if start_date:
        try:
            s_date = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Transaction.transaction_date >= s_date)
        except ValueError:
            pass
    if end_date:
        try:
            e_date = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Transaction.transaction_date <= e_date)
        except ValueError:
            pass

    if search:
        search_pattern = f"%{search}%"
        query = query.outerjoin(Category, Transaction.category_id == Category.id)\
                     .outerjoin(Account, Transaction.account_id == Account.id)\
                     .filter(
                         or_(
                             Transaction.description.ilike(search_pattern),
                             Transaction.notes.ilike(search_pattern),
                             Transaction.payment_method.ilike(search_pattern),
                             Category.name.ilike(search_pattern),
                             Account.name.ilike(search_pattern)
                         )
                     )
        
    order_func = desc if order == "desc" else asc
    transactions = query.order_by(order_func(Transaction.transaction_date)).offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction: TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if transaction.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    account = db.query(Account).filter(Account.id == transaction.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    new_transaction = Transaction(
        user_id=current_user.id,
        **transaction.model_dump()
    )
    
    tx_type = transaction.type.lower()
    pm_lower = (transaction.payment_method or '').lower()
    target_account = account

    # Match Cash or UPI payment method to target account if needed
    if 'cash' in pm_lower and target_account.type.lower() != 'cash' and 'cash' not in target_account.name.lower():
        cash_acc = db.query(Account).filter(
            Account.user_id == current_user.id,
            (Account.type.ilike('cash') | Account.name.ilike('%cash%'))
        ).first()
        if cash_acc:
            target_account = cash_acc
    elif any(k in pm_lower for k in ['upi', 'bank', 'online', 'card']) and (target_account.type.lower() == 'cash' or 'cash' in target_account.name.lower()):
        upi_acc = db.query(Account).filter(
            Account.user_id == current_user.id,
            (Account.type.ilike('upi') | Account.name.ilike('%upi%') | Account.name.ilike('%bank%'))
        ).first()
        if upi_acc:
            target_account = upi_acc

    if tx_type == 'income':
        target_account.balance += transaction.amount
    elif tx_type == 'expense':
        target_account.balance -= transaction.amount

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # Budget alert check
    if tx_type == 'expense':
        check_and_create_budget_notification(db, current_user.id, new_transaction.category_id, new_transaction.transaction_date)
        db.commit()

    return new_transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if transaction_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Target new account
    new_account = db.query(Account).filter(Account.id == transaction_data.account_id, Account.user_id == current_user.id).first()
    if not new_account:
        raise HTTPException(status_code=404, detail="New account not found")

    # 1. Reverse old transaction effect on old account
    old_account = db.query(Account).filter(Account.id == tx.account_id).first()
    if old_account:
        old_type = tx.type.lower()
        if old_type == 'income':
            old_account.balance -= tx.amount
        elif old_type == 'expense':
            old_account.balance += tx.amount

    # 2. Update transaction fields
    tx.account_id = transaction_data.account_id
    tx.category_id = transaction_data.category_id
    tx.type = transaction_data.type
    tx.amount = transaction_data.amount
    tx.description = transaction_data.description
    tx.transaction_date = transaction_data.transaction_date
    tx.payment_method = transaction_data.payment_method
    tx.receipt_url = transaction_data.receipt_url
    tx.notes = transaction_data.notes

    # 3. Apply new transaction effect on new account
    new_type = transaction_data.type.lower()
    if new_type == 'income':
        new_account.balance += transaction_data.amount
    elif new_type == 'expense':
        new_account.balance -= transaction_data.amount

    db.commit()
    db.refresh(tx)

    # Budget alert check if expense
    if new_type == 'expense':
        check_and_create_budget_notification(db, current_user.id, tx.category_id, tx.transaction_date)
        db.commit()

    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Revert account balance
    account = db.query(Account).filter(Account.id == transaction.account_id).first()
    if account:
        tx_type = transaction.type.lower()
        if tx_type == 'income':
            account.balance -= transaction.amount
        elif tx_type == 'expense':
            account.balance += transaction.amount
            
    db.delete(transaction)
    db.commit()
    return None


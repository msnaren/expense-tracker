from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.domain import RecurringTransaction, User, Account, Category
from backend.schemas.schemas import RecurringTransactionCreate, RecurringTransactionResponse
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/recurring",
    tags=["Recurring Transactions"]
)

@router.get("", response_model=List[RecurringTransactionResponse])
def get_recurring_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id
    ).order_by(RecurringTransaction.next_date.asc()).all()

@router.post("", response_model=RecurringTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_transaction(
    recurring: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account
    account = db.query(Account).filter(
        Account.id == recurring.account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    new_recurring = RecurringTransaction(
        user_id=current_user.id,
        **recurring.model_dump()
    )
    db.add(new_recurring)
    db.commit()
    db.refresh(new_recurring)
    return new_recurring

@router.put("/{recurring_id}", response_model=RecurringTransactionResponse)
def update_recurring_transaction(
    recurring_id: int,
    recurring_data: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    item.account_id = recurring_data.account_id
    item.category_id = recurring_data.category_id
    item.amount = recurring_data.amount
    item.description = recurring_data.description
    item.frequency = recurring_data.frequency
    item.next_date = recurring_data.next_date

    db.commit()
    db.refresh(item)
    return item

@router.post("/{recurring_id}/toggle", response_model=RecurringTransactionResponse)
def toggle_recurring_active(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    item.active = not item.active
    db.commit()
    db.refresh(item)
    return item

@router.post("/process")
def process_due_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import date, datetime, timedelta
    from backend.models.domain import Transaction
    
    today = date.today()
    due_items = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
        RecurringTransaction.active == True,
        RecurringTransaction.next_date <= today
    ).all()

    processed_count = 0
    for item in due_items:
        account = db.query(Account).filter(Account.id == item.account_id).first()
        if not account:
            continue

        # Create real transaction
        tx_datetime = datetime.combine(item.next_date, datetime.min.time())
        new_tx = Transaction(
            user_id=current_user.id,
            account_id=item.account_id,
            category_id=item.category_id,
            type="Expense",
            amount=item.amount,
            description=f"Recurring: {item.description}",
            transaction_date=tx_datetime,
            payment_method="Auto Debit",
            notes="Generated automatically from recurring subscription schedule"
        )
        account.balance -= item.amount
        db.add(new_tx)

        # Advance next_date based on frequency
        freq = item.frequency.lower()
        if freq == "daily":
            item.next_date += timedelta(days=1)
        elif freq == "weekly":
            item.next_date += timedelta(weeks=1)
        elif freq == "monthly":
            # Approximate next month safely
            new_month = item.next_date.month % 12 + 1
            new_year = item.next_date.year + (item.next_date.month // 12)
            try:
                item.next_date = item.next_date.replace(year=new_year, month=new_month)
            except ValueError:
                item.next_date = item.next_date.replace(year=new_year, month=new_month, day=28)
        elif freq == "yearly":
            item.next_date = item.next_date.replace(year=item.next_date.year + 1)
        else:
            item.next_date += timedelta(days=30)

        processed_count += 1

    db.commit()
    return {"message": f"Processed {processed_count} recurring payments.", "processed_count": processed_count}

@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    db.delete(item)
    db.commit()
    return None


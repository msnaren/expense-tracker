from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from backend.database import get_db
from backend.models.domain import User, SavingsRecord, Account, Transaction
from backend.schemas.schemas import (
    SavingsContributionCreate,
    SavingsWithdrawalCreate,
    SavingsRecordUpdate,
    SavingsRecordResponse,
    AllocationUpdate,
    SavingsSummaryResponse
)
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/savings",
    tags=["Savings Management"]
)

@router.get("/summary", response_model=SavingsSummaryResponse)
def get_savings_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Total Income (Database Query)
    total_income = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "Income"
    ).scalar() or 0.0

    # 2. Daily Expense Allocation
    daily_expense_allocation = current_user.daily_expense_allocation or 0.0

    # 3. Daily Expense Spent (All normal expense transactions)
    daily_expense_spent = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "Expense"
    ).scalar() or 0.0

    # 4. Remaining Daily Expense Money
    remaining_daily_expense = max(0.0, daily_expense_allocation - daily_expense_spent)

    # 5. Total Contributions & Withdrawals from Savings Records
    total_contributions = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "contribution"
    ).scalar() or 0.0

    total_withdrawals = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "withdrawal"
    ).scalar() or 0.0

    # 6. Current Total Savings (Permanent DB total)
    total_savings = total_contributions - total_withdrawals

    # 7. Savings Rate = (Total Savings / Total Income) * 100
    savings_rate = round((total_savings / total_income * 100), 2) if total_income > 0 else 0.0

    return {
        "total_income": total_income,
        "daily_expense_allocation": daily_expense_allocation,
        "daily_expense_spent": daily_expense_spent,
        "remaining_daily_expense": remaining_daily_expense,
        "total_savings": total_savings,
        "total_contributions": total_contributions,
        "total_withdrawals": total_withdrawals,
        "savings_rate": savings_rate
    }


@router.get("/records", response_model=List[SavingsRecordResponse])
def get_savings_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(SavingsRecord).filter(
        SavingsRecord.user_id == current_user.id
    ).order_by(SavingsRecord.date.desc()).all()
    return records


@router.post("/contribution", response_model=SavingsRecordResponse, status_code=status.HTTP_201_CREATED)
def add_savings_contribution(
    req: SavingsContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount must be greater than zero.")

    # Validate Account if specified
    if req.account_id:
        acc = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
        if not acc:
            raise HTTPException(status_code=404, detail="Selected account not found.")

    new_record = SavingsRecord(
        user_id=current_user.id,
        account_id=req.account_id,
        amount=req.amount,
        type="contribution",
        description=req.description or "Savings Contribution",
        source=req.source or "Manual Contribution",
        date=req.date or datetime.now()
    )
    db.add(new_record)

    # If an account is chosen to fund this savings, deduct from available cash
    if req.account_id:
        acc = db.query(Account).filter(Account.id == req.account_id).first()
        if acc:
            acc.balance -= req.amount

    db.commit()
    db.refresh(new_record)
    return new_record


@router.post("/withdrawal", response_model=SavingsRecordResponse, status_code=status.HTTP_201_CREATED)
def withdraw_from_savings(
    req: SavingsWithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be greater than zero.")

    # Check Current Savings Balance
    total_contributions = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "contribution"
    ).scalar() or 0.0

    total_withdrawals = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "withdrawal"
    ).scalar() or 0.0

    current_savings = total_contributions - total_withdrawals

    if req.amount > current_savings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient savings balance. You have ₹{current_savings:,.2f} in savings."
        )

    # Find destination account or default account
    target_account_id = req.account_id
    acc = None
    if target_account_id:
        acc = db.query(Account).filter(Account.id == target_account_id, Account.user_id == current_user.id).first()
        if not acc:
            raise HTTPException(status_code=404, detail="Destination account not found.")
    else:
        acc = db.query(Account).filter(Account.user_id == current_user.id).first()
        if acc:
            target_account_id = acc.id

    # 1. Create Savings Record for withdrawal (reduces total_savings)
    new_record = SavingsRecord(
        user_id=current_user.id,
        account_id=target_account_id,
        amount=req.amount,
        type="withdrawal",
        description=req.reason or "Savings Taken to Cash Income",
        source="Savings Withdrawal",
        date=req.date or datetime.now()
    )
    db.add(new_record)

    # 2. Add an Income transaction so that it increases Total Income / Cash Received!
    from backend.models.domain import Category
    income_category = db.query(Category).filter(
        Category.type.ilike("income"),
        (Category.name.ilike("%Savings%") | Category.name.ilike("%Other%")),
        (Category.user_id == current_user.id) | (Category.user_id == None)
    ).first()

    if not income_category:
        income_category = db.query(Category).filter(Category.type.ilike("income")).first()

    if acc and income_category:
        income_tx = Transaction(
            user_id=current_user.id,
            account_id=acc.id,
            category_id=income_category.id,
            type="Income",
            amount=req.amount,
            description=f"Taken from Savings: {req.reason or 'Transferred to Cash'}",
            transaction_date=req.date or datetime.now(),
            payment_method="Cash",
            notes="Transferred from permanent savings vault into available cash income"
        )
        db.add(income_tx)
        # Increase cash in hand balance
        acc.balance += req.amount
    elif acc:
        acc.balance += req.amount

    db.commit()
    db.refresh(new_record)
    return new_record


@router.post("/allocation")
def update_daily_expense_allocation(
    req: AllocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.daily_expense_allocation < 0:
        raise HTTPException(status_code=400, detail="Daily expense allocation cannot be negative.")

    user = db.query(User).filter(User.id == current_user.id).first()
    user.daily_expense_allocation = req.daily_expense_allocation
    db.commit()

    return {"message": f"Daily expense allocation updated to ₹{req.daily_expense_allocation:,.2f}"}


@router.put("/records/{record_id}", response_model=SavingsRecordResponse)
def update_savings_record(
    record_id: int,
    req: SavingsRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(SavingsRecord).filter(
        SavingsRecord.id == record_id,
        SavingsRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Savings record not found.")

    # Reverse old account effect if account was tied
    if record.account_id:
        acc = db.query(Account).filter(Account.id == record.account_id).first()
        if acc:
            if record.type == "contribution":
                acc.balance += record.amount
            elif record.type == "withdrawal":
                acc.balance -= record.amount

    # Update fields
    if req.amount is not None:
        record.amount = req.amount
    if req.description is not None:
        record.description = req.description
    if req.source is not None:
        record.source = req.source
    if req.date is not None:
        record.date = req.date
    if req.type is not None:
        record.type = req.type
    if req.account_id is not None:
        record.account_id = req.account_id

    # Apply new account effect
    if record.account_id:
        acc = db.query(Account).filter(Account.id == record.account_id).first()
        if acc:
            if record.type == "contribution":
                acc.balance -= record.amount
            elif record.type == "withdrawal":
                acc.balance += record.amount

    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_savings_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(SavingsRecord).filter(
        SavingsRecord.id == record_id,
        SavingsRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Savings record not found.")

    # Reverse account effect
    if record.account_id:
        acc = db.query(Account).filter(Account.id == record.account_id).first()
        if acc:
            if record.type == "contribution":
                acc.balance += record.amount
            elif record.type == "withdrawal":
                acc.balance -= record.amount

    db.delete(record)
    db.commit()
    return None

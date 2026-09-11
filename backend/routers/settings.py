from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.domain import User, Account, Category, Transaction, Budget, SavingsGoal, SavingsChallenge, SavingsCheckIn
from backend.auth.dependencies import get_current_user
from backend.auth.security import verify_password, get_password_hash

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings & Data Management"]
)

class ProfileUpdate(BaseModel):
    name: str
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.put("/profile")
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if email is already taken by another user
    existing = db.query(User).filter(User.email == profile_data.email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already in use by another account.")

    current_user.name = profile_data.name
    current_user.email = profile_data.email
    db.commit()
    db.refresh(current_user)
    return {"name": current_user.name, "email": current_user.email, "message": "Profile updated successfully"}

@router.post("/change-password")
def change_password(
    pwd_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(pwd_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(pwd_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    current_user.password_hash = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/backup")
def export_full_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    challenges = db.query(SavingsChallenge).filter(SavingsChallenge.user_id == current_user.id).all()

    return {
        "version": "1.0",
        "exported_at": str(current_user.created_at),
        "user": {
            "name": current_user.name,
            "email": current_user.email
        },
        "accounts": [
            {"id": a.id, "name": a.name, "type": a.type, "balance": a.balance}
            for a in accounts
        ],
        "categories": [
            {"id": c.id, "name": c.name, "type": c.type, "icon": c.icon}
            for c in categories
        ],
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type,
                "description": t.description,
                "date": str(t.transaction_date),
                "account_id": t.account_id,
                "category_id": t.category_id,
                "payment_method": t.payment_method
            }
            for t in transactions
        ],
        "budgets": [
            {"id": b.id, "category_id": b.category_id, "amount": b.amount, "month": b.month, "year": b.year}
            for b in budgets
        ],
        "goals": [
            {"id": g.id, "name": g.name, "target_amount": g.target_amount, "current_amount": g.current_amount, "target_date": str(g.target_date)}
            for g in goals
        ],
        "challenges": [
            {"id": ch.id, "title": ch.title, "target_amount": ch.target_amount, "current_amount": ch.current_amount, "status": ch.status}
            for ch in challenges
        ]
    }

@router.post("/reset")
def reset_all_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Wipe transactions, checkins, challenges, goals, budgets
    db.query(SavingsCheckIn).filter(SavingsCheckIn.user_id == current_user.id).delete()
    db.query(SavingsChallenge).filter(SavingsChallenge.user_id == current_user.id).delete()
    db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).delete()
    db.query(Budget).filter(Budget.user_id == current_user.id).delete()
    db.query(Transaction).filter(Transaction.user_id == current_user.id).delete()

    # Reset account balances to default
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    for acc in accounts:
        acc.balance = 0.0

    db.commit()
    return {"message": "All data has been reset successfully."}

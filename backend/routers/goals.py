from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.domain import SavingsGoal, User, Account, Transaction, Category, Notification
from backend.schemas.schemas import SavingsGoalCreate, SavingsGoalResponse
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/goals",
    tags=["Goals"]
)

class GoalContributionRequest(BaseModel):
    amount: float
    account_id: Optional[int] = None

class GoalUpdateRequest(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[str] = None

@router.get("", response_model=List[SavingsGoalResponse])
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()

@router.post("", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(goal: SavingsGoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_goal = SavingsGoal(
        user_id=current_user.id,
        **goal.model_dump()
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.put("/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: int, 
    goal_data: GoalUpdateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    if goal_data.name is not None:
        goal.name = goal_data.name
    if goal_data.target_amount is not None:
        goal.target_amount = goal_data.target_amount
    if goal_data.current_amount is not None:
        goal.current_amount = goal_data.current_amount
    if goal_data.target_date is not None:
        try:
            goal.target_date = datetime.strptime(goal_data.target_date, '%Y-%m-%d').date()
        except ValueError:
            pass

    db.commit()
    db.refresh(goal)
    return goal

@router.post("/{goal_id}/contribute", response_model=SavingsGoalResponse)
def contribute_to_goal(
    goal_id: int,
    req: GoalContributionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount must be greater than zero.")

    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.current_amount += req.amount

    # If account specified, deduct contribution from user account balance
    if req.account_id:
        account = db.query(Account).filter(Account.id == req.account_id, Account.user_id == current_user.id).first()
        if account:
            account.balance -= req.amount
            
            # Find or create Savings Category
            sav_cat = db.query(Category).filter(
                Category.name == "Savings",
                (Category.user_id == current_user.id) | (Category.user_id == None)
            ).first()
            if not sav_cat:
                sav_cat = Category(name="Savings", type="Expense", user_id=current_user.id, icon="🎯")
                db.add(sav_cat)
                db.commit()
                db.refresh(sav_cat)

            tx = Transaction(
                user_id=current_user.id,
                account_id=account.id,
                category_id=sav_cat.id,
                type="Expense",
                amount=req.amount,
                description=f"Savings Contribution: {goal.name}",
                transaction_date=datetime.now(timezone.utc),
                payment_method="Transfer"
            )
            db.add(tx)

    # If goal reached, add celebratory notification
    if goal.current_amount >= goal.target_amount:
        notif = Notification(
            user_id=current_user.id,
            title=f"🎉 Savings Goal Achieved: {goal.name}",
            message=f"Congratulations! You reached your goal of ₹{goal.target_amount:,.2f} for {goal.name}.",
            type="success"
        )
        db.add(notif)

    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    db.delete(goal)
    db.commit()
    return None


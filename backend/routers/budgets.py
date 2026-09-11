import calendar
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.domain import Budget, User, Category, Transaction
from backend.schemas.schemas import BudgetCreate, BudgetResponse, BudgetAllocationSummaryResponse, CategoryBudgetItem
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/budgets",
    tags=["Budgets"]
)

def compute_budget_amounts(amount: float, period: str, daily_amount_in: Optional[float], month: int, year: int):
    days_in_month = calendar.monthrange(year, month)[1]
    period_clean = (period or "monthly").lower()
    
    if period_clean == "daily":
        d_amt = daily_amount_in if (daily_amount_in and daily_amount_in > 0) else amount
        m_amt = round(d_amt * days_in_month, 2)
    else:
        m_amt = amount
        d_amt = round(m_amt / days_in_month, 2) if days_in_month > 0 else 0.0
        
    return m_amt, d_amt, period_clean

@router.get("", response_model=List[BudgetResponse])
def get_budgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()

@router.get("/summary", response_model=BudgetAllocationSummaryResponse)
def get_budget_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    current_month_str = f"{target_month:02d}"
    current_year_str = str(target_year)
    today_str = now.strftime('%Y-%m-%d')

    # Fetch user's budgets for month/year
    user_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == target_month,
        Budget.year == target_year
    ).all()

    # Fetch expense transactions for this month
    monthly_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.ilike('expense'),
        func.strftime('%m', Transaction.transaction_date) == current_month_str,
        func.strftime('%Y', Transaction.transaction_date) == current_year_str
    ).all()

    # Calculate spent per category
    spent_monthly_map = {}
    spent_today_map = {}

    for tx in monthly_txs:
        cat_id = tx.category_id
        spent_monthly_map[cat_id] = spent_monthly_map.get(cat_id, 0.0) + tx.amount
        
        if tx.transaction_date and tx.transaction_date.strftime('%Y-%m-%d') == today_str:
            spent_today_map[cat_id] = spent_today_map.get(cat_id, 0.0) + tx.amount

    items = []
    total_monthly_allocated = 0.0
    total_daily_allocated = 0.0
    total_spent_monthly = 0.0
    total_spent_today = 0.0

    for b in user_budgets:
        cat_name = b.category.name if b.category else "Uncategorized"
        cat_icon = (b.category.icon if b.category else None) or "📦"
        
        m_allocated = b.amount or 0.0
        d_allocated = b.daily_amount or 0.0
        
        s_monthly = round(spent_monthly_map.get(b.category_id, 0.0), 2)
        s_today = round(spent_today_map.get(b.category_id, 0.0), 2)
        
        r_monthly = round(m_allocated - s_monthly, 2)
        r_today = round(d_allocated - s_today, 2)
        
        pct_monthly = round((s_monthly / m_allocated * 100), 1) if m_allocated > 0 else 0.0
        pct_today = round((s_today / d_allocated * 100), 1) if d_allocated > 0 else 0.0

        items.append(CategoryBudgetItem(
            id=b.id,
            category_id=b.category_id,
            category_name=cat_name,
            category_icon=cat_icon,
            period=b.period or "monthly",
            amount=m_allocated,
            daily_amount=d_allocated,
            spent_monthly=s_monthly,
            spent_today=s_today,
            remaining_monthly=r_monthly,
            remaining_today=r_today,
            used_percentage_monthly=pct_monthly,
            used_percentage_today=pct_today
        ))

        total_monthly_allocated += m_allocated
        total_daily_allocated += d_allocated
        total_spent_monthly += s_monthly
        total_spent_today += s_today

    total_monthly_allocated = round(total_monthly_allocated, 2)
    total_daily_allocated = round(total_daily_allocated, 2)
    total_spent_monthly = round(total_spent_monthly, 2)
    total_spent_today = round(total_spent_today, 2)

    total_remaining_monthly = round(total_monthly_allocated - total_spent_monthly, 2)
    total_remaining_today = round(total_daily_allocated - total_spent_today, 2)

    # Sync user's overall daily_expense_allocation if budgets exist
    if total_daily_allocated > 0 and current_user.daily_expense_allocation != total_daily_allocated:
        current_user.daily_expense_allocation = total_daily_allocated
        db.commit()

    return BudgetAllocationSummaryResponse(
        total_monthly_allocated=total_monthly_allocated,
        total_daily_allocated=total_daily_allocated,
        total_spent_monthly=total_spent_monthly,
        total_spent_today=total_spent_today,
        total_remaining_monthly=total_remaining_monthly,
        total_remaining_today=total_remaining_today,
        items=items
    )

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now()
    target_month = budget.month or now.month
    target_year = budget.year or now.year

    # Check if category exists
    category = db.query(Category).filter(
        Category.id == budget.category_id, 
        (Category.user_id == current_user.id) | (Category.user_id == None)
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    monthly_amt, daily_amt, clean_period = compute_budget_amounts(
        budget.amount, budget.period, budget.daily_amount, target_month, target_year
    )

    # Check if budget already exists for this category and month/year
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget.category_id,
        Budget.month == target_month,
        Budget.year == target_year
    ).first()
    
    if existing:
        existing.amount = monthly_amt
        existing.daily_amount = daily_amt
        existing.period = clean_period
        db.commit()
        db.refresh(existing)
        return existing

    new_budget = Budget(
        user_id=current_user.id,
        category_id=budget.category_id,
        amount=monthly_amt,
        daily_amount=daily_amt,
        period=clean_period,
        month=target_month,
        year=target_year
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    now = datetime.now()
    target_month = budget_data.month or budget.month or now.month
    target_year = budget_data.year or budget.year or now.year

    monthly_amt, daily_amt, clean_period = compute_budget_amounts(
        budget_data.amount, budget_data.period, budget_data.daily_amount, target_month, target_year
    )

    budget.category_id = budget_data.category_id
    budget.amount = monthly_amt
    budget.daily_amount = daily_amt
    budget.period = clean_period
    budget.month = target_month
    budget.year = target_year

    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    db.delete(budget)
    db.commit()
    return None



from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.database import get_db
from backend.models.domain import Transaction, User, Account, SavingsGoal, Category
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)

@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now()
    current_month_str = f"{now.month:02d}"
    current_year_str = str(now.year)
    
    # Query user accounts
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    total_account_balance = sum(a.balance for a in accounts)

    cash_acc_balance = sum(a.balance for a in accounts if a.type.lower() == 'cash' or 'cash' in a.name.lower())
    upi_acc_balance = sum(a.balance for a in accounts if a.type.lower() != 'cash' and 'cash' not in a.name.lower())

    # Query all user transactions
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    total_income = 0.0
    total_expenses = 0.0
    monthly_income = 0.0
    monthly_expenses = 0.0

    cash_income = 0.0
    upi_income = 0.0
    cash_expenses = 0.0
    upi_expenses = 0.0

    monthly_cash_income = 0.0
    monthly_upi_income = 0.0
    monthly_cash_expenses = 0.0
    monthly_upi_expenses = 0.0

    for tx in txs:
        tx_type = tx.type.lower()
        if tx_type not in ['income', 'expense']:
            continue

        tx_month = tx.transaction_date.strftime('%m') if tx.transaction_date else ''
        tx_year = tx.transaction_date.strftime('%Y') if tx.transaction_date else ''
        is_current_month = (tx_month == current_month_str and tx_year == current_year_str)

        # Check if Cash or UPI
        pm = (tx.payment_method or '').lower()
        acc_name = (tx.account.name if tx.account else '').lower()
        acc_type = (tx.account.type if tx.account else '').lower()

        is_cash = ('cash' in pm or 'cash' in acc_name or acc_type == 'cash')

        if tx_type == 'income':
            total_income += tx.amount
            if is_current_month:
                monthly_income += tx.amount

            if is_cash:
                cash_income += tx.amount
                if is_current_month:
                    monthly_cash_income += tx.amount
            else:
                upi_income += tx.amount
                if is_current_month:
                    monthly_upi_income += tx.amount

        elif tx_type == 'expense':
            total_expenses += tx.amount
            if is_current_month:
                monthly_expenses += tx.amount

            if is_cash:
                cash_expenses += tx.amount
                if is_current_month:
                    monthly_cash_expenses += tx.amount
            else:
                upi_expenses += tx.amount
                if is_current_month:
                    monthly_upi_expenses += tx.amount

    # Total Savings from permanent SavingsRecord vault
    from backend.models.domain import SavingsRecord
    tot_contrib = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "contribution"
    ).scalar() or 0.0
    tot_withdr = db.query(func.coalesce(func.sum(SavingsRecord.amount), 0.0)).filter(
        SavingsRecord.user_id == current_user.id,
        SavingsRecord.type == "withdrawal"
    ).scalar() or 0.0
    total_savings = tot_contrib - tot_withdr
    if total_savings <= 0:
        goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
        if goals:
            total_savings = sum(g.current_amount for g in goals)

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_account_balance, 2),
        "total_savings": round(total_savings, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "cash_balance": round(cash_acc_balance, 2),
        "upi_balance": round(upi_acc_balance, 2),
        "cash_income": round(cash_income, 2),
        "upi_income": round(upi_income, 2),
        "cash_expenses": round(cash_expenses, 2),
        "upi_expenses": round(upi_expenses, 2),
        "monthly_cash_income": round(monthly_cash_income, 2),
        "monthly_upi_income": round(monthly_upi_income, 2),
        "monthly_cash_expenses": round(monthly_cash_expenses, 2),
        "monthly_upi_expenses": round(monthly_upi_expenses, 2),
    }

@router.get("/categories")
def get_category_analytics(
    days: Optional[int] = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        Category.name,
        Category.icon,
        func.sum(Transaction.amount).label("total")
    ).join(Transaction, Transaction.category_id == Category.id)\
     .filter(
         Transaction.user_id == current_user.id,
         Transaction.type.ilike('expense')
     )

    if days and days > 0:
        cutoff = datetime.now() - timedelta(days=days)
        query = query.filter(Transaction.transaction_date >= cutoff)

    results = query.group_by(Category.id, Category.name, Category.icon)\
                   .order_by(desc("total")).all()

    total_expense = sum(r[2] for r in results) or 1.0
    
    categories = [
        {
            "name": r[0],
            "icon": r[1] or "📦",
            "amount": round(r[2], 2),
            "percentage": round((r[2] / total_expense) * 100, 1)
        }
        for r in results
    ]

    return categories

@router.get("/monthly")
def get_monthly_analytics(
    months: Optional[int] = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve past months income vs expense breakdown
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(["Income", "Expense", "income", "expense"])
    ).all()

    monthly_data = {}
    for tx in txs:
        key = tx.transaction_date.strftime('%Y-%m')
        if key not in monthly_data:
            monthly_data[key] = {"month": tx.transaction_date.strftime('%b %Y'), "income": 0.0, "expense": 0.0}
        
        if tx.type.lower() == 'income':
            monthly_data[key]["income"] += tx.amount
        elif tx.type.lower() == 'expense':
            monthly_data[key]["expense"] += tx.amount

    sorted_keys = sorted(monthly_data.keys())[-months:]
    return [monthly_data[k] for k in sorted_keys]

@router.get("/daily")
def get_daily_analytics(
    days: Optional[int] = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime.now() - timedelta(days=days or 30)
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= start_date,
        Transaction.type.ilike('expense')
    ).all()

    daily_map = {}
    for i in range(days or 30):
        d_str = (datetime.now() - timedelta(days=(days or 30) - 1 - i)).strftime('%Y-%m-%d')
        daily_map[d_str] = 0.0

    for tx in txs:
        d_str = tx.transaction_date.strftime('%Y-%m-%d')
        if d_str in daily_map:
            daily_map[d_str] += tx.amount

    return [{"date": k, "amount": round(v, 2)} for k, v in daily_map.items()]

@router.get("/trends")
def get_spending_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.ilike('expense')
    ).all()

    if not expenses:
        return {
            "has_data": False,
            "average_transaction": 0.0,
            "largest_expense": None,
            "most_used_category": None
        }

    total = sum(e.amount for e in expenses)
    avg_tx = total / len(expenses)
    largest = max(expenses, key=lambda e: e.amount)

    cat_counts = {}
    for e in expenses:
        cat_name = e.category.name if e.category else "Uncategorized"
        cat_counts[cat_name] = cat_counts.get(cat_name, 0) + 1

    most_used = max(cat_counts.items(), key=lambda x: x[1])[0]

    return {
        "has_data": True,
        "average_transaction": round(avg_tx, 2),
        "largest_expense": {
            "description": largest.description,
            "amount": round(largest.amount, 2),
            "date": largest.transaction_date.strftime('%Y-%m-%d')
        },
        "most_used_category": most_used
    }

@router.get("/forecast")
def get_expense_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    current_day = max(1, now.day)
    days_in_month = 30 # standard estimate

    # Sum current month expenses
    current_month_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.ilike('expense'),
        func.strftime('%m', Transaction.transaction_date) == f"{now.month:02d}",
        func.strftime('%Y', Transaction.transaction_date) == str(now.year)
    ).scalar() or 0.0

    count_tx = db.query(func.count(Transaction.id)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.ilike('expense')
    ).scalar() or 0

    if count_tx < 3:
        return {
            "has_sufficient_data": False,
            "message": "Not enough transaction history to generate a reliable forecast.",
            "estimated_monthly": 0.0
        }

    daily_avg = current_month_expenses / current_day
    estimated_total = daily_avg * days_in_month

    return {
        "has_sufficient_data": True,
        "current_month_so_far": round(current_month_expenses, 2),
        "daily_average": round(daily_avg, 2),
        "estimated_monthly": round(estimated_total, 2),
        "confidence": "Moderate" if current_day > 10 else "Initial Estimate"
    }

@router.get("/insights")
def get_financial_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insights = []
    now = datetime.now()
    
    # Expense totals
    current_month_exp = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.ilike('expense'),
        func.strftime('%m', Transaction.transaction_date) == f"{now.month:02d}",
        func.strftime('%Y', Transaction.transaction_date) == str(now.year)
    ).scalar() or 0.0

    # Top category
    top_cat = db.query(Category.name, func.sum(Transaction.amount).label("cat_total"))\
                .join(Transaction, Transaction.category_id == Category.id)\
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.type.ilike('expense'),
                    func.strftime('%m', Transaction.transaction_date) == f"{now.month:02d}",
                    func.strftime('%Y', Transaction.transaction_date) == str(now.year)
                ).group_by(Category.name).order_by(desc("cat_total")).first()

    if current_month_exp > 0:
        insights.append(f"You have spent ₹{current_month_exp:,.0f} overall this month.")

    if top_cat:
        insights.append(f"{top_cat[0]} is your highest spending category this month (₹{top_cat[1]:,.0f}).")

    if not insights:
        insights.append("Add transactions to generate personalized financial insights.")

    return {"insights": insights}


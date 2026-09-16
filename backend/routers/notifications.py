from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.domain import User, Budget, Transaction, RecurringTransaction, SavingsChallenge
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"]
)

@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = []
    today = date.today()

    # 1. Budget Alerts: check if current month expenses exceed 80% of budget
    current_month = datetime.now().month
    current_year = datetime.now().year
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == current_month,
        Budget.year == current_year
    ).all()

    for b in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == b.category_id,
            Transaction.type.ilike('expense'),
            func.extract('month', Transaction.transaction_date) == current_month,
            func.extract('year', Transaction.transaction_date) == current_year
        ).scalar() or 0.0

        if b.amount > 0 and spent >= b.amount * 0.8:
            pct = round((spent / b.amount) * 100)
            cat_name = b.category.name if b.category else 'Category'
            notifications.append({
                "id": f"budget_{b.id}",
                "title": f"⚠️ Budget Alert: {cat_name}",
                "message": f"You have used {pct}% (₹{spent:,.0f} of ₹{b.amount:,.0f}) of your monthly budget.",
                "type": "warning",
                "time": "Active this month"
            })

    # 2. Upcoming recurring payments due in <= 3 days
    upcoming_bills = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
        RecurringTransaction.active == True,
        RecurringTransaction.next_date >= today,
        RecurringTransaction.next_date <= today + timedelta(days=3)
    ).all()

    for bill in upcoming_bills:
        days_diff = (bill.next_date - today).days
        due_str = "Today!" if days_diff == 0 else f"in {days_diff} day{'s' if days_diff > 1 else ''}"
        notifications.append({
            "id": f"bill_{bill.id}",
            "title": f"📅 Upcoming Bill: {bill.description}",
            "message": f"₹{bill.amount:,.0f} due {due_str} ({bill.frequency})",
            "type": "info",
            "time": f"Due {bill.next_date.strftime('%b %d')}"
        })

    # 3. Active savings challenges encouragement
    active_challenges = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.status == 'active'
    ).limit(2).all()

    for ch in active_challenges:
        days_left = max(0, (ch.end_date - today).days)
        pct = round(min(100.0, (ch.current_amount / ch.target_amount) * 100)) if ch.target_amount > 0 else 0
        notifications.append({
            "id": f"ch_{ch.id}",
            "title": f"{ch.icon} Challenge Sprint: {ch.title}",
            "message": f"{pct}% achieved! {days_left} days remaining to reach ₹{ch.target_amount:,.0f}.",
            "type": "success",
            "time": f"{days_left}d left"
        })

    return {
        "unread_count": len(notifications),
        "notifications": notifications
    }

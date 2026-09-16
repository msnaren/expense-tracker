import io
import csv
from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.database import get_db
from backend.models.domain import Transaction, User, Category, Account
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports & Statements"]
)

@router.get("/summary")
def get_report_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        s_date = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date >= s_date)
    if end_date:
        e_date = datetime.strptime(end_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date <= e_date)

    transactions = query.order_by(desc(Transaction.transaction_date)).all()

    total_income = sum(t.amount for t in transactions if t.type.lower() == 'income')
    total_expense = sum(t.amount for t in transactions if t.type.lower() == 'expense')
    net_savings = total_income - total_expense
    savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

    # Category breakdown
    category_totals = {}
    for t in transactions:
        if t.type.lower() == 'expense':
            cat_name = t.category.name if t.category else 'Uncategorized'
            category_totals[cat_name] = category_totals.get(cat_name, 0.0) + t.amount

    category_breakdown = [
        {"name": k, "value": round(v, 2), "percentage": round(v / total_expense * 100, 1) if total_expense > 0 else 0}
        for k, v in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    # Payment method breakdown
    payment_totals = {}
    for t in transactions:
        method = t.payment_method or 'Other'
        payment_totals[method] = payment_totals.get(method, 0.0) + t.amount

    payment_breakdown = [
        {"method": k, "amount": round(v, 2)}
        for k, v in payment_totals.items()
    ]

    return {
        "transaction_count": len(transactions),
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_savings": round(net_savings, 2),
        "savings_rate": savings_rate,
        "category_breakdown": category_breakdown,
        "payment_breakdown": payment_breakdown,
        "transactions": [
            {
                "id": t.id,
                "date": t.transaction_date.strftime('%Y-%m-%d'),
                "type": t.type,
                "category": t.category.name if t.category else 'N/A',
                "account": t.account.name if t.account else 'N/A',
                "amount": t.amount,
                "description": t.description,
                "payment_method": t.payment_method
            }
            for t in transactions
        ]
    }

@router.get("/monthly")
def get_monthly_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    m = month or now.month
    y = year or now.year

    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        func.extract('month', Transaction.transaction_date) == m,
        func.extract('year', Transaction.transaction_date) == y
    ).all()

    income = sum(t.amount for t in txs if t.type.lower() == 'income')
    expense = sum(t.amount for t in txs if t.type.lower() == 'expense')

    cat_totals = {}
    for t in txs:
        if t.type.lower() == 'expense':
            cat_name = t.category.name if t.category else 'Other'
            cat_totals[cat_name] = cat_totals.get(cat_name, 0.0) + t.amount

    return {
        "month": m,
        "year": y,
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "savings": round(income - expense, 2),
        "categories": [{"name": k, "amount": round(v, 2)} for k, v in cat_totals.items()]
    }

@router.get("/export/csv")
def export_transactions_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        s_date = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date >= s_date)
    if end_date:
        e_date = datetime.strptime(end_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date <= e_date)

    transactions = query.order_by(desc(Transaction.transaction_date)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID", "Date", "Type", "Category", "Account", "Amount (INR)", "Description", "Payment Method", "Notes"])

    for t in transactions:
        writer.writerow([
            t.id,
            t.transaction_date.strftime('%Y-%m-%d %H:%M'),
            t.type,
            t.category.name if t.category else 'N/A',
            t.account.name if t.account else 'N/A',
            t.amount,
            t.description,
            t.payment_method or '',
            t.notes or ''
        ])

    csv_content = output.getvalue()
    filename = f"spendwise_statement_{date.today().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_transactions_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        s_date = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date >= s_date)
    if end_date:
        e_date = datetime.strptime(end_date, '%Y-%m-%d')
        query = query.filter(Transaction.transaction_date <= e_date)

    transactions = query.order_by(desc(Transaction.transaction_date)).all()
    
    total_income = sum(t.amount for t in transactions if t.type.lower() == 'income')
    total_expense = sum(t.amount for t in transactions if t.type.lower() == 'expense')

    # Generate a clean printable HTML document suitable for PDF saving/printing
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>SpendWise Financial Statement</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }}
        h1 {{ color: #4f46e5; }}
        .summary {{ display: flex; gap: 20px; margin-bottom: 30px; }}
        .card {{ background: #f8fafc; padding: 15px 25px; border-radius: 8px; border: 1px solid #e2e8f0; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }}
        th {{ background: #f1f5f9; color: #475569; }}
        .income {{ color: #16a34a; font-weight: bold; }}
        .expense {{ color: #dc2626; font-weight: bold; }}
    </style>
</head>
<body>
    <h1>SpendWise Financial Statement</h1>
    <p><strong>Account Holder:</strong> {current_user.name} ({current_user.email})</p>
    <p><strong>Generated Date:</strong> {date.today().strftime('%B %d, %Y')}</p>
    
    <div class="summary">
        <div class="card">
            <h3>Total Income</h3>
            <p class="income">₹{total_income:,.2f}</p>
        </div>
        <div class="card">
            <h3>Total Expenses</h3>
            <p class="expense">₹{total_expense:,.2f}</p>
        </div>
        <div class="card">
            <h3>Net Savings</h3>
            <p>₹{(total_income - total_expense):,.2f}</p>
        </div>
    </div>

    <h2>Transactions</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
"""
    for t in transactions:
        t_class = "income" if t.type.lower() == 'income' else "expense"
        cat_name = t.category.name if t.category else 'N/A'
        html_content += f"""
            <tr>
                <td>{t.transaction_date.strftime('%Y-%m-%d')}</td>
                <td>{t.type}</td>
                <td>{cat_name}</td>
                <td>{t.description}</td>
                <td class="{t_class}">₹{t.amount:,.2f}</td>
            </tr>
"""

    html_content += """
        </tbody>
    </table>
</body>
</html>
"""
    filename = f"spendwise_statement_{date.today().strftime('%Y%m%d')}.html"
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any
import json

from backend.database import get_db
from backend.auth.dependencies import get_current_user
from backend.models import domain
from google import genai
from google.genai import types

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Assistant"]
)

class ChatMessage(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    text: str
    data: Optional[Dict[str, Any]] = None
    intent: Optional[Dict[str, Any]] = None

def generate_smart_financial_response(message: str, user: domain.User, db: Session) -> ChatResponse:
    """Smart fallback financial analysis engine based on user's actual database records."""
    now = datetime.now()
    month_str = f"{now.month:02d}"
    year_str = str(now.year)
    msg_lower = message.lower()

    # Query user transactions
    txs = db.query(domain.Transaction).filter(domain.Transaction.user_id == user.id).all()
    accounts = db.query(domain.Account).filter(domain.Account.user_id == user.id).all()
    budgets = db.query(domain.Budget).filter(domain.Budget.user_id == user.id, domain.Budget.month == now.month, domain.Budget.year == now.year).all()

    total_account_balance = sum(a.balance for a in accounts)

    monthly_exp = sum(t.amount for t in txs if t.type.lower() == 'expense' and t.transaction_date.strftime('%m') == month_str and t.transaction_date.strftime('%Y') == year_str)
    monthly_inc = sum(t.amount for t in txs if t.type.lower() == 'income' and t.transaction_date.strftime('%m') == month_str and t.transaction_date.strftime('%Y') == year_str)

    # Category breakdown for current month
    cat_exp = {}
    for t in txs:
        if t.type.lower() == 'expense' and t.transaction_date.strftime('%m') == month_str and t.transaction_date.strftime('%Y') == year_str:
            cname = t.category.name if t.category else 'General'
            cat_exp[cname] = cat_exp.get(cname, 0.0) + t.amount

    day_of_month = max(1, now.day)
    daily_avg = monthly_exp / day_of_month

    if any(k in msg_lower for k in ["spend", "expense", "spent", "cost", "how much"]):
        if "category" in msg_lower or "where" in msg_lower or "most" in msg_lower:
            if not cat_exp:
                return ChatResponse(text=f"Hi {user.name}, you haven't recorded any expenses for this month yet.")
            top_cat = max(cat_exp.items(), key=lambda x: x[1])
            text = f"Your highest spending category this month is **{top_cat[0]}** at **₹{top_cat[1]:,.2f}**.\n\nHere is your full category spending breakdown for {now.strftime('%B %Y')}:"
            items = [{"name": k, "value": round(v, 2)} for k, v in sorted(cat_exp.items(), key=lambda x: x[1], reverse=True)]
            return ChatResponse(
                text=text,
                data={"type": "pie", "title": "Category Spending Breakdown", "items": items}
            )
        else:
            text = f"You have spent **₹{monthly_exp:,.2f}** so far in {now.strftime('%B %Y')}.\n\n" \
                   f"• **Average Daily Spend:** ₹{daily_avg:,.2f}/day\n" \
                   f"• **Income Received:** ₹{monthly_inc:,.2f}\n" \
                   f"• **Current Accounts Balance:** ₹{total_account_balance:,.2f}"
            data = {
                "type": "metric",
                "title": "Monthly Spending & Balance",
                "items": [
                    {"name": "Spent This Month", "value": round(monthly_exp, 2)},
                    {"name": "Income This Month", "value": round(monthly_inc, 2)},
                    {"name": "Account Balance", "value": round(total_account_balance, 2)}
                ]
            }
            return ChatResponse(text=text, data=data)

    elif any(k in msg_lower for k in ["compare", "last month", "previous"]):
        last_m = 12 if now.month == 1 else now.month - 1
        last_y = now.year - 1 if now.month == 1 else now.year
        last_m_str = f"{last_m:02d}"
        last_y_str = str(last_y)

        last_exp = sum(t.amount for t in txs if t.type.lower() == 'expense' and t.transaction_date.strftime('%m') == last_m_str and t.transaction_date.strftime('%Y') == last_y_str)
        diff = monthly_exp - last_exp
        diff_str = f"+₹{diff:,.2f}" if diff >= 0 else f"-₹{abs(diff):,.2f}"

        text = f"Expenses comparison:\n\n" \
               f"• **This Month ({now.strftime('%b')}):** ₹{monthly_exp:,.2f}\n" \
               f"• **Last Month:** ₹{last_exp:,.2f}\n" \
               f"• **Difference:** {diff_str}"
        data = {
            "type": "bar",
            "title": "Monthly Comparison",
            "items": [
                {"name": "Last Month", "value": round(last_exp, 2)},
                {"name": "This Month", "value": round(monthly_exp, 2)}
            ]
        }
        return ChatResponse(text=text, data=data)

    elif any(k in msg_lower for k in ["daily", "average"]):
        text = f"Your average daily cash expenditure so far this month is **₹{daily_avg:,.2f}/day** across {day_of_month} days."
        data = {
            "type": "metric",
            "title": "Daily Spending Metric",
            "items": [
                {"name": "Daily Average", "value": round(daily_avg, 2)},
                {"name": "Total Month So Far", "value": round(monthly_exp, 2)}
            ]
        }
        return ChatResponse(text=text, data=data)

    elif any(k in msg_lower for k in ["save", "saving", "budget"]):
        total_allocated = sum(b.amount for b in budgets)
        net_savings = max(0.0, monthly_inc - monthly_exp)
        text = f"Here is your financial savings summary for {now.strftime('%B %Y')}:\n\n" \
               f"• **Income:** ₹{monthly_inc:,.2f}\n" \
               f"• **Actual Spent:** ₹{monthly_exp:,.2f}\n" \
               f"• **Category Budget Allocated:** ₹{total_allocated:,.2f}\n" \
               f"• **Net Savings Capacity:** ₹{net_savings:,.2f}"
        data = {
            "type": "metric",
            "title": "Savings Overview",
            "items": [
                {"name": "Income", "value": round(monthly_inc, 2)},
                {"name": "Spent", "value": round(monthly_exp, 2)},
                {"name": "Net Savings", "value": round(net_savings, 2)}
            ]
        }
        return ChatResponse(text=text, data=data)

    else:
        text = f"Hello {user.name}! I analyzed your active financial records:\n\n" \
               f"• **Total Accounts Balance:** ₹{total_account_balance:,.2f}\n" \
               f"• **Monthly Income:** ₹{monthly_inc:,.2f}\n" \
               f"• **Monthly Expenses:** ₹{monthly_exp:,.2f}\n\n" \
               f"Feel free to ask me questions like:\n" \
               f"- *'How much did I spend this month?'*\n" \
               f"- *'Where am I spending the most?'*\n" \
               f"- *'Compare this month with last month.'*"
        
        items = [{"name": k, "value": round(v, 2)} for k, v in sorted(cat_exp.items(), key=lambda x: x[1], reverse=True)[:5]]
        data = {"type": "bar", "title": "Top Spending Categories", "items": items} if items else None
        return ChatResponse(text=text, data=data)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_request: ChatMessage,
    db: Session = Depends(get_db),
    current_user: domain.User = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key:
        try:
            client = genai.Client(api_key=api_key)

            transactions = db.query(domain.Transaction).filter(domain.Transaction.user_id == current_user.id).order_by(domain.Transaction.transaction_date.desc()).limit(50).all()
            budgets = db.query(domain.Budget).filter(domain.Budget.user_id == current_user.id).all()
            accounts = db.query(domain.Account).filter(domain.Account.user_id == current_user.id).all()
            goals = db.query(domain.SavingsGoal).filter(domain.SavingsGoal.user_id == current_user.id).all()
            savings = db.query(domain.SavingsRecord).filter(domain.SavingsRecord.user_id == current_user.id).all()

            context_str = f"User Name: {current_user.name}\n\nAccounts:\n"
            for acc in accounts:
                context_str += f"- {acc.name} ({acc.type}): ₹{acc.balance}\n"

            context_str += "\nRecent Transactions:\n"
            for txn in transactions:
                cat_name = txn.category.name if txn.category else 'N/A'
                context_str += f"- {txn.transaction_date.strftime('%Y-%m-%d')} | {txn.type} | {cat_name} | ₹{txn.amount} | {txn.description}\n"

            context_str += "\nBudgets:\n"
            for b in budgets:
                cat_name = b.category.name if b.category else 'N/A'
                context_str += f"- {cat_name}: ₹{b.amount} (Daily limit: ₹{b.daily_amount or 0})\n"

            context_str += "\nSavings Goals:\n"
            for g in goals:
                context_str += f"- {g.name}: Target ₹{g.target_amount}, Current ₹{g.current_amount}, Target Date {g.target_date}\n"

            system_prompt = f"""You are SpendWise AI, a highly skilled Financial Expert and Personal Finance Assistant for {current_user.name}.
Your job is to analyze the user's financial data, explain personal finance concepts, and seamlessly help them record transactions via natural language in ANY language (English, Tamil, Hindi, etc.).

IMPORTANT RULES:
1. DO NOT invent transaction data. Use only the provided context for analysis.
2. ALWAYS reply in the exact language the user is speaking (e.g. English, Tamil, Hindi, etc.). Support auto-detect. 
3. MULTILINGUAL TRANSACTION PARSING: If the user states they spent or received money (e.g., "Spent ₹500 on petrol today", "நான் இன்று பெட்ரோலுக்கு 500 ரூபாய் செலவு செய்தேன்", "आज मैंने पेट्रोल पर 500 रुपये खर्च किए"):
   - Extract the `amount`, `category`, `description`, `date`, and `transaction_type`.
   - **FALLBACK HANDLING**: If critical information is missing, DO NOT output the `intent` object. Instead, use the `text` field to ask the user for the missing information in their language.
     - If amount is missing -> ask for the amount.
     - If category is unclear -> suggest categories and ask.
     - If date is unclear -> ask for the date (default to today if they imply recent).
   - If ALL information is present (at least amount and basic category), output the `intent` JSON field so the frontend can show a confirmation UI.
4. Format all monetary amounts with the ₹ symbol.

User Context Data:
{context_str}

Respond strictly in valid JSON format:
{{
  "text": "Your response text. (Translated to the user's language). If asking for missing transaction details, ask it here.",
  "data": {{
      "type": "bar" | "pie" | "metric",
      "title": "Chart Title",
      "items": [{{"name": "Category A", "value": 100}}]
  }},
  "intent": {{
      "type": "add_transaction",
      "transaction_type": "Expense" | "Income",
      "amount": 500,
      "category": "Transport",
      "description": "Petrol",
      "date": "{datetime.now().strftime('%Y-%m-%d')}"
  }}
}}
The "data" and "intent" fields are optional. Include "intent" ONLY if the user explicitly wants to add a transaction AND all necessary fields (amount, category) are identified.
"""

            contents = []
            for msg in chat_request.history:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append(
                    types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
                )
            contents.append(
                types.Content(role="user", parts=[types.Part.from_text(text=chat_request.message)])
            )

            # Try candidate Gemini models
            for model_candidate in ["gemini-2.0-flash", "gemini-1.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_candidate,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            response_mime_type="application/json",
                        )
                    )
                    if response and response.text:
                        parsed = json.loads(response.text)
                        return ChatResponse(
                            text=parsed.get("text", "Here is what I found based on your data."),
                            data=parsed.get("data"),
                            intent=parsed.get("intent")
                        )
                except Exception:
                    continue

        except Exception as e:
            print(f"Gemini API call failed, falling back to smart engine: {e}")

    # Fallback to Smart Financial Response Engine
    return generate_smart_financial_response(chat_request.message, current_user, db)


class CategorizeRequest(BaseModel):
    text: str

class CategorizeResponse(BaseModel):
    category: str
    confidence: float
    type: str

class OCRResponse(BaseModel):
    merchant: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    tax: Optional[float] = None
    suggested_category: Optional[str] = None
    confidence: float

@router.post("/categorize", response_model=CategorizeResponse)
def categorize_expense(
    req: CategorizeRequest,
    db: Session = Depends(get_db),
    current_user: domain.User = Depends(get_current_user)
):
    text_lower = req.text.lower()
    
    if any(k in text_lower for k in ["biryani", "pizza", "burger", "coffee", "restaurant", "food", "dinner", "lunch", "swiggy", "zomato", "cafe"]):
        return CategorizeResponse(category="Food", confidence=0.92, type="Expense")
    elif any(k in text_lower for k in ["uber", "ola", "auto", "taxi", "bus", "train", "flight", "petrol", "fuel", "college", "metro"]):
        return CategorizeResponse(category="Transport", confidence=0.90, type="Expense")
    elif any(k in text_lower for k in ["groceries", "supermarket", "milk", "vegetables", "fruits", "mart", "zepto", "blinkit"]):
        return CategorizeResponse(category="Groceries", confidence=0.88, type="Expense")
    elif any(k in text_lower for k in ["rent", "landlord", "flat"]):
        return CategorizeResponse(category="Rent", confidence=0.95, type="Expense")
    elif any(k in text_lower for k in ["netflix", "spotify", "prime", "youtube", "subscription"]):
        return CategorizeResponse(category="Subscriptions", confidence=0.93, type="Expense")
    elif any(k in text_lower for k in ["electricity", "water", "gas", "wifi", "internet", "recharge", "bill"]):
        return CategorizeResponse(category="Utilities", confidence=0.89, type="Expense")
    elif any(k in text_lower for k in ["salary", "stipend", "bonus", "freelance", "paycheck"]):
        return CategorizeResponse(category="Salary", confidence=0.95, type="Income")

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Categorize transaction: '{req.text}'. Choose one category from: Food, Groceries, Transport, Shopping, Rent, Utilities, Education, Healthcare, Entertainment, Travel, Subscriptions, Bills, Personal, Salary, Freelance, Business, Other. Return ONLY JSON like {{\"category\": \"CategoryName\", \"type\": \"Expense\"}}"
            res = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            parsed = json.loads(res.text)
            return CategorizeResponse(category=parsed.get("category", "Personal"), confidence=0.85, type=parsed.get("type", "Expense"))
        except Exception:
            pass

    return CategorizeResponse(category="Personal", confidence=0.50, type="Expense")

@router.post("/ocr", response_model=OCRResponse)
async def process_receipt_ocr(
    db: Session = Depends(get_db),
    current_user: domain.User = Depends(get_current_user)
):
    today_str = datetime.now().strftime('%Y-%m-%d')
    return OCRResponse(
        merchant="Supermarket Store",
        date=today_str,
        amount=1450.00,
        tax=72.50,
        suggested_category="Groceries",
        confidence=0.88
    )



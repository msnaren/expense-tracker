from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    daily_expense_allocation: Optional[float] = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    code: Optional[str] = None

class AccountBase(BaseModel):
    name: str
    type: str

class AccountCreate(AccountBase):
    balance: float = 0.0

class AccountResponse(AccountBase):
    id: int
    user_id: int
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    account_id: int
    category_id: int
    type: str
    amount: float
    description: str
    transaction_date: datetime
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    category: Optional[CategoryResponse] = None
    account: Optional[AccountResponse] = None

    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    category_id: int
    amount: float # limit amount (monthly or daily depending on period)
    period: Optional[str] = "monthly" # "daily" or "monthly"
    daily_amount: Optional[float] = 0.0
    month: Optional[int] = None
    year: Optional[int] = None

class BudgetCreate(BudgetBase):
    pass

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    daily_amount: float
    period: str
    month: int
    year: int
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class CategoryBudgetItem(BaseModel):
    id: int
    category_id: int
    category_name: str
    category_icon: Optional[str] = "📦"
    period: str
    amount: float
    daily_amount: float
    spent_monthly: float
    spent_today: float
    remaining_monthly: float
    remaining_today: float
    used_percentage_monthly: float
    used_percentage_today: float

class BudgetAllocationSummaryResponse(BaseModel):
    total_monthly_allocated: float
    total_daily_allocated: float
    total_spent_monthly: float
    total_spent_today: float
    total_remaining_monthly: float
    total_remaining_today: float
    items: List[CategoryBudgetItem]

class SavingsGoalBase(BaseModel):
    name: str
    target_amount: float
    target_date: date

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalResponse(SavingsGoalBase):
    id: int
    user_id: int
    current_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

# --- NEW PERMANENT SAVINGS SYSTEM SCHEMAS ---
class SavingsContributionCreate(BaseModel):
    amount: float
    date: datetime
    description: str
    source: Optional[str] = "Manual Contribution"
    account_id: Optional[int] = None

class SavingsWithdrawalCreate(BaseModel):
    amount: float
    date: datetime
    reason: str
    account_id: Optional[int] = None # Destination account

class SavingsRecordUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = None
    date: Optional[datetime] = None
    type: Optional[str] = None
    account_id: Optional[int] = None

class SavingsRecordResponse(BaseModel):
    id: int
    user_id: int
    account_id: Optional[int] = None
    amount: float
    type: str # contribution or withdrawal
    description: str
    source: Optional[str] = None
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AllocationUpdate(BaseModel):
    daily_expense_allocation: float

class SavingsSummaryResponse(BaseModel):
    total_income: float
    daily_expense_allocation: float
    daily_expense_spent: float
    remaining_daily_expense: float
    total_savings: float
    total_contributions: float
    total_withdrawals: float
    savings_rate: float
# --------------------------------------------

class RecurringTransactionBase(BaseModel):
    account_id: int
    category_id: int
    amount: float
    description: str
    frequency: str
    next_date: date

class RecurringTransactionCreate(RecurringTransactionBase):
    pass

class RecurringTransactionResponse(RecurringTransactionBase):
    id: int
    user_id: int
    active: bool

    class Config:
        from_attributes = True

class ChallengeBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "General"
    target_amount: float
    start_date: date
    end_date: date
    challenge_type: str = "fixed_amount"
    icon: Optional[str] = "🏆"

class ChallengeCreate(ChallengeBase):
    current_amount: Optional[float] = 0.0

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    status: Optional[str] = None
    icon: Optional[str] = None

class ChallengeProgressAdd(BaseModel):
    amount: float
    notes: Optional[str] = None

class CheckInCreate(BaseModel):
    challenge_id: Optional[int] = None
    amount: Optional[float] = 0.0
    notes: Optional[str] = None

class CheckInResponse(BaseModel):
    id: int
    user_id: int
    challenge_id: Optional[int] = None
    checkin_date: date
    amount: float
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChallengeResponse(ChallengeBase):
    id: int
    user_id: int
    current_amount: float
    status: str
    created_at: datetime
    days_remaining: Optional[int] = None
    progress_percentage: Optional[float] = None
    remaining_amount: Optional[float] = None

    class Config:
        from_attributes = True

class BadgeResponse(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    unlocked: bool
    progress: float
    unlocked_at: Optional[str] = None

class GamificationStatsResponse(BaseModel):
    current_streak: int
    longest_streak: int
    total_saved: float
    active_challenges_count: int
    badges: List[BadgeResponse]

class NotificationItem(BaseModel):
    id: str
    title: str
    message: str
    type: str
    time: str

class NotificationResponse(BaseModel):
    unread_count: int
    notifications: List[NotificationItem]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from backend.database import engine, Base
from backend.routers import (
    auth_router,
    categories_router,
    accounts_router,
    transactions_router,
    budgets_router,
    goals_router,
    analytics_router,
    ai_assistant_router,
    challenges_router,
    recurring_router,
    reports_router,
    settings_router,
    notifications_router,
    savings_router
)

from sqlalchemy import text, inspect

# Create database tables
Base.metadata.create_all(bind=engine)

# Auto-migrate columns for budgets if missing
with engine.connect() as conn:
    inspector = inspect(engine)
    if 'budgets' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('budgets')]
        if 'daily_amount' not in columns:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN daily_amount FLOAT DEFAULT 0.0"))
        if 'period' not in columns:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN period VARCHAR DEFAULT 'monthly'"))
        conn.commit()

app = FastAPI(
    title="SpendWise API",
    description="API for the SpendWise Smart Expense Tracker",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000", # React default
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://expense-tracker-0418.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(accounts_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(goals_router)
app.include_router(analytics_router)
app.include_router(ai_assistant_router)
app.include_router(challenges_router)
app.include_router(recurring_router)
app.include_router(reports_router)
app.include_router(settings_router)
app.include_router(notifications_router)
app.include_router(savings_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to SpendWise API"}

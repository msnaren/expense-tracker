import pytest
import asyncio
import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import sys

# Add backend to sys path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.main import app
from backend.database import Base, get_db
from backend.models.domain import User, Account, Category
from backend.auth.utils import get_password_hash

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_spendwise.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test user
    user = User(name="Test User", email="test@example.com", password_hash=get_password_hash("password"))
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create test account
    account = Account(user_id=user.id, name="Test Account", type="Bank Account", balance=500.0)
    db.add(account)
    db.commit()
    db.refresh(account)

    # Create test category
    category = Category(name="Test Category", type="Expense", user_id=user.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    
    yield {"user_id": user.id, "account_id": account.id, "category_id": category.id}
    
    db.close()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_spendwise.db"):
        os.remove("./test_spendwise.db")

@pytest.mark.asyncio
async def test_concurrent_transactions_balance_integrity(setup_db):
    """
    Test that 5 concurrent transactions of 100 each correctly reduce the 500 balance to 0,
    with no race condition double-spending.
    """
    db_data = setup_db
    # We need to authenticate. For testing, we can override get_current_user
    from backend.auth.dependencies import get_current_user
    
    def override_get_current_user():
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == db_data["user_id"]).first()
        db.close()
        return user

    app.dependency_overrides[get_current_user] = override_get_current_user

    # In httpx >= 0.28, ASGI apps should be passed via transport or ASGITransport
    # But passing app directly might still work depending on version. 
    # To be safe, use httpx.ASGITransport(app=app)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Fire 5 concurrent withdrawal requests of 100
        reqs = []
        for i in range(5):
            tx_data = {
                "account_id": db_data["account_id"],
                "category_id": db_data["category_id"],
                "type": "Expense",
                "amount": 100.0,
                "description": f"Test transaction {i}",
                "transaction_date": datetime.now().isoformat()
            }
            reqs.append(client.post("/api/transactions", json=tx_data))
            
        responses = await asyncio.gather(*reqs)
        
        # All should succeed
        for res in responses:
            assert res.status_code == 201

    # Check final balance in DB
    db = TestingSessionLocal()
    account = db.query(Account).filter(Account.id == db_data["account_id"]).first()
    db.close()
    
    # Starting balance was 500, 5x100 expenses means balance should be exactly 0
    assert account.balance == 0.0

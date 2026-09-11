from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.domain import Account, User, Transaction, Category
from backend.schemas.schemas import AccountCreate, AccountResponse
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/accounts",
    tags=["Accounts"]
)

class TransferRequest(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float
    description: Optional[str] = "Account Transfer"

class AccountUpdate(BaseModel):
    name: str
    type: str
    balance: Optional[float] = None

@router.get("", response_model=List[AccountResponse])
def get_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    
    # Auto-seed default Cash and UPI accounts if user does not have them
    has_cash = any(a.type.lower() == 'cash' or 'cash' in a.name.lower() for a in user_accounts)
    has_upi = any(a.type.lower() == 'upi' or 'upi' in a.name.lower() or 'bank' in a.name.lower() for a in user_accounts)
    
    changed = False
    if not has_cash:
        cash_acc = Account(name="Cash Wallet", type="Cash", balance=0.0, user_id=current_user.id)
        db.add(cash_acc)
        changed = True
    
    if not has_upi:
        upi_acc = Account(name="UPI / Bank Account", type="UPI", balance=0.0, user_id=current_user.id)
        db.add(upi_acc)
        changed = True

    if changed:
        db.commit()
        user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()

    return user_accounts

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(account: AccountCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_account = Account(
        name=account.name,
        type=account.type,
        balance=account.balance,
        user_id=current_user.id
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int, 
    account_data: AccountUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.name = account_data.name
    account.type = account_data.type
    if account_data.balance is not None:
        account.balance = round(float(account_data.balance), 2)

    db.commit()
    db.refresh(account)
    return account

@router.post("/recalculate")
def recalculate_balances(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    net_map = {acc.id: 0.0 for acc in user_accounts}

    for tx in user_txs:
        t_type = (tx.type or '').lower()
        if tx.account_id in net_map:
            if t_type == 'income':
                net_map[tx.account_id] += tx.amount
            elif t_type == 'expense':
                net_map[tx.account_id] -= tx.amount
            elif t_type == 'transfer':
                net_map[tx.account_id] -= tx.amount

    updated = []
    for acc in user_accounts:
        calc_bal = round(net_map.get(acc.id, 0.0), 2)
        acc.balance = calc_bal
        updated.append({"id": acc.id, "name": acc.name, "new_balance": acc.balance})

    db.commit()
    return {"message": "Account balances synchronized successfully", "accounts": updated}

@router.post("/transfer")
def transfer_funds(
    req: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be greater than zero.")

    if req.from_account_id == req.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer money to the same account.")

    from_acc = db.query(Account).filter(Account.id == req.from_account_id, Account.user_id == current_user.id).first()
    to_acc = db.query(Account).filter(Account.id == req.to_account_id, Account.user_id == current_user.id).first()

    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="Source or destination account not found.")

    # Get or create a Transfer category
    transfer_cat = db.query(Category).filter(
        Category.name == "Transfer",
        (Category.user_id == current_user.id) | (Category.user_id == None)
    ).first()

    if not transfer_cat:
        transfer_cat = Category(name="Transfer", type="Transfer", user_id=current_user.id, icon="🔄")
        db.add(transfer_cat)
        db.commit()
        db.refresh(transfer_cat)

    # Perform balance update
    from_acc.balance -= req.amount
    to_acc.balance += req.amount

    # Record transfer transaction (type = "Transfer", excluded from income/expense sums in analytics)
    now = datetime.now(timezone.utc)
    tx = Transaction(
        user_id=current_user.id,
        account_id=from_acc.id,
        category_id=transfer_cat.id,
        type="Transfer",
        amount=req.amount,
        description=f"Transfer to {to_acc.name}: {req.description}",
        transaction_date=now,
        payment_method="Transfer"
    )
    db.add(tx)
    db.commit()

    return {
        "message": f"Successfully transferred ₹{req.amount:,.2f} from {from_acc.name} to {to_acc.name}.",
        "from_account_balance": from_acc.balance,
        "to_account_balance": to_acc.balance
    }

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Check if there are transactions linked to this account
    transactions = db.query(Transaction).filter(Transaction.account_id == account_id).first()
    if transactions:
        raise HTTPException(status_code=400, detail="Cannot delete account with existing transactions")
        
    db.delete(account)
    db.commit()
    return None


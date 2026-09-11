from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models.domain import Category, User
from backend.schemas.schemas import CategoryCreate, CategoryResponse
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"]
)

DEFAULT_CATEGORIES = [
    {"name": "Food", "type": "Expense", "icon": "🍔"},
    {"name": "Groceries", "type": "Expense", "icon": "🛒"},
    {"name": "Transport", "type": "Expense", "icon": "🚗"},
    {"name": "Shopping", "type": "Expense", "icon": "🛍️"},
    {"name": "Rent", "type": "Expense", "icon": "🏠"},
    {"name": "Utilities", "type": "Expense", "icon": "💡"},
    {"name": "Education", "type": "Expense", "icon": "🎓"},
    {"name": "Healthcare", "type": "Expense", "icon": "🏥"},
    {"name": "Entertainment", "type": "Expense", "icon": "🎬"},
    {"name": "Travel", "type": "Expense", "icon": "✈️"},
    {"name": "Subscriptions", "type": "Expense", "icon": "📱"},
    {"name": "Bills", "type": "Expense", "icon": "📄"},
    {"name": "Personal", "type": "Expense", "icon": "👤"},
    {"name": "Salary", "type": "Income", "icon": "💰"},
    {"name": "Freelance", "type": "Income", "icon": "💼"},
    {"name": "Business", "type": "Income", "icon": "📈"},
    {"name": "Investment", "type": "Income", "icon": "📊"},
    {"name": "Gift", "type": "Income", "icon": "🎁"},
    {"name": "Other Income", "type": "Income", "icon": "💸"},
    {"name": "Other", "type": "Expense", "icon": "📦"},
]

@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if default categories exist
    count = db.query(Category).count()
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            db.add(Category(name=cat["name"], type=cat["type"], icon=cat["icon"], user_id=None))
        db.commit()

    categories = db.query(Category).filter(
        or_(Category.user_id == current_user.id, Category.user_id == None)
    ).all()
    return categories

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_category = Category(
        name=category.name,
        type=category.type,
        icon=category.icon,
        user_id=current_user.id
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or you don't have permission to delete it")
    
    db.delete(category)
    db.commit()
    return None

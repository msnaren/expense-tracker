import os
import json
import base64
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.database import get_db
from backend.models.domain import User, Account
from backend.schemas.schemas import UserCreate, UserResponse, Token, GoogleAuthRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyCodeRequest
from backend.auth.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
import random

VERIFICATION_CODES = {}
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize a default account
    default_acc = Account(
        name="Main Account",
        type="Bank Account",
        balance=0.0,
        user_id=new_user.id
    )
    db.add(default_acc)
    db.commit()

    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=Token)
def google_auth(auth_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not google_client_id or not google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth configuration is missing on the server.")

    # 1. Exchange auth code for access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": auth_data.code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": auth_data.redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        import httpx
        with httpx.Client() as client:
            token_response = client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
            
            # 2. Get user info
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            userinfo_response = client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()
            
            email = userinfo.get("email")
            name = userinfo.get("name")
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to authenticate with Google: {str(e)}"
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is required."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        display_name = name or email.split("@")[0]
        # Generate a secure random password hash for OAuth users
        user = User(
            name=display_name,
            email=email,
            password_hash=get_password_hash(f"oauth_{os.urandom(16).hex()}")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        default_acc = Account(
            name="Main Account",
            type="Bank Account",
            balance=0.0,
            user_id=user.id
        )
        db.add(default_acc)
        db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/registered-emails")
def get_registered_emails(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in users]

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    
    # Generate 6-digit verification code
    code = str(random.randint(100000, 999999))
    VERIFICATION_CODES[user.email] = code

    return {
        "status": "success",
        "message": f"6-Digit Verification code sent to {req.email}",
        "email": req.email,
        "code": code
    }

@router.post("/verify-code")
def verify_code(req: VerifyCodeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    
    stored_code = VERIFICATION_CODES.get(req.email)
    if not stored_code or stored_code != req.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email and try again."
        )

    return {
        "status": "success",
        "message": "Verification code verified successfully."
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    
    if req.code:
        stored_code = VERIFICATION_CODES.get(req.email)
        if not stored_code or stored_code != req.code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code."
            )

    if len(req.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters long."
        )

    user.password_hash = get_password_hash(req.new_password)
    db.commit()

    # Clear code
    if req.email in VERIFICATION_CODES:
        del VERIFICATION_CODES[req.email]

    return {
        "status": "success",
        "message": "Password successfully updated. You can now log in with your new password."
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

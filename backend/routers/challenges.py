from datetime import date, datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.domain import SavingsChallenge, SavingsCheckIn, SavingsGoal, Budget, User
from backend.schemas.schemas import (
    ChallengeCreate,
    ChallengeUpdate,
    ChallengeProgressAdd,
    ChallengeResponse,
    CheckInCreate,
    CheckInResponse,
    BadgeResponse,
    GamificationStatsResponse
)
from backend.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/challenges",
    tags=["Savings Challenges & Gamification"]
)

def enrich_challenge(challenge: SavingsChallenge) -> ChallengeResponse:
    today = date.today()
    days_rem = (challenge.end_date - today).days
    if days_rem < 0:
        days_rem = 0
    
    pct = 0.0
    if challenge.target_amount > 0:
        pct = round(min(100.0, (challenge.current_amount / challenge.target_amount) * 100), 1)
    
    rem_amt = round(max(0.0, challenge.target_amount - challenge.current_amount), 2)

    return ChallengeResponse(
        id=challenge.id,
        user_id=challenge.user_id,
        title=challenge.title,
        description=challenge.description,
        category=challenge.category,
        target_amount=challenge.target_amount,
        current_amount=challenge.current_amount,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        status=challenge.status,
        challenge_type=challenge.challenge_type,
        icon=challenge.icon,
        created_at=challenge.created_at,
        days_remaining=days_rem,
        progress_percentage=pct,
        remaining_amount=rem_amt
    )

@router.get("", response_model=List[ChallengeResponse])
def get_challenges(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SavingsChallenge).filter(SavingsChallenge.user_id == current_user.id)
    if status_filter:
        query = query.filter(SavingsChallenge.status == status_filter)
    
    challenges = query.order_by(SavingsChallenge.created_at.desc()).all()
    return [enrich_challenge(c) for c in challenges]

@router.post("", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
def create_challenge(
    challenge: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_challenge = SavingsChallenge(
        user_id=current_user.id,
        title=challenge.title,
        description=challenge.description,
        category=challenge.category,
        target_amount=challenge.target_amount,
        current_amount=challenge.current_amount or 0.0,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        challenge_type=challenge.challenge_type,
        icon=challenge.icon or "🏆",
        status="active"
    )
    db.add(new_challenge)
    db.commit()
    db.refresh(new_challenge)
    return enrich_challenge(new_challenge)

@router.get("/{challenge_id}", response_model=ChallengeResponse)
def get_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(SavingsChallenge).filter(
        SavingsChallenge.id == challenge_id,
        SavingsChallenge.user_id == current_user.id
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return enrich_challenge(challenge)

@router.put("/{challenge_id}", response_model=ChallengeResponse)
def update_challenge(
    challenge_id: int,
    update_data: ChallengeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(SavingsChallenge).filter(
        SavingsChallenge.id == challenge_id,
        SavingsChallenge.user_id == current_user.id
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if update_data.title is not None:
        challenge.title = update_data.title
    if update_data.description is not None:
        challenge.description = update_data.description
    if update_data.target_amount is not None:
        challenge.target_amount = update_data.target_amount
    if update_data.status is not None:
        challenge.status = update_data.status
    if update_data.icon is not None:
        challenge.icon = update_data.icon

    db.commit()
    db.refresh(challenge)
    return enrich_challenge(challenge)

@router.post("/{challenge_id}/progress", response_model=ChallengeResponse)
def add_challenge_progress(
    challenge_id: int,
    progress_data: ChallengeProgressAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(SavingsChallenge).filter(
        SavingsChallenge.id == challenge_id,
        SavingsChallenge.user_id == current_user.id
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Update amount
    challenge.current_amount += progress_data.amount
    if challenge.current_amount >= challenge.target_amount:
        challenge.status = "completed"
    
    # Record check-in activity
    checkin = SavingsCheckIn(
        user_id=current_user.id,
        challenge_id=challenge.id,
        checkin_date=date.today(),
        amount=progress_data.amount,
        notes=progress_data.notes or f"Saved ₹{progress_data.amount} for '{challenge.title}'"
    )
    db.add(checkin)
    db.commit()
    db.refresh(challenge)
    return enrich_challenge(challenge)

@router.post("/checkin", response_model=CheckInResponse)
def daily_checkin(
    checkin_data: CheckInCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    checkin = SavingsCheckIn(
        user_id=current_user.id,
        challenge_id=checkin_data.challenge_id,
        checkin_date=today,
        amount=checkin_data.amount or 0.0,
        notes=checkin_data.notes or "Daily saving habit check-in"
    )
    db.add(checkin)

    if checkin_data.challenge_id and checkin_data.amount and checkin_data.amount > 0:
        ch = db.query(SavingsChallenge).filter(
            SavingsChallenge.id == checkin_data.challenge_id,
            SavingsChallenge.user_id == current_user.id
        ).first()
        if ch:
            ch.current_amount += checkin_data.amount
            if ch.current_amount >= ch.target_amount:
                ch.status = "completed"

    db.commit()
    db.refresh(checkin)
    return checkin

@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challenge = db.query(SavingsChallenge).filter(
        SavingsChallenge.id == challenge_id,
        SavingsChallenge.user_id == current_user.id
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    db.delete(challenge)
    db.commit()
    return None

@router.get("/gamification/stats", response_model=GamificationStatsResponse)
def get_gamification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Total saved across challenges and check-ins
    total_saved_challenges = db.query(func.coalesce(func.sum(SavingsChallenge.current_amount), 0.0)).filter(
        SavingsChallenge.user_id == current_user.id
    ).scalar() or 0.0

    # 2. Challenge counts
    active_count = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.status == "active"
    ).count()

    completed_count = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.status == "completed"
    ).count()

    total_challenges_count = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id
    ).count()

    # Also count savings goals
    goals_count = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).count()

    # 3. Calculate streak from checkins
    checkin_dates = db.query(SavingsCheckIn.checkin_date).filter(
        SavingsCheckIn.user_id == current_user.id
    ).distinct().order_by(SavingsCheckIn.checkin_date.desc()).all()
    
    dates_set = {row[0] for row in checkin_dates}
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Streak logic: count consecutive past days
    current_streak = 0
    check_day = today if today in dates_set else (yesterday if yesterday in dates_set else None)
    
    if check_day:
        while check_day in dates_set:
            current_streak += 1
            check_day = check_day - timedelta(days=1)
            
    # Calculate longest streak across all history
    sorted_dates = sorted(list(dates_set))
    longest_streak = 0
    temp_streak = 0
    prev_d = None
    for d in sorted_dates:
        if prev_d is None:
            temp_streak = 1
        elif d == prev_d + timedelta(days=1):
            temp_streak += 1
        elif d != prev_d:
            temp_streak = 1
        prev_d = d
        if temp_streak > longest_streak:
            longest_streak = temp_streak
    
    longest_streak = max(longest_streak, current_streak)

    # 4. Badges calculation
    # Badge 1: 🏆 First Savings Goal
    has_first_goal = (total_challenges_count + goals_count) > 0
    badge_first_goal = BadgeResponse(
        id="first_goal",
        name="First Savings Goal",
        icon="🏆",
        description="Created your first savings challenge or financial target.",
        unlocked=has_first_goal,
        progress=100.0 if has_first_goal else 0.0
    )

    # Badge 2: 💰 Saved ₹1,000
    saved_1k_progress = min(100.0, round((total_saved_challenges / 1000.0) * 100, 1))
    badge_saved_1000 = BadgeResponse(
        id="saved_1000",
        name="Saved ₹1,000",
        icon="💰",
        description="Accumulated over ₹1,000 in savings challenges.",
        unlocked=total_saved_challenges >= 1000.0,
        progress=saved_1k_progress
    )

    # Badge 3: 🔥 7-Day Saving Streak
    streak_progress = min(100.0, round((max(current_streak, longest_streak) / 7.0) * 100, 1))
    badge_streak_7 = BadgeResponse(
        id="streak_7",
        name="7-Day Saving Streak",
        icon="🔥",
        description="Maintained a 7-day daily savings check-in streak.",
        unlocked=max(current_streak, longest_streak) >= 7,
        progress=streak_progress
    )

    # Badge 4: 🎯 Budget Master
    # Checked if user has set budgets or completed cutback challenges
    budgets_count = db.query(Budget).filter(Budget.user_id == current_user.id).count()
    cutback_completed = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.challenge_type.in_(["cutback", "no_spend"]),
        SavingsChallenge.status == "completed"
    ).count()
    budget_master_unlocked = (budgets_count >= 2) or (cutback_completed >= 1) or (completed_count >= 1)
    badge_budget_master = BadgeResponse(
        id="budget_master",
        name="Budget Master",
        icon="🎯",
        description="Mastered your cash flow by completing spending challenges or budgeting categories.",
        unlocked=budget_master_unlocked,
        progress=100.0 if budget_master_unlocked else (50.0 if (budgets_count > 0 or total_challenges_count > 0) else 0.0)
    )

    # Badge 5: 📈 Monthly Saver
    monthly_completed = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.category.ilike("%Monthly%"),
        SavingsChallenge.status == "completed"
    ).count()
    monthly_active = db.query(SavingsChallenge).filter(
        SavingsChallenge.user_id == current_user.id,
        SavingsChallenge.category.ilike("%Monthly%"),
        SavingsChallenge.status == "active"
    ).first()
    
    monthly_progress = 100.0 if (monthly_completed > 0 or completed_count >= 1) else (
        min(100.0, round((monthly_active.current_amount / monthly_active.target_amount) * 100, 1)) if (monthly_active and monthly_active.target_amount > 0) else 0.0
    )

    badge_monthly_saver = BadgeResponse(
        id="monthly_saver",
        name="Monthly Saver",
        icon="📈",
        description="Completed a full monthly savings milestone challenge.",
        unlocked=(monthly_completed > 0 or completed_count >= 1),
        progress=monthly_progress
    )

    badges = [
        badge_first_goal,
        badge_saved_1000,
        badge_streak_7,
        badge_budget_master,
        badge_monthly_saver
    ]

    return GamificationStatsResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_saved=round(total_saved_challenges, 2),
        active_challenges_count=active_count,
        completed_challenges_count=completed_count,
        badges=badges
    )

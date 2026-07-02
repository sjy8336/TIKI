from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.enums import PlanId
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import BillingCycle, SubscribeRequest, SubscriptionResponse

router = APIRouter(prefix="/subscription", tags=["subscription"])

PLAN_CATALOG = {
    PlanId.FREE: {
        "name": "무료",
        "monthly": 0,
        "yearly": 0,
    },
    PlanId.PRO: {
        "name": "프로",
        "monthly": 19900,
        "yearly": 15900 * 12,
    },
    PlanId.TEAM: {
        "name": "팀",
        "monthly": 49900,
        "yearly": 39900 * 12,
    },
}


def _next_billing_at(updated_at: datetime, plan_id: PlanId, billing: BillingCycle) -> datetime | None:
    if plan_id == PlanId.FREE:
        return None
    return updated_at + timedelta(days=365 if billing == BillingCycle.YEARLY else 30)


def _subscription_response(plan_id: str, billing: str, updated_at: datetime) -> SubscriptionResponse:
    normalized_plan = PlanId(plan_id)
    normalized_billing = BillingCycle(billing)
    plan = PLAN_CATALOG[normalized_plan]
    amount = plan[normalized_billing.value]
    next_billing_at = _next_billing_at(updated_at, normalized_plan, normalized_billing)
    return SubscriptionResponse(
        plan_id=normalized_plan.value,
        billing=normalized_billing.value,
        status="active",
        plan_name=plan["name"],
        amount=amount,
        is_paid=amount > 0,
        current_period_started_at=updated_at,
        current_period_ends_at=next_billing_at,
        next_billing_at=next_billing_at,
        updated_at=updated_at,
    )


@router.get("/plans")
def list_subscription_plans() -> dict[str, object]:
    return {
        "currency": "KRW",
        "plans": [
            {
                "id": plan_id.value,
                "name": plan["name"],
                "price": {
                    "monthly": plan["monthly"],
                    "yearly": plan["yearly"],
                },
            }
            for plan_id, plan in PLAN_CATALOG.items()
        ],
    }


@router.get("/me", response_model=SubscriptionResponse)
def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    sub = db.scalar(select(Subscription).where(Subscription.user_id == current_user.id))
    if sub is None:
        return _subscription_response("free", "monthly", current_user.created_at)
    return _subscription_response(sub.plan_id, sub.billing, sub.updated_at)


@router.post("/subscribe", response_model=SubscriptionResponse)
def subscribe(
    payload: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    sub = db.scalar(select(Subscription).where(Subscription.user_id == current_user.id))
    if sub is None:
        sub = Subscription(
            user_id=current_user.id,
            plan_id=payload.plan_id.value,
            billing=payload.billing.value,
        )
        db.add(sub)
    else:
        sub.plan_id = payload.plan_id.value
        sub.billing = payload.billing.value
    db.commit()
    db.refresh(sub)
    return _subscription_response(sub.plan_id, sub.billing, sub.updated_at)

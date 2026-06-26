from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.models.enums import PlanId


class BillingCycle(StrEnum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscribeRequest(BaseModel):
    plan_id: PlanId
    billing: BillingCycle = BillingCycle.MONTHLY


class SubscriptionResponse(BaseModel):
    plan_id: str
    billing: str
    status: str = "active"
    plan_name: str = "무료"
    amount: int = 0
    currency: str = "KRW"
    is_paid: bool = False
    next_billing_at: datetime | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}

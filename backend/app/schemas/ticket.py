from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import IntegrationProvider, SyncStatus, TicketPriority, TicketStatus


class ExternalSyncResponse(BaseModel):
    id: UUID
    provider: IntegrationProvider
    status: SyncStatus
    external_id: str | None
    external_url: str | None
    error_message: str | None
    synced_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketResponse(BaseModel):
    id: UUID
    analysis_result_id: UUID
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    assignee: str | None
    due_at: datetime | None
    external_syncs: list[ExternalSyncResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assignee: str | None = None
    due_at: datetime | None = None


class ProjectTicketItem(BaseModel):
    id: UUID
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    assignee: str | None
    due_at: datetime | None
    file_id: UUID
    file_name: str
    external_syncs: list[ExternalSyncResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

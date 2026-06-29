from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.core.exceptions import AppException
from app.db.database import get_db
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketResponse, TicketUpdate
from app.services.ticket_access import assert_ticket_access

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketResponse:
    ticket = db.scalar(
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .options(selectinload(Ticket.external_syncs))
    )
    if ticket is None:
        raise AppException(detail="Ticket not found", status_code=404, code="not_found")
    assert_ticket_access(db, ticket, current_user.id)
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketResponse:
    ticket = db.scalar(
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .options(selectinload(Ticket.external_syncs))
    )
    if ticket is None:
        raise AppException(detail="Ticket not found", status_code=404, code="not_found")
    assert_ticket_access(db, ticket, current_user.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise AppException(detail="Ticket not found", status_code=404, code="not_found")
    assert_ticket_access(db, ticket, current_user.id)
    db.delete(ticket)
    db.commit()

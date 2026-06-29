from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.analysis import AnalysisResult
from app.models.enums import ProcessingStatus
from app.models.file import ExtractedContent, UploadedFile
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.project import (
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
    MemberInvite,
    MemberResponse,
    ProjectCreate,
    ProjectListItem,
    ProjectResponse,
    ProjectStats,
    ProjectUpdate,
    UploadStatusBreakdown,
)
from app.schemas.ticket import ExternalSyncResponse, ProjectTicketItem
from app.schemas.upload import UploadedFileResponse
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


def _to_project_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        category=project.category,
        color=project.color,
        description=project.description,
        visibility=project.visibility,
        meeting_template=project.meeting_template,
        jira_domain=project.jira_domain,
        jira_email=project.jira_email,
        jira_token_configured=bool(project.jira_token),
        notion_database_id=project.notion_database_id,
        notion_token_configured=bool(project.notion_token),
        owner_id=project.owner_id,
        team_lead=project.owner.name if project.owner else "알 수 없음",
        member_count=len(project.members) + 1,
        members=[
            MemberResponse(
                id=m.id,
                email=m.email,
                name=m.name,
                role=m.role,
                created_at=m.created_at,
            )
            for m in project.members
        ],
        meetings=[MeetingResponse.model_validate(m) for m in project.meetings],
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _to_list_item(project: Project) -> ProjectListItem:
    return ProjectListItem(
        id=project.id,
        name=project.name,
        category=project.category,
        color=project.color,
        description=project.description,
        visibility=project.visibility,
        meeting_template=project.meeting_template,
        owner_id=project.owner_id,
        team_lead=project.owner.name if project.owner else "알 수 없음",
        member_count=len(project.members) + 1,
        meeting_count=len(project.meetings),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


# ── Project ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectListItem])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectListItem]:
    projects = project_service.list_projects(db, current_user.id)
    return [_to_list_item(p) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectResponse:
    project = project_service.create_project(db, payload, current_user.id)
    return _to_project_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectResponse:
    project = project_service.get_project(db, project_id, current_user.id)
    return _to_project_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectResponse:
    project = project_service.update_project(db, project_id, payload, current_user.id)
    return _to_project_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project_service.delete_project(db, project_id, current_user.id)


# ── Project Stats ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/stats", response_model=ProjectStats)
def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectStats:
    project = project_service.get_project(db, project_id, current_user.id)

    upload_rows = db.execute(
        select(UploadedFile.status, func.count().label("cnt"))
        .where(UploadedFile.project_id == project_id)
        .group_by(UploadedFile.status)
    ).all()

    status_map: dict[str, int] = {s.value: 0 for s in ProcessingStatus}
    for row in upload_rows:
        status_map[row.status] = row.cnt

    total_tickets = db.scalar(
        select(func.count(Ticket.id))
        .join(AnalysisResult, AnalysisResult.id == Ticket.analysis_result_id)
        .join(ExtractedContent, ExtractedContent.id == AnalysisResult.extracted_content_id)
        .join(UploadedFile, UploadedFile.id == ExtractedContent.uploaded_file_id)
        .where(UploadedFile.project_id == project_id)
    ) or 0

    return ProjectStats(
        total_uploads=sum(status_map.values()),
        uploads_by_status=UploadStatusBreakdown(**status_map),
        total_meetings=len(project.meetings),
        total_tickets=total_tickets,
        member_count=len(project.members) + 1,
    )


# ── Project Uploads ───────────────────────────────────────────────────────────

@router.get("/{project_id}/uploads", response_model=list[UploadedFileResponse])
def list_project_uploads(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UploadedFileResponse]:
    project_service.get_project(db, project_id, current_user.id)
    files = db.scalars(
        select(UploadedFile)
        .where(UploadedFile.project_id == project_id)
        .order_by(UploadedFile.created_at.desc())
    ).all()
    return [UploadedFileResponse.model_validate(f) for f in files]


# ── Meeting ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/meetings", response_model=list[MeetingResponse])
def list_meetings(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MeetingResponse]:
    meetings = project_service.list_meetings(db, project_id, current_user.id)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.post(
    "/{project_id}/meetings",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_meeting(
    project_id: UUID,
    payload: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = project_service.create_meeting(db, project_id, payload, current_user.id)
    return MeetingResponse.model_validate(meeting)


@router.get("/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = project_service.get_meeting(db, project_id, meeting_id, current_user.id)
    return MeetingResponse.model_validate(meeting)


@router.patch("/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    project_id: UUID,
    meeting_id: UUID,
    payload: MeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = project_service.update_meeting(db, project_id, meeting_id, payload, current_user.id)
    return MeetingResponse.model_validate(meeting)


@router.delete("/{project_id}/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project_service.delete_meeting(db, project_id, meeting_id, current_user.id)


# ── Project Tickets ───────────────────────────────────────────────────────────

def _to_project_ticket_item(ticket) -> ProjectTicketItem:
    uploaded_file = ticket.analysis_result.extracted_content.uploaded_file
    return ProjectTicketItem(
        id=ticket.id,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        assignee=ticket.assignee,
        due_at=ticket.due_at,
        file_id=uploaded_file.id,
        file_name=uploaded_file.original_filename,
        external_syncs=[ExternalSyncResponse.model_validate(s) for s in ticket.external_syncs],
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.get("/{project_id}/tickets", response_model=list[ProjectTicketItem])
def list_project_tickets(
    project_id: UUID,
    status: str | None = None,
    assignee: str | None = None,
    file_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectTicketItem]:
    tickets = project_service.list_project_tickets(
        db, project_id, current_user.id,
        status=status,
        assignee=assignee,
        file_id=file_id,
    )
    return [_to_project_ticket_item(t) for t in tickets]


# ── Project Members ───────────────────────────────────────────────────────────

@router.post(
    "/{project_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    project_id: UUID,
    payload: MemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MemberResponse:
    member = project_service.invite_member(db, project_id, payload, current_user.id)
    return MemberResponse.model_validate(member)


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project_service.remove_member(db, project_id, member_id, current_user.id)

from datetime import UTC, datetime
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import decode_access_token_payload
from app.db.database import get_db
from app.models.user import User
from app.models.user_session import UserSession

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppException(detail="Not authenticated", status_code=401, code="not_authenticated")

    payload = decode_access_token_payload(credentials.credentials)
    if payload is None:
        raise AppException(detail="Invalid or expired token", status_code=401, code="invalid_token")

    user_id = UUID(str(payload["sub"]))
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppException(detail="User not found", status_code=401, code="invalid_token")

    token_id = payload.get("jti")
    if token_id:
        session = db.scalar(
            select(UserSession).where(
                UserSession.user_id == user.id,
                UserSession.token_id == str(token_id),
            )
        )
        if session is None or not session.is_active:
            raise AppException(detail="Session has expired", status_code=401, code="session_expired")
        session.last_seen_at = datetime.now(UTC)
        client_host = request.client.host if request.client else None
        if client_host:
            session.ip_address = client_host
        db.commit()

    return user

from uuid import UUID
from datetime import UTC, datetime

from pydantic import BaseModel

from app.models.enums import ProcessingStatus


class UploadProcessingState(BaseModel):
    status: str
    phase: str
    progress_pct: int
    status_message: str
    can_retry: bool = False


class UploadedFileResponse(BaseModel):
    id: UUID
    project_id: UUID | None
    project_key: str
    project_name: str
    original_filename: str
    file_size_bytes: int
    file_extension: str
    file_kind: str
    status: str
    processing_state: UploadProcessingState

    @classmethod
    def from_uploaded_file(cls, uploaded_file) -> "UploadedFileResponse":
        status = ProcessingStatus(uploaded_file.status)
        started_at = getattr(uploaded_file, "started_at", None)
        now = datetime.now(UTC)

        if status == ProcessingStatus.PENDING:
            state = UploadProcessingState(
                status=status.value,
                phase="queued",
                progress_pct=10,
                status_message="업로드는 끝났고 분석 대기 중입니다.",
                can_retry=False,
            )
        elif status == ProcessingStatus.PROCESSING:
            if started_at is None:
                progress_pct = 65
                status_message = "AI 분석을 진행 중입니다."
            else:
                elapsed_seconds = max(0.0, (now - started_at).total_seconds())

                if elapsed_seconds < 20:
                    progress_pct = 22
                    status_message = "전사 준비 중입니다."
                elif elapsed_seconds < 120:
                    progress_pct = 48
                    status_message = "전사와 화자분리를 진행 중입니다."
                elif elapsed_seconds < 240:
                    progress_pct = 72
                    status_message = "요약과 액션아이템을 정리 중입니다."
                else:
                    progress_pct = 88
                    status_message = "결과를 최종 정리 중입니다."

            state = UploadProcessingState(
                status=status.value,
                phase="processing",
                progress_pct=progress_pct,
                status_message=status_message,
                can_retry=False,
            )
        elif status == ProcessingStatus.COMPLETED:
            state = UploadProcessingState(
                status=status.value,
                phase="completed",
                progress_pct=100,
                status_message="분석이 완료되었습니다.",
                can_retry=False,
            )
        elif status == ProcessingStatus.FAILED:
            state = UploadProcessingState(
                status=status.value,
                phase="failed",
                progress_pct=100,
                status_message="분석에 실패했습니다. 재시도할 수 있습니다.",
                can_retry=True,
            )
        else:
            state = UploadProcessingState(
                status=str(uploaded_file.status),
                phase="unknown",
                progress_pct=0,
                status_message="상태를 확인할 수 없습니다.",
                can_retry=False,
            )
        return cls(
            id=uploaded_file.id,
            project_id=uploaded_file.project_id,
            project_key=uploaded_file.project_key,
            project_name=uploaded_file.project_name,
            original_filename=uploaded_file.original_filename,
            file_size_bytes=uploaded_file.file_size_bytes,
            file_extension=uploaded_file.file_extension,
            file_kind=str(uploaded_file.file_kind),
            status=str(uploaded_file.status),
            processing_state=state,
        )

    model_config = {"from_attributes": True}


class UploadBatchResponse(BaseModel):
    files: list[UploadedFileResponse]
    message: str = "upload accepted"

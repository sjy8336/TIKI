import re
from typing import Literal

from pydantic import Field, model_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # 메타데이터
    PROJECT_NAME: str = "TIKI-Meeting-AI"
    VERSION: str = "0.1.0"

    # 1. 환경 및 보안
    ENV_NAME: Literal["dev", "staging", "prod"] = "dev"

    # SecretStr: str() 시 "**********" 출력 → 로그 노출 방지
    # 실제 값이 필요할 땐 .get_secret_value() 또는 아래 프로퍼티 사용
    SECRET_KEY: SecretStr = Field(..., description="JWT 서명 등에 사용하는 비밀 키")
    OPENAI_API_KEY: SecretStr = Field(..., description="OpenAI API 키")

    # 2. AI 모델 설정
    AI_MODEL_NAME: Literal[
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
    ] = "gpt-4o"

    WHISPER_MODEL: Literal[
        "tiny", "base", "small", "medium", "large"
    ] = "base"

    # 3. LLM 요청 파라미터
    TEMPERATURE: float = Field(default=0.2, ge=0.0, le=2.0)
    MAX_TOKENS: int = Field(default=1500, ge=100, le=8192)
    TIMEOUT_SECONDS: int = Field(default=30, ge=5, le=120)

    # 4. 언어 및 프롬프트
    DEFAULT_LANGUAGE: Literal["ko", "en", "ja", "zh"] = "ko"

    SYSTEM_PROMPT: str = (
        "너는 IT 프로젝트 전문 비서야. "
        "회의록을 간결하게 요약하고, "
        "기술적인 Action Item과 담당자를 명확히 추출해줘. "
        "응답은 반드시 한국어로 작성해."
    )

    # 5. 파일 업로드 제한
    MAX_UPLOAD_SIZE_MB: int = Field(default=100, ge=1, le=500)
    ALLOWED_AUDIO_EXTENSIONS: list[str] = [
        "mp3", "mp4", "wav", "m4a", "webm", "ogg"
    ]

    # 6. CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # 7. 보안 — 마스킹
    ENABLE_MASKING: bool = True
    MASKING_PATTERN: str = r"\d{3}-\d{4}-\d{4}"  # 기본: 전화번호 패턴

    # 8. 로깅
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # 유효성 검사 (앱 시작 시 1회 실행)
    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        # 마스킹 패턴이 유효한 정규식인지 확인
        try:
            re.compile(self.MASKING_PATTERN)
        except re.error as exc:
            raise ValueError(
                f"MASKING_PATTERN 이 유효하지 않은 정규식입니다: {exc}"
            ) from exc

        # prod 환경 전용 제약
        if self.ENV_NAME == "prod":
            if self.LOG_LEVEL == "DEBUG":
                raise ValueError("prod 환경에서 LOG_LEVEL=DEBUG 는 허용되지 않습니다.")

            for origin in self.ALLOWED_ORIGINS:
                if "localhost" in origin or "127.0.0.1" in origin:
                    raise ValueError(
                        f"prod 환경에서 localhost origin 은 허용되지 않습니다: {origin}"
                    )

        return self

    # 편의 프로퍼티
    @property
    def is_production(self) -> bool:
        return self.ENV_NAME == "prod"

    @property
    def is_development(self) -> bool:
        return self.ENV_NAME == "dev"

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # SecretStr 언래핑 프로퍼티
    # OpenAI 클라이언트 등 str이 필요한 곳에서 사용
    # 예: openai.AsyncOpenAI(api_key=settings.openai_api_key)
    @property
    def openai_api_key(self) -> str:
        return self.OPENAI_API_KEY.get_secret_value()

    @property
    def secret_key(self) -> str:
        return self.SECRET_KEY.get_secret_value()

settings = Settings()
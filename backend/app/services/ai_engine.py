"""Compatibility facade for the AI processing pipeline.

This module keeps a simple public surface for older imports while delegating
actual work to the split services under app.services.ai and app.services.pipeline.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.ai.llm_analysis import HeuristicLLMAnalysisService, LLMAnalysisService
from app.services.ai.stt import SpeechToTextService, WhisperSpeechToTextService
from app.services.pipeline.security_masking import mask_personal_information

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AIAnalysisPayload:
    summary: str
    action_items: list[dict[str, Any]]
    model_name: str | None = None
    prompt_version: str | None = None
    extra_data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "summary": self.summary,
            "action_items": self.action_items,
            "model_name": self.model_name,
            "prompt_version": self.prompt_version,
            "extra_data": self.extra_data,
        }


@dataclass(slots=True)
class AIProcessingResult:
    transcript: str
    masked_transcript: str
    analysis: AIAnalysisPayload

    def to_dict(self) -> dict[str, Any]:
        return {
            "transcript": self.transcript,
            "masked_transcript": self.masked_transcript,
            "analysis": self.analysis.to_dict(),
        }


class AIEngine:
    """Thin orchestration layer for STT, masking, and meeting analysis."""

    def __init__(
        self,
        stt_service: SpeechToTextService | None = None,
        llm_service: LLMAnalysisService | None = None,
    ) -> None:
        self.stt_service = stt_service or WhisperSpeechToTextService()
        self.llm_service = llm_service or HeuristicLLMAnalysisService()

    def transcribe_audio(self, file_path: str) -> str:
        return self.stt_service.transcribe(file_path)

    def summarize_meeting(self, text: str) -> str:
        analysis = self.llm_service.summarize_and_extract_tickets(mask_personal_information(text))
        return str(analysis.get("summary", ""))

    def extract_tickets(self, summary: str) -> list[dict[str, Any]]:
        analysis = self.llm_service.summarize_and_extract_tickets(mask_personal_information(summary))
        return list(analysis.get("action_items", []))

    def process_text(self, text: str) -> AIProcessingResult:
        masked_text = mask_personal_information(text)
        analysis_data = self.llm_service.summarize_and_extract_tickets(masked_text)
        analysis = AIAnalysisPayload(
            summary=str(analysis_data.get("summary", "")),
            action_items=list(analysis_data.get("action_items", [])),
            model_name=analysis_data.get("model_name"),
            prompt_version=analysis_data.get("prompt_version"),
            extra_data=dict(analysis_data.get("extra_data", {})),
        )
        return AIProcessingResult(
            transcript=text,
            masked_transcript=masked_text,
            analysis=analysis,
        )

    def process_audio(self, file_path: str) -> AIProcessingResult:
        transcript = self.transcribe_audio(file_path)
        return self.process_text(transcript)


_DEFAULT_AI_ENGINE: AIEngine | None = None


def get_default_ai_engine() -> AIEngine:
    global _DEFAULT_AI_ENGINE
    if _DEFAULT_AI_ENGINE is None:
        _DEFAULT_AI_ENGINE = AIEngine()
    return _DEFAULT_AI_ENGINE


def transcribe_audio(file_path: str) -> str:
    return get_default_ai_engine().transcribe_audio(file_path)


def summarize_meeting(text: str) -> str:
    return get_default_ai_engine().summarize_meeting(text)


def extract_tickets(summary: str) -> list[dict[str, Any]]:
    return get_default_ai_engine().extract_tickets(summary)


def process_audio(file_path: str) -> dict[str, Any]:
    """Convenience wrapper for callers that prefer dict payloads."""
    result = get_default_ai_engine().process_audio(file_path)
    logger.info("AI pipeline completed for %s", file_path)
    return result.to_dict()


def process_text(text: str) -> dict[str, Any]:
    """Convenience wrapper for text-only inputs."""
    result = get_default_ai_engine().process_text(text)
    logger.info("AI text pipeline completed")
    return result.to_dict()

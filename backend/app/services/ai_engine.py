"""Compatibility facade for the AI processing pipeline.

This module keeps a simple public surface for older imports while delegating
actual work to the split services under app.services.ai and app.services.pipeline.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.services.ai.llm_analysis import LLMAnalysisService, build_llm_analysis_service
from app.services.ai.stt import SpeechToTextService, WhisperSpeechToTextService
from app.services.pipeline.security_masking import mask_personal_information

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AIAnalysisPayload:
    summary: str
    action_items: list[dict[str, Any]]
    keywords: list[dict[str, Any]] = field(default_factory=list)
    decisions: list[str] = field(default_factory=list)
    actions: list[dict[str, Any]] = field(default_factory=list)
    issues: list[dict[str, Any]] = field(default_factory=list)
    next_agenda: list[str] = field(default_factory=list)
    model_name: str | None = None
    prompt_version: str | None = None
    extra_data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        actions = self.actions or [self._action_item_to_action(item) for item in self.action_items]
        return {
            "summary": self.summary,
            "keywords": self.keywords,
            "decisions": self.decisions,
            "action_items": self.action_items,
            "actions": actions,
            "issues": self.issues,
            "next_agenda": self.next_agenda,
            "model_name": self.model_name,
            "prompt_version": self.prompt_version,
            "extra_data": self.extra_data,
        }

    @staticmethod
    def _action_item_to_action(item: dict[str, Any]) -> dict[str, Any]:
        return {
            "text": str(item.get("title", "")).strip() or str(item.get("description", "")).strip(),
            "assignee": item.get("assignee"),
            "due": item.get("due_at"),
            "status": item.get("status"),
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


@dataclass(slots=True)
class AIFileProcessingResult:
    index: int
    file_path: str
    segment_label: str
    transcript: str
    masked_transcript: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "file_path": self.file_path,
            "file_name": Path(self.file_path).name,
            "segment_label": self.segment_label,
            "transcript": self.transcript,
            "masked_transcript": self.masked_transcript,
        }


@dataclass(slots=True)
class AIProcessingBatchResult:
    file_count: int
    files: list[AIFileProcessingResult]
    transcript: str
    masked_transcript: str
    analysis: AIAnalysisPayload

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_count": self.file_count,
            "files": [file_result.to_dict() for file_result in self.files],
            "transcript": self.transcript,
            "masked_transcript": self.masked_transcript,
            "analysis": self.analysis.to_dict(),
        }


def _build_analysis_payload(analysis_data: dict[str, Any]) -> AIAnalysisPayload:
    action_items = list(analysis_data.get("action_items", []))
    actions = list(analysis_data.get("actions", [])) or [AIAnalysisPayload._action_item_to_action(item) for item in action_items]
    return AIAnalysisPayload(
        summary=str(analysis_data.get("summary", "")),
        action_items=action_items,
        keywords=list(analysis_data.get("keywords", [])),
        decisions=list(analysis_data.get("decisions", [])),
        actions=actions,
        issues=list(analysis_data.get("issues", [])),
        next_agenda=list(analysis_data.get("next_agenda", [])),
        model_name=analysis_data.get("model_name"),
        prompt_version=analysis_data.get("prompt_version"),
        extra_data=dict(analysis_data.get("extra_data", {})),
    )


class AIEngine:
    """Thin orchestration layer for STT, masking, and meeting analysis."""

    def __init__(
        self,
        stt_service: SpeechToTextService | None = None,
        llm_service: LLMAnalysisService | None = None,
    ) -> None:
        self.stt_service = stt_service or WhisperSpeechToTextService()
        self.llm_service = llm_service or build_llm_analysis_service()

    def transcribe_audio(self, file_path: str) -> str:
        return self.stt_service.transcribe(file_path)

    def prepare_audio(self, file_path: str) -> dict[str, Any]:
        """Expose chunking metadata for inspection and future diarization work."""
        preprocessing = self.stt_service.prepare_audio(file_path)
        return preprocessing.to_dict()

    def summarize_meeting(self, text: str) -> str:
        analysis = self.llm_service.summarize_and_extract_tickets(mask_personal_information(text))
        return str(analysis.get("summary", ""))

    def extract_tickets(self, summary: str) -> list[dict[str, Any]]:
        analysis = self.llm_service.summarize_and_extract_tickets(mask_personal_information(summary))
        return list(analysis.get("action_items", []))

    def process_text(self, text: str) -> AIProcessingResult:
        masked_text = mask_personal_information(text)
        analysis_data = self.llm_service.summarize_and_extract_tickets(masked_text)
        analysis = _build_analysis_payload(analysis_data)
        return AIProcessingResult(
            transcript=text,
            masked_transcript=masked_text,
            analysis=analysis,
        )

    def process_audio(self, file_path: str) -> AIProcessingResult:
        transcript = self.transcribe_audio(file_path)
        return self.process_text(transcript)

    def process_audio_batch(self, file_paths: list[str]) -> AIProcessingBatchResult:
        if not file_paths:
            raise ValueError("At least one audio file path is required.")

        file_results: list[AIFileProcessingResult] = []
        transcript_segments: list[str] = []
        masked_segments: list[str] = []

        for index, file_path in enumerate(file_paths):
            transcript = self.transcribe_audio(file_path)
            masked_transcript = mask_personal_information(transcript)
            segment_label = f"[SEGMENT {index + 1}]"

            file_results.append(
                AIFileProcessingResult(
                    index=index,
                    file_path=file_path,
                    segment_label=segment_label,
                    transcript=transcript,
                    masked_transcript=masked_transcript,
                )
            )

            if transcript.strip():
                transcript_segments.append(f"{segment_label}\n{transcript.strip()}")
            if masked_transcript.strip():
                masked_segments.append(f"{segment_label}\n{masked_transcript.strip()}")

        combined_transcript = "\n\n".join(transcript_segments)
        combined_masked_transcript = "\n\n".join(masked_segments)
        analysis_data = self.llm_service.summarize_and_extract_tickets(combined_masked_transcript)
        analysis = _build_analysis_payload(analysis_data)
        return AIProcessingBatchResult(
            file_count=len(file_paths),
            files=file_results,
            transcript=combined_transcript,
            masked_transcript=combined_masked_transcript,
            analysis=analysis,
        )


_DEFAULT_AI_ENGINE: AIEngine | None = None


def get_default_ai_engine() -> AIEngine:
    global _DEFAULT_AI_ENGINE
    if _DEFAULT_AI_ENGINE is None:
        _DEFAULT_AI_ENGINE = AIEngine()
    return _DEFAULT_AI_ENGINE


def transcribe_audio(file_path: str) -> str:
    return get_default_ai_engine().transcribe_audio(file_path)


def prepare_audio(file_path: str) -> dict[str, Any]:
    return get_default_ai_engine().prepare_audio(file_path)


def summarize_meeting(text: str) -> str:
    return get_default_ai_engine().summarize_meeting(text)


def extract_tickets(summary: str) -> list[dict[str, Any]]:
    return get_default_ai_engine().extract_tickets(summary)


def process_audio(file_path: str) -> dict[str, Any]:
    """Convenience wrapper for callers that prefer dict payloads."""
    result = get_default_ai_engine().process_audio(file_path)
    logger.info("AI pipeline completed for %s", file_path)
    return result.to_dict()


def process_audio_batch(file_paths: list[str]) -> dict[str, Any]:
    """Convenience wrapper for ordered multi-file audio inputs."""
    result = get_default_ai_engine().process_audio_batch(file_paths)
    logger.info("AI batch pipeline completed for %s files", len(file_paths))
    return result.to_dict()


def process_text(text: str) -> dict[str, Any]:
    """Convenience wrapper for text-only inputs."""
    result = get_default_ai_engine().process_text(text)
    logger.info("AI text pipeline completed")
    return result.to_dict()

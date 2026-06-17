"""Local Whisper STT service boundary and implementation."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)


class SpeechToTextService(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str) -> str:
        raise NotImplementedError


class WhisperSpeechToTextService(SpeechToTextService):
    """Lazy-loading Whisper wrapper.

    The model is loaded on first use so app startup stays lightweight.
    """

    def __init__(self, model_name: str = "base", language: str | None = None) -> None:
        self.model_name = model_name
        self.language = language

    @staticmethod
    @lru_cache(maxsize=4)
    def _load_model(model_name: str):
        try:
            import whisper
        except ImportError as exc:  # pragma: no cover - dependency should exist in backend env
            raise RuntimeError(
                "openai-whisper is not installed. Add it to backend requirements before using STT."
            ) from exc

        logger.info("Loading Whisper model: %s", model_name)
        return whisper.load_model(model_name)

    def transcribe(self, audio_path: str) -> str:
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info("Starting STT for %s using Whisper(%s)", path, self.model_name)
        model = self._load_model(self.model_name)

        options: dict[str, object] = {}
        if self.language:
            options["language"] = self.language

        result = model.transcribe(str(path), **options)
        text = (result.get("text") or "").strip()

        logger.info("STT completed for %s (chars=%s)", path.name, len(text))
        return text

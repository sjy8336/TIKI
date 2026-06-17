"""Local Whisper STT service boundary and implementation."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path

from app.services.ai.audio_preprocessing import AudioPreprocessingResult, WhisperAudioPreprocessor

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
        self.preprocessor = WhisperAudioPreprocessor()

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
        preprocessing = self.preprocessor.prepare(path)
        text = self._transcribe_preprocessed(model, preprocessing)

        logger.info(
            "STT completed for %s (chars=%s, chunks=%s, strategy=%s)",
            path.name,
            len(text),
            len(preprocessing.chunks),
            preprocessing.strategy,
        )
        return text

    def prepare_audio(self, audio_path: str) -> AudioPreprocessingResult:
        """Expose audio splitting metadata for debugging and future diarization."""
        return self.preprocessor.prepare(audio_path)

    def _transcribe_preprocessed(self, model, preprocessing: AudioPreprocessingResult) -> str:
        options: dict[str, object] = {}
        if self.language:
            options["language"] = self.language

        segments: list[str] = []
        for chunk in preprocessing.chunks:
            result = model.transcribe(chunk.samples, **options)
            chunk_text = (result.get("text") or "").strip()
            if chunk_text:
                segments.append(chunk_text)

        return " ".join(segments).strip()

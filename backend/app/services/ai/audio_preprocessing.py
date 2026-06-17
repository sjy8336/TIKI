"""Audio preprocessing helpers for Whisper STT."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AudioChunk:
    index: int
    start_seconds: float
    end_seconds: float
    samples: Any

    @property
    def duration_seconds(self) -> float:
        return max(0.0, self.end_seconds - self.start_seconds)

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "start_seconds": round(self.start_seconds, 3),
            "end_seconds": round(self.end_seconds, 3),
            "duration_seconds": round(self.duration_seconds, 3),
            "sample_count": int(self.samples.shape[0]),
        }


@dataclass(slots=True)
class AudioPreprocessingResult:
    source_path: str
    sample_rate: int
    duration_seconds: float
    strategy: str
    chunking_enabled: bool
    chunks: list[AudioChunk] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_path": self.source_path,
            "sample_rate": self.sample_rate,
            "duration_seconds": round(self.duration_seconds, 3),
            "strategy": self.strategy,
            "chunking_enabled": self.chunking_enabled,
            "chunk_count": len(self.chunks),
            "chunks": [chunk.to_dict() for chunk in self.chunks],
        }


class WhisperAudioPreprocessor:
    """Split long audio into Whisper-friendly chunks.

    The first pass uses simple energy-based silence detection so we can keep the
    implementation lightweight and dependency-free. If no usable silence is
    detected, the audio falls back to fixed-size hard splitting.

    The defaults are tuned for meeting recordings:
    - keep short meetings intact when possible,
    - avoid overly tiny chunks that hurt context,
    - still cap very long segments so Whisper stays stable.
    """

    def __init__(
        self,
        sample_rate: int = 16_000,
        frame_ms: int = 30,
        min_silence_seconds: float = 1.0,
        min_chunk_seconds: float = 30.0,
        max_chunk_seconds: float = 180.0,
        padding_seconds: float = 0.25,
        absolute_silence_floor: float = 0.0025,
    ) -> None:
        self.sample_rate = sample_rate
        self.frame_ms = frame_ms
        self.min_silence_seconds = min_silence_seconds
        self.min_chunk_seconds = min_chunk_seconds
        self.max_chunk_seconds = max_chunk_seconds
        self.padding_seconds = padding_seconds
        self.absolute_silence_floor = absolute_silence_floor

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_audio_loader():
        try:
            from whisper.audio import load_audio
        except ImportError as exc:  # pragma: no cover - dependency should exist in backend env
            raise RuntimeError(
                "openai-whisper is not installed. Add it to backend requirements before using STT."
            ) from exc

        return load_audio

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_numpy():
        try:
            import numpy as np
        except ImportError as exc:  # pragma: no cover - optional in local dev env
            raise RuntimeError(
                "numpy is required for audio chunking. Install backend dependencies to enable STT preprocessing."
            ) from exc

        return np

    def load_audio(self, audio_path: str | Path) -> np.ndarray:
        np = self._load_numpy()
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        load_audio = self._load_audio_loader()
        samples = load_audio(str(path))
        if not isinstance(samples, np.ndarray):
            samples = np.asarray(samples, dtype=np.float32)

        if samples.ndim != 1:
            samples = np.asarray(samples).reshape(-1).astype(np.float32, copy=False)

        return samples.astype(np.float32, copy=False)

    def prepare(self, audio_path: str | Path) -> AudioPreprocessingResult:
        path = Path(audio_path)
        samples = self.load_audio(path)
        duration_seconds = len(samples) / float(self.sample_rate) if len(samples) else 0.0

        if duration_seconds == 0:
            chunk = AudioChunk(index=0, start_seconds=0.0, end_seconds=0.0, samples=samples)
            return AudioPreprocessingResult(
                source_path=str(path),
                sample_rate=self.sample_rate,
                duration_seconds=0.0,
                strategy="empty",
                chunking_enabled=False,
                chunks=[chunk],
            )

        if duration_seconds <= self.max_chunk_seconds:
            chunk = AudioChunk(index=0, start_seconds=0.0, end_seconds=duration_seconds, samples=samples)
            return AudioPreprocessingResult(
                source_path=str(path),
                sample_rate=self.sample_rate,
                duration_seconds=duration_seconds,
                strategy="single_chunk",
                chunking_enabled=False,
                chunks=[chunk],
            )

        intervals = self._detect_speech_intervals(samples, duration_seconds)
        if not intervals:
            intervals = [(0.0, duration_seconds)]

        intervals = self._merge_close_intervals(intervals)
        intervals = self._pad_intervals(intervals, duration_seconds)
        intervals = self._split_long_intervals(intervals)
        chunks = self._materialize_chunks(samples, intervals)
        chunks = self._merge_short_chunks(chunks)
        chunks = [self._reindex_chunk(chunk, index) for index, chunk in enumerate(chunks)]

        strategy = "silence_split" if len(chunks) > 1 else "single_chunk"
        if len(chunks) == 1:
            chunks = [AudioChunk(index=0, start_seconds=0.0, end_seconds=duration_seconds, samples=samples)]

        return AudioPreprocessingResult(
            source_path=str(path),
            sample_rate=self.sample_rate,
            duration_seconds=duration_seconds,
            strategy=strategy,
            chunking_enabled=len(chunks) > 1,
            chunks=chunks,
        )

    def _detect_speech_intervals(self, samples: np.ndarray, duration_seconds: float) -> list[tuple[float, float]]:
        np = self._load_numpy()
        frame_size = max(1, int(self.sample_rate * self.frame_ms / 1000))
        frame_count = int(np.ceil(len(samples) / frame_size))
        rms_values: list[float] = []

        for frame_index in range(frame_count):
            start = frame_index * frame_size
            end = min(len(samples), start + frame_size)
            frame = samples[start:end]
            if frame.size == 0:
                continue
            rms = float(np.sqrt(np.mean(np.square(frame, dtype=np.float32), dtype=np.float32)))
            rms_values.append(rms)

        if not rms_values:
            return []

        rms_array = np.asarray(rms_values, dtype=np.float32)
        noise_floor = float(np.percentile(rms_array, 15))
        threshold = max(noise_floor * 1.8, self.absolute_silence_floor)
        active = rms_array > threshold

        intervals: list[tuple[float, float]] = []
        start_frame: int | None = None

        for index, is_active in enumerate(active):
            if is_active and start_frame is None:
                start_frame = index
            elif not is_active and start_frame is not None:
                intervals.append(self._frame_to_interval(start_frame, index))
                start_frame = None

        if start_frame is not None:
            intervals.append(self._frame_to_interval(start_frame, len(active)))

        return [(max(0.0, start), min(duration_seconds, end)) for start, end in intervals if end > start]

    def _frame_to_interval(self, start_frame: int, end_frame: int) -> tuple[float, float]:
        frame_duration = self.frame_ms / 1000.0
        return (start_frame * frame_duration, end_frame * frame_duration)

    def _merge_close_intervals(self, intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if not intervals:
            return []

        merged: list[tuple[float, float]] = [intervals[0]]
        for start, end in intervals[1:]:
            previous_start, previous_end = merged[-1]
            if start - previous_end <= self.min_silence_seconds:
                merged[-1] = (previous_start, max(previous_end, end))
            else:
                merged.append((start, end))
        return merged

    def _pad_intervals(self, intervals: list[tuple[float, float]], duration_seconds: float) -> list[tuple[float, float]]:
        padded: list[tuple[float, float]] = []
        for start, end in intervals:
            padded.append(
                (
                    max(0.0, start - self.padding_seconds),
                    min(duration_seconds, end + self.padding_seconds),
                )
            )
        return padded

    def _split_long_intervals(self, intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
        split_intervals: list[tuple[float, float]] = []
        for start, end in intervals:
            duration = end - start
            if duration <= self.max_chunk_seconds:
                split_intervals.append((start, end))
                continue

            cursor = start
            while cursor < end:
                next_end = min(end, cursor + self.max_chunk_seconds)
                split_intervals.append((cursor, next_end))
                cursor = next_end
        return split_intervals

    def _materialize_chunks(self, samples: np.ndarray, intervals: list[tuple[float, float]]) -> list[AudioChunk]:
        chunks: list[AudioChunk] = []
        for index, (start, end) in enumerate(intervals):
            start_sample = max(0, int(start * self.sample_rate))
            end_sample = min(len(samples), int(end * self.sample_rate))
            if end_sample <= start_sample:
                continue

            chunk_samples = samples[start_sample:end_sample]
            chunks.append(
                AudioChunk(
                    index=index,
                    start_seconds=start,
                    end_seconds=end,
                    samples=chunk_samples,
                )
            )

        if not chunks and len(samples):
            chunks.append(
                AudioChunk(
                    index=0,
                    start_seconds=0.0,
                    end_seconds=len(samples) / self.sample_rate,
                    samples=samples,
                )
            )

        return chunks

    def _merge_short_chunks(self, chunks: list[AudioChunk]) -> list[AudioChunk]:
        np = self._load_numpy()
        if not chunks:
            return []

        merged: list[AudioChunk] = []
        for chunk in chunks:
            if merged and chunk.duration_seconds < self.min_chunk_seconds:
                previous = merged[-1]
                merged[-1] = AudioChunk(
                    index=previous.index,
                    start_seconds=previous.start_seconds,
                    end_seconds=chunk.end_seconds,
                    samples=np.concatenate((previous.samples, chunk.samples)),
                )
                continue
            merged.append(chunk)
        return merged

    @staticmethod
    def _reindex_chunk(chunk: AudioChunk, index: int) -> AudioChunk:
        return AudioChunk(
            index=index,
            start_seconds=chunk.start_seconds,
            end_seconds=chunk.end_seconds,
            samples=chunk.samples,
        )


def prepare_audio_chunks(audio_path: str | Path) -> AudioPreprocessingResult:
    return WhisperAudioPreprocessor().prepare(audio_path)

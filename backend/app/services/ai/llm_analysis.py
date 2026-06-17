"""LLM summary and ticket extraction service boundary and implementation."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from collections import Counter
from datetime import datetime
from textwrap import shorten
from typing import Any

from app.models.enums import TicketPriority, TicketStatus

ACTION_KEYWORDS: tuple[str, ...] = (
    "해야",
    "필요",
    "검토",
    "수정",
    "보완",
    "연동",
    "개발",
    "구현",
    "배포",
    "정리",
    "확인",
    "업로드",
    "테스트",
    "반영",
    "마이그레이션",
    "이관",
    "작업",
    "맡",
    "논의",
    "조율",
)

HIGH_PRIORITY_KEYWORDS: tuple[str, ...] = (
    "긴급",
    "즉시",
    "오늘",
    "이번주",
    "장애",
    "막아",
    "배포",
    "오류",
    "에러",
)

LOW_PRIORITY_KEYWORDS: tuple[str, ...] = (
    "검토",
    "확인",
    "논의",
    "조율",
    "참고",
)

ASSIGNEE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"([가-힣]{2,4})님"),
    re.compile(r"([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)"),
)

SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?。])\s+|\n+")
WHITESPACE_PATTERN = re.compile(r"\s+")
DATE_PATTERN = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")


class LLMAnalysisService(ABC):
    @abstractmethod
    def summarize_and_extract_tickets(self, transcript: str) -> dict[str, Any]:
        raise NotImplementedError


class HeuristicLLMAnalysisService(LLMAnalysisService):
    """Deterministic baseline analysis used until a hosted LLM is wired in.

    This keeps the pipeline functional without adding a remote dependency.
    """

    model_name = "heuristic-llm-v1"
    prompt_version = "heuristic-v1"

    def summarize_and_extract_tickets(self, transcript: str) -> dict[str, Any]:
        normalized = self._normalize_text(transcript)
        if not normalized:
            return {
                "summary": "요약할 텍스트가 없습니다.",
                "action_items": [],
                "model_name": self.model_name,
                "prompt_version": self.prompt_version,
                "extra_data": {"input_characters": 0, "sentence_count": 0},
            }

        sentences = self._split_sentences(normalized)
        action_sentences = self._rank_action_sentences(sentences)
        summary = self._build_summary(action_sentences or sentences, normalized)
        action_items = self._build_action_items(action_sentences or sentences)

        return {
            "summary": summary,
            "action_items": action_items,
            "model_name": self.model_name,
            "prompt_version": self.prompt_version,
            "extra_data": {
                "input_characters": len(normalized),
                "sentence_count": len(sentences),
                "action_sentence_count": len(action_sentences),
                "keyword_hits": dict(self._keyword_counter(normalized)),
            },
        }

    @staticmethod
    def _normalize_text(text: str) -> str:
        return WHITESPACE_PATTERN.sub(" ", text or "").strip()

    @staticmethod
    def _split_sentences(text: str) -> list[str]:
        candidates = [part.strip() for part in SENTENCE_SPLIT_PATTERN.split(text) if part.strip()]
        if len(candidates) >= 2:
            return candidates

        # Whisper transcripts often arrive as one long block, so chunk by clause.
        chunks = [chunk.strip() for chunk in re.split(r"[,:;]|(?<=다)\s+", text) if chunk.strip()]
        return chunks or ([text] if text else [])

    @staticmethod
    def _keyword_counter(text: str) -> Counter[str]:
        lowered = text.lower()
        counter: Counter[str] = Counter()
        for keyword in ACTION_KEYWORDS:
            hits = lowered.count(keyword.lower())
            if hits:
                counter[keyword] += hits
        return counter

    def _rank_action_sentences(self, sentences: list[str]) -> list[str]:
        scored: list[tuple[int, int, str]] = []
        for index, sentence in enumerate(sentences):
            score = self._score_sentence(sentence)
            if score > 0:
                scored.append((score, index, sentence))

        scored.sort(key=lambda item: (-item[0], item[1]))
        return [sentence for _, _, sentence in scored[:5]]

    def _score_sentence(self, sentence: str) -> int:
        score = 0
        lowered = sentence.lower()

        for keyword in ACTION_KEYWORDS:
            if keyword.lower() in lowered:
                score += 2

        for keyword in HIGH_PRIORITY_KEYWORDS:
            if keyword.lower() in lowered:
                score += 2

        for keyword in LOW_PRIORITY_KEYWORDS:
            if keyword.lower() in lowered:
                score += 1

        if len(sentence) >= 25:
            score += 1

        return score

    def _build_summary(self, sentences: list[str], fallback_text: str) -> str:
        picked = sentences[:3]
        if not picked:
            picked = [shorten(fallback_text, width=180, placeholder="...")]

        return " ".join(picked)

    def _build_action_items(self, sentences: list[str]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_titles: set[str] = set()

        for sentence in sentences:
            title = self._build_title(sentence)
            if title in seen_titles:
                continue
            seen_titles.add(title)

            items.append(
                {
                    "title": title,
                    "description": sentence.strip(),
                    "status": TicketStatus.DRAFT.value,
                    "priority": self._infer_priority(sentence).value,
                    "assignee": self._extract_assignee(sentence),
                    "due_at": self._extract_due_at(sentence),
                }
            )

        return items

    @staticmethod
    def _build_title(sentence: str) -> str:
        cleaned = sentence.strip().rstrip(".!?。")
        return shorten(cleaned, width=80, placeholder="...")

    @staticmethod
    def _infer_priority(sentence: str) -> TicketPriority:
        lowered = sentence.lower()
        if any(keyword in lowered for keyword in HIGH_PRIORITY_KEYWORDS):
            return TicketPriority.HIGH
        if any(keyword in lowered for keyword in LOW_PRIORITY_KEYWORDS):
            return TicketPriority.LOW
        return TicketPriority.MEDIUM

    @staticmethod
    def _extract_assignee(sentence: str) -> str | None:
        for pattern in ASSIGNEE_PATTERNS:
            match = pattern.search(sentence)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _extract_due_at(sentence: str) -> str | None:
        match = DATE_PATTERN.search(sentence)
        if match:
            return datetime.fromisoformat(match.group(1)).date().isoformat()
        return None

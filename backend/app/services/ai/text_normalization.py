"""Shared text normalization helpers for meeting audio and analysis."""

from __future__ import annotations

import re
from typing import Any

WHITESPACE_PATTERN = re.compile(r"\s+")

_MEETING_TERM_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    # Common Whisper misreads on this project corpus.
    (re.compile(r"(?<![0-9A-Za-z가-힣])산의(?=$|[가-힣\s.,!?。])"), "사내"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])데시보드(?=$|[가-힣\s.,!?。])"), "대시보드"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])결지자(?=$|[가-힣\s.,!?。])"), "결재자"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])결지(?=$|[가-힣\s.,!?。])"), "결재"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])우성(?=\s+검토)"), "우선"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])노구인(?=$|[가-힣\s.,!?。])"), "로그인"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])시암(?=$|[가-힣\s.,!?。])"), "시안"),
    (re.compile(r"(?:(?<=디자인\s)|(?<=중간\s)|(?<=최종\s))시한(?=$|[가-힣\s.,!?。])"), "시안"),
    (re.compile(r"(?<=담당자\s)지적(?=$|[가-힣\s.,!?。])"), "지정"),
    (re.compile(r"(?<![0-9A-Za-z가-힣])정관리(?=$|[가-힣\s.,!?。])"), "일정 관리"),
)


def normalize_meeting_terms(text: Any) -> str:
    """Normalize high-frequency meeting terms that Whisper often mishears."""
    normalized = WHITESPACE_PATTERN.sub(" ", str(text or "")).strip()
    if not normalized:
        return ""

    for pattern, replacement in _MEETING_TERM_RULES:
        normalized = pattern.sub(replacement, normalized)

    return WHITESPACE_PATTERN.sub(" ", normalized).strip()

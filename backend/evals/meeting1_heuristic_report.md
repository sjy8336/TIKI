# 회의1 Heuristic Report

실행 명령:

```bash
python scripts/analyze_meeting_audio.py "/Users/jiyoung/문서/내파일/study/내 문서/협업/최종프로젝트/데이터소스/회의1.m4a" --mode heuristic
```

## 결과 요약

- 전사 길이: `4423`
- 전처리: `noisy_fixed_window_split`
- 오디오 상태: `raw_noise_detected`, `ffmpeg_denoised`, `forced_quality_split`
- 모델: `heuristic-llm-v2`

## Summary

회의에서는 로그인, 회원가입, 업무 등록, 결제 및 알림 중심으로 우선순위와 후속 대응 기준을 정리했다. 요구사항 명세서, 디자인, 테스트, 수정 요청 같은 후속 일정도 함께 공유했다. 디자인 수정 반복과 테스트 기간 리스크도 함께 확인했다.

## Decisions

- 추가 기능 요청은 승인 기준으로 관리하기로 했다.
- 업무 등록 기능과 결제 기능을 우선 진행하기로 했다.

## Action Items

- 수정 요청 반영
- 요구사항 명세서 진행
- 일정 확보
- 파일 첨부 기능 검토
- 부서 의견 확인

## Issues

- 결제 기능 영향 범위
- 리스크 관리 협의 필요

## Next Agenda

- 지금까지는 기본 일정과 주요 리스크를 확인했고 이번에는 추가 기능 요청이 들어올 경우에 어떻게 대응할지 이야기해봅시다

## 참고

- 회의 시작 문장은 결정사항에서 제외되도록 정리했다.
- follow-up 성격의 문장은 `next_agenda`로 더 잘 들어가도록 보강했다.
- 반복 문장은 후처리 단계에서 접히도록 정리했다.

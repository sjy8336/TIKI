import { useState, useEffect, useRef, useCallback } from "react";

/* ─── 데이터 ─────────────────────────────────────────── */
const TX = [
  { time: "00:00", ts: 0,   spk: "김지훈", txt: "안녕하세요, 오늘 Sprint 12 킥오프 회의 시작하겠습니다. AI 회의록 시스템 개발 현황 공유와 이번 스프린트 목표를 논의할 예정입니다." },
  { time: "00:47", ts: 47,  spk: "박소현", txt: "화자 분리 모델 쪽 진행 상황 먼저 공유할게요. 지난주에 Whisper 기반 STT와 PyAnnote를 연동하는 PoC를 완료했습니다." },
  { time: "01:32", ts: 92,  spk: "이민준", txt: "Jira API 연동 PoC는 저번 주 목요일에 완료했습니다. POST /issue 엔드포인트로 티켓 발행까지 잘 되는 것 확인했어요." },
  { time: "02:15", ts: 135, spk: "최아로미", txt: "업로드 UI 드래그앤드롭 구현했고, 파일 유효성 검사(확장자/용량)도 프론트에서 처리하도록 했습니다. 사용자 피드백 수집이 다음 단계예요." },
  { time: "03:01", ts: 181, spk: "김지훈", txt: "STT 응답 속도가 현재 이슈인데, 평균 1분 오디오당 처리 시간이 8초 정도 나오고 있어요. 목표치 5초 대비 아직 최적화가 필요합니다." },
  { time: "04:10", ts: 250, spk: "박소현", txt: "화자 분리 정확도는 2명 기준 94%, 4명 이상에서 79%로 떨어지는 문제가 있어요. 추가 학습 데이터가 필요할 것 같습니다." },
  { time: "05:22", ts: 322, spk: "이민준", txt: "백엔드 task_id 폴링 방식은 현재 2초 간격으로 맞춰놨는데, 부하 테스트 결과 동시 요청 50개까지는 안정적이에요." },
  { time: "06:45", ts: 405, spk: "최아로미", txt: "프론트엔드에서 단계별 진행 상황 UI는 완성됐습니다. 업로드 → 전처리 → AI 요약 → 티켓 연동 4단계로 사용자에게 명확하게 보여주고 있어요." },
  { time: "07:30", ts: 450, spk: "김지훈", txt: "배포 일정 이야기 해볼게요. 현재 계획은 6월 말인데, QA 기간을 1주 확보하려면 개발 완료를 6월 20일까지는 해야 합니다." },
  { time: "08:15", ts: 495, spk: "박소현", txt: "화자 분리 정확도 개선 작업이 변수입니다. 추가 데이터 수집에 최소 3일은 걸릴 것 같아서 일정이 빠듯할 수 있어요." },
  { time: "09:00", ts: 540, spk: "이민준", txt: "저는 일정 맞출 수 있을 것 같습니다. 다만 오류 핸들링 케이스가 아직 몇 가지 남아있는데, 이번 주 내로 처리할게요." },
  { time: "10:20", ts: 620, spk: "김지훈", txt: "그럼 6월 20일 개발 완료, 6월 21-27일 QA, 6월 28일 배포로 최종 일정을 확정하겠습니다. 다들 동의하시죠?" },
];

const SPK_COLOR = { "김지훈": "#0099CC", "박소현": "#7C3AED", "이민준": "#10B981", "최아로미": "#F59E0B" };

const JIRA_TICKETS = [
  { id: "TIKI-101", title: "Jira API 연동 PoC",       assignee: "이민준", status: "done" },
  { id: "TIKI-98",  title: "STT 응답 스키마 정의",    assignee: "김지훈", status: "done" },
  { id: "TIKI-95",  title: "업로드 UI 드래그앤드롭",  assignee: "최아로미", status: "done" },
  { id: "TIKI-103", title: "화자 분리 모델 테스트",   assignee: "박소현", status: "progress" },
  { id: "TIKI-105", title: "QA 테스트 시나리오 작성", assignee: "전체",  status: "todo" },
];

const PARTICIPANTS = [
  { name: "김지훈", color: "#0099CC", role: "PM" },
  { name: "박소현", color: "#7C3AED", role: "ML Engineer" },
  { name: "이민준", color: "#10B981", role: "Backend" },
  { name: "최아로미", color: "#F59E0B", role: "Frontend" },
  { name: "정다은", color: "#EF4444", role: "QA" },
  { name: "한유진", color: "#0EA5E9", role: "Designer" },
];

const SUMMARY_DATA = {
  keywords: [
    { text: "STT 파이프라인", type: "cyan" },
    { text: "화자 분리",     type: "cyan" },
    { text: "Jira 연동",    type: "purple" },
    { text: "프롬프트 튜닝", type: "purple" },
    { text: "배포 일정",    type: "green" },
    { text: "API 성능",     type: "yellow" },
  ],
  summary:
    "Sprint 12 킥오프에서는 AI 회의록 시스템의 핵심 구성요소인 STT 파이프라인, 화자 분리, Jira 연동의 진행 상황을 공유했습니다. STT API는 Whisper 기반으로 최종 확정되었으며, 배포 일정은 6월 28일로 조정되었습니다. 일부 성능 최적화와 화자 분리 정확도 개선이 남은 주요 과제로 확인됐습니다.",
  decisions: [
    "STT API는 Whisper 기반으로 최종 결정. 비용 대비 정확도 가장 높음.",
    "배포 6월 28일로 조정. 프론트 팀 QA 기간 1주(6/21–27) 확보.",
    "task_id 폴링 간격 2초 유지. 동시 요청 50개 기준 안정성 확인.",
  ],
  actions: [
    { text: "STT 응답 속도 벤치마크 문서 작성",       assignee: "김지훈",  due: "6/18", status: "todo" },
    { text: "화자 분리 모델 정확도 테스트 결과 공유", assignee: "박소현",  due: "6/20", status: "todo" },
    { text: "Jira API 연동 PoC 완료",                 assignee: "이민준",  due: null,   status: "done" },
    { text: "업로드 UI 사용자 테스트 세션 진행",      assignee: "최아로미", due: "6/25", status: "todo" },
  ],
  issues: [
    { level: "high",   text: "STT 처리 속도 8초 → 목표 5초 미달. 최적화 작업 필요." },
    { level: "medium", text: "화자 4명 이상 시 분리 정확도 79%로 저하. 추가 학습 데이터 수집 3일 소요 예상." },
    { level: "low",    text: "오류 핸들링 케이스 미처리 항목 존재. 이번 주 내 완료 예정." },
  ],
  next_agenda: [
    "STT 속도 최적화 결과 리뷰 (김지훈)",
    "화자 분리 정확도 개선 현황 공유 (박소현)",
    "6/20 개발 완료 기준 QA 시나리오 확정",
    "Sprint 12 데모 준비 및 역할 분담",
  ],
};

const SPEEDS = [1.0, 1.25, 1.5, 2.0, 0.75];
const MAX_TS = 4532;
const PAGE_SIZE = 10;

/* ─── 유틸 ───────────────────────────────────────────── */
function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/* ─── 배지 헬퍼 ──────────────────────────────────────── */
const KW_BADGE = {
  cyan:   "bg-cyan-50 text-cyan-600 border border-cyan-200",
  purple: "bg-purple-50 text-purple-600 border border-purple-200",
  green:  "bg-emerald-50 text-emerald-600 border border-emerald-200",
  yellow: "bg-amber-50 text-amber-600 border border-amber-200",
};

const ISSUE_CFG = {
  high:   { bg: "bg-red-50",    border: "border-red-200",    icon: "🔴", badge: "bg-red-100 text-red-500",     label: "높음" },
  medium: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "🟡", badge: "bg-amber-100 text-amber-600", label: "보통" },
  low:    { bg: "bg-slate-50",  border: "border-slate-200",  icon: "⚪", badge: "bg-slate-100 text-slate-500", label: "낮음" },
};

/* ─── Toast ──────────────────────────────────────────── */
function Toast({ msg, color }) {
  if (!msg) return null;
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg pointer-events-none"
      style={{ background: color }}
    >
      {msg}
    </div>
  );
}

/* ─── Modal Wrapper ──────────────────────────────────── */
function Modal({ id, open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backdropFilter: "blur(8px)", background: "rgba(13,27,42,0.4)" }}
        onClick={onClose}
      />
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden" style={{ maxWidth: id === "regen" ? 512 : 448 }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="font-bold text-sm text-slate-900">{title}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 pb-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Jira Modal ─────────────────────────────────────── */
function JiraModal({ open, onClose }) {
  const done = JIRA_TICKETS.filter(t => t.status === "done").length;
  const pct = Math.round((done / JIRA_TICKETS.length) * 100);
  return (
    <Modal open={open} onClose={onClose} title="연동된 Jira 티켓" id="jira">
      <div className="border-b border-slate-100 -mx-6 px-6 pb-4 mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-slate-400">전체 진행률</span>
          <span className="text-xs font-bold text-slate-900">{done} / {JIRA_TICKETS.length} 완료</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0099CC,#7C3AED)" }} />
        </div>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {JIRA_TICKETS.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${t.status === "done" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}>
            <span className="flex-shrink-0">
              {t.status === "done" ? "✓" : t.status === "progress" ? "◑" : "○"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{t.id} {t.title}</p>
              <p className="text-xs text-slate-400">{t.assignee}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              t.status === "done" ? "bg-emerald-100 text-emerald-600" :
              t.status === "progress" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
            }`}>
              {t.status === "done" ? "Done" : t.status === "progress" ? "진행 중" : "대기"}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ─── Regen Modal ────────────────────────────────────── */
function RegenModal({ open, onClose, onRegen }) {
  const [focus, setFocus] = useState("");
  const [prompt, setPrompt] = useState("");
  const [len, setLen] = useState("보통");
  const FOCUSES = [
    { label: "기술 이슈", val: "기술적 제약 사항 위주" },
    { label: "액션 아이템", val: "Action Item과 담당자 위주" },
    { label: "일정", val: "일정 및 마일스톤 위주" },
    { label: "의사결정", val: "의사결정 사항 위주" },
  ];
  const LENS = ["간결", "보통", "상세"];
  return (
    <Modal open={open} onClose={onClose} title="AI 요약 다시 생성" id="regen"
      footer={
        <>
          <button onClick={onClose} className="text-sm font-semibold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100">취소</button>
          <button onClick={() => { onRegen(); onClose(); }}
            className="text-sm font-bold px-5 py-2 rounded-xl text-white hover:-translate-y-0.5 transition-all"
            style={{ background: "linear-gradient(135deg,#7C3AED,#0099CC)" }}>
            생성 시작
          </button>
        </>
      }>
      <div className="space-y-5">
        <p className="text-sm text-slate-400 leading-relaxed">요약의 초점을 조정할 수 있어요. 빠른 선택이나 직접 지시 중 하나를 사용하세요.</p>
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2.5">초점 선택</p>
          <div className="flex flex-wrap gap-2">
            {FOCUSES.map(f => (
              <button key={f.val}
                onClick={() => { setFocus(f.val); setPrompt(f.val); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  focus === f.val ? "bg-purple-50 text-purple-600 border-purple-300" : "text-slate-400 border-slate-200 hover:border-slate-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">직접 지시</p>
          <textarea rows={2} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="예: 기술적 리스크 위주로 요약해줘"
            className="w-full text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder:text-slate-300 border border-slate-200 focus:border-cyan-400 bg-slate-50 transition-colors"
            style={{ fontFamily: "inherit" }} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">요약 길이</p>
          <div className="flex gap-2">
            {LENS.map(l => (
              <button key={l} onClick={() => setLen(l)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  len === l ? "bg-cyan-50 text-cyan-600 border-cyan-300" : "text-slate-400 border-slate-200 hover:border-slate-300"
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Ticket Modal ───────────────────────────────────── */
function TicketModal({ open, onClose, initTitle, initPerson, onIssue }) {
  const [title, setTitle] = useState(initTitle || "");
  const [desc, setDesc] = useState("회의에서 논의된 항목입니다. 내용을 확인하고 처리해주세요.");
  const [person, setPerson] = useState(initPerson || "");
  const [priority, setPriority] = useState("Medium");

  useEffect(() => { setTitle(initTitle || ""); setPerson(initPerson || ""); }, [initTitle, initPerson]);

  return (
    <Modal open={open} onClose={onClose} title="Jira 티켓 발행" id="ticket"
      footer={
        <>
          <button onClick={onClose} className="text-sm font-semibold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100">취소</button>
          <button onClick={() => { onIssue(title); onClose(); }}
            className="text-sm font-bold px-5 py-2 rounded-xl text-white hover:-translate-y-0.5 transition-all"
            style={{ background: "linear-gradient(135deg,#0099CC,#7C3AED)" }}>
            발행
          </button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">티켓 제목</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 transition-colors" style={{ fontFamily: "inherit" }} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">설명</label>
          <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:border-cyan-400 outline-none resize-none bg-slate-50 transition-colors" style={{ fontFamily: "inherit" }} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">담당자</label>
            <input value={person} onChange={e => setPerson(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 transition-colors" style={{ fontFamily: "inherit" }} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">우선순위</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900" style={{ fontFamily: "inherit" }}>
              {["Medium", "High", "Low", "Critical"].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Transcript Card ────────────────────────────────── */
function TxCard({ item, isActive, isBookmarked, onSeek, onToggleBm, collapsed, onToggleCollapse }) {
  const col = SPK_COLOR[item.spk] || "#5A6F8A";
  return (
    <div
      className={`group border rounded-2xl transition-all duration-200 ${
        isActive ? "border-cyan-400 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => onSeek(item.ts)}
      >
        <span className={`text-xs font-semibold font-mono w-10 flex-shrink-0 ${isActive ? "text-cyan-500" : "text-slate-400"}`}>
          {item.time}
        </span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: col }}>
          {item.spk[0]}
        </div>
        <p className="text-xs font-semibold flex-1 min-w-0" style={{ color: col }}>{item.spk}</p>

        <button
          onClick={e => { e.stopPropagation(); onToggleBm(item.idx); }}
          className={`flex-shrink-0 p-1.5 rounded-lg text-base leading-none transition-opacity ${
            isBookmarked ? "opacity-100 text-amber-400" : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400"
          }`}
        >
          {isBookmarked ? "★" : "☆"}
        </button>

        <button
          onClick={e => { e.stopPropagation(); onToggleCollapse(item.idx); }}
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100 ${!collapsed ? "opacity-100" : ""}`}
          title={collapsed ? "펼치기" : "접기"}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div
        style={{
          maxHeight: collapsed ? 0 : 200,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <div className="px-4 pb-3 pl-[3.75rem]">
          <p className="text-sm text-slate-800 leading-relaxed">{item.txt}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── EditableDecision ───────────────────────────────── */
function EditableDecision({ text, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  return (
    <div className="group p-2.5 rounded-lg hover:bg-blue-50 transition-colors">
      {editing ? (
        <div>
          <textarea value={val} onChange={e => setVal(e.target.value)} rows={2}
            className="w-full border border-cyan-400 rounded-lg px-3 py-2 text-sm outline-none resize-none bg-white"
            style={{ fontFamily: "inherit" }} />
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={() => { onSave(val); setEditing(false); }}
              className="text-xs font-bold px-2.5 py-1 rounded text-white bg-cyan-500">저장</button>
            <button onClick={() => { setVal(text); setEditing(false); }}
              className="text-xs text-slate-400 px-2.5 py-1 rounded hover:bg-slate-100">취소</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <span className="flex-shrink-0 mt-1 text-base leading-none text-cyan-500">☑</span>
          <p className="text-sm text-slate-800 leading-relaxed flex-1">{val}</p>
          <button onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 p-1 rounded hover:bg-slate-100 transition-opacity text-sm">✏️</button>
        </div>
      )}
    </div>
  );
}

/* ─── AI Summary Panel ───────────────────────────────── */
function SummaryPanel({ onOpenRegen, onOpenTicket, transcriptVisible, onToggleTranscript, isMobile, summaryCollapsed, onToggleSummary }) {
  const [decisions, setDecisions] = useState(SUMMARY_DATA.decisions);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <span className="text-sm font-bold text-slate-900">AI 요약</span>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              onClick={onToggleTranscript}
              title={transcriptVisible ? "스크립트 패널 접기" : "스크립트 패널 펼치기"}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                transcriptVisible
                  ? "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  : "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: transcriptVisible ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s ease" }}>
                <path d="M9 2H12M9 5H12M9 8H12M2 11H12M2 2H6V8H2V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline">{transcriptVisible ? "스크립트 접기" : "스크립트 펼치기"}</span>
            </button>
          )}
          {isMobile && (
            <button
              onClick={onToggleSummary}
              title={summaryCollapsed ? "AI 요약 펼치기" : "AI 요약 접기"}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ transform: summaryCollapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
              >
                <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button onClick={onOpenRegen}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors">
            다시 생성
          </button>
        </div>
      </div>

      {(!isMobile || !summaryCollapsed) && (
      <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
        {/* 핵심 카드 */}
        <div className="rounded-xl p-4 space-y-3 bg-blue-50 border border-blue-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">핵심 키워드</p>
            <div className="flex flex-wrap gap-1.5">
              {SUMMARY_DATA.keywords.map(k => (
                <span key={k.text} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${KW_BADGE[k.type]}`}>{k.text}</span>
              ))}
            </div>
          </div>
          <div className="border-t border-blue-100 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">전체 요약</p>
            <p className="text-sm text-slate-800 leading-relaxed">{SUMMARY_DATA.summary}</p>
          </div>
        </div>

        <Divider label="협업" />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">주요 결정</p>
          <div className="space-y-1">
            {decisions.map((d, i) => (
              <EditableDecision key={i} text={d} onSave={v => setDecisions(prev => prev.map((x, j) => j === i ? v : x))} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Action Items</p>
          <div className="space-y-2">
            {SUMMARY_DATA.actions.map((a, i) => (
              <ActionItem key={i} item={a} onJira={() => onOpenTicket(a.text, a.assignee)} />
            ))}
          </div>
        </div>

        <Divider label="인사이트" />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">이슈 &amp; 리스크</p>
          <div className="space-y-2">
            {SUMMARY_DATA.issues.map((iss, i) => {
              const c = ISSUE_CFG[iss.level];
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
                  <span className="flex-shrink-0 text-base leading-none mt-0.5">{c.icon}</span>
                  <p className="flex-1 text-sm text-slate-800 leading-relaxed">{iss.text}</p>
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${c.badge}`}>{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">다음 회의 안건</p>
          <div className="rounded-xl p-3 space-y-2 bg-cyan-50/60 border border-cyan-100">
            {SUMMARY_DATA.next_agenda.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white mt-0.5 bg-cyan-500"
                  style={{ fontSize: 10 }}>{i + 1}</span>
                <p className="text-sm text-slate-800 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function ActionItem({ item, onJira }) {
  const [checked, setChecked] = useState(item.status === "done");

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
        checked ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
      }`}
      onClick={() => setChecked(prev => !prev)}
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(event) => event.stopPropagation()}
        onChange={() => setChecked(prev => !prev)}
        className={`mt-0.5 flex-shrink-0 ${checked ? "accent-emerald-500" : "accent-cyan-500"}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? "line-through text-slate-400" : "text-slate-800"}`}>{item.text}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {item.assignee}
          {checked ? " · 완료" : item.due ? ` · ${item.due}` : ""}
        </p>
      </div>
      {checked ? (
        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-600">완료</span>
      ) : (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onJira();
          }}
          className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-50 text-cyan-600 border border-cyan-200"
        >
          Jira
        </button>
      )}
    </div>
  );
}

/* ─── Audio Player ───────────────────────────────────── */
function AudioPlayer({ curTime, playing, spdIdx, onSeek, onTogglePlay, onCycleSpeed }) {
  const pct = (curTime / MAX_TS) * 100;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 md:px-8 py-3 bg-white/95 backdrop-blur-md border-t border-slate-100">
      <div className="max-w-screen-xl mx-auto flex items-center gap-3 md:gap-4">
        <button onClick={onTogglePlay}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg,#0099CC,#7C3AED)" }}>
          {playing ? "⏸" : "▶"}
        </button>
        <span className="text-xs font-semibold font-mono text-slate-400 flex-shrink-0 hidden sm:block">
          {fmtTime(curTime)} / <span className="text-slate-300">1:15:32</span>
        </span>
        <div className="flex-1 relative h-3 flex items-center">
          <div className="absolute inset-y-0 flex items-center w-full">
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0099CC,#7C3AED)" }} />
            </div>
          </div>
          <input type="range" min={0} max={MAX_TS} value={curTime}
            onChange={e => onSeek(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-3" />
        </div>
        <button onClick={onCycleSpeed}
          className="text-xs font-bold py-1 rounded-lg flex-shrink-0 text-center bg-cyan-50 text-cyan-600 w-12">
          {SPEEDS[spdIdx]}×
        </button>
        <div className="hidden md:block text-right flex-shrink-0">
          <p className="text-xs font-semibold text-slate-800">sprint12_kickoff.m4a</p>
          <p className="text-xs text-slate-400">234.7 MB</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────── */
export default function TikiSprint12() {
  const [curTime, setCurTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [spdIdx, setSpdIdx] = useState(0);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [collapsedSet, setCollapsedSet] = useState(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [bmFilter, setBmFilter] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [toast, setToast] = useState({ msg: "", color: "#10B981" });
  const [modal, setModal] = useState(null);
  const [ticketInit, setTicketInit] = useState({ title: "", person: "" });
  // 스크립트 패널 표시 여부
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showToast = useCallback((msg, color = "#10B981") => {
    setToast({ msg, color });
    setTimeout(() => setToast({ msg: "", color }), 2800);
  }, []);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setCurTime(t => {
          const next = t + SPEEDS[spdIdx];
          if (next >= MAX_TS) { setPlaying(false); return MAX_TS; }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, spdIdx]);

  const seekTo = useCallback((ts) => {
    setCurTime(ts);
    if (!playing) setPlaying(true);
  }, [playing]);

  const toggleBm = useCallback((idx) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((idx) => {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const toggleAllCollapse = useCallback(() => {
    if (allCollapsed) {
      setCollapsedSet(new Set());
      setAllCollapsed(false);
    } else {
      setCollapsedSet(new Set(TX.map((_, i) => i)));
      setAllCollapsed(true);
    }
  }, [allCollapsed]);

  const txData = TX
    .map((d, i) => ({ ...d, idx: i }))
    .filter(d => (!bmFilter || bookmarks.has(d.idx)) &&
      (!searchQ || d.txt.includes(searchQ) || d.spk.includes(searchQ)));
  const visible = txData.slice(0, shownCount);
  const remaining = txData.length - shownCount;

  const activeIdx = TX.reduce((acc, item, i) => {
    const nxt = i + 1 < TX.length ? TX[i + 1].ts : 99999;
    if (curTime >= item.ts && curTime < nxt) return i;
    return acc;
  }, -1);

  const doneCount = JIRA_TICKETS.filter(t => t.status === "done").length;
  const jiraPct = Math.round((doneCount / JIRA_TICKETS.length) * 100);
  const visibleParticipants = PARTICIPANTS.slice(0, 4);
  const hiddenParticipantsCount = Math.max(PARTICIPANTS.length - visibleParticipants.length, 0);

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFF", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", color: "#0D1B2A" }}>
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-10 h-14 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <a href="#" className="flex items-center gap-2 text-base font-bold tracking-tight">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
            style={{ background: "linear-gradient(135deg,#0099CC,#7C3AED)" }}>T</div>
          <span className="text-slate-900">TI<span style={{ color: "#0099CC" }}>KI</span></span>
        </a>
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            ← <span className="hidden sm:inline ml-0.5">목록</span>
          </button>
          <button className="text-sm font-medium text-slate-400 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors hidden sm:block">공유</button>
          <button className="text-sm font-medium text-slate-400 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors hidden sm:block">내보내기</button>
        </div>
      </header>

      {/* ── MEETING META ── */}
      <div className="px-4 md:px-8 lg:px-12 pt-6 pb-0 max-w-screen-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-400">2025.06.14</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-400">오후 2:00 – 3:15</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-cyan-500">75분</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-snug mb-4">
                Sprint 12 킥오프 — AI 회의록 시스템 개발 현황 공유
              </h1>
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {visibleParticipants.map((participant) => (
                    <div
                      key={participant.name}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white"
                      style={{ background: participant.color }}
                      title={participant.name}
                    >
                      {participant.name[0]}
                    </div>
                  ))}
                  {hiddenParticipantsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setModal("participants")}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white bg-slate-400 hover:bg-slate-500 transition-colors"
                      title="참여자 목록 보기"
                    >
                      +{hiddenParticipantsCount}
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400">총 {PARTICIPANTS.length}명 참여</span>
              </div>
            </div>

            <button onClick={() => setModal("jira")}
              className="lg:w-56 text-left rounded-xl px-4 py-3.5 transition-colors hover:bg-blue-50"
              style={{ border: "1px solid rgba(0,153,204,0.18)", background: "rgba(0,153,204,0.04)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-cyan-500">Jira 티켓 현황</span>
                <span className="text-xs font-bold text-slate-900">{doneCount} / {JIRA_TICKETS.length}</span>
              </div>
              <div className="h-1.5 rounded-full mb-1.5 bg-blue-100">
                <div className="h-full rounded-full" style={{ width: `${jiraPct}%`, background: "linear-gradient(90deg,#0099CC,#7C3AED)" }} />
              </div>
              <p className="text-xs text-slate-400">클릭하여 티켓 목록 보기</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="px-4 md:px-8 lg:px-12 py-5 pb-32 max-w-screen-xl mx-auto">
        {/*
          핵심 레이아웃: transcriptVisible 상태에 따라
          - 스크립트 보임: 좌(AI 요약 고정폭) + 우(스크립트)
          - 스크립트 숨김: AI 요약이 전체 너비 차지
        */}
        <div
          className="flex flex-col gap-5 md:flex-row transition-all duration-300"
          style={{ alignItems: isMobile ? "stretch" : "flex-start" }}
        >
          {/* AI Summary - 스크립트 접힘 시 전체 너비 */}
          <div
            className="flex-shrink-0 transition-all duration-300"
            style={{
              width: isMobile ? "100%" : transcriptVisible ? "clamp(360px, 38%, 540px)" : "100%",
              transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <SummaryPanel
              isMobile={isMobile}
              summaryCollapsed={summaryCollapsed}
              onToggleSummary={() => setSummaryCollapsed(prev => !prev)}
              transcriptVisible={transcriptVisible}
              onToggleTranscript={() => setTranscriptVisible(v => !v)}
              onOpenRegen={() => setModal("regen")}
              onOpenTicket={(title, person) => { setTicketInit({ title, person }); setModal("ticket"); }}
            />
          </div>

          {/* Transcript Panel - 슬라이드 인/아웃 */}
          <div
            className={`flex-1 min-w-0 ${isMobile ? "" : "overflow-hidden"}`}
            style={{
              maxWidth: isMobile ? "100%" : transcriptVisible ? "100%" : "0px",
              opacity: isMobile ? 1 : transcriptVisible ? 1 : 0,
              transition: isMobile ? "none" : "max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
              pointerEvents: isMobile ? "auto" : transcriptVisible ? "auto" : "none",
            }}
          >
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 bg-white border border-slate-200">
                  전체 <span className="font-bold text-slate-900">12</span>
                </div>
                <button onClick={() => { setBmFilter(f => !f); setShownCount(PAGE_SIZE); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    bmFilter ? "bg-amber-50 text-amber-500 border-amber-200" : "bg-white text-slate-400 border-slate-200 hover:bg-blue-50"
                  }`}>
                  ☆ <span className="hidden sm:inline text-xs">북마크</span>
                </button>
                <button
                  onClick={toggleAllCollapse}
                  title={allCollapsed ? "전체 펼치기" : "전체 접기"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-white text-slate-400 border-slate-200 hover:bg-blue-50"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                    style={{ transform: allCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <path d="M1 3.5l5.5 5.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline text-xs">{allCollapsed ? "전체 펼치기" : "전체 접기"}</span>
                </button>
              </div>
              <input type="text" placeholder="스크립트 검색…"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value.trim()); setShownCount(PAGE_SIZE); }}
                className="px-3 py-1.5 text-sm rounded-lg bg-white border border-slate-200 focus:border-cyan-400 outline-none w-44 md:w-56 placeholder:text-slate-300 transition-colors"
                style={{ fontFamily: "inherit" }} />
            </div>

            <div className="space-y-2">
              {visible.map(item => (
                <TxCard key={item.idx} item={item}
                  isActive={activeIdx === item.idx}
                  isBookmarked={bookmarks.has(item.idx)}
                  collapsed={collapsedSet.has(item.idx)}
                  onSeek={seekTo}
                  onToggleBm={toggleBm}
                  onToggleCollapse={toggleCollapse} />
              ))}
              {remaining > 0 && (
                <button onClick={() => setShownCount(c => c + PAGE_SIZE)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors bg-white border border-slate-200 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                  대화 {remaining}개 더 보기 ↓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── AUDIO PLAYER ── */}
      <AudioPlayer
        curTime={curTime}
        playing={playing}
        spdIdx={spdIdx}
        onSeek={v => { setCurTime(v); }}
        onTogglePlay={() => setPlaying(p => !p)}
        onCycleSpeed={() => setSpdIdx(i => (i + 1) % SPEEDS.length)}
      />

      {/* ── MODALS ── */}
      <JiraModal open={modal === "jira"} onClose={() => setModal(null)} />
      <Modal open={modal === "participants"} onClose={() => setModal(null)} title="회의 참여자" id="participants">
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {PARTICIPANTS.map((participant) => (
            <div key={participant.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: participant.color }}
              >
                {participant.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                <p className="text-xs text-slate-400">{participant.role}</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-600">참여 중</span>
            </div>
          ))}
        </div>
      </Modal>
      <RegenModal open={modal === "regen"} onClose={() => setModal(null)} onRegen={() => showToast("AI가 요약을 다시 생성하고 있습니다…", "#7C3AED")} />
      <TicketModal open={modal === "ticket"} onClose={() => setModal(null)}
        initTitle={ticketInit.title} initPerson={ticketInit.person}
        onIssue={title => showToast(`티켓 "${title.slice(0, 18)}…" 발행됨`, "#10B981")} />

      <Toast msg={toast.msg} color={toast.color} />
    </div>
  );
}
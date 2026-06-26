import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTab from '../components/MobileTab';

const MANUAL_MEETING_RECORDS_KEY = 'tiki_manual_minutes_records';
const PROJECTLIST_CHEVRON_COLOR = '#A0AFBF';

const stateLabels = {
  IDLE: '대기 중',
  UPLOADING: '업로드 중',
  PROCESSING: 'AI 분석 중',
  COMPLETED: '분석 완료',
  FAILED: '오류 발생',
};

const ROLE_MAP = {
  정아름: 'PM',
  김민수: 'Backend',
  송지영: 'PM',
  김소현: 'ML Engineer',
  채하율: 'Frontend',
  박디자이너: 'Designer',
  외부리서처A: 'QA',
};

const PARTICIPANT_COLOR_MAP = {
  정아름: '#0099CC',
  김민수: '#10B981',
  송지영: '#7C3AED',
  김소현: '#F59E0B',
  채하율: '#0EA5E9',
  박디자이너: '#EF4444',
  외부리서처A: '#5A6F8A',
};

const PARTICIPANT_COLORS = ['#0099CC', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9'];

const readManualMeetingRecords = () => {
  try {
    const raw = localStorage.getItem(MANUAL_MEETING_RECORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeManualMeetingRecords = (next) => {
  try {
    localStorage.setItem(MANUAL_MEETING_RECORDS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage write failures in local mock mode
  }
};

const formatDueDate = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '미정';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, '.');
  }
  return value;
};

const formatDisplayDate = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '-';
  return value;
};

function LucideIcon({ name, size = 14, color = 'currentColor', strokeWidth = 2, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };

  switch (name) {
    case 'x':
      return <svg {...common}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
    case 'check':
      return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'check-circle':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9 12.5 11 14.5 15.5 10" /></svg>;
    case 'circle':
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
    case 'arrow-up':
      return <svg {...common}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>;
    case 'alert-triangle':
      return <svg {...common}><path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
    case 'alert-circle':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>;
    case 'info':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 10v6" /><path d="M12 7h.01" /></svg>;
    case 'chevron-down':
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case 'pencil':
      return <svg {...common}><path d="m16.5 3.5 4 4L8 20l-4 1 1-4 11.5-13.5Z" /></svg>;
    default:
      return null;
  }
}

function Spinner({ size = 14, color = '#fff' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'tiki-spin 0.75s linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.25" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <style>{'@keyframes tiki-spin { to { transform: rotate(360deg); } }'}</style>
    </svg>
  );
}

function Toast({ msg, color }) {
  if (!msg) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-fit max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-full text-white text-xs font-semibold shadow-lg pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis"
      style={{ background: color }}
    >
      {msg}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, maxWidth = 448 }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4" style={{ background: 'rgba(13,27,42,0.45)' }}>
      <div className="self-center w-full rounded-2xl bg-white border border-[rgba(0,100,180,0.12)] shadow-[0_18px_50px_rgba(13,27,42,0.22)]" style={{ maxWidth }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,100,180,0.08)]">
          <h3 className="text-base font-bold text-[#0D1B2A]">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F8FAFF] text-[#5A6F8A] flex items-center justify-center">
            <LucideIcon name="x" size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[rgba(0,100,180,0.08)] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function IntegrationBadge({ svc, onClick }) {
  const done = svc.tickets.filter((t) => t.status === 'done').length;
  const total = svc.tickets.length;
  const isEmpty = done === 0;
  const allDone = total > 0 && done === total;

  return (
    <button
      type="button"
      onClick={() => onClick(svc)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer"
      style={{
        background: allDone ? 'rgba(16,185,129,0.06)' : isEmpty ? 'rgba(90,111,138,0.06)' : 'rgba(0,153,204,0.05)',
        borderColor: allDone ? 'rgba(16,185,129,0.35)' : isEmpty ? 'rgba(0,100,180,0.12)' : 'rgba(0,153,204,0.3)',
      }}
    >
      <span
        className="w-4 h-4 rounded flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ background: svc.iconBg, fontSize: 9 }}
      >
        {svc.iconLabel}
      </span>
      <span className="text-xs font-semibold text-slate-500">{svc.name}</span>
      <span className="text-xs">
        <span className="font-bold" style={{ color: allDone ? '#10B981' : isEmpty ? '#5A6F8A' : '#0099CC' }}>
          {done}
        </span>
        <span className="text-slate-400">/{total}</span>
      </span>
      {allDone && <span className="text-emerald-500"><LucideIcon name="check" size={12} /></span>}
    </button>
  );
}

function ServiceDetailModal({ open, onClose, svc, auditLog }) {
  if (!svc) return null;

  const done = svc.tickets.filter((t) => t.status === 'done').length;
  const total = svc.tickets.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const statusLabel = { done: '완료', progress: '진행 중', todo: '대기' };
  const statusCls = {
    done: 'bg-emerald-100 text-emerald-700',
    progress: 'bg-amber-100 text-amber-700',
    todo: 'bg-slate-100 text-slate-500',
  };

  const svcLogs = auditLog.filter((log) => log.svcId === svc.id);

  return (
    <Modal open={open} onClose={onClose} title={`${svc.name} 연동 현황`}>
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-slate-400">전체 진행률</span>
          <span className="text-xs font-bold text-slate-900">{done} / {total} 완료</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0099CC,#7C3AED)' }} />
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
        {svc.tickets.map((ticket) => (
          <div key={ticket.id} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border ${ticket.status === 'done' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
            <span className="flex-shrink-0">
              {ticket.status === 'done' ? (
                <LucideIcon name="check-circle" size={14} color="#10B981" />
              ) : ticket.status === 'progress' ? (
                <Spinner size={14} color="#F59E0B" />
              ) : (
                <LucideIcon name="circle" size={14} color="#94A3B8" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{ticket.id} · {ticket.title}</p>
              <p className="text-xs text-slate-400">{ticket.assignee}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusCls[ticket.status]}`}>{statusLabel[ticket.status]}</span>
          </div>
        ))}
      </div>

      {svcLogs.length > 0 && (
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(0,153,204,0.04)', border: '1px solid rgba(0,153,204,0.12)' }}>
          <p className="text-xs font-semibold text-slate-400 mb-2">발행 이력</p>
          {svcLogs.slice(0, 3).map((log, idx) => (
            <div key={`${log.time}-${idx}`} className="flex items-center gap-2 text-xs">
              <span className="text-emerald-500 flex-shrink-0"><LucideIcon name="arrow-up" size={12} /></span>
              <span className="text-slate-600 flex-1 truncate">{log.label}</span>
              <span className="text-slate-400 flex-shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function IssueButton({ onClick, issuingGlobal = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={issuingGlobal}
      className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-white text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer"
      style={{ background: 'linear-gradient(135deg,#0099CC,#7C3AED)', borderRadius: '10px', minWidth: 100 }}
    >
      {issuingGlobal ? (
        <>
          <Spinner size={12} color="#fff" />
          <span>연동 중...</span>
        </>
      ) : (
        <>
          연동하기
        </>
      )}
    </button>
  );
}

function IntegrationControlTower({ services, auditLog, onBadgeClick, onIssueOpen, isMobile, issuing }) {
  const totalDone = services.reduce((sum, svc) => sum + svc.tickets.filter((t) => t.status === 'done').length, 0);
  const totalTickets = services.reduce((sum, svc) => sum + svc.tickets.length, 0);
  const latestLog = auditLog[auditLog.length - 1] || null;

  return (
    <div
      className="lg:w-auto flex-shrink-0 rounded-2xl px-4 py-4"
      style={{ border: '1px solid rgba(0,100,180,0.12)', background: 'rgba(0,153,204,0.03)' }}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-400">연동 서비스 현황</p>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: totalDone === totalTickets ? 'rgba(16,185,129,0.1)' : 'rgba(0,153,204,0.1)',
              color: totalDone === totalTickets ? '#10B981' : '#0099CC',
            }}
          >
            {totalDone}/{totalTickets} 완료
          </span>
        </div>

        {!isMobile && latestLog && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
            <span className="text-xs text-slate-400">
              최근 발행: <span className="font-semibold text-slate-600">{latestLog.time}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {services.map((svc) => (
          <IntegrationBadge key={svc.id} svc={svc} onClick={onBadgeClick} />
        ))}

        <div className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />

        <IssueButton onClick={onIssueOpen} issuingGlobal={issuing} />
      </div>
    </div>
  );
}

function AgendaCompletionSection({ actions, onToggleAction }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const total = actions.length;
  const done = actions.filter((action) => action.status === 'done').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const achieved = total > 0 && done === total;
  const gaugeColor = achieved ? '#10B981' : '#0099CC';
  const size = 136;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const remaining = total - done;

  return (
    <section className="rounded-2xl bg-white px-5 py-5 md:px-7 md:py-6 overflow-hidden relative" style={{ border: '1px solid rgba(0,100,180,0.12)' }}>
      <div className="relative flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: gaugeColor }}>
            AGENDA PROGRESS
          </p>
          <p className="text-base md:text-lg font-bold text-slate-900">이번 회의, 할 일을 다 끝냈을까?</p>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="text-xs leading-none font-semibold px-2 py-[1px] rounded-full flex items-center justify-center text-center gap-[2px]"
            style={{ color: achieved ? '#10B981' : '#0099CC', background: achieved ? 'rgba(16,185,129,0.12)' : 'rgba(0,153,204,0.1)' }}
          >
            {achieved && <LucideIcon name="check-circle" size={8} color="#10B981" />}
            {achieved ? '목표 달성' : `${remaining}건 남음`}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="h-7 px-1 flex items-center justify-center cursor-pointer"
            style={{ color: achieved ? '#10B981' : '#0099CC', background: 'transparent' }}
            aria-label="의제 진행 접기/펼치기"
          >
            <LucideIcon name="chevron-down" size={12} color={PROJECTLIST_CHEVRON_COLOR} strokeWidth={2} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-30 md:ml-24">
          <div className="flex items-center gap-5 md:gap-0 md:flex-col md:items-center flex-shrink-0">
            <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,100,180,0.08)" strokeWidth={stroke} />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth={stroke}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-extrabold leading-none" style={{ color: gaugeColor }}>
                  {pct}
                  <span className="text-base font-bold">%</span>
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1.5">{done}/{total} 완료</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-32 bg-slate-100 flex-shrink-0" />

          <div className="min-w-0 w-full md:max-w-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-400">해야 할 일 상세</p>
              <p className="text-xs text-slate-300">{done}/{total}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {actions.map((action, idx) => {
                const isDone = action.status === 'done';
                return (
                  <button
                    key={`${action.text}-${idx}`}
                    type="button"
                    onClick={() => onToggleAction(idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all hover:-translate-y-0.5 cursor-pointer"
                    style={{ borderColor: isDone ? 'rgba(16,185,129,0.3)' : 'rgba(0,100,180,0.1)', background: isDone ? 'rgba(16,185,129,0.06)' : '#fff' }}
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors" style={{ background: isDone ? '#10B981' : 'rgba(0,100,180,0.08)' }}>
                      {isDone ? <LucideIcon name="check" size={11} color="#fff" /> : null}
                    </span>
                    <span className={`text-sm font-medium flex-1 min-w-0 truncate ${isDone ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                      {action.text}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{action.due || '미정'}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: isDone ? '#10B981' : '#5A6F8A', background: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(90,111,138,0.08)' }}>
                        {action.assignee}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
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

const PRIORITY_STYLE = {
  높음: { card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-500' },
  보통: { card: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-600' },
  낮음: { card: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-500' },
};

const ISSUE_CFG = {
  높음: { icon: 'alert-triangle', iconColor: '#EF4444', badge: 'bg-red-100 text-red-500', card: 'bg-red-50 border-red-200' },
  보통: { icon: 'alert-circle', iconColor: '#F59E0B', badge: 'bg-amber-100 text-amber-600', card: 'bg-amber-50 border-amber-200' },
  낮음: { icon: 'info', iconColor: '#64748B', badge: 'bg-slate-100 text-slate-500', card: 'bg-slate-50 border-slate-200' },
};

function buildInitialServices(minutes) {
  const baseActions = Array.isArray(minutes.actions) ? minutes.actions : [];
  const baseDecisions = Array.isArray(minutes.decisions) ? minutes.decisions : [];

  const jiraTickets = (baseActions.length > 0 ? baseActions : [{ text: '액션 아이템 없음', assignee: '미지정', checked: false }]).map((item, idx) => ({
    id: `MAN-${idx + 1}`,
    title: item.text || '액션 아이템',
    assignee: item.assignee || '미지정',
    status: item.checked ? 'done' : 'todo',
  }));

  const notionTickets = (baseDecisions.length > 0 ? baseDecisions : [{ text: '결정 사항 없음' }]).map((item, idx) => ({
    id: `DOC-${idx + 1}`,
    title: item.text || '결정 사항',
    assignee: '회의록',
    status: item.checked ? 'done' : 'progress',
  }));

  return [
    {
      id: 'jira',
      name: 'Jira',
      iconBg: '#0099CC',
      iconLabel: 'J',
      tickets: jiraTickets,
    },
    {
      id: 'notion',
      name: 'Notion',
      iconBg: '#0D1B2A',
      iconLabel: 'N',
      tickets: notionTickets,
    },
  ];
}

export default function MeetingManualDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState({ msg: '', color: '#10B981' });

  const [detailSvc, setDetailSvc] = useState(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueSvcId, setIssueSvcId] = useState('jira');
  const [issuing, setIssuing] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [participantsModalMembers, setParticipantsModalMembers] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({
    decisions: false,
    actions: false,
    issues: false,
    nextAgenda: false,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState({
    keywordsInput: '',
    summaryInput: '',
    decisionsDraft: [],
    actionsDraft: [],
    issuesDraft: [],
    nextAgendaInput: '',
  });

  const recordId = location.state?.recordId || location.state?.meetingId || '';

  const initialRecord = useMemo(() => {
    const all = readManualMeetingRecords();
    if (recordId && all[recordId]) return all[recordId];

    const fromMeeting = location.state?.meeting;
    if (fromMeeting && typeof fromMeeting === 'object') {
      return {
        id: recordId || String(fromMeeting.id || '').trim() || `manual-${Date.now()}`,
        projectId: String(location.state?.projectId || '').trim(),
        projectName: location.state?.projectName || '',
        title: fromMeeting.title || '회의 제목 없음',
        date: fromMeeting.date || '-',
        rawDate: '',
        type: fromMeeting.type || '정기',
        participants: Array.isArray(fromMeeting.participants) ? fromMeeting.participants : [],
        summary: fromMeeting.summary || '',
        keywords: Array.isArray(fromMeeting.tags)
          ? fromMeeting.tags.map((tag) => String(tag || '').replace(/^#/, '')).filter(Boolean)
          : [],
        decisions: [],
        actions: [],
        issues: [],
        nextAgenda: '',
        createdAt: new Date().toISOString(),
      };
    }

    const values = Object.values(all);
    if (values.length === 0) return null;

    return values.sort((left, right) => {
      const leftTs = new Date(left?.createdAt || 0).getTime();
      const rightTs = new Date(right?.createdAt || 0).getTime();
      return rightTs - leftTs;
    })[0];
  }, [location.state, recordId]);

  const [minutes, setMinutes] = useState(initialRecord);
  const [services, setServices] = useState(() => (initialRecord ? buildInitialServices(initialRecord) : []));
  const [auditLog, setAuditLog] = useState(() => (
    initialRecord
      ? [{ svcId: 'notion', label: '직접 작성 회의록 저장', time: formatDisplayDate(initialRecord.date || initialRecord.rawDate), user: '작성자' }]
      : []
  ));

  const summaryActions = useMemo(
    () => (Array.isArray(minutes?.actions) ? minutes.actions : []).map((action) => ({
      text: action.text,
      assignee: action.assignee || '미지정',
      due: formatDueDate(action.dueDate),
      status: action.checked ? 'done' : 'todo',
    })),
    [minutes]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = useCallback((msg, color = '#10B981') => {
    setToast({ msg, color });
    setTimeout(() => setToast({ msg: '', color }), 2200);
  }, []);

  const persistMinutes = useCallback((nextMinutes) => {
    const key = String(nextMinutes?.id || '').trim();
    if (!key) return;
    const all = readManualMeetingRecords();
    all[key] = nextMinutes;
    writeManualMeetingRecords(all);
  }, []);

  const handleToggleAction = useCallback((index) => {
    setMinutes((prev) => {
      if (!prev || !Array.isArray(prev.actions)) return prev;
      const nextActions = prev.actions.map((action, idx) => {
        if (idx !== index) return action;
        return { ...action, checked: !action.checked };
      });
      const next = { ...prev, actions: nextActions };
      persistMinutes(next);
      return next;
    });

    setServices((prev) =>
      prev.map((svc) => {
        if (svc.id !== 'jira') return svc;
        return {
          ...svc,
          tickets: svc.tickets.map((ticket, idx) => {
            if (idx !== index) return ticket;
            return { ...ticket, status: ticket.status === 'done' ? 'todo' : 'done' };
          }),
        };
      })
    );
  }, [persistMinutes]);

  const backToMeetings = () => {
    const pid = String(minutes?.projectId || location.state?.projectId || '').trim();
    if (pid) {
      navigate(`/project/${pid}/meetings`);
      return;
    }
    navigate('/project-list');
  };

  const openParticipantsModal = useCallback((members = []) => {
    const normalized = Array.isArray(members) ? members.filter(Boolean) : [];
    setParticipantsModalMembers(normalized);
    setIsParticipantsModalOpen(true);
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const buildDraftFromMinutes = useCallback((source) => {
    const safe = source || {};
    const baseActions = Array.isArray(safe.actions) ? safe.actions : [];
    const baseDecisions = Array.isArray(safe.decisions) ? safe.decisions : [];
    const baseIssues = Array.isArray(safe.issues) ? safe.issues : [];
    return {
      keywordsInput: (Array.isArray(safe.keywords) ? safe.keywords : []).join(', '),
      summaryInput: String(safe.summary || ''),
      decisionsDraft: baseDecisions.map((item) => ({ text: item.text || '', checked: Boolean(item.checked) })),
      actionsDraft: baseActions.map((item) => ({
        text: item.text || '',
        assignee: item.assignee || '',
        dueDate: item.dueDate || '',
        checked: Boolean(item.checked),
      })),
      issuesDraft: baseIssues.map((item) => ({
        text: item.text || '',
        priority: item.priority || '보통',
      })),
      nextAgendaInput: String(safe.nextAgenda || ''),
    };
  }, []);

  const beginEditMode = useCallback(() => {
    setEditDraft(buildDraftFromMinutes(minutes));
    setIsEditMode(true);
  }, [buildDraftFromMinutes, minutes]);

  const endEditMode = useCallback(() => {
    setIsEditMode(false);
  }, []);

  const applyMinutesPatch = useCallback((patch, successMessage) => {
    setMinutes((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistMinutes(next);
      return next;
    });
    if (successMessage) {
      showToast(successMessage);
    }
  }, [persistMinutes, showToast]);

  const saveSummarySection = useCallback(() => {
    const nextKeywords = editDraft.keywordsInput
      .split(/[\n,]/)
      .map((item) => item.trim().replace(/^#/, ''))
      .filter(Boolean);
    applyMinutesPatch({
      keywords: nextKeywords,
      summary: editDraft.summaryInput.trim(),
    }, '협업 인사이트가 저장되었습니다.');
  }, [applyMinutesPatch, editDraft.keywordsInput, editDraft.summaryInput]);

  const saveDecisionsSection = useCallback(() => {
    const nextDecisions = editDraft.decisionsDraft
      .map((item) => ({ text: String(item.text || '').trim(), checked: Boolean(item.checked) }))
      .filter((item) => item.text);
    applyMinutesPatch({ decisions: nextDecisions }, '주요 결정이 저장되었습니다.');

    setServices((prev) => prev.map((svc) => {
      if (svc.id !== 'notion') return svc;
      const tickets = (nextDecisions.length > 0 ? nextDecisions : [{ text: '결정 사항 없음', checked: false }]).map((item, idx) => ({
        id: `DOC-${idx + 1}`,
        title: item.text || '결정 사항',
        assignee: '회의록',
        status: item.checked ? 'done' : 'progress',
      }));
      return { ...svc, tickets };
    }));
  }, [applyMinutesPatch, editDraft.decisionsDraft]);

  const updateDecisionDraftItem = useCallback((index, key, value) => {
    setEditDraft((prev) => ({
      ...prev,
      decisionsDraft: prev.decisionsDraft.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }, []);

  const addDecisionDraftItem = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      decisionsDraft: [...prev.decisionsDraft, { text: '', checked: false }],
    }));
  }, []);

  const removeDecisionDraftItem = useCallback((index) => {
    setEditDraft((prev) => ({
      ...prev,
      decisionsDraft: prev.decisionsDraft.filter((_, idx) => idx !== index),
    }));
  }, []);

  const resetSummarySection = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      keywordsInput: (Array.isArray(minutes?.keywords) ? minutes.keywords : []).join(', '),
      summaryInput: String(minutes?.summary || ''),
    }));
    showToast('협업 인사이트를 초기화했습니다.');
  }, [minutes, showToast]);

  const resetDecisionsSection = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      decisionsDraft: (Array.isArray(minutes?.decisions) ? minutes.decisions : []).map((item) => ({ text: item.text || '', checked: Boolean(item.checked) })),
    }));
    showToast('주요 결정을 초기화했습니다.');
  }, [minutes, showToast]);

  const resetActionsSection = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      actionsDraft: (Array.isArray(minutes?.actions) ? minutes.actions : []).map((item) => ({
        text: item.text || '',
        assignee: item.assignee || '',
        dueDate: item.dueDate || '',
        checked: Boolean(item.checked),
      })),
    }));
    showToast('해야 할 일을 초기화했습니다.');
  }, [minutes, showToast]);

  const resetIssuesSection = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      issuesDraft: (Array.isArray(minutes?.issues) ? minutes.issues : []).map((item) => ({
        text: item.text || '',
        priority: item.priority || '보통',
      })),
    }));
    showToast('이슈/리스크를 초기화했습니다.');
  }, [minutes, showToast]);

  const resetNextAgendaSection = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      nextAgendaInput: String(minutes?.nextAgenda || ''),
    }));
    showToast('다음 안건을 초기화했습니다.');
  }, [minutes, showToast]);

  const updateActionDraftItem = useCallback((index, key, value) => {
    setEditDraft((prev) => ({
      ...prev,
      actionsDraft: prev.actionsDraft.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }, []);

  const addActionDraftItem = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      actionsDraft: [...prev.actionsDraft, { text: '', assignee: '', dueDate: '', checked: false }],
    }));
  }, []);

  const removeActionDraftItem = useCallback((index) => {
    setEditDraft((prev) => ({
      ...prev,
      actionsDraft: prev.actionsDraft.filter((_, idx) => idx !== index),
    }));
  }, []);

  const saveActionsSection = useCallback(() => {
    const nextActions = editDraft.actionsDraft
      .map((item) => ({
        text: String(item.text || '').trim(),
        assignee: String(item.assignee || '').trim(),
        dueDate: String(item.dueDate || '').trim(),
        checked: Boolean(item.checked),
      }))
      .filter((item) => item.text);

    applyMinutesPatch({ actions: nextActions }, '해야 할 일이 저장되었습니다.');

    setServices((prev) => prev.map((svc) => {
      if (svc.id !== 'jira') return svc;
      const tickets = (nextActions.length > 0 ? nextActions : [{ text: '액션 아이템 없음', assignee: '미지정', checked: false }]).map((item, idx) => ({
        id: `MAN-${idx + 1}`,
        title: item.text || '액션 아이템',
        assignee: item.assignee || '미지정',
        status: item.checked ? 'done' : 'todo',
      }));
      return { ...svc, tickets };
    }));
  }, [applyMinutesPatch, editDraft.actionsDraft]);

  const updateIssueDraftItem = useCallback((index, key, value) => {
    setEditDraft((prev) => ({
      ...prev,
      issuesDraft: prev.issuesDraft.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }, []);

  const addIssueDraftItem = useCallback(() => {
    setEditDraft((prev) => ({
      ...prev,
      issuesDraft: [...prev.issuesDraft, { text: '', priority: '보통' }],
    }));
  }, []);

  const removeIssueDraftItem = useCallback((index) => {
    setEditDraft((prev) => ({
      ...prev,
      issuesDraft: prev.issuesDraft.filter((_, idx) => idx !== index),
    }));
  }, []);

  const saveIssuesSection = useCallback(() => {
    const nextIssues = editDraft.issuesDraft
      .map((item) => ({
        text: String(item.text || '').trim(),
        priority: item.priority || '보통',
      }))
      .filter((item) => item.text);

    applyMinutesPatch({ issues: nextIssues }, '이슈/리스크가 저장되었습니다.');
  }, [applyMinutesPatch, editDraft.issuesDraft]);

  const saveNextAgendaSection = useCallback(() => {
    applyMinutesPatch({ nextAgenda: editDraft.nextAgendaInput.trim() }, '다음 안건이 저장되었습니다.');
  }, [applyMinutesPatch, editDraft.nextAgendaInput]);

  const handleIssue = async () => {
    if (issuing) return;

    setIssuing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));

    const targetSvc = issueSvcId === 'notion' ? 'notion' : 'jira';

    setServices((prev) =>
      prev.map((svc) => {
        if (svc.id !== targetSvc) return svc;
        let marked = false;
        return {
          ...svc,
          tickets: svc.tickets.map((ticket) => {
            if (!marked && ticket.status !== 'done') {
              marked = true;
              return { ...ticket, status: 'done' };
            }
            return ticket;
          }),
        };
      })
    );

    const now = new Date();
    const time = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAuditLog((prev) => [...prev, { svcId: targetSvc, label: '직접 작성 항목 발행', time, user: '작성자' }]);

    setIssuing(false);
    setIssueOpen(false);
    showToast(targetSvc === 'jira' ? 'Jira에 발행되었습니다.' : 'Notion에 발행되었습니다.');
  };

  if (!minutes) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] overflow-x-hidden pt-20 pb-20 md:pb-0 flex flex-col">
        <Header isMobile={isMobile} phase="IDLE" stateLabels={stateLabels} />
        <main className="flex-1 w-full px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-3xl mx-auto rounded-2xl border border-[rgba(0,100,180,0.12)] bg-white p-6 text-center">
            <h1 className="text-xl font-bold text-[#0D1B2A]">저장된 회의록을 찾을 수 없습니다.</h1>
            <p className="text-sm text-[#5A6F8A] mt-2">회의 목록으로 이동해서 다시 확인해 주세요.</p>
            <button
              type="button"
              onClick={backToMeetings}
              className="mt-5 px-4 py-2 rounded-lg bg-[#0099CC] text-white text-sm font-semibold hover:bg-[#007EA7]"
            >
              회의 목록으로 이동
            </button>
          </div>
        </main>
        {!isMobile && <Footer />}
        {isMobile && <MobileTab active={activeTab} onChange={setActiveTab} />}
      </div>
    );
  }

  const participants = Array.isArray(minutes.participants) ? minutes.participants : [];
  const visibleParticipants = participants.slice(0, 4);
  const hiddenCount = Math.max(participants.length - visibleParticipants.length, 0);
  const hasRichContent = Boolean(
    String(minutes.summary || '').trim() ||
      (Array.isArray(minutes.keywords) && minutes.keywords.length > 0) ||
      (Array.isArray(minutes.decisions) && minutes.decisions.length > 0) ||
      (Array.isArray(minutes.actions) && minutes.actions.length > 0) ||
      (Array.isArray(minutes.issues) && minutes.issues.length > 0) ||
      String(minutes.nextAgenda || '').trim()
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#F8FAFF',
        fontFamily: '"Pretendard Variable","Pretendard",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        color: '#0D1B2A',
      }}
    >
      <Header isMobile={isMobile} phase="IDLE" stateLabels={stateLabels} />

      <div className="px-4 md:px-8 lg:px-12 pt-24 pb-0 max-w-screen-xl mx-auto">
        <button type="button" onClick={backToMeetings} className="text-sm text-[#5A6F8A] hover:text-[#0D1B2A] mb-4">
          ← 돌아가기
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-400">{formatDisplayDate(minutes.date || minutes.rawDate)}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-400">{minutes.type || '정기'}</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-snug mb-3">
                {minutes.projectName ? `[${minutes.projectName}] ` : ''}
                {minutes.title}
              </h1>
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {visibleParticipants.map((name, idx) => (
                    <button
                      type="button"
                      key={`${name}-${idx}`}
                      onClick={() => openParticipantsModal(participants)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white"
                      style={{ background: PARTICIPANT_COLOR_MAP[name] || PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length] }}
                      title={name}
                    >
                      {name[0] || '?'}
                    </button>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => openParticipantsModal(participants)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white bg-slate-400"
                    >
                      +{hiddenCount}
                    </button>
                  )}
                </div>
                <span className="text-xs font-semibold text-cyan-600">총 {participants.length}명 참여</span>
              </div>
            </div>

            <IntegrationControlTower
              services={services}
              auditLog={auditLog}
              onBadgeClick={setDetailSvc}
              onIssueOpen={() => setIssueOpen(true)}
              isMobile={isMobile}
              issuing={issuing}
            />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 pt-4 max-w-screen-xl mx-auto">
        <AgendaCompletionSection actions={summaryActions} onToggleAction={handleToggleAction} />
      </div>

      <div className="px-4 md:px-8 lg:px-12 py-5 max-w-screen-xl mx-auto pb-32">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden h-full flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <span className="text-sm font-bold text-slate-900">직접 작성 회의록</span>
            <div className="flex items-center gap-2">
              {isEditMode && <span className="text-[11px] font-semibold text-[#0099CC]">편집 모드</span>}
              <button
                type="button"
                onClick={() => (isEditMode ? endEditMode() : beginEditMode())}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  isEditMode
                    ? 'border-[#0099CC]/35 bg-[#EEF3FF] text-[#0099CC]'
                    : 'border-[rgba(0,100,180,0.14)] text-[#5A6F8A] hover:bg-[#F8FAFF] hover:text-[#0D1B2A]'
                }`}
                aria-label="직접 작성 회의록 편집"
              >
                <LucideIcon name="pencil" size={14} />
              </button>
            </div>
          </div>

          <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
            {!hasRichContent && (
              <div className="rounded-xl p-3 border border-[#FDE68A] bg-[#FFFBEB]">
                <p className="text-sm font-semibold text-[#92400E]">상세 입력 항목이 비어 있습니다.</p>
                <p className="text-xs text-[#B45309] mt-1">
                  현재는 기본 정보만 저장된 상태입니다. 직접 작성 화면에서 요약/결정/액션/이슈를 입력하면 여기 그대로 표시됩니다.
                </p>
              </div>
            )}

            <div className="rounded-xl p-4 space-y-3 bg-blue-50 border border-blue-100">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">협업 인사이트</p>
                {isEditMode && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={resetSummarySection}
                      className="px-2.5 py-1 rounded-lg border border-[rgba(0,100,180,0.14)] text-[#5A6F8A] text-[11px] font-semibold hover:bg-[#F8FAFF]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={saveSummarySection}
                      className="px-2.5 py-1 rounded-lg bg-[#0099CC] text-white text-[11px] font-semibold hover:bg-[#007EA7]"
                    >
                      저장
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">핵심 키워드</p>
                {isEditMode ? (
                  <input
                    value={editDraft.keywordsInput}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, keywordsInput: e.target.value }))}
                    placeholder="예: STT, Jira, 배포"
                    className="w-full px-3 py-2 text-sm bg-white border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(minutes.keywords) ? minutes.keywords : []).length > 0 ? (
                      minutes.keywords.map((word) => (
                        <span key={word} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                          {String(word).startsWith('#') ? word : `#${word}`}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">키워드가 없습니다.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-blue-100 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">전체 요약</p>
                {isEditMode ? (
                  <textarea
                    value={editDraft.summaryInput}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, summaryInput: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 text-sm bg-white border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC] resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{minutes.summary || '요약 내용이 없습니다.'}</p>
                )}
              </div>
            </div>

            <Divider label="협업" />

            <section className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">주요 결정</p>
                <div className="flex items-center gap-1.5">
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={resetDecisionsSection}
                        className="px-2.5 py-1 rounded-lg border border-[rgba(0,100,180,0.14)] text-[#5A6F8A] text-[11px] font-semibold hover:bg-[#F8FAFF]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={saveDecisionsSection}
                        className="px-2.5 py-1 rounded-lg bg-[#0099CC] text-white text-[11px] font-semibold hover:bg-[#007EA7]"
                      >
                        저장
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection('decisions')}
                    className="w-7 h-7 rounded-lg text-[#5A6F8A] hover:bg-[#F8FAFF] flex items-center justify-center"
                    aria-label="주요 결정 접기/펼치기"
                  >
                    <LucideIcon name="chevron-down" size={14} className={`transition-transform ${collapsedSections.decisions ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              {!collapsedSections.decisions && (
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      {editDraft.decisionsDraft.map((item, idx) => (
                        <div key={`edit-decision-${idx}`} className="rounded-xl border border-[rgba(0,100,180,0.1)] bg-white p-3 flex items-center gap-2">
                          <input
                            value={item.text}
                            onChange={(e) => updateDecisionDraftItem(idx, 'text', e.target.value)}
                            placeholder="결정 사항"
                            className="flex-1 px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                          />
                          <button
                            type="button"
                            onClick={() => removeDecisionDraftItem(idx)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:bg-[#FEF2F2]"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addDecisionDraftItem}
                        className="px-3 py-1.5 rounded-lg bg-[#EEF3FF] text-[#0099CC] text-xs font-semibold hover:bg-[#DCEAFF]"
                      >
                        + 주요 결정 추가
                      </button>
                    </>
                  ) : (
                    <>
                      {(Array.isArray(minutes.decisions) ? minutes.decisions : []).length > 0 ? (
                        minutes.decisions.map((item, idx) => (
                          <div key={`${item.text}-${idx}`} className="group p-2.5 rounded-lg hover:bg-blue-50 transition-colors">
                            <p className={`text-sm leading-relaxed ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">등록된 결정이 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <Divider label="인사이트" />

            <section className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">해야 할 일</p>
                <div className="flex items-center gap-1.5">
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={resetActionsSection}
                        className="px-2.5 py-1 rounded-lg border border-[rgba(0,100,180,0.14)] text-[#5A6F8A] text-[11px] font-semibold hover:bg-[#F8FAFF]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={saveActionsSection}
                        className="px-2.5 py-1 rounded-lg bg-[#0099CC] text-white text-[11px] font-semibold hover:bg-[#007EA7]"
                      >
                        저장
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection('actions')}
                    className="w-7 h-7 rounded-lg text-[#5A6F8A] hover:bg-[#F8FAFF] flex items-center justify-center"
                    aria-label="해야 할 일 접기/펼치기"
                  >
                    <LucideIcon name="chevron-down" size={14} className={`transition-transform ${collapsedSections.actions ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              {!collapsedSections.actions && (
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      {editDraft.actionsDraft.map((item, idx) => (
                        <div key={`edit-action-${idx}`} className="rounded-xl border border-[rgba(0,100,180,0.1)] bg-white p-3 space-y-2">
                          <input
                            value={item.text}
                            onChange={(e) => updateActionDraftItem(idx, 'text', e.target.value)}
                            placeholder="해야 할 일"
                            className="w-full px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                            <input
                              value={item.assignee}
                              onChange={(e) => updateActionDraftItem(idx, 'assignee', e.target.value)}
                              placeholder="담당자"
                              className="w-full px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                            />
                            <input
                              type="date"
                              value={item.dueDate}
                              onChange={(e) => updateActionDraftItem(idx, 'dueDate', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                            />
                            <label className="inline-flex items-center gap-1.5 text-xs text-[#5A6F8A]">
                              <input
                                type="checkbox"
                                checked={Boolean(item.checked)}
                                onChange={(e) => updateActionDraftItem(idx, 'checked', e.target.checked)}
                              />
                              완료
                            </label>
                            <button
                              type="button"
                              onClick={() => removeActionDraftItem(idx)}
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:bg-[#FEF2F2]"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addActionDraftItem}
                        className="px-3 py-1.5 rounded-lg bg-[#EEF3FF] text-[#0099CC] text-xs font-semibold hover:bg-[#DCEAFF]"
                      >
                        + 해야 할 일 추가
                      </button>
                    </>
                  ) : (
                    <>
                      {(Array.isArray(minutes.actions) ? minutes.actions : []).length > 0 ? (
                        minutes.actions.map((item, idx) => (
                          <div key={`${item.text}-${idx}`} className={`rounded-xl border px-3 py-2.5 ${item.checked ? 'border-[#A7E8C5] bg-[#ECFDF5]' : 'border-[rgba(0,100,180,0.1)] bg-white'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.checked)}
                                  onChange={() => handleToggleAction(idx)}
                                  className="mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${item.checked ? 'text-[#15803D] line-through' : 'text-[#0D1B2A]'}`}>{item.text}</p>
                                  <p className="text-xs text-[#7C8EA6] mt-1">{[(item.assignee || '미지정'), formatDueDate(item.dueDate)].join(' · ')}</p>
                                </div>
                              </div>
                              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${item.checked ? 'bg-[#D1FAE5] text-[#15803D]' : 'bg-[#EEF3FF] text-[#0099CC]'}`}>
                                {item.checked ? '완료' : '진행 중'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">등록된 액션 아이템이 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">이슈 & 리스크</p>
                <div className="flex items-center gap-1.5">
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={resetIssuesSection}
                        className="px-2.5 py-1 rounded-lg border border-[rgba(0,100,180,0.14)] text-[#5A6F8A] text-[11px] font-semibold hover:bg-[#F8FAFF]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={saveIssuesSection}
                        className="px-2.5 py-1 rounded-lg bg-[#0099CC] text-white text-[11px] font-semibold hover:bg-[#007EA7]"
                      >
                        저장
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection('issues')}
                    className="w-7 h-7 rounded-lg text-[#5A6F8A] hover:bg-[#F8FAFF] flex items-center justify-center"
                    aria-label="이슈 리스크 접기/펼치기"
                  >
                    <LucideIcon name="chevron-down" size={14} className={`transition-transform ${collapsedSections.issues ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              {!collapsedSections.issues && (
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      {editDraft.issuesDraft.map((issue, idx) => (
                        <div key={`edit-issue-${idx}`} className="rounded-xl border border-[rgba(0,100,180,0.1)] bg-white p-3 space-y-2">
                          <input
                            value={issue.text}
                            onChange={(e) => updateIssueDraftItem(idx, 'text', e.target.value)}
                            placeholder="이슈/리스크 내용"
                            className="w-full px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={issue.priority}
                              onChange={(e) => updateIssueDraftItem(idx, 'priority', e.target.value)}
                              className="px-3 py-2 text-sm border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC]"
                            >
                              <option value="높음">높음</option>
                              <option value="보통">보통</option>
                              <option value="낮음">낮음</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeIssueDraftItem(idx)}
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:bg-[#FEF2F2]"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addIssueDraftItem}
                        className="px-3 py-1.5 rounded-lg bg-[#EEF3FF] text-[#0099CC] text-xs font-semibold hover:bg-[#DCEAFF]"
                      >
                        + 이슈 추가
                      </button>
                    </>
                  ) : (
                    <>
                      {(Array.isArray(minutes.issues) ? minutes.issues : []).length > 0 ? (
                        minutes.issues.map((issue, idx) => {
                          const style = ISSUE_CFG[issue.priority] || ISSUE_CFG.보통;
                          return (
                            <div key={`${issue.text}-${idx}`} className={`flex items-start gap-3 p-3 rounded-xl border ${style.card}`}>
                              <span className="flex-shrink-0 mt-0.5">
                                <LucideIcon name={style.icon} size={16} color={style.iconColor} />
                              </span>
                              <p className="flex-1 text-sm text-slate-800 leading-relaxed">{issue.text}</p>
                              <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${style.badge}`}>{issue.priority}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-500">등록된 이슈/리스크가 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">다음 회의 안건</p>
                <div className="flex items-center gap-1.5">
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={resetNextAgendaSection}
                        className="px-2.5 py-1 rounded-lg border border-[rgba(0,100,180,0.14)] text-[#5A6F8A] text-[11px] font-semibold hover:bg-[#F8FAFF]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={saveNextAgendaSection}
                        className="px-2.5 py-1 rounded-lg bg-[#0099CC] text-white text-[11px] font-semibold hover:bg-[#007EA7]"
                      >
                        저장
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection('nextAgenda')}
                    className="w-7 h-7 rounded-lg text-[#5A6F8A] hover:bg-[#F8FAFF] flex items-center justify-center"
                    aria-label="다음 안건 접기/펼치기"
                  >
                    <LucideIcon name="chevron-down" size={14} className={`transition-transform ${collapsedSections.nextAgenda ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              {!collapsedSections.nextAgenda && (
                <div className="rounded-xl p-3 space-y-2 bg-cyan-50/60 border border-cyan-100">
                  {isEditMode ? (
                    <textarea
                      value={editDraft.nextAgendaInput}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, nextAgendaInput: e.target.value }))}
                      rows={4}
                      placeholder="한 줄에 한 개씩 입력해 주세요."
                      className="w-full px-3 py-2 text-sm bg-white border border-[rgba(0,100,180,0.12)] rounded-lg focus:outline-none focus:border-[#0099CC] resize-none"
                    />
                  ) : (
                    <>
                      {String(minutes.nextAgenda || '').trim() ? (
                        String(minutes.nextAgenda)
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line, idx) => (
                            <div key={`${line}-${idx}`} className="flex items-start gap-2.5">
                              <span className="flex-shrink-0 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white mt-0.5 bg-cyan-500" style={{ fontSize: 10 }}>
                                {idx + 1}
                              </span>
                              <p className="text-sm text-slate-800 leading-relaxed">{line}</p>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-slate-500">다음 안건이 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {!isMobile && <Footer />}
      {isMobile && <MobileTab active={activeTab} onChange={setActiveTab} />}

      <ServiceDetailModal open={!!detailSvc} onClose={() => setDetailSvc(null)} svc={detailSvc} auditLog={auditLog} />

      <Modal
        open={issueOpen}
        onClose={issuing ? undefined : () => setIssueOpen(false)}
        title="항목 연동하기"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setIssueOpen(false)}
              disabled={issuing}
              className="text-sm font-semibold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing}
              className="text-sm font-bold px-5 py-2 rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#0099CC,#7C3AED)', minWidth: 120 }}
            >
              {issuing ? (
                <>
                  <Spinner size={13} color="#fff" />
                  <span>연동 중...</span>
                </>
              ) : (
                '연동하기'
              )}
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">보낼 서비스</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'jira', name: 'Jira', iconBg: '#0099CC', iconLabel: 'J' },
              { id: 'notion', name: 'Notion', iconBg: '#0D1B2A', iconLabel: 'N' },
            ].map((svc) => {
              const selected = issueSvcId === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setIssueSvcId(svc.id)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{
                    borderColor: selected ? '#0099CC' : 'rgba(0,100,180,0.14)',
                    background: selected ? 'rgba(0,153,204,0.06)' : '#fff',
                    color: selected ? '#0099CC' : '#334155',
                  }}
                >
                  <span className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px]" style={{ background: svc.iconBg }}>{svc.iconLabel}</span>
                  <span>{svc.name}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl p-3 border border-[rgba(0,100,180,0.12)] bg-[#F8FAFF]">
            <p className="text-xs text-slate-500">미완료 항목 1건을 선택한 서비스에 연동합니다.</p>
          </div>
        </div>
      </Modal>

      {isParticipantsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-[#0D1B2A]/40 backdrop-blur-[2px]"
            onClick={() => setIsParticipantsModalOpen(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-3xl border border-[rgba(0,100,180,0.12)] bg-white shadow-2xl overflow-hidden"
            style={{ maxHeight: isMobile ? '72vh' : '80vh' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">회의 참여자</p>
              <button
                type="button"
                onClick={() => setIsParticipantsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="참여자 팝업 닫기"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-xs text-slate-400 mb-2">총 {participantsModalMembers.length}명 참여</p>
              <div className="space-y-2 pr-1">
                {participantsModalMembers.length > 0 ? (
                  participantsModalMembers.map((name, idx) => (
                    <div
                      key={`${name}-${idx}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: PARTICIPANT_COLOR_MAP[name] || PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length] }}
                      >
                        {String(name || '?').slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-400">{ROLE_MAP[name] || 'Team Member'}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-600">참여 중</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#7C8EA6]">참여자 정보가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} color={toast.color} />
    </div>
  );
}

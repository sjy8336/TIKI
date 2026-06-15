import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTab from '../components/MobileTab';

const icons = {
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z", "M17 21v-8H7v8", "M7 3v5h8"],
  checkCircle: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"],
  refreshCw: ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0 1 14.85-3.36L23 10", "M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
  zap: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
};

function IIcon({ name, size = 16, className = "", color = "currentColor", sw = 2 }) {
  const paths = icons[name];
  if (!paths) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths.map((d, idx) => (
        <path key={idx} d={d} />
      ))}
    </svg>
  );
}

const Configuration = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const INITIAL_STATE = {
    jiraDomain: '',
    jiraEmail: '',
    jiraToken: '',
    notionDbId: '',
    notionToken: '',
    dueDate: 'YYYY-MM-DD',
    autoAssign: '',
    filterChat: true,
    customRules: ''
  };

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [status, setStatus] = useState({ jira: 'disconnected', notion: 'disconnected' });
  const [showToast, setShowToast] = useState(false);
  const [guideModal, setGuideModal] = useState(null);
  const [showGuideDetails, setShowGuideDetails] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const jiraReady =
    formData.jiraDomain.trim() &&
    isValidEmail(formData.jiraEmail.trim()) &&
    formData.jiraToken.trim();
  const notionReady = formData.notionDbId.trim() && formData.notionToken.trim();

  const testConnection = (tool) => {
    const canTest = tool === 'jira' ? jiraReady : notionReady;
    if (!canTest) return;

    setStatus(prev => ({ ...prev, [tool]: 'testing' }));
    setTimeout(() => setStatus(prev => ({ ...prev, [tool]: 'connected' })), 1500);
  };

  const handleReset = () => {
    setFormData(INITIAL_STATE);
    setShowConfirmModal(false);
  };

  const openGuideModal = (type) => {
    setGuideModal(type);
    setShowGuideDetails(false);
  };

  const previewPrompt = `[팀 컨벤션 시스템 프롬프트]\n- 기한 포맷: ${formData.dueDate}\n- 자동 배정: ${formData.autoAssign || '미설정'}\n- 잡담 필터링: ${formData.filterChat ? '활성화' : '불가'}\n- 규칙: ${formData.customRules || '없음'}`;

  const stateLabels = {
    IDLE: '대기 중',
    UPLOADING: '업로드 중',
    PROCESSING: 'AI 분석 중',
    COMPLETED: '분석 완료',
    FAILED: '오류 발생',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] pt-20 pb-40 md:pb-32 font-sans text-[#0D1B2A] flex flex-col">
      <Header isMobile={isMobile} phase="IDLE" stateLabels={stateLabels} />

      <div className="p-6 max-w-6xl mx-auto w-full flex-1">
        <h1 className="text-2xl font-bold mb-8">프로젝트 설정</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 xl:col-span-7 grid gap-6 auto-rows-fr">
            <div className="bg-white p-6 rounded-xl border border-[rgba(0,100,180,0.12)] shadow-sm space-y-4 h-full">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Jira 연동</h2>
                <div className={`flex items-center gap-2 ${status.jira === 'connected' ? 'text-green-500' : status.jira === 'testing' ? 'text-yellow-500' : 'text-gray-400'}`}>
                  {status.jira === 'testing' && <IIcon name="refreshCw" className="animate-spin" size={16} />}
                  <span className="text-xs uppercase font-bold">{status.jira}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6F8A] mb-1">Jira 도메인</label>
                <input
                  type="text"
                  value={formData.jiraDomain}
                  placeholder="company.atlassian.net"
                  className="w-full p-2 border rounded-lg"
                  onChange={(e) => updateField('jiraDomain', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6F8A] mb-1">관리자 이메일</label>
                <input
                  type="email"
                  value={formData.jiraEmail}
                  placeholder="admin@company.com"
                  className="w-full p-2 border rounded-lg"
                  onChange={(e) => updateField('jiraEmail', e.target.value)}
                />
                {formData.jiraEmail.trim() && !isValidEmail(formData.jiraEmail.trim()) && (
                  <p className="mt-1 text-xs text-[#DC2626]">이메일 형식이 올바르지 않습니다.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6F8A] mb-1">API 토큰</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.jiraToken}
                    placeholder="Jira API Token"
                    className="flex-1 p-2 border rounded-lg"
                    onChange={(e) => updateField('jiraToken', e.target.value)}
                  />
                  <button
                    onClick={() => openGuideModal('jira')}
                    className="p-2 text-gray-400 hover:text-[#0099CC]"
                    aria-label="Jira API 토큰 발급 가이드"
                  >
                    <IIcon name="info" size={20} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => testConnection('jira')}
                disabled={!jiraReady}
                className={`mt-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  jiraReady ? 'bg-[#0099CC] text-white hover:bg-[#0084B1]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                연결 테스트
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[rgba(0,100,180,0.12)] shadow-sm space-y-4 h-full">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Notion 연동</h2>
                <div className={`flex items-center gap-2 ${status.notion === 'connected' ? 'text-green-500' : status.notion === 'testing' ? 'text-yellow-500' : 'text-gray-400'}`}>
                  {status.notion === 'testing' && <IIcon name="refreshCw" className="animate-spin" size={16} />}
                  <span className="text-xs uppercase font-bold">{status.notion}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6F8A] mb-1">데이터베이스 ID</label>
                <input
                  type="text"
                  value={formData.notionDbId}
                  placeholder="32자리 데이터베이스 ID"
                  className="w-full p-2 border rounded-lg"
                  onChange={(e) => updateField('notionDbId', e.target.value)}
                />
                <p className="mt-1 text-xs text-[#5A6F8A]">데이터베이스 URL 끝부분에서 ID를 확인할 수 있습니다.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6F8A] mb-1">Integration Token</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.notionToken}
                    placeholder="secret_..."
                    className="flex-1 p-2 border rounded-lg"
                    onChange={(e) => updateField('notionToken', e.target.value)}
                  />
                  <button
                    onClick={() => openGuideModal('notion')}
                    className="p-2 text-gray-400 hover:text-[#0099CC]"
                    aria-label="Notion 통합 설정 가이드"
                  >
                    <IIcon name="info" size={20} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => testConnection('notion')}
                disabled={!notionReady}
                className={`mt-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  notionReady ? 'bg-[#0099CC] text-white hover:bg-[#0084B1]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                연결 테스트
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 xl:col-span-5 bg-white p-6 rounded-xl border border-[rgba(0,100,180,0.12)] shadow-sm space-y-4 self-start">
            <h2 className="font-semibold mb-2">자동화 규칙 설정</h2>
            <select className="w-full p-2 border rounded-lg" value={formData.dueDate} onChange={(e) => updateField('dueDate', e.target.value)}>
              <option>YYYY-MM-DD</option>
              <option>MM/DD/YYYY</option>
            </select>
            <textarea className="w-full h-32 p-3 border rounded-lg resize-none overflow-y-auto" value={formData.customRules} placeholder="추가 규칙 입력..." onChange={(e) => updateField('customRules', e.target.value)} />

            <div className="mt-3 rounded-xl bg-[#EEF3FF] p-4 border border-[#0099CC]/20">
              <h3 className="font-bold flex items-center gap-2 mb-3"><IIcon name="zap" size={18} /> 시스템 프롬프트 프리뷰</h3>
              <pre className="text-sm text-[#5A6F8A] bg-white p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{previewPrompt}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[4.6rem] md:bottom-6 right-4 md:right-6 z-40 max-w-[calc(100%-2rem)]">
        <div className="mx-auto flex items-center justify-end gap-2 rounded-2xl border border-[rgba(0,100,180,0.14)] bg-white/95 p-2 shadow-[0_14px_36px_-18px_rgba(0,60,150,0.55)] backdrop-blur-[8px]">
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-5 py-2.5 text-sm font-semibold text-[#5A6F8A] hover:bg-[#EEF3FF] rounded-xl transition-colors"
          >
            초기화
          </button>
          <button
            onClick={() => { setShowToast(true); setTimeout(() => setShowToast(false), 2000); }}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0099CC,#0EA5E9)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(0,153,204,0.9)] transition-all hover:brightness-105"
          >
            <IIcon name="save" size={17} /> 저장
          </button>
        </div>
      </div>

      {guideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xl w-full border border-[rgba(0,100,180,0.14)] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[#0D1B2A]">
                {guideModal === 'jira' ? 'Jira API 토큰 발급 가이드' : 'Notion 통합 설정 가이드'}
              </h3>
              <button onClick={() => setGuideModal(null)} className="text-[#5A6F8A] hover:text-[#0D1B2A]">닫기</button>
            </div>

            {guideModal === 'jira' ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-[rgba(0,100,180,0.12)] bg-[#F8FAFF] p-3 text-sm text-[#5A6F8A]">
                  공식 경로: https://id.atlassian.com/manage-profile/security/api-tokens
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0099CC] uppercase tracking-wide">발급 단계</p>
                  <ol className="list-decimal pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                    <li>API tokens 페이지에서 Create API token 클릭</li>
                    <li>토큰 이름 입력 후 Create</li>
                    <li>Copy를 눌러 토큰 저장 후 이 화면에 붙여넣기</li>
                  </ol>
                </div>

                {showGuideDetails && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#0099CC] uppercase tracking-wide">사전 준비</p>
                      <ul className="list-disc pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                        <li>Jira 사이트 도메인 (예: company.atlassian.net)</li>
                        <li>Atlassian 관리자 또는 Jira 접근 권한 이메일</li>
                        <li>브라우저에서 2FA 또는 보안 인증 완료된 계정 세션</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,100,180,0.12)] bg-[#F8FAFF] p-4">
                      <p className="text-xs font-semibold text-[#0099CC] mb-2">연동 체크리스트</p>
                      <ul className="list-disc pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                        <li>도메인에는 프로토콜 없이 company.atlassian.net만 입력</li>
                        <li>이메일은 Atlassian 계정 이메일과 동일해야 함</li>
                        <li>실패 시 새 API 토큰을 발급해 재시도</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-[rgba(0,100,180,0.12)] bg-[#F8FAFF] p-3 text-sm text-[#5A6F8A]">
                  공식 경로: https://www.notion.so/my-integrations
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0099CC] uppercase tracking-wide">설정 단계</p>
                  <ol className="list-decimal pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                    <li>My integrations에서 New integration 생성</li>
                    <li>Internal Integration Token 복사</li>
                    <li>연동 대상 데이터베이스 페이지의 Connections에 통합 추가</li>
                    <li>데이터베이스 URL의 ID 입력 후 연결 테스트 실행</li>
                  </ol>
                </div>

                {showGuideDetails && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#0099CC] uppercase tracking-wide">사전 준비</p>
                      <ul className="list-disc pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                        <li>연동할 Notion 데이터베이스 페이지 접근 권한</li>
                        <li>워크스페이스에서 통합 생성 권한</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,100,180,0.12)] bg-[#F8FAFF] p-4">
                      <p className="text-xs font-semibold text-[#0099CC] mb-2">자주 놓치는 항목</p>
                      <ul className="list-disc pl-5 text-sm text-[#5A6F8A] space-y-1.5">
                        <li>통합 생성 후 데이터베이스와 공유하지 않으면 조회 실패</li>
                        <li>Database ID에 쿼리 문자열 포함 시 실패 가능</li>
                        <li>Token 앞뒤 공백 포함 여부 확인</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-5 border-t border-[rgba(0,100,180,0.12)] pt-4 flex justify-end">
              <button
                onClick={() => setShowGuideDetails((prev) => !prev)}
                className="px-3 py-1.5 text-xs font-semibold text-[#0099CC] border border-[rgba(0,153,204,0.35)] rounded-lg hover:bg-[#EEF3FF] transition-colors"
              >
                {showGuideDetails ? '간단히 보기' : '자세히 보기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <IIcon name="alertTriangle" size={24} />
              <h3 className="font-bold text-lg">설정 초기화</h3>
            </div>
            <p className="text-sm text-[#5A6F8A] mb-6">모든 설정값이 기본값으로 되돌아갑니다. 이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">취소</button>
              <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">초기화</button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.35)] bg-[linear-gradient(135deg,#0099CC,#0EA5E9)] px-5 py-3 text-white shadow-xl">
            <IIcon name="checkCircle" size={16} />
            <span className="text-sm font-semibold">설정이 저장되었습니다.</span>
          </div>
        </div>
      )}

      {!isMobile && <Footer />}
      {isMobile && <MobileTab active={activeTab} onChange={setActiveTab} />}
    </div>
  );
};

export default Configuration;
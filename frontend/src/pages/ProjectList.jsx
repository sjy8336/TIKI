import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTab from '../components/MobileTab';

const iconPaths = {
  plus: ['M12 5v14', 'M5 12h14'],
  folderKanban: [
    'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    'M8 13h8',
    'M8 17h5'
  ],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M22 21v-2a4 4 0 0 0-3-3.87'
  ],
  chevronRight: ['M9 18l6-6-6-6']
};

function PIcon({ name, size = 18, className = '' }) {
  const paths = iconPaths[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const ProjectList = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortFilter, setSortFilter] = useState('최신순');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stateLabels = {
    IDLE: '대기 중',
    UPLOADING: '업로드 중',
    PROCESSING: 'AI 분석 중',
    COMPLETED: '분석 완료',
    FAILED: '오류 발생'
  };

  // 테스트용 프로젝트 데이터
  const projects = [
    { id: 1, name: 'AI 회의록 자동화', category: '개발', color: 'bg-[#0099CC]', members: 5, updatedAt: '2시간 전' },
    { id: 2, name: '디자인 시스템 구축', category: '디자인', color: 'bg-[#7C3AED]', members: 3, updatedAt: '어제' },
    { id: 3, name: '사용자 인터뷰 분석', category: '리서치', color: 'bg-[#10B981]', members: 7, updatedAt: '3일 전' },
    { id: 4, name: '분기별 기획안', category: '기획', color: 'bg-[#F59E0B]', members: 4, updatedAt: '1시간 전' },
    { id: 5, name: '운영 자동화 개선', category: '개발', color: 'bg-[#0099CC]', members: 6, updatedAt: '5시간 전' },
    { id: 6, name: '온보딩 가이드 리뉴얼', category: '기획', color: 'bg-[#F59E0B]', members: 2, updatedAt: '이번 주' },
  ];

  const categories = ['전체', ...new Set(projects.map((p) => p.category))];

  const getTimeRank = (value) => {
    const order = {
      '1시간 전': 6,
      '2시간 전': 5,
      '5시간 전': 4,
      '어제': 3,
      '3일 전': 2,
      '이번 주': 1,
    };
    return order[value] || 0;
  };

  const filteredProjects = projects
    .filter((project) => {
      const matchesCategory = categoryFilter === '전체' || project.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        project.name.toLowerCase().includes(q) ||
        project.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortFilter === '이름순') {
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortFilter === '인원 많은순') {
        return b.members - a.members;
      }
      return getTimeRank(b.updatedAt) - getTimeRank(a.updatedAt);
    });

  const groupedProjects = filteredProjects.reduce((acc, project) => {
    if (!acc[project.category]) acc[project.category] = [];
    acc[project.category].push(project);
    return acc;
  }, {});

  const groupedEntries = Object.entries(groupedProjects);

  return (
    <div className="min-h-screen bg-[#F8FAFF] overflow-x-hidden pt-20 pb-20 md:pb-0 flex flex-col">
      <Header isMobile={isMobile} phase="IDLE" stateLabels={stateLabels} />

      <main className="flex-1 w-full px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* 상단 헤더 영역 */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0D1B2A]">내 프로젝트</h1>
              <p className="text-[#5A6F8A] mt-1">진행 중인 프로젝트를 한눈에 관리하세요.</p>
            </div>
            <button
              onClick={() => navigate('/create-project')}
              className="flex items-center gap-2 bg-[#0099CC] hover:bg-[#007EA7] text-white px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <PIcon name="plus" size={20} />
              <span>새 프로젝트 생성</span>
            </button>
          </div>

          {/* 검색/필터/보기 전환 */}
          <div className="mb-6 rounded-2xl border border-[rgba(0,100,180,0.12)] bg-white p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="프로젝트명 또는 카테고리 검색"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFF] border border-[rgba(0,100,180,0.12)] rounded-xl focus:outline-none focus:border-[#0099CC]"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFF] border border-[rgba(0,100,180,0.12)] rounded-xl focus:outline-none focus:border-[#0099CC]"
                >
                  <option value="최신순">최신순</option>
                  <option value="이름순">이름순</option>
                  <option value="인원 많은순">인원 많은순</option>
                </select>
              </div>

              <div className="lg:col-span-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`flex-1 py-2.5 text-sm rounded-xl border transition ${
                    viewMode === 'card'
                      ? 'bg-[#EEF3FF] text-[#0099CC] border-[#0099CC]/30 font-semibold'
                      : 'bg-white text-[#5A6F8A] border-[rgba(0,100,180,0.12)]'
                  }`}
                >
                  카드형
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-2.5 text-sm rounded-xl border transition ${
                    viewMode === 'list'
                      ? 'bg-[#EEF3FF] text-[#0099CC] border-[#0099CC]/30 font-semibold'
                      : 'bg-white text-[#5A6F8A] border-[rgba(0,100,180,0.12)]'
                  }`}
                >
                  리스트형
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition ${
                    categoryFilter === category
                      ? 'bg-[#0099CC] text-white border-[#0099CC] font-semibold'
                      : 'bg-[#F8FAFF] text-[#5A6F8A] border-[rgba(0,100,180,0.12)] hover:border-[#0099CC]/40'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {groupedEntries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[rgba(0,100,180,0.18)] bg-white p-10 text-center">
              <p className="text-[#0D1B2A] font-semibold">검색 결과가 없습니다.</p>
              <p className="text-sm text-[#5A6F8A] mt-1">검색어나 필터를 변경해 보세요.</p>
            </div>
          )}

          {groupedEntries.length > 0 && groupedEntries.map(([categoryName, items]) => (
            <section key={categoryName} className="mb-8 last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-bold text-[#0D1B2A]">{categoryName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF3FF] text-[#0099CC] font-semibold">
                  {items.length}개
                </span>
              </div>

              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((project) => (
                    <div
                      key={project.id}
                      className="bg-[#FFFFFF] p-6 rounded-2xl border border-[rgba(0,100,180,0.12)] shadow-sm hover:shadow-lg hover:border-[#0099CC] transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`${project.color} w-10 h-10 rounded-xl flex items-center justify-center text-white`}>
                          <PIcon name="folderKanban" size={20} />
                        </div>
                        <PIcon name="settings" size={18} className="text-[#5A6F8A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <h3 className="text-lg font-semibold text-[#0D1B2A] mb-1">{project.name}</h3>
                      <span className="text-xs font-medium px-2.5 py-1 bg-[#EEF3FF] text-[#0099CC] rounded-full">
                        {project.category}
                      </span>

                      <div className="mt-6 pt-4 border-t border-[rgba(0,100,180,0.12)] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-[#5A6F8A]">
                          <PIcon name="users" size={16} />
                          <span>{project.members}명</span>
                        </div>
                        <div className="text-xs text-[#5A6F8A]">{project.updatedAt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[rgba(0,100,180,0.12)] bg-white overflow-hidden">
                  {items.map((project, idx) => (
                    <div
                      key={project.id}
                      className={`px-4 sm:px-5 py-4 flex items-center justify-between gap-4 ${idx !== items.length - 1 ? 'border-b border-[rgba(0,100,180,0.08)]' : ''}`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={`${project.color} w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0`}>
                          <PIcon name="folderKanban" size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-[#0D1B2A] truncate">{project.name}</h4>
                          <p className="text-xs text-[#5A6F8A] mt-0.5">{project.category} · 멤버 {project.members}명</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-[#5A6F8A] hidden sm:inline">{project.updatedAt}</span>
                        <button className="text-[#0099CC] text-sm font-medium flex items-center gap-1">
                          상세보기 <PIcon name="chevronRight" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      {!isMobile && <Footer />}
      {isMobile && <MobileTab active={activeTab} onChange={setActiveTab} />}
    </div>
  );
};

export default ProjectList;
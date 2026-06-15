const icons = {
  home: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  uploadCloud: ["M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242", "M12 12v9", "M8 17l4-5 4 5"],
  barChart: ["M12 20V10", "M18 20V4", "M6 20v-4"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

function IIcon({ name, size = 16, color = "currentColor", sw = 2 }) {
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
      className="block shrink-0"
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

const TABS = [
  { id: "home", icon: "home", label: "홈" },
  { id: "upload", icon: "uploadCloud", label: "업로드" },
  { id: "reports", icon: "barChart", label: "회의록" },
  { id: "settings", icon: "settings", label: "설정" },
];

export default function MobileTab({ active, onChange }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:px-4">
      <nav className="mx-auto max-w-[28rem] rounded-[28px] border border-[rgba(0,100,180,.12)] bg-[rgba(248,250,255,.88)] p-2 shadow-[0_12px_40px_rgba(0,60,150,.12)] backdrop-blur-[18px]">
        <div className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "group relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[22px] border transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0099CC]/30",
                  isActive
                    ? "border-[rgba(0,153,204,.18)] bg-white text-[#0099CC] shadow-[0_4px_18px_rgba(0,153,204,.12)]"
                    : "border-transparent bg-transparent text-[#5A6F8A] hover:bg-white/70 hover:text-[#0D1B2A]",
                )}
              >
                {isActive && <div className="absolute inset-x-4 top-2 h-1 rounded-full bg-[linear-gradient(90deg,#0099CC,#7C3AED)]" />}
                <div className={cn("relative mt-1 transition-transform duration-200", isActive ? "translate-y-[2px]" : "group-hover:-translate-y-0.5")}>
                  <IIcon name={tab.icon} size={22} color="currentColor" sw={isActive ? 2.3 : 1.9} />
                  {tab.id === "upload" && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#F8FAFF] bg-[#7C3AED] shadow-[0_0_0_2px_rgba(124,58,237,.08)]" />
                  )}
                </div>
                <span className={cn("text-[10.5px] leading-none tracking-[0.2px] transition-colors duration-200", isActive ? "font-bold" : "font-medium")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

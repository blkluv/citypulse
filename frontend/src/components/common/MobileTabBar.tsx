"use client";

interface MobileTabBarProps {
  active: "dashboard" | "drive" | "park" | "card";
}

const tabs = [
  { id: "dashboard" as const, label: "DASHBOARD", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1", href: "/" },
  { id: "drive" as const, label: "DRIVE", icon: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z", href: "/drive" },
  { id: "park" as const, label: "PARK", icon: "M13 3H4v18h6v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm0 8h-3V7h3c1.1 0 2 .9 2 2s-.9 2-2 2z", href: "/park" },
  { id: "card" as const, label: "CARD", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", href: "/card" },
];

export function MobileTabBar({ active }: MobileTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1100] p-3 pb-5">
      <div className="flex items-center bg-[#1E293B] border border-[#0F172A] rounded-[36px] p-1 h-[62px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full rounded-[26px] transition-colors ${
                isActive ? "bg-[#22D3EE]" : ""
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isActive ? "#0A0F1C" : "#475569"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={tab.icon} />
              </svg>
              <span
                className={`text-[8px] font-mono font-medium tracking-wider ${
                  isActive ? "text-[#0A0F1C] font-semibold" : "text-[#475569]"
                }`}
              >
                {tab.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

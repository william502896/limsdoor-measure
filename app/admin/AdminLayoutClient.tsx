"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  LayoutDashboard,
  Layout,
  GitBranch,
  Calendar,
  Users,
  FileText,
  Wrench,
  Mic,
  BarChart3,
  Settings,
  LogOut,
  Hammer,
  Image as ImageIcon,
  Home,
  Truck,
  Bell,
  X,
  Radio,
  Coins,
  ShieldCheck,
  Building2,
  Package,
  Banknote,
  Receipt,
  Palette,
  Lock,
  Megaphone,
  PhoneCall,
  Ruler,
  Star,
  ChevronDown,
  ChevronRight,
  Bot,
  Calculator,
  LayoutGrid,
  Smartphone
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon?: any;
  id?: string;
  children?: NavItem[];
};

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname === "/admin/onboarding";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabletCollapsed, setTabletCollapsed] = useState(true);

  // Accordion State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Guard State
  const [checking, setChecking] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  /* Split Items */
  const mainItems: NavItem[] = useMemo(
    () => [
      { label: "대시보드", href: "/admin", icon: LayoutDashboard, id: "dashboard" },
      {
        label: "마케팅",
        href: "#",
        icon: Megaphone,
        id: "marketing",
        children: [
          { label: "랜딩 제작", href: "/admin/marketing/landings", icon: Layout },
          { label: "브랜드 자산", href: "/admin/marketing/assets", icon: ImageIcon },
          { label: "리드 점수", href: "/admin/marketing/leads", icon: BarChart3 },
          { label: "자동 시나리오", href: "/admin/marketing/scenarios", icon: GitBranch },
          { label: "성과 분석", href: "/admin/marketing/stats", icon: BarChart3 },
          { label: "상담 / 예약", href: "/admin/consulting", icon: PhoneCall },
        ]
      },
      {
        label: "일정",
        href: "#",
        icon: Calendar,
        id: "schedule",
        children: [
          { label: "통합 일정", href: "/admin/schedule/all", icon: Calendar },
          { label: "상담 일정", href: "/admin/schedule/consulting", icon: PhoneCall },
          { label: "실측/견적", href: "/admin/schedule/measure", icon: Ruler },
          { label: "시공 일정", href: "/admin/schedule/install", icon: Hammer },
          { label: "리폼/수리", href: "/admin/schedule/reform", icon: Wrench },
          { label: "AS 일정", href: "/admin/schedule/as", icon: ShieldCheck },
        ]
      },
      { label: "견적 / 결제", href: "/admin/contracts", icon: FileText, id: "contracts" },
      {
        label: "자재 발주",
        href: "#",
        icon: Truck,
        id: "purchase",
        children: [
          { label: "발주 관리", href: "/admin/purchase-order", icon: Package },
        ]
      },
      { label: "시공 관리", href: "/admin/installers", icon: Hammer, id: "installers" },
      { label: "후기 / 재구매", href: "/admin/retention", icon: Star, id: "retention" },

      {
        label: "고객 관리",
        href: "#",
        icon: Users,
        id: "customers",
        children: [
          { label: "통합 관리", href: "/admin/customers/all", icon: Users },
          { label: "가망 고객", href: "/admin/customers/prospective", icon: Star },
          { label: "상담 고객", href: "/admin/customers/consulting", icon: PhoneCall },
          { label: "계약 고객", href: "/admin/customers/contract", icon: FileText },
          { label: "구매 고객", href: "/admin/customers/purchased", icon: Package },
        ]
      },
      {
        label: "앱 관리",
        href: "#",
        icon: Coins, // Using Coins icon or something relevant to 'management/billing'
        id: "apps",
        children: [
          { label: "통합 ERP (Master)", href: "/admin/apps/erp", icon: LayoutGrid, id: "erp-master" },
          { label: "소비자 앱 (Consumer)", href: "/admin/apps/consumer", icon: Smartphone },
          { label: "실측 앱 (Measure)", href: "/admin/apps/measure", icon: Ruler },
          { label: "시공 앱 (Install)", href: "/admin/apps/install", icon: Hammer },
        ]
      },
    ],
    []
  );

  const tier1Items: NavItem[] = useMemo(
    () => [
      { label: "AI 비서", href: "/admin/ai-assistant", icon: Bot, id: "ai-assistant" },
      { label: "비용 관리", href: "/admin/costs", icon: Calculator },
      { label: "거래처 관리", href: "/admin/partners", icon: Building2 },
      {
        label: "인사관리",
        href: "#",
        icon: Users,
        id: "personnel",
        children: [
          { label: "마케팅팀", href: "/admin/personnel/marketing", icon: Megaphone },
          { label: "영업팀", href: "/admin/personnel/sales", icon: PhoneCall },
          { label: "관리팀", href: "/admin/personnel/management", icon: Settings },
          { label: "기획팀", href: "/admin/personnel/planning", icon: FileText },
          { label: "시공팀", href: "/admin/personnel/install", icon: Hammer },
          { label: "실측팀", href: "/admin/personnel/measure", icon: Ruler },
          { label: "AS팀", href: "/admin/personnel/as", icon: Wrench },
        ]
      },
      {
        label: "매입단가",
        href: "#",
        icon: Coins,
        id: "purchase-unit-prices",
        children: [
          { label: "단가 관리", href: "/admin/purchase-costs", icon: Calculator },
          { label: "업체별 단가표", href: "/admin/prices", icon: Banknote },
        ]
      },
      { label: "품목/자재", href: "/admin/items", icon: Package },
      { label: "전자명세서", href: "/admin/invoices", icon: Receipt },
      { label: "UI 디자인", href: "/admin/design", icon: Palette },
    ],
    []
  );

  // Auto-Expand Logic based on Pathname
  useEffect(() => {
    // Check Main Items
    const activeMain = mainItems.find(item => item.children?.some(child => child.href === pathname));
    if (activeMain && activeMain.id) {
      setExpandedId(activeMain.id);
    }

    // Check Tier 1 Items
    const activeTier1 = tier1Items.find(item => item.children?.some(child => child.href === pathname));
    if (activeTier1 && activeTier1.id) {
      setExpandedId(activeTier1.id);
    }
  }, [pathname, mainItems, tier1Items]);

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      // Toggle
      setExpandedId(prev => prev === item.id ? null : item.id!);
    } else {
      // Direct Link
      if (item.id === "dashboard") {
        setExpandedId(null);
      }
      router.push(item.href);
      if (drawerOpen) setDrawerOpen(false);
    }
  };

  const renderNav = (collapsed: boolean) => (
    <>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => router.push("/admin/onboarding")}
          className={`w-full border-0 rounded-xl text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg animate-pulse ${collapsed ? "py-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-[10px]" : "p-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-[13px]"}`}
          title="사용 등록"
        >
          <span>🚀</span>
          {!collapsed && <span>사용 등록</span>}
        </button>
      </div>

      <NavList
        items={mainItems}
        collapsed={collapsed}
        expandedId={expandedId}
        onItemClick={handleNavClick}
        currentPath={pathname}
      />

      {!collapsed && (
        <div style={{ margin: "20px 0 10px 0", padding: "0 10px", fontSize: "11px", fontWeight: 900, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" }}>
          🔒 1티어 관리자
        </div>
      )}
      {collapsed && <div className="h-px bg-slate-800 mx-2 my-2" />}

      {/* Conditionally Render Tier 1 Items */}
      {isAdminUnlocked && (
        <NavList
          items={tier1Items}
          collapsed={collapsed}
          expandedId={expandedId}
          onItemClick={handleNavClick}
          showTier1Style={true}
          currentPath={pathname}
        />
      )}
    </>
  );

  useEffect(() => {
    async function checkOnboarding() {
      // 1. Check User First (Priority)
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Logged in user? Check profile
        const { data: profile } = await supabase.from("프로필").select("company_id").eq("id", user.id).single();
        if (profile?.company_id) {
          // Valid User -> Not Demo
          setIsDemo(false);
          setChecking(false);
        } else {
          // No profile? Check if they are in Demo Mode
          if (document.cookie.includes("company_id=demo")) {
            setIsDemo(true);
            setChecking(false);
          } else {
            router.replace("/admin/onboarding");
          }
        }
      } else {
        // No User -> Check Demo Cookie
        if (document.cookie.includes("company_id=demo")) {
          setIsDemo(true);
          setChecking(false);
        } else {
          // Neither User nor Demo? -> Onboarding
          setChecking(false);
        }
      }

      // Tier 1 Check
      const checkTier1 = () => setIsAdminUnlocked(document.cookie.includes("tier1_ui=1"));
      checkTier1();
      window.addEventListener("tier1-login", checkTier1);
      return () => window.removeEventListener("tier1-login", checkTier1);
    }
    checkOnboarding();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-bold animate-pulse">
        LIMS 로드 중...
      </div>
    );
  }

  return (
    // Light Theme Shell: bg-slate-50 text-slate-900
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* ====== MOBILE TOPBAR (<=767px) ====== */}
      {!isOnboarding && (
        <header className="sticky top-0 z-50 flex items-center gap-2.5 p-2.5 border-b border-slate-200 bg-white/90 backdrop-blur md:hidden">
          <button className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
          <div className="font-extrabold tracking-tight text-slate-800">LIMSDOOR 관리자</div>
          <div className="w-10 h-10" />
        </header>
      )}

      <div className="flex w-full">
        {/* ====== DESKTOP SIDEBAR (>=1024px) ====== */}
        {/* Dark Sidebar: bg-slate-900 border-r border-slate-800 */}
        {!isOnboarding && (
          <aside className="hidden lg:block w-[280px] min-h-screen border-r border-slate-800 bg-slate-900 text-slate-300 p-4 sticky top-0 self-start shadow-xl z-20">
            <Brand />
            {renderNav(false)}

            <div className="mt-auto mb-6 px-2">
              <button
                onClick={async () => {
                  if (confirm("정말 초기화 하시겠습니까?\n등록된 정보가 초기화되거나 로그아웃 됩니다.")) {
                    if (isDemo) {
                      // Clear Demo Cookies
                      document.cookie = "company_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                      document.cookie = "onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                      window.location.href = "/admin/onboarding";
                    } else {
                      // Real User: Remove company_id link
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from("프로필").update({ company_id: null }).eq("id", user.id);
                      }
                      window.location.href = "/admin/onboarding";
                    }
                  }
                }}
                className="w-full py-2.5 rounded-lg border border-slate-700 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 text-slate-500 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                초기화
              </button>
            </div>
            <FooterHint />
          </aside>
        )}

        {/* ====== TABLET SIDEBAR (768~1023px) ====== */}
        {!isOnboarding && (
          <aside className={`hidden md:block lg:hidden min-h-screen border-r border-slate-800 bg-slate-900 text-slate-300 p-3 sticky top-0 self-start transition-all duration-200 z-20 ${tabletCollapsed ? "w-[84px]" : "w-[240px]"}`}>
            <div className="flex items-center justify-between gap-2.5 mb-6">
              <div className={`w-10 h-10 rounded-lg grid place-items-center bg-indigo-600 text-white font-black shrink-0`}>
                L
              </div>
              <button
                className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 flex items-center justify-center"
                onClick={() => setTabletCollapsed((v) => !v)}
                aria-label="toggle tablet sidebar"
              >
                {tabletCollapsed ? "»" : "«"}
              </button>
            </div>

            {renderNav(tabletCollapsed)}
          </aside>
        )}

        {/* ====== MAIN ====== */}
        <main className="flex-1 min-w-0 flex flex-col transition-all duration-300">
          {/* Desktop Header (Optional, for Title) */}
          <div className="hidden md:flex bg-white border-b border-slate-200 px-6 py-4 items-center justify-between sticky top-0 z-10">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">통합 대시보드 (Admin)</h1>
            <div className="text-sm text-slate-400">Desktop View</div>
          </div>

          <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ====== MOBILE DRAWER (<=767px) ====== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div className="absolute top-0 left-0 w-[80%] max-w-[320px] h-full bg-slate-900 text-slate-300 border-r border-slate-800 p-4 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="font-bold text-white">메뉴</div>
              <button className="p-1 rounded hover:bg-slate-800 text-slate-400" onClick={() => setDrawerOpen(false)}>
                ✕
              </button>
            </div>

            <Brand />
            <div className="h-4" />

            <div className="overflow-y-auto flex-1 scrollbar-hide">
              {renderNav(false)}
            </div>
            <FooterHint />
          </div>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 mb-6 px-2">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shrink-0">
        L
      </div>
      <div>
        <div className="font-bold text-white text-lg tracking-tight">LimsDoor</div>
      </div>
    </div>
  );
}

function NavList({
  items,
  collapsed,
  expandedId,
  onItemClick,
  showTier1Style,
  currentPath,
}: {
  items: NavItem[];
  collapsed: boolean;
  expandedId: string | null;
  onItemClick: (item: NavItem) => void;
  showTier1Style?: boolean;
  currentPath?: string;
}) {
  return (
    <nav className={`grid gap-1 ${collapsed ? "" : ""}`}>
      {items.map((it) => {
        const isExpanded = expandedId === it.id;
        const Icon = it.icon;

        // Style Logic
        const itemStyle = showTier1Style
          ? "text-indigo-300 hover:text-white hover:bg-slate-800"
          : "text-slate-400 hover:text-white hover:bg-slate-800";

        const iconStyle = showTier1Style
          ? "text-indigo-400"
          : "text-slate-500 group-hover:text-slate-300";

        return (
          <React.Fragment key={it.id || it.label}>
            <div
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${itemStyle} ${collapsed ? "justify-center" : ""}`}
              onClick={() => onItemClick(it)}
              title={it.label}
            >
              <span className={`shrink-0 ${iconStyle} w-6 text-center flex items-center justify-center`}>
                {Icon ? (
                  typeof Icon === "string" ? <span className="text-lg leading-none">{Icon}</span> : <Icon size={20} />
                ) : <span className="text-lg leading-none">•</span>}
              </span>

              {!collapsed && (
                <>
                  <span className={`flex-1 text-sm font-medium`}>{it.label}</span>
                  {it.children && (
                    <span className="text-[10px] opacity-50">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                  )}
                </>
              )}
            </div>

            {/* Sub Menu */}
            {it.children && isExpanded && !collapsed && (
              <div className="pl-4 mt-1 mb-2 space-y-1 border-l border-slate-800 ml-4">
                {it.children.map(sub => {
                  const SubIcon = sub.icon;
                  const isActive = global.window && window.location.pathname === sub.href; // Simple check, or pass pathname from props

                  return (
                    <div
                      key={sub.href}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Do NOT toggle parent closed
                        onItemClick({ ...sub, href: sub.href }); // Delegate to parent handler or direct router push
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors block
                            ${isActive ? "text-white bg-slate-800 font-bold" : "text-slate-500 hover:text-white hover:bg-slate-800"}
                        `}
                    >
                      <span className="shrink-0">
                        {SubIcon ? (
                          typeof SubIcon === "string" ? <span>{SubIcon}</span> : <SubIcon size={16} />
                        ) : null}
                      </span>
                      <span>{sub.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function FooterHint() {
  return (
    <div className="mt-auto pt-6 opacity-40 text-[10px] leading-relaxed border-t border-slate-800/50">
      LimsDoor Admin v1.0
      <br />
      Light Mode
    </div>
  );
}

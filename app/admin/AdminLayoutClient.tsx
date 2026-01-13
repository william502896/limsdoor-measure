"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useStoreHook } from "@/app/lib/store";
import { PLATFORM_NAME } from "@/app/lib/constants";
import { AppShell } from "@/app/components/layout/AppShell";

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
  const { currentTenant } = useStoreHook();
  const brandName = currentTenant?.brandName || PLATFORM_NAME;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabletCollapsed, setTabletCollapsed] = useState(true);

  // Accordion State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Guard State
  const [checking, setChecking] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);


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
          { label: "마케팅 리포트", href: "/admin/marketing", icon: FileText },
          { label: "시크릿 자료실", href: "/admin/secure/secret", icon: Lock },
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
          { label: "실측 일정", href: "/admin/schedule/measure", icon: Ruler },
          { label: "시공 일정", href: "/admin/schedule/install", icon: Hammer },
          { label: "리폼/수리", href: "/admin/schedule/reform", icon: Wrench },
          { label: "AS 일정", href: "/admin/schedule/as", icon: ShieldCheck },
        ]
      },
      // ✅ 사용자 요청: 실측/견적 섹션 (Top Level)
      {
        label: "실측 관리",
        href: "#",
        icon: Ruler, // ClipboardList 대신 기존 Ruler 사용 또는 import 필요 (ClipboardList는 lucide-react에 있음)
        id: "measure-folder",
        children: [
          { label: "실측 폴더(목록)", href: "/admin/measurements", icon: FileText },
          { label: "새 실측 작성", href: "/field/new?from=admin", icon: Hammer }, // Plus 아이콘 대신 Hammer/Edit 등 사용
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
        icon: Coins,
        id: "apps",
        children: [
          { label: "통합 ERP (Master)", href: "/admin/apps/erp", icon: LayoutGrid, id: "erp-master" },
          { label: "소비자 앱 (Consumer)", href: "/admin/apps/consumer", icon: Smartphone },
          { label: "실측 앱 (Measure)", href: "/admin/apps/measure", icon: Ruler },
          { label: "시공 앱 (Install)", href: "/admin/apps/install", icon: Hammer },
        ]
      },
      // Tier 1 Folder (Password Protected)
      {
        label: isAdminUnlocked ? "1티어 관리자" : "🔒 1티어 관리자",
        href: "#",
        icon: ShieldCheck,
        id: "tier1-admin",
        children: [
          { label: "AI 비서", href: "/admin/secure/ai-assistant", icon: Bot, id: "ai-assistant" },
          { label: "비용 관리", href: "/admin/secure/costs", icon: Calculator },
          { label: "거래처 관리", href: "/admin/secure/partners", icon: Building2 },
          { label: "품목/자재", href: "/admin/secure/items", icon: Package },
          { label: "전자명세서", href: "/admin/secure/invoices", icon: Receipt },
          { label: "UI 디자인", href: "/admin/secure/design", icon: Palette },
        ]
      }
    ],
    []
  );

  // Auto-Expand Logic based on Pathname
  useEffect(() => {
    // Check Main Items
    const activeMain = mainItems.find(item => item.children?.some(child => child.href === pathname));
    if (activeMain && activeMain.id) {
      // If expanding Tier 1, ensure unlocked
      if (activeMain.id === "tier1-admin") {
        if (isAdminUnlocked) {
          setExpandedId(activeMain.id);
        }
      } else {
        setExpandedId(activeMain.id);
      }
    }
  }, [pathname, mainItems, isAdminUnlocked]);

  const handleNavClick = (item: NavItem) => {
    if (item.id === "tier1-admin" && !isAdminUnlocked) {
      // Redirect to Secure Auth
      router.push("/admin/secure-auth");
      return;
    }

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
        {isSuperAdmin && (
          <button
            onClick={() => router.push("/ops/console")}
            className={`w-full mb-3 border-0 rounded-xl text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/30 ${collapsed ? "py-3 bg-slate-800 text-[10px]" : "p-3 bg-slate-800 hover:bg-slate-700 text-[13px]"}`}
            title="운영 콘솔 (Ops)"
          >
            <span>🛡️</span>
            {!collapsed && <span>시스템 관제 (Ops)</span>}
          </button>
        )}

        <button
          onClick={() => router.push("/admin/onboarding?mode=edit")}
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

          if (isOnboarding) {
            router.replace("/admin");
          } else {
            setChecking(false);
          }
        } else {
          // No company_id?
          // Check Demo Fallback
          if (document.cookie.includes("company_id=demo")) {
            setIsDemo(true);
            setChecking(false);
          } else {
            // Real user with no company
            if (!isOnboarding) {
              // router.replace("/admin/onboarding"); // ⚠️ Bypass for dev/testing
              console.log("Onboarding bypassed for dev");
              setChecking(false);
            } else {
              // On onboarding page, let them define company
              setChecking(false);
            }
          }
        }
      } else {
        // No User -> Check Demo Cookie
        if (document.cookie.includes("company_id=demo")) {
          setIsDemo(true);
          setChecking(false);
        } else {
          // Neither User nor Demo? -> Onboarding
          if (!isOnboarding) {
            router.replace("/admin/onboarding");
          }
          setChecking(false);
        }
      }

      // Tier 1 Check
      const checkTier1 = () => setIsAdminUnlocked(document.cookie.includes("tier1_ui=1"));
      checkTier1();
      window.addEventListener("tier1-login", checkTier1);
      return () => window.removeEventListener("tier1-login", checkTier1);
    }

    // Superadmin Check (Ops Console)
    async function checkSuperAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check standard 'profiles' table first (New System)
      const { data: p1 } = await supabase.from("profiles").select("is_superadmin").eq("user_id", user.id).single();
      if (p1?.is_superadmin) {
        setIsSuperAdmin(true);
        return;
      }

      // Fallback or Legacy check if needed, but 'profiles' is the standard now.
    }
    checkSuperAdmin();

    checkOnboarding();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-bold animate-pulse">
        LIMS 로드 중...
      </div>
    );
  }

  if (isOnboarding) {
    return <>{children}</>;
  }

  // Protected Routes Check
  const isTier1Route = mainItems
    .find(item => item.id === "tier1-admin")
    ?.children?.some(child => pathname.startsWith(child.href));

  return (
    <AppShell
      brandName={brandName}
      sidebarContent={renderNav(false)}
      sidebarFooter={
        <div className="opacity-40 text-[10px] leading-relaxed">
          LimsDoor Admin v1.0
          <br />
          Mode: {isDemo ? "Demo" : "Live"}
          <button
            onClick={async () => {
              if (confirm("정말 초기화 하시겠습니까?\n등록된 정보가 초기화되거나 로그아웃 됩니다.")) {
                document.cookie = "tier1_ui=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                if (isDemo) {
                  document.cookie = "company_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                  document.cookie = "onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                  window.location.href = "/admin/onboarding";
                } else {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase.from("프로필").update({ company_id: null }).eq("id", user.id);
                  }
                  window.location.href = "/admin/onboarding";
                }
              }
            }}
            className="mt-2 flex items-center gap-1 hover:text-red-500 underline"
          >
            <LogOut size={10} /> 초기화 (Logout)
          </button>

          {isAdminUnlocked && (
            <button
              onClick={() => {
                if (confirm("1티어 관리자 모드를 잠그시겠습니까?")) {
                  document.cookie = "tier1_ui=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                  setIsAdminUnlocked(false);
                  window.location.reload();
                }
              }}
              className="mt-2 flex items-center gap-1 text-slate-400 hover:text-indigo-400 font-bold transition-colors"
            >
              🔒 1티어 잠금 (Lock)
            </button>
          )}
        </div>
      }
    >
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Navigation Header */}
        <header className="flex items-center justify-between px-6 py-4 mb-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
          >
            <ChevronDown className="rotate-90" size={18} />
            <span>뒤로가기</span>
          </button>

          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
          >
            <span>닫기</span>
            <X size={18} />
          </button>
        </header>

        {children}
      </div>
    </AppShell>
  );
}

function Brand({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 px-2">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shrink-0">
        {name[0]?.toUpperCase()}
      </div>
      <div>
        <div className="font-bold text-white text-lg tracking-tight">{name}</div>
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
          ? "text-indigo-600 font-bold hover:bg-slate-100"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium";

        const iconStyle = showTier1Style
          ? "text-indigo-500"
          : "text-slate-400 group-hover:text-indigo-500 transition-colors";

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
                  <span className={`flex-1 text-sm`}>{it.label}</span>
                  {it.children && (
                    <span className="text-[10px] opacity-40">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                  )}
                </>
              )}
            </div>

            {/* Sub Menu */}
            {it.children && isExpanded && !collapsed && (
              <div className="pl-4 mt-1 mb-2 space-y-1 border-l border-indigo-100 ml-4">
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
                            ${isActive ? "text-indigo-700 bg-indigo-50 font-bold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}
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
    <div className="mt-auto pt-6 opacity-40 text-[10px] leading-relaxed border-t border-slate-200">
      LimsDoor Admin v1.0
      <br />
      Light Mode
      <br />
      <a href="/ops/console" className="hover:text-indigo-600 underline mt-2 block text-indigo-400">
        [Ops Console]
      </a>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";

type NavItem = { label: string; href: string; icon?: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 태블릿에서 사이드바 접힘/펼침 (기본: 접힘)
  const [tabletCollapsed, setTabletCollapsed] = useState(true);

  const navItems: NavItem[] = useMemo(
    () => [
      { label: "대시보드", href: "/admin", icon: "🏠" },
      { label: "거래처 관리", href: "/admin/partners", icon: "🏢" },
      { label: "매입단가 관리", href: "/admin/purchase-costs", icon: "🔢" },
      { label: "품목/자재", href: "/admin/items", icon: "📦" },
      { label: "단가/마진", href: "/admin/prices", icon: "💰" },
      { label: "전자명세서", href: "/admin/invoices", icon: "📄" },
      { label: "배차 관제", href: "/admin/dispatch", icon: "🚚" },
      { label: "현장 스케줄", href: "/schedule", icon: "📅" },
      { label: "시공/기사", href: "/admin/installers", icon: "🛠️" },
      { label: "고객 관리", href: "/admin/customers", icon: "👥" },
      { label: "계약/견적", href: "/admin/contracts", icon: "🧾" },
      { label: "현장 실측 입력", href: "/field/new", icon: "📏" },
    ],
    []
  );

  return (
    <div className="admin-root">
      {/* ====== MOBILE TOPBAR (<=767px) ====== */}
      <header className="admin-topbar">
        <button className="btn-icon" onClick={() => setDrawerOpen(true)}>
          ☰
        </button>
        <div className="topbar-title">LIMSDOOR 관리자</div>
        <div className="topbar-spacer" />
      </header>

      <div className="admin-shell">
        {/* ====== DESKTOP SIDEBAR (>=1024px) ====== */}
        <aside className="sidebar-desktop">
          <Brand />
          <NavList items={navItems} collapsed={false} onNavigate={() => { }} />
          <FooterHint />
        </aside>

        {/* ====== TABLET SIDEBAR (768~1023px) ====== */}
        <aside className={`sidebar-tablet ${tabletCollapsed ? "collapsed" : ""}`}>
          <div className="tablet-header">
            <div className="tablet-brand">L</div>
            <button
              className="btn-icon"
              onClick={() => setTabletCollapsed((v) => !v)}
              aria-label="toggle tablet sidebar"
              title="사이드바 접기/펼치기"
            >
              {tabletCollapsed ? "»" : "«"}
            </button>
          </div>

          <NavList
            items={navItems}
            collapsed={tabletCollapsed}
            onNavigate={() => { }}
          />
        </aside>

        {/* ====== MAIN ====== */}
        <main className="admin-main">
          <div className="main-inner">{children}</div>
        </main>
      </div>

      {/* ====== MOBILE DRAWER (<=767px) ====== */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <div className="drawer-title">메뉴</div>
              <button className="btn-icon" onClick={() => setDrawerOpen(false)}>
                ✕
              </button>
            </div>

            <Brand />
            <div style={{ height: 10 }} />
            <NavList items={navItems} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            <FooterHint />
          </div>
        </div>
      )}

      {/* ====== STYLES ====== */}
      <style jsx global>{`
        .admin-root {
          min-height: 100vh;
          background: #0b1026;
          color: #fff;
        }

        /* 공통 버튼 */
        .btn-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 900;
        }

        /* ====== TOPBAR (MOBILE) ====== */
        .admin-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          display: none; /* 기본 숨김 -> 모바일에서만 표시 */
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 16, 38, 0.85);
          backdrop-filter: blur(10px);
          align-items: center;
          gap: 10px;
        }

        .topbar-title {
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .topbar-spacer {
          width: 42px;
          height: 42px;
        }

        /* ====== SHELL ====== */
        .admin-shell {
          display: flex;
          width: 100%;
        }

        /* ====== MAIN ====== */
        .admin-main {
          flex: 1;
          min-width: 0;
          padding: 14px;
        }

        /* 본문 폭 제한(태블릿/데스크탑에서 가독성↑) */
        .main-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ====== DESKTOP SIDEBAR ====== */
        .sidebar-desktop {
          display: none;
          width: 280px;
          min-height: 100vh;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 14px;
          position: sticky;
          top: 0;
          align-self: flex-start;
        }

        /* ====== TABLET SIDEBAR ====== */
        .sidebar-tablet {
          display: none;
          width: 240px;
          min-height: 100vh;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px;
          position: sticky;
          top: 0;
          align-self: flex-start;
          transition: width 180ms ease;
        }

        .sidebar-tablet.collapsed {
          width: 84px;
        }

        .tablet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .tablet-brand {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(91, 71, 255, 0.25);
          border: 1px solid rgba(91, 71, 255, 0.35);
          font-weight: 900;
        }

        /* ====== NAV ====== */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }
        .brand-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(91, 71, 255, 0.25);
          border: 1px solid rgba(91, 71, 255, 0.35);
          font-weight: 900;
        }
        .brand-title {
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .brand-sub {
          opacity: 0.7;
          font-size: 12px;
          margin-top: 2px;
        }

        .nav {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          text-decoration: none;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav a:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .nav .icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          flex: 0 0 auto;
        }

        /* collapsed 상태에서는 텍스트 숨김 */
        .nav.collapsed a {
          justify-content: center;
          padding: 12px 8px;
        }
        .nav.collapsed .label {
          display: none;
        }

        .footer-hint {
          margin-top: 16px;
          opacity: 0.75;
          font-size: 12px;
          line-height: 1.4;
        }

        /* ====== MOBILE DRAWER ====== */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0, 0, 0, 0.55);
        }
        .drawer {
          position: absolute;
          top: 0;
          left: 0;
          width: 82%;
          max-width: 340px;
          height: 100%;
          background: #0f1637;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          padding: 14px;
        }
        .drawer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .drawer-title {
          font-weight: 900;
        }

        /* ====== BREAKPOINTS ====== */
        /* MOBILE */
        @media (max-width: 767px) {
          .admin-topbar {
            display: flex;
          }
          .sidebar-desktop,
          .sidebar-tablet {
            display: none;
          }
          .admin-main {
            padding: 12px;
          }
          .main-inner {
            max-width: 100%;
          }
        }

        /* TABLET */
        @media (min-width: 768px) and (max-width: 1023px) {
          .admin-topbar {
            display: none;
          }
          .sidebar-tablet {
            display: block;
          }
          .sidebar-desktop {
            display: none;
          }
          .admin-main {
            padding: 16px;
          }
          .main-inner {
            max-width: 980px;
          }
        }

        /* DESKTOP */
        @media (min-width: 1024px) {
          .admin-topbar {
            display: none;
          }
          .sidebar-desktop {
            display: block;
          }
          .sidebar-tablet {
            display: none;
          }
          .admin-main {
            padding: 18px;
          }
          .main-inner {
            max-width: 1100px;
          }
        }
      `}</style>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-badge">L</div>
      <div>
        <div className="brand-title">LIMSDOOR</div>
        <div className="brand-sub">통합 관리자 허브</div>
      </div>
    </div>
  );
}

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: { label: string; href: string; icon?: string }[];
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <nav className={`nav ${collapsed ? "collapsed" : ""}`}>
      {items.map((it) => (
        <a key={it.href} href={it.href} onClick={onNavigate} title={it.label}>
          <span className="icon">{it.icon ?? "•"}</span>
          <span className="label">{it.label}</span>
        </a>
      ))}
    </nav>
  );
}

function FooterHint() {
  return (
    <div className="footer-hint">
      ✓ 모바일: Drawer
      <br />
      ✓ 태블릿: 접히는 사이드바
      <br />
      ✓ PC: 고정 사이드바
    </div>
  );
}

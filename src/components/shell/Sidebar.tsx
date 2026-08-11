"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV, getActiveKey } from "@/lib/nav";
import { supabase } from "@/lib/supabase";
import { setToken, setStoredUser } from "@/lib/api";
import { useCurrentUser } from "@/lib/user-context";
import { ADMIN_ROLE_LABELS } from "@/lib/types";
import { ROLE_NAV_KEYS } from "@/lib/roles";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = getActiveKey(pathname);
  const { user, setUser } = useCurrentUser();

  const allowedKeys = user ? (ROLE_NAV_KEYS[user.role] ?? ROLE_NAV_KEYS.admin) : [];
  const visibleNav = NAV.filter((n) => allowedKeys.includes(n.key));

  const initials = user
    ? user.fullName.trim().split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || user.email[0].toUpperCase()
    : "?";
  const displayName = user
    ? user.fullName || user.email
    : "Administrateur";
  const roleLabel = user ? (ADMIN_ROLE_LABELS[user.role] ?? user.role) : "";

  async function logout() {
    await supabase.auth.signOut().catch(() => {});
    setToken(null);
    setUser(null);
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div className="brand-name" style={{ marginTop: 10 }}>
          La Ménagère
          <br />
          Paris
        </div>
        <div className="brand-subtitle">Administration</div>
      </div>
      <nav className="sidebar-nav">
        {visibleNav.map((n) => {
          const Icon = n.icon;
          const isActive = n.key === active;
          return (
            <Link
              key={n.key}
              href={n.href}
              className={`nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <span className="nav-label">{n.label}</span>
              {n.badge && (
                <span
                  className={`nav-badge${
                    n.badgeClass ? " " + n.badgeClass : ""
                  }`}
                >
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="profile-block"
          onClick={logout}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
          title="Se déconnecter"
        >
          <div className="avatar">{initials}</div>
          <div className="profile-info">
            <div className="pn">{displayName}</div>
            <div className="pr">{roleLabel}</div>
          </div>
          <span style={{ color: "var(--outline)" }}>
            <LogOut size={14} strokeWidth={1.8} />
          </span>
        </button>
      </div>
    </aside>
  );
}

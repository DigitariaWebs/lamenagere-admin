"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ShieldCheck } from "lucide-react";
import { AdminRole, ADMIN_ROLE_LABELS } from "@/lib/types";
import { ROLE_DOCS, PERMISSION_MODULES, roleHasModule } from "@/lib/roles";

/** Colonnes de la matrice : du plus large au plus restreint. */
const MATRIX_ROLES: AdminRole[] = ["super_admin", "admin", "manager", "editor", "support"];

/** Cartes détaillées : uniquement les rôles attribuables par le super admin. */
const CARD_ROLES: AdminRole[] = ["admin", "manager", "editor", "support"];

const ROLE_PILL: Record<AdminRole, string> = {
  super_admin: "pill pill-navy",
  admin: "pill pill-navy-soft",
  manager: "pill pill-success-soft",
  editor: "pill pill-warning-soft",
  support: "pill pill-outline",
};

function Yes() {
  return (
    <span
      title="Accès autorisé"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 6,
        background: "rgba(16,185,129,0.12)",
        color: "#047857",
      }}
    >
      <Check size={13} strokeWidth={2.6} />
    </span>
  );
}

function No() {
  return (
    <span
      title="Aucun accès"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 6,
        background: "rgba(186,26,26,0.07)",
        color: "var(--error)",
        opacity: 0.75,
      }}
    >
      <X size={13} strokeWidth={2.6} />
    </span>
  );
}

export function RolePermissions() {
  const [open, setOpen] = useState(true);

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(0,36,68,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <ShieldCheck size={16} strokeWidth={1.8} />
          </div>
          <div>
            <span className="card-title" style={{ fontSize: 15 }}>Rôles et permissions</span>
            <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
              Ce que chaque rôle peut faire avant de l&apos;attribuer.
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen((v) => !v)}
          style={{ gap: 6 }}
        >
          {open ? "Masquer" : "Afficher"}
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
          />
        </button>
      </div>

      {open && (
        <div style={{ padding: "20px 24px 24px" }}>
          {/* ── Fiches par rôle ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {CARD_ROLES.map((role) => {
              const doc = ROLE_DOCS[role];
              return (
                <div
                  key={role}
                  style={{
                    border: "1px solid var(--outline-variant)",
                    borderRadius: 12,
                    padding: 16,
                    background: "var(--surface)",
                  }}
                >
                  <span className={ROLE_PILL[role]}>{ADMIN_ROLE_LABELS[role]}</span>
                  <p
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--on-surface-variant)",
                      margin: "10px 0 14px",
                    }}
                  >
                    {doc.summary}
                  </p>

                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 7 }}>
                    {doc.can.map((line) => (
                      <li key={line} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Check
                          size={13}
                          strokeWidth={2.6}
                          style={{ color: "#047857", marginTop: 2, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{line}</span>
                      </li>
                    ))}
                    {doc.cannot.map((line) => (
                      <li key={line} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <X
                          size={13}
                          strokeWidth={2.6}
                          style={{ color: "var(--error)", opacity: 0.7, marginTop: 2, flexShrink: 0 }}
                        />
                        <span
                          style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--on-surface-variant)" }}
                        >
                          {line}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* ── Matrice d'accès aux modules ── */}
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>
                Accès aux modules du CRM
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 11.5,
                  color: "var(--on-surface-variant)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Yes /> Accès au module
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <No /> Module masqué et bloqué
                </span>
              </div>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--outline-variant)", borderRadius: 12 }}>
              <table className="tbl" style={{ minWidth: 680 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Module</th>
                    {MATRIX_ROLES.map((r) => (
                      <th key={r} style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        {ADMIN_ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((m) => (
                    <tr key={m.key}>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{m.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--on-surface-variant)", marginTop: 2 }}>
                          {m.hint}
                        </div>
                      </td>
                      {MATRIX_ROLES.map((r) => (
                        <td key={r} style={{ textAlign: "center" }}>
                          {roleHasModule(r, m.key) ? <Yes /> : <No />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p
              style={{
                fontSize: 11.5,
                color: "var(--on-surface-variant)",
                lineHeight: 1.55,
                margin: "12px 2px 0",
              }}
            >
              Les permissions sont appliquées côté serveur : un module refusé est masqué dans le menu
              <em> et</em> bloqué en cas d&apos;accès direct par URL. Le rôle <strong>Super Admin</strong> n&apos;est
              pas attribuable depuis cette page — il reste réservé au compte propriétaire.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

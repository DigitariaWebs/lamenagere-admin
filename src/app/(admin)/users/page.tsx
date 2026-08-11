"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, ShieldCheck, Users, X, Check } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { AdminUser, AdminRole, ADMIN_ROLE_LABELS } from "@/lib/types";
import { useCurrentUser } from "@/lib/user-context";
import { GRANTABLE_ROLES, ROLE_DOCS } from "@/lib/roles";
import { RolePermissions } from "@/components/users/RolePermissions";

const ROLE_OPTIONS: { value: AdminRole; label: string }[] = GRANTABLE_ROLES.map((value) => ({
  value,
  label: ADMIN_ROLE_LABELS[value],
}));

const ROLE_PILL: Record<AdminRole, string> = {
  super_admin: "pill pill-navy",
  admin: "pill pill-navy-soft",
  manager: "pill pill-success-soft",
  editor: "pill pill-warning-soft",
  support: "pill pill-outline",
};

function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span className={ROLE_PILL[role] ?? "pill pill-outline"} title={ROLE_DOCS[role]?.summary}>
      {ADMIN_ROLE_LABELS[role] ?? role}
    </span>
  );
}

interface CreateForm {
  email: string;
  fullName: string;
  password: string;
  role: AdminRole;
}

const EMPTY_FORM: CreateForm = {
  email: "",
  fullName: "",
  password: "",
  role: "manager",
};

export default function UsersPage() {
  const { user: me } = useCurrentUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("manager");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.users.list() as AdminUser[];
      setUsers(data);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.users.create(form);
      toast.success("Utilisateur créé");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(id: string) {
    try {
      await adminApi.users.updateRole(id, editRole);
      toast.success("Rôle mis à jour");
      setEditingId(null);
      load();
    } catch {
      toast.error("Mise à jour impossible");
    }
  }

  async function handleRevoke(user: AdminUser) {
    if (!confirm(`Révoquer l'accès de ${user.email} ?`)) return;
    try {
      await adminApi.users.revoke(user.id);
      toast.success("Accès révoqué");
      load();
    } catch {
      toast.error("Révocation impossible");
    }
  }

  if (me?.role !== "super_admin") {
    return (
      <div className="page">
        <div className="card card-padded" style={{ textAlign: "center", padding: "64px 40px", color: "var(--on-surface-variant)" }}>
          <ShieldCheck size={32} strokeWidth={1.4} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>Accès réservé au super administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Gérez les accès et rôles des membres de l&apos;équipe.</p>
        </div>
        {!showCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} strokeWidth={2.2} />
            Inviter un utilisateur
          </button>
        )}
      </div>

      {/* ── Invite form ── */}
      {showCreate && (
        <div
          className="card"
          style={{
            marginBottom: 28,
            borderLeft: "3px solid var(--primary)",
          }}
        >
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
              <span className="card-title" style={{ fontSize: 15 }}>Nouvel utilisateur admin</span>
            </div>
            <button className="icon-btn" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>
            <form onSubmit={handleCreate}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0 20px",
                }}
              >
                <div className="field">
                  <label className="field-label">Nom complet</label>
                  <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">Mot de passe temporaire</label>
                  <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                </div>
                <div className="field">
                  <label className="field-label">Rôle</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rappel de ce que le rôle sélectionné autorise */}
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--on-surface-variant)",
                  background: "var(--surface-container-low)",
                  border: "1px solid var(--outline-soft)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  margin: "4px 0 0",
                }}
              >
                <strong style={{ color: "var(--on-surface)" }}>
                  {ADMIN_ROLE_LABELS[form.role]} —{" "}
                </strong>
                {ROLE_DOCS[form.role].summary}
              </p>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? "Création…" : "Créer le compte"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rôles & permissions ── */}
      <RolePermissions />

      {/* ── Users table ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="card-title">Équipe</span>
            {!loading && (
              <span className="pill pill-outline" style={{ fontSize: 11 }}>
                {users.length} membre{users.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {showCreate ? null : (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(true)} style={{ gap: 6 }}>
              <Plus size={13} strokeWidth={2.2} />
              Inviter
            </button>
          )}
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Dernière activité</th>
              <th>Membre depuis</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "48px 16px", color: "var(--on-surface-variant)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Users size={24} strokeWidth={1.4} style={{ opacity: 0.35 }} />
                    <span style={{ fontSize: 13 }}>Chargement…</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "56px 16px", color: "var(--on-surface-variant)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Users size={28} strokeWidth={1.3} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Aucun utilisateur admin</span>
                    <span style={{ fontSize: 13, opacity: 0.6 }}>Invitez votre première personne.</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const initials = u.fullName.trim().split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || u.email[0].toUpperCase();
                const name = u.fullName || u.email;
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="avatar sm">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>{name}</div>
                          {isMe && (
                            <span className="pill pill-outline" style={{ fontSize: 9, marginTop: 3 }}>vous</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>{u.email}</td>
                    <td>
                      {editingId === u.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select
                            className="input"
                            style={{ padding: "4px 8px", fontSize: 12, height: 30, borderRadius: 6 }}
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as AdminRole)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <button
                            className="icon-btn"
                            style={{ color: "var(--success, #10b981)", background: "rgba(16,185,129,0.08)" }}
                            onClick={() => handleUpdateRole(u.id)}
                            title="Confirmer"
                          >
                            <Check size={13} strokeWidth={2.4} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => setEditingId(null)}
                            title="Annuler"
                          >
                            <X size={13} strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>
                      {u.lastActivityAt
                        ? new Date(u.lastActivityAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>
                      {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      {!isMe && u.role !== "super_admin" && (
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button
                            className="icon-btn"
                            title="Modifier le rôle"
                            onClick={() => { setEditingId(u.id); setEditRole(u.role === "super_admin" ? "admin" : u.role); }}
                          >
                            <Pencil size={14} strokeWidth={1.8} />
                          </button>
                          <button
                            className="icon-btn"
                            title="Révoquer l'accès"
                            style={{ color: "var(--error)" }}
                            onClick={() => handleRevoke(u)}
                          >
                            <Trash2 size={14} strokeWidth={1.8} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Ticket, Trash2, Pencil, X } from "lucide-react";
import { adminApi } from "@/lib/api";

type DiscountType = "percent" | "fixed";

interface AdminPromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number; // percent, or fixed amount in cents
  productId?: string;
  productName?: string;
  minOrderCents?: number;
  maxRedemptions?: number;
  perCustomerLimit?: number;
  timesRedeemed: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

interface ProductOption {
  id: string;
  name: string;
}

interface Form {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string; // percent, or euros for fixed
  productId: string; // "" = global
  minOrder: string; // euros
  maxRedemptions: string;
  perCustomerLimit: string;
  startsAt: string; // datetime-local
  expiresAt: string; // datetime-local
  isActive: boolean;
}

function blankForm(): Form {
  return {
    code: "",
    description: "",
    discountType: "percent",
    discountValue: "",
    productId: "",
    minOrder: "",
    maxRedemptions: "",
    perCustomerLimit: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
  };
}

/** ISO string → value accepted by <input type="datetime-local"> (local, minutes). */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toForm(p: AdminPromoCode): Form {
  return {
    code: p.code,
    description: p.description ?? "",
    discountType: p.discountType,
    discountValue:
      p.discountType === "fixed"
        ? String((p.discountValue / 100).toFixed(2))
        : String(p.discountValue),
    productId: p.productId ?? "",
    minOrder: p.minOrderCents != null ? String((p.minOrderCents / 100).toFixed(2)) : "",
    maxRedemptions: p.maxRedemptions != null ? String(p.maxRedemptions) : "",
    perCustomerLimit: p.perCustomerLimit != null ? String(p.perCustomerLimit) : "",
    startsAt: toLocalInput(p.startsAt),
    expiresAt: toLocalInput(p.expiresAt),
    isActive: p.isActive,
  };
}

function discountLabel(p: AdminPromoCode): string {
  return p.discountType === "percent"
    ? `−${p.discountValue} %`
    : `−${(p.discountValue / 100).toFixed(2)} €`;
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blankForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    const [list, prods] = await Promise.all([
      adminApi.promoCodes.list() as Promise<AdminPromoCode[]>,
      adminApi.products.listAll<ProductOption>(),
    ]);
    setCodes(list ?? []);
    setProducts(prods ?? []);
  }

  useEffect(() => {
    load().catch((e: { message?: string }) =>
      toast.error(e?.message ?? "Chargement impossible"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(p: AdminPromoCode) {
    setEditingId(p.id);
    setForm(toForm(p));
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  const activeCount = codes.filter((c) => c.isActive).length;

  async function save() {
    const code = form.code.trim().toUpperCase();
    if (code.length < 2) {
      toast.error("Le code doit faire au moins 2 caractères");
      return;
    }
    const value = Number(form.discountValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Valeur de réduction invalide");
      return;
    }
    if (form.discountType === "percent" && value > 100) {
      toast.error("Un pourcentage ne peut pas dépasser 100");
      return;
    }
    setSaving(true);
    try {
      const num = (s: string) => {
        const n = Number(s.replace(",", "."));
        return s.trim() && Number.isFinite(n) ? n : undefined;
      };
      const minOrder = num(form.minOrder);
      const payload = {
        code,
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue:
          form.discountType === "fixed" ? Math.round(value * 100) : Math.round(value),
        productId: form.productId || null,
        minOrderCents: minOrder != null ? Math.round(minOrder * 100) : null,
        maxRedemptions: num(form.maxRedemptions) ?? null,
        perCustomerLimit: num(form.perCustomerLimit) ?? null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };
      if (editingId) await adminApi.promoCodes.update(editingId, payload);
      else await adminApi.promoCodes.create(payload);
      toast.success(editingId ? "Code enregistré" : "Code créé");
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    try {
      await adminApi.promoCodes.remove(id);
      await load();
      toast.success("Code supprimé");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Suppression impossible");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Codes promo</h1>
          <div className="page-subtitle">
            {codes.length} code{codes.length > 1 ? "s" : ""} · {activeCount} actif{activeCount > 1 ? "s" : ""}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={14} strokeWidth={2} />
          <span>Ajouter un code</span>
        </button>
      </div>

      <div style={{ background: "rgba(0,36,68,0.04)", border: "1px solid var(--outline-soft)", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
        <span style={{ color: "var(--primary)" }}><Ticket size={18} strokeWidth={1.6} /></span>
        <span style={{ color: "var(--on-surface-variant)" }}>
          Un code global s&apos;applique à tout le panier ; un code produit ne réduit que la ligne du produit concerné. La réduction s&apos;applique au sous-total (hors livraison).
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {codes.map((c) => {
          const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
          const usage =
            c.maxRedemptions != null
              ? `${c.timesRedeemed} / ${c.maxRedemptions}`
              : `${c.timesRedeemed}`;
          return (
            <div
              key={c.id}
              className="card"
              style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
              onClick={() => openEdit(c)}
            >
              <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface-container-low)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--primary)" }}>
                <Ticket size={20} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1, opacity: c.isActive && !expired ? 1 : 0.55 }}>
                <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>{c.code}</div>
                <div style={{ fontSize: 11.5, color: "var(--outline)", marginTop: 3 }}>
                  {c.productName ? `Produit : ${c.productName}` : "Global"}
                  {c.minOrderCents ? ` · min ${(c.minOrderCents / 100).toFixed(0)} €` : ""}
                  {c.perCustomerLimit != null ? ` · ${c.perCustomerLimit}/client` : ""}
                  {c.expiresAt ? ` · exp. ${fmtDate(c.expiresAt)}` : ""}
                </div>
              </div>
              <span className="pill pill-outline" style={{ fontFamily: "var(--mono)" }}>{discountLabel(c)}</span>
              <span style={{ fontSize: 12, color: "var(--outline)", fontFamily: "var(--mono)", minWidth: 56, textAlign: "right" }}>{usage}</span>
              {expired ? (
                <span className="pill pill-outline">Expiré</span>
              ) : c.isActive ? (
                <span className="pill pill-success-soft">Actif</span>
              ) : (
                <span className="pill pill-outline">Inactif</span>
              )}
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Modifier" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                <Pencil size={14} strokeWidth={1.7} />
              </button>
              <button className="icon-btn" style={{ width: 30, height: 30, color: "var(--error)" }} title="Supprimer" onClick={(e) => { e.stopPropagation(); remove(c.id); }}>
                <Trash2 size={14} strokeWidth={1.7} />
              </button>
            </div>
          );
        })}
        {codes.length === 0 && (
          <div style={{ color: "var(--outline)", fontSize: 13, padding: 24 }}>Aucun code promo.</div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onMouseDown={closeModal}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="card-title">{editingId ? "Modifier le code" : "Nouveau code promo"}</div>
                <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 4 }}>
                  {editingId ? "Mettez à jour ce code de réduction." : "Créez un code de réduction pour vos clients."}
                </div>
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={closeModal} title="Fermer">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="field">
                  <label className="field-label">Code</label>
                  <input
                    className="input mono"
                    style={{ textTransform: "uppercase" }}
                    placeholder="ETE2026"
                    value={form.code}
                    onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label className="field-label">Description (interne)</label>
                  <input className="input" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Type</label>
                    <select className="input" value={form.discountType} onChange={(e) => patch({ discountType: e.target.value as DiscountType })}>
                      <option value="percent">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (€)</option>
                    </select>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">{form.discountType === "percent" ? "Réduction (%)" : "Réduction (€)"}</label>
                    <input className="input" inputMode="decimal" value={form.discountValue} onChange={(e) => patch({ discountValue: e.target.value })} placeholder={form.discountType === "percent" ? "10" : "20"} />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Portée</label>
                  <select className="input" value={form.productId} onChange={(e) => patch({ productId: e.target.value })}>
                    <option value="">Global — tout le panier</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Commande min. (€)</label>
                    <input className="input" inputMode="decimal" value={form.minOrder} onChange={(e) => patch({ minOrder: e.target.value })} placeholder="Aucun" />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Utilisations max.</label>
                    <input className="input" inputMode="numeric" value={form.maxRedemptions} onChange={(e) => patch({ maxRedemptions: e.target.value })} placeholder="Illimité" />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Max / client</label>
                    <input className="input" inputMode="numeric" value={form.perCustomerLimit} onChange={(e) => patch({ perCustomerLimit: e.target.value })} placeholder="Illimité" />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Début</label>
                    <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Expiration</label>
                    <input className="input" type="datetime-local" value={form.expiresAt} onChange={(e) => patch({ expiresAt: e.target.value })} />
                  </div>
                </div>

                <div style={{ padding: 14, background: "var(--surface-container-low)", borderRadius: 10 }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span>Code actif</span>
                    <span className="switch"><input type="checkbox" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} /><span className="slider"></span></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={closeModal} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

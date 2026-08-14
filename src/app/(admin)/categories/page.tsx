"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Folder, Trash2, Pencil, X, ChevronUp, ChevronDown } from "lucide-react";
import { adminApi, api } from "@/lib/api";
import CategoryBlocksEditor, { type ConfigBlock } from "@/components/CategoryBlocksEditor";
import CategoryFeaturedPicker from "@/components/CategoryFeaturedPicker";
import MediaLibrary from "@/components/MediaLibrary";

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  description?: string;
  productCount?: number;
  accentColor?: string;
  parentId?: string;
  sortOrder: number;
  isVisible: boolean;
  isFeaturedHome: boolean;
  b2bOnly: boolean;
  deliveryOverride?: string;
  configBlocks?: ConfigBlock[];
}

interface Form {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  accentColor: string;
  isVisible: boolean;
  isFeaturedHome: boolean;
  b2bOnly: boolean;
  deliveryOverride: string;
  configBlocks: ConfigBlock[];
}

const SWATCHES = ["#FFC69A", "#E8D6FF", "#C8E0C0", "#F4C8C8", "#C8DCE8", "#F4E8C8"];

function blankForm(): Form {
  return {
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    accentColor: SWATCHES[0],
    isVisible: true,
    isFeaturedHome: false,
    b2bOnly: false,
    deliveryOverride: "",
    configBlocks: [],
  };
}

function toForm(c: AdminCategory): Form {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    imageUrl: c.image ?? "",
    accentColor: c.accentColor ?? SWATCHES[0],
    isVisible: c.isVisible,
    isFeaturedHome: c.isFeaturedHome,
    b2bOnly: c.b2bOnly,
    deliveryOverride: c.deliveryOverride ?? "",
    configBlocks: c.configBlocks ?? [],
  };
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blankForm());
  const [saving, setSaving] = useState(false);
  const [coverLibOpen, setCoverLibOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const list = (await adminApi.categories.list()) as AdminCategory[];
    setCats(list ?? []);
  }

  useEffect(() => {
    load().catch((e: { message?: string }) =>
      toast.error(e?.message ?? "Chargement impossible"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape + lock body scroll while the modal is open.
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
  }, [modalOpen]);

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditingId(c.id);
    setForm(toForm(c));
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  const visibleCount = cats.filter((c) => c.isVisible).length;
  const totalProducts = cats.reduce((n, c) => n + (c.productCount ?? 0), 0);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        accentColor: form.accentColor,
        isVisible: form.isVisible,
        isFeaturedHome: form.isFeaturedHome,
        b2bOnly: form.b2bOnly,
        deliveryOverride: form.deliveryOverride || undefined,
        configBlocks: form.configBlocks,
      };
      if (editingId) await adminApi.categories.update(editingId, payload);
      else await adminApi.categories.create(payload);
      toast.success(editingId ? "Catégorie enregistrée" : "Catégorie créée");
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  /** Move a category up/down in the list and persist the new order. */
  async function moveCategory(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= cats.length) return;
    const next = [...cats];
    [next[index], next[target]] = [next[target], next[index]];
    setCats(next);
    try {
      await adminApi.categories.reorder(next.map((c) => c.id));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Réordonnancement impossible");
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await adminApi.categories.remove(id);
      await load();
      toast.success("Catégorie supprimée");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Suppression impossible");
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await api.upload(file, "categories");
      patch({ imageUrl: url });
      toast.success("Image téléversée");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catégories</h1>
          <div className="page-subtitle">
            {cats.length} catégories · {totalProducts} produits · {visibleCount} visibles
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={14} strokeWidth={2} />
          <span>Ajouter une catégorie</span>
        </button>
      </div>

      <div style={{ background: "rgba(0,36,68,0.04)", border: "1px solid var(--outline-soft)", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
        <span style={{ color: "var(--primary)" }}><Folder size={18} strokeWidth={1.6} /></span>
        <span style={{ color: "var(--on-surface-variant)" }}>
          Cliquez sur une catégorie pour la modifier. Les catégories masquées ne s&apos;affichent pas dans l&apos;app.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cats.map((c, i) => (
          <div
            key={c.id}
            className="card"
            style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
            onClick={() => openEdit(c)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" style={{ width: 26, height: 22 }} title="Monter" disabled={i === 0} onClick={() => moveCategory(i, -1)}>
                <ChevronUp size={14} strokeWidth={2} />
              </button>
              <button className="icon-btn" style={{ width: 26, height: 22 }} title="Descendre" disabled={i === cats.length - 1} onClick={() => moveCategory(i, 1)}>
                <ChevronDown size={14} strokeWidth={2} />
              </button>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: c.image ? `url(${c.image}) center/cover` : "var(--surface-container-low)", flexShrink: 0, opacity: c.isVisible ? 1 : 0.4 }}></div>
            <div style={{ flex: 1, opacity: c.isVisible ? 1 : 0.55 }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--outline)", marginTop: 3, fontFamily: "var(--mono)" }}>
                /{c.slug} · {c.productCount ?? 0} produit{(c.productCount ?? 0) > 1 ? "s" : ""}
              </div>
            </div>
            {c.isVisible ? <span className="pill pill-success-soft">Visible</span> : <span className="pill pill-outline">Masquée</span>}
            <button className="icon-btn" style={{ width: 30, height: 30 }} title="Modifier" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
              <Pencil size={14} strokeWidth={1.7} />
            </button>
            <button className="icon-btn" style={{ width: 30, height: 30, color: "var(--error)" }} title="Supprimer" onClick={(e) => { e.stopPropagation(); remove(c.id); }}>
              <Trash2 size={14} strokeWidth={1.7} />
            </button>
          </div>
        ))}
        {cats.length === 0 && (
          <div style={{ color: "var(--outline)", fontSize: 13, padding: 24 }}>Aucune catégorie.</div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onMouseDown={closeModal}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="card-title">
                  {editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}
                </div>
                <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 4 }}>
                  {editingId ? "Mettez à jour les informations de la catégorie." : "Renseignez les informations de la nouvelle catégorie."}
                </div>
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={closeModal} title="Fermer">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="field">
                  <label className="field-label">Nom</label>
                  <input className="input" value={form.name} onChange={(e) => patch({ name: e.target.value })} autoFocus />
                </div>
                <div className="field">
                  <label className="field-label">Slug</label>
                  <input className="input mono" placeholder="généré depuis le nom" value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="textarea" style={{ minHeight: 60 }} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
                </div>

                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: 8 }}>Image de couverture</label>
                  <div style={{ height: 120, borderRadius: 10, background: form.imageUrl ? `url(${form.imageUrl}) center/cover` : "var(--surface-container-low)", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => setCoverLibOpen(true)}>
                        Bibliothèque
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => fileRef.current?.click()}>
                        Téléverser
                      </button>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                  <MediaLibrary
                    open={coverLibOpen}
                    folder="categories"
                    onClose={() => setCoverLibOpen(false)}
                    onPick={(urls) => urls[0] && patch({ imageUrl: urls[0] })}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: 8 }}>Couleur d&apos;accent</label>
                  <div className="hstack" style={{ gap: 8 }}>
                    {SWATCHES.map((s) => (
                      <div key={s} onClick={() => patch({ accentColor: s })} style={{ width: 32, height: 32, borderRadius: 8, background: s, cursor: "pointer", boxShadow: form.accentColor === s ? "0 0 0 2px var(--primary)" : undefined }}></div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, background: "var(--surface-container-low)", borderRadius: 10 }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span>Visible dans l&apos;app</span>
                    <span className="switch"><input type="checkbox" checked={form.isVisible} onChange={(e) => patch({ isVisible: e.target.checked })} /><span className="slider"></span></span>
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span>Mise en avant accueil</span>
                    <span className="switch"><input type="checkbox" checked={form.isFeaturedHome} onChange={(e) => patch({ isFeaturedHome: e.target.checked })} /><span className="slider"></span></span>
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span>Réservée aux pros (B2B)</span>
                    <span className="switch"><input type="checkbox" checked={form.b2bOnly} onChange={(e) => patch({ b2bOnly: e.target.checked })} /><span className="slider"></span></span>
                  </label>
                </div>

                <div className="field">
                  <label className="field-label">Délai de livraison spécifique</label>
                  <input className="input" placeholder="Hérité de la zone" value={form.deliveryOverride} onChange={(e) => patch({ deliveryOverride: e.target.value })} />
                </div>

                {editingId && (
                  <div style={{ borderTop: "1px solid var(--outline-soft)", paddingTop: 18 }}>
                    <CategoryFeaturedPicker categoryId={editingId} />
                  </div>
                )}

                <div style={{ borderTop: "1px solid var(--outline-soft)", paddingTop: 18 }}>
                  <CategoryBlocksEditor
                    blocks={form.configBlocks}
                    onChange={(configBlocks) => patch({ configBlocks })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={closeModal} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer la catégorie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

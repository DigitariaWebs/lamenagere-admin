"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronUp, ChevronDown, Pencil, X } from "lucide-react";
import { adminApi, api } from "@/lib/api";
import MediaLibrary from "@/components/MediaLibrary";

type LinkKind = "none" | "category" | "product";

interface Popup {
  id: string;
  title?: string;
  imageUrl: string;
  imagePath?: string;
  linkKind: LinkKind;
  linkCategoryId?: string;
  linkProductId?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  position: number;
}
interface ProductOption {
  id: string;
  name: string;
}
interface CategoryOption {
  id: string;
  name: string;
}

interface PopupForm {
  title: string;
  imageUrl: string;
  imagePath: string;
  linkKind: LinkKind;
  linkCategoryId: string;
  linkProductId: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const blankPopup = (): PopupForm => ({
  title: "",
  imageUrl: "",
  imagePath: "",
  linkKind: "none",
  linkCategoryId: "",
  linkProductId: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

// A datetime-local input wants "YYYY-MM-DDTHH:mm"; the API returns ISO strings.
const toLocalInput = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

export default function PopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PopupForm>(blankPopup());
  const [libOpen, setLibOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [p, prods, cats] = await Promise.all([
      adminApi.popups.list() as Promise<Popup[]>,
      adminApi.products.listAll<ProductOption>(),
      adminApi.categories.list() as Promise<CategoryOption[]>,
    ]);
    setPopups(p ?? []);
    setAllProducts(prods ?? []);
    setCategories(cats ?? []);
  }

  useEffect(() => {
    load().catch((e: { message?: string }) => toast.error(e?.message ?? "Chargement impossible"));
  }, []);

  function payload(f: PopupForm) {
    return {
      title: f.title || undefined,
      imageUrl: f.imageUrl,
      imagePath: f.imagePath || undefined,
      linkKind: f.linkKind,
      linkCategoryId: f.linkKind === "category" ? f.linkCategoryId || undefined : undefined,
      linkProductId: f.linkKind === "product" ? f.linkProductId || undefined : undefined,
      startsAt: toIso(f.startsAt),
      endsAt: toIso(f.endsAt),
      isActive: f.isActive,
    };
  }

  function openCreate() {
    setEditId(null);
    setForm(blankPopup());
    setOpen(true);
  }
  function openEdit(p: Popup) {
    setEditId(p.id);
    setForm({
      title: p.title ?? "",
      imageUrl: p.imageUrl,
      imagePath: p.imagePath ?? "",
      linkKind: p.linkKind ?? "none",
      linkCategoryId: p.linkCategoryId ?? "",
      linkProductId: p.linkProductId ?? "",
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      isActive: p.isActive,
    });
    setOpen(true);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, path } = await api.upload(file, "popups");
      setForm((f) => ({ ...f, imageUrl: url, imagePath: path }));
      toast.success("Image téléversée");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
    }
  }

  async function save() {
    if (!form.imageUrl) return toast.error("Une image est requise");
    setSaving(true);
    try {
      if (editId) await adminApi.popups.update(editId, payload(form));
      else await adminApi.popups.create(payload(form));
      setOpen(false);
      await load();
      toast.success(editId ? "Pop-up enregistré" : "Pop-up créé");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Popup) {
    setPopups((xs) => xs.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await adminApi.popups.update(p.id, {
        title: p.title,
        imageUrl: p.imageUrl,
        imagePath: p.imagePath,
        linkKind: p.linkKind,
        linkCategoryId: p.linkCategoryId,
        linkProductId: p.linkProductId,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        isActive: !p.isActive,
      });
    } catch {
      load();
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= popups.length) return;
    const next = [...popups];
    [next[index], next[target]] = [next[target], next[index]];
    setPopups(next);
    try {
      await adminApi.popups.reorder(next.map((p) => p.id));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Réordonnancement impossible");
      load();
    }
  }

  async function remove(id: string) {
    try {
      await adminApi.popups.remove(id);
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Suppression impossible");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pop-ups</h1>
          <div className="page-subtitle">
            Images marketing affichées à l&apos;ouverture de l&apos;application mobile
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={14} strokeWidth={2} /> Nouveau pop-up
        </button>
      </div>

      <div className="stack">
        <div className="card card-padded">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {popups.map((p, i) => (
              <div
                key={p.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid var(--outline-soft)", borderRadius: 12 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button className="icon-btn" style={{ width: 26, height: 22 }} title="Monter" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ChevronUp size={14} strokeWidth={2} />
                  </button>
                  <button className="icon-btn" style={{ width: 26, height: 22 }} title="Descendre" disabled={i === popups.length - 1} onClick={() => move(i, 1)}>
                    <ChevronDown size={14} strokeWidth={2} />
                  </button>
                </div>
                <div style={{ width: 84, height: 120, borderRadius: 10, background: p.imageUrl ? `url(${p.imageUrl}) center/cover` : "var(--surface-container-low)" }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 }}>{p.title || "Pop-up sans titre"}</div>
                  <div className="hstack" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
                    {p.linkKind && p.linkKind !== "none" && (
                      <span className="pill pill-outline">{p.linkKind === "category" ? "→ Catégorie" : "→ Produit"}</span>
                    )}
                    {(p.startsAt || p.endsAt) && <span className="pill pill-navy-soft">Programmé</span>}
                    {p.isActive ? <span className="pill pill-success-soft">Actif</span> : <span className="pill pill-outline">Inactif</span>}
                  </div>
                </div>
                <label className="switch"><input type="checkbox" checked={p.isActive} onChange={() => toggle(p)} /><span className="slider"></span></label>
                <button className="icon-btn" style={{ width: 30, height: 30 }} title="Modifier" onClick={() => openEdit(p)}>
                  <Pencil size={14} strokeWidth={1.7} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Suppr.</button>
              </div>
            ))}
            {popups.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucun pop-up. Créez-en un pour accueillir vos utilisateurs.</div>}
          </div>
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onMouseDown={() => !saving && setOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title">{editId ? "Modifier le pop-up" : "Nouveau pop-up"}</div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setOpen(false)} title="Fermer">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field">
                  <label className="field-label">Titre interne (optionnel)</label>
                  <input className="input" placeholder="ex. Soldes d'été" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: 8 }}>Image</label>
                  <div style={{ height: 260, borderRadius: 10, background: form.imageUrl ? `url(${form.imageUrl}) center/contain no-repeat` : "var(--surface-container-low)", backgroundColor: "var(--surface-container-low)", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => setLibOpen(true)}>Bibliothèque</button>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => fileRef.current?.click()}>Téléverser</button>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
                  <MediaLibrary open={libOpen} folder="popups" onClose={() => setLibOpen(false)} onPick={(urls) => urls[0] && setForm((f) => ({ ...f, imageUrl: urls[0], imagePath: "" }))} />
                </div>
                <div className="field">
                  <label className="field-label">Lien au clic</label>
                  <div className="select-wrap">
                    <select value={form.linkKind} onChange={(e) => setForm((f) => ({ ...f, linkKind: e.target.value as LinkKind }))}>
                      <option value="none">Aucun (image seule)</option>
                      <option value="category">Vers une catégorie</option>
                      <option value="product">Vers un produit</option>
                    </select>
                  </div>
                </div>
                {form.linkKind === "category" && (
                  <div className="field">
                    <label className="field-label">Catégorie</label>
                    <div className="select-wrap">
                      <select value={form.linkCategoryId} onChange={(e) => setForm((f) => ({ ...f, linkCategoryId: e.target.value }))}>
                        <option value="">Choisir…</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {form.linkKind === "product" && (
                  <div className="field">
                    <label className="field-label">Produit</label>
                    <div className="select-wrap">
                      <select value={form.linkProductId} onChange={(e) => setForm((f) => ({ ...f, linkProductId: e.target.value }))}>
                        <option value="">Choisir…</option>
                        {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="hstack" style={{ gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Début (optionnel)</label>
                    <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Fin (optionnel)</label>
                    <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                  </div>
                </div>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: 12, background: "var(--surface-container-low)", borderRadius: 10 }}>
                  <span>Actif</span>
                  <span className="switch"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /><span className="slider"></span></span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setOpen(false)} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : editId ? "Enregistrer" : "Créer le pop-up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

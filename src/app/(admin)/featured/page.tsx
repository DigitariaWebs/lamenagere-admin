"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronUp, ChevronDown, Pencil, X } from "lucide-react";
import { adminApi, api } from "@/lib/api";
import MediaLibrary from "@/components/MediaLibrary";

interface FeaturedProduct {
  id: string;
  name: string;
  category: { name: string };
  images: string[];
}
type LinkKind = "none" | "category" | "product";
interface Slide {
  id: string;
  kind: "image" | "video";
  title: string;
  subtitle?: string;
  mediaUrl: string;
  linkKind: LinkKind;
  linkCategoryId?: string;
  linkProductId?: string;
  isActive: boolean;
}
interface Banner {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
}
interface ProductOption {
  id: string;
  name: string;
}
interface CategoryOption {
  id: string;
  name: string;
}

interface SlideForm {
  kind: "image" | "video";
  title: string;
  subtitle: string;
  mediaUrl: string;
  linkKind: LinkKind;
  linkCategoryId: string;
  linkProductId: string;
  isActive: boolean;
}
interface BannerForm {
  badge: string;
  title: string;
  subtitle: string;
  isActive: boolean;
}

const blankSlide = (): SlideForm => ({
  kind: "image",
  title: "",
  subtitle: "",
  mediaUrl: "",
  linkKind: "none",
  linkCategoryId: "",
  linkProductId: "",
  isActive: true,
});
const blankBanner = (): BannerForm => ({ badge: "", title: "", subtitle: "", isActive: true });

export default function FeaturedPage() {
  const [tab, setTab] = useState<"products" | "carousel" | "banners">("products");
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [addId, setAddId] = useState("");

  // Slide modal
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideEditId, setSlideEditId] = useState<string | null>(null);
  const [slideForm, setSlideForm] = useState<SlideForm>(blankSlide());
  const [slideLibOpen, setSlideLibOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const slideFileRef = useRef<HTMLInputElement>(null);

  // Banner modal
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerEditId, setBannerEditId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerForm>(blankBanner());

  async function load() {
    const [f, c, b, p, cats] = await Promise.all([
      adminApi.featured.products() as Promise<FeaturedProduct[]>,
      adminApi.featured.carousel() as Promise<Slide[]>,
      adminApi.featured.banners() as Promise<Banner[]>,
      adminApi.products.listAll<ProductOption>(),
      adminApi.categories.list() as Promise<CategoryOption[]>,
    ]);
    setFeatured(f ?? []);
    setSlides(c ?? []);
    setBanners(b ?? []);
    setAllProducts(p ?? []);
    setCategories(cats ?? []);
  }

  useEffect(() => {
    load().catch((e: { message?: string }) => toast.error(e?.message ?? "Chargement impossible"));
  }, []);

  async function addProduct() {
    if (!addId) return;
    try {
      await adminApi.featured.addProduct(addId);
      setAddId("");
      await load();
      toast.success("Produit ajouté");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Ajout impossible");
    }
  }
  async function removeProduct(id: string) {
    try {
      await adminApi.featured.removeProduct(id);
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Retrait impossible");
    }
  }
  /** Move a featured product up/down and persist the new order. */
  async function moveProduct(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= featured.length) return;
    const next = [...featured];
    [next[index], next[target]] = [next[target], next[index]];
    setFeatured(next);
    try {
      await adminApi.featured.reorderProducts(next.map((p) => p.id));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Réordonnancement impossible");
      load();
    }
  }
  async function toggleSlide(s: Slide) {
    setSlides((xs) => xs.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await adminApi.featured.updateSlide(s.id, { ...slidePayload(s), isActive: !s.isActive });
    } catch {
      load();
    }
  }
  async function toggleBanner(b: Banner) {
    setBanners((xs) => xs.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await adminApi.featured.updateBanner(b.id, {
        badge: b.badge, title: b.title, subtitle: b.subtitle, isActive: !b.isActive,
      });
    } catch {
      load();
    }
  }

  // ── slide modal ────────────────────────────────────────────────────────────
  function slidePayload(s: Slide | SlideForm) {
    return {
      kind: s.kind,
      title: s.title,
      subtitle: s.subtitle || undefined,
      mediaUrl: s.mediaUrl,
      linkKind: s.linkKind,
      linkCategoryId: s.linkKind === "category" ? s.linkCategoryId || undefined : undefined,
      linkProductId: s.linkKind === "product" ? s.linkProductId || undefined : undefined,
    };
  }
  function openSlideCreate() {
    setSlideEditId(null);
    setSlideForm(blankSlide());
    setSlideOpen(true);
  }
  function openSlideEdit(s: Slide) {
    setSlideEditId(s.id);
    setSlideForm({
      kind: s.kind,
      title: s.title,
      subtitle: s.subtitle ?? "",
      mediaUrl: s.mediaUrl,
      linkKind: s.linkKind ?? "none",
      linkCategoryId: s.linkCategoryId ?? "",
      linkProductId: s.linkProductId ?? "",
      isActive: s.isActive,
    });
    setSlideOpen(true);
  }
  async function onPickSlideFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await api.upload(file, "carousel");
      setSlideForm((f) => ({ ...f, mediaUrl: url }));
      toast.success("Média téléversé");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
    }
  }
  async function saveSlide() {
    if (!slideForm.title.trim()) return toast.error("Le titre est requis");
    if (!slideForm.mediaUrl) return toast.error("Un média est requis");
    setSaving(true);
    try {
      const payload = { ...slidePayload(slideForm), isActive: slideForm.isActive };
      if (slideEditId) await adminApi.featured.updateSlide(slideEditId, payload);
      else await adminApi.featured.createSlide(payload);
      setSlideOpen(false);
      await load();
      toast.success(slideEditId ? "Slide enregistré" : "Slide créé");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  // ── banner modal ───────────────────────────────────────────────────────────
  function openBannerCreate() {
    setBannerEditId(null);
    setBannerForm(blankBanner());
    setBannerOpen(true);
  }
  function openBannerEdit(b: Banner) {
    setBannerEditId(b.id);
    setBannerForm({ badge: b.badge ?? "", title: b.title, subtitle: b.subtitle ?? "", isActive: b.isActive });
    setBannerOpen(true);
  }
  async function saveBanner() {
    if (!bannerForm.title.trim()) return toast.error("Le titre est requis");
    setSaving(true);
    try {
      const payload = {
        badge: bannerForm.badge || undefined,
        title: bannerForm.title,
        subtitle: bannerForm.subtitle || undefined,
        isActive: bannerForm.isActive,
      };
      if (bannerEditId) await adminApi.featured.updateBanner(bannerEditId, payload);
      else await adminApi.featured.createBanner(payload);
      setBannerOpen(false);
      await load();
      toast.success(bannerEditId ? "Bannière enregistrée" : "Bannière créée");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  const featuredIds = new Set(featured.map((f) => f.id));
  const addable = allProducts.filter((p) => !featuredIds.has(p.id));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mise en avant</h1>
          <div className="page-subtitle">Contrôlez ce qui apparaît en premier sur l&apos;application mobile</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <div className={`tab${tab === "products" ? " active" : ""}`} onClick={() => setTab("products")}>
          Produits vedette <span className="tcount">{featured.length}</span>
        </div>
        <div className={`tab${tab === "carousel" ? " active" : ""}`} onClick={() => setTab("carousel")}>
          Carrousel d&apos;accueil <span className="tcount">{slides.length}</span>
        </div>
        <div className={`tab${tab === "banners" ? " active" : ""}`} onClick={() => setTab("banners")}>
          Bannières promo <span className="tcount">{banners.length}</span>
        </div>
      </div>

      <div className="stack">
        {tab === "products" && (
          <div className="card card-padded">
            <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
              <div className="card-title">Sélection actuelle</div>
              <div className="hstack" style={{ gap: 8 }}>
                <div className="select-wrap">
                  <select value={addId} onChange={(e) => setAddId(e.target.value)}>
                    <option value="">Choisir un produit…</option>
                    {addable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button className="btn btn-outline btn-sm" onClick={addProduct} disabled={!addId}>
                  <Plus size={14} strokeWidth={2} /> Ajouter
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {featured.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid var(--outline-soft)", borderRadius: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontWeight: 600, fontSize: 14 }}>#{i + 1}</div>
                  <div className="thumb" style={{ backgroundImage: `url(${p.images?.[0] ?? ""})` }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>{p.category?.name}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button className="icon-btn" style={{ width: 26, height: 22 }} title="Monter" disabled={i === 0} onClick={() => moveProduct(i, -1)}>
                      <ChevronUp size={14} strokeWidth={2} />
                    </button>
                    <button className="icon-btn" style={{ width: 26, height: 22 }} title="Descendre" disabled={i === featured.length - 1} onClick={() => moveProduct(i, 1)}>
                      <ChevronDown size={14} strokeWidth={2} />
                    </button>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeProduct(p.id)}>Retirer</button>
                </div>
              ))}
              {featured.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucun produit vedette.</div>}
            </div>
          </div>
        )}

        {tab === "carousel" && (
          <div className="card card-padded">
            <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 18, gap: 10 }}>
              <div className="card-title">Carrousel d&apos;accueil</div>
              <button className="btn btn-outline btn-sm" onClick={openSlideCreate}>
                <Plus size={14} strokeWidth={2} /> Ajouter un slide
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slides.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid var(--outline-soft)", borderRadius: 12 }}>
                  <div style={{ width: 160, height: 96, borderRadius: 10, background: s.mediaUrl ? `url(${s.mediaUrl}) center/cover` : "var(--surface-container-low)" }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 }}>{s.title}</div>
                    {s.subtitle && <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{s.subtitle}</div>}
                    <div className="hstack" style={{ marginTop: 6, gap: 6 }}>
                      <span className={`pill ${s.kind === "video" ? "pill-bronze-soft" : "pill-navy-soft"}`}>{s.kind.toUpperCase()}</span>
                      {s.linkKind && s.linkKind !== "none" && <span className="pill pill-outline">{s.linkKind === "category" ? "→ Catégorie" : "→ Produit"}</span>}
                      {s.isActive && <span className="pill pill-success-soft">Active</span>}
                    </div>
                  </div>
                  <label className="switch"><input type="checkbox" checked={s.isActive} onChange={() => toggleSlide(s)} /><span className="slider"></span></label>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} title="Modifier" onClick={() => openSlideEdit(s)}>
                    <Pencil size={14} strokeWidth={1.7} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { await adminApi.featured.deleteSlide(s.id); load(); }}>Suppr.</button>
                </div>
              ))}
              {slides.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucun slide.</div>}
            </div>
          </div>
        )}

        {tab === "banners" && (
          <div className="card card-padded">
            <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 18, gap: 10 }}>
              <div className="card-title">Bannières promo</div>
              <button className="btn btn-outline btn-sm" onClick={openBannerCreate}>
                <Plus size={14} strokeWidth={2} /> Ajouter une bannière
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {banners.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, background: "linear-gradient(135deg, var(--primary), var(--primary-container))", color: "#fff" }}>
                  {b.badge && <span style={{ background: "rgba(255,255,255,0.18)", padding: "6px 12px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{b.badge}</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 }}>{b.title}</div>
                    {b.subtitle && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{b.subtitle}</div>}
                  </div>
                  <label className="switch"><input type="checkbox" checked={b.isActive} onChange={() => toggleBanner(b)} /><span className="slider"></span></label>
                  <button className="icon-btn" style={{ width: 30, height: 30, color: "#fff" }} title="Modifier" onClick={() => openBannerEdit(b)}>
                    <Pencil size={14} strokeWidth={1.7} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={async () => { await adminApi.featured.deleteBanner(b.id); load(); }}>Suppr.</button>
                </div>
              ))}
              {banners.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucune bannière.</div>}
            </div>
          </div>
        )}
      </div>

      {/* ── Slide modal ───────────────────────────────────────────────────── */}
      {slideOpen && (
        <div className="modal-overlay" onMouseDown={() => !saving && setSlideOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title">{slideEditId ? "Modifier le slide" : "Nouveau slide"}</div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setSlideOpen(false)} title="Fermer">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field">
                  <label className="field-label">Type</label>
                  <div className="select-wrap">
                    <select value={slideForm.kind} onChange={(e) => setSlideForm((f) => ({ ...f, kind: e.target.value as "image" | "video" }))}>
                      <option value="image">Image</option>
                      <option value="video">Vidéo</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Titre</label>
                  <input className="input" value={slideForm.title} onChange={(e) => setSlideForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                </div>
                <div className="field">
                  <label className="field-label">Sous-titre</label>
                  <input className="input" value={slideForm.subtitle} onChange={(e) => setSlideForm((f) => ({ ...f, subtitle: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: 8 }}>Média</label>
                  <div style={{ height: 140, borderRadius: 10, background: slideForm.mediaUrl ? `url(${slideForm.mediaUrl}) center/cover` : "var(--surface-container-low)", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => setSlideLibOpen(true)}>Bibliothèque</button>
                      <button className="btn btn-outline btn-sm" style={{ background: "rgba(255,255,255,0.95)" }} onClick={() => slideFileRef.current?.click()}>Téléverser</button>
                    </div>
                  </div>
                  <input ref={slideFileRef} type="file" accept="image/*,video/*" hidden onChange={onPickSlideFile} />
                  <MediaLibrary open={slideLibOpen} folder="carousel" onClose={() => setSlideLibOpen(false)} onPick={(url) => setSlideForm((f) => ({ ...f, mediaUrl: url }))} />
                </div>
                <div className="field">
                  <label className="field-label">Lien au clic</label>
                  <div className="select-wrap">
                    <select value={slideForm.linkKind} onChange={(e) => setSlideForm((f) => ({ ...f, linkKind: e.target.value as LinkKind }))}>
                      <option value="none">Aucun</option>
                      <option value="category">Vers une catégorie</option>
                      <option value="product">Vers un produit</option>
                    </select>
                  </div>
                </div>
                {slideForm.linkKind === "category" && (
                  <div className="field">
                    <label className="field-label">Catégorie</label>
                    <div className="select-wrap">
                      <select value={slideForm.linkCategoryId} onChange={(e) => setSlideForm((f) => ({ ...f, linkCategoryId: e.target.value }))}>
                        <option value="">Choisir…</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {slideForm.linkKind === "product" && (
                  <div className="field">
                    <label className="field-label">Produit</label>
                    <div className="select-wrap">
                      <select value={slideForm.linkProductId} onChange={(e) => setSlideForm((f) => ({ ...f, linkProductId: e.target.value }))}>
                        <option value="">Choisir…</option>
                        {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: 12, background: "var(--surface-container-low)", borderRadius: 10 }}>
                  <span>Active</span>
                  <span className="switch"><input type="checkbox" checked={slideForm.isActive} onChange={(e) => setSlideForm((f) => ({ ...f, isActive: e.target.checked }))} /><span className="slider"></span></span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setSlideOpen(false)} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveSlide} disabled={saving}>
                {saving ? "Enregistrement…" : slideEditId ? "Enregistrer" : "Créer le slide"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner modal ──────────────────────────────────────────────────── */}
      {bannerOpen && (
        <div className="modal-overlay" onMouseDown={() => !saving && setBannerOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title">{bannerEditId ? "Modifier la bannière" : "Nouvelle bannière"}</div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setBannerOpen(false)} title="Fermer">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="field">
                  <label className="field-label">Badge</label>
                  <input className="input" placeholder="ex. PROMO" value={bannerForm.badge} onChange={(e) => setBannerForm((f) => ({ ...f, badge: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Titre</label>
                  <input className="input" value={bannerForm.title} onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                </div>
                <div className="field">
                  <label className="field-label">Sous-titre</label>
                  <input className="input" value={bannerForm.subtitle} onChange={(e) => setBannerForm((f) => ({ ...f, subtitle: e.target.value }))} />
                </div>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: 12, background: "var(--surface-container-low)", borderRadius: 10 }}>
                  <span>Active</span>
                  <span className="switch"><input type="checkbox" checked={bannerForm.isActive} onChange={(e) => setBannerForm((f) => ({ ...f, isActive: e.target.checked }))} /><span className="slider"></span></span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setBannerOpen(false)} disabled={saving}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveBanner} disabled={saving}>
                {saving ? "Enregistrement…" : bannerEditId ? "Enregistrer" : "Créer la bannière"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

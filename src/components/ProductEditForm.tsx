"use client";

import { AREA_FORMULAS, AREA_FORMULA_KEYS, type AreaFormulaKey } from "@/lib/area-formulas";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, X, Images } from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
import { OPENING_TYPES, type OpeningTypeKey } from "@/lib/types";
import MediaLibrary from "./MediaLibrary";
import CategoryBlocksEditor, { type ConfigBlock } from "./CategoryBlocksEditor";
import ProductColorsEditor, { type ColorEntry } from "./ProductColorsEditor";

type Mode = "edit" | "new";
/** How a product is priced. "fixed" = single price; "sqm" = price per m² with
 *  customer-entered dimensions. (Quote-only products no longer exist.) */
type PriceKind = "fixed" | "sqm";
type Status = "brouillon" | "publie" | "archive";

interface OpeningTypeEntry {
  type: string;
  surcharge: string;
}

/** One quality tier row: label + its €/m² rate (as a text input). */
interface QualityTierEntry {
  key: string;
  label: string;
  pricePerSqm: string;
}

/** Standard tiers offered as one-click seeds; admin can add/remove/rename. */
const DEFAULT_TIERS: { key: string; label: string }[] = [
  { key: "bas", label: "Économique" },
  { key: "milieu", label: "Intermédiaire" },
  { key: "haute", label: "Premium" },
];

interface Category {
  id: string;
  name: string;
  configBlocks?: ConfigBlock[];
}

interface Form {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  priceKind: PriceKind;
  status: Status;
  price: string;
  purchaseCost: string;
  pricePerSqm: string;
  /** Which dimensions the customer is asked for, and how they make a surface. */
  areaFormula: AreaFormulaKey;
  openingTypes: OpeningTypeEntry[];
  qualityTiers: QualityTierEntry[];
  minWidth: string;
  minHeight: string;
  maxWidth: string;
  maxHeight: string;
  stockQty: string;
  lowStockThreshold: string;
  maxPerOrder: string;
  deliveryMetropole: string;
  deliveryOutremer: string;
  weightKg: string;
  volumeM3: string;
  freeShipping: boolean;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY: Form = {
  name: "", slug: "", sku: "", description: "", shortDescription: "",
  categoryId: "", priceKind: "fixed", status: "brouillon",
  price: "", purchaseCost: "", pricePerSqm: "", areaFormula: "width_height",
  openingTypes: [], qualityTiers: [],
  minWidth: "", minHeight: "", maxWidth: "", maxHeight: "",
  stockQty: "", lowStockThreshold: "3", maxPerOrder: "",
  deliveryMetropole: "2-3 semaines", deliveryOutremer: "8-12 semaines",
  weightKg: "", volumeM3: "", freeShipping: false,
  seoTitle: "", seoDescription: "",
};

const num = (s: string): number | undefined => {
  if (!s.trim()) return undefined;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const cents = (c: number | null): string => (c == null ? "" : String(c / 100));

/** Whole-number field (stock, quantity caps). Blank / invalid → undefined. */
const int = (s: string): number | undefined => {
  if (!s.trim()) return undefined;
  const n = Math.trunc(Number(s.replace(/\s/g, "")));
  return Number.isFinite(n) ? n : undefined;
};

export function ProductEditForm({ mode = "edit" }: { mode?: Mode }) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [form, setForm] = useState<Form>(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [overrideBlocks, setOverrideBlocks] = useState(false);
  const [blocks, setBlocks] = useState<ConfigBlock[]>([]);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi.categories
      .list()
      .then((r) => setCategories((r as Category[]) ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    adminApi.products
      .get(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((p: any) => {
        setForm({
          name: p.name ?? "",
          slug: p.slug ?? "",
          sku: p.sku ?? "",
          description: p.description ?? "",
          shortDescription: p.short_description ?? "",
          categoryId: p.category_id ?? "",
          priceKind: p.price_mode === "per_sqm" ? "sqm" : "fixed",
          status: p.status ?? "brouillon",
          price: cents(p.base_price_cents),
          purchaseCost: cents(p.purchase_cost_cents),
          pricePerSqm: cents(p.price_per_sqm_cents),
          areaFormula: (p.area_formula ?? "width_height") as AreaFormulaKey,
          openingTypes: ((p.opening_types ?? []) as { type: string; surcharge_cents: number }[]).map(
            (o) => ({ type: o.type, surcharge: cents(o.surcharge_cents) }),
          ),
          qualityTiers: (
            (p.quality_tiers ?? []) as { key: string; label: string; price_per_sqm_cents: number }[]
          ).map((t) => ({ key: t.key, label: t.label, pricePerSqm: cents(t.price_per_sqm_cents) })),
          minWidth: p.min_width != null ? String(p.min_width) : "",
          minHeight: p.min_height != null ? String(p.min_height) : "",
          maxWidth: p.max_width != null ? String(p.max_width) : "",
          maxHeight: p.max_height != null ? String(p.max_height) : "",
          stockQty: p.stock_qty != null ? String(p.stock_qty) : "",
          lowStockThreshold:
            p.low_stock_threshold != null ? String(p.low_stock_threshold) : "",
          maxPerOrder: p.max_per_order != null ? String(p.max_per_order) : "",
          deliveryMetropole: p.delivery_metropole ?? "",
          deliveryOutremer: p.delivery_outremer ?? "",
          weightKg: p.weight_kg != null ? String(p.weight_kg) : "",
          volumeM3: p.volume_m3 != null ? String(p.volume_m3) : "",
          freeShipping: !!p.free_shipping,
          seoTitle: p.seo_title ?? "",
          seoDescription: p.seo_description ?? "",
        });
        const media = (p.media ?? []) as { url: string; type: string }[];
        setImages(media.filter((m) => m.type === "image").map((m) => m.url));
        setVideos(media.filter((m) => m.type === "video").map((m) => m.url));
        const pb = (p.config_blocks ?? []) as ConfigBlock[];
        setOverrideBlocks(pb.length > 0);
        setBlocks(pb);
        const pc = (p.colors ?? []) as {
          key: string;
          name: string;
          hex?: string;
          images?: string[];
        }[];
        setColors(
          pc.map((c) => ({
            key: c.key ?? "",
            name: c.name ?? "",
            hex: c.hex ?? "#000000",
            images: c.images ?? [],
          })),
        );
      })
      .catch((e: { message?: string }) => toast.error(e?.message ?? "Produit introuvable"))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleOpeningType(type: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      openingTypes: checked
        ? [...f.openingTypes, { type, surcharge: "" }]
        : f.openingTypes.filter((o) => o.type !== type),
    }));
  }

  function patchOpeningSurcharge(type: string, surcharge: string) {
    setForm((f) => ({
      ...f,
      openingTypes: f.openingTypes.map((o) => (o.type === type ? { ...o, surcharge } : o)),
    }));
  }

  function addTier(seed?: { key: string; label: string }) {
    setForm((f) => {
      const key = seed?.key ?? `tier_${f.qualityTiers.length + 1}`;
      if (f.qualityTiers.some((t) => t.key === key)) return f;
      return {
        ...f,
        qualityTiers: [
          ...f.qualityTiers,
          { key, label: seed?.label ?? "", pricePerSqm: "" },
        ],
      };
    });
  }

  function patchTier(index: number, p: Partial<QualityTierEntry>) {
    setForm((f) => ({
      ...f,
      qualityTiers: f.qualityTiers.map((t, i) => (i === index ? { ...t, ...p } : t)),
    }));
  }

  function removeTier(index: number) {
    setForm((f) => ({
      ...f,
      qualityTiers: f.qualityTiers.filter((_, i) => i !== index),
    }));
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      try {
        const { url } = await api.upload(file, "products");
        setImages((imgs) => [...imgs, url]);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      try {
        const { url } = await api.upload(file, "products");
        setVideos((vids) => [...vids, url]);
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ?? "Téléversement vidéo échoué",
        );
      }
    }
    if (videoRef.current) videoRef.current.value = "";
  }

  function buildPayload(status: Status) {
    return {
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      description: form.description,
      shortDescription: form.shortDescription || undefined,
      categoryId: form.categoryId,
      productType: form.priceKind === "sqm" ? "configurable" : "standard",
      priceMode: form.priceKind === "sqm" ? "per_sqm" : "fixed",
      status,
      price: num(form.price),
      purchaseCost: num(form.purchaseCost),
      pricePerSqm: num(form.pricePerSqm),
    areaFormula: form.priceKind === "sqm" ? form.areaFormula : undefined,
      // Opening types belong to made-to-measure joinery. A fixed-price product
      // is bought by the unit, so it never carries them — sending one would
      // push the customer into the guided configuration flow instead of the
      // quantity stepper.
      openingTypes:
        form.priceKind === "sqm"
          ? form.openingTypes.map((o) => ({ type: o.type, surcharge: num(o.surcharge) }))
          : [],
      // Only per-m² products carry tiers; drop rows without a label or rate.
      qualityTiers:
        form.priceKind === "sqm"
          ? form.qualityTiers
              .filter((t) => t.label.trim() && num(t.pricePerSqm) != null)
              .map((t) => ({ key: t.key, label: t.label.trim(), pricePerSqm: num(t.pricePerSqm)! }))
          : [],
      minWidth: num(form.minWidth),
      minHeight: num(form.minHeight),
      maxWidth: num(form.maxWidth),
      maxHeight: num(form.maxHeight),
      customizable: form.priceKind === "sqm",
      // Stock and the per-order cap only bound the unit-sale stepper; a per-m²
      // product is made to order, so both are dropped.
      stockQty: form.priceKind === "fixed" ? int(form.stockQty) : undefined,
      lowStockThreshold:
        form.priceKind === "fixed" ? int(form.lowStockThreshold) : undefined,
      maxPerOrder: form.priceKind === "fixed" ? int(form.maxPerOrder) : undefined,
      deliveryMetropole: form.deliveryMetropole || undefined,
      deliveryOutremer: form.deliveryOutremer || undefined,
      weightKg: num(form.weightKg),
      volumeM3: num(form.volumeM3),
      freeShipping: form.freeShipping,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      imageUrls: images,
      videoUrls: videos,
      // Empty → server stores null → product inherits its category template.
      configBlocks: overrideBlocks ? blocks : [],
      // Drop unnamed colour rows; the server slugifies the key if missing.
      colors: colors
        .filter((c) => c.name.trim())
        .map((c) => ({
          key: c.key.trim(),
          name: c.name.trim(),
          hex: c.hex.trim() || undefined,
          images: c.images,
        })),
    };
  }

  async function save(status: Status) {
    if (!form.name.trim() || !form.categoryId) {
      toast.error("Nom et catégorie requis");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (isEdit && id) {
        await adminApi.products.update(id, payload);
        toast.success("Produit enregistré");
      } else {
        const created = (await adminApi.products.create(payload)) as { id: string };
        toast.success("Produit créé");
        router.push(`/products/${created.id}`);
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Supprimer ce produit ?")) return;
    try {
      await adminApi.products.remove(id);
      toast.success("Produit supprimé");
      router.push("/products");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Suppression impossible");
    }
  }

  if (loading) {
    return <div className="page"><div className="page-subtitle">Chargement…</div></div>;
  }

  return (
    <form className="page" onSubmit={(e) => { e.preventDefault(); save(form.status); }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Modifier le produit" : "Nouveau produit"}</h1>
          <div className="page-subtitle">{isEdit ? `${form.name} · ${form.sku}` : "Créer une nouvelle fiche"}</div>
        </div>
        <div className="hstack">
          <Link href="/products" className="btn btn-outline btn-sm">Annuler</Link>
          {form.status !== "publie" && (
            <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => save("publie")}>
              Publier
            </button>
          )}
          {/* Saves with the status selected in the "Statut" toggle (incl. Archivé). */}
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(form.status)}>
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="row-8-4">
        <div className="stack">
          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 20 }}>Informations générales</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="field">
                <label className="field-label">Nom du produit</label>
                <input className="input" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="field">
                  <label className="field-label">Slug</label>
                  <input className="input mono" value={form.slug} placeholder="auto depuis le nom" onChange={(e) => patch({ slug: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Catégorie</label>
                  <div className="select-wrap" style={{ width: "100%" }}>
                    <select style={{ width: "100%" }} value={form.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="textarea" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
              </div>
              <div className="field">
                <label className="field-label">Description courte</label>
                <input className="input" value={form.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 8 }}>Médias</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 16 }}>JPG, PNG · la première image est la principale</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {images.map((url, i) => (
                <div key={url} style={{ aspectRatio: "1", borderRadius: 10, background: `url(${url}) center/cover`, position: "relative" }}>
                  {i === 0 && <span className="pill pill-bronze" style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9 }}>Principale</span>}
                  <button type="button" onClick={() => setImages((im) => im.filter((u) => u !== url))} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div onClick={() => fileRef.current?.click()} style={{ aspectRatio: "1", borderRadius: 10, background: "var(--surface-container-low)", border: "1.5px dashed var(--outline-variant)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--outline)", cursor: "pointer" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <div style={{ fontSize: 10, textAlign: "center", marginTop: 6 }}>Ajouter</div>
              </div>
              <div onClick={() => setLibOpen(true)} style={{ aspectRatio: "1", borderRadius: 10, background: "var(--surface-container-low)", border: "1.5px dashed var(--outline-variant)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--outline)", cursor: "pointer" }}>
                <Images size={22} strokeWidth={1.6} />
                <div style={{ fontSize: 10, textAlign: "center", marginTop: 6 }}>Bibliothèque</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
            <MediaLibrary
              open={libOpen}
              folder="products"
              onClose={() => setLibOpen(false)}
              onPick={(url) => setImages((im) => (im.includes(url) ? im : [...im, url]))}
            />

            <div style={{ marginTop: 20 }}>
              <label className="field-label" style={{ display: "block", marginBottom: 8 }}>
                Vidéos (optionnel)
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {videos.map((url) => (
                  <div key={url} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
                    <video src={url} controls style={{ width: "100%", maxHeight: 200, display: "block" }} />
                    <button
                      type="button"
                      onClick={() => setVideos((vs) => vs.filter((u) => u !== url))}
                      style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => videoRef.current?.click()}
                  style={{ padding: "18px", borderRadius: 10, background: "var(--surface-container-low)", border: "1.5px dashed var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--outline)", cursor: "pointer", fontSize: 13 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  <span>Ajouter une vidéo (MP4, max 100 Mo)</span>
                </div>
              </div>
              <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={onPickVideos} />
            </div>
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 8 }}>Couleurs</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 16 }}>
              Proposez plusieurs coloris. Chaque couleur a ses propres photos : dans
              l&apos;app, le client choisit la couleur et la galerie affiche le produit
              dans ce coloris. Laissez vide si le produit n&apos;a qu&apos;une couleur.
            </div>
            <ProductColorsEditor colors={colors} onChange={setColors} />
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Tarification</div>

            <div className="field">
              <label className="field-label">Mode de tarification</label>
              <div className="seg" style={{ marginTop: 6 }}>
                {(["fixed", "sqm"] as PriceKind[]).map((k) => (
                  <button key={k} type="button" className={`seg-btn${form.priceKind === k ? " active" : ""}`} onClick={() => patch({ priceKind: k })}>
                    {k === "fixed" ? "Prix fixe" : "Au m²"}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 8 }}>
                {form.priceKind === "fixed"
                  ? "Prix unique, achat direct."
                  : "Le client saisit ses dimensions ; le prix est calculé automatiquement (prix au m² × surface)."}
              </div>
            </div>

            {form.priceKind === "fixed" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                <div className="field"><label className="field-label">Prix TTC (€)</label><input className="input" value={form.price} onChange={(e) => patch({ price: e.target.value })} /></div>
                <div className="field"><label className="field-label">Coût d&apos;achat (€)</label><input className="input" value={form.purchaseCost} onChange={(e) => patch({ purchaseCost: e.target.value })} /></div>
              </div>
            ) : (
              <div style={{ marginTop: 20, padding: 16, background: "var(--surface-container-low)", borderRadius: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Calcul au m²</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label className="field-label">Prix au m² (€)</label>
                    <input className="input" value={form.pricePerSqm} onChange={(e) => patch({ pricePerSqm: e.target.value })} disabled={form.qualityTiers.length > 0} />
                    {form.qualityTiers.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>Ignoré : le prix vient des gammes ci-dessous.</div>
                    )}
                  </div>
                  <div className="field"><label className="field-label">Coût d&apos;achat (€)</label><input className="input" value={form.purchaseCost} onChange={(e) => patch({ purchaseCost: e.target.value })} /></div>
                </div>

                {/* Formule de calcul: decides which dimensions the customer is
                    asked for in the app and how they become a billable surface.
                    The server prices with the same formula, so the two agree. */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="field-label">Formule de calcul</label>
                  <select
                    className="input"
                    value={form.areaFormula}
                    onChange={(e) => patch({ areaFormula: e.target.value as AreaFormulaKey })}
                  >
                    {AREA_FORMULA_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {AREA_FORMULAS[k].label}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 6 }}>
                    {AREA_FORMULAS[form.areaFormula].hint}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 8 }}>
                    Surface facturée = <strong>{AREA_FORMULAS[form.areaFormula].expression}</strong>
                    <br />
                    Le client saisira :{" "}
                    {AREA_FORMULAS[form.areaFormula].fields.map((f) => f.label).join(", ")}.
                  </div>
                </div>

                {/* Quality tiers: each has its own €/m² rate. When present, the
                    customer must pick one and it drives the price. */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="field-label">Gammes (prix au m² par qualité)</label>
                  <div style={{ fontSize: 12, color: "var(--outline)", margin: "4px 0 12px" }}>
                    Proposez plusieurs qualités (ex. Économique / Intermédiaire / Premium), chacune avec son prix au m². Le client choisit sa gamme et le prix s&apos;ajuste. Laissez vide pour un tarif unique.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {form.qualityTiers.map((tier, i) => (
                      <div key={tier.key} className="hstack" style={{ gap: 8, alignItems: "center" }}>
                        <input
                          className="input"
                          style={{ flex: 1 }}
                          placeholder="Nom de la gamme"
                          value={tier.label}
                          onChange={(e) => patchTier(i, { label: e.target.value })}
                        />
                        <input
                          className="input"
                          style={{ width: 130 }}
                          placeholder="€/m²"
                          value={tier.pricePerSqm}
                          onChange={(e) => patchTier(i, { pricePerSqm: e.target.value })}
                        />
                        <button type="button" className="btn btn-ghost" onClick={() => removeTier(i)} aria-label="Retirer la gamme">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="hstack" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {DEFAULT_TIERS.filter((d) => !form.qualityTiers.some((t) => t.key === d.key)).map((d) => (
                      <button key={d.key} type="button" className="btn btn-ghost" onClick={() => addTier(d)}>
                        + {d.label}
                      </button>
                    ))}
                    <button type="button" className="btn btn-ghost" onClick={() => addTier()}>
                      + Gamme personnalisée
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 8 }}>
                  Bornes de saisie. La 1ʳᵉ valeur borne <strong>toutes</strong> les mesures
                  horizontales (largeur, longueur, gauche, fond, droite) ; la 2ᵉ borne la hauteur.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="field"><label className="field-label">Min L×H (cm)</label>
                    <div className="hstack" style={{ gap: 6 }}>
                      <input className="input" placeholder="L" value={form.minWidth} onChange={(e) => patch({ minWidth: e.target.value })} />
                      <input className="input" placeholder="H" value={form.minHeight} onChange={(e) => patch({ minHeight: e.target.value })} />
                    </div>
                  </div>
                  <div className="field"><label className="field-label">Max L×H (cm)</label>
                    <div className="hstack" style={{ gap: 6 }}>
                      <input className="input" placeholder="L" value={form.maxWidth} onChange={(e) => patch({ maxWidth: e.target.value })} />
                      <input className="input" placeholder="H" value={form.maxHeight} onChange={(e) => patch({ maxHeight: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unit-sale module. Only fixed-price products are bought by the
              unit; per-m² products are made to order from dimensions. */}
          {form.priceKind === "fixed" && (
            <div className="card card-padded">
              <div className="card-title" style={{ marginBottom: 8 }}>Vente à l&apos;unité</div>
              <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 20 }}>
                Dans l&apos;app, le client choisit une quantité avec − / + puis ajoute au
                panier. Renseignez le stock pour que le sélecteur s&apos;arrête à ce qui
                reste disponible.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <div className="field">
                  <label className="field-label">Stock disponible</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="Illimité"
                    value={form.stockQty}
                    onChange={(e) => patch({ stockQty: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>
                    Vide = stock non suivi
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Seuil stock faible</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="3"
                    value={form.lowStockThreshold}
                    onChange={(e) => patch({ lowStockThreshold: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>
                    En dessous, l&apos;app affiche l&apos;alerte
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Max par commande</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="Aucune limite"
                    value={form.maxPerOrder}
                    onChange={(e) => patch({ maxPerOrder: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>
                    Plafond du sélecteur
                  </div>
                </div>
              </div>

              {/* States plainly what the customer ends up seeing. */}
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 14px",
                  background: "var(--surface-container-low)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--on-surface-variant)",
                }}
              >
                {(() => {
                  const stock = int(form.stockQty);
                  const cap = int(form.maxPerOrder);
                  if (stock != null && stock <= 0) {
                    return "Stock épuisé : l'app affiche « Rupture de stock » et le bouton Ajouter au panier est désactivé.";
                  }
                  const limit = Math.min(stock ?? Infinity, cap ?? Infinity);
                  return Number.isFinite(limit)
                    ? `Le client pourra choisir de 1 à ${limit} unité${limit > 1 ? "s" : ""}.`
                    : "Le client pourra choisir de 1 à 99 unités (aucune limite fixée).";
                })()}
              </div>
            </div>
          )}

          {form.priceKind === "sqm" && (
          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 8 }}>Types d&apos;ouverture</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 16 }}>Sélectionnez les ouvertures disponibles et leur supplément éventuel</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.keys(OPENING_TYPES) as OpeningTypeKey[]).map((key) => {
                const selected = form.openingTypes.find((o) => o.type === key);
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) => toggleOpeningType(key, e.target.checked)}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{OPENING_TYPES[key]}</span>
                    </label>
                    {selected && (
                      <div className="hstack" style={{ gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--outline)" }}>Supplément (€)</span>
                        <input
                          className="input"
                          style={{ width: 110 }}
                          value={selected.surcharge}
                          onChange={(e) => patchOpeningSurcharge(key, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 8 }}>Configuration (blocs)</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 14 }}>
              {form.priceKind === "fixed"
                ? "Un produit à prix fixe se vend à l'unité : il n'hérite pas des blocs de sa catégorie. Activez la personnalisation seulement pour lui demander un choix avant l'achat — le client passera alors par la configuration guidée au lieu du sélecteur de quantité."
                : "Par défaut, ce produit hérite des blocs de sa catégorie. Activez la personnalisation pour lui donner ses propres blocs (accessoires, couleurs…)."}
            </div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: overrideBlocks ? 16 : 0 }}>
              <span>Personnaliser pour ce produit</span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={overrideBlocks}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setOverrideBlocks(on);
                    // Seed from the chosen category's template on first enable.
                    if (on && blocks.length === 0) {
                      const cat = categories.find((c) => c.id === form.categoryId);
                      setBlocks(cat?.configBlocks ? structuredClone(cat.configBlocks) : []);
                    }
                  }}
                />
                <span className="slider"></span>
              </span>
            </label>
            {overrideBlocks && (
              <CategoryBlocksEditor blocks={blocks} onChange={setBlocks} />
            )}
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Livraison</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="field"><label className="field-label">Délai métropole</label><input className="input" value={form.deliveryMetropole} onChange={(e) => patch({ deliveryMetropole: e.target.value })} /></div>
              <div className="field"><label className="field-label">Délai outre-mer</label><input className="input" value={form.deliveryOutremer} onChange={(e) => patch({ deliveryOutremer: e.target.value })} /></div>
              <div className="field"><label className="field-label">Poids estimé (kg)</label><input className="input" value={form.weightKg} onChange={(e) => patch({ weightKg: e.target.value })} /></div>
              <div className="field"><label className="field-label">Encombrement (m³)</label><input className="input" value={form.volumeM3} onChange={(e) => patch({ volumeM3: e.target.value })} /></div>
            </div>
            <label style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <span className="switch"><input type="checkbox" checked={form.freeShipping} onChange={(e) => patch({ freeShipping: e.target.checked })} /><span className="slider"></span></span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Livraison gratuite</span>
            </label>
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>SEO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field"><label className="field-label">Titre SEO</label><input className="input" value={form.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} /></div>
              <div className="field"><label className="field-label">Description SEO</label><textarea className="textarea" style={{ minHeight: 60 }} value={form.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} /></div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card-padded">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Statut</div>
            <div className="seg" style={{ width: "100%" }}>
              {(["brouillon", "publie", "archive"] as Status[]).map((s) => (
                <button key={s} type="button" className={`seg-btn${form.status === s ? " active" : ""}`} style={{ flex: 1 }} onClick={() => patch({ status: s })}>
                  {s === "brouillon" ? "Brouillon" : s === "publie" ? "Publié" : "Archivé"}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--outline)", lineHeight: 1.5 }}>
              La mise en avant se gère désormais depuis la page <strong>Mise en avant</strong> (accueil)
              ou par catégorie depuis l&apos;éditeur de catégorie.
            </div>
          </div>

          <div className="card card-padded">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm">
                <ExternalLink size={14} strokeWidth={1.8} />
                <span>Voir sur la boutique</span>
              </button>
              {isEdit && <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Supprimer</button>}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { AreaFormulaKey } from "@/lib/area-formulas";
import type { ConfigBlock } from "./CategoryBlocksEditor";
import type { ColorEntry } from "./ProductColorsEditor";
import { ConfirmDialog, type ConfirmSpec } from "./product-form/ConfirmDialog";
import { CustomerPreview } from "./product-form/CustomerPreview";
import { TabEssentiel } from "./product-form/TabEssentiel";
import { TabPricing } from "./product-form/TabPricing";
import { TabMedia } from "./product-form/TabMedia";
import { TabConfiguration } from "./product-form/TabConfiguration";
import { TabLogistics } from "./product-form/TabLogistics";
import { byShapeSetupIssue, errorMap, errorsByTab, validate } from "./product-form/validate";
import {
  cents,
  EMPTY,
  int,
  num,
  type Category,
  type Form,
  type FormState,
  type Mode,
  type PriceKind,
  type Status,
  type TabKey,
} from "./product-form/types";

const TABS: { key: TabKey; label: string }[] = [
  { key: "essentiel", label: "Essentiel" },
  { key: "prix", label: "Prix & mesures" },
  { key: "medias", label: "Médias & couleurs" },
  { key: "config", label: "Configuration" },
  { key: "livraison", label: "Livraison & SEO" },
];

const STATUSES: { key: Status; label: string }[] = [
  { key: "brouillon", label: "Brouillon" },
  { key: "publie", label: "Publié" },
  { key: "archive", label: "Archivé" },
];

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
  const [overrideBlocks, setOverrideBlocks] = useState(false);
  const [blocks, setBlocks] = useState<ConfigBlock[]>([]);
  const [colors, setColors] = useState<ColorEntry[]>([]);

  const [tab, setTab] = useState<TabKey>("essentiel");
  /** Errors are only surfaced once the admin has tried to save at least once. */
  const [showErrors, setShowErrors] = useState(false);
  const [confirmSpec, setConfirmSpec] = useState<ConfirmSpec | null>(null);
  /** Snapshot of the loaded document, to detect unsaved changes. */
  const baseline = useRef<string>("");

  useEffect(() => {
    adminApi.categories
      .list()
      .then((r) => setCategories((r as Category[]) ?? []))
      .catch(() => {});
  }, []);

  const state: FormState = useMemo(
    () => ({ form, images, videos, colors, blocks, overrideBlocks, categories }),
    [form, images, videos, colors, blocks, overrideBlocks, categories],
  );

  const snapshot = useCallback(
    () => JSON.stringify({ form, images, videos, colors, blocks, overrideBlocks }),
    [form, images, videos, colors, blocks, overrideBlocks],
  );

  const errors = useMemo(() => validate(state), [state]);
  const errorsFor = useMemo(() => (showErrors ? errorMap(errors) : {}), [showErrors, errors]);
  const errorCounts = useMemo(
    () => (showErrors ? errorsByTab(errors) : null),
    [showErrors, errors],
  );

  useEffect(() => {
    if (!isEdit || !id) return;
    adminApi.products
      .get(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((p: any) => {
        const loaded: Form = {
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
        };
        const media = (p.media ?? []) as { url: string; type: string }[];
        const loadedImages = media.filter((m) => m.type === "image").map((m) => m.url);
        const loadedVideos = media.filter((m) => m.type === "video").map((m) => m.url);
        const pb = (p.config_blocks ?? []) as ConfigBlock[];
        const pc = (p.colors ?? []) as {
          key: string;
          name: string;
          hex?: string;
          images?: string[];
        }[];
        const loadedColors: ColorEntry[] = pc.map((c) => ({
          key: c.key ?? "",
          name: c.name ?? "",
          hex: c.hex ?? "#000000",
          images: c.images ?? [],
        }));

        setForm(loaded);
        setImages(loadedImages);
        setVideos(loadedVideos);
        setOverrideBlocks(pb.length > 0);
        setBlocks(pb);
        setColors(loadedColors);
        baseline.current = JSON.stringify({
          form: loaded,
          images: loadedImages,
          videos: loadedVideos,
          colors: loadedColors,
          blocks: pb,
          overrideBlocks: pb.length > 0,
        });
      })
      .catch((e: { message?: string }) => toast.error(e?.message ?? "Produit introuvable"))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  useEffect(() => {
    if (!isEdit) baseline.current = snapshot();
    // Only on mount for a new product: the empty form is the reference point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const dirty = !loading && baseline.current !== "" && baseline.current !== snapshot();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  /**
   * Switching the pricing mode drops the fields the other mode doesn't carry.
   * That used to happen silently inside `buildPayload`; now it is announced and
   * applied immediately, so the form and the preview never lie about what will
   * be saved.
   */
  function requestPriceKind(kind: PriceKind) {
    if (kind === form.priceKind) return;

    const losses: string[] = [];
    if (kind === "sqm") {
      if (form.stockQty.trim()) losses.push(`Stock disponible (${form.stockQty})`);
      if (form.maxPerOrder.trim()) losses.push(`Max par commande (${form.maxPerOrder})`);
    } else {
      if (form.qualityTiers.length > 0) {
        losses.push(`${form.qualityTiers.length} gamme(s) de qualité`);
      }
      if (form.pricePerSqm.trim()) losses.push(`Prix au m² (${form.pricePerSqm} €)`);
    }

    const apply = () => {
      if (kind === "sqm") {
        patch({ priceKind: kind, stockQty: "", maxPerOrder: "" });
      } else {
        patch({ priceKind: kind, qualityTiers: [], pricePerSqm: "" });
      }
    };

    if (losses.length === 0) {
      apply();
      return;
    }

    setConfirmSpec({
      title: kind === "sqm" ? "Passer au prix au m² ?" : "Passer au prix fixe ?",
      message: "Ce mode n'utilise pas les réglages suivants ; ils seront effacés :",
      bullets: losses,
      confirmLabel: "Changer de mode",
      danger: true,
      onConfirm: apply,
    });
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
      // Only per-m² products carry tiers; incomplete rows are caught by the
      // validator before we get here.
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
    setShowErrors(true);
    const found = validate({ ...state, form: { ...form, status } });
    if (found.length > 0) {
      const first = found[0];
      setTab(first.tab);
      toast.error(
        found.length === 1 ? first.message : `${found.length} champs à corriger`,
      );
      // The tab switch is a state update: give React a frame to mount the
      // panel before reaching into the DOM for the control.
      window.setTimeout(() => {
        const el = document.getElementById(first.field);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          (el as HTMLElement).focus({ preventScroll: true });
        }
      }, 60);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (isEdit && id) {
        await adminApi.products.update(id, payload);
        baseline.current = JSON.stringify({
          form: { ...form, status },
          images,
          videos,
          colors,
          blocks,
          overrideBlocks,
        });
        setForm((f) => ({ ...f, status }));
        toast.success("Produit enregistré");
      } else {
        const created = (await adminApi.products.create(payload)) as { id: string };
        baseline.current = snapshot();
        toast.success("Produit créé");
        router.push(`/products/${created.id}`);
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function leave() {
    if (!dirty) {
      router.push("/products");
      return;
    }
    setConfirmSpec({
      title: "Quitter sans enregistrer ?",
      message: "Les modifications apportées à cette fiche seront perdues.",
      confirmLabel: "Quitter sans enregistrer",
      danger: true,
      onConfirm: () => router.push("/products"),
    });
  }

  function remove() {
    if (!id) return;
    setConfirmSpec({
      title: "Supprimer ce produit ?",
      message: `« ${form.name || "Sans nom"} » sera retiré du catalogue. Cette action est définitive.`,
      confirmLabel: "Supprimer définitivement",
      danger: true,
      onConfirm: async () => {
        try {
          await adminApi.products.remove(id);
          baseline.current = snapshot();
          toast.success("Produit supprimé");
          router.push("/products");
        } catch (e) {
          toast.error((e as { message?: string })?.message ?? "Suppression impossible");
        }
      },
    });
  }

  if (loading) return <LoadingSkeleton />;

  /** Grey / green / red dot telling where the remaining work is. */
  function dotClass(key: TabKey): string {
    if (errorCounts && errorCounts[key] > 0) return "tab-dot err";
    const filled: Record<TabKey, boolean> = {
      essentiel: !!form.name.trim() && !!form.categoryId,
      prix:
        form.priceKind === "fixed"
          ? num(form.price) != null
          : num(form.pricePerSqm) != null || form.qualityTiers.length > 0,
      medias: images.length > 0 || videos.length > 0 || colors.length > 0,
      config: overrideBlocks ? blocks.length > 0 : false,
      livraison: !!form.deliveryMetropole.trim() || !!form.seoTitle.trim(),
    };
    return filled[key] ? "tab-dot ok" : "tab-dot";
  }

  return (
    <form
      className="page"
      onSubmit={(e) => {
        e.preventDefault();
        save(form.status);
      }}
    >
      <div className="form-sticky">
        <div className="fs-row">
          <div style={{ minWidth: 0 }}>
            <div className="hstack" style={{ gap: 10 }}>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                aria-label="Retour à la liste des produits"
                onClick={leave}
              >
                <ArrowLeft size={17} />
              </button>
              <h1 className="fs-title">
                {isEdit ? "Modifier le produit" : "Nouveau produit"}
              </h1>
            </div>
            <div className="fs-sub">
              {isEdit ? (
                <span>
                  {form.name || "Sans nom"}
                  {form.sku ? ` · ${form.sku}` : ""}
                </span>
              ) : (
                <span>Créer une nouvelle fiche</span>
              )}
              {dirty && <span className="dirty-mark">Modifications non enregistrées</span>}
            </div>
          </div>

          <div className="hstack" style={{ gap: 10, flexWrap: "wrap" }}>
            <div className="seg" role="group" aria-label="Statut du produit">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`seg-btn${form.status === s.key ? " active" : ""}`}
                  aria-pressed={form.status === s.key}
                  onClick={() => patch({ status: s.key })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={leave}>
              Annuler
            </button>
            {isEdit && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={remove}
                aria-label="Supprimer le produit"
              >
                <Trash2 size={14} />
              </button>
            )}
            {form.status !== "publie" && (
              <button
                type="button"
                className="btn btn-bronze btn-sm"
                disabled={saving}
                onClick={() => save("publie")}
              >
                Publier
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => save(form.status)}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span className={dotClass(t.key)} aria-hidden="true" />
              {t.label}
              {errorCounts && errorCounts[t.key] > 0 && (
                <span className="tcount" style={{ background: "var(--error)", color: "#fff" }}>
                  {errorCounts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="row-8-4">
        <div>
          {tab === "essentiel" && (
            <TabEssentiel
              form={form}
              patch={patch}
              errors={errorsFor}
              categories={categories}
            />
          )}
          {tab === "prix" && (
            <TabPricing
              form={form}
              patch={patch}
              errors={errorsFor}
              onPriceKindChange={requestPriceKind}
              setupIssue={byShapeSetupIssue(state)}
            />
          )}
          {tab === "medias" && (
            <TabMedia
              images={images}
              setImages={setImages}
              videos={videos}
              setVideos={setVideos}
              colors={colors}
              setColors={setColors}
              errors={errorsFor}
            />
          )}
          {tab === "config" && (
            <TabConfiguration
              form={form}
              categories={categories}
              blocks={blocks}
              setBlocks={setBlocks}
              overrideBlocks={overrideBlocks}
              setOverrideBlocks={setOverrideBlocks}
            />
          )}
          {tab === "livraison" && <TabLogistics form={form} patch={patch} />}
        </div>

        <CustomerPreview state={state} />
      </div>

      <ConfirmDialog spec={confirmSpec} onClose={() => setConfirmSpec(null)} />
    </form>
  );
}

function LoadingSkeleton() {
  return (
    <div className="page">
      <div className="skel" style={{ height: 28, width: 260, marginBottom: 12 }} />
      <div className="skel" style={{ height: 14, width: 180, marginBottom: 28 }} />
      <div className="row-8-4">
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card card-padded">
              <div className="skel" style={{ height: 34, width: 34, borderRadius: 10, marginBottom: 18 }} />
              <div className="skel" style={{ height: 40, marginBottom: 16 }} />
              <div className="skel" style={{ height: 40, marginBottom: 16 }} />
              <div className="skel" style={{ height: 40, width: "60%" }} />
            </div>
          ))}
        </div>
        <div className="card card-padded">
          <div className="skel" style={{ aspectRatio: "4 / 3", borderRadius: 12, marginBottom: 16 }} />
          <div className="skel" style={{ height: 16, marginBottom: 10 }} />
          <div className="skel" style={{ height: 16, width: "50%" }} />
        </div>
      </div>
    </div>
  );
}

"use client";
import {
  AREA_FORMULAS,
  DIMENSION_ROLES,
  type AreaDimensionKey,
  type AreaFormulaKey,
  type DimensionRole,
} from "@/lib/area-formulas";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Ruler,
  Shapes,
  Palette,
  Package,
  DoorOpen,
  Camera,
  ListChecks,
  Info,
  X,
  Table,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MediaLibrary from "./MediaLibrary";

// ── Shared config-block model (mirrors server ConfigBlock) ──────────────────
export type ConfigBlockType =
  | "measurements"
  | "shape"
  | "ilot"
  | "colors"
  | "accessories"
  | "opening_details"
  | "photos"
  | "options";

export interface ConfigBlockField {
  key: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  /**
   * For per-m² products priced by shape: what this measurement contributes to
   * the billed surface. Untagged fields are recorded but never billed.
   */
  priceRole?: DimensionRole | null;
  /**
   * `ilot` blocks only: which dimension of the block's own area formula this
   * measurement feeds. Untagged fields are recorded but never billed.
   */
  dimensionKey?: AreaDimensionKey | null;
}
export interface ConfigBlockOption {
  key: string;
  label: string;
  image?: string;
  hex?: string;
  surchargeCents?: number;
  /** Shape options only: how many pans this shape bills (I = 1, L = 2, U = 3). */
  runs?: number | null;
}
export interface ConfigBlockItem {
  id: string;
  title: string;
  image?: string;
  priceCents?: number;
}
/** Which products of a category a block is meant for. */
export type BlockAudience = "all" | "sqm" | "fixed";

const AUDIENCES: { key: BlockAudience; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "sqm", label: "Au m²" },
  { key: "fixed", label: "Prix fixe" },
];

export interface ConfigBlock {
  id: string;
  type: ConfigBlockType;
  label: string;
  required?: boolean;
  /**
   * One template has to serve a family sold both from catalogue and made to
   * measure, so a block asking for the customer's own dimensions can be limited
   * to per-m² products. Absent means every product.
   */
  appliesTo?: BlockAudience;
  multiple?: boolean;
  helpText?: string;
  planImage?: string;
  fields?: ConfigBlockField[];
  options?: ConfigBlockOption[];
  items?: ConfigBlockItem[];
  /**
   * `ilot` blocks only — the island carries its own price, independent of the
   * product's gamme. "fixed" bills `priceCents` flat; "per_sqm" bills the
   * surface built from the tagged fields through `areaFormula`.
   */
  priceMode?: "fixed" | "per_sqm";
  priceCents?: number;
  pricePerSqmCents?: number;
  areaFormula?: AreaFormulaKey;
}

/**
 * An island is a box standing in the room: what it costs follows its footprint,
 * so its formula is fixed to Largeur × Longueur and the admin only says which
 * of its measurements is which. One less thing to get wrong.
 */
const ILOT_FORMULA: AreaFormulaKey = "width_length";
const DIMENSION_CHOICES: { key: AreaDimensionKey; label: string }[] =
  AREA_FORMULAS[ILOT_FORMULA].fields.map((f) => ({ key: f.key, label: f.label }));

export const BLOCK_META: Record<
  ConfigBlockType,
  { label: string; hint: string; defaultLabel: string; icon: LucideIcon }
> = {
  measurements: { label: "Mesures", hint: "Champs numériques (hauteur, longueur…)", defaultLabel: "Mesures", icon: Ruler },
  shape: { label: "Forme", hint: "Choix unique illustré (I / L / U)", defaultLabel: "Forme", icon: Shapes },
  ilot: { label: "Îlot", hint: "Photo, dimensions et prix propre à l'îlot", defaultLabel: "Îlot", icon: Table },
  colors: { label: "Couleurs", hint: "Nuancier, surcoût possible", defaultLabel: "Couleur", icon: Palette },
  accessories: { label: "Accessoires", hint: "Liste d'options avec prix et image", defaultLabel: "Accessoires de rangement", icon: Package },
  opening_details: { label: "Détails d'ouverture", hint: "Battant, asymétrique… prix + image", defaultLabel: "Détails d'ouverture", icon: DoorOpen },
  photos: { label: "Photos du client", hint: "Le client téléverse des photos de son emplacement", defaultLabel: "Photos de l'emplacement", icon: Camera },
  options: { label: "Options personnalisées", hint: "Choix générique avec ou sans image", defaultLabel: "Options", icon: ListChecks },
};

const ORDER: ConfigBlockType[] = [
  "measurements",
  "shape",
  "ilot",
  "colors",
  "accessories",
  "opening_details",
  "photos",
  "options",
];

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function eurosToCents(v: string): number | undefined {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}
function centsToEuros(c?: number): string {
  return c == null ? "" : String(c / 100);
}

/** How many editable entries a block holds, whatever shape they take. */
function blockCount(b: ConfigBlock): number {
  return b.fields?.length ?? b.options?.length ?? b.items?.length ?? 0;
}

interface Props {
  blocks: ConfigBlock[];
  onChange: (blocks: ConfigBlock[]) => void;
}

export default function CategoryBlocksEditor({ blocks, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  /** Collapsed by default beyond the first, so a long list stays scannable. */
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function update(id: string, patch: Partial<ConfigBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function addBlock(type: ConfigBlockType) {
    const meta = BLOCK_META[type];
    const base: ConfigBlock = { id: uid("blk"), type, label: meta.defaultLabel };
    if (type === "measurements") base.fields = [];
    else if (type === "ilot") {
      // Starts free: the island only costs something once the admin prices it.
      base.fields = [];
      base.priceMode = "fixed";
      base.priceCents = 0;
      base.areaFormula = ILOT_FORMULA;
    }
    else if (type === "shape") {
      // The three shapes are the whole vocabulary — offer them all and let the
      // admin untick the ones this product doesn't do.
      base.options = SHAPES.map((s) => ({ key: s.key, label: s.label, runs: s.runs }));
    }
    else if (type === "accessories") { base.items = []; base.multiple = true; }
    else if (type === "colors" || type === "opening_details" || type === "options") base.options = [];
    onChange([...blocks, base]);
    setOpen((o) => ({ ...o, [base.id]: true }));
    setPicking(false);
  }
  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 6 }}>
        Blocs de configuration
      </div>
      <div className="field-hint" style={{ marginBottom: 14 }}>
        Les étapes que le client remplit au moment de la commande, dans cet ordre.
      </div>

      {blocks.length === 0 && (
        <div
          style={{
            padding: "22px 16px",
            borderRadius: 12,
            border: "1.5px dashed var(--outline-variant)",
            background: "var(--surface-container-low)",
            textAlign: "center",
            color: "var(--outline)",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          Aucun bloc pour l&apos;instant. Ajoutez-en un ci-dessous.
        </div>
      )}

      {blocks.map((b, idx) => {
        const meta = BLOCK_META[b.type];
        const Icon = meta?.icon ?? ListChecks;
        const expanded = open[b.id] ?? idx === 0;
        const count = blockCount(b);
        return (
          <div key={b.id} className="blk">
            <div className="blk-head">
              <button
                type="button"
                className="blk-toggle"
                aria-expanded={expanded}
                onClick={() => setOpen((o) => ({ ...o, [b.id]: !expanded }))}
              >
                {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <span className="sec-icon" style={{ width: 26, height: 26, borderRadius: 8 }}>
                  <Icon size={14} strokeWidth={1.8} />
                </span>
                <span className="bt-label">{b.label || meta?.label || b.type}</span>
                <span className="pill pill-navy-soft" style={{ fontSize: 9 }}>
                  {meta?.label ?? b.type}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 11, color: "var(--outline)" }}>
                    {count} élément{count > 1 ? "s" : ""}
                  </span>
                )}
                {b.required && (
                  <span className="pill pill-warning-soft" style={{ fontSize: 9 }}>
                    Obligatoire
                  </span>
                )}
                {b.appliesTo && b.appliesTo !== "all" && (
                  <span className="pill pill-bronze-soft" style={{ fontSize: 9 }}>
                    {b.appliesTo === "sqm" ? "Au m² seulement" : "Prix fixe seulement"}
                  </span>
                )}
              </button>
              <div className="blk-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Monter le bloc ${b.label || meta?.label}`}
                  disabled={idx === 0}
                  onClick={() => move(b.id, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Descendre le bloc ${b.label || meta?.label}`}
                  disabled={idx === blocks.length - 1}
                  onClick={() => move(b.id, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ color: "var(--error)" }}
                  aria-label={`Supprimer le bloc ${b.label || meta?.label}`}
                  onClick={() => removeBlock(b.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {expanded && (
              <div className="blk-body">
                <div className="field">
                  <label className="field-label" htmlFor={`blk-label-${b.id}`}>
                    Titre affiché au client
                  </label>
                  <input
                    id={`blk-label-${b.id}`}
                    className="input"
                    value={b.label}
                    onChange={(e) => update(b.id, { label: e.target.value })}
                  />
                </div>

                <div className="field">
                  <div className="field-label">Afficher pour</div>
                  <div className="seg" style={{ marginTop: 6, alignSelf: "flex-start" }}>
                    {AUDIENCES.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        className={`seg-btn${(b.appliesTo ?? "all") === a.key ? " active" : ""}`}
                        onClick={() => update(b.id, { appliesTo: a.key })}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <div className="field-hint">
                    {(b.appliesTo ?? "all") === "sqm"
                      ? "Visible seulement sur les produits vendus au m²."
                      : (b.appliesTo ?? "all") === "fixed"
                        ? "Visible seulement sur les produits à prix fixe."
                        : "Visible sur tous les produits de la catégorie."}
                  </div>
                </div>

                <label
                  htmlFor={`blk-req-${b.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <span>Obligatoire</span>
                  <span className="switch">
                    <input
                      id={`blk-req-${b.id}`}
                      type="checkbox"
                      checked={!!b.required}
                      onChange={(e) => update(b.id, { required: e.target.checked })}
                    />
                    <span className="slider" />
                  </span>
                </label>

                <BlockBody block={b} update={(p) => update(b.id, p)} />
              </div>
            )}
          </div>
        );
      })}

      {picking ? (
        <div
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--outline-variant)",
            background: "var(--surface-container-low)",
          }}
        >
          <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <span className="field-label">Quel type de bloc ?</span>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 30, height: 30 }}
              aria-label="Fermer le choix du type de bloc"
              onClick={() => setPicking(false)}
            >
              <X size={15} />
            </button>
          </div>
          <div className="choice-grid">
            {ORDER.map((t) => {
              const meta = BLOCK_META[t];
              const Icon = meta.icon;
              return (
                <button
                  key={t}
                  type="button"
                  className="choice-card"
                  onClick={() => addBlock(t)}
                >
                  <span className="cc-title">
                    <Icon size={16} strokeWidth={1.8} />
                    {meta.label}
                  </span>
                  <span className="cc-hint">{meta.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => setPicking(true)}
        >
          <Plus size={14} /> Ajouter un bloc
        </button>
      )}
    </div>
  );
}

// ── Per-type body editors ───────────────────────────────────────────────────
function BlockBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  if (block.type === "measurements") return <MeasurementsBody block={block} update={update} />;
  if (block.type === "ilot") return <IlotBody block={block} update={update} />;
  if (block.type === "shape") return <ShapeBody block={block} update={update} />;
  if (block.type === "accessories") return <AccessoriesBody block={block} update={update} />;
  if (block.type === "photos") return <PhotosBody block={block} update={update} />;
  // colors / opening_details / options all edit `options`
  return <OptionsBody block={block} update={update} />;
}

/**
 * There are exactly three shapes, and the number of pans each one bills is a
 * property of the shape, not an editorial choice: I bills one run, L two, U
 * three. So the admin doesn't compose options here — they tick which of the
 * three this product offers, and give each one its picture.
 */
const SHAPES = [
  { key: "i", label: "I", runs: 1, hint: "1 pan facturé" },
  { key: "l", label: "L", runs: 2, hint: "2 pans facturés" },
  { key: "u", label: "U", runs: 3, hint: "3 pans facturés" },
] as const;

/**
 * The three runs seen from above, drawn rather than uploaded: there are only
 * ever three shapes, so a picture per product would be three identical files to
 * maintain. The mobile app draws the same paths.
 */
const SHAPE_PATH: Record<string, string> = {
  i: "M26 8v30",
  l: "M14 8v30h24",
  u: "M12 8v30h28V8",
};

function ShapeFigure({ shapeKey }: { shapeKey: string }) {
  return (
    <svg
      width="72"
      height="52"
      viewBox="0 0 52 46"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={SHAPE_PATH[shapeKey] ?? ""} />
    </svg>
  );
}

function ShapeBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const options = block.options ?? [];

  /** Rewrites the list in I → L → U order, re-asserting each shape's runs. */
  function commit(keys: Set<string>) {
    update({
      options: SHAPES.filter((s) => keys.has(s.key)).map((s) => ({
        key: s.key,
        label: s.label,
        runs: s.runs,
      })),
    });
  }

  const keys = new Set(options.map((o) => o.key));

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 8 }}>
        Formes proposées au client
      </div>
      <div className="choice-grid">
        {SHAPES.map((s) => {
          const on = keys.has(s.key);
          const id = `shape-${block.id}-${s.key}`;
          return (
            <div
              key={s.key}
              className={`choice-card${on ? " active" : ""}`}
              style={{ cursor: "default" }}
            >
              <span className="cc-fig">
                <ShapeFigure shapeKey={s.key} />
              </span>
              <label htmlFor={id} className="cc-title" style={{ cursor: "pointer", width: "100%" }}>
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    const next = new Set(keys);
                    if (e.target.checked) next.add(s.key);
                    else next.delete(s.key);
                    commit(next);
                  }}
                />
                Forme {s.label}
              </label>
              <span className="cc-hint">{s.hint}</span>
            </div>
          );
        })}
      </div>
      <div className="callout info" style={{ marginTop: 12 }}>
        <Info size={15} strokeWidth={1.9} />
        <div>
          Ces schémas sont dessinés par l&apos;application, il n&apos;y a aucune image à
          téléverser. Le nombre de pans facturés est déduit de la forme et ne se règle pas ici —
          il ne sert qu&apos;aux produits au m² réglés sur la formule{" "}
          <strong>pilotée par la forme</strong>.
        </div>
      </div>
    </div>
  );
}

function RowDelete({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn"
      style={{ width: 32, height: 32, borderRadius: 8, color: "var(--error)", flexShrink: 0 }}
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 size={15} />
    </button>
  );
}

function MeasurementsBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const fields = block.fields ?? [];
  const set = (i: number, p: Partial<ConfigBlockField>) =>
    update({ fields: fields.map((f, k) => (k === i ? { ...f, ...p } : f)) });
  return (
    <div>
      {fields.length > 0 && (
        <div className="repeater">
          <div className="repeater-head">
            <span style={{ flex: 2 }}>Libellé</span>
            <span style={{ width: 64 }}>Unité</span>
            <span style={{ width: 64 }}>Min</span>
            <span style={{ width: 64 }}>Max</span>
            <span style={{ width: 150 }}>Rôle dans le prix</span>
            <span style={{ width: 32 }} />
          </div>
          {fields.map((f, i) => (
            <div key={f.key} className="repeater-row">
              <input
                className="input"
                style={{ flex: 2 }}
                aria-label={`Libellé de la mesure ${i + 1}`}
                placeholder="ex. Hauteur mur"
                value={f.label}
                onChange={(e) => set(i, { label: e.target.value })}
              />
              <input
                className="input"
                style={{ width: 64 }}
                aria-label={`Unité de la mesure ${i + 1}`}
                placeholder="cm"
                value={f.unit ?? ""}
                onChange={(e) => set(i, { unit: e.target.value })}
              />
              <input
                className="input"
                style={{ width: 64 }}
                type="number"
                aria-label={`Minimum de la mesure ${i + 1}`}
                placeholder="min"
                value={f.min ?? ""}
                onChange={(e) => set(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
              <input
                className="input"
                style={{ width: 64 }}
                type="number"
                aria-label={`Maximum de la mesure ${i + 1}`}
                placeholder="max"
                value={f.max ?? ""}
                onChange={(e) => set(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
              {/* Only meaningful for per-m² products on the "pilotée par la forme"
                  formula: tags which measurements actually make up the surface. */}
              <select
                className="input"
                style={{ width: 150 }}
                aria-label={`Rôle de la mesure ${i + 1} dans le calcul du prix`}
                value={f.priceRole ?? ""}
                onChange={(e) => set(i, { priceRole: (e.target.value || null) as DimensionRole | null })}
              >
                <option value="">Non facturé</option>
                {DIMENSION_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <RowDelete
                label={`Supprimer la mesure ${i + 1}`}
                onClick={() => update({ fields: fields.filter((_, k) => k !== i) })}
              />
            </div>
          ))}
        </div>
      )}

      <div className="callout info" style={{ margin: "12px 0" }}>
        <Info size={15} strokeWidth={1.9} />
        <div>
          « Rôle dans le prix » ne sert qu&apos;aux produits au m² réglés sur la formule{" "}
          <strong>pilotée par la forme</strong> : les champs marqués Pan 1/2/3 sont additionnés puis
          multipliés par le champ marqué Hauteur. Les autres mesures sont enregistrées pour
          l&apos;atelier sans influencer le prix.
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => update({ fields: [...fields, { key: uid("f"), label: "" }] })}
      >
        <Plus size={13} /> Ajouter un champ
      </button>
    </div>
  );
}

/**
 * The island is the one block that carries its own price. It is priced from its
 * own measurements, at its own rate — never from the product's gamme — so the
 * admin gets the same tools here as on the product itself: a formula, a rate,
 * and per-field tagging of what feeds that formula.
 */
function IlotBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const fields = block.fields ?? [];
  const mode = block.priceMode ?? "fixed";
  const set = (i: number, p: Partial<ConfigBlockField>) =>
    update({ fields: fields.map((f, k) => (k === i ? { ...f, ...p } : f)) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Photo de l&apos;îlot
        </div>
        <ImagePick
          value={block.planImage}
          label="Choisir la photo de l'îlot"
          onChange={(url) => update({ planImage: url })}
          wide
        />
      </div>

      <div className="callout info">
        <Info size={15} strokeWidth={1.9} />
        <div>
          Si ce bloc n&apos;est <strong>pas obligatoire</strong>, l&apos;app demande d&apos;abord
          « Souhaitez-vous un îlot ? ». Un client qui refuse ne voit aucune mesure et ne paie rien.
        </div>
      </div>

      <div className="field">
        <div className="field-label">Mode de prix</div>
        <div className="seg" style={{ marginTop: 6 }}>
          {(["fixed", "per_sqm"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`seg-btn${mode === m ? " active" : ""}`}
              onClick={() =>
                update(m === "per_sqm" ? { priceMode: m, areaFormula: ILOT_FORMULA } : { priceMode: m })
              }
            >
              {m === "fixed" ? "Prix fixe" : "Au m²"}
            </button>
          ))}
        </div>
      </div>

      {mode === "fixed" ? (
        <div className="field" style={{ maxWidth: 220 }}>
          <label className="field-label" htmlFor={`ilot-price-${block.id}`}>
            Supplément forfaitaire
          </label>
          <span className="input-affix">
            <input
              id={`ilot-price-${block.id}`}
              className="input"
              inputMode="decimal"
              placeholder="0"
              value={centsToEuros(block.priceCents)}
              onChange={(e) => update({ priceCents: eurosToCents(e.target.value) ?? 0 })}
            />
            <span className="affix">€</span>
          </span>
        </div>
      ) : (
        <>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label" htmlFor={`ilot-rate-${block.id}`}>
              Prix au m² de l&apos;îlot
            </label>
            <span className="input-affix">
              <input
                id={`ilot-rate-${block.id}`}
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={centsToEuros(block.pricePerSqmCents)}
                onChange={(e) => update({ pricePerSqmCents: eurosToCents(e.target.value) ?? 0 })}
              />
              <span className="affix">€/m²</span>
            </span>
          </div>
          <div className="callout info">
            <Info size={15} strokeWidth={1.9} />
            <div>
              Surface facturée de l&apos;îlot = <strong>Largeur × Longueur</strong> (son emprise
              au sol). Indiquez ci-dessous laquelle de vos mesures est la largeur et laquelle est
              la longueur.
            </div>
          </div>
        </>
      )}

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Mesures demandées au client
        </div>
        {fields.length > 0 && (
          <div className="repeater">
            <div className="repeater-head">
              <span style={{ flex: 2 }}>Libellé</span>
              <span style={{ width: 64 }}>Unité</span>
              <span style={{ width: 64 }}>Min</span>
              <span style={{ width: 64 }}>Max</span>
              {mode === "per_sqm" && <span style={{ width: 150 }}>Dimension facturée</span>}
              <span style={{ width: 32 }} />
            </div>
            {fields.map((f, i) => (
              <div key={f.key} className="repeater-row">
                <input
                  className="input"
                  style={{ flex: 2 }}
                  aria-label={`Libellé de la mesure ${i + 1} de l'îlot`}
                  placeholder="ex. Longueur îlot"
                  value={f.label}
                  onChange={(e) => set(i, { label: e.target.value })}
                />
                <input
                  className="input"
                  style={{ width: 64 }}
                  aria-label={`Unité de la mesure ${i + 1} de l'îlot`}
                  placeholder="cm"
                  value={f.unit ?? ""}
                  onChange={(e) => set(i, { unit: e.target.value })}
                />
                <input
                  className="input"
                  style={{ width: 64 }}
                  type="number"
                  aria-label={`Minimum de la mesure ${i + 1} de l'îlot`}
                  placeholder="min"
                  value={f.min ?? ""}
                  onChange={(e) => set(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
                <input
                  className="input"
                  style={{ width: 64 }}
                  type="number"
                  aria-label={`Maximum de la mesure ${i + 1} de l'îlot`}
                  placeholder="max"
                  value={f.max ?? ""}
                  onChange={(e) => set(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
                {mode === "per_sqm" && (
                  <select
                    className="input"
                    style={{ width: 150 }}
                    aria-label={`Dimension facturée par la mesure ${i + 1} de l'îlot`}
                    value={f.dimensionKey ?? ""}
                    onChange={(e) =>
                      set(i, { dimensionKey: (e.target.value || null) as AreaDimensionKey | null })
                    }
                  >
                    <option value="">Non facturée</option>
                    {DIMENSION_CHOICES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
                <RowDelete
                  label={`Supprimer la mesure ${i + 1} de l'îlot`}
                  onClick={() => update({ fields: fields.filter((_, k) => k !== i) })}
                />
              </div>
            ))}
          </div>
        )}

        {mode === "per_sqm" && (
          <div className="callout info" style={{ margin: "12px 0" }}>
            <Info size={15} strokeWidth={1.9} />
            <div>
              Seules les mesures reliées à une <strong>dimension facturée</strong> entrent dans le
              calcul. Tant qu&apos;une dimension exigée par la formule manque, l&apos;îlot est
              compté à 0 €.
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => update({ fields: [...fields, { key: uid("f"), label: "" }] })}
        >
          <Plus size={13} /> Ajouter une mesure
        </button>
      </div>
    </div>
  );
}

function OptionsBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const options = block.options ?? [];
  const withImage =
    block.type === "colors" || block.type === "opening_details" || block.type === "options";
  const withColor = block.type === "colors";
  const withSurcharge = block.type === "colors" || block.type === "opening_details" || block.type === "options";
  const set = (i: number, p: Partial<ConfigBlockOption>) =>
    update({ options: options.map((o, k) => (k === i ? { ...o, ...p } : o)) });

  // Options created before a `hex` default existed were left with hex
  // undefined. The color <input> already *displayed* black by default, so an
  // admin who never touched the picker assumed the color was saved when it
  // wasn't — the app then fell back to a near-white swatch. Backfill once so
  // saving the block persists the color the admin actually saw.
  useEffect(() => {
    if (!withColor) return;
    if (options.some((o) => !o.hex)) {
      update({ options: options.map((o) => (o.hex ? o : { ...o, hex: "#000000" })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withColor, options]);

  return (
    <div>
      {(block.type === "colors" || block.type === "accessories" || block.type === "options") && (
        <label
          htmlFor={`blk-multi-${block.id}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            marginBottom: 12,
            cursor: "pointer",
          }}
        >
          <span>Choix multiple</span>
          <span className="switch">
            <input
              id={`blk-multi-${block.id}`}
              type="checkbox"
              checked={!!block.multiple}
              onChange={(e) => update({ multiple: e.target.checked })}
            />
            <span className="slider" />
          </span>
        </label>
      )}

      {withColor && (
        <div className="callout info" style={{ marginBottom: 12 }}>
          <Info size={15} strokeWidth={1.9} />
          <div>
            Ce bloc concerne les couleurs des <strong>éléments et accessoires</strong> livrés avec
            le produit — pas le coloris du produit lui-même, qui se gère dans l&apos;onglet
            « Médias &amp; couleurs » et pilote la galerie. Joignez une photo à chaque couleur :
            l&apos;app l&apos;affiche en grand pendant le choix. Sans photo, le client ne voit
            qu&apos;une pastille.
          </div>
        </div>
      )}
      {options.length > 0 && (
        <div className="repeater" style={{ marginBottom: 12 }}>
          <div className="repeater-head">
            <span style={{ flex: 2 }}>Libellé</span>
            {withColor && <span style={{ width: 38 }}>Teinte</span>}
            {withImage && <span style={{ width: 38 }}>Image</span>}
            {withSurcharge && <span style={{ width: 92 }}>Surcoût</span>}
            <span style={{ width: 32 }} />
          </div>
          {options.map((o, i) => (
            <div key={o.key} className="repeater-row">
              <input
                className="input"
                style={{ flex: 2 }}
                aria-label={`Libellé de l'option ${i + 1}`}
                placeholder="Libellé"
                value={o.label}
                onChange={(e) => set(i, { label: e.target.value })}
              />
              {withColor && (
                <input
                  type="color"
                  aria-label={`Teinte de l'option ${i + 1}`}
                  value={o.hex ?? "#000000"}
                  onChange={(e) => set(i, { hex: e.target.value })}
                  style={{
                    width: 38,
                    height: 32,
                    padding: 0,
                    border: "1px solid var(--outline-variant)",
                    borderRadius: 8,
                    background: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              )}
              {withImage && (
                <ImagePick
                  value={o.image}
                  label={`Image de l'option ${i + 1}`}
                  onChange={(url) => set(i, { image: url })}
                />
              )}
              {withSurcharge && (
                <span className="input-affix" style={{ width: 92, flexShrink: 0 }}>
                  <input
                    className="input"
                    type="number"
                    aria-label={`Surcoût de l'option ${i + 1}`}
                    placeholder="0"
                    value={centsToEuros(o.surchargeCents)}
                    onChange={(e) => set(i, { surchargeCents: eurosToCents(e.target.value) })}
                  />
                  <span className="affix">€</span>
                </span>
              )}
              <RowDelete
                label={`Supprimer l'option ${i + 1}`}
                onClick={() => update({ options: options.filter((_, k) => k !== i) })}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => update({ options: [...options, { key: uid("opt"), label: "", ...(withColor ? { hex: "#000000" } : {}) }] })}
      >
        <Plus size={13} /> Ajouter une option
      </button>
    </div>
  );
}

function AccessoriesBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const items = block.items ?? [];
  const set = (i: number, p: Partial<ConfigBlockItem>) =>
    update({ items: items.map((it, k) => (k === i ? { ...it, ...p } : it)) });
  return (
    <div>
      <label
        htmlFor={`blk-multi-${block.id}`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        <span>Choix multiple</span>
        <span className="switch">
          <input
            id={`blk-multi-${block.id}`}
            type="checkbox"
            checked={!!block.multiple}
            onChange={(e) => update({ multiple: e.target.checked })}
          />
          <span className="slider" />
        </span>
      </label>

      {items.length > 0 && (
        <div className="repeater" style={{ marginBottom: 12 }}>
          <div className="repeater-head">
            <span style={{ width: 38 }}>Image</span>
            <span style={{ flex: 2 }}>Titre</span>
            <span style={{ width: 92 }}>Prix</span>
            <span style={{ width: 32 }} />
          </div>
          {items.map((it, i) => (
            <div key={it.id} className="repeater-row">
              <ImagePick
                value={it.image}
                label={`Image de l'accessoire ${i + 1}`}
                onChange={(url) => set(i, { image: url })}
              />
              <input
                className="input"
                style={{ flex: 2 }}
                aria-label={`Titre de l'accessoire ${i + 1}`}
                placeholder="ex. Range-couverts"
                value={it.title}
                onChange={(e) => set(i, { title: e.target.value })}
              />
              <span className="input-affix" style={{ width: 92, flexShrink: 0 }}>
                <input
                  className="input"
                  type="number"
                  aria-label={`Prix de l'accessoire ${i + 1}`}
                  placeholder="0"
                  value={centsToEuros(it.priceCents)}
                  onChange={(e) => set(i, { priceCents: eurosToCents(e.target.value) })}
                />
                <span className="affix">€</span>
              </span>
              <RowDelete
                label={`Supprimer l'accessoire ${i + 1}`}
                onClick={() => update({ items: items.filter((_, k) => k !== i) })}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => update({ items: [...items, { id: uid("acc"), title: "" }] })}
      >
        <Plus size={13} /> Ajouter un accessoire
      </button>
    </div>
  );
}

function PhotosBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label className="field-label" htmlFor={`blk-help-${block.id}`}>
          Texte d&apos;aide
        </label>
        <input
          id={`blk-help-${block.id}`}
          className="input"
          placeholder="Ex. Photographiez l'emplacement sous plusieurs angles"
          value={block.helpText ?? ""}
          onChange={(e) => update({ helpText: e.target.value })}
        />
      </div>
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Plan / schéma prédéfini (optionnel)
        </div>
        <ImagePick
          value={block.planImage}
          label="Choisir le plan ou schéma"
          onChange={(url) => update({ planImage: url })}
          wide
        />
      </div>
    </div>
  );
}

// ── Reusable image picker (browse/upload via the shared media library) ──────
function ImagePick({
  value,
  onChange,
  label,
  wide,
}: {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        style={{
          width: wide ? "100%" : 38,
          height: wide ? 90 : 32,
          borderRadius: 8,
          border: "1px dashed var(--outline-variant)",
          background: value ? `url(${value}) center/cover` : "var(--surface-container)",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!value && <Plus size={14} style={{ color: "var(--outline)" }} />}
      </button>
      <MediaLibrary open={open} folder="products" onClose={() => setOpen(false)} onPick={onChange} />
    </>
  );
}

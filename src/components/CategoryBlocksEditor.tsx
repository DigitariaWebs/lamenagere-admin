"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import MediaLibrary from "./MediaLibrary";

// ── Shared config-block model (mirrors server ConfigBlock) ──────────────────
export type ConfigBlockType =
  | "measurements"
  | "shape"
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
}
export interface ConfigBlockOption {
  key: string;
  label: string;
  image?: string;
  hex?: string;
  surchargeCents?: number;
}
export interface ConfigBlockItem {
  id: string;
  title: string;
  image?: string;
  priceCents?: number;
}
export interface ConfigBlock {
  id: string;
  type: ConfigBlockType;
  label: string;
  required?: boolean;
  multiple?: boolean;
  helpText?: string;
  planImage?: string;
  fields?: ConfigBlockField[];
  options?: ConfigBlockOption[];
  items?: ConfigBlockItem[];
}

const BLOCK_META: Record<ConfigBlockType, { label: string; hint: string; defaultLabel: string }> = {
  measurements: { label: "Mesures", hint: "Champs numériques (hauteur, longueur…)", defaultLabel: "Mesures" },
  shape: { label: "Forme", hint: "Choix unique illustré (I / L / U)", defaultLabel: "Forme" },
  colors: { label: "Couleurs", hint: "Nuancier, surcoût possible", defaultLabel: "Couleur" },
  accessories: { label: "Accessoires", hint: "Liste d'options avec prix et image", defaultLabel: "Accessoires de rangement" },
  opening_details: { label: "Détails d'ouverture", hint: "Battant, asymétrique… prix + image", defaultLabel: "Détails d'ouverture" },
  photos: { label: "Photos du client", hint: "Le client téléverse des photos de son emplacement", defaultLabel: "Photos de l'emplacement" },
  options: { label: "Options personnalisées", hint: "Choix générique avec ou sans image", defaultLabel: "Options" },
};

const ORDER: ConfigBlockType[] = [
  "measurements",
  "shape",
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

interface Props {
  blocks: ConfigBlock[];
  onChange: (blocks: ConfigBlock[]) => void;
}

export default function CategoryBlocksEditor({ blocks, onChange }: Props) {
  const [adding, setAdding] = useState<ConfigBlockType>("measurements");

  function update(id: string, patch: Partial<ConfigBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function addBlock() {
    const meta = BLOCK_META[adding];
    const base: ConfigBlock = { id: uid("blk"), type: adding, label: meta.defaultLabel };
    if (adding === "measurements") base.fields = [];
    else if (adding === "accessories") { base.items = []; base.multiple = true; }
    else if (adding === "colors" || adding === "shape" || adding === "opening_details" || adding === "options") base.options = [];
    onChange([...blocks, base]);
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
      <label className="field-label" style={{ display: "block", marginBottom: 8 }}>
        Blocs de configuration
      </label>
      <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 12 }}>
        Les produits de cette catégorie hériteront de ces blocs. Le client les remplit au moment de la commande.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.map((b, idx) => (
          <div key={b.id} className="card" style={{ padding: 14, background: "var(--surface-container-low)" }}>
            <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div className="hstack" style={{ gap: 8 }}>
                <GripVertical size={14} style={{ color: "var(--outline)" }} />
                <span className="pill pill-navy">{BLOCK_META[b.type].label}</span>
              </div>
              <div className="hstack" style={{ gap: 4 }}>
                <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} title="Monter" disabled={idx === 0} onClick={() => move(b.id, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} title="Descendre" disabled={idx === blocks.length - 1} onClick={() => move(b.id, 1)}>
                  <ArrowDown size={13} />
                </button>
                <button type="button" className="icon-btn" style={{ width: 28, height: 28, color: "var(--error)" }} title="Supprimer" onClick={() => removeBlock(b.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label className="field-label">Titre affiché</label>
              <input className="input" value={b.label} onChange={(e) => update(b.id, { label: e.target.value })} />
            </div>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 10 }}>
              <span>Obligatoire</span>
              <span className="switch">
                <input type="checkbox" checked={!!b.required} onChange={(e) => update(b.id, { required: e.target.checked })} />
                <span className="slider"></span>
              </span>
            </label>

            <BlockBody block={b} update={(p) => update(b.id, p)} />
          </div>
        ))}

        {blocks.length === 0 && (
          <div style={{ color: "var(--outline)", fontSize: 13, padding: "10px 0" }}>
            Aucun bloc. Ajoutez-en un ci-dessous.
          </div>
        )}
      </div>

      <div className="hstack" style={{ gap: 8, marginTop: 14 }}>
        <select className="input" style={{ flex: 1 }} value={adding} onChange={(e) => setAdding(e.target.value as ConfigBlockType)}>
          {ORDER.map((t) => (
            <option key={t} value={t}>
              {BLOCK_META[t].label} — {BLOCK_META[t].hint}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-outline btn-sm" onClick={addBlock}>
          <Plus size={14} /> Ajouter le bloc
        </button>
      </div>
    </div>
  );
}

// ── Per-type body editors ───────────────────────────────────────────────────
function BlockBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  if (block.type === "measurements") return <MeasurementsBody block={block} update={update} />;
  if (block.type === "accessories") return <AccessoriesBody block={block} update={update} />;
  if (block.type === "photos") return <PhotosBody block={block} update={update} />;
  // shape / colors / opening_details all edit `options`
  return <OptionsBody block={block} update={update} />;
}

function MeasurementsBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const fields = block.fields ?? [];
  const set = (i: number, p: Partial<ConfigBlockField>) =>
    update({ fields: fields.map((f, k) => (k === i ? { ...f, ...p } : f)) });
  return (
    <div>
      {fields.map((f, i) => (
        <div key={f.key} className="hstack" style={{ gap: 6, marginBottom: 6 }}>
          <input className="input" style={{ flex: 2 }} placeholder="Libellé (ex. Hauteur mur)" value={f.label} onChange={(e) => set(i, { label: e.target.value })} />
          <input className="input" style={{ width: 64 }} placeholder="cm" value={f.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value })} />
          <input className="input" style={{ width: 64 }} type="number" placeholder="min" value={f.min ?? ""} onChange={(e) => set(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <input className="input" style={{ width: 64 }} type="number" placeholder="max" value={f.max ?? ""} onChange={(e) => set(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <button type="button" className="icon-btn" style={{ width: 28, height: 28, color: "var(--error)" }} onClick={() => update({ fields: fields.filter((_, k) => k !== i) })}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => update({ fields: [...fields, { key: uid("f"), label: "" }] })}>
        <Plus size={13} /> Ajouter un champ
      </button>
    </div>
  );
}

function OptionsBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  const options = block.options ?? [];
  const withImage = block.type === "shape" || block.type === "opening_details" || block.type === "options";
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
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 10 }}>
          <span>Choix multiple</span>
          <span className="switch">
            <input type="checkbox" checked={!!block.multiple} onChange={(e) => update({ multiple: e.target.checked })} />
            <span className="slider"></span>
          </span>
        </label>
      )}
      {options.map((o, i) => (
        <div key={o.key} className="hstack" style={{ gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input className="input" style={{ flex: 2 }} placeholder="Libellé" value={o.label} onChange={(e) => set(i, { label: e.target.value })} />
          {withColor && (
            <input type="color" value={o.hex ?? "#000000"} onChange={(e) => set(i, { hex: e.target.value })} style={{ width: 38, height: 34, padding: 0, border: "none", background: "none" }} />
          )}
          {withImage && <ImagePick value={o.image} onChange={(url) => set(i, { image: url })} />}
          {withSurcharge && (
            <input className="input" style={{ width: 92 }} type="number" placeholder="surcoût €" value={centsToEuros(o.surchargeCents)} onChange={(e) => set(i, { surchargeCents: eurosToCents(e.target.value) })} />
          )}
          <button type="button" className="icon-btn" style={{ width: 28, height: 28, color: "var(--error)" }} onClick={() => update({ options: options.filter((_, k) => k !== i) })}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
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
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 10 }}>
        <span>Choix multiple</span>
        <span className="switch">
          <input type="checkbox" checked={!!block.multiple} onChange={(e) => update({ multiple: e.target.checked })} />
          <span className="slider"></span>
        </span>
      </label>
      {items.map((it, i) => (
        <div key={it.id} className="hstack" style={{ gap: 6, marginBottom: 6, alignItems: "center" }}>
          <ImagePick value={it.image} onChange={(url) => set(i, { image: url })} />
          <input className="input" style={{ flex: 2 }} placeholder="Titre (ex. Range-couverts)" value={it.title} onChange={(e) => set(i, { title: e.target.value })} />
          <input className="input" style={{ width: 92 }} type="number" placeholder="prix €" value={centsToEuros(it.priceCents)} onChange={(e) => set(i, { priceCents: eurosToCents(e.target.value) })} />
          <button type="button" className="icon-btn" style={{ width: 28, height: 28, color: "var(--error)" }} onClick={() => update({ items: items.filter((_, k) => k !== i) })}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => update({ items: [...items, { id: uid("acc"), title: "" }] })}>
        <Plus size={13} /> Ajouter un accessoire
      </button>
    </div>
  );
}

function PhotosBody({ block, update }: { block: ConfigBlock; update: (p: Partial<ConfigBlock>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="field">
        <label className="field-label">Texte d&apos;aide</label>
        <input className="input" placeholder="Ex. Photographiez l'emplacement sous plusieurs angles" value={block.helpText ?? ""} onChange={(e) => update({ helpText: e.target.value })} />
      </div>
      <div>
        <label className="field-label" style={{ display: "block", marginBottom: 6 }}>Plan / schéma prédéfini (optionnel)</label>
        <ImagePick value={block.planImage} onChange={(url) => update({ planImage: url })} wide />
      </div>
    </div>
  );
}

// ── Reusable image picker (browse/upload via the shared media library) ──────
function ImagePick({ value, onChange, wide }: { value?: string; onChange: (url: string) => void; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Choisir une image"
        style={{
          width: wide ? "100%" : 38,
          height: wide ? 90 : 34,
          borderRadius: 8,
          border: "1px dashed var(--outline-soft)",
          background: value ? `url(${value}) center/cover` : "var(--surface-container)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {!value && <Plus size={14} style={{ color: "var(--outline)" }} />}
      </button>
      <MediaLibrary open={open} folder="products" onClose={() => setOpen(false)} onPick={onChange} />
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { AlertCircle, Camera, Images, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import MediaLibrary from "./MediaLibrary";

/** One colour variant being edited: name + swatch + its own gallery images. */
export interface ColorEntry {
  key: string;
  name: string;
  hex: string;
  images: string[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeColor(): ColorEntry {
  return { key: "", name: "", hex: "#000000", images: [] };
}

export default function ProductColorsEditor({
  colors,
  onChange,
  errors = {},
}: {
  colors: ColorEntry[];
  onChange: (next: ColorEntry[]) => void;
  /** `color-name-<index>` → message, supplied by the product form validator. */
  errors?: Record<string, string>;
}) {
  function addColor() {
    onChange([...colors, makeColor()]);
  }

  function patchColor(i: number, p: Partial<ColorEntry>) {
    onChange(colors.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  }

  function removeColor(i: number) {
    onChange(colors.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {colors.map((color, i) => (
        <ColorRow
          key={i}
          index={i}
          color={color}
          error={errors[`color-name-${i}`]}
          onPatch={(p) => patchColor(i, p)}
          onRemove={() => removeColor(i)}
        />
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={addColor}
        style={{ alignSelf: "flex-start" }}
      >
        <Plus size={14} strokeWidth={1.8} />
        <span>Ajouter un coloris</span>
      </button>
    </div>
  );
}

function ColorRow({
  index,
  color,
  error,
  onPatch,
  onRemove,
}: {
  index: number;
  color: ColorEntry;
  error?: string;
  onPatch: (p: Partial<ColorEntry>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [libOpen, setLibOpen] = useState(false);
  const nameId = `color-name-${index}`;

  function addImages(urls: string[]) {
    const merged = [...color.images];
    for (const url of urls) if (!merged.includes(url)) merged.push(url);
    onPatch({ images: merged });
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      try {
        const { url } = await api.upload(file, "products");
        addImages([url]);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      style={{
        border: "1px solid var(--outline-variant)",
        borderRadius: 12,
        padding: 16,
        background: "var(--surface)",
      }}
    >
      <div className="hstack" style={{ gap: 12, alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor={nameId}>
            Nom du coloris
          </label>
          <input
            id={nameId}
            className={error ? "input invalid" : "input"}
            placeholder="ex. Blanc cassé"
            aria-invalid={error ? true : undefined}
            value={color.name}
            onChange={(e) => {
              const name = e.target.value;
              // Auto-fill the key from the name until the admin hand-edits it.
              const autoKey = !color.key || color.key === slugify(color.name);
              onPatch({ name, ...(autoKey ? { key: slugify(name) } : {}) });
            }}
          />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label className="field-label" htmlFor={`color-hex-${index}`}>
            Teinte
          </label>
          <div className="hstack" style={{ gap: 8, alignItems: "center" }}>
            <input
              type="color"
              aria-label={`Sélecteur de teinte du coloris ${index + 1}`}
              value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#000000"}
              onChange={(e) => onPatch({ hex: e.target.value })}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                border: "1px solid var(--outline-variant)",
                borderRadius: 8,
                background: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            <input
              id={`color-hex-${index}`}
              className="input mono"
              style={{ width: 82 }}
              value={color.hex}
              onChange={(e) => onPatch({ hex: e.target.value })}
            />
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onRemove}
          aria-label={`Retirer le coloris ${index + 1}`}
          style={{ color: "var(--error)", marginBottom: 2 }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {error && (
        <div className="field-error" role="alert" style={{ marginTop: 6 }}>
          <AlertCircle size={13} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Photos de ce coloris
        </div>
        <div className="media-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
          {color.images.map((url, i) => (
            <div key={url} className="media-tile">
              <img src={url} alt={`Photo ${i + 1} du coloris ${color.name || index + 1}`} />
              <div className="mt-bar">
                <button
                  type="button"
                  className="mt-btn danger"
                  aria-label={`Supprimer la photo ${i + 1} de ce coloris`}
                  onClick={() => onPatch({ images: color.images.filter((u) => u !== url) })}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="media-add" onClick={() => fileRef.current?.click()}>
            <Camera size={18} strokeWidth={1.6} />
            <span>Téléverser</span>
          </button>
          <button type="button" className="media-add" onClick={() => setLibOpen(true)}>
            <Images size={18} strokeWidth={1.6} />
            <span>Bibliothèque</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
        <MediaLibrary
          open={libOpen}
          folder="products"
          multiple
          // Opened by the "Bibliothèque" tile; "Téléverser" handles new files.
          defaultTab="gallery"
          onClose={() => setLibOpen(false)}
          onPick={(urls) => addImages(urls)}
        />
      </div>
    </div>
  );
}

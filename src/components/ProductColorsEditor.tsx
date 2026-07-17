"use client";

import { useRef, useState } from "react";
import { Images, Plus, X } from "lucide-react";
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
}: {
  colors: ColorEntry[];
  onChange: (next: ColorEntry[]) => void;
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
          color={color}
          onPatch={(p) => patchColor(i, p)}
          onRemove={() => removeColor(i)}
        />
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={addColor}
        style={{ alignSelf: "flex-start" }}
      >
        <Plus size={16} strokeWidth={1.8} />
        <span>Ajouter une couleur</span>
      </button>
    </div>
  );
}

function ColorRow({
  color,
  onPatch,
  onRemove,
}: {
  color: ColorEntry;
  onPatch: (p: Partial<ColorEntry>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [libOpen, setLibOpen] = useState(false);

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
        background: "var(--surface-container-lowest)",
      }}
    >
      <div className="hstack" style={{ gap: 12, alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label">Nom de la couleur</label>
          <input
            className="input"
            placeholder="ex. Blanc cassé"
            value={color.name}
            onChange={(e) => {
              const name = e.target.value;
              // Auto-fill the key from the name until the admin hand-edits it.
              const autoKey = !color.key || color.key === slugify(color.name);
              onPatch({ name, ...(autoKey ? { key: slugify(name) } : {}) });
            }}
          />
        </div>
        <div className="field" style={{ width: 120 }}>
          <label className="field-label">Teinte</label>
          <div className="hstack" style={{ gap: 8, alignItems: "center" }}>
            <input
              type="color"
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
              }}
            />
            <input
              className="input mono"
              style={{ width: 76 }}
              value={color.hex}
              onChange={(e) => onPatch({ hex: e.target.value })}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onRemove}
          aria-label="Retirer la couleur"
          style={{ marginBottom: 2 }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field-label" style={{ display: "block", marginBottom: 8 }}>
          Images de cette couleur
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {color.images.map((url) => (
            <div
              key={url}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                background: `url(${url}) center/cover`,
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => onPatch({ images: color.images.filter((u) => u !== url) })}
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              aspectRatio: "1",
              borderRadius: 10,
              background: "var(--surface-container-low)",
              border: "1.5px dashed var(--outline-variant)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--outline)",
              cursor: "pointer",
            }}
          >
            <Plus size={20} strokeWidth={1.6} />
            <div style={{ fontSize: 9, marginTop: 4 }}>Ajouter</div>
          </div>
          <div
            onClick={() => setLibOpen(true)}
            style={{
              aspectRatio: "1",
              borderRadius: 10,
              background: "var(--surface-container-low)",
              border: "1.5px dashed var(--outline-variant)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--outline)",
              cursor: "pointer",
            }}
          >
            <Images size={20} strokeWidth={1.6} />
            <div style={{ fontSize: 9, marginTop: 4 }}>Bibliothèque</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
        <MediaLibrary
          open={libOpen}
          folder="products"
          onClose={() => setLibOpen(false)}
          onPick={(url) => addImages([url])}
        />
      </div>
    </div>
  );
}

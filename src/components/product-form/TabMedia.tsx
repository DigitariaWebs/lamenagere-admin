"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Images,
  Palette,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import MediaLibrary from "../MediaLibrary";
import ProductColorsEditor, { type ColorEntry } from "../ProductColorsEditor";
import { SectionHead, Callout } from "./SectionHead";

export function TabMedia({
  images,
  setImages,
  videos,
  setVideos,
  colors,
  setColors,
  errors,
}: {
  images: string[];
  setImages: (next: string[]) => void;
  videos: string[];
  setVideos: (next: string[]) => void;
  colors: ColorEntry[];
  setColors: (next: ColorEntry[]) => void;
  errors: Record<string, string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [libOpen, setLibOpen] = useState(false);
  const [uploading, setUploading] = useState(0);

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploading((n) => n + files.length);
    let next = images;
    for (const file of files) {
      try {
        const { url } = await api.upload(file, "products");
        next = next.includes(url) ? next : [...next, url];
        setImages(next);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    let next = videos;
    for (const file of files) {
      try {
        const { url } = await api.upload(file, "products");
        next = next.includes(url) ? next : [...next, url];
        setVideos(next);
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Téléversement vidéo échoué");
      }
    }
    if (videoRef.current) videoRef.current.value = "";
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[index], next[j]] = [next[j], next[index]];
    setImages(next);
  }

  function makeMain(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    setImages([picked, ...next]);
  }

  return (
    <div className="stack">
      <div className="card card-padded">
        <SectionHead
          icon={Camera}
          tone="navy"
          title="Photos du produit"
          hint="JPG ou PNG. La première image est la principale : c'est elle qui apparaît dans les listes et le panier."
        />

        <div className="media-grid">
          {images.map((url, i) => (
            <div key={url} className="media-tile">
              <img src={url} alt={`Photo ${i + 1} du produit`} />
              {i === 0 && (
                <span className="pill pill-bronze mt-main" style={{ fontSize: 9 }}>
                  Principale
                </span>
              )}
              <div className="mt-bar">
                <button
                  type="button"
                  className="mt-btn"
                  aria-label={`Déplacer la photo ${i + 1} vers la gauche`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  className="mt-btn"
                  aria-label={`Déplacer la photo ${i + 1} vers la droite`}
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="mt-btn"
                  aria-label={`Définir la photo ${i + 1} comme principale`}
                  disabled={i === 0}
                  onClick={() => makeMain(i)}
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  className="mt-btn danger"
                  aria-label={`Supprimer la photo ${i + 1}`}
                  onClick={() => setImages(images.filter((u) => u !== url))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`up-${i}`} className="skel" style={{ aspectRatio: "1", borderRadius: 10 }} />
          ))}

          <button type="button" className="media-add" onClick={() => fileRef.current?.click()}>
            <Camera size={20} strokeWidth={1.6} />
            <span>Téléverser</span>
          </button>
          <button type="button" className="media-add" onClick={() => setLibOpen(true)}>
            <Images size={20} strokeWidth={1.6} />
            <span>Bibliothèque</span>
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
        <MediaLibrary
          open={libOpen}
          folder="products"
          onClose={() => setLibOpen(false)}
          onPick={(url) => setImages(images.includes(url) ? images : [...images, url])}
        />

        {images.length === 0 && (
          <div style={{ marginTop: 16 }}>
            <Callout kind="warn">
              Sans photo, le produit s&apos;affiche avec une vignette vide dans l&apos;application.
            </Callout>
          </div>
        )}
      </div>

      <div className="card card-padded">
        <SectionHead
          icon={Video}
          tone="navy"
          title="Vidéos"
          hint="Optionnel. MP4, 100 Mo maximum par fichier."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {videos.map((url, i) => (
            <div key={url} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
              <video src={url} controls style={{ width: "100%", maxHeight: 220, display: "block" }} />
              <button
                type="button"
                className="mt-btn danger"
                aria-label={`Supprimer la vidéo ${i + 1}`}
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={() => setVideos(videos.filter((u) => u !== url))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="media-add wide"
            onClick={() => videoRef.current?.click()}
          >
            <Video size={18} strokeWidth={1.6} />
            <span>Ajouter une vidéo</span>
          </button>
        </div>
        <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={onPickVideos} />
      </div>

      <div className="card card-padded">
        <SectionHead
          icon={Palette}
          tone="bronze"
          title="Coloris du produit"
          hint="Chaque coloris a ses propres photos : dans l'app, le client choisit la couleur et la galerie bascule sur ce coloris."
        />
        <div style={{ marginBottom: 16 }}>
          <Callout kind="info">
            À ne pas confondre avec un <strong>bloc de configuration « Couleurs »</strong> (onglet
            Configuration) : celui-ci sert à un nuancier avec supplément de prix, sans photos
            dédiées.
          </Callout>
        </div>
        <ProductColorsEditor colors={colors} onChange={setColors} errors={errors} />
      </div>
    </div>
  );
}

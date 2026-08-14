"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Search, Folder, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  api,
  type GalleryAsset,
  type GalleryFolder,
} from "@/lib/api";

interface Props {
  open: boolean;
  /** Storage prefix new uploads land in ("products", "accessories", …). */
  folder?: string;
  /** Only show assets of this kind — "accessory" for config-block art. */
  kind?: string;
  /** Opening tab. Accessories reuse by default; product photos upload by default. */
  defaultTab?: "gallery" | "upload";
  /** Allow picking several at once (product galleries, colour photos). */
  multiple?: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
}

const PAGE_SIZE = 60;

/**
 * Shared media picker.
 *
 * Opens on FOLDERS rather than a wall of thumbnails: the bucket holds 772 files
 * and 656 of the product images are named like "1000447529.jpg", so a flat grid
 * gave the manager no way to find anything and re-uploading was always faster
 * than searching. That is what produced 122 MB of byte-identical duplicates.
 *
 * Search matches the label, the original filename and the auto-derived tags
 * (the category/product an image is used by), which is the only handle on
 * camera-roll filenames.
 */
export default function MediaLibrary({
  open,
  folder = "products",
  kind,
  defaultTab,
  multiple = false,
  onClose,
  onPick,
}: Props) {
  const initialTab = defaultTab ?? "gallery";
  const [tab, setTab] = useState<"gallery" | "upload">(initialTab);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounce keystrokes so typing doesn't fire a request per character.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fresh state every time the picker opens, so it never reopens mid-drill-down.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setOpenFolder(null);
    setSelected([]);
    setSearch("");
    setQuery("");
    setPage(1);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    adminApi.media
      .folders()
      .then(setFolders)
      .catch((e: { message?: string }) =>
        toast.error(e?.message ?? "Chargement des dossiers impossible"),
      );
  }, [open]);

  // A search spans every folder — that's the point of searching.
  const browsing = openFolder !== null || query.length > 0;

  const load = useCallback(async () => {
    if (!open || !browsing) return;
    setLoading(true);
    try {
      const res = await adminApi.media.list({
        folder: query ? undefined : openFolder ?? undefined,
        kind,
        q: query || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [open, browsing, openFolder, kind, query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new folder or a new search restarts paging.
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [openFolder, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const visibleFolders = useMemo(
    () => folders.filter((f) => f.count > 0),
    [folders],
  );

  if (!open) return null;

  function toggle(url: string) {
    if (!multiple) {
      onPick([url]);
      onClose();
      return;
    }
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }

  function confirmSelection() {
    if (selected.length === 0) return;
    onPick(selected);
    onClose();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      let reused = 0;
      for (const file of files) {
        // Files are filed into the folder being browsed, so an upload started
        // from inside "Accessoires" doesn't land in "Non classé".
        const res = await api.upload(file, folder, openFolder ?? undefined);
        urls.push(res.url);
        if (res.deduped) reused++;
      }
      if (reused > 0) {
        toast.success(
          reused === urls.length
            ? "Image déjà présente dans la bibliothèque — réutilisée"
            : `${urls.length} image(s) ajoutée(s), ${reused} déjà présente(s) et réutilisée(s)`,
        );
      } else {
        toast.success(`${urls.length} image(s) téléversée(s)`);
      }
      onPick(urls);
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const tabBtn = (id: "gallery" | "upload", label: string) => (
    <button
      key={id}
      role="tab"
      aria-selected={tab === id}
      className={`btn btn-sm ${tab === id ? "btn-primary" : "btn-ghost"}`}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 860 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="card-title">Bibliothèque média</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 4 }}>
              Réutilisez une image déjà téléversée ou ajoutez-en une nouvelle.
            </div>
          </div>
          <button
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            title="Fermer"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: 340 }}>
          <div className="hstack" style={{ gap: 8, marginBottom: 14 }} role="tablist">
            {tabBtn("gallery", "Choisir dans la galerie")}
            {tabBtn("upload", "Téléverser")}
          </div>

          {tab === "upload" ? (
            <div style={{ padding: "28px 0", textAlign: "center" }}>
              <button
                className="btn btn-outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} />{" "}
                {uploading ? "Téléversement…" : "Choisir un fichier"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={multiple}
                hidden
                onChange={onUpload}
              />
              <div
                style={{
                  fontSize: 12,
                  color: "var(--outline)",
                  marginTop: 12,
                  lineHeight: 1.6,
                }}
              >
                Les images sont compressées automatiquement.
                <br />
                Un fichier déjà présent est réutilisé au lieu d&apos;être dupliqué.
              </div>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 14 }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--outline)",
                  }}
                />
                <input
                  className="input input-boxed"
                  style={{ paddingLeft: 38 }}
                  placeholder="Rechercher dans tous les dossiers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!browsing ? (
                <div className="stack" style={{ gap: 8 }}>
                  {visibleFolders.length === 0 ? (
                    <div style={{ color: "var(--outline)", fontSize: 13, padding: 20 }}>
                      Aucun dossier. Téléversez une première image.
                    </div>
                  ) : (
                    visibleFolders.map((f) => (
                      <button
                        key={f.name}
                        className="hstack"
                        onClick={() => setOpenFolder(f.name)}
                        style={{
                          gap: 12,
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--outline-soft)",
                          background: "var(--surface-container-low)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <Folder size={17} style={{ color: "var(--primary)" }} />
                        <span style={{ flex: 1, fontSize: 14 }}>{f.name}</span>
                        <span className="count">{f.count}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="hstack" style={{ gap: 10, marginBottom: 12 }}>
                    {!query && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setOpenFolder(null)}
                      >
                        <ChevronLeft size={14} /> Dossiers
                      </button>
                    )}
                    <span style={{ fontSize: 13, color: "var(--outline)" }}>
                      {query
                        ? `${total} résultat(s) pour « ${query} »`
                        : `${openFolder} — ${total} fichier(s)`}
                    </span>
                  </div>

                  {items.length === 0 && !loading ? (
                    <div style={{ color: "var(--outline)", fontSize: 13, padding: 20 }}>
                      Aucune image ici.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: 10,
                      }}
                    >
                      {items.map((m) => {
                        const isSel = selected.includes(m.url);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggle(m.url)}
                            title={m.label ?? m.path.split("/").pop()}
                            style={{
                              position: "relative",
                              aspectRatio: "1",
                              borderRadius: 10,
                              background: `url(${m.url}) center/cover`,
                              border: isSel
                                ? "2px solid var(--primary)"
                                : "1px solid var(--outline-soft)",
                              cursor: "pointer",
                            }}
                          >
                            {isSel && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: 5,
                                  right: 5,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  background: "var(--primary)",
                                  color: "#fff",
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {items.length < total && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 14, width: "100%" }}
                      disabled={loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {loading ? "Chargement…" : `Charger plus (${total - items.length})`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={onClose}>
            Annuler
          </button>
          {multiple && tab === "gallery" && (
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              disabled={selected.length === 0}
              onClick={confirmSelection}
            >
              Ajouter {selected.length > 0 ? `(${selected.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

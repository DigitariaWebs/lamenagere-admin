"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Folder,
  FolderPlus,
  Upload,
  Trash2,
  X,
  ChevronLeft,
  Check,
  Link2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  api,
  type GalleryAsset,
  type GalleryFolder,
  type MediaUsage,
} from "@/lib/api";

const PAGE_SIZE = 60;

type ViewMode = "grid" | "list";
const VIEW_KEY = "gallery:view";

function prettySize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Filename without the timestamp prefix the upload adds. */
function fileName(path: string): string {
  return (path.split("/").pop() ?? path).replace(/^\d{10,}_/, "");
}

/** Grid/list switch. Shared by the folder level and the asset level. */
function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const btn = (mode: ViewMode, Icon: typeof LayoutGrid, title: string) => (
    <button
      className="icon-btn"
      aria-pressed={view === mode}
      title={title}
      onClick={() => onChange(mode)}
      style={{
        background: view === mode ? "var(--surface-container)" : "transparent",
        color: view === mode ? "var(--primary)" : "var(--outline)",
      }}
    >
      <Icon size={15} />
    </button>
  );
  return (
    <div className="hstack" style={{ gap: 4 }} role="group" aria-label="Affichage">
      {btn("grid", LayoutGrid, "Vue grille")}
      {btn("list", List, "Vue liste")}
    </div>
  );
}

/**
 * Media Gallery.
 *
 * Organising here is deliberately non-destructive: a folder is a column on
 * media_assets, never a storage path, so moving or renaming can't invalidate a
 * URL that a product, category, carousel slide or config block has stored.
 *
 * Deleting is the only risky action, and it is gated twice — the server refuses
 * while anything still references the asset, and what survives that check is
 * only flagged, never erased from the bucket.
 */
export default function GalleryPage() {
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<GalleryAsset | null>(null);
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounce keystrokes so typing doesn't fire a request per character.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Restore the last view after mount rather than during render: the page is
  // prerendered, and reading localStorage in the initial render would make the
  // server and client markup disagree.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function chooseView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  }

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await adminApi.media.folders());
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Chargement impossible");
    }
  }, []);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const browsing = openFolder !== null || query.length > 0;

  const load = useCallback(async () => {
    if (!browsing) return;
    setLoading(true);
    try {
      const res = await adminApi.media.list({
        folder: query ? undefined : openFolder ?? undefined,
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
  }, [browsing, openFolder, query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    setSelected([]);
  }, [openFolder, query]);

  async function openDetail(asset: GalleryAsset) {
    setDetail(asset);
    setLabelDraft(asset.label ?? "");
    setUsage(null);
    try {
      setUsage(await adminApi.media.usage(asset.id));
    } catch {
      setUsage([]);
    }
  }

  async function createFolder() {
    const name = window.prompt("Nom du nouveau dossier");
    if (!name?.trim()) return;
    try {
      await adminApi.media.createFolder(name.trim());
      toast.success(`Dossier « ${name.trim()} » créé`);
      await loadFolders();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Création impossible");
    }
  }

  async function moveSelected() {
    const target = window.prompt(
      `Déplacer ${selected.length} média(s) vers quel dossier ?`,
      openFolder ?? "",
    );
    if (!target?.trim()) return;
    try {
      const { moved } = await adminApi.media.move(selected, target.trim());
      toast.success(`${moved} média(s) déplacé(s) vers « ${target.trim() } »`);
      setSelected([]);
      setPage(1);
      setItems([]);
      await Promise.all([loadFolders(), load()]);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Déplacement impossible");
    }
  }

  async function saveLabel() {
    if (!detail) return;
    try {
      const updated = await adminApi.media.update(detail.id, { label: labelDraft });
      setDetail(updated);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success("Nom enregistré");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Enregistrement impossible");
    }
  }

  async function removeAsset() {
    if (!detail) return;
    if (
      !window.confirm(
        `Supprimer « ${detail.label ?? fileName(detail.path)} » ?\n\n` +
          `Le fichier est conservé dans le stockage et peut être restauré.`,
      )
    )
      return;
    try {
      await adminApi.media.remove(detail.id);
      setItems((prev) => prev.filter((i) => i.id !== detail.id));
      setTotal((t) => t - 1);
      setDetail(null);
      toast.success("Média supprimé (restaurable)");
      await loadFolders();
    } catch (e) {
      // The server refuses (409) while anything still points at the asset, and
      // the message names what — surface it verbatim rather than a generic one.
      toast.error(
        (e as { message?: string })?.message ?? "Suppression impossible",
      );
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      let reused = 0;
      for (const file of files) {
        const res = await api.upload(file, "products", openFolder ?? undefined);
        if (res.deduped) reused++;
      }
      toast.success(
        reused > 0
          ? `${files.length} fichier(s), dont ${reused} déjà présent(s) et réutilisé(s)`
          : `${files.length} fichier(s) téléversé(s)`,
      );
      setPage(1);
      setItems([]);
      await Promise.all([loadFolders(), load()]);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Téléversement échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totalFiles = folders.reduce((n, f) => n + f.count, 0);
  const totalSize = folders.reduce((n, f) => n + f.size, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Médias</div>
          <h1 className="page-title">Galerie</h1>
          <div style={{ fontSize: 13, color: "var(--outline)", marginTop: 4 }}>
            {totalFiles} fichiers · {prettySize(totalSize)}
          </div>
        </div>
        <div className="hstack" style={{ gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={createFolder}>
            <FolderPlus size={14} /> Nouveau dossier
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} /> {uploading ? "Téléversement…" : "Téléverser"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={onUpload}
          />
        </div>
      </div>

      <div className="card card-padded">
        <div style={{ position: "relative", marginBottom: 16 }}>
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
            placeholder="Rechercher par nom, fichier ou catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selected.length > 0 && (
          <div
            className="hstack"
            style={{
              gap: 10,
              marginBottom: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--surface-container-low)",
            }}
          >
            <span style={{ fontSize: 13, flex: 1 }}>
              {selected.length} sélectionné(s)
            </span>
            <button className="btn btn-outline btn-sm" onClick={moveSelected}>
              Déplacer vers…
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected([])}
            >
              Annuler
            </button>
          </div>
        )}

        {/* One toolbar for both levels — folders and assets share the view mode,
            so switching to list stays in effect as you drill into a folder. */}
        <div className="hstack" style={{ gap: 10, marginBottom: 14 }}>
          {browsing && !query && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setOpenFolder(null)}
            >
              <ChevronLeft size={14} /> Dossiers
            </button>
          )}
          <span style={{ fontSize: 13, color: "var(--outline)", flex: 1 }}>
            {!browsing
              ? `${folders.length} dossier(s)`
              : query
                ? `${total} résultat(s) pour « ${query} »`
                : `${openFolder} — ${total} fichier(s)`}
          </span>
          <ViewToggle view={view} onChange={chooseView} />
        </div>

        {!browsing ? (
          view === "list" ? (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Dossier</th>
                    <th style={{ textAlign: "right" }}>Fichiers</th>
                    <th style={{ textAlign: "right" }}>Taille</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((f) => (
                    <tr
                      key={f.name}
                      onClick={() => setOpenFolder(f.name)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="hstack" style={{ gap: 12 }}>
                          <Folder size={17} style={{ color: "var(--primary)" }} />
                          <span style={{ fontSize: 14 }}>{f.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        {f.count}
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        {prettySize(f.size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {folders.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setOpenFolder(f.name)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "18px 16px",
                    borderRadius: 12,
                    border: "1px solid var(--outline-soft)",
                    background: "var(--surface-container-low)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Folder size={26} style={{ color: "var(--primary)" }} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={f.name}
                  >
                    {f.name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--outline)" }}>
                    {f.count} fichier(s) · {prettySize(f.size)}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <>

            {items.length === 0 && !loading ? (
              <div style={{ color: "var(--outline)", fontSize: 13, padding: 24 }}>
                Aucun média ici.
              </div>
            ) : view === "list" ? (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th>Fichier</th>
                      <th>Dossier</th>
                      <th>Dimensions</th>
                      <th style={{ textAlign: "right" }}>Taille</th>
                      <th>Ajouté le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => {
                      const isSel = selected.includes(m.id);
                      return (
                        <tr
                          key={m.id}
                          onClick={() => openDetail(m)}
                          style={{ cursor: "pointer" }}
                        >
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected((prev) =>
                                prev.includes(m.id)
                                  ? prev.filter((x) => x !== m.id)
                                  : [...prev, m.id],
                              );
                            }}
                          >
                            <span className={`checkbox${isSel ? " checked" : ""}`}>
                              {isSel && <Check size={10} strokeWidth={3} />}
                            </span>
                          </td>
                          <td>
                            <div className="hstack" style={{ gap: 14 }}>
                              <div
                                className="thumb"
                                style={{ backgroundImage: `url(${m.url})` }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>
                                  {m.label ?? fileName(m.path)}
                                </div>
                                {/* Show the real filename underneath a label, so a
                                    renamed asset is still traceable to its file. */}
                                {m.label && (
                                  <div
                                    className="mono"
                                    style={{
                                      fontSize: 11,
                                      color: "var(--outline)",
                                      marginTop: 3,
                                    }}
                                  >
                                    {fileName(m.path)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5 }}>{m.folder}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, color: "var(--outline)" }}>
                              {m.width ? `${m.width}×${m.height}` : "—"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }} className="num">
                            {prettySize(m.size)}
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, color: "var(--outline)" }}>
                              {prettyDate(m.createdAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 12,
                }}
              >
                {items.map((m) => {
                  const isSel = selected.includes(m.id);
                  return (
                    <div key={m.id} style={{ position: "relative" }}>
                      <div
                        onClick={() => openDetail(m)}
                        title={m.label ?? fileName(m.path)}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 10,
                          background: `url(${m.url}) center/cover`,
                          border: isSel
                            ? "2px solid var(--primary)"
                            : "1px solid var(--outline-soft)",
                          cursor: "pointer",
                        }}
                      />
                      <button
                        className="icon-btn"
                        title={isSel ? "Désélectionner" : "Sélectionner"}
                        onClick={() =>
                          setSelected((prev) =>
                            prev.includes(m.id)
                              ? prev.filter((x) => x !== m.id)
                              : [...prev, m.id],
                          )
                        }
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          width: 22,
                          height: 22,
                          background: isSel
                            ? "var(--primary)"
                            : "rgba(255,255,255,0.92)",
                          color: isSel ? "#fff" : "var(--outline)",
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--outline)",
                          marginTop: 5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.label ?? fileName(m.path)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {items.length < total && (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 16, width: "100%" }}
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {loading ? "Chargement…" : `Charger plus (${total - items.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onMouseDown={() => setDetail(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 560 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="card-title">Détail du média</div>
              <button
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                onClick={() => setDetail(null)}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  height: 200,
                  borderRadius: 10,
                  background: `url(${detail.url}) center/contain no-repeat var(--surface-container)`,
                  marginBottom: 16,
                }}
              />

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">Nom</label>
                <div className="hstack" style={{ gap: 8 }}>
                  <input
                    className="input input-boxed"
                    style={{ flex: 1 }}
                    placeholder={fileName(detail.path)}
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                  />
                  <button className="btn btn-outline btn-sm" onClick={saveLabel}>
                    Enregistrer
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 6 }}>
                  Un nom clair rend l&apos;image trouvable — les fichiers
                  s&apos;appellent souvent « 1000447529.jpg ».
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--outline)",
                  display: "grid",
                  gap: 4,
                  marginBottom: 16,
                }}
              >
                <div>Dossier : {detail.folder}</div>
                <div>
                  Taille : {prettySize(detail.size)}
                  {detail.width ? ` · ${detail.width}×${detail.height}` : ""}
                  {detail.mime ? ` · ${detail.mime}` : ""}
                </div>
                {detail.autoTags.length > 0 && (
                  <div>Tags : {detail.autoTags.join(", ")}</div>
                )}
              </div>

              <div className="field">
                <label className="field-label">
                  <Link2 size={13} style={{ verticalAlign: -2 }} /> Utilisé par
                </label>
                {usage === null ? (
                  <div style={{ fontSize: 13, color: "var(--outline)" }}>
                    Vérification…
                  </div>
                ) : usage.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--outline)" }}>
                    Aucun usage — ce média peut être supprimé sans risque.
                  </div>
                ) : (
                  <ul style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.7 }}>
                    {usage.slice(0, 12).map((u, i) => (
                      <li key={i}>
                        <span style={{ color: "var(--outline)" }}>{u.source} :</span>{" "}
                        {u.label}
                      </li>
                    ))}
                    {usage.length > 12 && (
                      <li style={{ color: "var(--outline)" }}>
                        +{usage.length - 12} autres
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => setDetail(null)}
              >
                Fermer
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                disabled={usage === null || usage.length > 0}
                title={
                  usage && usage.length > 0
                    ? "Retirez ce média de ses emplacements avant de le supprimer"
                    : undefined
                }
                onClick={removeAsset}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

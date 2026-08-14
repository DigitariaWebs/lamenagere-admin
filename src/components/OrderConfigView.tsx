"use client";

import { formatEUR } from "@/lib/format";

/** One captured choice, as stored on the order line. */
export interface ConfigEntry {
  blockId: string;
  type: string;
  label: string;
  measurements?: { key?: string; label: string; value: number; unit?: string }[];
  shape?: { key: string; label: string; image?: string };
  colors?: { key: string; label: string; surchargeCents?: number; image?: string; hex?: string }[];
  accessories?: { id: string; title: string; priceCents?: number; image?: string }[];
  opening?: { key: string; label: string; surchargeCents?: number; image?: string };
  options?: { key: string; label: string; surchargeCents?: number; image?: string }[];
  photos?: { url: string; type: string }[];
  ilot?: { included: boolean; surchargeCents?: number; image?: string };
  layout?: ConfiguredLayout;
}

/** The implantation the app generated from the customer's answers. */
export interface ConfiguredLayout {
  shape: string;
  room: { widthM: number; depthM: number; heightM: number };
  runs: {
    wall: string;
    lengthM: number;
    modules: {
      moduleId: string;
      label: string;
      slot: string;
      offsetM: number;
      widthMm: number;
      depthMm: number;
      priceCents: number;
    }[];
  }[];
  ilot?: { widthM: number; depthM: number; topM: number; tight?: boolean };
  worktopTopM: number;
  credence: boolean;
  modulesTotalCents: number;
}

/** The three runs seen from above — the same drawing the app shows. */
const SHAPE_PATH: Record<string, string> = {
  i: "M26 8v30",
  l: "M14 8v30h24",
  u: "M12 8v30h28V8",
};

function ShapeFigure({ shapeKey, size = 96 }: { shapeKey: string; size?: number }) {
  const d = SHAPE_PATH[shapeKey];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size * 0.88}
      viewBox="0 0 52 46"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * The kitchen seen from above, with the customer's own measurements written on
 * the runs it actually has. Mirrors the plan drawn in the app so the workshop
 * reads the order exactly as the customer filled it in.
 */
function MeasuredPlan({
  runs,
  values,
}: {
  runs: number;
  values: { run1?: number; run2?: number; run3?: number };
}) {
  const on = "var(--primary)";
  const soft = "var(--surface-container)";
  const edge = "var(--outline-variant)";
  return (
    <svg width="100%" height="180" viewBox="0 0 200 140" style={{ maxWidth: 280 }}>
      <rect x={14} y={14} width={172} height={112} rx={6} fill="none" stroke={edge} strokeWidth={1.4} strokeDasharray="5 5" />
      <rect x={28} y={26} width={144} height={15} rx={3} fill={soft} stroke={on} strokeWidth={1.2} />
      {values.run1 != null && (
        <text x={100} y={22} fontSize={9} fontWeight={600} fill={on} textAnchor="middle">
          {values.run1} cm
        </text>
      )}
      {runs >= 2 && (
        <>
          <rect x={28} y={41} width={15} height={70} rx={3} fill={soft} stroke={on} strokeWidth={1.2} />
          {values.run2 != null && (
            <text x={20} y={80} fontSize={9} fontWeight={600} fill={on} textAnchor="middle" transform="rotate(-90 20 80)">
              {values.run2} cm
            </text>
          )}
        </>
      )}
      {runs >= 3 && (
        <>
          <rect x={157} y={41} width={15} height={70} rx={3} fill={soft} stroke={on} strokeWidth={1.2} />
          {values.run3 != null && (
            <text x={180} y={80} fontSize={9} fontWeight={600} fill={on} textAnchor="middle" transform="rotate(90 180 80)">
              {values.run3} cm
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/** Clearance the app leaves between a corner and the start of a return run. */
const CORNER_M = 0.6;

/**
 * The implantation drawn to scale, seen from above.
 *
 * This is the whole point of the 3D step for the back office: not what the
 * customer clicked, but the shape of the kitchen that has to be built. Base
 * units and columns are drawn solid because they define the footprint; wall
 * units are dashed, which is how a fitted kitchen is drawn on a real plan.
 *
 * The geometry mirrors the app's renderer, including the direction each return
 * run travels — the left one is laid front-to-back so its cabinets face into
 * the room, the right one back-to-front.
 */
function LayoutPlan({ layout }: { layout: ConfiguredLayout }) {
  const W = layout.room.widthM;
  const D = layout.room.depthM;
  if (!(W > 0) || !(D > 0)) return null;
  const pad = 0.4;

  type Box = { x: number; y: number; w: number; h: number; dashed: boolean; label: string };
  const boxes: Box[] = [];

  layout.runs.forEach((run) => {
    for (const m of run.modules) {
      const mw = (m.widthMm || 0) / 1000;
      const md = (m.depthMm || 0) / 1000;
      if (mw <= 0 || md <= 0) continue;
      const dashed = m.slot === "haut";
      let box: Box | null = null;
      if (run.wall === "back") {
        box = { x: m.offsetM, y: 0, w: mw, h: md, dashed, label: m.label };
      } else if (run.wall === "left") {
        // Anchored at the corner, not at the front wall: the room can be deeper
        // than the run is long. Mirrors the app's renderer exactly.
        box = {
          x: 0,
          y: CORNER_M + run.lengthM - m.offsetM - mw,
          w: md,
          h: mw,
          dashed,
          label: m.label,
        };
      } else if (run.wall === "right") {
        box = { x: W - md, y: CORNER_M + m.offsetM, w: md, h: mw, dashed, label: m.label };
      }
      if (box) boxes.push(box);
    }
  });

  const solid = boxes.filter((b) => !b.dashed);
  const upper = boxes.filter((b) => b.dashed);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`}
      style={{ width: "100%", maxWidth: 460, height: "auto", overflow: "visible" }}
      role="img"
      aria-label="Plan de l'implantation vue de dessus"
    >
      {/* Room outline. */}
      <rect
        x={0}
        y={0}
        width={W}
        height={D}
        fill="var(--surface-container-low)"
        stroke="var(--outline)"
        strokeWidth={0.03}
      />
      {solid.map((b, i) => (
        <rect
          key={`s${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="var(--surface-container)"
          stroke="var(--primary)"
          strokeWidth={0.022}
        >
          <title>{b.label}</title>
        </rect>
      ))}
      {/* Wall units last and dashed, over the base units they hang above —
          the convention every fitted-kitchen plan uses. */}
      {upper.map((b, i) => (
        <rect
          key={`u${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="none"
          stroke="var(--outline)"
          strokeWidth={0.018}
          strokeDasharray="0.08 0.06"
        />
      ))}
      {layout.ilot && (
        <rect
          x={(W - layout.ilot.widthM) / 2}
          y={(D - layout.ilot.depthM) / 2 + CORNER_M / 2}
          width={layout.ilot.widthM}
          height={layout.ilot.depthM}
          fill="var(--surface-container)"
          stroke="var(--primary)"
          strokeWidth={0.022}
        >
          <title>Îlot</title>
        </rect>
      )}
      {/* Overall dimensions, written on the room rather than on each cabinet. */}
      <text x={W / 2} y={-0.12} fontSize={0.19} fill="var(--outline)" textAnchor="middle">
        {W.toFixed(2).replace(".", ",")} m
      </text>
      <text
        x={-0.14}
        y={D / 2}
        fontSize={0.19}
        fill="var(--outline)"
        textAnchor="middle"
        transform={`rotate(-90 ${-0.14} ${D / 2})`}
      >
        {D.toFixed(2).replace(".", ",")} m
      </text>
    </svg>
  );
}

/** The implantation as a card: the plan, then the run-by-run element list. */
function LayoutCard({ entry }: { entry: ConfigEntry }) {
  const layout = entry.layout!;
  const shape = layout.shape === "u" ? "en U" : layout.shape === "l" ? "en L" : "en I";
  const count = layout.runs.reduce((n, r) => n + r.modules.length, 0);
  const LEVELS = [
    { slot: "bas", label: "Meubles bas" },
    { slot: "colonne", label: "Colonnes" },
    { slot: "haut", label: "Meubles hauts" },
  ];

  return (
    <Card title={entry.label}>
      <div className="hstack" style={{ gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <LayoutPlan layout={layout} />
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontSize: 22, fontFamily: "var(--display)" }}>Cuisine {shape}</div>
          <div className="field-hint" style={{ marginBottom: 12 }}>
            {count} élément{count > 1 ? "s" : ""} · hauteur sous plafond{" "}
            {layout.room.heightM.toFixed(2).replace(".", ",")} m · plan de travail à{" "}
            {Math.round((layout.worktopTopM ?? 0.9) * 100)} cm ·{" "}
            {layout.credence === false ? "sans crédence" : "avec crédence"}
            {layout.ilot
              ? ` · îlot ${layout.ilot.widthM.toFixed(2).replace(".", ",")} × ${layout.ilot.depthM
                  .toFixed(2)
                  .replace(".", ",")} m à ${Math.round((layout.ilot.topM ?? 0.9) * 100)} cm`
              : ""}
          </div>

          {/* The island is drawn at the size that was measured even when it
              does not leave a passage — saying so beats quietly shrinking it. */}
          {layout.ilot?.tight && (
            <div
              style={{
                fontSize: 12.5,
                padding: "8px 12px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--warning, #F59E0B) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--warning, #F59E0B) 40%, transparent)",
                marginBottom: 12,
              }}
            >
              Îlot serré : moins de 70 cm de passage d&apos;un côté. À confirmer avec le
              client avant fabrication.
            </div>
          )}

          {layout.runs.map((run, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Mur {i + 1}{" "}
                <span style={{ color: "var(--outline)", fontWeight: 400 }}>
                  {run.lengthM.toFixed(2).replace(".", ",")} m
                </span>
              </div>
              {LEVELS.map((level) => {
                const picked = run.modules.filter((m) => m.slot === level.slot);
                if (!picked.length) return null;
                return (
                  <div
                    key={level.slot}
                    style={{ fontSize: 12.5, color: "var(--outline)", marginTop: 3 }}
                  >
                    {level.label} : {picked.map((m) => m.label).join(", ")}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="field-hint">
            Implantation standard générée à partir des réponses du client. Le prix de la ligne
            reste calculé sur la gamme et la surface — les {formatEUR(layout.modulesTotalCents / 100)}{" "}
            d&apos;éléments ne sont qu&apos;une référence atelier.
          </div>
        </div>
      </div>
    </Card>
  );
}

function Card({
  title,
  price,
  children,
}: {
  title: string;
  price?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="card card-padded">
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
        <div className="sh-title">{title}</div>
        {price ? (
          <span className="pill pill-bronze-soft">+ {formatEUR(price / 100)}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Thumb({ src, alt, size = 96 }: { src?: string; alt: string; size?: number }) {
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" title="Ouvrir en grand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: 10,
          border: "1px solid var(--outline-variant)",
          display: "block",
        }}
      />
    </a>
  );
}

/** A choice with its picture, or its swatch, or just its name. */
function Choice({
  label,
  image,
  hex,
  price,
}: {
  label: string;
  image?: string;
  hex?: string;
  price?: number;
}) {
  return (
    <div style={{ width: 120 }}>
      {image ? (
        <Thumb src={image} alt={label} size={120} />
      ) : hex ? (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 10,
            background: hex,
            border: "1px solid var(--outline-variant)",
          }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 10,
            background: "var(--surface-container-low)",
            border: "1px dashed var(--outline-variant)",
          }}
        />
      )}
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{label}</div>
      {price ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--secondary)" }}>
          + {formatEUR(price / 100)}
        </div>
      ) : null}
    </div>
  );
}

const ROW = { display: "flex", gap: 16, flexWrap: "wrap" as const };

/**
 * The whole configuration of one ordered line, shown the way the customer saw
 * it: pictures for what has pictures, a measured plan for the dimensions, and
 * the price of anything that carried one.
 */
export function OrderConfigView({ config }: { config?: ConfigEntry[] }) {
  const entries = config ?? [];
  if (!entries.length) {
    return (
      <div className="card card-padded" style={{ color: "var(--outline)", fontSize: 13 }}>
        Cette ligne n&apos;a aucune configuration : le produit a été commandé tel quel.
      </div>
    );
  }

  // The shape drives how the measurements are drawn, so it is read first.
  const shapeKey = entries.find((e) => e.shape)?.shape?.key;
  const runs = shapeKey === "u" ? 3 : shapeKey === "l" ? 2 : 1;

  // The colourway and the gamme identify the product itself, so they lead —
  // the server appends them last, which buried them under ten option cards.
  // The implantation leads outright: it is the shape of the thing to build.
  const LEAD = ["product-color", "quality-tier", "kitchen-layout"];
  const ordered = [...entries].sort(
    (a, b) => LEAD.indexOf(b.blockId) - LEAD.indexOf(a.blockId),
  );

  return (
    <div className="stack">
      {ordered.map((e, i) => {
        const key = `${e.blockId}-${i}`;

        if (e.layout) return <LayoutCard key={key} entry={e} />;

        if (e.blockId === "quality-tier") {
          return (
            <Card key={key} title={e.label}>
              <div style={{ fontSize: 26, fontFamily: "var(--display)", color: "var(--primary)" }}>
                {e.options?.map((o) => o.label).join(", ")}
              </div>
              <div className="field-hint" style={{ marginTop: 4 }}>
                Détermine le prix au m² appliqué à cette ligne.
              </div>
            </Card>
          );
        }

        if (e.shape) {
          return (
            <Card key={key} title={e.label}>
              <div className="hstack" style={{ gap: 20 }}>
                {e.shape.image ? (
                  <Thumb src={e.shape.image} alt={e.shape.label} size={120} />
                ) : (
                  <ShapeFigure shapeKey={e.shape.key} />
                )}
                <div style={{ fontSize: 22, fontFamily: "var(--display)" }}>{e.shape.label}</div>
              </div>
            </Card>
          );
        }

        if (e.type === "measurements" || e.type === "ilot") {
          const byLabel = (m: { label: string }) => m.label.toLowerCase();
          const run = (n: number) =>
            e.measurements?.find((m) => byLabel(m).includes(`${n}er`) || byLabel(m).includes(`${n}e `))
              ?.value;
          return (
            <Card key={key} title={e.label} price={e.ilot?.surchargeCents}>
              <div className="hstack" style={{ gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
                {e.type === "ilot" && e.ilot?.image ? (
                  <Thumb src={e.ilot.image} alt={e.label} size={160} />
                ) : e.type === "measurements" ? (
                  <MeasuredPlan runs={runs} values={{ run1: run(1), run2: run(2), run3: run(3) }} />
                ) : null}
                <table style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {(e.measurements ?? []).map((m) => (
                      <tr key={m.label}>
                        <td style={{ padding: "6px 18px 6px 0", fontSize: 13, color: "var(--outline)" }}>
                          {m.label}
                        </td>
                        <td className="num" style={{ fontSize: 15 }}>
                          {m.value} {m.unit ?? "cm"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        }

        if (e.colors?.length) {
          const total = e.colors.reduce((n, c) => n + (c.surchargeCents ?? 0), 0);
          return (
            <Card key={key} title={e.label} price={total}>
              <div style={ROW}>
                {e.colors.map((c) => (
                  <Choice key={c.key} label={c.label} image={c.image} hex={c.hex} price={c.surchargeCents} />
                ))}
              </div>
            </Card>
          );
        }

        if (e.opening) {
          return (
            <Card key={key} title={e.label} price={e.opening.surchargeCents}>
              <div style={ROW}>
                <Choice label={e.opening.label} image={e.opening.image} />
              </div>
            </Card>
          );
        }

        if (e.accessories?.length) {
          const total = e.accessories.reduce((n, a) => n + (a.priceCents ?? 0), 0);
          return (
            <Card key={key} title={e.label} price={total}>
              <div style={ROW}>
                {e.accessories.map((a) => (
                  <Choice key={a.id} label={a.title.trim()} image={a.image} price={a.priceCents} />
                ))}
              </div>
            </Card>
          );
        }

        if (e.options?.length) {
          const total = e.options.reduce((n, o) => n + (o.surchargeCents ?? 0), 0);
          return (
            <Card key={key} title={e.label} price={total}>
              <div style={ROW}>
                {e.options.map((o) => (
                  <Choice key={o.key} label={o.label} image={o.image} price={o.surchargeCents} />
                ))}
              </div>
            </Card>
          );
        }

        if (e.photos?.length) {
          return (
            <Card key={key} title={e.label}>
              <div style={ROW}>
                {e.photos
                  .filter((p) => p.type !== "video")
                  .map((p) => (
                    <Thumb key={p.url} src={p.url} alt="Photo du client" size={140} />
                  ))}
              </div>
            </Card>
          );
        }

        return null;
      })}
    </div>
  );
}

"use client";

import {
  AREA_FORMULAS,
  AREA_FORMULA_KEYS,
  areaFormula,
  type AreaFormulaKey,
} from "@/lib/area-formulas";
import { Callout } from "./SectionHead";

/**
 * The formula decides which measurements the customer is asked for and how they
 * become a billable surface — a geometry choice. It used to be a native
 * `<select>` of five sentences like "(Gauche + Fond + Droite) × Hauteur — en U",
 * so each option now carries a diagram of the shape it bills.
 */
function Figure({ formula }: { formula: AreaFormulaKey }) {
  const common = {
    width: 76,
    height: 46,
    viewBox: "0 0 76 46",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
  };

  switch (formula) {
    case "width_height":
      // Façade seen head-on: width along the bottom, height up the side.
      return (
        <svg {...common}>
          <rect x="20" y="8" width="36" height="30" rx="2" />
          <path d="M20 43h36M20 41v4M56 41v4" opacity="0.55" />
          <path d="M15 8v30M13 8h4M13 38h4" opacity="0.55" />
        </svg>
      );
    case "width_length":
      // Floor plan seen from above.
      return (
        <svg {...common}>
          <path d="M18 32 30 12h34L52 32z" />
          <path d="M18 38h34M18 36v4M52 36v4" opacity="0.55" />
        </svg>
      );
    case "l_shape":
      // Two runs meeting at a corner, seen from above.
      return (
        <svg {...common}>
          <path d="M16 12v22h30" />
          <path d="M16 12h6v22M46 34v-6H22" opacity="0.9" />
          <path d="M52 12h10M57 12v22h5" opacity="0.35" />
        </svg>
      );
    case "u_shape":
      return (
        <svg {...common}>
          <path d="M16 10v26h44V10" />
          <path d="M16 10h6v20h32V10h6" opacity="0.9" />
        </svg>
      );
    case "by_shape":
      // The customer picks the shape; the shape decides how many runs bill.
      return (
        <svg {...common}>
          <path d="M10 12v22" />
          <path d="M26 12v22h14" />
          <path d="M50 12v22h16V12" />
        </svg>
      );
    default:
      return null;
  }
}

export function AreaFormulaPicker({
  value,
  onChange,
}: {
  value: AreaFormulaKey;
  onChange: (key: AreaFormulaKey) => void;
}) {
  // Resolves legacy/unknown keys to the historical width × height instead of
  // crashing on an undefined definition.
  const def = areaFormula(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="choice-grid" role="radiogroup" aria-label="Formule de calcul de la surface">
        {AREA_FORMULA_KEYS.map((key) => {
          const f = AREA_FORMULAS[key];
          const active = key === def.key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              className={`choice-card${active ? " active" : ""}`}
              onClick={() => onChange(key)}
            >
              <span className="cc-fig">
                <Figure formula={key} />
              </span>
              <span className="cc-title">{f.label}</span>
              <span className="cc-hint">{f.hint}</span>
            </button>
          );
        })}
      </div>

      <Callout kind="info">
        Surface facturée = <strong>{def.expression}</strong>.
        <br />
        {def.fields.length > 0 ? (
          <>Le client saisira : {def.fields.map((f) => f.label).join(", ")}.</>
        ) : (
          <>
            Aucune saisie dédiée : les mesures viennent des blocs de configuration, et la forme
            choisie décide du nombre de pans facturés.
          </>
        )}
      </Callout>
    </div>
  );
}

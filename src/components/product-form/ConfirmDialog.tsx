"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface ConfirmSpec {
  title: string;
  /** Body copy. A list is rendered when the consequence is "these things go away". */
  message: React.ReactNode;
  bullets?: string[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/**
 * Replaces the native `confirm()` calls, and gives the destructive pricing
 * switch somewhere to spell out exactly what it is about to discard.
 */
export function ConfirmDialog({
  spec,
  onClose,
}: {
  spec: ConfirmSpec | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!spec) return;
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
  }, [spec, onClose]);

  if (!spec) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 460 }}
        role="alertdialog"
        aria-modal="true"
        aria-label={spec.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="card-title">{spec.title}</div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--on-surface-variant)" }}>
            {spec.message}
          </div>
          {spec.bullets && spec.bullets.length > 0 && (
            <ul
              style={{
                margin: "12px 0 0",
                paddingLeft: 18,
                fontSize: 13,
                lineHeight: 1.8,
                color: "var(--on-surface)",
              }}
            >
              {spec.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className={spec.danger ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}
            style={{ flex: 2 }}
            onClick={() => {
              spec.onConfirm();
              onClose();
            }}
          >
            {spec.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

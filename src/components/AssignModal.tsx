import React, { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import type { Participant } from '../types.js';

export interface AssignModalProps {
  desc: string;
  participants: Participant[];
  assigned: string[];
  /** Ids to render indeterminate (a bulk selection where only some rows have them). */
  partial?: string[];
  onToggle: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}

/** "Assign" dialog: tick who had this row. Toggles apply immediately. */
export function AssignModal({ desc, participants, assigned, partial = [], onToggle, onManage, onClose }: AssignModalProps): ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { cardRef.current?.focus(); }, []);
  const label = desc.trim() || 'this item';
  return (
    <div
      className="calc"
      role="dialog"
      aria-label="Assign"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="calc__card assign" tabIndex={-1} ref={cardRef}>
        <h2 className="calc__title">Assign</h2>
        <p className="calc__result">Who had <strong>{label}</strong>?</p>
        <ul className="assign__list">
          {participants.map((p) => (
            <li key={p.id} className="assign__row">
              <label className="friends__pick">
                <input
                  type="checkbox"
                  checked={assigned.includes(p.id)}
                  ref={(el) => { if (el) el.indeterminate = partial.includes(p.id) && !assigned.includes(p.id); }}
                  onChange={() => onToggle(p.id)}
                />
                <span className="assign__name">{p.name || 'Me'}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="calc__actions">
          <button type="button" className="scan-btn scan-btn--ghost" onClick={onManage}>Manage participants</button>
          <button type="button" className="scan-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

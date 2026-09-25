import React from 'react';
import type { ReactElement } from 'react';
import type { Participant } from '../types.js';

export interface AssigneePillsProps {
  ids: string[];
  participants: Participant[];
  labels: Map<string, string>;
  onClick: () => void;
}

/** Short labels for a row's assignees; tapping one reopens the Assign dialog. */
export function AssigneePills({ ids, participants, labels, onClick }: AssigneePillsProps): ReactElement | null {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const shown = ids.filter((id) => byId.has(id));
  if (shown.length === 0) return null;
  return (
    <div className="pills">
      {shown.map((id) => {
        const name = byId.get(id)!.name || 'Me';
        return (
          <button key={id} type="button" className="pill" aria-label={name} title={name} onClick={onClick}>
            {labels.get(id) ?? name}
          </button>
        );
      })}
    </div>
  );
}

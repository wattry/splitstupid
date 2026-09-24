import React, { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type { Friend, Participant } from '../types.js';
import type { FriendResult } from '../lib/friends.js';
import { friendErrorMessage } from './FriendsManager.js';

export interface ParticipantChipsProps {
  participants: Participant[];
  friends: Friend[];
  /** The device owner's participant id: pinned on the bill, no remove or Add. */
  meId: string;
  onRemove: (id: string) => void;
  /** Import a participant into friends; `name` overrides the snapshot name. */
  onImport: (participant: Participant, name?: string) => FriendResult;
}

/**
 * Who is on the bill, as a row of chips under the Manage Friends button.
 * The Me chip is never removable and never offered for import; it shows
 * "Me" while unnamed. A participant that arrived in a shared link (id not
 * in the friend list) gets an Add button; a name collision turns the chip
 * into a tiny rename form.
 */
export function ParticipantChips(props: ParticipantChipsProps): ReactElement | null {
  const { participants, friends, meId, onRemove, onImport } = props;
  if (participants.length === 0) return null;
  const known = new Set(friends.map((f) => f.id));
  return (
    <ul className="chips" aria-label="On this bill">
      {participants.map((p) => (
        <Chip
          key={p.id}
          participant={p}
          isFriend={known.has(p.id) || p.id === meId}
          isMe={p.id === meId}
          onRemove={onRemove}
          onImport={onImport}
        />
      ))}
    </ul>
  );
}

interface ChipProps {
  participant: Participant;
  isFriend: boolean;
  isMe: boolean;
  onRemove: (id: string) => void;
  onImport: (participant: Participant, name?: string) => FriendResult;
}

function Chip({ participant, isFriend, isMe, onRemove, onImport }: ChipProps): ReactElement {
  // Non-empty while the collision rename form is open.
  const [error, setError] = useState('');
  const [name, setName] = useState(participant.name);

  const attempt = (override?: string) => {
    const result = onImport(participant, override);
    if (result.ok) {
      setError('');
      return;
    }
    setError(friendErrorMessage(result));
  };

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    attempt(name);
  };

  return (
    <li className={isMe ? 'chip chip--me' : 'chip'}>
      <span className="chip__name">{participant.name || (isMe ? 'Me' : '')}</span>
      {!isFriend && !error && (
        <button
          type="button"
          className="chip__add"
          aria-label={`Add ${participant.name} to friends`}
          onClick={() => attempt()}
        >
          + Add
        </button>
      )}
      {!isMe && (
        <button
          type="button"
          className="chip__remove"
          aria-label={`Remove ${participant.name} from bill`}
          onClick={() => onRemove(participant.id)}
        >
          ×
        </button>
      )}
      {error && (
        <form className="chip__rename" onSubmit={submitRename} noValidate>
          <p className="friends__error" role="alert">{error}</p>
          <input
            type="text"
            autoComplete="off"
            aria-label={`Name for ${participant.name}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="calc__actions">
            <button type="button" className="scan-btn scan-btn--ghost" onClick={() => setError('')}>
              Cancel
            </button>
            <button type="submit" className="scan-btn">Add</button>
          </div>
        </form>
      )}
    </li>
  );
}

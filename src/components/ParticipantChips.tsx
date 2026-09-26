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
  /** Adopt a participant as Me; refused with an inline error on collision. */
  onAdopt: (participant: Participant) => { ok: boolean; error?: string };
  /** An unclaimed shared link: tapping a chip asks "Is this you?" instead of opening options. */
  claiming?: boolean;
  /** Claim mode's way out: add this device to the bill as a new participant. */
  onNotOnBill?: () => void;
}

/**
 * Who is on the bill, as a row of chips under the Manage Friends button.
 * The Me chip is never removable, never offered for import, and has no
 * options sheet; it shows "Me" while unnamed. Every other chip's name is a
 * button that opens an options sheet: "This is me" (adopt this participant
 * as the device owner), "Add to friends" (only when not already a friend),
 * "Remove from bill", and "Cancel". A name collision on Add turns the sheet
 * into a tiny rename form.
 *
 * While `claiming`, a chip tap asks the recipient to confirm "That's me"
 * (which adopts that participant), and an extra "I'm not on this bill" chip
 * adds this device instead.
 */
export function ParticipantChips(props: ParticipantChipsProps): ReactElement | null {
  const { participants, friends, meId, onRemove, onImport, onAdopt, claiming = false, onNotOnBill } = props;
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
          onAdopt={onAdopt}
          claiming={claiming}
        />
      ))}
      {claiming && onNotOnBill && (
        <li className="chip">
          <button type="button" className="chip__name chip__name--btn" onClick={onNotOnBill}>
            I'm not on this bill
          </button>
        </li>
      )}
    </ul>
  );
}

interface ChipProps {
  participant: Participant;
  isFriend: boolean;
  isMe: boolean;
  onRemove: (id: string) => void;
  onImport: (participant: Participant, name?: string) => FriendResult;
  onAdopt: (participant: Participant) => { ok: boolean; error?: string };
  claiming: boolean;
}

function Chip({ participant, isFriend, isMe, onRemove, onImport, onAdopt, claiming }: ChipProps): ReactElement {
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(participant.name);

  const label = participant.name || 'Me';

  const close = () => {
    setSheet(false);
    setError('');
    setRenaming(false);
  };

  const attempt = (override?: string) => {
    const result = onImport(participant, override);
    if (result.ok) {
      close();
      return;
    }
    setError(friendErrorMessage(result));
    if (result.error === 'duplicate') setRenaming(true);
  };

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    attempt(name);
  };

  const adopt = () => {
    const result = onAdopt(participant);
    if (result.ok) {
      close();
      return;
    }
    setError(result.error ?? '');
  };

  return (
    <li className={isMe ? 'chip chip--me' : 'chip'}>
      {isMe ? (
        <span className="chip__name">{participant.name || 'Me'}</span>
      ) : (
        <button
          type="button"
          className="chip__name chip__name--btn"
          aria-label={claiming ? `I'm ${label}` : `Options for ${label}`}
          aria-expanded={sheet}
          onClick={() => {
            setSheet((s) => !s);
            setError('');
            setRenaming(false);
          }}
        >
          {label}
        </button>
      )}
      {sheet && (
        <div className="chip__sheet" role="group" aria-label={`Options for ${label}`}>
          {error && <p className="friends__error" role="alert">{error}</p>}
          {claiming ? (
            <>
              <button
                type="button"
                className="chip__action"
                aria-label={`Confirm: I'm ${label}`}
                onClick={adopt}
              >
                {`Yes, I'm ${label}`}
              </button>
              <button type="button" className="chip__action" onClick={close}>Cancel</button>
            </>
          ) : renaming ? (
            <form className="chip__rename" onSubmit={submitRename} noValidate>
              <input
                type="text"
                autoComplete="off"
                aria-label={`Name for ${label}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="calc__actions">
                <button type="button" className="scan-btn scan-btn--ghost" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="scan-btn">Add</button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                className="chip__action"
                aria-label={`This is me: ${label}`}
                onClick={adopt}
              >
                This is me
              </button>
              {!isFriend && (
                <button
                  type="button"
                  className="chip__action"
                  aria-label={`Add ${label} to friends`}
                  onClick={() => attempt()}
                >
                  Add to friends
                </button>
              )}
              <button
                type="button"
                className="chip__action chip__action--danger"
                aria-label={`Remove ${label} from bill`}
                onClick={() => {
                  close();
                  onRemove(participant.id);
                }}
              >
                Remove from bill
              </button>
              <button type="button" className="chip__action" onClick={close}>Cancel</button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

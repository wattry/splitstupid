import React, { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type { Friend, Me, Participant } from '../types.js';
import { filterFriends, type FriendError, type FriendResult } from '../lib/friends.js';
import { isParticipant } from '../lib/participants.js';

export interface FriendsManagerProps {
  friends: Friend[];
  participants: Participant[];
  /** The device owner; always on the bill, pinned first, renamed via `onRenameMe`. */
  me: Me;
  /** Put the friend on the bill, or take them off if already on it. */
  onToggle: (friend: Friend) => void;
  onAdd: (name: string) => FriendResult;
  onRename: (id: string, name: string) => FriendResult;
  /** Rename Me; validated by the parent (blank / clashes with a friend). */
  onRenameMe: (name: string) => FriendResult;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Inline copy for a failed add/rename/import. */
export function friendErrorMessage(result: {
  ok: false;
  error: FriendError;
  existing?: Friend;
}): string {
  if (result.error === 'duplicate') {
    return `You already have a friend named ${result.existing?.name ?? 'that'}.`;
  }
  return 'Enter a name.';
}

type View = { kind: 'list' } | { kind: 'edit'; id: string } | { kind: 'editMe' };

/**
 * Fullscreen "Manage Participants" overlay. The list view searches, adds (Enter or
 * Add) and toggles friends onto the bill; the pencil opens an edit view with
 * rename and a two-tap delete. Every change applies immediately.
 */
export function FriendsManager(props: FriendsManagerProps): ReactElement {
  const { friends, participants, me, onToggle, onAdd, onRename, onRenameMe, onDelete, onClose } = props;
  const [view, setView] = useState<View>({ kind: 'list' });

  const editing = view.kind === 'edit' ? friends.find((f) => f.id === view.id) : undefined;

  return (
    <div
      className="calc friends"
      role="dialog"
      aria-label="Manage Participants"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="calc__card friends__card" tabIndex={-1} ref={(el) => el?.focus()}>
        {view.kind === 'editMe' ? (
          <EditView
            key="me"
            title="Your name"
            inputLabel="Your name"
            placeholder="Your name"
            initial={me.name}
            onSave={onRenameMe}
            onBack={() => setView({ kind: 'list' })}
          />
        ) : editing ? (
          <EditView
            key={editing.id}
            title="Edit friend"
            inputLabel="Friend name"
            initial={editing.name}
            onSave={(name) => onRename(editing.id, name)}
            onDelete={() => onDelete(editing.id)}
            onBack={() => setView({ kind: 'list' })}
          />
        ) : (
          <ListView
            friends={friends}
            participants={participants}
            me={me}
            onToggle={onToggle}
            onAdd={onAdd}
            onEdit={(id) => setView({ kind: 'edit', id })}
            onEditMe={() => setView({ kind: 'editMe' })}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

interface ListViewProps {
  friends: Friend[];
  participants: Participant[];
  me: Me;
  onToggle: (friend: Friend) => void;
  onAdd: (name: string) => FriendResult;
  onEdit: (id: string) => void;
  onEditMe: () => void;
  onClose: () => void;
}

function ListView({ friends, participants, me, onToggle, onAdd, onEdit, onEditMe, onClose }: ListViewProps): ReactElement {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const shown = filterFriends(friends, query);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const result = onAdd(draft);
    if (!result.ok) {
      setError(friendErrorMessage(result));
      return;
    }
    // A brand-new friend is almost always meant for this bill.
    onToggle(result.friend);
    setDraft('');
    setError('');
  };

  return (
    <>
      <div className="friends__head">
        <h2 className="calc__title">Manage Participants</h2>
        <button type="button" className="friends__close" onClick={onClose} aria-label="Close">
          Close
        </button>
      </div>
      <input
        className="friends__search"
        type="search"
        placeholder="Search"
        aria-label="Search friends"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && e.currentTarget.value !== '') e.stopPropagation();
        }}
      />
      <form className="friends__add" onSubmit={add} noValidate>
        <input
          type="text"
          autoComplete="off"
          placeholder="Add a friend"
          aria-label="New friend name"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
        />
        <button type="submit" className="scan-btn">Add</button>
      </form>
      {error && <p className="friends__error" role="alert">{error}</p>}
      <ul className="friends__list">
        <li className="friends__row friends__row--me">
          <label className="friends__pick">
            <input type="checkbox" checked disabled aria-label="You are always on the bill" />
            <span className="friends__name">{me.name || 'Me'}</span>
          </label>
          <button
            type="button"
            className="friends__edit"
            aria-label={`Edit ${me.name || 'Me'}`}
            onClick={onEditMe}
          >
            ✎
          </button>
        </li>
        {friends.length === 0 ? (
          <li className="friends__empty">No friends yet. Add one above.</li>
        ) : (
          shown.map((friend) => (
            <li key={friend.id} className="friends__row">
              <label className="friends__pick">
                <input
                  type="checkbox"
                  checked={isParticipant(participants, friend.id)}
                  onChange={() => onToggle(friend)}
                />
                <span className="friends__name">{friend.name}</span>
              </label>
              <button
                type="button"
                className="friends__edit"
                aria-label={`Edit ${friend.name}`}
                onClick={() => onEdit(friend.id)}
              >
                ✎
              </button>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

interface EditViewProps {
  title: string;
  inputLabel: string;
  placeholder?: string;
  initial: string;
  onSave: (name: string) => FriendResult;
  /** Omitted for Me: no Delete button. */
  onDelete?: () => void;
  onBack: () => void;
}

function EditView({ title, inputLabel, placeholder, initial, onSave, onDelete, onBack }: EditViewProps): ReactElement {
  const [name, setName] = useState(initial);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = onSave(name);
    if (!result.ok) {
      setError(friendErrorMessage(result));
      return;
    }
    onBack();
  };

  return (
    <form className="friends__editor" onSubmit={save} noValidate>
      <div className="friends__head">
        <h2 className="calc__title">{title}</h2>
        <button type="button" className="friends__close" onClick={onBack}>Back</button>
      </div>
      <input
        type="text"
        autoComplete="off"
        aria-label={inputLabel}
        placeholder={placeholder}
        value={name}
        onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
        autoFocus
      />
      {error && <p className="friends__error" role="alert">{error}</p>}
      <div className="calc__actions">
        {onDelete && (confirming ? (
          <button type="button" className="scan-btn scan-btn--danger" onClick={() => { onDelete(); onBack(); }}>
            Confirm delete
          </button>
        ) : (
          <button type="button" className="scan-btn scan-btn--ghost" onClick={() => setConfirming(true)}>
            Delete
          </button>
        ))}
        <button type="submit" className="scan-btn">Save</button>
      </div>
    </form>
  );
}

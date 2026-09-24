import React, { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type { Friend, Participant } from '../types.js';
import { filterFriends, type FriendError, type FriendResult } from '../lib/friends.js';
import { isParticipant } from '../lib/participants.js';

export interface FriendsManagerProps {
  friends: Friend[];
  participants: Participant[];
  /** Put the friend on the bill, or take them off if already on it. */
  onToggle: (friend: Friend) => void;
  onAdd: (name: string) => FriendResult;
  onRename: (id: string, name: string) => FriendResult;
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

type View = { kind: 'list' } | { kind: 'edit'; id: string };

/**
 * Fullscreen "Manage Friends" overlay. The list view searches, adds (Enter or
 * Add) and toggles friends onto the bill; the pencil opens an edit view with
 * rename and a two-tap delete. Every change applies immediately.
 */
export function FriendsManager(props: FriendsManagerProps): ReactElement {
  const { friends, participants, onToggle, onAdd, onRename, onDelete, onClose } = props;
  const [view, setView] = useState<View>({ kind: 'list' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const editing = view.kind === 'edit' ? friends.find((f) => f.id === view.id) : undefined;

  return (
    <div
      className="calc friends"
      role="dialog"
      aria-label="Manage Friends"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="calc__card friends__card">
        {editing ? (
          <EditView
            key={editing.id}
            friend={editing}
            onRename={onRename}
            onDelete={onDelete}
            onBack={() => setView({ kind: 'list' })}
          />
        ) : (
          <ListView
            friends={friends}
            participants={participants}
            onToggle={onToggle}
            onAdd={onAdd}
            onEdit={(id) => setView({ kind: 'edit', id })}
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
  onToggle: (friend: Friend) => void;
  onAdd: (name: string) => FriendResult;
  onEdit: (id: string) => void;
  onClose: () => void;
}

function ListView({ friends, participants, onToggle, onAdd, onEdit, onClose }: ListViewProps): ReactElement {
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
        <h2 className="calc__title">Manage Friends</h2>
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
      {friends.length === 0 ? (
        <p className="friends__empty">No friends yet. Add one above.</p>
      ) : (
        <ul className="friends__list">
          {shown.map((friend) => (
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
          ))}
        </ul>
      )}
    </>
  );
}

interface EditViewProps {
  friend: Friend;
  onRename: (id: string, name: string) => FriendResult;
  onDelete: (id: string) => void;
  onBack: () => void;
}

function EditView({ friend, onRename, onDelete, onBack }: EditViewProps): ReactElement {
  const [name, setName] = useState(friend.name);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = onRename(friend.id, name);
    if (!result.ok) {
      setError(friendErrorMessage(result));
      return;
    }
    onBack();
  };

  return (
    <form className="friends__editor" onSubmit={save} noValidate>
      <div className="friends__head">
        <h2 className="calc__title">Edit friend</h2>
        <button type="button" className="friends__close" onClick={onBack}>
          Back
        </button>
      </div>
      <input
        type="text"
        autoComplete="off"
        aria-label="Friend name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError('');
        }}
        autoFocus
      />
      {error && <p className="friends__error" role="alert">{error}</p>}
      <div className="calc__actions">
        {confirming ? (
          <button
            type="button"
            className="scan-btn scan-btn--danger"
            onClick={() => {
              onDelete(friend.id);
              onBack();
            }}
          >
            Confirm delete
          </button>
        ) : (
          <button type="button" className="scan-btn scan-btn--ghost" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        <button type="submit" className="scan-btn">Save</button>
      </div>
    </form>
  );
}

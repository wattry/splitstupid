import React, { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type { FriendResult } from '../lib/friends.js';
import { friendErrorMessage } from './FriendsManager.js';

export interface NameModalProps {
  /** Validate and store the name; an ok result means it was saved. */
  onSave: (name: string) => FriendResult;
  /** Runs after a successful save so the caller can continue the gated action. */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Asked once, right before sharing, when the device owner has no name yet: a
 * shared link must say who "Me" is.
 */
export function NameModal({ onSave, onDone, onCancel }: NameModalProps): ReactElement {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = onSave(name);
    if (!result.ok) {
      setError(friendErrorMessage(result));
      return;
    }
    onDone();
  };

  return (
    <div
      className="calc"
      role="dialog"
      aria-label="What's your name?"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <form className="calc__card friends__editor" onSubmit={submit} noValidate>
        <h2 className="calc__title">What's your name?</h2>
        <p className="calc__result">The link you share will show who you are.</p>
        <input
          type="text"
          autoComplete="name"
          placeholder="Your name"
          aria-label="Your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          autoFocus
        />
        {error && <p className="friends__error" role="alert">{error}</p>}
        <div className="calc__actions">
          <button type="button" className="scan-btn scan-btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="scan-btn">Continue</button>
        </div>
      </form>
    </div>
  );
}

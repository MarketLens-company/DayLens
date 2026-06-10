import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

function Section({ title, children }) {
  return (
    <div className="bracket bg-surface border border-border rounded-sm">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-signal/40 shrink-0" />
        <span className="font-sans text-[10px] text-text-muted/70 uppercase tracking-[0.15em]">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[10px] text-text-muted/60 uppercase tracking-[0.12em]">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, readOnly, disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className="bg-void border border-border rounded-sm px-3 py-2 font-mono text-sm text-text-primary placeholder-text-muted/40 transition-shadow disabled:opacity-40 read-only:opacity-50 read-only:cursor-default"
    />
  );
}

export default function Profile({ onClose }) {
  const { user, logout, refreshUser } = useAuth();

  // API keys state
  const [keys, setKeys] = useState(null);
  const [keysLoading, setKeysLoading] = useState(true);
  const [alpacaKey, setAlpacaKey] = useState('');
  const [alpacaSecret, setAlpacaSecret] = useState('');
  const [alpacaBaseUrl, setAlpacaBaseUrl] = useState('https://paper-api.alpaca.markets');
  const [alpacaDataUrl, setAlpacaDataUrl] = useState('https://data.alpaca.markets');
  const [alpacaWsUrl, setAlpacaWsUrl] = useState('wss://stream.data.alpaca.markets/v2/iex');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysMsg, setKeysMsg] = useState(null);
  const [keysDirty, setKeysDirty] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadKeys() {
      try {
        const data = await apiFetch('/auth/keys');
        setKeys(data);
        if (data.alpacaBaseUrl) setAlpacaBaseUrl(data.alpacaBaseUrl);
        if (data.alpacaDataUrl) setAlpacaDataUrl(data.alpacaDataUrl);
        if (data.alpacaWsUrl) setAlpacaWsUrl(data.alpacaWsUrl);
      } catch {
        setKeys(null);
      } finally {
        setKeysLoading(false);
      }
    }
    loadKeys();
  }, []);

  function markDirty() {
    setKeysDirty(true);
  }

  async function handleSaveKeys(e) {
    e.preventDefault();
    setKeysSaving(true);
    setKeysMsg(null);
    try {
      await apiFetch('/auth/keys', {
        method: 'POST',
        body: JSON.stringify({
          alpacaApiKey: alpacaKey || undefined,
          alpacaSecretKey: alpacaSecret || undefined,
          alpacaBaseUrl,
          alpacaDataUrl,
          alpacaWsUrl,
          anthropicApiKey: anthropicKey || undefined,
        }),
      });
      setKeysMsg({ type: 'success', text: 'API keys saved successfully' });
      setAlpacaKey('');
      setAlpacaSecret('');
      setAnthropicKey('');
      setKeysDirty(false);
      // Refresh key display
      const data = await apiFetch('/auth/keys');
      setKeys(data);
      await refreshUser();
    } catch (err) {
      setKeysMsg({ type: 'error', text: err.message || 'Failed to save keys' });
    } finally {
      setKeysSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.username) return;
    setDeleteLoading(true);
    try {
      await apiFetch('/auth/account', { method: 'DELETE' });
      logout();
    } catch (err) {
      alert(`Failed to delete account: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  function formatDate(dt) {
    if (!dt) return 'Never';
    return new Date(dt).toLocaleString();
  }

  return (
    <div className="min-h-screen bg-void overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-void border-b border-border flex items-center justify-between px-4 h-11">
        <div className="flex items-center gap-2">
          <span className="text-signal font-mono text-sm">◆</span>
          <span className="font-mono font-bold text-sm text-text-primary">DayLens</span>
          <span className="text-border font-mono">│</span>
          <span className="font-sans text-[11px] text-text-muted uppercase tracking-[0.15em]">Profile</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="font-mono text-[11px] text-text-muted hover:text-signal transition-colors tracking-widest"
          >
            ← BACK
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-4">
        {/* No API keys warning */}
        {keys && !keys.configured && (
          <div className="px-4 py-3 bg-warn/10 border border-warn/30 rounded">
            <span className="font-sans text-xs text-warn">
              Configure your API keys below to start trading. Without them, market data and trading features will not be available.
            </span>
          </div>
        )}

        {/* Section 1: Account Info */}
        <Section title="ACCOUNT INFO">
          <div className="grid grid-cols-2 gap-4">
            <Field label="USERNAME">
              <Input value={user?.username || ''} readOnly />
            </Field>
            <Field label="EMAIL">
              <Input value={user?.email || ''} readOnly />
            </Field>
            <Field label="MEMBER SINCE">
              <Input value={formatDate(user?.created_at)} readOnly />
            </Field>
            <Field label="LAST LOGIN">
              <Input value={formatDate(user?.last_login)} readOnly />
            </Field>
          </div>
        </Section>

        {/* Section 2: API Keys */}
        <Section title="API KEYS">
          {keysLoading ? (
            <div className="font-mono text-xs text-text-muted py-2">—</div>
          ) : (
            <form onSubmit={handleSaveKeys} className="flex flex-col gap-4">
              {keysMsg && (
                <div className={`px-3 py-2 rounded border font-mono text-xs ${
                  keysMsg.type === 'success'
                    ? 'bg-signal/10 border-signal/30 text-signal'
                    : 'bg-loss/10 border-loss/30 text-loss'
                }`}>
                  {keysMsg.text}
                </div>
              )}

              <div className="font-sans text-[10px] text-text-muted pb-1 border-b border-border uppercase tracking-widest">
                ALPACA MARKETS
              </div>

              <Field label="API KEY">
                <Input
                  value={alpacaKey}
                  onChange={e => { setAlpacaKey(e.target.value); markDirty(); }}
                  placeholder={keys?.alpacaApiKey || 'Enter new Alpaca API key'}
                />
              </Field>

              <Field label="SECRET KEY">
                <Input
                  type="password"
                  value={alpacaSecret}
                  onChange={e => { setAlpacaSecret(e.target.value); markDirty(); }}
                  placeholder={keys?.alpacaSecretKey ? 'Saved (enter to update)' : 'Enter Alpaca secret key'}
                />
              </Field>

              <Field label="BASE URL">
                <Input
                  value={alpacaBaseUrl}
                  onChange={e => { setAlpacaBaseUrl(e.target.value); markDirty(); }}
                  placeholder="https://paper-api.alpaca.markets"
                />
              </Field>

              <Field label="DATA URL">
                <Input
                  value={alpacaDataUrl}
                  onChange={e => { setAlpacaDataUrl(e.target.value); markDirty(); }}
                  placeholder="https://data.alpaca.markets"
                />
              </Field>

              <Field label="WEBSOCKET URL">
                <Input
                  value={alpacaWsUrl}
                  onChange={e => { setAlpacaWsUrl(e.target.value); markDirty(); }}
                  placeholder="wss://stream.data.alpaca.markets/v2/iex"
                />
              </Field>

              <div className="font-sans text-[10px] text-text-muted pt-2 pb-1 border-b border-border uppercase tracking-widest">
                ANTHROPIC AI
              </div>

              <Field label="API KEY">
                <Input
                  type="password"
                  value={anthropicKey}
                  onChange={e => { setAnthropicKey(e.target.value); markDirty(); }}
                  placeholder={keys?.anthropicApiKey || 'Enter Anthropic API key'}
                />
              </Field>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={keysSaving}
                  className={`font-mono text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    keysDirty
                      ? 'bg-signal text-void hover:bg-[#00BFA0] border border-signal'
                      : 'bg-surface border border-border text-text-muted'
                  }`}
                >
                  {keysSaving ? 'SAVING...' : 'SAVE API KEYS'}
                </button>
              </div>
            </form>
          )}
        </Section>

        {/* Section 3: Danger Zone */}
        <div className="border border-loss/20 rounded p-4 mt-4">
          <h3 className="font-sans text-xs text-loss uppercase tracking-widest mb-4">DANGER ZONE</h3>
          <div className="flex flex-col gap-4">
            <div className="font-sans text-xs text-text-muted">
              Deleting your account is permanent. All your trades, decisions, watchlist, and configuration will be erased.
            </div>

            <Field label={`TYPE YOUR USERNAME TO CONFIRM: "${user?.username}"`}>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={user?.username}
              />
            </Field>

            <div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user?.username || deleteLoading}
                className="font-mono text-xs px-4 py-2 rounded border border-loss text-loss hover:bg-loss hover:text-void transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

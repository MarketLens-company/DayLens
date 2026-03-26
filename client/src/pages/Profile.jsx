import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

function Section({ title, children }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-sm">
      <div className="px-4 py-3 border-b border-bg-border">
        <span className="font-mono text-xs text-amber-400 tracking-widest">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-xs text-gray-500 tracking-wider">{label}</label>
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
      className="bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50 read-only:opacity-60 read-only:cursor-default"
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
    <div className="min-h-screen bg-bg-base overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base border-b border-bg-border flex items-center justify-between px-4 h-10">
        <span className="font-mono text-xs text-amber-400 tracking-widest">PROFILE</span>
        {onClose && (
          <button
            onClick={onClose}
            className="font-mono text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
          >
            BACK
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        {/* No API keys warning */}
        {keys && !keys.configured && (
          <div className="px-4 py-3 bg-amber-900/20 border border-amber-700 rounded-sm">
            <span className="font-mono text-xs text-amber-400">
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
            <div className="font-mono text-xs text-gray-500 py-2">Loading...</div>
          ) : (
            <form onSubmit={handleSaveKeys} className="flex flex-col gap-4">
              {keysMsg && (
                <div className={`px-3 py-2 rounded-sm border text-xs font-mono ${
                  keysMsg.type === 'success'
                    ? 'bg-green-900/20 border-green-700 text-green-400'
                    : 'bg-red-900/20 border-red-700 text-red-400'
                }`}>
                  {keysMsg.text}
                </div>
              )}

              <div className="text-xs font-mono text-gray-500 pb-1 border-b border-bg-border">
                ALPACA MARKETS
              </div>

              <Field label="API KEY">
                <Input
                  value={alpacaKey}
                  onChange={e => setAlpacaKey(e.target.value)}
                  placeholder={keys?.alpacaApiKey || 'Enter new Alpaca API key'}
                />
              </Field>

              <Field label="SECRET KEY">
                <Input
                  type="password"
                  value={alpacaSecret}
                  onChange={e => setAlpacaSecret(e.target.value)}
                  placeholder={keys?.alpacaSecretKey ? 'Saved (enter to update)' : 'Enter Alpaca secret key'}
                />
              </Field>

              <Field label="BASE URL">
                <Input
                  value={alpacaBaseUrl}
                  onChange={e => setAlpacaBaseUrl(e.target.value)}
                  placeholder="https://paper-api.alpaca.markets"
                />
              </Field>

              <Field label="DATA URL">
                <Input
                  value={alpacaDataUrl}
                  onChange={e => setAlpacaDataUrl(e.target.value)}
                  placeholder="https://data.alpaca.markets"
                />
              </Field>

              <Field label="WEBSOCKET URL">
                <Input
                  value={alpacaWsUrl}
                  onChange={e => setAlpacaWsUrl(e.target.value)}
                  placeholder="wss://stream.data.alpaca.markets/v2/iex"
                />
              </Field>

              <div className="text-xs font-mono text-gray-500 pt-2 pb-1 border-b border-bg-border">
                ANTHROPIC AI
              </div>

              <Field label="API KEY">
                <Input
                  type="password"
                  value={anthropicKey}
                  onChange={e => setAnthropicKey(e.target.value)}
                  placeholder={keys?.anthropicApiKey || 'Enter Anthropic API key'}
                />
              </Field>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={keysSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {keysSaving ? 'SAVING...' : 'SAVE API KEYS'}
                </button>
              </div>
            </form>
          )}
        </Section>

        {/* Section 3: Danger Zone */}
        <Section title="DANGER ZONE">
          <div className="flex flex-col gap-4">
            <div className="text-xs font-mono text-gray-400">
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
                className="px-4 py-2 bg-red-900 hover:bg-red-700 text-red-200 font-mono text-xs font-bold tracking-widest rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-red-700"
              >
                {deleteLoading ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

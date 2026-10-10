import React, { useState } from 'react';
import {
  X,
  Cloud,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Laptop,
  Tv,
  Smartphone,
  Check,
  Copy,
} from 'lucide-react';
import { CloudSyncState } from '../types/tv';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: CloudSyncState;
  onUpdateSyncCode: (newCode: string) => void;
  onPushSync: () => Promise<void>;
  onPullSync: (codeToPull: string) => Promise<void>;
  onToggleAutoSync: () => void;
  favoritesCount: number;
  customChannelsCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onUpdateSyncCode,
  onPushSync,
  onPullSync,
  onToggleAutoSync,
  favoritesCount,
  customChannelsCount,
}) => {
  const [inputCode, setInputCode] = useState(syncState.syncCode);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncState.syncCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePush = async () => {
    setStatusMessage('Pushing favorites, custom playlists, and playback profile to cloud...');
    await onPushSync();
    setStatusMessage('Profile synchronized across all linked devices.');
  };

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setStatusMessage(`Fetching cloud profile for key ${inputCode.toUpperCase()}...`);
    onUpdateSyncCode(inputCode.trim().toUpperCase());
    await onPullSync(inputCode.trim().toUpperCase());
    setStatusMessage(`Synchronized workspace state from key ${inputCode.toUpperCase()}.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-sky-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cross-Platform Cloud Synchronization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep favorite channels, custom M3U playlists, and low-latency settings in sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Active Workspace Sync Key
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tracking-wider tabular-nums">
                  {syncState.syncCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  title="Copy Sync Key"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                <span>{favoritesCount} Favorites</span>
                <span aria-hidden="true">·</span>
                <span>{customChannelsCount} Custom M3U Channels</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <button
                onClick={handlePush}
                disabled={syncState.status === 'syncing'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {syncState.status === 'syncing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>Push State Now</span>
              </button>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncState.autoSync}
                  onChange={onToggleAutoSync}
                  className="rounded accent-sky-600"
                />
                <span>Real-time auto-sync on change</span>
              </label>
            </div>
          </div>

          <form onSubmit={handlePull} className="space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Restore or Pair with Existing Sync Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="GSTR-8842-SYNC"
                className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull Profile</span>
              </button>
            </div>
          </form>

          {statusMessage && (
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
              {statusMessage}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-2.5">
              Synchronized Platform Endpoints ({syncState.devices.length})
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {syncState.devices.map((dev) => {
                const isTV = dev.platform.toLowerCase().includes('tv');
                const isMobile = dev.platform.toLowerCase().includes('ios') || dev.platform.toLowerCase().includes('mobile');
                return (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {isTV ? (
                        <Tv className="w-4 h-4 text-sky-500 shrink-0" />
                      ) : isMobile ? (
                        <Smartphone className="w-4 h-4 text-sky-500 shrink-0" />
                      ) : (
                        <Laptop className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {dev.name}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {dev.platform}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {new Date(dev.lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  PlusCircle,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TVChannel, ChannelCategory, ChannelRegion } from '../types/tv';
import { parseM3UPlaylist } from '../utils/m3uParser';
import { SAMPLE_M3U_PLAYLIST } from '../data/channels';

interface PlaylistImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportChannels: (channels: TVChannel[]) => void;
  customChannels: TVChannel[];
  onRemoveCustomChannel: (id: string) => void;
}

export const PlaylistImportModal: React.FC<PlaylistImportModalProps> = ({
  isOpen,
  onClose,
  onImportChannels,
  customChannels,
  onRemoveCustomChannel,
}) => {
  const [activeTab, setActiveTab] = useState<'m3u' | 'single' | 'manage'>('m3u');
  const [playlistName, setPlaylistName] = useState('International Science & Slow TV');
  const [m3uContent, setM3uContent] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [singleName, setSingleName] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleCountry, setSingleCountry] = useState('Switzerland');
  const [singleLanguage, setSingleLanguage] = useState('English');
  const [singleCategory, setSingleCategory] =
    useState<Exclude<ChannelCategory, 'All'>>('Documentary');
  const [singleRegion, setSingleRegion] = useState<Exclude<ChannelRegion, 'All'>>('Europe');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setM3uContent(SAMPLE_M3U_PLAYLIST);
    setFeedback({
      type: 'success',
      message: 'Loaded sample 3-channel M3U8 manifest. Click "Parse & Add to Guide" below.',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlaylistName(file.name.replace(/\.(m3u8?|txt)$/i, ''));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setM3uContent(text);
      setFeedback({
        type: 'success',
        message: `Loaded file "${file.name}" (${text.split('\n').length} lines).`,
      });
    };
    reader.readAsText(file);
  };

  const handleParseM3U = (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uContent.trim()) {
      setFeedback({
        type: 'error',
        message: 'Paste M3U/M3U8 content or load the sample manifest first.',
      });
      return;
    }

    const parsed = parseM3UPlaylist(m3uContent, playlistName || 'Custom M3U');
    if (parsed.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No valid HTTP/HTTPS stream URLs found in the M3U content.',
      });
      return;
    }

    onImportChannels(parsed);
    setFeedback({
      type: 'success',
      message: `Imported ${parsed.length} live channel${parsed.length > 1 ? 's' : ''} into your guide and queued cloud sync.`,
    });
    setM3uContent('');
  };

  const handleAddSingleStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || !singleUrl.trim()) {
      setFeedback({
        type: 'error',
        message: 'Provide both a channel name and a valid HLS (.m3u8) stream URL.',
      });
      return;
    }

    const num = String(850 + customChannels.length + 1);
    const id = `custom-single-${Date.now()}`;
    const newChannel: TVChannel = {
      id,
      number: num,
      name: singleName.trim(),
      callSign: singleName.trim().slice(0, 6).toUpperCase(),
      country: singleCountry.trim() || 'International',
      countryCode: singleCountry.trim().slice(0, 2).toUpperCase() || 'GL',
      region: singleRegion,
      language: singleLanguage.trim() || 'English',
      category: singleCategory,
      streamUrl: singleUrl.trim(),
      fallbackStreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      resolution: '1080p',
      targetBitrateMbps: 5.0,
      accentColor: '#0284C7',
      isCustom: true,
      playlistName: 'Direct Stream Entry',
      schedule: [
        {
          id: `${id}-1`,
          title: `${singleName.trim()} — Live Broadcast`,
          synopsis: `Custom HLS stream imported directly (${singleCountry}, ${singleLanguage}).`,
          startHourOffset: 0,
          durationMinutes: 60,
          category: singleCategory,
          isLiveBroadcast: true,
        },
        {
          id: `${id}-2`,
          title: `${singleName.trim()} — Upcoming Block`,
          synopsis: `Continuous international stream feed.`,
          startHourOffset: 1,
          durationMinutes: 60,
          category: singleCategory,
          isLiveBroadcast: false,
        },
      ],
    };

    onImportChannels([newChannel]);
    setSingleName('');
    setSingleUrl('');
    setFeedback({
      type: 'success',
      message: `Added "${newChannel.name}" (CH ${newChannel.number}) to the live guide.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Custom Playlist & Stream Import
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Import `.m3u` / `.m3u8` channel manifests or attach direct HLS transponder streams
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={() => {
              setActiveTab('m3u');
              setFeedback(null);
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'm3u'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            M3U / M3U8 Manifest
          </button>
          <button
            onClick={() => {
              setActiveTab('single');
              setFeedback(null);
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'single'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Direct HLS URL
          </button>
          <button
            onClick={() => {
              setActiveTab('manage');
              setFeedback(null);
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'manage'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Imported Channels ({customChannels.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === 'm3u' && (
            <form onSubmit={handleParseM3U} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Playlist Collection Name
                  </label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="e.g., European Public Broadcasters"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".m3u,.m3u8,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .M3U File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Sample M3U</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Raw `#EXTM3U` Manifest Content
                </label>
                <textarea
                  rows={7}
                  value={m3uContent}
                  onChange={(e) => setM3uContent(e.target.value)}
                  placeholder={`#EXTM3U\n#EXTINF:-1 tvg-country="CH" tvg-language="German" group-title="Documentary",Swiss Alpine UHD\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`}
                  className="w-full p-3 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Parse & Add to Guide</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'single' && (
            <form onSubmit={handleAddSingleStream} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Channel Title
                  </label>
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="e.g., Zurich Financial TV"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    HLS Stream URL (`.m3u8`)
                  </label>
                  <input
                    type="url"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    placeholder="https://example.com/live/master.m3u8"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={singleCountry}
                    onChange={(e) => setSingleCountry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Broadcast Language
                  </label>
                  <input
                    type="text"
                    value={singleLanguage}
                    onChange={(e) => setSingleLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={singleCategory}
                    onChange={(e) =>
                      setSingleCategory(e.target.value as Exclude<ChannelCategory, 'All'>)
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="News">News</option>
                    <option value="Science & Space">Science & Space</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Culture & Music">Culture & Music</option>
                    <option value="Finance">Finance</option>
                    <option value="Sports">Sports</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Broadcast Region
                  </label>
                  <select
                    value={singleRegion}
                    onChange={(e) =>
                      setSingleRegion(e.target.value as Exclude<ChannelRegion, 'All'>)
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Europe">Europe</option>
                    <option value="North America">North America</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                    <option value="Middle East">Middle East</option>
                    <option value="Latin America">Latin America</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Channel to Guide</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-3">
              {customChannels.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No custom channels imported yet. Use the M3U Manifest tab to load your personalized streams.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {customChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between px-4 py-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          CH {ch.number} · {ch.name}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono truncate max-w-md mt-0.5">
                          {ch.streamUrl}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveCustomChannel(ch.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove custom channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

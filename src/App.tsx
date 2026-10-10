import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Star,
  FolderPlus,
  Cloud,
  Sun,
  Moon,
  Gauge,
  PictureInPicture2,
  Compass,
  History,
  Tv,
  X,
} from 'lucide-react';
import {
  TVChannel,
  ChannelCategory,
  ChannelRegion,
  CloudSyncState,
} from './types/tv';
import { INITIAL_CHANNELS } from './data/channels';
import { LiveVideoPlayer } from './components/LiveVideoPlayer';
import { ProgramGuide } from './components/ProgramGuide';
import { PlaylistImportModal } from './components/PlaylistImportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { FloatingPipWindow } from './components/FloatingPipWindow';

const STORAGE_KEYS = {
  FAVORITES: 'globalstream_tv_favorites_v1',
  CUSTOM_CHANNELS: 'globalstream_tv_custom_channels_v1',
  HISTORY: 'globalstream_tv_history_v1',
  THEME: 'globalstream_tv_theme_v1',
  LOW_LATENCY: 'globalstream_tv_ll_v1',
  SYNC_CODE: 'globalstream_tv_sync_code_v1',
};

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const [customChannels, setCustomChannels] = useState<TVChannel[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CHANNELS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const allChannels = useMemo(
    () => [...INITIAL_CHANNELS, ...customChannels],
    [customChannels]
  );

  const [activeChannelId, setActiveChannelId] = useState<string>(
    INITIAL_CHANNELS[0].id
  );

  const activeChannel = useMemo(
    () => allChannels.find((c) => c.id === activeChannelId) || allChannels[0],
    [allChannels, activeChannelId]
  );

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw
        ? JSON.parse(raw)
        : ['dw-english', 'nasa-tv', 'nhk-world'];
    } catch {
      return ['dw-english', 'nasa-tv', 'nhk-world'];
    }
  });

  const [watchHistory, setWatchHistory] = useState<
    { channelId: string; timestamp: string }[]
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw
        ? JSON.parse(raw)
        : [{ channelId: 'dw-english', timestamp: new Date().toISOString() }];
    } catch {
      return [{ channelId: 'dw-english', timestamp: new Date().toISOString() }];
    }
  });

  const [lowLatencyMode, setLowLatencyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOW_LATENCY);
    return saved !== null ? saved === 'true' : true;
  });

  const [navSection, setNavSection] = useState<
    'all' | 'favorites' | 'custom' | 'history'
  >('all');
  const [selectedCategory, setSelectedCategory] =
    useState<ChannelCategory>('All');
  const [selectedRegion, setSelectedRegion] = useState<ChannelRegion>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFloatingPipActive, setIsFloatingPipActive] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [syncState, setSyncState] = useState<CloudSyncState>(() => ({
    syncCode:
      localStorage.getItem(STORAGE_KEYS.SYNC_CODE) || 'GSTR-8842-SYNC',
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    autoSync: true,
    devices: [
      {
        id: 'desktop-web-primary',
        name: 'Desktop Broadcast Workstation',
        platform: 'Desktop Web',
        lastSyncedAt: new Date().toISOString(),
      },
      {
        id: 'dev-apple-tv',
        name: 'Living Room Apple TV 4K',
        platform: 'tvOS',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
    ],
  }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CUSTOM_CHANNELS,
      JSON.stringify(customChannels)
    );
  }, [customChannels]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(watchHistory));
  }, [watchHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOW_LATENCY, String(lowLatencyMode));
  }, [lowLatencyMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYNC_CODE, syncState.syncCode);
  }, [syncState.syncCode]);

  const pushSyncToCloud = useCallback(async () => {
    setSyncState((prev) => ({ ...prev, status: 'syncing' }));
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode: syncState.syncCode,
          favorites,
          customChannels,
          watchHistory,
          preferences: {
            lowLatencyMode,
            theme,
            defaultCategory: selectedCategory,
            defaultRegion: selectedRegion,
          },
          device: {
            id: 'desktop-web-primary',
            name: 'Desktop Broadcast Workstation',
            platform: 'Desktop Web',
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setSyncState((prev) => ({
          ...prev,
          status: 'synced',
          lastSyncedAt: data.updatedAt,
          devices: data.devices || prev.devices,
        }));
      } else {
        setSyncState((prev) => ({ ...prev, status: 'offline' }));
      }
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline' }));
    }
  }, [
    syncState.syncCode,
    favorites,
    customChannels,
    watchHistory,
    lowLatencyMode,
    theme,
    selectedCategory,
    selectedRegion,
  ]);

  const pullSyncFromCloud = useCallback(async (codeToPull: string) => {
    setSyncState((prev) => ({ ...prev, status: 'syncing' }));
    try {
      const response = await fetch(`/api/sync/${encodeURIComponent(codeToPull)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.favorites)) setFavorites(data.favorites);
        if (Array.isArray(data.customChannels))
          setCustomChannels(data.customChannels);
        if (Array.isArray(data.watchHistory)) setWatchHistory(data.watchHistory);
        if (data.preferences) {
          if (typeof data.preferences.lowLatencyMode === 'boolean') {
            setLowLatencyMode(data.preferences.lowLatencyMode);
          }
          if (
            data.preferences.theme === 'dark' ||
            data.preferences.theme === 'light'
          ) {
            setTheme(data.preferences.theme);
          }
        }
        setSyncState((prev) => ({
          ...prev,
          syncCode: data.syncCode,
          lastSyncedAt: data.updatedAt,
          devices: data.devices || prev.devices,
          status: 'synced',
        }));
      } else {
        await pushSyncToCloud();
      }
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline' }));
    }
  }, [pushSyncToCloud]);

  useEffect(() => {
    if (!syncState.autoSync) return;
    const timer = setTimeout(() => {
      pushSyncToCloud();
    }, 600);
    return () => clearTimeout(timer);
  }, [favorites, customChannels, lowLatencyMode, syncState.autoSync, pushSyncToCloud]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectChannel = (channel: TVChannel) => {
    setActiveChannelId(channel.id);
    setWatchHistory((prev) => {
      const filtered = prev.filter((item) => item.channelId !== channel.id);
      return [
        { channelId: channel.id, timestamp: new Date().toISOString() },
        ...filtered,
      ].slice(0, 15);
    });
  };

  const handleToggleFavorite = (channelId: string) => {
    setFavorites((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleImportChannels = (newChannels: TVChannel[]) => {
    setCustomChannels((prev) => [...newChannels, ...prev]);
    if (newChannels.length > 0) {
      setActiveChannelId(newChannels[0].id);
    }
  };

  const handleRemoveCustomChannel = (id: string) => {
    setCustomChannels((prev) => prev.filter((ch) => ch.id !== id));
    if (activeChannelId === id) {
      setActiveChannelId(INITIAL_CHANNELS[0].id);
    }
  };

  const filteredChannels = useMemo(() => {
    return allChannels.filter((ch) => {
      if (navSection === 'favorites' && !favorites.includes(ch.id)) return false;
      if (navSection === 'custom' && !ch.isCustom) return false;
      if (
        navSection === 'history' &&
        !watchHistory.some((h) => h.channelId === ch.id)
      )
        return false;

      if (selectedCategory !== 'All' && ch.category !== selectedCategory) {
        return false;
      }

      if (selectedRegion !== 'All' && ch.region !== selectedRegion) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const progMatch = ch.schedule.some(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.synopsis.toLowerCase().includes(q)
        );
        const metaMatch =
          ch.name.toLowerCase().includes(q) ||
          ch.country.toLowerCase().includes(q) ||
          ch.language.toLowerCase().includes(q) ||
          ch.category.toLowerCase().includes(q) ||
          ch.number.includes(q);
        return progMatch || metaMatch;
      }

      return true;
    });
  }, [
    allChannels,
    navSection,
    favorites,
    watchHistory,
    selectedCategory,
    selectedRegion,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setNavSection('all');
    setSelectedCategory('All');
    setSelectedRegion('All');
    setSearchQuery('');
  };

  const handleCycleChannel = (direction: 'prev' | 'next') => {
    const list = filteredChannels.length > 0 ? filteredChannels : allChannels;
    const idx = list.findIndex((c) => c.id === activeChannel.id);
    if (idx === -1) {
      handleSelectChannel(list[0]);
      return;
    }
    const nextIdx =
      direction === 'next'
        ? (idx + 1) % list.length
        : (idx - 1 + list.length) % list.length;
    handleSelectChannel(list[nextIdx]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors">
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleResetFilters();
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          GlobalStream Desktop
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#live-guide"
            onClick={(e) => {
              e.preventDefault();
              setNavSection('all');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              navSection === 'all'
                ? 'text-sky-600 dark:text-sky-400 underline underline-offset-8'
                : ''
            }`}
          >
            Live Guide
          </a>
          <a
            href="#favorites"
            onClick={(e) => {
              e.preventDefault();
              setNavSection('favorites');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              navSection === 'favorites'
                ? 'text-sky-600 dark:text-sky-400 underline underline-offset-8'
                : ''
            }`}
          >
            Favorites
          </a>
          <a
            href="#custom-streams"
            onClick={(e) => {
              e.preventDefault();
              setNavSection('custom');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              navSection === 'custom'
                ? 'text-sky-600 dark:text-sky-400 underline underline-offset-8'
                : ''
            }`}
          >
            Custom Streams
          </a>
          <a
            href="#cloud-sync"
            onClick={(e) => {
              e.preventDefault();
              setIsSyncModalOpen(true);
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Cloud Sync
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsPlaylistModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Import Playlist
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto">
        <aside className="w-full lg:w-68 shrink-0 bg-white dark:bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="guide-search"
                className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Search Channels & EPG
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="guide-search"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Channel, country, show... (/)"
                  className="w-full pl-8 pr-8 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Personalization & Views
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setNavSection('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    navSection === 'all'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Compass className="w-4 h-4" />
                    <span>All International Feeds</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {allChannels.length}
                  </span>
                </button>

                <button
                  onClick={() => setNavSection('favorites')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    navSection === 'favorites'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Star className="w-4 h-4" />
                    <span>Saved Favorites</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {favorites.length}
                  </span>
                </button>

                <button
                  onClick={() => setNavSection('custom')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    navSection === 'custom'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <FolderPlus className="w-4 h-4" />
                    <span>Custom M3U Playlists</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {customChannels.length}
                  </span>
                </button>

                <button
                  onClick={() => setNavSection('history')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    navSection === 'history'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <History className="w-4 h-4" />
                    <span>Recent Watch History</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {watchHistory.length}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Direct Transponder Dial</span>
                <span className="font-mono tabular-nums">CH</span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {allChannels.map((ch) => {
                  const isCurrent = ch.id === activeChannel.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white dark:bg-sky-600 dark:text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate pr-2">{ch.name}</span>
                      <span className="font-mono text-xs opacity-75 tabular-nums shrink-0">
                        {ch.number}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="w-full p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-500" />
                  <span>Cloud Sync</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {syncState.status === 'syncing' ? 'Syncing...' : 'Synced'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between tabular-nums">
                <span>{syncState.syncCode}</span>
                <span>{syncState.devices.length} devices</span>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
                }
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Desk</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Dark Desk</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsFloatingPipActive((prev) => !prev)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isFloatingPipActive
                    ? 'bg-sky-600 border-sky-500 text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
                <span>PiP Mode</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                International Broadcast Control & Live Guide
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Active Feed: CH {activeChannel.number} ({activeChannel.name})</span>
                <span aria-hidden="true">·</span>
                <span>{lowLatencyMode ? 'Low-Latency HLS (< 1.5s target)' : 'Standard HLS Buffer'}</span>
                <span aria-hidden="true">·</span>
                <span>Key {syncState.syncCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setLowLatencyMode((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lowLatencyMode
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{lowLatencyMode ? 'Low-Latency Enabled' : 'Enable Low-Latency'}</span>
              </button>

              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 text-sky-500" />
                <span>Sync Devices</span>
              </button>
            </div>
          </div>

          <div ref={playerContainerRef}>
            <LiveVideoPlayer
              channel={activeChannel}
              lowLatencyMode={lowLatencyMode}
              onToggleLowLatency={() => setLowLatencyMode((prev) => !prev)}
              isFavorite={favorites.includes(activeChannel.id)}
              onToggleFavorite={handleToggleFavorite}
              isFloatingPipActive={isFloatingPipActive}
              onToggleFloatingPip={() =>
                setIsFloatingPipActive((prev) => !prev)
              }
            />
          </div>

          <div id="live-guide">
            <ProgramGuide
              channels={filteredChannels}
              activeChannelId={activeChannel.id}
              onSelectChannel={handleSelectChannel}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              searchQuery={searchQuery}
              onResetFilters={handleResetFilters}
              onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
            />
          </div>
        </main>
      </div>

      <FloatingPipWindow
        channel={activeChannel}
        isOpen={isFloatingPipActive}
        onClose={() => setIsFloatingPipActive(false)}
        onPrevChannel={() => handleCycleChannel('prev')}
        onNextChannel={() => handleCycleChannel('next')}
        onReturnToStage={() => {
          playerContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <PlaylistImportModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onImportChannels={handleImportChannels}
        customChannels={customChannels}
        onRemoveCustomChannel={handleRemoveCustomChannel}
      />

      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncState={syncState}
        onUpdateSyncCode={(code) =>
          setSyncState((prev) => ({ ...prev, syncCode: code }))
        }
        onPushSync={pushSyncToCloud}
        onPullSync={pullSyncFromCloud}
        onToggleAutoSync={() =>
          setSyncState((prev) => ({ ...prev, autoSync: !prev.autoSync }))
        }
        favoritesCount={favorites.length}
        customChannelsCount={customChannels.length}
      />
    </div>
  );
}

export default App;

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SyncProfile {
  syncCode: string;
  favorites: string[];
  customChannels: any[];
  watchHistory: { channelId: string; timestamp: string }[];
  preferences: {
    lowLatencyMode: boolean;
    theme: 'dark' | 'light';
    defaultCategory: string;
    defaultRegion: string;
  };
  devices: {
    id: string;
    name: string;
    platform: string;
    lastSyncedAt: string;
  }[];
  updatedAt: string;
}

const syncStore = new Map<string, SyncProfile>();

const DEFAULT_SYNC_CODE = 'GSTR-8842-SYNC';
syncStore.set(DEFAULT_SYNC_CODE, {
  syncCode: DEFAULT_SYNC_CODE,
  favorites: ['dw-english', 'france24-en', 'nasa-tv', 'nhk-world', 'al-jazeera-en'],
  customChannels: [],
  watchHistory: [
    { channelId: 'dw-english', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
    { channelId: 'nasa-tv', timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString() },
  ],
  preferences: {
    lowLatencyMode: true,
    theme: 'dark',
    defaultCategory: 'All',
    defaultRegion: 'All',
  },
  devices: [
    {
      id: 'dev-mac-studio',
      name: 'Mac Studio — Desk Control',
      platform: 'macOS Desktop',
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      id: 'dev-apple-tv',
      name: 'Living Room Apple TV 4K',
      platform: 'tvOS',
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
  ],
  updatedAt: new Date().toISOString(),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/sync/:code', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const profile = syncStore.get(code);
    if (!profile) {
      return res.status(404).json({
        error: 'Sync profile not found. Push your current workspace to create this sync key.',
      });
    }
    return res.json(profile);
  });

  app.post('/api/sync', (req, res) => {
    const {
      syncCode,
      favorites,
      customChannels,
      watchHistory,
      preferences,
      device,
    } = req.body;

    const code = (syncCode || DEFAULT_SYNC_CODE).trim().toUpperCase();
    const existing = syncStore.get(code);

    const now = new Date().toISOString();
    let devices = existing?.devices ? [...existing.devices] : [];

    if (device && device.id) {
      const idx = devices.findIndex((d) => d.id === device.id);
      const updatedDevice = {
        id: device.id,
        name: device.name || 'Desktop Web Workstation',
        platform: device.platform || 'Desktop Browser',
        lastSyncedAt: now,
      };
      if (idx >= 0) {
        devices[idx] = updatedDevice;
      } else {
        devices.unshift(updatedDevice);
      }
    }

    const updatedProfile: SyncProfile = {
      syncCode: code,
      favorites: Array.isArray(favorites) ? favorites : existing?.favorites || [],
      customChannels: Array.isArray(customChannels) ? customChannels : existing?.customChannels || [],
      watchHistory: Array.isArray(watchHistory) ? watchHistory : existing?.watchHistory || [],
      preferences: preferences || existing?.preferences || {
        lowLatencyMode: true,
        theme: 'dark',
        defaultCategory: 'All',
        defaultRegion: 'All',
      },
      devices: devices.slice(0, 8),
      updatedAt: now,
    };

    syncStore.set(code, updatedProfile);
    return res.json(updatedProfile);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlobalStream Desktop server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export type ChannelCategory =
  | 'All'
  | 'News'
  | 'Science & Space'
  | 'Documentary'
  | 'Culture & Music'
  | 'Finance'
  | 'Entertainment'
  | 'Sports'
  | 'Custom';

export type ChannelRegion =
  | 'All'
  | 'Europe'
  | 'North America'
  | 'Asia-Pacific'
  | 'Middle East'
  | 'Latin America'
  | 'Global';

export interface ProgramItem {
  id: string;
  title: string;
  synopsis: string;
  startHourOffset: number;
  durationMinutes: number;
  category: string;
  isLiveBroadcast: boolean;
}

export interface TVChannel {
  id: string;
  number: string;
  name: string;
  callSign: string;
  country: string;
  countryCode: string;
  region: Exclude<ChannelRegion, 'All'>;
  language: string;
  category: Exclude<ChannelCategory, 'All'>;
  streamUrl: string;
  fallbackStreamUrl?: string;
  resolution: '1080p60' | '1080p' | '720p60' | '4K UHD';
  targetBitrateMbps: number;
  accentColor: string;
  isCustom?: boolean;
  playlistName?: string;
  schedule: ProgramItem[];
}

export interface StreamDiagnostics {
  latencyMs: number;
  bufferSeconds: number;
  bandwidthMbps: number;
  droppedFrames: number;
  resolutionLabel: string;
  codec: string;
  isLiveEdge: boolean;
  playbackState: 'loading' | 'playing' | 'paused' | 'fallback' | 'error';
}

export interface SyncDevice {
  id: string;
  name: string;
  platform: string;
  lastSyncedAt: string;
}

export interface CloudSyncState {
  syncCode: string;
  lastSyncedAt: string | null;
  status: 'synced' | 'syncing' | 'offline' | 'error';
  devices: SyncDevice[];
  autoSync: boolean;
}

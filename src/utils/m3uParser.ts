import { TVChannel, ChannelCategory, ChannelRegion } from '../types/tv';

const VALID_CATEGORIES: Exclude<ChannelCategory, 'All'>[] = [
  'News',
  'Science & Space',
  'Documentary',
  'Culture & Music',
  'Finance',
  'Entertainment',
  'Sports',
  'Custom',
];

const COUNTRY_TO_REGION: Record<string, Exclude<ChannelRegion, 'All'>> = {
  DE: 'Europe',
  FR: 'Europe',
  CH: 'Europe',
  AT: 'Europe',
  BE: 'Europe',
  NO: 'Europe',
  UK: 'Europe',
  GB: 'Europe',
  IT: 'Europe',
  ES: 'Europe',
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  JP: 'Asia-Pacific',
  CN: 'Asia-Pacific',
  KR: 'Asia-Pacific',
  AU: 'Asia-Pacific',
  SG: 'Asia-Pacific',
  QA: 'Middle East',
  AE: 'Middle East',
  CL: 'Latin America',
  AR: 'Latin America',
  BR: 'Latin America',
};

const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Germany',
  FR: 'France',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  NO: 'Norway',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  JP: 'Japan',
  CN: 'China',
  KR: 'South Korea',
  QA: 'Qatar',
  CL: 'Chile',
  BR: 'Brazil',
};

const ACCENT_PALETTE = [
  '#0284C7',
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#E11D48',
  '#4F46E5',
  '#059669',
];

function extractAttribute(line: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(regex);
  return match ? match[1].trim() : null;
}

export function parseM3UPlaylist(rawText: string, playlistSourceName = 'Custom Import'): TVChannel[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedChannels: TVChannel[] = [];
  let pendingInfo: string | null = null;
  let counter = 801;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      pendingInfo = line;
      continue;
    }

    if (line.startsWith('#')) {
      continue;
    }

    if (/^https?:\/\//i.test(line)) {
      const streamUrl = line;
      let name = `Custom Channel ${counter}`;
      let countryCode = 'GL';
      let language = 'International';
      let rawGroup = 'Custom';

      if (pendingInfo) {
        const commaIndex = pendingInfo.lastIndexOf(',');
        if (commaIndex !== -1 && commaIndex < pendingInfo.length - 1) {
          name = pendingInfo.slice(commaIndex + 1).trim();
        }
        const parsedCountry = extractAttribute(pendingInfo, 'tvg-country');
        if (parsedCountry) {
          countryCode = parsedCountry.toUpperCase().slice(0, 2);
        }
        const parsedLang = extractAttribute(pendingInfo, 'tvg-language');
        if (parsedLang) {
          language = parsedLang;
        }
        const parsedGroup = extractAttribute(pendingInfo, 'group-title');
        if (parsedGroup) {
          rawGroup = parsedGroup;
        }
      }

      const matchedCategory =
        VALID_CATEGORIES.find((c) => c.toLowerCase() === rawGroup.toLowerCase()) || 'Custom';

      const region = COUNTRY_TO_REGION[countryCode] || 'Global';
      const country = COUNTRY_NAMES[countryCode] || 'International';
      const callSign =
        name
          .replace(/[^A-Za-z0-9 ]/g, '')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w.slice(0, 3).toUpperCase())
          .join('-') || `CH-${counter}`;

      const id = `custom-${Date.now()}-${counter}`;
      const accentColor = ACCENT_PALETTE[parsedChannels.length % ACCENT_PALETTE.length];

      parsedChannels.push({
        id,
        number: String(counter),
        name,
        callSign,
        country,
        countryCode,
        region,
        language,
        category: matchedCategory,
        streamUrl,
        fallbackStreamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        resolution: '1080p',
        targetBitrateMbps: 5.0,
        accentColor,
        isCustom: true,
        playlistName: playlistSourceName,
        schedule: [
          {
            id: `${id}-prog-1`,
            title: `${name} — Prior Broadcast Block`,
            synopsis: `Imported live stream feed via ${playlistSourceName} M3U manifest.`,
            startHourOffset: -1,
            durationMinutes: 60,
            category: matchedCategory,
            isLiveBroadcast: true,
          },
          {
            id: `${id}-prog-2`,
            title: `${name} — Live Continuous Feed`,
            synopsis: `Direct low-latency HLS broadcast from ${country} (${language}).`,
            startHourOffset: 0,
            durationMinutes: 60,
            category: matchedCategory,
            isLiveBroadcast: true,
          },
          {
            id: `${id}-prog-3`,
            title: `${name} — Upcoming Programming`,
            synopsis: `Scheduled international feed continuation on ${callSign}.`,
            startHourOffset: 1,
            durationMinutes: 60,
            category: matchedCategory,
            isLiveBroadcast: false,
          },
          {
            id: `${id}-prog-4`,
            title: `${name} — Late Edition`,
            synopsis: `International syndication and rebroadcast block.`,
            startHourOffset: 2,
            durationMinutes: 60,
            category: matchedCategory,
            isLiveBroadcast: false,
          },
        ],
      });

      counter++;
      pendingInfo = null;
    }
  }

  return parsedChannels;
}

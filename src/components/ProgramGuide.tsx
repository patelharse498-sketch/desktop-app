import React from 'react';
import {
  Clock,
  Star,
  Play,
  SlidersHorizontal,
  FolderPlus,
} from 'lucide-react';
import { TVChannel, ChannelCategory, ChannelRegion } from '../types/tv';

interface ProgramGuideProps {
  channels: TVChannel[];
  activeChannelId: string;
  onSelectChannel: (channel: TVChannel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  selectedCategory: ChannelCategory;
  onSelectCategory: (cat: ChannelCategory) => void;
  selectedRegion: ChannelRegion;
  onSelectRegion: (reg: ChannelRegion) => void;
  searchQuery: string;
  onResetFilters: () => void;
  onOpenPlaylistModal: () => void;
}

const CATEGORIES: ChannelCategory[] = [
  'All',
  'News',
  'Science & Space',
  'Documentary',
  'Culture & Music',
  'Finance',
  'Sports',
  'Entertainment',
  'Custom',
];

const REGIONS: ChannelRegion[] = [
  'All',
  'Europe',
  'North America',
  'Asia-Pacific',
  'Middle East',
  'Latin America',
];

function formatHourSlot(offset: number): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + offset);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const ProgramGuide: React.FC<ProgramGuideProps> = ({
  channels,
  activeChannelId,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  selectedCategory,
  onSelectCategory,
  selectedRegion,
  onSelectRegion,
  searchQuery,
  onResetFilters,
  onOpenPlaylistModal,
}) => {
  const nowMinutes = new Date().getMinutes();
  const progressPercent = Math.min(100, Math.max(5, Math.round((nowMinutes / 60) * 100)));

  return (
    <section className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-x-auto max-w-full">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-x-auto">
              {REGIONS.map((region) => {
                const isActive = selectedRegion === region;
                return (
                  <button
                    key={region}
                    onClick={() => onSelectRegion(region)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{channels.length}</strong> international transponders
            </span>
            {searchQuery && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Query: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong>
                </span>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4 font-mono tabular-nums text-xs">
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Now ({formatHourSlot(0)}) — {progressPercent}% elapsed</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Next Slot: {formatHourSlot(1)}</span>
          </div>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No matching broadcast channels found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            No international channels matched your current category, region, or search filter. Reset filters or import a custom M3U8 playlist to expand your guide.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onResetFilters}
              className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset All Filters
            </button>
            <button
              onClick={onOpenPlaylistModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Import Custom M3U</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pl-4 pr-3 w-16 font-mono tabular-nums">CH</th>
                <th className="py-2.5 px-3 w-56">Broadcaster & Origin</th>
                <th className="py-2.5 px-3 min-w-64">
                  Now Airing ({formatHourSlot(0)} – {formatHourSlot(1)})
                </th>
                <th className="py-2.5 px-3 min-w-56 hidden lg:table-cell">
                  Up Next ({formatHourSlot(1)} – {formatHourSlot(2)})
                </th>
                <th className="py-2.5 px-3 w-28 text-right font-mono tabular-nums hidden sm:table-cell">
                  Feed Spec
                </th>
                <th className="py-2.5 pl-3 pr-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {channels.map((ch) => {
                const isSelected = ch.id === activeChannelId;
                const isFav = favorites.includes(ch.id);
                const currentProg =
                  ch.schedule.find((p) => p.startHourOffset === 0) || ch.schedule[0];
                const nextProg =
                  ch.schedule.find((p) => p.startHourOffset === 1) || ch.schedule[1] || ch.schedule[0];

                return (
                  <tr
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/35'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 pl-4 pr-3 font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                      <span className={isSelected ? 'text-sky-600 dark:text-sky-400' : ''}>
                        {ch.number}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {ch.name}
                        </span>
                        {ch.isCustom && (
                          <span className="text-xs font-mono text-sky-600 dark:text-sky-400">
                            · M3U
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{ch.country}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ch.language}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ch.category}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-sm">
                          {currentProg.title}
                        </span>
                        <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                          {60 - nowMinutes}m left
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-600 dark:bg-sky-400 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 hidden lg:table-cell">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        {nextProg.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {nextProg.category} · 60 min
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums hidden sm:table-cell">
                      <div>{ch.resolution}</div>
                      <div className="text-slate-400 dark:text-slate-500">
                        {ch.targetBitrateMbps.toFixed(1)} Mbps
                      </div>
                    </td>

                    <td
                      className="py-3 pl-3 pr-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onToggleFavorite(ch.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isFav
                              ? 'border-amber-400/50 bg-amber-500/10 text-amber-500'
                              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title={isFav ? 'Remove Favorite' : 'Bookmark Channel'}
                          aria-label="Favorite channel"
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>

                        <button
                          onClick={() => onSelectChannel(ch)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-600 hover:text-white'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isSelected ? 'On Air' : 'Tune'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

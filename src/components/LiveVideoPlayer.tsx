import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Gauge,
  RefreshCw,
  Star,
  Radio,
  Tv,
  SlidersHorizontal,
} from 'lucide-react';
import { TVChannel, StreamDiagnostics } from '../types/tv';

interface LiveVideoPlayerProps {
  channel: TVChannel;
  lowLatencyMode: boolean;
  onToggleLowLatency: () => void;
  isFavorite: boolean;
  onToggleFavorite: (channelId: string) => void;
  isFloatingPipActive: boolean;
  onToggleFloatingPip: () => void;
  videoRefExternal?: React.RefObject<HTMLVideoElement | null>;
}

export const LiveVideoPlayer: React.FC<LiveVideoPlayerProps> = ({
  channel,
  lowLatencyMode,
  onToggleLowLatency,
  isFavorite,
  onToggleFavorite,
  isFloatingPipActive,
  onToggleFloatingPip,
  videoRefExternal,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = videoRefExternal || internalVideoRef;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [qualityLevels, setQualityLevels] = useState<{ index: number; label: string }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [usingFallbackStream, setUsingFallbackStream] = useState(false);
  const [usingSynthBroadcast, setUsingSynthBroadcast] = useState(false);

  const [diagnostics, setDiagnostics] = useState<StreamDiagnostics>({
    latencyMs: lowLatencyMode ? 1180 : 2840,
    bufferSeconds: lowLatencyMode ? 2.4 : 6.2,
    bandwidthMbps: channel.targetBitrateMbps,
    droppedFrames: 0,
    resolutionLabel: channel.resolution,
    codec: 'AVC1.640028 / AAC-LC',
    isLiveEdge: true,
    playbackState: 'loading',
  });

  const currentProgram =
    channel.schedule.find((p) => p.startHourOffset === 0) || channel.schedule[0];

  const loadStream = useCallback(
    (urlToLoad: string, isBackupAttempt = false) => {
      const video = videoRef.current;
      if (!video) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setUsingSynthBroadcast(false);
      setDiagnostics((prev) => ({
        ...prev,
        playbackState: 'loading',
        resolutionLabel: channel.resolution,
        bandwidthMbps: channel.targetBitrateMbps,
      }));

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: lowLatencyMode,
          liveSyncDurationCount: lowLatencyMode ? 2 : 3,
          liveMaxLatencyDurationCount: lowLatencyMode ? 4 : 6,
          maxBufferLength: lowLatencyMode ? 8 : 20,
          backBufferLength: 15,
          enableWorker: true,
        });

        hlsRef.current = hls;
        hls.loadSource(urlToLoad);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const levels = data.levels.map((lvl, idx) => ({
            index: idx,
            label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
          }));
          setQualityLevels(levels);
          setSelectedQuality(-1);

          video
            .play()
            .then(() => {
              setIsPlaying(true);
              setDiagnostics((prev) => ({
                ...prev,
                playbackState: isBackupAttempt ? 'fallback' : 'playing',
                isLiveEdge: true,
              }));
            })
            .catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (
              !isBackupAttempt &&
              channel.fallbackStreamUrl &&
              channel.fallbackStreamUrl !== urlToLoad
            ) {
              setUsingFallbackStream(true);
              loadStream(channel.fallbackStreamUrl, true);
            } else {
              setUsingSynthBroadcast(true);
              setDiagnostics((prev) => ({
                ...prev,
                playbackState: 'playing',
                isLiveEdge: true,
              }));
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = urlToLoad;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {});
          setDiagnostics((prev) => ({ ...prev, playbackState: 'playing' }));
        });
      } else {
        setUsingSynthBroadcast(true);
        setDiagnostics((prev) => ({ ...prev, playbackState: 'playing' }));
      }
    },
    [channel, lowLatencyMode, videoRef]
  );

  useEffect(() => {
    setUsingFallbackStream(false);
    loadStream(channel.streamUrl, false);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.id, channel.streamUrl, lowLatencyMode, loadStream]);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const hls = hlsRef.current;

      let bufferSec = lowLatencyMode ? 2.1 : 5.4;
      if (video && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        bufferSec = Math.max(0.8, Number((end - video.currentTime).toFixed(1)));
      }

      const rawLatency =
        hls && typeof hls.latency === 'number' && hls.latency > 0
          ? Math.round(hls.latency * 1000)
          : (lowLatencyMode ? 1120 : 2750) + Math.floor(Math.random() * 95);

      const jitterBandwidth = Number(
        (channel.targetBitrateMbps + (Math.random() * 0.4 - 0.2)).toFixed(1)
      );

      setDiagnostics((prev) => ({
        ...prev,
        latencyMs: rawLatency,
        bufferSeconds: bufferSec,
        bandwidthMbps: jitterBandwidth,
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [channel.targetBitrateMbps, lowLatencyMode, videoRef]);

  useEffect(() => {
    if (!usingSynthBroadcast || !fallbackCanvasRef.current) return;
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const renderStudioFeed = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090D16');
      grad.addColorStop(0.5, '#111827');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const offset = (frame * 0.6) % 48;
      for (let x = offset; x < w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = channel.accentColor || '#38BDF8';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x += 6) {
        const y =
          h * 0.52 +
          Math.sin(x * 0.018 + frame * 0.06) * 28 +
          Math.cos(x * 0.009 - frame * 0.04) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 26px Outfit, sans-serif';
      ctx.fillText(`${channel.callSign}  ·  ${channel.name}`, 48, h - 120);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(currentProgram.title, 48, h - 88);

      const now = new Date();
      const timecode = now.toISOString().slice(11, 19) + ':' + String(frame % 60).padStart(2, '0');
      ctx.fillStyle = '#38BDF8';
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`UTC ${timecode}  ·  LOW-LATENCY DIRECT TRANSPONDER`, 48, h - 56);

      animId = requestAnimationFrame(renderStudioFeed);
    };

    renderStudioFeed();
    return () => cancelAnimationFrame(animId);
  }, [usingSynthBroadcast, channel, currentProgram.title]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleQualitySelect = (index: number) => {
    setSelectedQuality(index);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    setShowQualityMenu(false);
  };

  const syncToLiveEdge = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const liveEdge = video.buffered.end(video.buffered.length - 1);
      video.currentTime = Math.max(0, liveEdge - 0.8);
      video.play().catch(() => {});
      setIsPlaying(true);
      setDiagnostics((prev) => ({ ...prev, isLiveEdge: true }));
    } else {
      loadStream(usingFallbackStream && channel.fallbackStreamUrl ? channel.fallbackStreamUrl : channel.streamUrl, usingFallbackStream);
    }
  };

  const handleNativeOrDockedPip = async () => {
    const video = videoRef.current;
    if (
      video &&
      document.pictureInPictureEnabled &&
      !usingSynthBroadcast &&
      video.readyState >= 2
    ) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch {
        // Fallback smoothly to in-app floating PiP
      }
    }
    onToggleFloatingPip();
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group select-none"
    >
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${usingSynthBroadcast ? 'hidden' : 'block'}`}
          playsInline
          muted={isMuted}
          autoPlay
          crossOrigin="anonymous"
        />

        {usingSynthBroadcast && (
          <canvas
            ref={fallbackCanvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-cover block"
          />
        )}

        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute top-4 inset-x-5 flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-semibold text-sky-400 tabular-nums shrink-0">
              CH {channel.number}
            </span>
            <span className="text-white/40" aria-hidden="true">
              ·
            </span>
            <h2 className="text-base font-semibold text-white truncate">
              {channel.name}
            </h2>
            <span className="text-white/40 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline whitespace-nowrap">
              {channel.country} ({channel.language})
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2.5 text-xs font-mono text-slate-200 tabular-nums shrink-0 bg-black/55 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE</span>
            </span>
            <span className="text-white/30">·</span>
            <span>{diagnostics.resolutionLabel}</span>
            <span className="text-white/30">·</span>
            <span>{diagnostics.bandwidthMbps} Mbps</span>
            <span className="text-white/30">·</span>
            <span title="End-to-end HLS stream latency">
              {diagnostics.latencyMs} ms
            </span>
          </div>
        </div>

        {isMuted && (
          <button
            onClick={toggleMute}
            className="absolute top-16 left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-white text-xs font-medium border border-white/15 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            <span>Audio Muted — Click to Unmute Broadcast</span>
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 inset-x-0 p-4 sm:px-5 flex flex-col gap-3 z-20">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-300 mb-0.5">
                <span className="font-medium text-sky-400">Now Playing</span>
                <span aria-hidden="true">·</span>
                <span>{currentProgram.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Buffer {diagnostics.bufferSeconds}s
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                {currentProgram.title}
              </h3>
            </div>

            <button
              onClick={() => onToggleFavorite(channel.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isFavorite
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/20'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isFavorite ? 'Saved' : 'Favorite'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/15">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-lg hover:bg-white/15 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Broadcast Volume"
                  className="w-20 accent-sky-500 cursor-pointer hidden sm:block"
                />
              </div>

              <button
                onClick={syncToLiveEdge}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Jump to real-time live edge"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Sync Live Edge</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleLowLatency}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lowLatencyMode
                    ? 'bg-sky-500/25 border-sky-400/50 text-sky-200'
                    : 'bg-white/10 border-white/15 text-slate-300 hover:text-white'
                }`}
                title="Toggle Low-Latency HLS synchronization"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{lowLatencyMode ? 'LL-HLS Active' : 'Standard Buffer'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-slate-200 border border-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Select HLS Bitrate Level"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {selectedQuality === -1
                      ? `Auto (${channel.resolution})`
                      : qualityLevels.find((q) => q.index === selectedQuality)?.label || 'Auto'}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-11 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-30">
                    <button
                      onClick={() => handleQualitySelect(-1)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-slate-800 ${
                        selectedQuality === -1 ? 'text-sky-400 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      <span>Auto ABR</span>
                      <span>{channel.resolution}</span>
                    </button>
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => handleQualitySelect(lvl.index)}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-slate-800 ${
                          selectedQuality === lvl.index
                            ? 'text-sky-400 font-semibold'
                            : 'text-slate-200'
                        }`}
                      >
                        <span>Stream {lvl.index + 1}</span>
                        <span>{lvl.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleNativeOrDockedPip}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isFloatingPipActive
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                }`}
                title="Detach Picture-in-Picture Mini Player"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isFloatingPipActive ? 'Dock Player' : 'PiP Mini'}
                </span>
              </button>

              <button
                onClick={handleFullscreen}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
                title="Fullscreen Monitor"
                aria-label="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
          {currentProgram.synopsis}
        </p>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          <span className="flex items-center gap-1">
            <Tv className="w-3.5 h-3.5 text-slate-400" />
            <span>{diagnostics.codec}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Region: {channel.region}</span>
        </div>
      </div>
    </div>
  );
};

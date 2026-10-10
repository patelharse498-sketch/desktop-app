import React, { useState } from 'react';
import {
  X,
  SkipBack,
  SkipForward,
  Maximize2,
  Move,
  Radio,
} from 'lucide-react';
import { TVChannel } from '../types/tv';

interface FloatingPipWindowProps {
  channel: TVChannel;
  isOpen: boolean;
  onClose: () => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  onReturnToStage: () => void;
}

export const FloatingPipWindow: React.FC<FloatingPipWindowProps> = ({
  channel,
  isOpen,
  onClose,
  onPrevChannel,
  onNextChannel,
  onReturnToStage,
}) => {
  const [position, setPosition] = useState<{ bottom: number; right: number }>({
    bottom: 24,
    right: 24,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!isOpen) return null;

  const currentProgram =
    channel.schedule.find((p) => p.startHourOffset === 0) || channel.schedule[0];

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = dragStart.x - e.clientX;
    const dy = dragStart.y - e.clientY;
    setPosition((prev) => ({
      right: Math.max(16, Math.min(window.innerWidth - 360, prev.right + dx)),
      bottom: Math.max(16, Math.min(window.innerHeight - 240, prev.bottom + dy)),
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed z-50 w-84 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-white select-none"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 cursor-move"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Move className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono text-xs text-sky-400 font-semibold tabular-nums shrink-0">
            CH {channel.number}
          </span>
          <span className="text-xs font-semibold truncate">{channel.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onReturnToStage}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Expand to Main Stage"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close Picture-in-Picture"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3.5 h-3.5" />
            <span>PiP ACTIVE MONITOR</span>
          </span>
          <span>{channel.resolution}</span>
        </div>

        <div>
          <p className="text-xs font-semibold text-white truncate">
            {currentProgram.title}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {channel.country} · {currentProgram.category}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onPrevChannel}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span>Prev Ch</span>
          </button>
          <button
            onClick={onNextChannel}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Next Ch</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

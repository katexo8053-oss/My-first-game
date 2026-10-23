/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Pause, RotateCcw } from 'lucide-react';
import { calculateHealthPips } from '../game/rules';

interface HUDProps {
  hp: number;
  maxHp: number;
  essence: number;
  maxEssence: number;
  souls: number;
  bossHp?: { current: number; max: number; name: string };
  activeNotification?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp,
  maxHp,
  essence,
  maxEssence,
  souls,
  bossHp,
  activeNotification,
  isMuted,
  onToggleMute,
  onPause,
  onRestart,
}) => {
  const pips = calculateHealthPips(hp, maxHp);
  const essencePercent = Math.min(100, Math.max(0, (essence / maxEssence) * 100));

  // Virtual touch input dispatchers for mobile
  const simulateKey = (code: string, type: 'keydown' | 'keyup') => {
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 md:p-6 select-none">
      {/* Top Header Row */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Vitality Pips & Soul Essence */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          {/* Health Pips */}
          <div className="flex items-center gap-1.5 bg-[#0e111a]/90 border border-[#2d334a] px-2.5 py-1.5 md:px-3 md:py-2 rounded shadow-lg">
            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">VITALITY</span>
            <div className="flex items-center gap-1">
              {pips.map((state, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-5 md:w-4 md:h-6 border transition-all duration-150 flex items-center justify-center ${
                    state === 'full'
                      ? 'bg-[#4ee1ec] border-[#7af7ff] shadow-[0_0_8px_#4ee1ec]'
                      : state === 'damaged'
                      ? 'bg-[#1b434e] border-[#4ee1ec]'
                      : 'bg-[#121526] border-[#22273d]'
                  }`}
                >
                  {state === 'full' && (
                    <div className="w-1 md:w-1.5 h-2.5 md:h-3 bg-white opacity-80" />
                  )}
                </div>
              ))}
            </div>
            <span className="text-[11px] md:text-xs font-mono-tabular text-slate-300 ml-1.5 font-bold">
              {Math.round(hp)}/{maxHp}
            </span>
          </div>

          {/* Soul Essence Rally Bar */}
          <div className="flex items-center gap-2 bg-[#0e111a]/90 border border-[#2d334a] px-2.5 py-1 md:px-3 md:py-1.5 rounded shadow-lg w-44 md:w-56">
            <span className="text-[8px] md:text-[9px] text-[#7af7ff] font-bold tracking-wider">SOUL</span>
            <div className="flex-1 h-1.5 md:h-2 bg-[#121526] border border-[#22273d] overflow-hidden rounded-xs">
              <div
                className="h-full bg-gradient-to-r from-[#3a0ca3] via-[#4ee1ec] to-[#7af7ff] transition-all duration-150"
                style={{ width: `${essencePercent}%` }}
              />
            </div>
            <span className="text-[9px] md:text-[10px] font-mono-tabular text-slate-400">
              {Math.round(essencePercent)}%
            </span>
          </div>
        </div>

        {/* Center: Boss Health Bar (only active in Boss Arena) */}
        {bossHp && (
          <div className="w-full max-w-xs md:max-w-md mx-2 md:mx-4 flex flex-col items-center animate-fade-in">
            <span className="text-[10px] md:text-xs font-cinzel font-bold text-amber-200 tracking-widest drop-shadow mb-1">
              {bossHp.name.toUpperCase()}
            </span>
            <div className="w-full h-2.5 md:h-3 bg-[#121526] border-2 border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.4)] relative">
              <div
                className="h-full bg-gradient-to-r from-[#9e2a2b] via-[#e63946] to-[#ff758f] transition-all duration-150"
                style={{ width: `${Math.max(0, (bossHp.current / bossHp.max) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] md:text-[10px] font-mono-tabular text-slate-400 mt-0.5">
              {Math.round(bossHp.current)} / {bossHp.max}
            </span>
          </div>
        )}

        {/* Right: Quick Utility Buttons & Soul Counter */}
        <div className="flex flex-col items-end gap-1.5 md:gap-2">
          {/* Controls: Mute, Pause, Restart */}
          <div className="flex items-center gap-1 md:gap-1.5 pointer-events-auto">
            <button
              onClick={onToggleMute}
              tabIndex={-1}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              title="Toggle Audio [M]"
              className="w-7 h-7 md:w-8 md:h-8 rounded bg-[#0e111a]/90 border border-[#2d334a] hover:border-[#4ee1ec] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button
              onClick={onPause}
              tabIndex={-1}
              aria-label="Pause Game"
              title="Pause [Esc / P]"
              className="w-7 h-7 md:w-8 md:h-8 rounded bg-[#0e111a]/90 border border-[#2d334a] hover:border-[#4ee1ec] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Pause size={14} />
            </button>
            <button
              onClick={onRestart}
              tabIndex={-1}
              aria-label="Restart Game"
              title="Restart [R]"
              className="w-7 h-7 md:w-8 md:h-8 rounded bg-[#0e111a]/90 border border-[#2d334a] hover:border-[#e63946] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Souls Currency Cluster */}
          <div className="flex items-center gap-1.5 bg-[#0e111a]/90 border border-[#2d334a] px-2.5 py-1 md:px-3 md:py-1.5 rounded shadow-lg">
            <svg className="w-3 md:w-3.5 h-3.5 md:h-4 text-[#4ee1ec]" viewBox="0 0 14 18" fill="currentColor">
              <path d="M7 0L14 8L7 18L0 8L7 0Z" opacity="0.9" />
              <path d="M7 2L12 8L7 15L2 8L7 2Z" fill="#ffffff" opacity="0.6" />
            </svg>
            <span className="text-[11px] md:text-xs font-mono-tabular font-bold text-[#7af7ff] tracking-wider">
              {souls}
            </span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-400">SOULS</span>
          </div>
        </div>
      </div>

      {/* Mobile On-Screen Virtual Controls */}
      <div className="md:hidden flex items-end justify-between w-full px-2 pb-2 pointer-events-auto">
        {/* Left: D-pad movement */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={() => simulateKey('KeyA', 'keydown')}
            onTouchEnd={() => simulateKey('KeyA', 'keyup')}
            onMouseDown={() => simulateKey('KeyA', 'keydown')}
            onMouseUp={() => simulateKey('KeyA', 'keyup')}
            className="w-12 h-12 bg-[#0e111a]/80 border border-[#2d334a] text-slate-200 active:bg-[#4ee1ec]/30 rounded-full flex items-center justify-center font-bold text-lg select-none"
          >
            ◀
          </button>
          <button
            onTouchStart={() => simulateKey('KeyD', 'keydown')}
            onTouchEnd={() => simulateKey('KeyD', 'keyup')}
            onMouseDown={() => simulateKey('KeyD', 'keydown')}
            onMouseUp={() => simulateKey('KeyD', 'keyup')}
            className="w-12 h-12 bg-[#0e111a]/80 border border-[#2d334a] text-slate-200 active:bg-[#4ee1ec]/30 rounded-full flex items-center justify-center font-bold text-lg select-none"
          >
            ▶
          </button>
        </div>

        {/* Right: Actions (Jump, Strike, Dash) */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={() => simulateKey('KeyK', 'keydown')}
            onTouchEnd={() => simulateKey('KeyK', 'keyup')}
            onMouseDown={() => simulateKey('KeyK', 'keydown')}
            onMouseUp={() => simulateKey('KeyK', 'keyup')}
            className="w-11 h-11 bg-[#0e111a]/80 border border-[#2d334a] text-[#7af7ff] active:bg-[#4ee1ec]/30 rounded-full flex items-center justify-center text-xs font-bold font-mono"
          >
            DASH
          </button>
          <button
            onTouchStart={() => simulateKey('KeyJ', 'keydown')}
            onTouchEnd={() => simulateKey('KeyJ', 'keyup')}
            onMouseDown={() => simulateKey('KeyJ', 'keydown')}
            onMouseUp={() => simulateKey('KeyJ', 'keyup')}
            className="w-12 h-12 bg-[#0e111a]/80 border border-[#e63946] text-[#ff758f] active:bg-[#e63946]/30 rounded-full flex items-center justify-center text-xs font-bold font-mono"
          >
            ATK
          </button>
          <button
            onTouchStart={() => simulateKey('Space', 'keydown')}
            onTouchEnd={() => simulateKey('Space', 'keyup')}
            onMouseDown={() => simulateKey('Space', 'keydown')}
            onMouseUp={() => simulateKey('Space', 'keyup')}
            className="w-12 h-12 bg-[#0e111a]/80 border border-[#4ee1ec] text-white active:bg-[#4ee1ec]/30 rounded-full flex items-center justify-center text-xs font-bold font-mono"
          >
            JUMP
          </button>
        </div>
      </div>

      {/* Bottom Cluster: Non-intrusive Toast + Safe Watermark */}
      <div className="w-full flex flex-col items-center gap-1.5">
        {activeNotification && (
          <div className="max-w-lg bg-[#0e111a]/95 border border-[#4ee1ec]/60 text-slate-200 text-xs px-4 py-1.5 rounded shadow-2xl text-center pointer-events-auto">
            <p className="font-cinzel text-slate-100 tracking-wide font-medium text-[11px] md:text-xs">
              {activeNotification}
            </p>
          </div>
        )}

        <div className="w-full flex flex-col md:flex-row justify-between items-center text-[9px] md:text-[10px] text-slate-400 font-mono tracking-tight opacity-75 gap-1">
          <div>STAGE 1: THE ASHEN SPIRE</div>
          <div className="hidden sm:block">WASD/Arrows Move · Space Jump · J/Z Strike · K/X Dash · S+J Pogo · H Heal · M Mute</div>
        </div>
      </div>
    </div>
  );
};

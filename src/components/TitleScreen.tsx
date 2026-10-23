/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, Volume2, Sparkles } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between items-center p-8 select-none bg-radial from-[#121626]/80 via-[#0a0b12]/95 to-[#040508]">
      {/* Top Bar: Subdued Lore / Ambient Audio Note */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-slate-400 font-mono tracking-widest uppercase">
        <span className="flex items-center gap-1.5 text-[#4ee1ec]">
          <Sparkles size={13} /> A 2D Indie Action Odyssey
        </span>
        <span className="flex items-center gap-1.5 opacity-80">
          <Volume2 size={13} /> Procedural Atmospheric Audio
        </span>
      </div>

      {/* Centerpiece: Bespoke SVG Title Lockup & Primary CTA */}
      <div className="flex flex-col items-center max-w-2xl text-center my-auto">
        {/* Bespoke Crest & Title Lockup */}
        <div className="mb-6 relative flex flex-col items-center">
          {/* Ancient Runes Crest SVG */}
          <svg
            className="w-20 h-20 text-[#4ee1ec] mb-4 drop-shadow-[0_0_15px_rgba(78,225,236,0.6)] animate-pulse"
            viewBox="0 0 64 64"
            fill="none"
          >
            {/* Outer Diamond */}
            <path
              d="M32 4 L60 32 L32 60 L4 32 Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            {/* Inner Sacred Star */}
            <path
              d="M32 14 L50 32 L32 50 L14 32 Z"
              stroke="#7af7ff"
              strokeWidth="1.5"
              fill="none"
              opacity="0.7"
            />
            {/* Center Moon / Soul Gem */}
            <circle cx="32" cy="32" r="6" fill="#e2e8f0" />
            <circle cx="32" cy="32" r="3" fill="#0e111a" />
            {/* Horizon Rune Bar */}
            <line x1="8" y1="32" x2="56" y2="32" stroke="#d4af37" strokeWidth="2" />
          </svg>

          {/* Title Typography */}
          <h1 className="text-5xl md:text-6xl font-cinzel font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#7af7ff] drop-shadow-[0_4px_20px_rgba(78,225,236,0.3)]">
            UMBRA
          </h1>
          <p className="font-cinzel text-sm md:text-base font-semibold tracking-[0.4em] text-slate-300 mt-2 uppercase">
            The Ashen Pilgrim
          </p>
        </div>

        {/* Narrative Ambience Excerpt */}
        <p className="text-slate-400 text-xs md:text-sm max-w-md mb-8 leading-relaxed font-serif italic">
          &ldquo;When the moon fractured, the ancient spire fell into slumber.
          Awaken, silent pilgrim, and shatter the shade of the Forgotten Sentinel.&rdquo;
        </p>

        {/* Primary Start CTA */}
        <button
          data-start="true"
          onClick={() => {
            sound.resume();
            onStart();
          }}
          className="group relative px-8 py-3.5 bg-gradient-to-r from-[#172038] via-[#212f52] to-[#172038] hover:from-[#1d2948] hover:to-[#233560] border-2 border-[#4ee1ec] hover:border-[#7af7ff] rounded text-slate-100 font-cinzel font-bold tracking-[0.2em] uppercase text-sm shadow-[0_0_25px_rgba(78,225,236,0.25)] hover:shadow-[0_0_35px_rgba(78,225,236,0.5)] transition-all duration-200 cursor-pointer flex items-center gap-3"
        >
          <Play size={16} className="text-[#4ee1ec] fill-[#4ee1ec] group-hover:scale-110 transition-transform" />
          <span>Begin Pilgrimage</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal tracking-normal border border-slate-600 px-1.5 py-0.5 rounded ml-2">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Flat Control Hints in Bottom Safe Margin */}
      <div className="w-full max-w-4xl flex items-center justify-center text-xs text-slate-400 font-mono tracking-wide">
        <span className="opacity-80">
          WASD / Arrow Keys Move · Space Jump · J/Z Strike · K/X Dash · S+J Pogo · Esc Pause
        </span>
      </div>
    </div>
  );
};

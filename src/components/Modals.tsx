/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Award, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { RunSnapshot } from '../game/types';
import { calculateMasteryRank } from '../game/rules';

interface PausedModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PausedModal: React.FC<PausedModalProps> = ({
  onResume,
  onRestart,
  onTitle,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-[#040508]/80 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-[#0e111a] border-2 border-[#2d334a] rounded shadow-2xl p-6 text-center">
        <h2 className="text-2xl font-cinzel font-black tracking-widest text-slate-100 mb-1">
          PAUSED
        </h2>
        <div className="w-12 h-0.5 bg-[#4ee1ec] mx-auto mb-6" />

        <div className="flex flex-col gap-2.5 mb-6">
          <button
            onClick={onResume}
            className="w-full py-2.5 bg-[#172038] hover:bg-[#212f52] border border-[#4ee1ec] text-slate-100 font-cinzel font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Play size={14} className="text-[#4ee1ec]" /> Resume Pilgrimage
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-[#121526] hover:bg-[#1b1e38] border border-[#2d334a] hover:border-slate-400 text-slate-200 font-cinzel font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw size={14} /> Restart Stage [R]
          </button>
          <button
            onClick={onToggleMute}
            className="w-full py-2 bg-[#121526] hover:bg-[#1b1e38] border border-[#2d334a] text-slate-300 font-mono text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {isMuted ? 'Sound: Muted (Press M)' : 'Sound: Active (Press M)'}
          </button>
          <button
            onClick={onTitle}
            className="w-full py-2 bg-transparent hover:bg-[#121526] text-slate-400 hover:text-slate-200 font-cinzel text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home size={14} /> Main Menu
          </button>
        </div>

        {/* Controls Reference */}
        <div className="text-[11px] text-slate-400 font-mono text-left bg-[#07080d] p-3 rounded border border-[#1b1e2c]">
          <div className="text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">Controls</div>
          <div className="flex justify-between py-0.5"><span>Movement:</span> <span className="text-slate-200">WASD / Arrows</span></div>
          <div className="flex justify-between py-0.5"><span>Jump / Wall-Jump:</span> <span className="text-slate-200">Space / W</span></div>
          <div className="flex justify-between py-0.5"><span>Rapier Strike:</span> <span className="text-slate-200">J or Z</span></div>
          <div className="flex justify-between py-0.5"><span>Ethereal Dash:</span> <span className="text-slate-200">K, X or Shift</span></div>
          <div className="flex justify-between py-0.5"><span>Downward Pogo:</span> <span className="text-slate-200">Down + Strike</span></div>
          <div className="flex justify-between py-0.5"><span>Focus Heal:</span> <span className="text-slate-200">Hold H or E</span></div>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  snapshot: RunSnapshot;
  onPlayAgain: () => void;
  onTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  snapshot,
  onPlayAgain,
  onTitle,
}) => {
  const rank = calculateMasteryRank(
    snapshot.timeElapsed,
    snapshot.damageTaken,
    snapshot.souls
  );

  return (
    <div className="fixed inset-0 z-40 bg-[#040508]/85 flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#0e111a] border-2 border-[#d4af37] shadow-[0_0_35px_rgba(212,175,55,0.35)] rounded p-7 text-center">
        {/* Victory Crest */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#1e1e2d] border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37]">
          <Award size={30} />
        </div>

        <h2 className="text-3xl font-cinzel font-black tracking-widest text-[#ffd166] drop-shadow">
          THE CURSE SHATTERED
        </h2>
        <p className="font-cinzel text-xs font-semibold text-slate-300 tracking-[0.2em] mt-1 mb-6 uppercase">
          The Hollow Spire Has Awakened
        </p>

        {/* Rank & Title */}
        <div className="bg-[#121626] border border-[#2d334a] p-3 rounded mb-6 flex items-center justify-around">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Mastery Rank</span>
            <span className="text-3xl font-cinzel font-black text-[#4ee1ec]">{rank.rank}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Title Conferred</span>
            <span className="text-sm font-cinzel font-bold text-slate-200">{rank.title}</span>
          </div>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-[#07080d] p-2.5 rounded border border-[#1b1e2c]">
            <Clock size={14} className="mx-auto text-slate-400 mb-1" />
            <div className="text-[10px] text-slate-400 uppercase">Clear Time</div>
            <div className="text-sm font-mono-tabular font-bold text-slate-100">
              {Math.floor(snapshot.timeElapsed)}s
            </div>
          </div>
          <div className="bg-[#07080d] p-2.5 rounded border border-[#1b1e2c]">
            <Sparkles size={14} className="mx-auto text-[#4ee1ec] mb-1" />
            <div className="text-[10px] text-slate-400 uppercase">Souls Gathered</div>
            <div className="text-sm font-mono-tabular font-bold text-[#7af7ff]">
              {snapshot.souls}
            </div>
          </div>
          <div className="bg-[#07080d] p-2.5 rounded border border-[#1b1e2c]">
            <ShieldAlert size={14} className="mx-auto text-[#e63946] mb-1" />
            <div className="text-[10px] text-slate-400 uppercase">Hits Taken</div>
            <div className="text-sm font-mono-tabular font-bold text-slate-100">
              {snapshot.damageTaken}
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col gap-2">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-3 bg-[#172038] hover:bg-[#212f52] border border-[#4ee1ec] text-slate-100 font-cinzel font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            <RotateCcw size={14} className="text-[#4ee1ec]" /> Embark Anew
          </button>
          <button
            onClick={onTitle}
            className="w-full py-2 text-slate-400 hover:text-slate-200 font-cinzel text-xs tracking-widest uppercase rounded cursor-pointer transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  snapshot: RunSnapshot;
  onTryAgain: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  onTryAgain,
  onTitle,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-[#040508]/85 flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#0e111a] border-2 border-[#540b0e] shadow-[0_0_35px_rgba(230,57,70,0.3)] rounded p-7 text-center">
        <h2 className="text-3xl font-cinzel font-black tracking-widest text-[#e63946] drop-shadow">
          SOUL DISSOLVED
        </h2>
        <p className="font-cinzel text-xs font-semibold text-slate-400 tracking-[0.2em] mt-1 mb-6 uppercase">
          Your Essence Returns to the Weave
        </p>

        {/* Progress Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="bg-[#07080d] p-3 rounded border border-[#1b1e2c]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Souls Harvested</div>
            <div className="text-xl font-mono-tabular font-bold text-[#7af7ff] mt-0.5">
              {snapshot.souls}
            </div>
          </div>
          <div className="bg-[#07080d] p-3 rounded border border-[#1b1e2c]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Foes Vanquished</div>
            <div className="text-xl font-mono-tabular font-bold text-slate-100 mt-0.5">
              {snapshot.enemiesDefeated}
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col gap-2">
          <button
            data-start="true"
            onClick={onTryAgain}
            className="w-full py-3 bg-[#241216] hover:bg-[#381a20] border border-[#e63946] text-slate-100 font-cinzel font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            <RotateCcw size={14} className="text-[#e63946]" /> Rise Again
          </button>
          <button
            onClick={onTitle}
            className="w-full py-2 text-slate-400 hover:text-slate-200 font-cinzel text-xs tracking-widest uppercase rounded cursor-pointer transition-colors"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};

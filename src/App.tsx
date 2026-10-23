/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PausedModal, VictoryModal, GameOverModal } from './components/Modals';
import { GameEngine, EngineCallbacks } from './game/engine';
import { RunSnapshot, GameStatus } from './game/types';
import { sound } from './game/audio';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    hp: number;
    maxHp: number;
    essence: number;
    maxEssence: number;
    souls: number;
    bossHp?: { current: number; max: number; name: string };
    activeNotification?: string;
  }>({
    hp: 5,
    maxHp: 5,
    essence: 40,
    maxEssence: 100,
    souls: 0,
  });

  const [lastSnapshot, setLastSnapshot] = useState<RunSnapshot | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Sync state to body dataset
  useEffect(() => {
    document.body.dataset.state = status;
  }, [status]);

  // Handle Autostart query parameter (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const timer = setTimeout(() => {
        handleStartGame();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    sound.resume();
    setStatus('playing');
    if (engineRef.current) {
      engineRef.current.start();
    }
  }, []);

  const handleRestart = useCallback(() => {
    setStatus('playing');
    setLastSnapshot(null);
    if (engineRef.current) {
      engineRef.current.restart();
    }
  }, []);

  const handleResume = useCallback(() => {
    setStatus('playing');
    if (engineRef.current) {
      engineRef.current.togglePause(false);
    }
  }, []);

  const handlePause = useCallback(() => {
    if (status === 'playing') {
      setStatus('paused');
      if (engineRef.current) {
        engineRef.current.togglePause(true);
      }
    }
  }, [status]);

  const handleTitle = useCallback(() => {
    setStatus('title');
    setLastSnapshot(null);
    if (engineRef.current) {
      engineRef.current.restart();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Engine callbacks decoupled from heavy React renders
  const engineCallbacks: EngineCallbacks = useMemo(
    () => ({
      onStatsChange: (newStats) => {
        setStats(newStats);
      },
      onGameOver: (snapshot) => {
        setLastSnapshot(snapshot);
        setStatus('gameover');
      },
      onVictory: (snapshot) => {
        setLastSnapshot(snapshot);
        setStatus('gameover');
      },
      onPauseToggle: (isPaused) => {
        setStatus(isPaused ? 'paused' : 'playing');
      },
    }),
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080d] select-none">
      {/* 1. Underlying 60fps Game Simulation Canvas */}
      <GameCanvas
        callbacks={engineCallbacks}
        onEngineReady={(engine) => {
          engineRef.current = engine;
          // Check if autostart was requested
          const params = new URLSearchParams(window.location.search);
          if (params.get('autostart') === '1') {
            engine.start();
            setStatus('playing');
          }
        }}
      />

      {/* 2. Title Screen Shell */}
      {status === 'title' && <TitleScreen onStart={handleStartGame} />}

      {/* 3. In-Game Low-Occlusion HUD */}
      {(status === 'playing' || status === 'paused') && (
        <HUD
          hp={stats.hp}
          maxHp={stats.maxHp}
          essence={stats.essence}
          maxEssence={stats.maxEssence}
          souls={stats.souls}
          bossHp={stats.bossHp}
          activeNotification={stats.activeNotification}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleRestart}
        />
      )}

      {/* 4. Paused Modal */}
      {status === 'paused' && (
        <PausedModal
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 5. Victory or Game Over Modal */}
      {status === 'gameover' && lastSnapshot && (
        <>
          {lastSnapshot.victory ? (
            <VictoryModal
              snapshot={lastSnapshot}
              onPlayAgain={handleRestart}
              onTitle={handleTitle}
            />
          ) : (
            <GameOverModal
              snapshot={lastSnapshot}
              onTryAgain={handleRestart}
              onTitle={handleTitle}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { GameEngine, EngineCallbacks } from '../game/engine';

interface GameCanvasProps {
  onEngineReady: (engine: GameEngine) => void;
  callbacks: EngineCallbacks;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onEngineReady, callbacks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Set initial size
    canvas.width = container.clientWidth || window.innerWidth;
    canvas.height = container.clientHeight || window.innerHeight;

    // Initialize Game Engine
    const engine = new GameEngine(canvas, callbacks);
    engineRef.current = engine;
    onEngineReady(engine);

    // ResizeObserver for dynamic canvas sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width && entry.contentRect.height) {
          canvas.width = Math.floor(entry.contentRect.width);
          canvas.height = Math.floor(entry.contentRect.height);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.imageSmoothingEnabled = false;
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#07080d]"
    >
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="block w-full h-full"
      />
    </div>
  );
};

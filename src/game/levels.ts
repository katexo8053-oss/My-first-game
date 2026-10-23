/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Checkpoint, Enemy, Pickup, Rect } from './types';

export interface LevelData {
  name: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  solids: Rect[];
  spikes: Rect[];
  lanterns: Array<{ x: number; y: number; id: number }>;
  checkpoints: Checkpoint[];
  enemies: Enemy[];
  pickups: Pickup[];
  urns: Array<{ id: number; x: number; y: number; broken: boolean }>;
  loreStones: Array<{ x: number; y: number; text: string }>;
}

export function createWorld(): LevelData {
  const solids: Rect[] = [];
  const spikes: Rect[] = [];

  // Ground and primary foundation
  // Stage 1: Intro Ruins (x: 0 to 1200)
  solids.push({ x: 0, y: 500, w: 550, h: 80 }); // start floor
  solids.push({ x: -40, y: 0, w: 40, h: 600 }); // left boundary wall

  // Stepping platforms & ledges
  solids.push({ x: 180, y: 400, w: 100, h: 20 });
  solids.push({ x: 320, y: 320, w: 120, h: 20 });
  solids.push({ x: 480, y: 260, w: 140, h: 20 });

  // Pit with spikes between x: 550 and 720
  spikes.push({ x: 550, y: 550, w: 170, h: 20 });

  // Right side of pit
  solids.push({ x: 720, y: 500, w: 500, h: 80 });
  solids.push({ x: 800, y: 420, w: 90, h: 20 });
  solids.push({ x: 960, y: 340, w: 110, h: 20 });

  // Wall-jump shaft to Stage 2 (x: 1200 to 1350, y: 100 to 500)
  solids.push({ x: 1220, y: 150, w: 30, h: 350 }); // left wall of shaft
  solids.push({ x: 1340, y: 80, w: 30, h: 420 }); // right wall of shaft
  solids.push({ x: 1250, y: 500, w: 90, h: 40 }); // shaft bottom

  // Stage 2: The Sunken Reliquary (x: 1370 to 2200, y: 80 to 300)
  solids.push({ x: 1370, y: 220, w: 320, h: 40 });
  solids.push({ x: 1750, y: 280, w: 260, h: 40 });
  solids.push({ x: 1500, y: 120, w: 160, h: 20 }); // upper secret alcove

  // Transition arch to Boss Arena (x: 2050 to 2200)
  solids.push({ x: 2010, y: 160, w: 120, h: 30 });

  // Stage 3: The Spire Summit (Boss Arena, x: 2200 to 3300, y: 400)
  solids.push({ x: 2200, y: 440, w: 1100, h: 80 }); // main boss floor
  solids.push({ x: 2200, y: 100, w: 30, h: 340 }); // arena left pillar
  solids.push({ x: 3300, y: 100, w: 30, h: 340 }); // arena right pillar
  solids.push({ x: 2450, y: 320, w: 120, h: 20 }); // left high perch
  solids.push({ x: 2950, y: 320, w: 120, h: 20 }); // right high perch

  // Hanging lanterns (pogo-able bounce targets!)
  const lanterns = [
    { id: 1, x: 240, y: 260 },
    { id: 2, x: 635, y: 380 }, // over spike chasm! Allows pogo bounce crossing!
    { id: 3, x: 880, y: 280 },
    { id: 4, x: 1580, y: 80 },
    { id: 5, x: 2700, y: 240 }, // arena centerpiece lantern
  ];

  // Checkpoints (Ancient Shrines)
  const checkpoints: Checkpoint[] = [
    {
      id: 1,
      x: 120,
      y: 452,
      w: 32,
      h: 48,
      name: 'Shrine of the Desolate Weave',
      activated: true,
    },
    {
      id: 2,
      x: 1420,
      y: 172,
      w: 32,
      h: 48,
      name: 'Sanctuary of the Reliquary',
      activated: false,
    },
    {
      id: 3,
      x: 2260,
      y: 392,
      w: 32,
      h: 48,
      name: 'Threshold of the Spire',
      activated: false,
    },
  ];

  // Distinct enemies with crafted policies
  const enemies: Enemy[] = [
    // Stalkers (crawlers that crouch-telegraph and pounce)
    {
      id: 101,
      type: 'stalker',
      x: 420,
      y: 476,
      vx: 0,
      vy: 0,
      w: 28,
      h: 24,
      facing: -1,
      hp: 3,
      maxHp: 3,
      grounded: true,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.45,
      attackCooldown: 0,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
    },
    {
      id: 102,
      type: 'stalker',
      x: 880,
      y: 476,
      vx: 0,
      vy: 0,
      w: 28,
      h: 24,
      facing: -1,
      hp: 3,
      maxHp: 3,
      grounded: true,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.45,
      attackCooldown: 0,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
    },
    // Hollow Wraiths (kiting ranged specters)
    {
      id: 201,
      type: 'wraith',
      x: 630,
      y: 220,
      vx: 0,
      vy: 0,
      w: 24,
      h: 36,
      facing: -1,
      hp: 2,
      maxHp: 2,
      grounded: false,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.65,
      attackCooldown: 1.2,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
    },
    {
      id: 202,
      type: 'wraith',
      x: 1850,
      y: 190,
      vx: 0,
      vy: 0,
      w: 24,
      h: 36,
      facing: -1,
      hp: 2,
      maxHp: 2,
      grounded: false,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.65,
      attackCooldown: 1.0,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
    },
    // Grave Warden (Heavy armored brute guarding Stage 2)
    {
      id: 301,
      type: 'warden',
      x: 1880,
      y: 230,
      vx: 0,
      vy: 0,
      w: 42,
      h: 50,
      facing: -1,
      hp: 7,
      maxHp: 7,
      grounded: true,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.75,
      attackCooldown: 0,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
    },
    // Boss: The Forgotten Sentinel
    {
      id: 999,
      type: 'boss',
      x: 2850,
      y: 380,
      vx: 0,
      vy: 0,
      w: 52,
      h: 60,
      facing: -1,
      hp: 18,
      maxHp: 18,
      grounded: true,
      state: 'idle',
      stateTimer: 0,
      telegraphDuration: 0.7,
      attackCooldown: 1.5,
      isHitFlashing: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      aggro: false,
      bossPhase: 1,
    },
  ];

  // Pickups
  const pickups: Pickup[] = [
    { id: 1, x: 220, y: 370, type: 'soul', value: 25, vy: 0, floatOffset: 0, collected: false },
    { id: 2, x: 380, y: 290, type: 'soul', value: 25, vy: 0, floatOffset: 1, collected: false },
    { id: 3, x: 520, y: 230, type: 'soul', value: 50, vy: 0, floatOffset: 2, collected: false },
    { id: 4, x: 1540, y: 90, type: 'relic', value: 100, vy: 0, floatOffset: 3, collected: false }, // secret relic heart
    { id: 5, x: 1020, y: 310, type: 'soul', value: 50, vy: 0, floatOffset: 4, collected: false },
  ];

  // Breakable Urns
  const urns = [
    { id: 1, x: 290, y: 480, broken: false },
    { id: 2, x: 750, y: 480, broken: false },
    { id: 3, x: 1050, y: 480, broken: false },
    { id: 4, x: 1620, y: 200, broken: false },
    { id: 5, x: 2320, y: 420, broken: false },
  ];

  // Lore Inscriptions
  const loreStones = [
    {
      x: 60,
      y: 470,
      text: 'Press WASD / Arrows to Move · Space to Jump · J/Z to Strike · K/X to Dash',
    },
    {
      x: 520,
      y: 470,
      text: 'Hold DOWN + Strike in mid-air to Pogo bounce on lanterns & foes.',
    },
    {
      x: 1390,
      y: 190,
      text: 'Hold [H] or [E] to focus Soul Essence into Vitality.',
    },
    {
      x: 2280,
      y: 410,
      text: 'Beyond this gateway awaits the Forgotten Sentinel of the Hollow Spire.',
    },
  ];

  return {
    name: 'The Ashen Citadel',
    width: 3400,
    height: 700,
    playerSpawn: { x: 70, y: 440 },
    solids,
    spikes,
    lanterns,
    checkpoints,
    enemies,
    pickups,
    urns,
    loreStones,
  };
}

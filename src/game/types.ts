/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export type EnemyType = 'stalker' | 'wraith' | 'warden' | 'boss';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  essence: number;
  maxEssence: number;
  souls: number;
  attackPower: number;
  isInvulnerable: boolean;
  invulnerableTimer: number;
}

export interface PlayerState extends PlayerStats {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  onWall: -1 | 0 | 1; // -1 left wall, 1 right wall, 0 none
  coyoteTimer: number;
  jumpBufferTimer: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  hasAirDash: boolean;
  isAttacking: boolean;
  attackTimer: number;
  attackCombo: number; // 0, 1, 2
  attackCooldown: number;
  attackType: 'slash' | 'down';
  squashX: number;
  squashY: number;
  isDead: boolean;
  deathTimer: number;
  healing: boolean;
  healChannelTimer: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  grounded: boolean;
  state: 'idle' | 'patrol' | 'chase' | 'telegraph' | 'attack' | 'cooldown' | 'hurt' | 'dead';
  stateTimer: number;
  telegraphDuration: number;
  attackCooldown: number;
  isHitFlashing: boolean;
  hitFlashTimer: number;
  knockbackVx: number;
  knockbackVy: number;
  aggro: boolean;
  bossPhase?: number;
  specialTimer?: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isHostile: boolean;
  damage: number;
  lifespan: number;
  trailTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  shape?: 'pixel' | 'spark' | 'smoke' | 'shard';
}

export interface GhostTrail {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
  decay: number;
  squashX: number;
  squashY: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  type: 'soul' | 'essence' | 'heart' | 'relic';
  value: number;
  vy: number;
  floatOffset: number;
  collected: boolean;
}

export interface Checkpoint {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  activated: boolean;
}

export interface RunSnapshot {
  victory: boolean;
  timeElapsed: number;
  souls: number;
  damageTaken: number;
  enemiesDefeated: number;
  bossHpRemainingPercent: number;
  stageName: string;
}

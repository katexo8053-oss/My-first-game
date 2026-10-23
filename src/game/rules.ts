/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Enemy, EnemyType, PlayerState, Rect } from './types';

export const CONSTANTS = {
  GRAVITY: 980,
  MAX_FALL_SPEED: 700,
  MOVE_SPEED: 260,
  MOVE_ACCEL: 1800,
  MOVE_DECEL: 1600,
  JUMP_VELOCITY: -420,
  VARIABLE_JUMP_CUT: 0.45,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER_TIME: 0.12,
  DASH_SPEED: 650,
  DASH_DURATION: 0.18,
  DASH_COOLDOWN: 0.45,
  WALL_SLIDE_SPEED: 120,
  WALL_JUMP_VX: 320,
  WALL_JUMP_VY: -390,
  ATTACK_DURATION: 0.22,
  ATTACK_COOLDOWN: 0.15,
  POGO_BOUNCE_VY: -440,
  INVULNERABILITY_DURATION: 1.2,
  HITSTOP_HEAVY_DURATION: 0.06,
  HITSTOP_LIGHT_DURATION: 0.03,
};

/**
 * Axis-Aligned Bounding Box intersection check
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Resolves player AABB movement against solid tiles
 */
export function resolveMapCollision(
  rect: Rect,
  vx: number,
  vy: number,
  dt: number,
  solidTiles: Rect[]
): { x: number; y: number; vx: number; vy: number; grounded: boolean; onWall: -1 | 0 | 1 } {
  let newX = rect.x + vx * dt;
  let newY = rect.y + vy * dt;
  let grounded = false;
  let onWall: -1 | 0 | 1 = 0;

  // Resolve X-axis collision first
  const horizontalBox: Rect = { x: newX, y: rect.y, w: rect.w, h: rect.h };
  for (const tile of solidTiles) {
    if (rectsIntersect(horizontalBox, tile)) {
      if (vx > 0) {
        newX = tile.x - rect.w;
        onWall = 1;
      } else if (vx < 0) {
        newX = tile.x + tile.w;
        onWall = -1;
      }
      vx = 0;
      horizontalBox.x = newX;
    }
  }

  // Resolve Y-axis collision next
  const verticalBox: Rect = { x: newX, y: newY, w: rect.w, h: rect.h };
  for (const tile of solidTiles) {
    if (rectsIntersect(verticalBox, tile)) {
      if (vy > 0) {
        newY = tile.y - rect.h;
        grounded = true;
      } else if (vy < 0) {
        newY = tile.y + tile.h;
      }
      vy = 0;
      verticalBox.y = newY;
    }
  }

  return { x: newX, y: newY, vx, vy, grounded, onWall };
}

/**
 * Applies horizontal input acceleration/deceleration
 */
export function applyHorizontalMovement(
  currentVx: number,
  moveInput: number, // -1, 0, or 1
  isGrounded: boolean,
  dt: number
): number {
  const targetVx = moveInput * CONSTANTS.MOVE_SPEED;
  const rate = moveInput !== 0 ? CONSTANTS.MOVE_ACCEL : CONSTANTS.MOVE_DECEL;
  const factor = isGrounded ? 1.0 : 0.75; // slightly lower control in air
  
  if (currentVx < targetVx) {
    return Math.min(targetVx, currentVx + rate * factor * dt);
  } else if (currentVx > targetVx) {
    return Math.max(targetVx, currentVx - rate * factor * dt);
  }
  return currentVx;
}

/**
 * Applies jump with coyote time and jump buffer support
 */
export function evaluateJumpIntent(
  grounded: boolean,
  coyoteTimer: number,
  jumpBufferTimer: number
): { canJump: boolean; resetCoyote: boolean; resetBuffer: boolean } {
  if (jumpBufferTimer > 0 && (grounded || coyoteTimer > 0)) {
    return { canJump: true, resetCoyote: true, resetBuffer: true };
  }
  return { canJump: false, resetCoyote: false, resetBuffer: false };
}

/**
 * Calculates attack hitbox in front of or below the player
 */
export function getAttackHitbox(player: {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  attackType: 'slash' | 'down';
}): Rect {
  if (player.attackType === 'down') {
    return {
      x: player.x - 8,
      y: player.y + player.h - 4,
      w: player.w + 16,
      h: 28,
    };
  }

  // Forward slash
  return {
    x: player.facing === 1 ? player.x + player.w - 4 : player.x - 36,
    y: player.y - 4,
    w: 40,
    h: player.h + 8,
  };
}

/**
 * Applies damage to player, accounting for invulnerability frames
 */
export function applyDamageToPlayer(
  player: PlayerState,
  damage: number,
  attackerX: number
): { damaged: boolean; knockbackVx: number; knockbackVy: number } {
  if (player.isInvulnerable || player.isDead || player.isDashing) {
    return { damaged: false, knockbackVx: 0, knockbackVy: 0 };
  }

  const direction = player.x < attackerX ? -1 : 1;
  player.hp = Math.max(0, player.hp - damage);
  player.isInvulnerable = true;
  player.invulnerableTimer = CONSTANTS.INVULNERABILITY_DURATION;

  if (player.hp <= 0) {
    player.isDead = true;
    player.deathTimer = 1.0;
  }

  return {
    damaged: true,
    knockbackVx: direction * 280,
    knockbackVy: -220,
  };
}

/**
 * Converts HP into discrete pip states for HUD rendering
 */
export function calculateHealthPips(
  currentHp: number,
  maxHp: number
): Array<'full' | 'damaged' | 'empty'> {
  const pips: Array<'full' | 'damaged' | 'empty'> = [];
  const count = Math.ceil(maxHp);
  for (let i = 0; i < count; i++) {
    if (currentHp >= i + 1) {
      pips.push('full');
    } else if (currentHp > i && currentHp < i + 1) {
      pips.push('damaged');
    } else {
      pips.push('empty');
    }
  }
  return pips;
}

/**
 * Evaluates distinct enemy AI behavior policy
 */
export function updateEnemyBehavior(
  enemy: Enemy,
  player: { x: number; y: number; isDead: boolean },
  dt: number
): {
  action: 'none' | 'telegraph' | 'attack' | 'shoot';
  projectile?: { vx: number; vy: number };
} {
  if (enemy.state === 'dead' || player.isDead) {
    return { action: 'none' };
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  // Update facing towards movement or player
  if (Math.abs(dx) > 10) {
    enemy.facing = dx > 0 ? 1 : -1;
  }

  // Handle hit flash countdown
  if (enemy.isHitFlashing) {
    enemy.hitFlashTimer -= dt;
    if (enemy.hitFlashTimer <= 0) {
      enemy.isHitFlashing = false;
    }
  }

  // Handle state timer
  if (enemy.stateTimer > 0) {
    enemy.stateTimer -= dt;
  }

  // State machine per enemy archetype
  switch (enemy.type) {
    case 'stalker': {
      // Swarmer / Crawler: patrols ground, detects player, telegraphs pounce, leaps fast
      if (enemy.state === 'idle' || enemy.state === 'patrol') {
        if (dist < 260) {
          enemy.state = 'telegraph';
          enemy.stateTimer = 0.45; // 0.45s visible crouch telegraph
          enemy.vx = 0;
          return { action: 'telegraph' };
        } else {
          // Slow patrol
          enemy.vx = enemy.facing * 40;
        }
      } else if (enemy.state === 'telegraph') {
        enemy.vx = 0;
        if (enemy.stateTimer <= 0) {
          // Leap toward player!
          enemy.state = 'attack';
          enemy.stateTimer = 0.5;
          enemy.vx = enemy.facing * 340;
          enemy.vy = -200;
          return { action: 'attack' };
        }
      } else if (enemy.state === 'attack') {
        if (enemy.grounded || enemy.stateTimer <= 0) {
          enemy.state = 'cooldown';
          enemy.stateTimer = 0.6;
        }
      } else if (enemy.state === 'cooldown') {
        enemy.vx *= 0.85;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'patrol';
        }
      }
      break;
    }

    case 'wraith': {
      // Kiter / Ranged: floats, maintains distance, charges ranged void sphere
      if (enemy.state === 'idle' || enemy.state === 'patrol') {
        if (dist < 320) {
          enemy.state = 'chase';
        }
      } else if (enemy.state === 'chase') {
        // Ideal standoff distance is ~160-220px
        if (dist < 140) {
          // Back away!
          enemy.vx = -enemy.facing * 90;
        } else if (dist > 220) {
          // Move closer
          enemy.vx = enemy.facing * 80;
        } else {
          enemy.vx = 0;
        }

        // Float bobbing on Y
        enemy.vy = Math.sin(Date.now() * 0.003 + enemy.id) * 35;

        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0 && dist < 280) {
          enemy.state = 'telegraph';
          enemy.stateTimer = 0.65; // 0.65s glowing aim telegraph
          return { action: 'telegraph' };
        }
      } else if (enemy.state === 'telegraph') {
        enemy.vx *= 0.5;
        enemy.vy *= 0.5;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          enemy.stateTimer = 0.2;
          enemy.attackCooldown = 1.8;
          // Calculate aim vector
          const speed = 240;
          const projVx = (dx / dist) * speed;
          const projVy = (dy / dist) * speed;
          return { action: 'shoot', projectile: { vx: projVx, vy: projVy } };
        }
      } else if (enemy.state === 'attack') {
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      }
      break;
    }

    case 'warden': {
      // Heavy Armored Brute: Slow advance, blocks front unless winding up/recovering, heavy ground slam
      if (enemy.state === 'idle' || enemy.state === 'patrol') {
        if (dist < 240) {
          enemy.state = 'chase';
        } else {
          enemy.vx = enemy.facing * 35;
        }
      } else if (enemy.state === 'chase') {
        enemy.vx = enemy.facing * 75;
        if (dist < 90) {
          enemy.state = 'telegraph';
          enemy.stateTimer = 0.75; // heavy hammer raise telegraph
          enemy.vx = 0;
          return { action: 'telegraph' };
        }
      } else if (enemy.state === 'telegraph') {
        enemy.vx = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          enemy.stateTimer = 0.4;
          return { action: 'attack' }; // triggers ground shockwave!
        }
      } else if (enemy.state === 'attack') {
        if (enemy.stateTimer <= 0) {
          enemy.state = 'cooldown';
          enemy.stateTimer = 1.2; // heavy recovery window
        }
      } else if (enemy.state === 'cooldown') {
        enemy.vx = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      }
      break;
    }

    case 'boss': {
      // The Forgotten Sentinel: Multi-phase boss
      enemy.attackCooldown -= dt;
      if (enemy.state === 'idle' || enemy.state === 'chase') {
        // Phase 1 (HP > 50%): Teleport slash and shockwaves
        // Phase 2 (HP <= 50%): Faster, void storm barrage
        enemy.bossPhase = enemy.hp <= enemy.maxHp * 0.5 ? 2 : 1;
        
        if (enemy.attackCooldown <= 0) {
          enemy.state = 'telegraph';
          enemy.stateTimer = enemy.bossPhase === 2 ? 0.45 : 0.7;
          return { action: 'telegraph' };
        } else {
          // Hover/stride towards player
          enemy.vx = enemy.facing * (enemy.bossPhase === 2 ? 110 : 80);
        }
      } else if (enemy.state === 'telegraph') {
        enemy.vx = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          enemy.stateTimer = 0.35;
          enemy.attackCooldown = enemy.bossPhase === 2 ? 1.4 : 2.2;
          return { action: 'attack' };
        }
      } else if (enemy.state === 'attack') {
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      }
      break;
    }
  }

  return { action: 'none' };
}

/**
 * Calculates run mastery rank based on clear time and damage taken
 */
export function calculateMasteryRank(
  clearTimeSeconds: number,
  damageTaken: number,
  soulsCollected: number
): { rank: 'S' | 'A' | 'B' | 'C'; title: string } {
  let score = 1000;
  // Penalty for time
  score -= Math.max(0, clearTimeSeconds - 60) * 4;
  // Penalty for damage
  score -= damageTaken * 80;
  // Bonus for souls
  score += soulsCollected * 20;

  if (score >= 950 && damageTaken <= 1) {
    return { rank: 'S', title: 'Soul Ascendant' };
  } else if (score >= 750) {
    return { rank: 'A', title: 'Hollow Victor' };
  } else if (score >= 500) {
    return { rank: 'B', title: 'Ashen Survivor' };
  }
  return { rank: 'C', title: 'Fallen Pilgrim' };
}

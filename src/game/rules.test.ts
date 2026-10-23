/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rectsIntersect,
  resolveMapCollision,
  applyHorizontalMovement,
  evaluateJumpIntent,
  getAttackHitbox,
  applyDamageToPlayer,
  calculateHealthPips,
  updateEnemyBehavior,
  calculateMasteryRank,
  CONSTANTS,
} from './rules';
import { Enemy, PlayerState, Rect } from './types';

test('rectsIntersect correctly detects overlaps and non-overlaps', () => {
  const boxA: Rect = { x: 0, y: 0, w: 20, h: 20 };
  const boxB: Rect = { x: 10, y: 10, w: 20, h: 20 };
  const boxC: Rect = { x: 50, y: 50, w: 20, h: 20 };

  assert.equal(rectsIntersect(boxA, boxB), true);
  assert.equal(rectsIntersect(boxA, boxC), false);
});

test('resolveMapCollision clamps player onto solid ground', () => {
  const playerBox: Rect = { x: 100, y: 90, w: 24, h: 36 };
  const solidFloor: Rect = { x: 0, y: 100, w: 300, h: 40 };

  // Moving downwards with positive vy
  const result = resolveMapCollision(playerBox, 0, 300, 0.05, [solidFloor]);

  assert.equal(result.grounded, true);
  assert.equal(result.vy, 0);
  assert.equal(result.y, solidFloor.y - playerBox.h); // Exactly on top of floor
});

test('resolveMapCollision detects walls on left or right', () => {
  const playerBox: Rect = { x: 10, y: 50, w: 20, h: 30 };
  const leftWall: Rect = { x: 0, y: 0, w: 15, h: 100 };

  // Moving left into wall
  const result = resolveMapCollision(playerBox, -100, 0, 0.1, [leftWall]);
  assert.equal(result.onWall, -1);
  assert.equal(result.vx, 0);
  assert.equal(result.x, leftWall.x + leftWall.w);
});

test('applyHorizontalMovement respects acceleration and deceleration', () => {
  // Accelerating from 0 to right
  const vx1 = applyHorizontalMovement(0, 1, true, 0.05);
  assert.ok(vx1 > 0);
  assert.ok(vx1 <= CONSTANTS.MOVE_SPEED);

  // Decelerating from 200 with no input (moveInput = 0)
  const vx2 = applyHorizontalMovement(200, 0, true, 0.05);
  assert.ok(vx2 < 200);
  assert.ok(vx2 >= 0);
});

test('evaluateJumpIntent works with coyote time and jump buffer', () => {
  // Case 1: Fresh press while grounded
  const res1 = evaluateJumpIntent(true, 0, 0.1);
  assert.equal(res1.canJump, true);

  // Case 2: In air, but coyote time still active
  const res2 = evaluateJumpIntent(false, 0.08, 0.1);
  assert.equal(res2.canJump, true);

  // Case 3: In air, coyote time expired
  const res3 = evaluateJumpIntent(false, 0, 0.1);
  assert.equal(res3.canJump, false);

  // Case 4: Grounded, but no jump button pressed (buffer = 0)
  const res4 = evaluateJumpIntent(true, 0, 0);
  assert.equal(res4.canJump, false);
});

test('getAttackHitbox places slash hitbox in direction of facing and pogo below', () => {
  // Facing right
  const rightHitbox = getAttackHitbox({
    x: 100,
    y: 100,
    w: 24,
    h: 36,
    facing: 1,
    attackType: 'slash',
  });
  assert.ok(rightHitbox.x >= 100 + 24 - 4);

  // Facing left
  const leftHitbox = getAttackHitbox({
    x: 100,
    y: 100,
    w: 24,
    h: 36,
    facing: -1,
    attackType: 'slash',
  });
  assert.ok(leftHitbox.x < 100);

  // Pogo down
  const downHitbox = getAttackHitbox({
    x: 100,
    y: 100,
    w: 24,
    h: 36,
    facing: 1,
    attackType: 'down',
  });
  assert.ok(downHitbox.y >= 100 + 36 - 4);
});

test('applyDamageToPlayer enforces invulnerability and calculates knockback', () => {
  const dummyPlayer: PlayerState = {
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    w: 24,
    h: 36,
    facing: 1,
    grounded: true,
    onWall: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    hasAirDash: true,
    isAttacking: false,
    attackTimer: 0,
    attackCombo: 0,
    attackCooldown: 0,
    attackType: 'slash',
    squashX: 1,
    squashY: 1,
    isDead: false,
    deathTimer: 0,
    healing: false,
    healChannelTimer: 0,
    maxHp: 5,
    hp: 5,
    essence: 50,
    maxEssence: 100,
    souls: 0,
    attackPower: 1,
    isInvulnerable: false,
    invulnerableTimer: 0,
  };

  const outcome = applyDamageToPlayer(dummyPlayer, 1, 150);
  assert.equal(outcome.damaged, true);
  assert.equal(dummyPlayer.hp, 4);
  assert.equal(dummyPlayer.isInvulnerable, true);
  assert.ok(outcome.knockbackVx < 0); // Attacker was to the right (x=150), so knockback pushes left

  // Subsequent hit during i-frames should be ignored
  const secondOutcome = applyDamageToPlayer(dummyPlayer, 1, 150);
  assert.equal(secondOutcome.damaged, false);
  assert.equal(dummyPlayer.hp, 4);
});

test('calculateHealthPips maps HP to full, damaged, and empty sockets', () => {
  const pipsFull = calculateHealthPips(5, 5);
  assert.deepEqual(pipsFull, ['full', 'full', 'full', 'full', 'full']);

  const pipsDamaged = calculateHealthPips(3.5, 5);
  assert.deepEqual(pipsDamaged, ['full', 'full', 'full', 'damaged', 'empty']);

  const pipsEmpty = calculateHealthPips(0, 5);
  assert.deepEqual(pipsEmpty, ['empty', 'empty', 'empty', 'empty', 'empty']);
});

test('updateEnemyBehavior runs distinctive policies with telegraphs', () => {
  // Stalker telegraphs when player is close
  const stalker: Enemy = {
    id: 1,
    type: 'stalker',
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    w: 28,
    h: 24,
    facing: 1,
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
  };

  const behavior = updateEnemyBehavior(stalker, { x: 180, y: 100, isDead: false }, 0.05);
  assert.equal(behavior.action, 'telegraph');
  assert.equal(stalker.state, 'telegraph');
});

test('calculateMasteryRank awards S rank for fast flawless clear', () => {
  const rankS = calculateMasteryRank(45, 0, 10);
  assert.equal(rankS.rank, 'S');

  const rankC = calculateMasteryRank(180, 8, 2);
  assert.equal(rankC.rank, 'C');
});

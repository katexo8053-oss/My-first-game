/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sound } from './audio';
import { createWorld, LevelData } from './levels';
import {
  applyDamageToPlayer,
  applyHorizontalMovement,
  CONSTANTS,
  evaluateJumpIntent,
  getAttackHitbox,
  rectsIntersect,
  resolveMapCollision,
  updateEnemyBehavior,
} from './rules';
import { sprites } from './sprites';
import {
  Enemy,
  GhostTrail,
  Particle,
  Pickup,
  PlayerState,
  Projectile,
  Rect,
  RunSnapshot,
} from './types';

export interface EngineCallbacks {
  onStatsChange: (stats: {
    hp: number;
    maxHp: number;
    essence: number;
    maxEssence: number;
    souls: number;
    bossHp?: { current: number; max: number; name: string };
    activeNotification?: string;
  }) => void;
  onGameOver: (snapshot: RunSnapshot) => void;
  onVictory: (snapshot: RunSnapshot) => void;
  onPauseToggle: (isPaused: boolean) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  // Running loop state
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private timeElapsed: number = 0;
  private damageTakenCount: number = 0;
  private enemiesDefeatedCount: number = 0;

  // Camera & screen shake
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraShakeTrauma: number = 0; // 0 to 1
  private hitstopTimer: number = 0;

  // World data
  private world: LevelData;
  private player: PlayerState;
  private projectiles: Projectile[] = [];
  private ghostTrails: GhostTrail[] = [];
  private activeNotification: string | null = null;
  private notificationTimer: number = 0;

  // Pre-allocated Zero-GC Particle Pool (Capacity: 300)
  private readonly MAX_PARTICLES = 300;
  private particles: Particle[] = [];
  private particleIndex: number = 0;

  // Input state
  private keysHeld: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.callbacks = callbacks;

    // Initialize particle pool
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#ffffff',
        life: 0,
        maxLife: 1,
        alpha: 0,
      });
    }

    // Initialize world and player
    this.world = createWorld();
    this.player = this.createDefaultPlayer(this.world.playerSpawn.x, this.world.playerSpawn.y);

    this.bindInputs();
    sprites.init();
  }

  private createDefaultPlayer(x: number, y: number): PlayerState {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      w: 20,
      h: 34,
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
      essence: 40,
      maxEssence: 100,
      souls: 0,
      attackPower: 1,
      isInvulnerable: false,
      invulnerableTimer: 0,
    };
  }

  private bindInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private unbindInputs() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Audio context resume on first interaction
    sound.resume();

    // Toggle mute with 'M'
    if (e.code === 'KeyM') {
      sound.toggleMute();
      return;
    }

    // Pause toggle
    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.togglePause();
      return;
    }

    if (!this.keysHeld.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysHeld.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
    this.keysJustPressed.clear();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
    }
  };

  public togglePause(force?: boolean) {
    if (this.player.isDead) return;
    this.isPaused = force !== undefined ? force : !this.isPaused;
    document.body.dataset.state = this.isPaused ? 'paused' : 'playing';
    this.callbacks.onPauseToggle(this.isPaused);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    document.body.dataset.state = 'playing';
    sound.startSoundtrack();
    this.loop(this.lastTime);
  }

  public restart() {
    this.world = createWorld();
    this.player = this.createDefaultPlayer(this.world.playerSpawn.x, this.world.playerSpawn.y);
    this.projectiles = [];
    this.ghostTrails = [];
    this.timeElapsed = 0;
    this.damageTakenCount = 0;
    this.enemiesDefeatedCount = 0;
    this.hitstopTimer = 0;
    this.cameraShakeTrauma = 0;
    this.isPaused = false;
    document.body.dataset.state = 'playing';
    this.broadcastStats();
    if (!this.isRunning) {
      this.start();
    }
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindInputs();
    sound.stopAll();
  }

  // -----------------------------------------------------------------
  // Particle Spawn Helpers
  // -----------------------------------------------------------------
  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    life: number,
    shape: 'pixel' | 'spark' | 'smoke' | 'shard' = 'pixel'
  ) {
    const p = this.particles[this.particleIndex];
    this.particleIndex = (this.particleIndex + 1) % this.MAX_PARTICLES;

    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.color = color;
    p.size = size;
    p.life = life;
    p.maxLife = life;
    p.alpha = 1;
    p.shape = shape;
  }

  private burstParticles(
    x: number,
    y: number,
    count: number,
    colors: string[],
    speed = 120,
    shape: 'pixel' | 'spark' | 'smoke' | 'shard' = 'pixel'
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 1 + Math.floor(Math.random() * 3);
      const life = 0.25 + Math.random() * 0.4;
      this.spawnParticle(x, y, vx, vy, color, size, life, shape);
    }
  }

  private addTrauma(amount: number) {
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + amount);
  }

  // -----------------------------------------------------------------
  // Main Game Loop
  // -----------------------------------------------------------------
  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamped frame delta (Math.min(rawDt, 0.05))
    const dt = Math.min(rawDt, 0.05);

    if (!this.isPaused) {
      this.timeElapsed += dt;

      // Handle Sim-level Hitstop
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
        // Entity physics are frozen during hitstop, but particles/camera shake tick
        this.updateVisualEffects(dt);
      } else {
        this.update(dt);
        this.updateVisualEffects(dt);
      }
    }

    this.render();

    // Clear edge-triggered keys after each loop iteration
    this.keysJustPressed.clear();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // -----------------------------------------------------------------
  // Physics & Entity Updates
  // -----------------------------------------------------------------
  private update(dt: number) {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateCamera(dt);
    this.checkInteractions();
    this.broadcastStats();
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    if (p.isDead) {
      p.deathTimer -= dt;
      if (p.deathTimer <= 0) {
        // Trigger game over modal
        this.callbacks.onGameOver({
          victory: false,
          timeElapsed: this.timeElapsed,
          souls: p.souls,
          damageTaken: this.damageTakenCount,
          enemiesDefeated: this.enemiesDefeatedCount,
          bossHpRemainingPercent: 100,
          stageName: this.world.name,
        });
        document.body.dataset.state = 'gameover';
      }
      return;
    }

    // Invulnerability decay
    if (p.isInvulnerable) {
      p.invulnerableTimer -= dt;
      if (p.invulnerableTimer <= 0) {
        p.isInvulnerable = false;
      }
    }

    // Coyote & jump buffer countdowns
    if (p.coyoteTimer > 0) p.coyoteTimer -= dt;
    if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;

    // Squash & stretch recovery
    p.squashX += (1.0 - p.squashX) * 12 * dt;
    p.squashY += (1.0 - p.squashY) * 12 * dt;

    // Movement inputs (WASD or Arrow Keys)
    let moveInput = 0;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveInput -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveInput += 1;

    const downHeld = this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown');
    const jumpJustPressed = this.keysJustPressed.has('Space') || this.keysJustPressed.has('KeyW') || this.keysJustPressed.has('ArrowUp');
    const jumpHeld = this.keysHeld.has('Space') || this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp');
    const dashJustPressed = this.keysJustPressed.has('KeyK') || this.keysJustPressed.has('KeyX') || this.keysJustPressed.has('ShiftLeft');
    const attackJustPressed = this.keysJustPressed.has('KeyJ') || this.keysJustPressed.has('KeyZ');
    const healHeld = this.keysHeld.has('KeyH') || this.keysHeld.has('KeyE');

    if (moveInput !== 0) {
      p.facing = moveInput > 0 ? 1 : -1;
    }

    // Jump buffer registration
    if (jumpJustPressed) {
      p.jumpBufferTimer = CONSTANTS.JUMP_BUFFER_TIME;
    }

    // 1. Dash handling
    if (p.isDashing) {
      p.dashTimer -= dt;
      p.vx = p.facing * CONSTANTS.DASH_SPEED;
      p.vy = 0;

      // Spawn ethereal ghost trails
      if (Math.random() > 0.4) {
        this.ghostTrails.push({
          x: p.x,
          y: p.y,
          facing: p.facing,
          alpha: 0.6,
          decay: 2.8,
          squashX: p.squashX,
          squashY: p.squashY,
        });
      }

      if (p.dashTimer <= 0) {
        p.isDashing = false;
        p.vx *= 0.4;
      }
    } else {
      // Normal horizontal movement
      p.vx = applyHorizontalMovement(p.vx, moveInput, p.grounded, dt);

      // Dash initiation
      if (dashJustPressed && p.dashCooldown <= 0 && (p.grounded || p.hasAirDash)) {
        p.isDashing = true;
        p.dashTimer = CONSTANTS.DASH_DURATION;
        p.dashCooldown = CONSTANTS.DASH_COOLDOWN;
        if (!p.grounded) p.hasAirDash = false;
        p.squashX = 1.35;
        p.squashY = 0.75;
        sound.playDash();
        this.burstParticles(p.x + p.w / 2, p.y + p.h / 2, 8, ['#4ee1ec', '#7af7ff', '#ffffff'], 160);
      }
    }

    // 2. Jump execution
    const jumpEval = evaluateJumpIntent(p.grounded, p.coyoteTimer, p.jumpBufferTimer);
    if (jumpEval.canJump) {
      p.vy = CONSTANTS.JUMP_VELOCITY;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.squashX = 0.85;
      p.squashY = 1.18;
      sound.playJump();
      this.burstParticles(p.x + p.w / 2, p.y + p.h, 6, ['#e2e8f0', '#7af7ff'], 80, 'smoke');
    }

    // Wall Jump
    if (!p.grounded && p.onWall !== 0 && jumpJustPressed) {
      p.vx = -p.onWall * CONSTANTS.WALL_JUMP_VX;
      p.vy = CONSTANTS.WALL_JUMP_VY;
      p.facing = -p.onWall as 1 | -1;
      p.hasAirDash = true;
      p.squashX = 0.85;
      p.squashY = 1.18;
      sound.playJump();
      this.burstParticles(p.onWall === 1 ? p.x + p.w : p.x, p.y + p.h / 2, 6, ['#ffffff', '#ffd166'], 100, 'spark');
    }

    // Variable jump cut (releasing jump early cuts upward velocity)
    if (!jumpHeld && p.vy < 0) {
      p.vy *= CONSTANTS.VARIABLE_JUMP_CUT;
    }

    // 3. Gravity & Wall Slide
    if (!p.isDashing) {
      if (p.onWall !== 0 && p.vy > 0 && moveInput === p.onWall) {
        // Wall sliding with sparks
        p.vy = Math.min(p.vy + CONSTANTS.GRAVITY * 0.4 * dt, CONSTANTS.WALL_SLIDE_SPEED);
        if (Math.random() > 0.6) {
          const sparkX = p.onWall === 1 ? p.x + p.w : p.x;
          this.spawnParticle(sparkX, p.y + p.h * 0.7, -p.onWall * 40, -30, '#ffd166', 2, 0.25, 'spark');
        }
      } else {
        p.vy = Math.min(p.vy + CONSTANTS.GRAVITY * dt, CONSTANTS.MAX_FALL_SPEED);
      }
    }

    // Footstep audio on ground
    if (p.grounded && Math.abs(p.vx) > 30) {
      if (Math.random() < 0.08) {
        sound.playFootstep();
        this.spawnParticle(p.x + p.w / 2, p.y + p.h, -p.facing * 30, -15, '#3a5448', 2, 0.25);
      }
    }

    // 4. Attack handling (Slash combo or Downward Pogo)
    if (p.isAttacking) {
      p.attackTimer -= dt;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    if (attackJustPressed && p.attackCooldown <= 0) {
      p.isAttacking = true;
      p.attackTimer = CONSTANTS.ATTACK_DURATION;
      p.attackCooldown = CONSTANTS.ATTACK_COOLDOWN;

      if (!p.grounded && downHeld) {
        p.attackType = 'down';
        sound.playSlash(0);
      } else {
        p.attackType = 'slash';
        p.attackCombo = (p.attackCombo + 1) % 3;
        sound.playSlash(p.attackCombo);
      }

      this.executePlayerAttack();
    }

    // 5. Soul Essence Healing Channel
    if (healHeld && p.essence >= 33 && p.hp < p.maxHp && p.grounded && !p.isAttacking) {
      p.healing = true;
      p.vx = 0;
      p.healChannelTimer += dt;

      // Aura particles
      this.spawnParticle(
        p.x + Math.random() * p.w,
        p.y + p.h - Math.random() * 10,
        0,
        -50,
        '#7af7ff',
        2,
        0.4
      );

      if (p.healChannelTimer >= 0.8) {
        p.hp = Math.min(p.maxHp, p.hp + 1);
        p.essence -= 33;
        p.healChannelTimer = 0;
        sound.playHeal();
        this.burstParticles(p.x + p.w / 2, p.y + p.h / 2, 16, ['#7af7ff', '#bbfaff', '#ffffff'], 140);
      }
    } else {
      p.healing = false;
      p.healChannelTimer = 0;
    }

    // 6. Map Collision Resolution
    const wasGrounded = p.grounded;
    const col = resolveMapCollision(p, p.vx, p.vy, dt, this.world.solids);
    p.x = col.x;
    p.y = col.y;
    p.vx = col.vx;
    p.vy = col.vy;
    p.grounded = col.grounded;
    p.onWall = col.onWall;

    // Landing detection (squash on impact)
    if (!wasGrounded && p.grounded) {
      p.squashX = 1.22;
      p.squashY = 0.78;
      p.hasAirDash = true;
      this.burstParticles(p.x + p.w / 2, p.y + p.h, 6, ['#404d6b', '#2c354d'], 60, 'smoke');
    }

    // Start coyote timer when walking off a ledge
    if (wasGrounded && !p.grounded && p.vy >= 0) {
      p.coyoteTimer = CONSTANTS.COYOTE_TIME;
    }

    // Spikes hazard collision
    for (const spike of this.world.spikes) {
      if (rectsIntersect(p, spike)) {
        this.damagePlayer(1, p.x);
        // Respawn at last shrine
        const activeShrine = this.world.checkpoints.find((c) => c.activated) || this.world.checkpoints[0];
        p.x = activeShrine.x;
        p.y = activeShrine.y - 10;
        p.vx = 0;
        p.vy = -100;
        break;
      }
    }
  }

  private executePlayerAttack() {
    const p = this.player;
    const attackBox = getAttackHitbox(p);
    let hitAnything = false;

    // 1. Check enemies
    for (const enemy of this.world.enemies) {
      if (enemy.state === 'dead') continue;
      if (rectsIntersect(attackBox, enemy)) {
        hitAnything = true;
        const isBoss = enemy.type === 'boss';

        // Downward Pogo bounce on enemies
        if (p.attackType === 'down') {
          p.vy = CONSTANTS.POGO_BOUNCE_VY;
          p.hasAirDash = true;
          this.hitstopTimer = CONSTANTS.HITSTOP_HEAVY_DURATION;
          this.addTrauma(0.35);
          sound.playPogo();
          this.burstParticles(p.x + p.w / 2, p.y + p.h, 12, ['#7af7ff', '#ffffff', '#4ee1ec'], 180, 'spark');
        } else {
          this.hitstopTimer = CONSTANTS.HITSTOP_LIGHT_DURATION;
          this.addTrauma(0.2);
          sound.playHitEnemy(p.attackCombo === 2);
        }

        // Damage enemy
        enemy.hp -= p.attackPower;
        enemy.isHitFlashing = true;
        enemy.hitFlashTimer = 0.08;
        enemy.knockbackVx = p.facing * (isBoss ? 40 : 180);
        enemy.knockbackVy = -120;

        // Soul essence gain
        p.essence = Math.min(p.maxEssence, p.essence + 12);

        // Blood / void ember burst
        this.burstParticles(
          enemy.x + enemy.w / 2,
          enemy.y + enemy.h / 2,
          isBoss ? 16 : 10,
          ['#e63946', '#540b0e', '#ffffff'],
          160,
          'spark'
        );

        if (enemy.hp <= 0) {
          enemy.state = 'dead';
          this.enemiesDefeatedCount++;
          p.souls += isBoss ? 200 : 35;
          sound.playHitEnemy(true);
          this.burstParticles(
            enemy.x + enemy.w / 2,
            enemy.y + enemy.h / 2,
            24,
            ['#4ee1ec', '#7af7ff', '#ffffff', '#1b1e38'],
            220,
            'shard'
          );

          if (isBoss) {
            // Victory!
            this.callbacks.onVictory({
              victory: true,
              timeElapsed: this.timeElapsed,
              souls: p.souls,
              damageTaken: this.damageTakenCount,
              enemiesDefeated: this.enemiesDefeatedCount,
              bossHpRemainingPercent: 0,
              stageName: 'The Spire Summit',
            });
            document.body.dataset.state = 'gameover';
          }
        }
      }
    }

    // 2. Check pogo lanterns
    if (p.attackType === 'down') {
      for (const lantern of this.world.lanterns) {
        const lanternBox: Rect = { x: lantern.x, y: lantern.y, w: 24, h: 32 };
        if (rectsIntersect(attackBox, lanternBox)) {
          p.vy = CONSTANTS.POGO_BOUNCE_VY;
          p.hasAirDash = true;
          this.hitstopTimer = CONSTANTS.HITSTOP_LIGHT_DURATION;
          this.addTrauma(0.25);
          sound.playPogo();
          this.burstParticles(lantern.x + 12, lantern.y + 16, 12, ['#ffd166', '#ff9e42', '#ffffff'], 160, 'spark');
        }
      }
    }

    // 3. Breakable Urns
    for (const urn of this.world.urns) {
      if (urn.broken) continue;
      const urnBox: Rect = { x: urn.x, y: urn.y, w: 24, h: 28 };
      if (rectsIntersect(attackBox, urnBox)) {
        urn.broken = true;
        p.souls += 20;
        p.essence = Math.min(p.maxEssence, p.essence + 15);
        sound.playHitEnemy(false);
        sound.playRunePickup();
        this.burstParticles(urn.x + 12, urn.y + 14, 14, ['#8c765c', '#4ee1ec', '#ffffff'], 140, 'shard');
      }
    }
  }

  private damagePlayer(amount: number, attackerX: number) {
    const outcome = applyDamageToPlayer(this.player, amount, attackerX);
    if (outcome.damaged) {
      this.damageTakenCount += amount;
      this.player.vx = outcome.knockbackVx;
      this.player.vy = outcome.knockbackVy;
      this.hitstopTimer = CONSTANTS.HITSTOP_HEAVY_DURATION;
      this.addTrauma(0.5);
      sound.playPlayerHurt();
      this.burstParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 14, ['#e63946', '#ffffff'], 180);
    }
  }

  // -----------------------------------------------------------------
  // Enemies Update
  // -----------------------------------------------------------------
  private updateEnemies(dt: number) {
    let anyAggro = false;

    for (const enemy of this.world.enemies) {
      if (enemy.state === 'dead') continue;

      const behavior = updateEnemyBehavior(enemy, this.player, dt);

      // Handle audio and behavior cues
      if (behavior.action === 'telegraph') {
        sound.playTelegraph();
        this.burstParticles(enemy.x + enemy.w / 2, enemy.y, 4, ['#ff3366', '#ffffff'], 60, 'spark');
      } else if (behavior.action === 'shoot' && behavior.projectile) {
        // Spawn hostile projectile
        this.projectiles.push({
          id: Math.random(),
          x: enemy.x + enemy.w / 2,
          y: enemy.y + enemy.h / 2,
          vx: behavior.projectile.vx,
          vy: behavior.projectile.vy,
          radius: 5,
          color: '#c77dff',
          isHostile: true,
          damage: 1,
          lifespan: 3.0,
          trailTimer: 0,
        });
      }

      // Check distance for soundtrack tension
      const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      if (distToPlayer < 360) {
        anyAggro = true;
      }

      // Apply knockback
      if (enemy.knockbackVx !== 0 || enemy.knockbackVy !== 0) {
        enemy.vx += enemy.knockbackVx;
        enemy.vy += enemy.knockbackVy;
        enemy.knockbackVx = 0;
        enemy.knockbackVy = 0;
      }

      // Apply gravity if not flying
      if (enemy.type !== 'wraith') {
        enemy.vy = Math.min(enemy.vy + CONSTANTS.GRAVITY * dt, CONSTANTS.MAX_FALL_SPEED);
      }

      // Map collision
      const col = resolveMapCollision(enemy, enemy.vx, enemy.vy, dt, this.world.solids);
      enemy.x = col.x;
      enemy.y = col.y;
      enemy.vx = col.vx;
      enemy.vy = col.vy;
      enemy.grounded = col.grounded;

      // Contact damage with player
      if (rectsIntersect(this.player, enemy) && enemy.state !== 'telegraph') {
        this.damagePlayer(1, enemy.x + enemy.w / 2);
      }
    }

    // Dynamic music tension
    sound.setCombatIntensity(anyAggro ? 1.0 : 0.0);
  }

  // -----------------------------------------------------------------
  // Projectiles Update
  // -----------------------------------------------------------------
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.lifespan -= dt;

      // Trail particle
      proj.trailTimer += dt;
      if (proj.trailTimer > 0.04) {
        proj.trailTimer = 0;
        this.spawnParticle(proj.x, proj.y, 0, 0, proj.color, 2, 0.2, 'spark');
      }

      // Player collision
      const projBox: Rect = {
        x: proj.x - proj.radius,
        y: proj.y - proj.radius,
        w: proj.radius * 2,
        h: proj.radius * 2,
      };

      if (rectsIntersect(this.player, projBox)) {
        this.damagePlayer(proj.damage, proj.x);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Wall collision or expired
      let hitSolid = false;
      for (const solid of this.world.solids) {
        if (rectsIntersect(projBox, solid)) {
          hitSolid = true;
          break;
        }
      }

      if (hitSolid || proj.lifespan <= 0) {
        this.burstParticles(proj.x, proj.y, 6, [proj.color, '#ffffff'], 80, 'spark');
        this.projectiles.splice(i, 1);
      }
    }
  }

  // -----------------------------------------------------------------
  // Pickups Update
  // -----------------------------------------------------------------
  private updatePickups(dt: number) {
    for (const pickup of this.world.pickups) {
      if (pickup.collected) continue;

      pickup.floatOffset += dt * 3;
      const pickupBox: Rect = {
        x: pickup.x,
        y: pickup.y + Math.sin(pickup.floatOffset) * 4,
        w: 16,
        h: 16,
      };

      if (rectsIntersect(this.player, pickupBox)) {
        pickup.collected = true;
        sound.playRunePickup();

        if (pickup.type === 'soul') {
          this.player.souls += pickup.value;
          this.player.essence = Math.min(this.player.maxEssence, this.player.essence + 20);
        } else if (pickup.type === 'relic') {
          // Secret heart relic! +1 Max HP
          this.player.maxHp += 1;
          this.player.hp = this.player.maxHp;
          this.showNotification('Ancient Soul Relic Acquired: Max Vitality Increased!');
        }

        this.burstParticles(pickup.x + 8, pickup.y + 8, 12, ['#4ee1ec', '#7af7ff', '#ffffff'], 120, 'spark');
      }
    }
  }

  // -----------------------------------------------------------------
  // Shrines & Lore Interactions
  // -----------------------------------------------------------------
  private checkInteractions() {
    // Check shrines
    for (const shrine of this.world.checkpoints) {
      if (!shrine.activated && rectsIntersect(this.player, shrine)) {
        shrine.activated = true;
        this.player.hp = this.player.maxHp;
        this.player.essence = this.player.maxEssence;
        sound.playHeal();
        this.showNotification(`Shrine Attuned: ${shrine.name}`);
        this.burstParticles(shrine.x + shrine.w / 2, shrine.y + 10, 20, ['#4ee1ec', '#7af7ff', '#ffffff'], 160);
      }
    }

    // Check lore stones
    for (const stone of this.world.loreStones) {
      const stoneBox: Rect = { x: stone.x - 20, y: stone.y - 20, w: 40, h: 40 };
      if (rectsIntersect(this.player, stoneBox)) {
        this.showNotification(stone.text);
      }
    }
  }

  private showNotification(text: string) {
    this.activeNotification = text;
    this.notificationTimer = 3.5;
  }

  // -----------------------------------------------------------------
  // Visuals & Camera Update
  // -----------------------------------------------------------------
  private updateVisualEffects(dt: number) {
    // 1. Ghost trails decay
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const g = this.ghostTrails[i];
      g.alpha -= g.decay * dt;
      if (g.alpha <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }

    // 2. Pooled particles update
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
    }

    // 3. Notification timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.activeNotification = null;
      }
    }

    // 4. Camera shake trauma decay
    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 1.8);
    }
  }

  private updateCamera(dt: number) {
    const targetX = this.player.x + this.player.w / 2 - this.canvas.width / 2 + this.player.facing * 50;
    const targetY = this.player.y + this.player.h / 2 - this.canvas.height / 2;

    // Smooth deadzone lerp damping
    this.cameraX += (targetX - this.cameraX) * 7 * dt;
    this.cameraY += (targetY - this.cameraY) * 7 * dt;

    // World clamp
    this.cameraX = Math.max(0, Math.min(this.world.width - this.canvas.width, this.cameraX));
    this.cameraY = Math.max(-100, Math.min(this.world.height - this.canvas.height, this.cameraY));
  }

  private broadcastStats() {
    const boss = this.world.enemies.find((e) => e.type === 'boss' && e.state !== 'dead');
    const isPlayerInBossArena = this.player.x >= 2150;
    const bossHp =
      boss && (isPlayerInBossArena || boss.aggro)
        ? { current: Math.max(0, boss.hp), max: boss.maxHp, name: 'The Forgotten Sentinel' }
        : undefined;

    this.callbacks.onStatsChange({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      essence: this.player.essence,
      maxEssence: this.player.maxEssence,
      souls: this.player.souls,
      bossHp,
      activeNotification: this.activeNotification || undefined,
    });
  }

  // -----------------------------------------------------------------
  // Master Render Engine (Multi-Layer Parallax & Hand-Drawn Pixel Art)
  // -----------------------------------------------------------------
  private render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Camera shake calculation (trauma * trauma * maxOffset)
    const shake = this.cameraShakeTrauma * this.cameraShakeTrauma * 14;
    const shakeOffsetX = (Math.random() * 2 - 1) * shake;
    const shakeOffsetY = (Math.random() * 2 - 1) * shake;

    const camX = Math.floor(this.cameraX + shakeOffsetX);
    const camY = Math.floor(this.cameraY + shakeOffsetY);

    // 1. Dark Void Deep Sky Background
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, cw, ch);

    // 2. Parallax Layer 1: Distant Shattered Moon & Mountain Spires (0.1x parallax)
    this.renderParallaxBackground(ctx, camX, camY, cw, ch);

    // Save camera context for world rendering
    ctx.save();
    ctx.translate(-camX, -camY);

    // 3. World Solid Geometry (Stone platforms with pixel moss)
    this.renderWorldTiles(ctx, camX, camY, cw, ch);

    // 4. Shrines, Spikes & Urns
    this.renderInteractiveProps(ctx);

    // 5. Ghost Dash Trails
    this.renderGhostTrails(ctx);

    // 6. Enemies
    this.renderEnemies(ctx);

    // 7. Player
    this.renderPlayer(ctx);

    // 8. Projectiles
    this.renderProjectiles(ctx);

    // 9. Particles
    this.renderParticles(ctx);

    ctx.restore();

    // 10. Atmospheric Post-Processing: Radial Lantern Light Cones & Perimeter Vignette
    this.renderAtmosphericLighting(ctx, camX, camY, cw, ch);
  }

  private renderParallaxBackground(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    cw: number,
    ch: number
  ) {
    // Shattered Pale Moon
    const moonX = cw * 0.82 - camX * 0.03;
    const moonY = 65 - camY * 0.02;

    // Soft moon halo
    const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 90);
    halo.addColorStop(0, 'rgba(226, 232, 240, 0.18)');
    halo.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(moonX - 90, moonY - 90, 180, 180);

    ctx.beginPath();
    ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // Moon craters
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 6, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(moonX + 11, moonY + 9, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    // Shattered fragments floating off moon
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(moonX + 42, moonY - 10, 4, 4);
    ctx.fillRect(moonX + 52, moonY - 2, 3, 3);
    ctx.fillRect(moonX + 38, moonY + 22, 3, 3);

    // Distant Gothic Spire Silhouettes (0.12x parallax)
    const spireParallax = -camX * 0.12;
    ctx.fillStyle = '#0d101d';
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 280 + spireParallax) % (cw + 400)) - 100;
      const sh = 200 + (i % 4) * 50;
      // Tall gothic tower
      ctx.fillRect(sx, ch - sh, 44, sh);
      // Triangle steeple
      ctx.beginPath();
      ctx.moveTo(sx - 4, ch - sh);
      ctx.lineTo(sx + 22, ch - sh - 65);
      ctx.lineTo(sx + 48, ch - sh);
      ctx.fill();
    }

    // Mid-plane Misty Forest & Ancient Arches (0.28x parallax)
    const midParallax = -camX * 0.28;
    ctx.fillStyle = '#141829';
    for (let i = 0; i < 22; i++) {
      const px = ((i * 160 + midParallax) % (cw + 300)) - 80;
      const ph = 140 + (i % 3) * 45;
      ctx.fillRect(px, ch - ph, 22, ph);
    }

    // Drifting atmospheric fog band
    const fogDrift = (Date.now() * 0.015) % cw;
    ctx.fillStyle = 'rgba(78, 225, 236, 0.025)';
    ctx.fillRect(0, ch - 220, cw, 120);
  }

  private renderWorldTiles(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    cw: number,
    ch: number
  ) {
    const tileSprite = sprites.get('tile_stone');

    for (const solid of this.world.solids) {
      // Cull offscreen
      if (
        solid.x + solid.w < camX - 50 ||
        solid.x > camX + cw + 50 ||
        solid.y + solid.h < camY - 50 ||
        solid.y > camY + ch + 50
      ) {
        continue;
      }

      ctx.fillStyle = '#1b1e2c';
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);

      // Top grass fringe
      ctx.fillStyle = '#3a5448';
      ctx.fillRect(solid.x, solid.y, solid.w, 4);
      ctx.fillStyle = '#5c7365';
      ctx.fillRect(solid.x, solid.y, solid.w, 2);

      // Repeated tile pattern
      if (tileSprite) {
        const pattern = ctx.createPattern(tileSprite, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(solid.x, solid.y + 4, solid.w, solid.h - 4);
        }
      }
    }
  }

  private renderInteractiveProps(ctx: CanvasRenderingContext2D) {
    const lanternSprite = sprites.get('lantern');
    const shrineSprite = sprites.get('shrine_base');
    const urnSprite = sprites.get('urn');
    const shardSprite = sprites.get('soul_shard');

    // 1. Spikes
    ctx.fillStyle = '#540b0e';
    for (const spike of this.world.spikes) {
      const count = Math.floor(spike.w / 14);
      for (let i = 0; i < count; i++) {
        const sx = spike.x + i * 14;
        ctx.beginPath();
        ctx.moveTo(sx, spike.y + spike.h);
        ctx.lineTo(sx + 7, spike.y);
        ctx.lineTo(sx + 14, spike.y + spike.h);
        ctx.fill();
      }
    }

    // 2. Shrines
    for (const shrine of this.world.checkpoints) {
      if (shrineSprite) {
        ctx.drawImage(shrineSprite, shrine.x, shrine.y);
      }
      // Glowing soul flame if active
      if (shrine.activated) {
        const flicker = Math.sin(Date.now() * 0.008) * 3;
        ctx.beginPath();
        ctx.arc(shrine.x + 16, shrine.y + 24, 7 + flicker, 0, Math.PI * 2);
        ctx.fillStyle = '#4ee1ec';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(shrine.x + 16, shrine.y + 24, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // 3. Hanging Lanterns
    for (const lantern of this.world.lanterns) {
      // Chain
      ctx.strokeStyle = '#2d334a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lantern.x + 12, lantern.y - 40);
      ctx.lineTo(lantern.x + 12, lantern.y);
      ctx.stroke();

      if (lanternSprite) {
        ctx.drawImage(lanternSprite, lantern.x, lantern.y, 24, 32);
      }
    }

    // 4. Breakable Urns
    for (const urn of this.world.urns) {
      if (!urn.broken && urnSprite) {
        ctx.drawImage(urnSprite, urn.x, urn.y, 24, 28);
      }
    }

    // 5. Soul Crystals & Pickups
    for (const pickup of this.world.pickups) {
      if (pickup.collected) continue;
      const yOffset = Math.sin(pickup.floatOffset) * 4;
      if (shardSprite) {
        ctx.drawImage(shardSprite, pickup.x, pickup.y + yOffset, 18, 18);
      }
    }
  }

  private renderGhostTrails(ctx: CanvasRenderingContext2D) {
    const idleSprite = sprites.get('player_idle_0');
    if (!idleSprite) return;

    for (const g of this.ghostTrails) {
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.translate(g.x + 10, g.y + 17);
      ctx.scale(g.facing * g.squashX, g.squashY);
      ctx.drawImage(idleSprite, -16, -24, 32, 48);
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (p.isDead) return;

    ctx.save();

    // Invulnerability blink
    if (p.isInvulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.scale(p.facing * p.squashX, p.squashY);

    // Determine current sprite
    let spriteName = 'player_idle_0';
    if (!p.grounded) {
      if (p.onWall !== 0) {
        spriteName = 'player_wall';
      } else if (p.vy < 0) {
        spriteName = 'player_jump';
      } else {
        spriteName = 'player_fall';
      }
    } else if (Math.abs(p.vx) > 20) {
      const frame = Math.floor((Date.now() / 100) % 6);
      spriteName = `player_run_${frame}`;
    } else {
      const frame = Math.floor((Date.now() / 250) % 4);
      spriteName = `player_idle_${frame}`;
    }

    const sprite = sprites.get(spriteName) || sprites.get('player_idle_0');
    if (sprite) {
      ctx.drawImage(sprite, -16, -24, 32, 48);
    }

    // Render sword slash arc
    if (p.isAttacking) {
      if (p.attackType === 'down') {
        const arc = sprites.get('down_slash_arc');
        if (arc) {
          ctx.drawImage(arc, -24, 10, 48, 48);
        }
      } else {
        const arc = sprites.get(`slash_arc_${p.attackCombo}`);
        if (arc) {
          ctx.drawImage(arc, 6, -24, 64, 48);
        }
      }
    }

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.world.enemies) {
      if (enemy.state === 'dead') continue;

      ctx.save();
      ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
      ctx.scale(enemy.facing, 1);

      // Hit flash (white silhouette)
      if (enemy.isHitFlashing) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
        ctx.restore();
        continue;
      }

      let sprite: HTMLCanvasElement | null = null;
      if (enemy.type === 'stalker') {
        if (enemy.state === 'telegraph') {
          sprite = sprites.get('stalker_telegraph');
        } else {
          const f = Math.floor((Date.now() / 180) % 2);
          sprite = sprites.get(`stalker_${f}`);
        }
      } else if (enemy.type === 'wraith') {
        if (enemy.state === 'telegraph') {
          sprite = sprites.get('wraith_telegraph');
        } else {
          const f = Math.floor((Date.now() / 220) % 3);
          sprite = sprites.get(`wraith_${f}`);
        }
      } else if (enemy.type === 'warden') {
        const f = Math.floor((Date.now() / 300) % 2);
        sprite = sprites.get(`warden_${f}`);
      } else if (enemy.type === 'boss') {
        const f = Math.floor((Date.now() / 250) % 2);
        sprite = sprites.get(`boss_${f}`);
      }

      if (sprite) {
        ctx.drawImage(sprite, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
      }

      // Visual attack telegraph halo
      if (enemy.state === 'telegraph') {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.w * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();

      // Glowing core
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.life > 0 && p.alpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'spark') {
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size * 2, 1);
        } else if (p.shape === 'shard') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size, p.y + p.size);
          ctx.lineTo(p.x - p.size, p.y + p.size);
          ctx.fill();
        } else {
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }

        ctx.restore();
      }
    }
  }

  private renderAtmosphericLighting(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    cw: number,
    ch: number
  ) {
    // 1. Subtle dark perimeter vignette (moody cinematic atmosphere)
    const vignette = ctx.createRadialGradient(
      cw / 2,
      ch / 2,
      cw * 0.35,
      cw / 2,
      ch / 2,
      cw * 0.75
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(3, 4, 8, 0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Dynamic light cones from on-screen lanterns
    for (const lantern of this.world.lanterns) {
      const screenX = lantern.x + 12 - camX;
      const screenY = lantern.y + 16 - camY;

      if (screenX > -150 && screenX < cw + 150 && screenY > -150 && screenY < ch + 150) {
        const light = ctx.createRadialGradient(screenX, screenY, 4, screenX, screenY, 130);
        light.addColorStop(0, 'rgba(255, 180, 80, 0.22)');
        light.addColorStop(0.5, 'rgba(255, 140, 50, 0.08)');
        light.addColorStop(1, 'rgba(255, 140, 50, 0)');
        ctx.fillStyle = light;
        ctx.fillRect(screenX - 130, screenY - 130, 260, 260);
      }
    }

    // 3. Player soul glow
    const playerScreenX = this.player.x + this.player.w / 2 - camX;
    const playerScreenY = this.player.y + this.player.h / 2 - camY;
    const soulGlow = ctx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      2,
      playerScreenX,
      playerScreenY,
      80
    );
    soulGlow.addColorStop(0, 'rgba(78, 225, 236, 0.16)');
    soulGlow.addColorStop(1, 'rgba(78, 225, 236, 0)');
    ctx.fillStyle = soulGlow;
    ctx.fillRect(playerScreenX - 80, playerScreenY - 80, 160, 160);
  }
}

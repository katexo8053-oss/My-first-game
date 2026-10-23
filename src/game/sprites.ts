/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Offscreen pixel sprite cache
type SpriteSheet = { [key: string]: HTMLCanvasElement };

class SpriteRenderer {
  private cache: SpriteSheet = {};
  public initialized: boolean = false;

  public init() {
    if (this.initialized) return;
    this.createPlayerSprites();
    this.createEnemySprites();
    this.createTileAndPropSprites();
    this.initialized = true;
  }

  private createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [canvas, ctx];
  }

  private setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale = 2) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), scale, scale);
  }

  private drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, scale = 2) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.floor(w * scale), Math.floor(h * scale));
  }

  // -------------------------------------------------------------
  // Player Sprites: "The Ashen Pilgrim"
  // -------------------------------------------------------------
  private createPlayerSprites() {
    // Colors
    const CLOAK_DARK = '#0e111a';
    const CLOAK_MID = '#1e2436';
    const CLOAK_LIGHT = '#343f5e';
    const COWL_GOLD = '#d4af37';
    const EYE_CYAN = '#7af7ff';
    const BLADE_STEEL = '#e2e8f0';
    const BLADE_GLOW = '#4ee1ec';

    // 1. Idle Frames (4 frames)
    for (let f = 0; f < 4; f++) {
      const [c, ctx] = this.createCanvas(32, 48);
      const bob = f === 1 || f === 3 ? 1 : 0;

      // Cloak body
      this.drawRect(ctx, 4, 8 + bob, 8, 14, CLOAK_MID);
      this.drawRect(ctx, 3, 10 + bob, 10, 12, CLOAK_DARK);
      // Highlights
      this.drawRect(ctx, 5, 9 + bob, 2, 11, CLOAK_LIGHT);
      
      // Mask / Cowl
      this.drawRect(ctx, 5, 4 + bob, 6, 5, CLOAK_DARK);
      this.drawRect(ctx, 6, 5 + bob, 4, 3, CLOAK_MID);
      // Luminous cyan eye slit
      this.drawRect(ctx, 8, 6 + bob, 2, 1, EYE_CYAN);
      // Horn/Crest on mask
      this.drawRect(ctx, 5, 3 + bob, 2, 2, COWL_GOLD);

      // Trailing tattered cloak tail with organic flutter
      const flutter = f % 2 === 0 ? 0 : 1;
      this.drawRect(ctx, 2 - flutter, 18 + bob, 4, 4, CLOAK_DARK);
      this.drawRect(ctx, 1 - flutter, 20 + bob, 3, 2, CLOAK_MID);

      // Rapier hilt at hip
      this.drawRect(ctx, 9, 13 + bob, 2, 4, COWL_GOLD);
      this.drawRect(ctx, 10, 16 + bob, 1, 8, BLADE_STEEL);

      this.cache[`player_idle_${f}`] = c;
    }

    // 2. Run Frames (6 frames)
    for (let f = 0; f < 6; f++) {
      const [c, ctx] = this.createCanvas(36, 48);
      const step = f;
      const legOffset = Math.sin((step / 6) * Math.PI * 2) * 3;
      const lean = 1;

      // Tattered scarf flying behind
      const trailX = 1 - Math.floor(Math.sin(step) * 2);
      this.drawRect(ctx, 1 + trailX, 8, 5, 3, CLOAK_LIGHT);
      this.drawRect(ctx, 0 + trailX, 10, 4, 4, CLOAK_DARK);

      // Cloak body forward-angled
      this.drawRect(ctx, 6 + lean, 7, 7, 12, CLOAK_MID);
      this.drawRect(ctx, 5 + lean, 9, 8, 10, CLOAK_DARK);

      // Head / Mask
      this.drawRect(ctx, 8 + lean, 3, 6, 5, CLOAK_DARK);
      this.drawRect(ctx, 11 + lean, 5, 2, 1, EYE_CYAN);
      this.drawRect(ctx, 8 + lean, 2, 2, 2, COWL_GOLD);

      // Legs / Stride
      this.drawRect(ctx, 6 + legOffset, 19, 3, 5, CLOAK_DARK);
      this.drawRect(ctx, 9 - legOffset, 19, 3, 5, CLOAK_MID);

      // Blade forward
      this.drawRect(ctx, 12, 11, 4, 1, BLADE_STEEL);
      this.drawRect(ctx, 14, 10, 1, 3, COWL_GOLD);

      this.cache[`player_run_${f}`] = c;
    }

    // 3. Jump and Fall
    {
      const [c, ctx] = this.createCanvas(32, 48);
      // Upward stretched pose
      this.drawRect(ctx, 5, 4, 6, 17, CLOAK_MID);
      this.drawRect(ctx, 4, 6, 8, 14, CLOAK_DARK);
      this.drawRect(ctx, 6, 2, 5, 4, CLOAK_DARK);
      this.drawRect(ctx, 8, 3, 2, 1, EYE_CYAN);
      // Downwards trailing cloak
      this.drawRect(ctx, 3, 17, 9, 5, CLOAK_LIGHT);
      // Rapier poised
      this.drawRect(ctx, 11, 8, 1, 9, BLADE_STEEL);
      this.cache['player_jump'] = c;
    }
    {
      const [c, ctx] = this.createCanvas(32, 48);
      // Wide billowing parachute cloak
      this.drawRect(ctx, 3, 6, 10, 14, CLOAK_MID);
      this.drawRect(ctx, 2, 12, 12, 8, CLOAK_DARK);
      this.drawRect(ctx, 6, 4, 5, 4, CLOAK_DARK);
      this.drawRect(ctx, 8, 5, 2, 1, EYE_CYAN);
      this.cache['player_fall'] = c;
    }

    // 4. Wall Slide
    {
      const [c, ctx] = this.createCanvas(32, 48);
      this.drawRect(ctx, 7, 6, 6, 14, CLOAK_MID);
      this.drawRect(ctx, 6, 8, 7, 12, CLOAK_DARK);
      this.drawRect(ctx, 8, 4, 5, 4, CLOAK_DARK);
      this.drawRect(ctx, 9, 5, 2, 1, EYE_CYAN);
      // Hand on wall with sparks
      this.drawRect(ctx, 13, 10, 2, 3, BLADE_STEEL);
      this.cache['player_wall'] = c;
    }

    // 5. Slash Arc Sprites (Combo 1, 2, 3 & Down Slash)
    for (let combo = 0; combo < 3; combo++) {
      const [c, ctx] = this.createCanvas(64, 48);
      // Draw crescent slash energy
      const arcColor = combo === 2 ? '#bbfaff' : BLADE_GLOW;
      const coreColor = '#ffffff';

      // Sweeping crescent blade slash
      ctx.beginPath();
      ctx.arc(28, 24, 18 + combo * 3, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.lineWidth = 4;
      ctx.strokeStyle = arcColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(28, 24, 18 + combo * 3, -Math.PI * 0.25, Math.PI * 0.25);
      ctx.lineWidth = 2;
      ctx.strokeStyle = coreColor;
      ctx.stroke();

      this.cache[`slash_arc_${combo}`] = c;
    }

    // Down Slash (Pogo) Arc
    {
      const [c, ctx] = this.createCanvas(48, 48);
      ctx.beginPath();
      ctx.arc(24, 16, 16, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 4;
      ctx.strokeStyle = BLADE_GLOW;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(24, 16, 16, Math.PI * 0.3, Math.PI * 0.7);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      this.cache['down_slash_arc'] = c;
    }
  }

  // -------------------------------------------------------------
  // Enemies: Gloom Stalker, Hollow Wraith, Grave Warden, Boss
  // -------------------------------------------------------------
  private createEnemySprites() {
    // 1. Gloom Stalker (Four-legged void beast)
    for (let f = 0; f < 2; f++) {
      const [c, ctx] = this.createCanvas(36, 28);
      const bob = f === 1 ? 1 : 0;
      // Spiky obsidian body
      this.drawRect(ctx, 3, 4 + bob, 12, 6, '#0f0a14');
      this.drawRect(ctx, 4, 3 + bob, 8, 3, '#21132b');
      // Void spikes on back
      this.drawRect(ctx, 5, 1 + bob, 2, 3, '#540b0e');
      this.drawRect(ctx, 9, 1 + bob, 2, 3, '#540b0e');
      // Glowing red multi-eye slit
      this.drawRect(ctx, 12, 5 + bob, 3, 1, '#ff3366');
      this.drawRect(ctx, 13, 6 + bob, 1, 1, '#ffffff');
      // Insectoid / beast legs
      this.drawRect(ctx, 3, 10 + bob, 2, 4, '#0f0a14');
      this.drawRect(ctx, 12, 10 + bob, 2, 4, '#0f0a14');
      this.drawRect(ctx, 7, 10 + bob, 2, 3, '#21132b');

      this.cache[`stalker_${f}`] = c;
    }

    // Gloom Stalker Crouch Telegraph
    {
      const [c, ctx] = this.createCanvas(36, 28);
      // Crouched low, pulsing emissive red spine
      this.drawRect(ctx, 2, 7, 14, 5, '#0f0a14');
      this.drawRect(ctx, 4, 6, 10, 3, '#780016');
      this.drawRect(ctx, 6, 4, 2, 3, '#ff0055');
      this.drawRect(ctx, 10, 4, 2, 3, '#ff0055');
      this.drawRect(ctx, 13, 7, 4, 2, '#ff3366');
      this.cache['stalker_telegraph'] = c;
    }

    // 2. Hollow Wraith (Floating hooded phantom)
    for (let f = 0; f < 3; f++) {
      const [c, ctx] = this.createCanvas(36, 44);
      const bob = Math.sin((f / 3) * Math.PI * 2) * 2;
      // Ghostly tattered dark violet cowl
      this.drawRect(ctx, 4, 6 + bob, 9, 13, '#1a102f');
      this.drawRect(ctx, 3, 10 + bob, 11, 8, '#2d1b4e');
      // Wispy fading hem
      this.drawRect(ctx, 4, 18 + bob, 3, 4, '#432874');
      this.drawRect(ctx, 9, 19 + bob, 3, 3, '#432874');
      // Mask / Face (Cracked skull mask)
      this.drawRect(ctx, 6, 4 + bob, 6, 6, '#d8b4e2');
      this.drawRect(ctx, 7, 5 + bob, 4, 4, '#ffffff');
      this.drawRect(ctx, 8, 6 + bob, 1, 2, '#3a0ca3');
      this.drawRect(ctx, 10, 6 + bob, 1, 2, '#3a0ca3');

      this.cache[`wraith_${f}`] = c;
    }

    // Hollow Wraith Telegraph (Glowing runic sphere charging)
    {
      const [c, ctx] = this.createCanvas(44, 44);
      this.drawRect(ctx, 8, 6, 9, 13, '#1a102f');
      this.drawRect(ctx, 10, 4, 6, 6, '#d8b4e2');
      this.drawRect(ctx, 11, 5, 4, 4, '#ffffff');
      // Charged orb in front
      ctx.beginPath();
      ctx.arc(32, 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#c77dff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(32, 20, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      this.cache['wraith_telegraph'] = c;
    }

    // 3. Grave Warden (Heavy armored golem brute)
    for (let f = 0; f < 2; f++) {
      const [c, ctx] = this.createCanvas(56, 56);
      const bob = f === 1 ? 1 : 0;
      // Stone body
      this.drawRect(ctx, 6, 6 + bob, 16, 18, '#262d3d');
      this.drawRect(ctx, 8, 8 + bob, 12, 14, '#39445a');
      // Moss on shoulders
      this.drawRect(ctx, 5, 5 + bob, 6, 3, '#3a5448');
      this.drawRect(ctx, 17, 5 + bob, 6, 3, '#3a5448');
      // Glowing core fracture
      this.drawRect(ctx, 12, 11 + bob, 3, 7, '#ffd166');
      this.drawRect(ctx, 13, 13 + bob, 1, 3, '#ffffff');
      // Heavy stone legs
      this.drawRect(ctx, 7, 24 + bob, 5, 6, '#1e2430');
      this.drawRect(ctx, 15, 24 + bob, 5, 6, '#1e2430');
      // Giant stone hammer
      this.drawRect(ctx, 22, 4 + bob, 3, 24, '#1b1b1b');
      this.drawRect(ctx, 20, 2 + bob, 7, 7, '#39445a');
      this.drawRect(ctx, 21, 3 + bob, 5, 5, '#566585');

      this.cache[`warden_${f}`] = c;
    }

    // 4. The Forgotten Sentinel (Boss Titan)
    for (let f = 0; f < 2; f++) {
      const [c, ctx] = this.createCanvas(72, 72);
      const bob = f === 1 ? 2 : 0;
      // Majestic winged stone silhouette
      // Wings
      this.drawRect(ctx, 2, 4 + bob, 8, 18, '#1e1e2d');
      this.drawRect(ctx, 26, 4 + bob, 8, 18, '#1e1e2d');
      // Torso
      this.drawRect(ctx, 9, 8 + bob, 18, 22, '#2b2d42');
      this.drawRect(ctx, 11, 10 + bob, 14, 18, '#3d405b');
      // Ancient gold trim
      this.drawRect(ctx, 11, 8 + bob, 14, 3, '#d4af37');
      // Glowing soul core
      this.drawRect(ctx, 16, 14 + bob, 4, 8, '#4ee1ec');
      this.drawRect(ctx, 17, 16 + bob, 2, 4, '#ffffff');
      // Head with dual curved horns
      this.drawRect(ctx, 14, 3 + bob, 8, 6, '#1e1e2d');
      this.drawRect(ctx, 12, 1 + bob, 3, 4, '#d4af37');
      this.drawRect(ctx, 21, 1 + bob, 3, 4, '#d4af37');
      this.drawRect(ctx, 16, 5 + bob, 4, 1, '#7af7ff');

      this.cache[`boss_${f}`] = c;
    }
  }

  // -------------------------------------------------------------
  // Tiles and Interactive Props
  // -------------------------------------------------------------
  private createTileAndPropSprites() {
    // 1. Stone Wall / Platform Tile (32x32)
    {
      const [c, ctx] = this.createCanvas(32, 32);
      // Base dark stone slate
      this.drawRect(ctx, 0, 0, 32, 32, '#151824', 1);
      this.drawRect(ctx, 1, 1, 30, 30, '#1d2233', 1);

      // Multi-brick stone pattern
      this.drawRect(ctx, 2, 2, 13, 13, '#252c40', 1);
      this.drawRect(ctx, 17, 2, 13, 13, '#22283a', 1);
      this.drawRect(ctx, 2, 17, 28, 13, '#242a3c', 1);

      // Subtle lighter stone highlights
      this.drawRect(ctx, 2, 2, 13, 1, '#343c56', 1);
      this.drawRect(ctx, 2, 2, 1, 13, '#343c56', 1);
      this.drawRect(ctx, 17, 2, 13, 1, '#303850', 1);
      this.drawRect(ctx, 2, 17, 28, 1, '#303850', 1);

      // Mortar grooves
      this.drawRect(ctx, 0, 15, 32, 2, '#0f111a', 1);
      this.drawRect(ctx, 15, 0, 2, 16, '#0f111a', 1);

      // Top overgrown ivy / moss fringe
      this.drawRect(ctx, 0, 0, 32, 3, '#2a3d31', 1);
      this.drawRect(ctx, 1, 0, 30, 2, '#3b5544', 1);
      this.drawRect(ctx, 4, 2, 3, 2, '#4d6f59', 1);
      this.drawRect(ctx, 18, 2, 4, 3, '#4d6f59', 1);
      this.drawRect(ctx, 27, 2, 2, 2, '#4d6f59', 1);

      this.cache['tile_stone'] = c;
    }

    // 2. Iron Street Lantern (16x32)
    {
      const [c, ctx] = this.createCanvas(16, 24);
      // Brass hanger & frame
      this.drawRect(ctx, 6, 2, 4, 2, '#8d6b2c');
      this.drawRect(ctx, 4, 4, 8, 2, '#222');
      this.drawRect(ctx, 4, 13, 8, 2, '#222');
      this.drawRect(ctx, 4, 6, 1, 7, '#222');
      this.drawRect(ctx, 11, 6, 1, 7, '#222');
      // Glowing amber flame core
      this.drawRect(ctx, 5, 6, 6, 7, '#ff9e42');
      this.drawRect(ctx, 6, 7, 4, 5, '#ffd166');
      this.drawRect(ctx, 7, 8, 2, 3, '#ffffff');
      this.cache['lantern'] = c;
    }

    // 3. Ancient Checkpoint Shrine (32x48)
    {
      const [c, ctx] = this.createCanvas(32, 48);
      // Stone plinth
      this.drawRect(ctx, 4, 38, 24, 8, '#1b1e2c');
      this.drawRect(ctx, 6, 36, 20, 2, '#2d334a');
      // Dual carved stone pillars
      this.drawRect(ctx, 6, 12, 4, 24, '#242a3e');
      this.drawRect(ctx, 22, 12, 4, 24, '#242a3e');
      // Arch crest
      this.drawRect(ctx, 8, 8, 16, 4, '#1b1e2c');
      this.drawRect(ctx, 12, 4, 8, 4, '#d4af37');
      // Central basin
      this.drawRect(ctx, 12, 28, 8, 8, '#2d334a');
      this.cache['shrine_base'] = c;
    }

    // 4. Breakable Soul Urn (20x24)
    {
      const [c, ctx] = this.createCanvas(16, 20);
      this.drawRect(ctx, 4, 2, 8, 3, '#5c4d3c');
      this.drawRect(ctx, 2, 5, 12, 11, '#78654f');
      this.drawRect(ctx, 3, 7, 10, 8, '#8c765c');
      this.drawRect(ctx, 4, 16, 8, 3, '#5c4d3c');
      // Faint blue glow crack
      this.drawRect(ctx, 7, 9, 2, 4, '#4ee1ec');
      this.cache['urn'] = c;
    }

    // 5. Soul Crystal Shard Pickup (16x16)
    {
      const [c, ctx] = this.createCanvas(16, 16);
      this.drawRect(ctx, 6, 2, 4, 12, '#4ee1ec');
      this.drawRect(ctx, 4, 5, 8, 6, '#7af7ff');
      this.drawRect(ctx, 7, 6, 2, 4, '#ffffff');
      this.cache['soul_shard'] = c;
    }
  }

  public get(key: string): HTMLCanvasElement | null {
    if (!this.initialized) this.init();
    return this.cache[key] || null;
  }
}

export const sprites = new SpriteRenderer();

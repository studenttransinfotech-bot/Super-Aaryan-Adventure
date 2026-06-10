export type LevelTheme = 'surface' | 'underwater' | 'beach' | 'jungle' | 'river' | 'cave' | 'underground' | 'city' | 'desert' | 'island' | 'snowy' | 'mushroom' | 'magma' | 'candy' | 'factory' | 'castle' | 'sky' | 'village' | 'farm' | 'lab' | 'zoo' | 'prison' | 'spooky' | 'pirate' | 'egypt' | 'park' | 'stadium' | 'space' | 'cybercity' | 'steampunk' | 'cyber_atlantis' | 'void_nebula' | 'sky_pagoda' | 'primal_jungle' | 'cryo_cave' | 'retrowave_highway';
export type EnemyType = 'goomba' | 'koopa' | 'crab' | 'boss' | 'ghost' | 'guard' | 'grumpy_pirate' | 'fish' | 'alien' | 'drone' | 'clockwork_soldier' | 'gummy_bear' | 'angler_robot' | 'void_eye' | 'wind_spirit' | 'raptor' | 'cryo_slime' | 'neon_vector_car';

export type PowerUpType = 'mushroom' | 'minimushroom' | 'fireflower' | 'iceflower' | 'star';

export interface PowerUpItem {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  spawnOffset?: number;
}

export interface Projectile {
  id: number;
  type: 'fireball' | 'iceball';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vy?: number;
  width: number;
  height: number;
  speed: number;
  range: number;
  startX: number;
  health?: number;
  isShell?: boolean;
  isFrozen?: boolean;
  freezeTimer?: number;
  isSliding?: boolean;
  slideSpeed?: number;
}

export interface GameBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'question' | 'exclamation' | 'brick';
  content: 'coin' | 'mushroom' | 'minimushroom' | 'fireflower' | 'iceflower' | 'star' | 'empty';
  isHit: boolean;
  bumpY?: number;
  bumpTimer?: number;
}

export interface Level {
  id: number;
  name: string;
  theme: LevelTheme;
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  powerUps?: PowerUpItem[];
  blocks?: GameBlock[];
  checkpoint?: Checkpoint;
  flagPole: FlagPole;
  gravity: number;
  jumpStrength: number;
  backgroundColor: [string, string];
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  color: string;
  grounded: boolean;
  lives: number;
  isDead: boolean;
  deathTimer: number;
  checkpointX: number;
  checkpointY: number;
  powerUp?: 'normal' | 'mushroom' | 'fire' | 'ice' | 'mini';
  starTimer?: number; // Frames remaining of invincibility
  shieldTimer?: number; // Hurt protection frames
  // Sequel abilities
  airJumps?: number;
  maxAirJumps?: number;
  dashCooldown?: number;
  dashTimer?: number;
  dashDir?: number;
  hasKey?: boolean;
  keyWarningTimer?: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  // Moving platform support
  isMoving?: boolean;
  startX?: number;
  startY?: number;
  rangeX?: number;
  rangeY?: number;
  speed?: number;
  dir?: number; // movement vector multiplier
  // Spring / Jump pad support
  isSpring?: boolean;
  springCooldown?: number;
  isPipe?: boolean;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface Checkpoint {
  x: number;
  y: number;
  reached: boolean;
}

export interface FlagPole {
  x: number;
  y: number;
}

export interface GameState {
  levelIndex: number;
  score: number;
  isWin: boolean;
  isGameOver: boolean;
}

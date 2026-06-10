import { Level, EnemyType } from "./types";

export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 500;

export const MOVE_SPEED = 5;

export const INITIAL_PLAYER = {
  x: 100,
  y: 300,
  width: 44,
  height: 54,
  dx: 0,
  dy: 0,
  color: "#f8fafc",
  grounded: false,
  lives: 5,
  isDead: false,
  deathTimer: 0,
  checkpointX: 100,
  checkpointY: 300,
};

const THEMES = {
  surface: { colors: ["#87CEEB", "#E0F2F1"] as [string, string], grav: 0.6, jump: -12 },
  underwater: { colors: ["#0e7490", "#164e63"] as [string, string], grav: 0.15, jump: -6 },
  beach: { colors: ["#0ea5e9", "#fef3c7"] as [string, string], grav: 0.6, jump: -13 },
  jungle: { colors: ["#14532d", "#064e3b"] as [string, string], grav: 0.65, jump: -12 },
  river: { colors: ["#1e40af", "#bae6fd"] as [string, string], grav: 0.55, jump: -14 },
  cave: { colors: ["#111827", "#1f2937"] as [string, string], grav: 0.6, jump: -12 },
  underground: { colors: ["#0f172a", "#1e293b"] as [string, string], grav: 0.62, jump: -12.5 },
  city: { colors: ["#030712", "#4c1d95"] as [string, string], grav: 0.6, jump: -13 },
  desert: { colors: ["#f59e0b", "#ffedd5"] as [string, string], grav: 0.6, jump: -12 },
  island: { colors: ["#06b6d4", "#a5f3fc"] as [string, string], grav: 0.58, jump: -12.5 },
  snowy: { colors: ["#1e293b", "#e2e8f0"] as [string, string], grav: 0.6, jump: -12.5 },
  mushroom: { colors: ["#581c87", "#fae8ff"] as [string, string], grav: 0.55, jump: -13 },
  magma: { colors: ["#7f1d1d", "#450a0a"] as [string, string], grav: 0.6, jump: -12 },
  candy: { colors: ["#fbcfe8", "#fae8ff"] as [string, string], grav: 0.5, jump: -13.5 },
  factory: { colors: ["#334155", "#0f172a"] as [string, string], grav: 0.62, jump: -12.5 },
  castle: { colors: ["#18181b", "#09090b"] as [string, string], grav: 0.6, jump: -12 },
  sky: { colors: ["#38bdf8", "#e0f2fe"] as [string, string], grav: 0.5, jump: -13.5 },
  village: { colors: ["#f59e0b", "#fef3c7"] as [string, string], grav: 0.6, jump: -12.5 },
  farm: { colors: ["#a16207", "#fef08a"] as [string, string], grav: 0.6, jump: -12 },
  lab: { colors: ["#0f172a", "#0284c7"] as [string, string], grav: 0.6, jump: -12.5 },
  zoo: { colors: ["#065f46", "#22c55e"] as [string, string], grav: 0.6, jump: -12 },
  prison: { colors: ["#18181b", "#3f3f46"] as [string, string], grav: 0.62, jump: -12 },
  spooky: { colors: ["#090514", "#2e1065"] as [string, string], grav: 0.58, jump: -12.5 },
  pirate: { colors: ["#075985", "#0284c7"] as [string, string], grav: 0.60, jump: -12.5 },
  egypt: { colors: ["#ea580c", "#fed7aa"] as [string, string], grav: 0.60, jump: -12.5 },
  park: { colors: ["#16a34a", "#f0fdf4"] as [string, string], grav: 0.58, jump: -12.0 },
  stadium: { colors: ["#0f172a", "#312e81"] as [string, string], grav: 0.60, jump: -13.0 },
  space: { colors: ["#020617", "#0f172a"] as [string, string], grav: 0.35, jump: -9.5 },
  cybercity: { colors: ["#090514", "#1e1b4b"] as [string, string], grav: 0.60, jump: -12.5 },
  steampunk: { colors: ["#2d1a10", "#451a03"] as [string, string], grav: 0.60, jump: -12.0 },
  cyber_atlantis: { colors: ["#022c22", "#0c4a6e"] as [string, string], grav: 0.15, jump: -6 },
  void_nebula: { colors: ["#040108", "#1c033c"] as [string, string], grav: 0.28, jump: -9.0 },
  sky_pagoda: { colors: ["#1e1b4b", "#fe2c2c"] as [string, string], grav: 0.55, jump: -13.0 },
  primal_jungle: { colors: ["#022c22", "#021c10"] as [string, string], grav: 0.60, jump: -12.0 },
  cryo_cave: { colors: ["#02122c", "#0891b2"] as [string, string], grav: 0.60, jump: -12.0 },
  retrowave_highway: { colors: ["#04010a", "#3b0764"] as [string, string], grav: 0.60, jump: -12.5 },
};

function generateLevel(id: number): Level {
  const themes: (keyof typeof THEMES)[] = [
    'surface', 
    'underwater', 
    'beach', 
    'jungle', 
    'river', 
    'cave', 
    'underground', 
    'city',
    'desert',
    'island',
    'snowy',
    'mushroom',
    'magma',
    'candy',
    'factory',
    'castle',
    'sky',
    'village',
    'farm',
    'lab',
    'zoo',
    'prison',
    'spooky',
    'pirate',
    'egypt',
    'park',
    'stadium',
    'space',
    'cybercity',
    'steampunk',
    'cyber_atlantis',
    'void_nebula',
    'sky_pagoda',
    'primal_jungle',
    'cryo_cave',
    'retrowave_highway'
  ];
  
  // Choose thematic layout based on ID, scrambled dynamically so adjacent levels have different themes
  let themeKey = themes[(id * 17 - 1) % themes.length];
  
  // Custom theme overrides for progression and variety
  if (id === 80) {
    themeKey = 'castle'; // final boss mega-castle
  } else if (id % 10 === 0) {
    // Castle/Boss themes mapping precisely to stories & heroes trapped inside!
    const bossThemesOrdered: (keyof typeof THEMES)[] = ['castle', 'factory', 'magma', 'snowy', 'candy', 'castle', 'factory', 'magma'];
    themeKey = bossThemesOrdered[Math.floor(id / 10 - 1) % bossThemesOrdered.length];
  }

  const config = THEMES[themeKey];
  
  // Ground color selection
  let groundColor = '#22c55e';
  if (themeKey === 'jungle') groundColor = '#064e3b';
  else if (themeKey === 'cave') groundColor = '#4b5563';
  else if (themeKey === 'underground') groundColor = '#334155';
  else if (themeKey === 'city') groundColor = '#1e1b4b';
  else if (themeKey === 'underwater') groundColor = '#0f766e';
  else if (themeKey === 'river') groundColor = '#10b981';
  else if (themeKey === 'beach') groundColor = '#fbbf24';
  else if (themeKey === 'desert') groundColor = '#ca8a04';
  else if (themeKey === 'island') groundColor = '#eab308';
  else if (themeKey === 'snowy') groundColor = '#cbd5e1';
  else if (themeKey === 'mushroom') groundColor = '#701a75';
  else if (themeKey === 'magma') groundColor = '#2d0404'; // volcanic slag
  else if (themeKey === 'candy') groundColor = '#ec4899'; // pink frosting
  else if (themeKey === 'factory') groundColor = '#3f3f46'; // steel sheet
  else if (themeKey === 'castle') groundColor = '#1e1b4b'; // dark brick path
  else if (themeKey === 'sky') groundColor = '#f8fafc'; // cloud platform
  else if (themeKey === 'village') groundColor = '#64748b'; // cobblestone path
  else if (themeKey === 'farm') groundColor = '#78350f'; // rich farmland soil
  else if (themeKey === 'lab') groundColor = '#0f172a'; // steel gray tech floor
  else if (themeKey === 'zoo') groundColor = '#0f5132'; // grass fence/soil
  else if (themeKey === 'prison') groundColor = '#343a40'; // concrete slab
  else if (themeKey === 'spooky') groundColor = '#212529'; // spooky floor
  else if (themeKey === 'pirate') groundColor = '#3e2723'; // rich mahogany ship deck timber
  else if (themeKey === 'egypt') groundColor = '#ea580c'; // sandstone desert ground
  else if (themeKey === 'park') groundColor = '#15803d'; // playground lawn grass
  else if (themeKey === 'stadium') groundColor = '#3f3f46'; // asphalt racing track asphalt
  else if (themeKey === 'space') groundColor = '#1e293b'; // slate dark spacecraft plating
  else if (themeKey === 'cybercity') groundColor = '#3b0764'; // deep neon purple cyberpunk boulevard
  else if (themeKey === 'steampunk') groundColor = '#78350f'; // vintage brass/rusty metal walkway
  else if (themeKey === 'cyber_atlantis') groundColor = '#14b8a6'; // teal glowing underwater cyber ruins floor
  else if (themeKey === 'void_nebula') groundColor = '#581c87'; // glowing cosmic stardust void rock
  else if (themeKey === 'sky_pagoda') groundColor = '#ca8a04'; // sacred redwood ancient temple roof plates
  else if (themeKey === 'primal_jungle') groundColor = '#14532d'; // primal humid dinosaur vine logs
  else if (themeKey === 'cryo_cave') groundColor = '#22d3ee'; // cryogenic frozen blue ice walkway
  else if (themeKey === 'retrowave_highway') groundColor = '#ec4899'; // neon pink hot grid asphalt road

  // Procedural platforms to make each level organic and distinct
  let platforms: any[];
  if (themeKey === 'river') {
    // Islands on the river bank with open water gaps in between!
    platforms = [
      { x: 0, y: 450, width: 220, height: 50, color: groundColor },
      // Water gap 1: x=220 to 380 (160px width)
      { x: 380, y: 450, width: 240, height: 50, color: groundColor },
      // Water gap 2: x=620 to 760 (140px width)
      { x: 760, y: 450, width: 240, height: 50, color: groundColor },
      // Floating stepping stones to safely jump across the river gaps!
      { x: 180 + (id * 17) % 100, y: 340 - (id % 2) * 15, width: 120, height: 20, color: groundColor },
      { x: 440 + (id * 29) % 120, y: 280 - (id % 3) * 15, width: 125, height: 20, color: groundColor },
      { x: 700 - (id * 13) % 80, y: 340 + (id % 2) * 20, width: 130, height: 20, color: groundColor },
    ];
  } else {
    // Normal level solid grounds
    platforms = [
      { x: 0, y: 450, width: 1000, height: 50, color: groundColor },
      { x: 180 + (id * 17) % 140, y: 350 - (id % 3) * 15, width: 140 + (id % 4) * 15, height: 20, color: groundColor },
      { x: 440 + (id * 29) % 150, y: 280 - (id % 4) * 12, width: 140 + (id % 3) * 15, height: 20, color: groundColor },
      { x: 740 - (id * 13) % 110, y: 220 + (id % 2) * 20, width: 150 - (id % 2) * 10, height: 20, color: groundColor },
    ];
  }

  // Classic Mario-style Green Pipes placement on standard levels!
  if (id % 10 !== 0) {
    platforms.push({
      x: 350 + (id * 31) % 120,
      y: 370,
      width: 60,
      height: 80,
      color: "#16a34a",
      isPipe: true
    });
    
    // Sometimes second smaller entrance pipe!
    if (id % 3 === 0) {
      platforms.push({
        x: 680 + (id * 17) % 80,
        y: 390,
        width: 54,
        height: 60,
        color: "#16a34a",
        isPipe: true
      });
    }
  }

  // Higher tier layout adjustments
  if (id > 5) {
    platforms.push({ x: 100 + (id * 41) % 100, y: 170, width: 100, height: 20, color: groundColor });
  }
  if (id > 12) {
    platforms.push({ x: 380 + (id * 53) % 120, y: 130 + (id % 3) * 10, width: 110, height: 20, color: groundColor });
  }
  if (id > 25) {
    platforms.push({ x: 620 - (id * 19) % 100, y: 90, width: 90, height: 20, color: groundColor });
  }

  const enemies = [];
  const isUnderwater = themeKey === 'underwater' || themeKey === 'cyber_atlantis';

  // Spawn special bosses or standard enemies
  if (id % 10 === 0) {
    // Boss battle levels!
    const isFinalBoss = id === 80;
    enemies.push({
      id: id * 1000 + 999,
      type: 'boss' as EnemyType,
      x: 720,
      y: 180,
      width: isFinalBoss ? 110 : 85,
      height: isFinalBoss ? 110 : 85,
      speed: isFinalBoss ? 3.5 : 2.5 + (id / 10) * 0.2,
      range: 220,
      startX: 720,
      health: isFinalBoss ? 15 : 4 + Math.floor(id / 10) * 2
    });
  } else {
    // Determine thematic enemy types
    let enemyType1: EnemyType = 'goomba';
    let enemyType2: EnemyType = 'koopa';
    let enemyType3: EnemyType = 'goomba';

    if (themeKey === 'spooky') {
      enemyType1 = 'ghost';
      enemyType2 = 'ghost';
      enemyType3 = 'ghost';
    } else if (themeKey === 'space') {
      enemyType1 = 'alien';
      enemyType2 = 'alien';
      enemyType3 = 'alien';
    } else if (themeKey === 'cybercity') {
      enemyType1 = 'drone';
      enemyType2 = 'drone';
      enemyType3 = 'drone';
    } else if (themeKey === 'steampunk') {
      enemyType1 = 'clockwork_soldier';
      enemyType2 = 'clockwork_soldier';
      enemyType3 = 'clockwork_soldier';
    } else if (themeKey === 'candy') {
      enemyType1 = 'gummy_bear';
      enemyType2 = 'gummy_bear';
      enemyType3 = 'gummy_bear';
    } else if (themeKey === 'cyber_atlantis') {
      enemyType1 = 'angler_robot';
      enemyType2 = 'angler_robot';
      enemyType3 = 'angler_robot';
    } else if (themeKey === 'void_nebula') {
      enemyType1 = 'void_eye';
      enemyType2 = 'void_eye';
      enemyType3 = 'void_eye';
    } else if (themeKey === 'sky_pagoda') {
      enemyType1 = 'wind_spirit';
      enemyType2 = 'wind_spirit';
      enemyType3 = 'wind_spirit';
    } else if (themeKey === 'primal_jungle') {
      enemyType1 = 'raptor';
      enemyType2 = 'raptor';
      enemyType3 = 'raptor';
    } else if (themeKey === 'cryo_cave') {
      enemyType1 = 'cryo_slime';
      enemyType2 = 'cryo_slime';
      enemyType3 = 'cryo_slime';
    } else if (themeKey === 'retrowave_highway') {
      enemyType1 = 'neon_vector_car';
      enemyType2 = 'neon_vector_car';
      enemyType3 = 'neon_vector_car';
    } else if (themeKey === 'pirate') {
      enemyType1 = 'grumpy_pirate';
      enemyType2 = 'grumpy_pirate';
      enemyType3 = 'grumpy_pirate';
    } else if (themeKey === 'prison' || themeKey === 'lab') {
      enemyType1 = 'guard';
      enemyType2 = 'guard';
      enemyType3 = 'guard';
    } else if (isUnderwater) {
      enemyType1 = 'fish';
      enemyType2 = 'crab';
      enemyType3 = 'fish';
    } else if (themeKey === 'river') {
      enemyType1 = id % 2 === 0 ? 'fish' : 'goomba';
      enemyType2 = 'koopa';
      enemyType3 = 'fish';
    } else {
      enemyType1 = id % 2 === 0 ? 'goomba' : 'koopa';
      enemyType2 = id % 3 === 0 ? 'koopa' : 'goomba';
      enemyType3 = id % 2 === 0 ? 'crab' : 'goomba';
    }

    // Normal level enemies - fully bound to the physical ground and platforms
    enemies.push({
      id: id + 100,
      type: enemyType1,
      x: 520,
      y: (isUnderwater || themeKey === 'spooky') ? 220 : 240, // spawned properly near platform heights/floors
      width: 40,
      height: 40,
      speed: 1 + id * 0.04,
      range: 120 + (id % 5) * 10,
      startX: 520
    });

    if (id > 4) {
      enemies.push({
        id: id + 200,
        type: enemyType2,
        x: 310,
        y: (isUnderwater || themeKey === 'spooky') ? 180 : 310,
        width: 40,
        height: 40,
        speed: 1.5,
        range: 100,
        startX: 310
      });
    }

    if (id > 15) {
      enemies.push({
        id: id + 300,
        type: enemyType3,
        x: 780,
        y: (isUnderwater || themeKey === 'spooky') ? 200 : 180,
        width: 40,
        height: 40,
        speed: 1.8,
        range: 90,
        startX: 780
      });
    }
  }

  // Level name branding based on theme and boss landmarks
  let name = "";
  if (id === 80) {
    name = "Ultimate Giga Castle [80]";
  } else if (id % 10 === 0) {
    const castleNames = [
      "Fortress Prime", 
      "Gears Factory", 
      "Cyber Citadel", 
      "Depths Bastion", 
      "Sandstone Temple", 
      "Island Keep", 
      "Glacier Sanctum", 
      "Mushroom Spire"
    ];
    name = `${castleNames[Math.floor(id / 10) - 1] || "Overlord Citadel"} [${id}]`;
  } else {
    const formattedTheme = themeKey.charAt(0).toUpperCase() + themeKey.slice(1);
    let displayName = formattedTheme;
    if (themeKey === 'snowy') displayName = "Snowy Mountains";
    if (themeKey === 'mushroom') displayName = "Mushroom Jungle";
    if (themeKey === 'egypt') displayName = "Ancient Egypt";
    if (themeKey === 'park') displayName = "Children's Park";
    if (themeKey === 'stadium') displayName = "Speedway Stadium";
    if (themeKey === 'space') displayName = "Cosmic Space";
    if (themeKey === 'cybercity') displayName = "Cyberpunk Neon City";
    if (themeKey === 'steampunk') displayName = "Steampunk Clockwork Tower";
    if (themeKey === 'cyber_atlantis') displayName = "Sunken Cyber-Atlantis";
    if (themeKey === 'void_nebula') displayName = "Cosmic Nebula Void";
    if (themeKey === 'sky_pagoda') displayName = "Shattered Pagoda Clouds";
    if (themeKey === 'primal_jungle') displayName = "Prehistoric Giant Jungle";
    if (themeKey === 'cryo_cave') displayName = "Cyber-Neon Glacial Cave";
    if (themeKey === 'retrowave_highway') displayName = "Retro Retrowave Highway";
    name = `${displayName} Zone ${id}`;
  }

  // Position coins procedurally
  const coins = [
    { id: id * 100 + 1, x: 230, y: 230 - (id % 3) * 10, collected: false },
    { id: id * 100 + 2, x: 270, y: 200 - (id % 3) * 10, collected: false },
    { id: id * 100 + 3, x: 310, y: 230 - (id % 3) * 10, collected: false },
    
    { id: id * 100 + 4, x: 480, y: 150 + (id % 2) * 10, collected: false },
    { id: id * 100 + 5, x: 520, y: 150 + (id % 2) * 10, collected: false },
    
    { id: id * 100 + 6, x: 760, y: 90 + (id % 3) * 5, collected: false },
    
    { id: id * 100 + 7, x: 770, y: 170, collected: false },
    { id: id * 100 + 8, x: 810, y: 170, collected: false },
    { id: id * 100 + 9, x: 850, y: 170, collected: false },
    
    { id: id * 100 + 10, x: 425, y: 400, collected: false },
    { id: id * 100 + 11, x: 455, y: 400, collected: false },
    { id: id * 100 + 12, x: 600, y: 400, collected: false },
    { id: id * 100 + 13, x: 630, y: 400, collected: false },
  ];

  // Procedural Blocks (boxes to hit/break)
  const blocks = [
    { id: id * 1000 + 1, x: 230, y: 300, width: 40, height: 40, type: 'question' as const, content: 'mushroom' as const, isHit: false },
    { id: id * 1000 + 2, x: 270, y: 300, width: 40, height: 40, type: 'brick' as const, content: 'coin' as const, isHit: false },
    { id: id * 1000 + 3, x: 310, y: 300, width: 40, height: 40, type: 'brick' as const, content: 'coin' as const, isHit: false },
    { id: id * 1000 + 4, x: 480, y: 220, width: 40, height: 40, type: 'exclamation' as const, content: 'fireflower' as const, isHit: false },
    { id: id * 1000 + 5, x: 520, y: 220, width: 40, height: 40, type: 'question' as const, content: 'coin' as const, isHit: false },
    { id: id * 1000 + 6, x: 760, y: 150, width: 40, height: 40, type: 'question' as const, content: 'iceflower' as const, isHit: false },
    { id: id * 1000 + 7, x: 350, y: 200, width: 40, height: 40, type: 'exclamation' as const, content: 'star' as const, isHit: false },
    { id: id * 1000 + 8, x: 640, y: 220, width: 40, height: 40, type: 'question' as const, content: 'minimushroom' as const, isHit: false }
  ];

  return {
    id,
    name,
    theme: themeKey,
    gravity: config.grav,
    jumpStrength: config.jump,
    backgroundColor: config.colors,
    platforms,
    coins,
    enemies,
    blocks,
    powerUps: [],
    checkpoint: { x: 500, y: 280, reached: false },
    flagPole: { x: 920, y: 450 }
  };
}

export const LEVELS: Level[] = Array.from({ length: 80 }, (_, i) => generateLevel(i + 1));

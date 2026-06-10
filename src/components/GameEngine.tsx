import React, { useEffect, useRef, useState } from "react";
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  MOVE_SPEED, 
  INITIAL_PLAYER, 
  LEVELS
} from "@/src/constants";
import { Player, Platform, Coin, Level, Enemy, PowerUpItem, Projectile, GameBlock, PowerUpType } from "@/src/types";
import HUD from "./HUD";
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown,
  Monitor, 
  Smartphone,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Tv,
  Music,
  Download,
  X,
  Home,
  LayoutGrid,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { audioEngine } from "@/src/utils/audio";

// Centralized Sound Effect Manager for robust, high-fidelity player gameplay feedback
export const soundEffectManager = {
  playJump(): void {
    audioEngine.playJump();
  },
  playCoin(): void {
    audioEngine.playCoin();
  },
  playDash(): void {
    audioEngine.playDash();
  }
};

// Simple Hex color interpolation helper for day-to-night transitions
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const cleanHex = (c: string) => {
    let raw = c.replace('#', '');
    if (raw.length === 3) {
      raw = raw.split('').map(x => x + x).join('');
    }
    return raw;
  };
  try {
    const hex1 = cleanHex(color1);
    const hex2 = cleanHex(color2);
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch (e) {
    return color1;
  }
};

export const CHARACTERS: Record<string, {
  id: string;
  name: string;
  mainColor: string;
  accentColor: string;
  lowerColor: string;
  limbColor: string;
  chestColor: string;
  iconColor: string;
}> = {
  aayu: {
    id: "aayu",
    name: "Aayu",
    mainColor: "#f8fafc",
    accentColor: "#3b82f6", // Blue robot
    lowerColor: "#e0f2fe",
    limbColor: "#1d4ed8",
    chestColor: "#0284c7",
    iconColor: "text-blue-500 bg-blue-500/10 border-blue-500/20"
  },
  aaru: {
    id: "aaru",
    name: "Aaru",
    mainColor: "#fff5f5",
    accentColor: "#ef4444", // Red robot
    lowerColor: "#fee2e2",
    limbColor: "#b91c1c",
    chestColor: "#f97316",
    iconColor: "text-red-500 bg-red-500/10 border-red-500/20"
  },
  rishu: {
    id: "rishu",
    name: "Rishu",
    mainColor: "#fffaf0",
    accentColor: "#f97316", // Orange robot
    lowerColor: "#ffedd5",
    limbColor: "#c2410c",
    chestColor: "#eab308",
    iconColor: "text-orange-500 bg-orange-500/10 border-orange-500/20"
  },
  aadi: {
    id: "aadi",
    name: "Aadi",
    mainColor: "#f0fdf4",
    accentColor: "#22c55e", // Green robot
    lowerColor: "#dcfce7",
    limbColor: "#15803d",
    chestColor: "#06b6d4",
    iconColor: "text-green-500 bg-green-500/10 border-green-500/20"
  },
  shau: {
    id: "shau",
    name: "Shau",
    mainColor: "#fdf2f8",
    accentColor: "#ec4899", // Pink robot
    lowerColor: "#fce7f3",
    limbColor: "#be185d",
    chestColor: "#db2777",
    iconColor: "text-pink-500 bg-pink-500/10 border-pink-500/20"
  },
  riu: {
    id: "riu",
    name: "Riu",
    mainColor: "#fefce8",
    accentColor: "#eab308", // Yellow robot (baby boy)
    lowerColor: "#fef9c3",
    limbColor: "#a16207",
    chestColor: "#f59e0b",
    iconColor: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
  }
};

export default function GameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedChar, setSelectedChar] = useState<"aayu" | "aaru" | "rishu" | "aadi" | "shau" | "riu">("aayu");
  const [selectedSeriesGame, setSelectedSeriesGame] = useState<'platformer' | 'flappy' | 'space'>('platformer');
  
  const [unlockedChars, setUnlockedChars] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sa_unlocked_chars");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.includes("aayu")) {
          return parsed;
        }
      }
    } catch (e) {}
    return ["aayu"];
  });

  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const helperDialogueRef = useRef<{ text: string, timer: number }>({ text: "", timer: 0 });

  // Progressive lock states
  const [highestClassicUnlocked, setHighestClassicUnlocked] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sa_highest_classic_unlocked");
      if (saved) return Math.max(0, parseInt(saved, 10));
    } catch (e) {}
    return 0; // Starts with Level 1 (index 0)
  });

  const [highestCyberUnlocked, setHighestCyberUnlocked] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sa_highest_cyber_unlocked");
      if (saved) return Math.max(40, parseInt(saved, 10));
    } catch (e) {}
    return 40; // Starts with Level 41 (index 40)
  });

  const [isCyberUnlocked, setIsCyberUnlocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sa_cyber_unlocked");
      if (saved) return saved === "true";
    } catch (e) {}
    return false; // Cyber Episode starts locked for normal campaign progression!
  });

  const [isLevelClear, setIsLevelClear] = useState<boolean>(false);
  const isLoopActiveRef = useRef<boolean>(false);
  const hasPlayedLevelClearRef = useRef<boolean>(false);

  const [rescuerName, setRescuerName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("sa_rescuer_name");
      if (saved) return saved;
    } catch (e) {}
    return "Aaryan"; // Default name
  });

  const [activeSavedHeroUnlock, setActiveSavedHeroUnlock] = useState<{
    unlockedHeroId: string;
    activeHeroId: string;
    level: number;
  } | null>(null);

  const [isCreditsActive, setIsCreditsActive] = useState(false);
  const [lockedCyberPrompt, setLockedCyberPrompt] = useState(false);

  // Dynamic interactive Game Teaser Trailer states
  const [isTrailerActive, setIsTrailerActive] = useState(false);
  const [trailerScene, setTrailerScene] = useState(0);
  const [trailerTimer, setTrailerTimer] = useState(0);
  const [isExportingAudio, setIsExportingAudio] = useState(false);

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  useEffect(() => {
    hasPlayedLevelClearRef.current = false;
    setIsLevelClear(false);
  }, [currentLevelIndex]);
  const [showTitleLevelSelect, setShowTitleLevelSelect] = useState(false);
  const [allLevelsUnlocked, setAllLevelsUnlocked] = useState(true); // Default true so all 80+ levels are instantly selectable!
  const [isSequelMode, setIsSequelMode] = useState(false); // Default false so they start Classic!
  const [gameMode, setGameMode] = useState<'story' | 'racing' | 'adventure' | 'lava' | 'prison' | 'spooky'>('story');
  const originalLevelIndexBeforePipeRef = useRef<number | null>(null);
  const rivalXRef = useRef<number>(100);
  const rivalYRef = useRef<number>(300);
  const rivalSpeedRef = useRef<number>(2.2);
  const opponentsRef = useRef<Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    speed: number;
    mainColor: string;
    accentColor: string;
    lowerColor: string;
    limbColor: string;
    chestColor: string;
    shieldTimer?: number;
    spinAngle?: number;
    dy?: number;
  }>>([]);
  const [rivalWinningState, setRivalWinningState] = useState<'none' | 'player' | 'rival'>('none');
  const [isKeyRequired, setIsKeyRequired] = useState(false); // Defaults to false! Bypasses glitched gate key blocks
  const keyRef = useRef<{ x: number, y: number, collected: boolean } | null>(null);
  const [keyCollected, setKeyCollected] = useState(false);
  const [dashCooldown, setDashCooldown] = useState(0);
  const [keyWarning, setKeyWarning] = useState(0);
  const [activePowerUpState, setActivePowerUpState] = useState<'normal' | 'mushroom' | 'fire' | 'ice' | 'mini'>('normal');

  const [gameState, setGameState] = useState({
    score: 0,
    isWin: false,
    isGameOver: false,
    lives: INITIAL_PLAYER.lives,
  });
  const [isStarted, setIsStarted] = useState(false);
  const [tvMode, setTvMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(() => audioEngine.getVolume());
  const [thankYouBgm, setThankYouBgm] = useState<string>('beach');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const playerIdleTicksRef = useRef<number>(0);
  const playerSpokenRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Automated sequential scene timber for the Interactive Teaser Trailer
  useEffect(() => {
    if (!isTrailerActive) {
      if (isStarted && !isMuted) {
        if (activeSavedHeroUnlock) {
          audioEngine.stopBgm();
        } else {
          const activeTheme = LEVELS[currentLevelIndex].id % 10 === 0 ? "boss" : LEVELS[currentLevelIndex].theme;
          audioEngine.playBgm(activeTheme);
        }
      }
      return;
    }

    // Sound alert when cinematic starts
    audioEngine.stopBgm();
    audioEngine.playCheckpoint();
    setTrailerScene(0);
    setTrailerTimer(0);

    const interval = setInterval(() => {
      setTrailerTimer(t => {
        const nextTime = t + 1;
        // Progress scene triggers based on duration landmarks
        if (nextTime === 5) {
          setTrailerScene(1);
          audioEngine.playCoin();
        } else if (nextTime === 10) {
          setTrailerScene(2);
          audioEngine.playJump();
        } else if (nextTime === 16) {
          setTrailerScene(3);
          audioEngine.playDeath();
        } else if (nextTime === 22) {
          setTrailerScene(4);
          audioEngine.playCheckpoint();
        } else if (nextTime === 29) {
          setTrailerScene(5);
          audioEngine.playStomp();
        } else if (nextTime === 36) {
          setTrailerScene(6);
          audioEngine.playCheckpoint();
        } else if (nextTime === 42) {
          setTrailerScene(7);
          audioEngine.playLevelClear();
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTrailerActive, isStarted, isMuted, currentLevelIndex, activeSavedHeroUnlock, thankYouBgm]);

  const togglePause = () => {
    if (!isStarted || gameState.isGameOver || gameState.isWin) return;
    setIsPaused(prev => {
      const next = !prev;
      isPausedRef.current = next;
      if (next) {
        audioEngine.stopBgm();
      } else {
        if (!isMuted) {
          const currentLevel = LEVELS[currentLevelIndex];
          const activeTheme = currentLevel.id % 10 === 0 ? "boss" : currentLevel.theme;
          audioEngine.playBgm(activeTheme);
        }
      }
      return next;
    });
  };

  const level = LEVELS[currentLevelIndex];

  // Mutable game state
  const playerRef = useRef<Player>({ 
    ...INITIAL_PLAYER,
    powerUp: 'normal',
    starTimer: 0,
    shieldTimer: 0
  });
  const platformsRef = useRef<Platform[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const powerUpsRef = useRef<PowerUpItem[]>([]);
  const blocksRef = useRef<GameBlock[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const bossFireballsRef = useRef<Array<{ id: number, x: number, y: number, vx: number, vy: number, width: number, height: number, isMini?: boolean }>>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const gamepadPausePressedRef = useRef<boolean>(false);
  const gamepadJumpPressedRef = useRef<boolean>(false);
  const gamepadShootPressedRef = useRef<boolean>(false);
  const particlesRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);
  const facingLeftRef = useRef<boolean>(false);
  const wasStarActiveRef = useRef<boolean>(false);
  const lastSpokenRef = useRef<Record<number, number>>({});
  const lavaYRef = useRef<number>(500);
  const alarmTimerRef = useRef<number>(0);
  const spookyGhostSpawnTimerRef = useRef<number>(300);

  // --- CPU AUTOPILOT CO-OP PARTNER CONTROLS ---
  const [isCpuActive, setIsCpuActive] = useState<boolean>(false);
  const cpuActiveRef = useRef<boolean>(false);
  const cpuPlayerRef = useRef<Player>({
    ...INITIAL_PLAYER,
    x: 100,
    y: 350,
    dx: 0,
    dy: 0,
    width: 44,
    height: 54,
    grounded: false,
    isDead: false,
    powerUp: 'normal',
    starTimer: 0,
    shieldTimer: 0
  });

  useEffect(() => {
    cpuActiveRef.current = isCpuActive;
    if (isCpuActive) {
      // Spawn near player
      cpuPlayerRef.current.x = playerRef.current.x - 60;
      cpuPlayerRef.current.y = playerRef.current.y - 10;
      cpuPlayerRef.current.isDead = false;
    }
  }, [isCpuActive]);

  // --- FLAPPY SAVIOR SPIN-OFF REFS & LOCAL STATE ---
  const flappyYRef = useRef<number>(200);
  const flappyVyRef = useRef<number>(0);
  const flappyPipesRef = useRef<{ x: number; gapY: number; width: number; passed: boolean }[]>([]);
  const flappyCoinsRef = useRef<{ x: number; y: number; collected: boolean }[]>([]);
  const flappyScoreRef = useRef<number>(0);
  const flappyHighScoreRef = useRef<number>(() => {
    try {
      const saved = localStorage.getItem("sa_flappy_highscore");
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) { return 0; }
  });
  const flappyIsGameOverRef = useRef<boolean>(false);
  const flappyFrameCountRef = useRef<number>(0);

  // --- SPACE BLASTER INVASION SPIN-OFF REFS & LOCAL STATE ---
  const spaceXRef = useRef<number>(500); // starts at horizontal center
  const spaceStarsRef = useRef<{ x: number; y: number; speed: number }[]>([]);
  const spaceLasersRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const spaceAsteroidsRef = useRef<{ id: number; x: number; y: number; size: number; speed: number; hp: number; maxHp: number }[]>([]);
  const spaceDronesRef = useRef<{ id: number; x: number; y: number; vx: number; vy: number; width: number; height: number; hp: number; maxHp: number; angle: number }[]>([]);
  const spaceParticlesRef = useRef<{ x: number; y: number; size: number; color: string; speedX: number; speedY: number; alpha: number }[]>([]);
  const spaceScoreRef = useRef<number>(0);
  const spaceHighScoreRef = useRef<number>(() => {
    try {
      const saved = localStorage.getItem("sa_space_highscore");
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) { return 0; }
  });
  const spaceLivesRef = useRef<number>(5);
  const spaceIsGameOverRef = useRef<boolean>(false);
  const spaceFlashTimerRef = useRef<number>(0);
  const spaceFrameCountRef = useRef<number>(0);

  // Sync selected character's base sizing and powerUp state
  useEffect(() => {
    const isMiniChar = selectedChar === "riu";
    playerRef.current.powerUp = isMiniChar ? 'mini' : 'normal';
    playerRef.current.width = isMiniChar ? 18 : 44;
    playerRef.current.height = isMiniChar ? 22 : 54;
    
    playerRef.current.x = INITIAL_PLAYER.x;
    playerRef.current.y = INITIAL_PLAYER.y;
    playerRef.current.dy = 0;
  }, [selectedChar]);

  // Track mute changes
  useEffect(() => {
    audioEngine.setMute(isMuted);
    if (!isMuted) {
      if (activeSavedHeroUnlock) {
        audioEngine.stopBgm();
      } else if (isStarted) {
        // Refresh current BGM
        const currentLevel = LEVELS[currentLevelIndex];
        const activeTheme = currentLevel.id % 10 === 0 ? "boss" : currentLevel.theme;
        audioEngine.playBgm(activeTheme);
      } else {
        // Play the cool 8-Bit chiptune title screen theme!
        audioEngine.playBgm('title');
      }
    } else {
      audioEngine.stopBgm();
    }
  }, [isMuted, isStarted, currentLevelIndex, activeSavedHeroUnlock, thankYouBgm]);

  // Initialize level
  useEffect(() => {
    const currentLevel = LEVELS[currentLevelIndex];
    
    // Reset lava level
    lavaYRef.current = GAME_HEIGHT + 100;
    
    // Reset key and warning triggers
    setKeyCollected(false);
    setKeyWarning(0);
    setDashCooldown(0);

    // Dynamic Sequel decorations (Moving Platforms, Springboards)
    if (isSequelMode) {
      const clonedPlatforms = currentLevel.platforms.map((p, index) => {
        const copy = { ...p };
        // Any floaty block of medium size (not the gigantic floor base) can slide!
        if (p.width < 1000) {
          if (index === 1) { // slide horizontal
            copy.isMoving = true;
            copy.startX = p.x;
            copy.startY = p.y;
            copy.rangeX = Math.min(150, p.x); // wiggle room
            copy.rangeY = 0;
            copy.speed = 1.5;
            copy.dir = 1;
          } else if (index === 2) { // slide vertical
            copy.isMoving = true;
            copy.startX = p.x;
            copy.startY = p.y;
            copy.rangeX = 0;
            copy.rangeY = 70;
            copy.speed = 1.0;
            copy.dir = 1;
          }
        }
        return copy;
      });

      // Inject custom springboard launchers
      clonedPlatforms.push({
        x: 340,
        y: 435,
        width: 38,
        height: 15,
        isSpring: true,
        color: "#f43f5e" // beautiful raspberry spring indicator
      });
      if (currentLevelIndex > 1) {
        clonedPlatforms.push({
          x: 680,
          y: 435,
          width: 38,
          height: 15,
          isSpring: true,
          color: "#06b6d4" // cyber cyan springboard
        });
      }

      platformsRef.current = clonedPlatforms;

      // Position the gate key rotating near a high level platform (e.g. index 2 or 3)
      const targetPlat = currentLevel.platforms[2] || currentLevel.platforms[1] || currentLevel.platforms[0];
      keyRef.current = {
        x: targetPlat ? (targetPlat.x + targetPlat.width / 2) : 500,
        y: targetPlat ? (targetPlat.y - 45) : 200,
        collected: false
      };
      playerRef.current.hasKey = !isKeyRequired;
    } else {
      platformsRef.current = currentLevel.platforms;
      keyRef.current = null;
      playerRef.current.hasKey = true; // Classic mode has it automatically unlocked
    }

    coinsRef.current = currentLevel.coins.map(c => ({ ...c, collected: false }));
    
    // Inject game mode specific enemies
    let baseEnemies = currentLevel.enemies.map(e => ({ ...e }));
    if (gameMode === 'spooky') {
      baseEnemies.push(
        {
          id: Date.now() + 10001,
          type: 'ghost' as any,
          x: 350,
          y: 200,
          width: 40,
          height: 40,
          speed: 1.2,
          range: 150,
          startX: 350
        },
        {
          id: Date.now() + 10002,
          type: 'ghost' as any,
          x: 700,
          y: 150,
          width: 40,
          height: 40,
          speed: -1.0,
          range: 200,
          startX: 700
        }
      );
    } else if (gameMode === 'prison') {
      baseEnemies = baseEnemies.map(e => {
        if (e.type !== 'boss') {
          return { ...e, type: 'guard' as any, speed: e.speed * 1.15 };
        }
        return e;
      });
      // Add extra prison guard patrol
      baseEnemies.push({
        id: Date.now() + 20001,
        type: 'guard' as any,
        x: 450,
        y: 260,
        width: 40,
        height: 40,
        speed: 1.4,
        range: 120,
        startX: 450
      });
    }
    enemiesRef.current = baseEnemies;
    
    // Reset mode-specific states
    alarmTimerRef.current = 0;
    spookyGhostSpawnTimerRef.current = 300;
    powerUpsRef.current = currentLevel.powerUps ? currentLevel.powerUps.map(p => ({ ...p, collected: false })) : [];
    blocksRef.current = currentLevel.blocks ? currentLevel.blocks.map(b => ({ ...b, isHit: false, bumpY: 0, bumpTimer: 0 })) : [];
    projectilesRef.current = [];
    bossFireballsRef.current = [];
    
    // Reset player's checkpoint for new level
    playerRef.current.checkpointX = INITIAL_PLAYER.x;
    playerRef.current.checkpointY = INITIAL_PLAYER.y;
    playerRef.current.airJumps = 0;
    playerRef.current.dashCooldown = 0;
    playerRef.current.dashTimer = 0;

    if (currentLevel.checkpoint) {
      currentLevel.checkpoint.reached = false;
    }

    // Don't reset position if we just died (handled in death logic)
    if (!playerRef.current.isDead) {
      playerRef.current.x = INITIAL_PLAYER.x;
      playerRef.current.y = INITIAL_PLAYER.y;
      playerRef.current.dy = 0;
    }

    if (currentLevel.theme === 'underwater') {
      particlesRef.current = Array.from({ length: 20 }, () => ({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1 + 0.5
      }));
    } else {
      particlesRef.current = [];
    }

    // Play/Switch BGM
    if (!isMuted) {
      if (isStarted) {
        const activeTheme = currentLevel.id % 10 === 0 ? "boss" : currentLevel.theme;
        audioEngine.playBgm(activeTheme);
      } else {
        audioEngine.playBgm('title');
      }
    }

    // Initialize Racing Mode parameters
    setRivalWinningState('none');
    rivalXRef.current = 90;
    rivalYRef.current = 300;
    rivalSpeedRef.current = 1.9 + (currentLevel.id % 4) * 0.18 + Math.floor(currentLevel.id / 15) * 0.12;

    const opponentChars = Object.values(CHARACTERS).filter(c => c.id !== selectedChar);
    opponentsRef.current = opponentChars.slice(0, 3).map((char, index) => {
      const baseSpeed = 1.6 + (currentLevel.id % 4) * 0.15 + Math.floor(currentLevel.id / 15) * 0.11;
      const individualSpeed = baseSpeed + (index * 0.14) - 0.08;
      return {
        id: char.id,
        name: char.name,
        x: 90 - index * 30, // Staggered start grid of formula cars!
        y: 300,
        speed: individualSpeed,
        mainColor: char.mainColor,
        accentColor: char.accentColor,
        lowerColor: char.lowerColor,
        limbColor: char.limbColor,
        chestColor: char.chestColor
      };
    });

    return () => {
      audioEngine.stopBgm();
    };
  }, [currentLevelIndex, isStarted, isSequelMode, isKeyRequired, selectedChar]);

  const handleInstantPowerUp = (power: 'normal' | 'mushroom' | 'fire' | 'ice' | 'mini') => {
    const player = playerRef.current;
    if (!player) return;
    player.powerUp = power;
    if (power === 'mushroom' || power === 'fire' || power === 'ice') {
      player.width = 54;
      player.height = 66;
    } else if (power === 'mini') {
      player.width = 18;
      player.height = 22;
    } else {
      player.width = 44;
      player.height = 54;
    }

    audioEngine.playCheckpoint();
    setGameState(prev => ({ ...prev }));
    setActivePowerUpState(power);
  };

  const initFlappyGame = () => {
    flappyYRef.current = 200;
    flappyVyRef.current = 0;
    flappyPipesRef.current = [
      { x: 500,  gapY: 180, width: 44, passed: false },
      { x: 750,  gapY: 240, width: 44, passed: false },
      { x: 1000, gapY: 150, width: 44, passed: false }
    ];
    flappyCoinsRef.current = [
      { x: 500,  y: 180, collected: false },
      { x: 750,  y: 240, collected: false },
      { x: 1000, y: 150, collected: false }
    ];
    flappyScoreRef.current = 0;
    flappyIsGameOverRef.current = false;
    flappyFrameCountRef.current = 0;
    setGameState({ score: 0, isWin: false, isGameOver: false, lives: 1 });
  };

  const initSpaceGame = () => {
    spaceXRef.current = 500;
    spaceLasersRef.current = [];
    spaceAsteroidsRef.current = [
      { id: 1, x: 250, y: 50, size: 28, speed: 1.5, hp: 1, maxHp: 1 },
      { id: 2, x: 500, y: -100, size: 36, speed: 2.0, hp: 2, maxHp: 2 },
      { id: 3, x: 750, y: 20, size: 24, speed: 1.2, hp: 1, maxHp: 1 }
    ];
    spaceDronesRef.current = [];
    spaceParticlesRef.current = [];
    spaceScoreRef.current = 0;
    spaceLivesRef.current = 5;
    spaceIsGameOverRef.current = false;
    spaceFlashTimerRef.current = 0;
    spaceFrameCountRef.current = 0;
    
    spaceStarsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      speed: Math.random() * 2 + 0.8
    }));
    setGameState({ score: 0, isWin: false, isGameOver: false, lives: 5 });
  };

  const resetGame = () => {
    if (selectedSeriesGame === 'flappy') {
      initFlappyGame();
      return;
    }
    if (selectedSeriesGame === 'space') {
      initSpaceGame();
      return;
    }

    wasStarActiveRef.current = false;
    lavaYRef.current = GAME_HEIGHT + 100;
    const isMiniChar = selectedChar === "riu";
    playerRef.current = { 
      ...INITIAL_PLAYER,
      powerUp: isMiniChar ? 'mini' : 'normal',
      width: isMiniChar ? 18 : 44,
      height: isMiniChar ? 22 : 54,
      starTimer: 0,
      shieldTimer: 0
    };

    setCurrentLevelIndex(0);
    setIsLevelClear(false);
    setGameState({ score: 0, isWin: false, isGameOver: false, lives: INITIAL_PLAYER.lives });
  };

  const wasSpaceDownRef = useRef<boolean>(false);

  // --- HELPERS TO DRAW CHOSEN ROBOT CHARACTER ON CANVAS ---
  const drawRobotOnCanvas = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number = 0,
    withThrust: boolean = false
  ) => {
    const char = CHARACTERS[selectedChar] || CHARACTERS.aayu;
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angle);

    // Thrust flames
    if (withThrust && Math.random() < 0.6) {
      ctx.fillStyle = Math.random() < 0.5 ? "#f97316" : "#ef4444";
      ctx.beginPath();
      ctx.moveTo(-10, 15);
      ctx.lineTo(0, 32 + Math.random() * 8);
      ctx.lineTo(10, 15);
      ctx.closePath();
      ctx.fill();

      // Core thruster white light
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 16, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow underneath (if not rotated too much)
    ctx.fillStyle = "rgba(15, 23, 42, 0.15)";
    ctx.beginPath();
    ctx.ellipse(0, height / 2 + 3, width / 2 - 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Sleek metallic torso
    ctx.fillStyle = char.mainColor;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 4, -height / 2 + 15, width - 8, height - 22, 6);
    ctx.fill();
    ctx.stroke();

    // Chest reactor core
    ctx.fillStyle = char.chestColor;
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-1, 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Robot head module
    ctx.fillStyle = char.mainColor;
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 8, -height / 2 - 4, width - 16, 18, 5);
    ctx.fill();
    ctx.stroke();

    // Dark screen face plate
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 11, -height / 2, width - 22, 10, 3);
    ctx.fill();

    // Red/Blue neon eyes
    ctx.fillStyle = char.accentColor;
    ctx.beginPath();
    ctx.arc(-4, -height / 2 + 5, 2, 0, Math.PI * 2);
    ctx.arc(4, -height / 2 + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Interactive antennal light
    ctx.strokeStyle = char.accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 - 4);
    ctx.lineTo(0, -height / 2 - 11);
    ctx.stroke();

    ctx.fillStyle = char.accentColor;
    ctx.beginPath();
    ctx.arc(0, -height / 2 - 11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer aura
    if (Math.random() < 0.4) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -height / 2 - 11, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Cute metallic arms
    ctx.fillStyle = char.limbColor;
    // Left arm
    ctx.beginPath();
    ctx.roundRect(-width / 2 - 1, -height / 2 + 18, 4, 12, 2);
    ctx.fill();
    // Right arm
    ctx.beginPath();
    ctx.roundRect(width / 2 - 3, -height / 2 + 18, 4, 12, 2);
    ctx.fill();

    ctx.restore();
  };

  const updateFlappy = (ctx: CanvasRenderingContext2D, keys: Record<string, boolean>) => {
    const isPaused = isPausedRef.current;
    if (!isPaused) {
      flappyFrameCountRef.current++;
    }

    // Draw cyber industrial scrolling background
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, "#0f171c");
    bgGrad.addColorStop(1, "#1e2932");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid lines scrolling left of screen
    ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
    ctx.lineWidth = 1;
    const scrollOffset = (flappyFrameCountRef.current * 3.2) % 45;
    for (let x = -scrollOffset; x < GAME_WIDTH; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y);
      ctx.stroke();
    }

    // Space/Up/Click tap triggers jump
    const isFlapping = !isPaused && (keys["Space"] || keys["ArrowUp"] || keys["KeyW"]);
    if (isFlapping) {
      if (!wasSpaceDownRef.current && !flappyIsGameOverRef.current) {
        flappyVyRef.current = -6.2;
        audioEngine.playJump();
        // Spawn booster smoke particles
        for (let i = 0; i < 4; i++) {
          particlesRef.current.push({
            x: 180 + 10,
            y: flappyYRef.current + 28,
            size: Math.random() * 3.5 + 2,
            speed: Math.random() * -1.8 - 0.5
          });
        }
      }
      wasSpaceDownRef.current = true;
    } else {
      wasSpaceDownRef.current = false;
    }

    // Physics
    if (!flappyIsGameOverRef.current && !isPaused) {
      flappyVyRef.current += 0.32; // gravity
      flappyYRef.current += flappyVyRef.current;

      // Restrict Y boundaries
      if (flappyYRef.current < 5) {
        flappyYRef.current = 5;
        flappyVyRef.current = 0.5;
      }
      if (flappyYRef.current > 420) {
        // crash and Game over
        flappyIsGameOverRef.current = true;
        audioEngine.playDeath();
        setGameState(prev => ({ ...prev, isGameOver: true }));
      }

      // Procedural obstacle gate spawn
      if (flappyFrameCountRef.current % 115 === 0) {
        const obstacleY = Math.floor(Math.random() * 190) + 120; // middle center of the opening gap
        flappyPipesRef.current.push({
          x: GAME_WIDTH,
          gapY: obstacleY,
          width: 52,
          passed: false
        });

        // Spawn bonus coin inside gap centered sometimes!
        if (Math.random() < 0.7) {
          flappyCoinsRef.current.push({
            x: GAME_WIDTH + 26,
            y: obstacleY,
            collected: false
          });
        }
      }

      // Update Pipes / Cyber industrial gates
      flappyPipesRef.current.forEach(gate => {
        gate.x -= 3.5; // scroll speed
        
        // collision check
        const playerX = 180;
        const playerY = flappyYRef.current;
        const playerW = 32;
        const playerH = 34;

        const gapHalf = 67; // 135 / 2
        const topPipeH = gate.gapY - gapHalf;
        const btmPipeY = gate.gapY + gapHalf;

        // check top pillar overlap
        const hitTop = (
          playerX < gate.x + gate.width &&
          playerX + playerW > gate.x &&
          playerY < topPipeH
        );
        // check bottom pillar overlap
        const hitBottom = (
          playerX < gate.x + gate.width &&
          playerX + playerW > gate.x &&
          playerY + playerH > btmPipeY
        );

        if (hitTop || hitBottom) {
          flappyIsGameOverRef.current = true;
          audioEngine.playDeath();
          setGameState(prev => ({ ...prev, isGameOver: true }));
        }

        // Passed marker
        if (!gate.passed && gate.x + gate.width < playerX) {
          gate.passed = true;
          flappyScoreRef.current += 10; // 10 points per barrier passed
          audioEngine.playCoin();
          
          // Update high score
          if (flappyScoreRef.current > flappyHighScoreRef.current) {
            flappyHighScoreRef.current = flappyScoreRef.current;
            try {
              localStorage.setItem("sa_flappy_highscore", String(flappyScoreRef.current));
            } catch (e) {}
          }

          // Sync score
          setGameState(prev => ({ ...prev, score: flappyScoreRef.current }));
        }
      });

      // Filter out old pipes
      flappyPipesRef.current = flappyPipesRef.current.filter(g => g.x > -80);

      // Scroll Coins
      flappyCoinsRef.current.forEach(coin => {
        coin.x -= 3.5;

        // Collision check
        const playerX = 180;
        const playerY = flappyYRef.current;
        const dist = Math.hypot((coin.x - (playerX + 16)), (coin.y - (playerY + 17)));
        if (!coin.collected && dist < 25) {
          coin.collected = true;
          flappyScoreRef.current += 50; // Extra bonus scoring!
          audioEngine.playCheckpoint(); // play checkpoint ding sound for coin bonus
          
          // Sync score
          setGameState(prev => ({ ...prev, score: flappyScoreRef.current }));
        }
      });
      // Filter out old and collected coins
      flappyCoinsRef.current = flappyCoinsRef.current.filter(c => c.x > -40);
    }

    // DRAW CYBER INST GATES ON CANVAS
    flappyPipesRef.current.forEach(gate => {
      const gapHalf = 67;
      const topPipeH = gate.gapY - gapHalf;
      const btmPipeY = gate.gapY + gapHalf;

      // Draw top electrical conduit
      ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
      ctx.fillRect(gate.x, 0, gate.width, topPipeH);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#0891b2";
      ctx.lineWidth = 2.5;
      
      // Top column pillar body
      ctx.beginPath();
      ctx.roundRect(gate.x + 4, -10, gate.width - 8, topPipeH + 10, [0, 0, 6, 6]);
      ctx.fill();
      ctx.stroke();

      // Top energy capacitor hub edge
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(gate.x, topPipeH - 12, gate.width, 12, [3, 3, 3, 3]);
      ctx.fill();
      ctx.stroke();

      // Bottom column pillar body
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(gate.x + 4, btmPipeY, gate.width - 8, GAME_HEIGHT - btmPipeY + 10, [6, 6, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Bottom energy capacitor hub edge
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(gate.x, btmPipeY, gate.width, 12, [3, 3, 3, 3]);
      ctx.fill();
      ctx.stroke();

      // Laser stream shooting between Hubs! (animating opacity)
      ctx.strokeStyle = Math.sin(flappyFrameCountRef.current / 4) > 0 ? "#ef4444" : "#f43f5e";
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(gate.x + gate.width / 2, topPipeH);
      ctx.lineTo(gate.x + gate.width / 2, btmPipeY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    });

    // DRAW FLAPPY SAVIOR BONUS COINS
    flappyCoinsRef.current.forEach(coin => {
      if (!coin.collected) {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.fillStyle = "#fbbf24";
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚡", 0.5, 0.5);
        ctx.restore();
      }
    });

    // DRAW EXHAUST PARTICLES
    particlesRef.current.forEach(part => {
      part.x += part.speed;
      part.size *= 0.95;
      
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
    });
    // Clear dead particles
    particlesRef.current = particlesRef.current.filter(p => p.size > 0.5);

    // DRAW PLAYER ROBOT (Slightly rotating based on vertical velocity)
    const angle = Math.max(-0.4, Math.min(0.65, flappyVyRef.current * 0.08));
    drawRobotOnCanvas(ctx, 180, flappyYRef.current, 32, 34, angle, flappyVyRef.current < 0);

    // DRAW TOP HUD DISPLAY
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(14, 14, 210, 42, 12);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText(`FLAPPY SCORE: ${flappyScoreRef.current}`, 25, 30);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillText(`PERSONAL BEST: ${flappyHighScoreRef.current}`, 25, 43);

    // DRAW HELP TIPS IF GAME RUNNING
    if (!flappyIsGameOverRef.current) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText("PRESS [SPACE] / [UP] ARROW OF JUMP BUTTON TO FLY!", 420, 32);
    }
  };

  const updateSpace = (ctx: CanvasRenderingContext2D, keys: Record<string, boolean>) => {
    const isPaused = isPausedRef.current;
    if (!isPaused) {
      spaceFrameCountRef.current++;
    }

    // Draw galaxy nebula background
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "#0c0a21";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw starry vector field
    spaceStarsRef.current.forEach(star => {
      if (!isPaused) {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * GAME_WIDTH;
        }
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, star.speed / 3.0)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.speed * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const moveLeft = !isPaused && (keys["ArrowLeft"] || keys["KeyA"]);
    const moveRight = !isPaused && (keys["ArrowRight"] || keys["KeyD"]);

    if (!spaceIsGameOverRef.current && !isPaused) {
      if (moveLeft) spaceXRef.current = Math.max(34, spaceXRef.current - 7.2);
      if (moveRight) spaceXRef.current = Math.min(GAME_WIDTH - 34, spaceXRef.current + 7.2);

      const isFiring = keys["Space"] || keys["KeyE"] || keys["KeyX"] || keys["ArrowUp"] || keys["KeyW"];
      if (isFiring && spaceFrameCountRef.current % 12 === 0) {
        // Fire double wing cannons!
        spaceLasersRef.current.push({ x: spaceXRef.current - 14, y: 410, vx: 0, vy: -10 });
        spaceLasersRef.current.push({ x: spaceXRef.current + 14, y: 410, vx: 0, vy: -10 });
        audioEngine.playCoin(); // reusable cool sound fx
      }

      // Spawning space asteroids
      if (spaceFrameCountRef.current % 42 === 0) {
        const size = Math.random() * 26 + 14;
        spaceAsteroidsRef.current.push({
          id: Math.random(),
          x: Math.random() * (GAME_WIDTH - 80) + 40,
          y: -40,
          size: size,
          speed: Math.random() * 2 + 1.8,
          hp: size > 24 ? 2 : 1,
          maxHp: size > 24 ? 2 : 1
        });
      }

      // Spawning alien battle drones
      if (spaceFrameCountRef.current % 110 === 0) {
        spaceDronesRef.current.push({
          id: Math.random(),
          x: Math.random() * (GAME_WIDTH - 120) + 60,
          y: -50,
          vx: Math.random() * 3 - 1.5,
          vy: 1.8,
          width: 36,
          height: 28,
          hp: 3,
          maxHp: 3,
          angle: 0
        });
      }

      // Update Blaster Lasers physics
      spaceLasersRef.current.forEach(laser => {
        laser.y += laser.vy;
      });
      spaceLasersRef.current = spaceLasersRef.current.filter(l => l.y > -20);

      // Scroll and Update Asteroids
      spaceAsteroidsRef.current.forEach(ast => {
        ast.y += ast.speed;

        // Collision: Asteroid hit spaceship
        const playerX = spaceXRef.current - 20;
        const playerY = 430;
        const playerW = 40;
        const playerH = 44;

        if (
          ast.x - ast.size < playerX + playerW &&
          ast.x + ast.size > playerX &&
          ast.y - ast.size < playerY + playerH &&
          ast.y + ast.size > playerY
        ) {
          // Trigger impact
          spaceLivesRef.current--;
          spaceFlashTimerRef.current = 10;
          ast.y = GAME_HEIGHT + 200; // eliminate asteroid
          audioEngine.playDeath();

          // Spawn debris
          for (let pi = 0; pi < 12; pi++) {
            spaceParticlesRef.current.push({
              x: ast.x,
              y: ast.y - 200,
              size: Math.random() * 4 + 1.5,
              color: "#f97316",
              speedX: Math.random() * 6 - 3,
              speedY: Math.random() * 6 - 3,
              alpha: 1
            });
          }

          if (spaceLivesRef.current <= 0) {
            spaceIsGameOverRef.current = true;
            setGameState(prev => ({ ...prev, isGameOver: true }));
          } else {
            setGameState(prev => ({ ...prev, lives: spaceLivesRef.current }));
          }
        }
      });

      // Scroll and Update Alien Battle Drones
      spaceDronesRef.current.forEach(drn => {
        drn.y += drn.vy;
        drn.x += drn.vx;
        drn.angle += 0.04;

        // Oscillate back and forth horizontally
        if (drn.x < 40 || drn.x > GAME_WIDTH - 60) {
          drn.vx *= -1;
        }

        // Collision: Drone hits player
        const playerX = spaceXRef.current - 20;
        const playerY = 430;
        if (
          drn.x < playerX + 40 &&
          drn.x + drn.width > playerX &&
          drn.y < playerY + 44 &&
          drn.y + drn.height > playerY
        ) {
          spaceLivesRef.current--;
          spaceFlashTimerRef.current = 10;
          drn.y = GAME_HEIGHT + 200; // eliminate drone
          audioEngine.playDeath();

          if (spaceLivesRef.current <= 0) {
            spaceIsGameOverRef.current = true;
            setGameState(prev => ({ ...prev, isGameOver: true }));
          } else {
            setGameState(prev => ({ ...prev, lives: spaceLivesRef.current }));
          }
        }
      });

      // Collisions check: Laser intersecting elements
      spaceLasersRef.current.forEach(laser => {
        // Test asteroid intersection
        spaceAsteroidsRef.current.forEach(ast => {
          if (ast.y > -20 && ast.y < GAME_HEIGHT) {
            const dist = Math.hypot(laser.x - ast.x, laser.y - ast.y);
            if (dist < ast.size + 4) {
              laser.y = -100; // remove laser
              ast.hp--;
              
              // small hits sparks
              for (let i = 0; i < 3; i++) {
                spaceParticlesRef.current.push({
                  x: laser.x,
                  y: laser.y,
                  size: Math.random() * 2 + 1,
                  color: "#e2e8f0",
                  speedX: Math.random() * 3 - 1.5,
                  speedY: Math.random() * -2 - 1,
                  alpha: 0.8
                });
              }

              if (ast.hp <= 0) {
                // asteroid destroyed!
                ast.y = GAME_HEIGHT + 200; // remove ast
                spaceScoreRef.current += 15;
                audioEngine.playCheckpoint(); // rewarding score ding!

                // spawn major debris block
                for (let pi = 0; pi < 10; pi++) {
                  spaceParticlesRef.current.push({
                    x: ast.x,
                    y: ast.y - 200, // adjust
                    size: Math.random() * 3.5 + 1.2,
                    color: "#ca8a04",
                    speedX: Math.random() * 4 - 2,
                    speedY: Math.random() * 4 - 2,
                    alpha: 1
                  });
                }

                // Check high score limits
                if (spaceScoreRef.current > spaceHighScoreRef.current) {
                  spaceHighScoreRef.current = spaceScoreRef.current;
                  try {
                    localStorage.setItem("sa_space_highscore", String(spaceScoreRef.current));
                  } catch (e) {}
                }
                setGameState(prev => ({ ...prev, score: spaceScoreRef.current }));
              }
            }
          }
        });

        // Test drone intersection
        spaceDronesRef.current.forEach(drn => {
          if (drn.y > -20 && drn.y < GAME_HEIGHT) {
            const hitDrone = (
              laser.x > drn.x &&
              laser.x < drn.x + drn.width &&
              laser.y > drn.y &&
              laser.y < drn.y + drn.height
            );

            if (hitDrone) {
              laser.y = -100; // remove laser
              drn.hp--;

              if (drn.hp <= 0) {
                // Drone exploded!
                drn.y = GAME_HEIGHT + 200;
                spaceScoreRef.current += 50; // extra points!
                audioEngine.playCheckpoint();

                // massive particle explosion
                for (let pi = 0; pi < 15; pi++) {
                  spaceParticlesRef.current.push({
                    x: drn.x + drn.width / 2,
                    y: drn.y - 200,
                    size: Math.random() * 4 + 1.5,
                    color: "#a855f7",
                    speedX: Math.random() * 6 - 3,
                    speedY: Math.random() * 6 - 3,
                    alpha: 1
                  });
                }

                // Sync scores
                if (spaceScoreRef.current > spaceHighScoreRef.current) {
                  spaceHighScoreRef.current = spaceScoreRef.current;
                  try {
                    localStorage.setItem("sa_space_highscore", String(spaceScoreRef.current));
                  } catch (e) {}
                }
                setGameState(prev => ({ ...prev, score: spaceScoreRef.current }));
              }
            }
          }
        });
      });

      // Filter out defeated elements
      spaceAsteroidsRef.current = spaceAsteroidsRef.current.filter(a => a.y < GAME_HEIGHT + 20);
      spaceDronesRef.current = spaceDronesRef.current.filter(d => d.y < GAME_HEIGHT + 20);
    }

    // UPDATE EXPLOSION DEBRIS
    spaceParticlesRef.current.forEach(part => {
      part.x += part.speedX;
      part.y += part.speedY;
      part.alpha -= 0.035;
    });
    spaceParticlesRef.current = spaceParticlesRef.current.filter(p => p.alpha > 0);

    // Render Red Damage Flashes
    if (spaceFlashTimerRef.current > 0) {
      spaceFlashTimerRef.current--;
      ctx.fillStyle = `rgba(239, 68, 68, ${spaceFlashTimerRef.current * 0.055})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // DRAW SPACE PARTICLES
    spaceParticlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0; // reset
    });

    // DRAW SPACE LASER BLADES
    spaceLasersRef.current.forEach(laser => {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.0;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#0284c7";
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x, laser.y + 12);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // DRAW ASTEROIDS ON CANVAS
    spaceAsteroidsRef.current.forEach(ast => {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      
      // Draw procedural jagged rock shape
      ctx.fillStyle = "#4b5563";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ast.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rock details / craters
      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.arc(-ast.size * 0.3, -ast.size * 0.2, ast.size * 0.22, 0, Math.PI * 2);
      ctx.arc(ast.size * 0.2, ast.size * 0.3, ast.size * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Show tiny glowing lava cracks if multihit
      if (ast.maxHp > 1 && ast.hp === 1) {
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(10, 5);
        ctx.stroke();
      }

      ctx.restore();
    });

    // DRAW ALIEN BATTLE DRONES ON CANVAS
    spaceDronesRef.current.forEach(drn => {
      ctx.save();
      ctx.translate(drn.x + drn.width / 2, drn.y + drn.height / 2);
      
      // Spinning body armor plate
      ctx.rotate(drn.angle);
      ctx.fillStyle = "#7e22ce";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2.0;

      // Draw diamond-polygon shaped retro fighter ship
      ctx.beginPath();
      ctx.moveTo(0, -drn.height / 2);
      ctx.lineTo(drn.width / 2, 0);
      ctx.lineTo(0, drn.height / 2);
      ctx.lineTo(-drn.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing central laser eye
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // DRAW USER SPACE VESSEL
    // Center vessel at spaceXRef.current, y = 445
    if (!spaceIsGameOverRef.current) {
      const charConfig = CHARACTERS[selectedChar] || CHARACTERS.aayu;
      ctx.save();
      ctx.translate(spaceXRef.current, 445);

      // Cute spaceship propulsion rocket engines plume
      if (spaceFrameCountRef.current % 2 === 0) {
        ctx.fillStyle = Math.random() < 0.5 ? "#ef4444" : "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(-14, 15);
        ctx.lineTo(-14, 30 + Math.random() * 8);
        ctx.lineTo(-8, 15);

        ctx.moveTo(8, 15);
        ctx.lineTo(8, 30 + Math.random() * 8);
        ctx.lineTo(14, 15);
        ctx.closePath();
        ctx.fill();
      }

      // Starship wing blasters
      ctx.fillStyle = "#4b5563";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // left wing pod
      ctx.roundRect(-24, -2, 10, 16, 2);
      // right wing pod
      ctx.roundRect(14, -2, 10, 16, 2);
      ctx.fill();
      ctx.stroke();

      // Blaster nozzles tip
      ctx.fillStyle = charConfig.accentColor;
      ctx.fillRect(-22, -8, 5, 6);
      ctx.fillRect(17, -8, 5, 6);

      // Starship cockpit hull
      ctx.fillStyle = charConfig.mainColor;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(17, 14);
      ctx.lineTo(-17, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central circular robot head peeking out!
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Double glowing robot eyes peeking out
      ctx.fillStyle = charConfig.accentColor;
      ctx.beginPath();
      ctx.arc(-2.5, -0.5, 1.6, 0, Math.PI * 2);
      ctx.arc(2.5, -0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // DRAW TOP DISPLAY BAR
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(14, 14, 215, 42, 12);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText(`SPACE SCORE: ${spaceScoreRef.current}`, 25, 30);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillText(`PERSONAL BEST: ${spaceHighScoreRef.current}`, 25, 43);

    // DRAW SCI-FI TIPS
    if (!spaceIsGameOverRef.current) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillText("USE [LEFT/RIGHT] OR TAP ARROWS & PRESS SHOOT / SPACE TO BLAST!", 350, 32);
    }
  };

  const handleHome = () => {
    setIsStarted(false);
    setIsPaused(false);
    wasStarActiveRef.current = false;
    playerRef.current.starTimer = 0;
    playerRef.current.shieldTimer = 0;
    audioEngine.stopBgm();
    if (!isMuted) {
      audioEngine.playBgm('title');
    }
  };

  const handleSelectLevel = (idx: number) => {
    setIsPaused(false);
    wasStarActiveRef.current = false;
    playerRef.current.starTimer = 0;
    playerRef.current.shieldTimer = 0;
    playerRef.current.isDead = false;
    // Force reset position
    playerRef.current.x = INITIAL_PLAYER.x;
    playerRef.current.y = INITIAL_PLAYER.y;
    playerRef.current.dy = 0;

    setCurrentLevelIndex(idx);
    setGameState(prev => ({
      ...prev,
      isWin: false,
      isGameOver: false,
      // Restore default lives if they died and warped
      lives: prev.lives <= 0 ? INITIAL_PLAYER.lives : prev.lives
    }));
  };

  const handleDeath = () => {
    const player = playerRef.current;
    if (player.isDead) return;
    
    // Immune during shield timer
    if (player.shieldTimer && player.shieldTimer > 0) {
      return;
    }

    // Immune during star power
    if (player.starTimer && player.starTimer > 0) {
      return;
    }

    // Power-up downgrading rather than instant death (Mario style)
    const isRiu = selectedChar === "riu";
    if (player.powerUp === 'fire' || player.powerUp === 'ice') {
      player.powerUp = 'mushroom';
      player.shieldTimer = 90; // 1.5 seconds blinking immunity
      audioEngine.playJump(); // play hit impact sound
      return;
    } else if (player.powerUp === 'mushroom') {
      if (isRiu) {
        player.powerUp = 'mini';
        player.width = 18;
        player.height = 22;
      } else {
        player.powerUp = 'normal';
        player.width = 44;
        player.height = 54;
      }
      player.shieldTimer = 90;
      audioEngine.playJump();
      return;
    } else if (player.powerUp === 'mini' && !isRiu) {
      player.powerUp = 'normal';
      player.width = 44;
      player.height = 54;
      player.shieldTimer = 90;
      audioEngine.playJump();
      return;
    }

    wasStarActiveRef.current = false;
    player.isDead = true;
    player.deathTimer = 60; // 1 second roughly
    player.dy = -10; // Pop up on death
    
    // Keep background music playing on player death! Play cute chime alongside.
    audioEngine.playDeath();

    setGameState(prev => {
      const nextLives = prev.lives - 1;
      return {
        ...prev,
        lives: nextLives,
        isGameOver: nextLives <= 0
      };
    });
  };

  const [controlsMode, setControlsMode] = useState<'computer' | 'mobile'>('computer');

  // Auto detect touch/mobile devices
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobileDevice) {
      setControlsMode('mobile');
    }
  }, []);

  const handleJump = () => {
    if (isPausedRef.current) return;
    const activeLevel = LEVELS[currentLevelIndex];
    const player = playerRef.current;
    if (player.isDead) return;

    if (player.grounded || activeLevel.theme === 'underwater') {
      let jumpPower = activeLevel.jumpStrength;
      if (player.powerUp === 'mini') {
        jumpPower = activeLevel.jumpStrength * 1.15; // floaty higher jumps for mini State!
      }
      player.dy = jumpPower;
      player.airJumps = 0; 
      soundEffectManager.playJump();
    } else if ((isSequelMode || gameMode === 'adventure') && (!player.airJumps || player.airJumps < (gameMode === 'adventure' ? 3 : 1))) {
      // Double jump or triple jump in mid-air
      let jumpPower = activeLevel.jumpStrength * 0.95;
      if (player.powerUp === 'mini') {
        jumpPower = activeLevel.jumpStrength * 1.1; // Floatier double jump!
      }
      player.dy = jumpPower; 
      player.airJumps = (player.airJumps || 0) + 1;
      soundEffectManager.playJump();
      
      // Spawn neat jump particles directly underneath the player!
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: player.x + player.width / 2 + (Math.random() * 10 - 5),
          y: player.y + player.height,
          size: Math.random() * 3.5 + 2.5,
          speed: Math.random() * 1.5 + 1.0
        });
      }
    }
  };

  const triggerDash = () => {
    if (isPausedRef.current || (!isSequelMode && gameMode !== 'adventure')) return;
    const player = playerRef.current;
    if (player.isDead || gameState.isGameOver || gameState.isWin) return;
    if (!player.dashCooldown || player.dashCooldown <= 0) {
      player.dashTimer = 10; // active glide frames
      player.dashCooldown = 35; // re-charge frames
      player.dashDir = facingLeftRef.current ? -1 : 1;
      player.dy = 0;
      soundEffectManager.playDash(); // high tech zip/air-dash sound trigger

      // Back-flare jet particle splash
      const flareX = player.x + (player.dashDir > 0 ? 0 : player.width);
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: flareX,
          y: player.y + Math.random() * player.height,
          size: Math.random() * 4 + 2,
          speed: Math.random() * 2.5 + 1
        });
      }
    }
  };

  const triggerShoot = () => {
    if (isPausedRef.current) return;
    const player = playerRef.current;
    if (player.isDead || gameState.isGameOver || gameState.isWin) return;
    if (player.powerUp !== 'fire' && player.powerUp !== 'ice') return;

    const dir = facingLeftRef.current ? -1 : 1;
    
    projectilesRef.current.push({
      id: Date.now() + Math.random(),
      type: player.powerUp === 'fire' ? 'fireball' : 'iceball',
      x: player.x + (dir > 0 ? player.width - 5 : -10),
      y: player.y + player.height / 3,
      vx: dir * 7.5,
      vy: 1,
      width: 14,
      height: 14,
      ownerId: 1
    });

    audioEngine.playJump(); // beep tone for shooting
  };

  const handleSelectSequelMode = (seq: boolean) => {
    if (seq) {
      if (!isCyberUnlocked) {
        setLockedCyberPrompt(true);
        audioEngine.playStomp(); // alert buzzer tone
        return;
      }
      setIsSequelMode(true);
      setCurrentLevelIndex(prev => prev < 40 ? 40 : prev);
      audioEngine.playCheckpoint();
    } else {
      setIsSequelMode(false);
      setCurrentLevelIndex(prev => prev >= 40 ? 0 : prev);
      audioEngine.playCoin();
    }
  };

  const handleDownloadTitleTheme = async () => {
    if (isExportingAudio) return;
    try {
      setIsExportingAudio(true);
      // Give auditory click response
      audioEngine.playCoin();
      
      const blob = await audioEngine.renderTitleThemeToWavBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Super_Aaryan_Adventure_Title_Theme.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setIsExportingAudio(false);
    }
  };

  const startGame = (enableSound: boolean) => {
    // Sanitize savior/player name and fallback to Aaryan if left blank
    const finalName = rescuerName.trim() || "Aaryan";
    setRescuerName(finalName);
    try {
      localStorage.setItem("sa_rescuer_name", finalName);
    } catch (e) {}

    setIsMuted(!enableSound);
    setIsStarted(true);
    audioEngine.setMute(!enableSound);
    audioEngine.playCoin();

    if (selectedSeriesGame === 'flappy') {
      initFlappyGame();
      if (enableSound) {
        setTimeout(() => {
          audioEngine.playBgm("factory");
        }, 350);
      }
      return;
    }
    if (selectedSeriesGame === 'space') {
      initSpaceGame();
      if (enableSound) {
        setTimeout(() => {
          audioEngine.playBgm("boss");
        }, 350);
      }
      return;
    }

    if (enableSound) {
      const currentLevel = LEVELS[currentLevelIndex];
      const activeTheme = currentLevel.id % 10 === 0 ? "boss" : currentLevel.theme;
      setTimeout(() => {
        audioEngine.playBgm(activeTheme);
      }, 350);
    }
  };

  const startLeft = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowLeft"] = true;
  };
  const stopLeft = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowLeft"] = false;
  };
  const startRight = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowRight"] = true;
  };
  const stopRight = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowRight"] = false;
  };
  const startDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowDown"] = true;
    keysRef.current["KeyS"] = true;
  };
  const stopDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current["ArrowDown"] = false;
    keysRef.current["KeyS"] = false;
  };
  const triggerJump = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    handleJump();
  };

  useEffect(() => {
    if (!isStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
        return;
      }

      if (e.code === "KeyH") {
        e.preventDefault();
        handleHome();
        return;
      }

      if (isPausedRef.current) return;

      keysRef.current[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault(); // prevent scroll
        handleJump();
      }
      if (e.code === "KeyF" || e.code === "KeyE") {
        triggerShoot();
      }
      if (e.key === "Shift" || e.code === "KeyK" || e.code === "KeyC") {
        e.preventDefault();
        if (isSequelMode) {
          triggerDash();
        } else if (e.key === "Shift") {
          triggerShoot(); // classic Shift-to-shoot fallback
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    isLoopActiveRef.current = true;

    let animationId: number;

    const update = () => {
      if (!isLoopActiveRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // Detect high-DPI / Retina device resolution to eliminate blur on mobile
      const dpr = window.devicePixelRatio || 1;
      const expectedWidth = GAME_WIDTH * dpr;
      const expectedHeight = GAME_HEIGHT * dpr;

      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const player = playerRef.current;
      const platforms = platformsRef.current;
      const coins = coinsRef.current;
      const enemies = enemiesRef.current;
      const keys = keysRef.current;
      const activeLevel = LEVELS[currentLevelIndex];

      const activePlayers: { ref: Player; num: 1 | 2 }[] = [
        { ref: player, num: 1 }
      ];

      if (cpuActiveRef.current && !cpuPlayerRef.current.isDead) {
        activePlayers.push({ ref: cpuPlayerRef.current, num: 2 });
      }

      // Execute CPU autopilot intelligence if co-op companion is active!
      if (cpuActiveRef.current && !cpuPlayerRef.current.isDead && !isPausedRef.current && !gameState.isGameOver && !gameState.isWin) {
        const cpu = cpuPlayerRef.current;
        const b = blocksRef.current;
        const p = platformsRef.current;
        const e = enemiesRef.current;

        // Auto move rightwards
        cpu.dx = MOVE_SPEED * 0.92;

        // Apply standard platformer gravity physics
        const gravityVal = 0.5;
        cpu.dy += gravityVal;
        if (activeLevel.theme === 'underwater') {
          cpu.dy *= 0.98;
        }

        cpu.y += cpu.dy;
        cpu.x += cpu.dx;
        cpu.grounded = false; // Resolved in collision passes

        // Autopilot scanners: decide if we should jump!
        let shouldJump = false;

        const nextX = cpu.x + 35;
        const chestY = cpu.y + cpu.height / 2;

        // 1. Solid Obstacles (Blocks) directly in front of CPU
        const obstacleAhead = b.some(block => 
          nextX > block.x - 12 && nextX < block.x + block.width + 12 &&
          chestY > block.y && chestY < block.y + block.height
        );

        // 2. Active, undefeated enemies approaching in range
        const enemyAhead = e.some(enemy => 
          !enemy.isDead && Math.abs(enemy.x - cpu.x) < 70 && 
          cpu.y + cpu.height > enemy.y - 12 && cpu.y < enemy.y + 30
        );

        // 3. Imminent pits/holes right ahead (Scan floor support)
        let IsOnSolidGroundAhead = false;
        p.forEach(platform => {
          if (cpu.x + 50 > platform.x && cpu.x + 5 < platform.x + platform.width) {
            IsOnSolidGroundAhead = true;
          }
        });
        b.forEach(block => {
          if (cpu.x + 50 > block.x && cpu.x + 5 < block.x + block.width) {
            IsOnSolidGroundAhead = true;
          }
        });
        const pitAhead = !IsOnSolidGroundAhead && cpu.grounded;

        if (obstacleAhead || enemyAhead || pitAhead) {
          shouldJump = true;
        }

        if (shouldJump && cpu.grounded) {
          cpu.dy = -11.5; // perform clean automated jumps!
          cpu.grounded = false;
          audioEngine.playJump();
        }

        // Distance constraint & retrieval: keep companion close in focus!
        if (cpu.x < player.x - 300) {
          cpu.x = player.x - 70;
          cpu.y = player.y - 10;
          cpu.dx = 0;
          cpu.dy = 0;
        }

        // Wait near Flagpole goal
        if (activeLevel.flagPole && cpu.x > activeLevel.flagPole.x - 40) {
          cpu.x = activeLevel.flagPole.x - 40;
          cpu.dx = 0;
        }
      }

      if (selectedSeriesGame === 'flappy') {
        const isPaused = isPausedRef.current;
        // Run update/draw for flappy
        updateFlappy(ctx, keys);
        animationId = requestAnimationFrame(update);
        return;
      }

      if (selectedSeriesGame === 'space') {
        const isPaused = isPausedRef.current;
        // Run update/draw for space blaster
        updateSpace(ctx, keys);
        animationId = requestAnimationFrame(update);
        return;
      }

      if (isLevelClear) {
        draw(ctx, activeLevel, player, platforms, coins, enemies);
        animationId = requestAnimationFrame(update);
        return;
      }

      if (gameState.isGameOver || gameState.isWin) {
        // Just draw current state but stop physics
        draw(ctx, activeLevel, player, platforms, coins, enemies);
        return;
      }

      if (isPausedRef.current) {
        draw(ctx, activeLevel, player, platforms, coins, enemies);
        animationId = requestAnimationFrame(update);
        return;
      }

      // Track player idle metrics for waving animation & greeting!
      const isMovingInput = !!(keys["ArrowLeft"] || keys["ArrowRight"] || keys["KeyA"] || keys["KeyD"] || keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || keys["ArrowDown"] || keys["KeyS"]);
      const isCurrentlyStandingStill = player.dx === 0 && Math.abs(player.dy) < 0.15 && player.grounded && !player.isDead && !isMovingInput;
      
      if (isCurrentlyStandingStill && selectedSeriesGame === 'platformer') {
        playerIdleTicksRef.current++;
      } else {
        playerIdleTicksRef.current = 0;
        playerSpokenRef.current = false;
      }

      if (player.isDead) {
        player.deathTimer--;
        player.y += player.dy;
        player.dy += 0.5;
        
        if (player.deathTimer <= 0) {
          if (gameState.lives > 0) {
            player.isDead = false;
            player.x = player.checkpointX;
            player.y = player.checkpointY;
            player.dy = 0;
            
            // Reset lava Y coordinate to give the player a fair escape headstart
            lavaYRef.current = GAME_HEIGHT + 100;
            
            // Reset Rival coordinates for a fair retry in Racing Mode!
            rivalXRef.current = 90;
            rivalYRef.current = 300;
            setRivalWinningState('none');

            const opponentCharsForReset = Object.values(CHARACTERS).filter(c => c.id !== selectedChar);
            opponentsRef.current = opponentCharsForReset.slice(0, 3).map((char, index) => {
              const baseSpeed = 1.6 + (activeLevel.id % 4) * 0.15 + Math.floor(activeLevel.id / 15) * 0.11;
              const individualSpeed = baseSpeed + (index * 0.14) - 0.08;
              return {
                id: char.id,
                name: char.name,
                x: 90 - index * 30, // Staggered start grid of formula cars!
                y: 300,
                speed: individualSpeed,
                mainColor: char.mainColor,
                accentColor: char.accentColor,
                lowerColor: char.lowerColor,
                limbColor: char.limbColor,
                chestColor: char.chestColor
              };
            });
            
            const isRiu = selectedChar === "riu";
            player.powerUp = isRiu ? 'mini' : 'normal';
            player.width = isRiu ? 18 : 44;
            player.height = isRiu ? 22 : 54;
            // Reset key collected state on death for Sequel Mode
            if (isSequelMode) {
              player.hasKey = !isKeyRequired;
              if (keyRef.current) {
                keyRef.current.collected = false;
              }
            }
            // Reload enemies for a fresh attempt
            let retryEnemies = activeLevel.enemies.map(e => ({ ...e }));
            if (gameMode === 'spooky') {
              retryEnemies.push(
                {
                  id: Date.now() + 10001,
                  type: 'ghost' as any,
                  x: 350,
                  y: 200,
                  width: 40,
                  height: 40,
                  speed: 1.2,
                  range: 150,
                  startX: 350
                },
                {
                  id: Date.now() + 10002,
                  type: 'ghost' as any,
                  x: 700,
                  y: 150,
                  width: 40,
                  height: 40,
                  speed: -1.0,
                  range: 200,
                  startX: 700
                }
              );
            } else if (gameMode === 'prison') {
              retryEnemies = retryEnemies.map(e => {
                if (e.type !== 'boss') {
                  return { ...e, type: 'guard' as any, speed: e.speed * 1.15 };
                }
                return e;
              });
              retryEnemies.push({
                id: Date.now() + 20001,
                type: 'guard' as any,
                x: 450,
                y: 260,
                width: 40,
                height: 40,
                speed: 1.4,
                range: 120,
                startX: 450
              });
            }
            enemiesRef.current = retryEnemies;
            alarmTimerRef.current = 0;
            spookyGhostSpawnTimerRef.current = 300;
            blocksRef.current = activeLevel.blocks ? activeLevel.blocks.map(b => ({ ...b, isHit: false, bumpY: 0, bumpTimer: 0 })) : [];
            powerUpsRef.current = activeLevel.powerUps ? activeLevel.powerUps.map(p => ({ ...p, collected: false })) : [];
          }
        }
        draw(ctx, activeLevel, player, platforms, coins, enemies);
        animationId = requestAnimationFrame(update);
        return;
      }

      // Floor Is Lava Mode Update Loop
      if (gameMode === 'lava' && !player.isDead) {
        // Base rise speed scales slightly with level index for more tension!
        const baseSpeed = 0.55 + (currentLevelIndex * 0.035);
        // Cap the speed to a maximum of 1.3 pixels per frame so it remains playable and beatable
        const lavaSpeed = Math.min(1.3, baseSpeed);
        lavaYRef.current -= lavaSpeed;

        // Check if players got covered by lava
        activePlayers.forEach(({ ref: pRef }) => {
          if (!pRef.isDead) {
            // Player dies if submerged in rising lava
            if (pRef.y + pRef.height >= lavaYRef.current) {
              handleDeath();
            }
          }
        });
      }

      // Prison Mode Security spotlights & radar alert updates
      if (gameMode === 'prison' && !player.isDead) {
        if (alarmTimerRef.current > 0) {
          alarmTimerRef.current--;
        }

        const time = Date.now() / 1000;
        const lights = [
          { x: 250 + Math.sin(time) * 180, y: 400, r: 65 },
          { x: 750 + Math.cos(time * 1.2) * 180, y: 400, r: 65 }
        ];

        let detected = false;
        activePlayers.forEach(({ ref: pRef }) => {
          if (!pRef.isDead) {
            const px = pRef.x + pRef.width / 2;
            const py = pRef.y + pRef.height / 2;
            lights.forEach(l => {
              const dx = px - l.x;
              const dy = py - l.y;
              if (Math.hypot(dx, dy) < l.r) {
                detected = true;
              }
            });
          }
        });

        if (detected) {
          if (alarmTimerRef.current < 200) {
            alarmTimerRef.current = 240; // alarm active for 4 seconds
          }
          // Speed up active guards/enemies
          enemiesRef.current.forEach(e => {
            if (!e.isFrozen && e.type !== 'boss') {
              if (Math.abs(e.speed) < 2.5) {
                e.speed = e.speed > 0 ? 2.5 : -2.5;
              }
            }
          });
          // Alarm firing drones target player
          if (Math.random() < 0.03) {
            const pX = player.x + player.width / 2;
            const pY = player.y + player.height / 2;
            bossFireballsRef.current.push({
              id: Date.now() + Math.random(),
              x: pX + (Math.random() * 200 - 100),
              y: -10,
              vx: (pX - (pX + (Math.random() * 200 - 100))) * 0.015,
              vy: 4.5,
              width: 8,
              height: 18,
              isMini: true
            });
          }
        }
      }

      // Spooky Mansion Mode: float-in haunt ghosts periodically
      if (gameMode === 'spooky' && !player.isDead) {
        if (spookyGhostSpawnTimerRef.current === undefined) {
          spookyGhostSpawnTimerRef.current = 300;
        }
        spookyGhostSpawnTimerRef.current--;
        if (spookyGhostSpawnTimerRef.current <= 0) {
          spookyGhostSpawnTimerRef.current = 450 + Math.random() * 200; // spawn every 8-10 seconds
          if (enemiesRef.current.filter(e => e.type === 'ghost').length < 5) {
            const spawnLeft = Math.random() < 0.5;
            enemiesRef.current.push({
              id: Date.now() + Math.random(),
              type: 'ghost' as any,
              x: spawnLeft ? -40 : GAME_WIDTH + 40,
              y: 100 + Math.random() * 200,
              width: 40,
              height: 40,
              speed: spawnLeft ? 1.2 : -1.2,
              range: 200,
              startX: spawnLeft ? 100 : GAME_WIDTH - 100
            });
          }
        }
      }

      // Clear movement inputs from gamepad
      let gpLeft = false;
      let gpRight = false;

      // Poll connected Gamepad controllers (perfect for Android TV or bluetooth gamepads)
      if (typeof navigator !== "undefined" && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (gp) {
            // D-Pad Left/Right mapping (buttons 14 and 15)
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;
            // Left Stick horizontal mapping (axis 0)
            const axisX = gp.axes[0] || 0;

            if (axisX < -0.3 || dpadLeft) {
              gpLeft = true;
            }
            if (axisX > 0.3 || dpadRight) {
              gpRight = true;
            }

            // Jump Buttons: A button (0), B button (1), or D-Pad Up (12)
            const jumpButtonActive = gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[12]?.pressed;
            if (jumpButtonActive) {
              if (!gamepadJumpPressedRef.current) {
                gamepadJumpPressedRef.current = true;
                handleJump();
              }
            } else {
              gamepadJumpPressedRef.current = false;
            }

            // Shooting Buttons: X button (2), Y button (3), Right Trigger (7), Right Bumper (5)
            const shootButtonActive = gp.buttons[2]?.pressed || gp.buttons[3]?.pressed || gp.buttons[5]?.pressed || gp.buttons[7]?.pressed;
            if (shootButtonActive) {
              if (!gamepadShootPressedRef.current) {
                gamepadShootPressedRef.current = true;
                triggerShoot();
              }
            } else {
              gamepadShootPressedRef.current = false;
            }

            // Start / Pause toggle button (button 9)
            const pauseButtonActive = gp.buttons[9]?.pressed;
            if (pauseButtonActive) {
              if (!gamepadPausePressedRef.current) {
                gamepadPausePressedRef.current = true;
                togglePause();
              }
            } else {
              gamepadPausePressedRef.current = false;
            }
          }
        }
      }

      // 0. Update Moving Platforms (Sequel Mode)
      if (isSequelMode) {
        platforms.forEach((p) => {
          if (p.isMoving) {
            if (p.dir === undefined) p.dir = 1;
            const speed = p.speed || 1;
            
            if (p.rangeX && p.rangeX > 0) {
              if (p.startX === undefined) p.startX = p.x;
              p.x += p.dir * speed;
              if (Math.abs(p.x - p.startX) >= p.rangeX) {
                p.dir *= -1;
                p.x = p.startX + p.dir * p.rangeX; // fix overflow drift
              }
            }
            
            if (p.rangeY && p.rangeY > 0) {
              if (p.startY === undefined) p.startY = p.y;
              p.y += p.dir * speed;
              if (Math.abs(p.y - p.startY) >= p.rangeY) {
                p.dir *= -1;
                p.y = p.startY + p.dir * p.rangeY; // fix overflow drift
              }
            }
          }
          
          if (p.springCooldown && p.springCooldown > 0) {
            p.springCooldown--;
          }
        });
      }

      // 0b. Racing Mode Multi-Opponent driving updates!
      if (gameMode === 'racing' && !player.isDead && rivalWinningState === 'none') {
        const flagX = activeLevel.flagPole ? activeLevel.flagPole.x : 900;
        let highestOpponentX = 0;
        let closestOpponentY = 300;
        let opponentWhoClearedIndex = -1;

        // If player takes damage or dies, force all CPU opponents to copy the hurt state
        const isPlayerJustHurt = (player.shieldTimer && player.shieldTimer === 90) || (player.isDead && player.deathTimer === 60);

        opponentsRef.current.forEach((opp, idx) => {
          if (opp.shieldTimer === undefined) opp.shieldTimer = 0;
          if (opp.spinAngle === undefined) opp.spinAngle = 0;
          if (opp.dy === undefined) opp.dy = 0;

          // Propagate player damage/death so CPU opponents instantly take damage too!
          if (isPlayerJustHurt && opp.shieldTimer <= 0) {
            opp.shieldTimer = 90;
            opp.dy = -8;
          }

          if (opp.shieldTimer > 0) {
            opp.shieldTimer--;
            opp.spinAngle += 0.15;

            // THEY MUST COPY THE PLAYERS MOVE WHEN THEY TAKE DAMAGE
            // We set their vertical position so they mirror the player's relative Y coordinates (bobs & jumps)!
            const playerRelativeY = player.y - (450 - player.height);
            opp.y = (450 - 54) + playerRelativeY;
            opp.dy = player.dy; // copy the player's vertical velocity
          }

          if (opp.x < flagX) {
            // Drive forward based on individual car speed (slowed down drastically if damaged/hurt!)
            const runningSpeed = opp.shieldTimer > 0 ? opp.speed * 0.15 : opp.speed;
            opp.x += runningSpeed;
            
            // Replicate a micro bumpy road oscillation (cars have suspensors, so smaller bouncy amplitude than running)
            if (opp.shieldTimer <= 0) {
              const bounceCycle = (Date.now() / 110) + idx * 45;
              opp.y = 450 - 54 + Math.abs(Math.sin(bounceCycle)) * -4;
              opp.spinAngle = 0; // reset spin when fine
            }

            if (opp.x > highestOpponentX) {
              highestOpponentX = opp.x;
              closestOpponentY = opp.y;
            }

            // emit flaming runner exhaust particles!
            if (opp.shieldTimer <= 0) {
              if (Math.random() < 0.22) {
                particlesRef.current.push({
                  x: opp.x - 22, // exhaust pipe is at rear of car
                  y: opp.y + 14,
                  size: Math.random() * 3 + 1.2,
                  speed: Math.random() * -1.2 - 0.3
                });
              }
            } else {
              // Spark & smoke when taking damage
              if (Math.random() < 0.35) {
                particlesRef.current.push({
                  x: opp.x + (Math.random() * 20 - 10),
                  y: opp.y + (Math.random() * 20 - 10),
                  size: Math.random() * 2 + 1,
                  speed: Math.random() * 0.4 - 0.2
                });
              }
            }

            // --- BOTS DO GET DAMAGE ---
            // Let bots collide with any active track enemies
            enemies.forEach(e => {
              if (!e.isDead && !e.isFrozen && opp.shieldTimer! <= 0) {
                // AABB bounding box check (car width ~44, height ~44)
                const oppWidth = 44;
                const oppHeight = 44;
                if (
                  opp.x < e.x + e.width &&
                  opp.x + oppWidth > e.x &&
                  opp.y < e.y + e.height &&
                  opp.y + oppHeight > e.y
                ) {
                  opp.shieldTimer = 90;
                  opp.dy = -8;
                  audioEngine.playDeath(); // trigger hit audio effect
                }
              }
            });
          } else {
            if (opponentWhoClearedIndex === -1) {
              opponentWhoClearedIndex = idx;
            }
          }
        });

        // Maintain compatibility for HUD progress indicator with the leader!
        if (highestOpponentX > 0) {
          rivalXRef.current = highestOpponentX;
          rivalYRef.current = closestOpponentY;
        }

        if (opponentWhoClearedIndex !== -1) {
          const winnerHero = opponentsRef.current[opponentWhoClearedIndex];
          setRivalWinningState('rival');
          audioEngine.playDeath();
          alert(`❌ ${winnerHero.name.toUpperCase()} IN THEIR CYBER CAR CLEARED THE FLAGPOLE FIRST!\nRace lost! Retrying the race...`);
          handleDeath();
        }
      }

      // 1. Logic: Movement & Dashing
      if ((isSequelMode || gameMode === 'adventure') && player.dashTimer && player.dashTimer > 0) {
        player.dashTimer--;
        player.dx = (player.dashDir || 1) * (MOVE_SPEED * 2.8);
        player.dy = 0; // linear horizontal glide glide
        player.x += player.dx;
        player.grounded = false;

        // Emit high-tech dashboard trails as real particles!
        particlesRef.current.push({
          x: player.x + player.width / 2 - (player.dashDir || 1) * 15,
          y: player.y + Math.random() * player.height,
          size: Math.random() * 3 + 2,
          speed: Math.random() * 0.4
        });
      } else {
        player.dx = 0;
        if (keys["ArrowRight"] || keys["KeyD"] || gpRight) player.dx = MOVE_SPEED;
        if (keys["ArrowLeft"] || keys["KeyA"] || gpLeft) player.dx = -MOVE_SPEED;

        if (player.dx > 0) facingLeftRef.current = false;
        if (player.dx < 0) facingLeftRef.current = true;

        player.x += player.dx;

        // Interactive River Water Buoyancy/Swimming physics!
        const isInRiverWater = activeLevel.theme === 'river' && (
          (player.x + player.width > 220 && player.x < 380 && player.y + player.height > 445) ||
          (player.x + player.width > 620 && player.x < 760 && player.y + player.height > 445)
        );

        if (isInRiverWater) {
          // Buoyancy: cap vertical sink speed, flap up with Space (or ArrowUp)
          player.dy = Math.min(player.dy, 1.8);
          if (keys["Space"] || keys["ArrowUp"]) {
            player.dy = -4.8; // beautiful underwater bubble flap
            audioEngine.playJump();
          }
          player.dx *= 0.65; // water resistance

          // Spawn cute rising bubbles!
          if (Math.random() < 0.25) {
            particlesRef.current.push({
              x: player.x + Math.random() * player.width,
              y: player.y + player.height,
              size: Math.random() * 2.5 + 1.2,
              speed: Math.random() * -2.2 - 0.5
            });
          }
        }

        // Warp Pipe activation: press Down / S while standing perfectly aligned on top of a Green Pipe!
        if (!player.isDead) {
          const isPressingDown = keys["ArrowDown"] || keys["KeyS"];
          if (isPressingDown) {
            const standingOnPipe = platforms.find(p => 
              p.isPipe && 
              player.x + player.width > p.x + 8 && 
              player.x < p.x + p.width - 8 && 
              Math.abs((player.y + player.height) - p.y) <= 6
            );
            if (standingOnPipe && currentLevelIndex !== 5) { // index 5 is Cave Zone 6, our procedural secret cave!
              originalLevelIndexBeforePipeRef.current = currentLevelIndex;
              setCurrentLevelIndex(5);
              player.x = 100;
              player.y = 300;
              player.dy = 0;
              player.dx = 0;
              audioEngine.playCheckpoint();

              // Spurt green splash particles representing the transit!
              for (let i = 0; i < 25; i++) {
                particlesRef.current.push({
                  x: standingOnPipe.x + standingOnPipe.width / 2 + (Math.random() * 24 - 12),
                  y: standingOnPipe.y,
                  size: Math.random() * 5 + 2,
                  speed: Math.random() * -4.5 - 1.5
                });
              }
            }
          }
        }
        
        let gravityVal = activeLevel.gravity;
        if (player.powerUp === 'mini') {
          gravityVal = activeLevel.gravity * 0.72; // floaty and lightweight!
        }
        player.dy += gravityVal;
        
        if (activeLevel.theme === 'underwater') {
          player.dy *= 0.98; 
        }
        
        player.y += player.dy;
        player.grounded = false;
      }

      // Decrement timers and cooldowns
      if (player.dashCooldown && player.dashCooldown > 0) {
        player.dashCooldown--;
      }
      if (player.keyWarningTimer && player.keyWarningTimer > 0) {
        player.keyWarningTimer--;
      }

      // Solder state outputs cleanly to HUD
      if (isSequelMode) {
        const pKey = !!player.hasKey;
        const pDash = player.dashCooldown || 0;
        const pWarn = player.keyWarningTimer || 0;
        if (keyCollected !== pKey) setKeyCollected(pKey);
        if (dashCooldown !== pDash) setDashCooldown(pDash);
        if (keyWarning !== pWarn) setKeyWarning(pWarn);
      }

      // Decrement superpower active timers
      if (player.starTimer && player.starTimer > 0) player.starTimer--;
      if (player.shieldTimer && player.shieldTimer > 0) player.shieldTimer--;

      const isCurrentlyStar = player.starTimer !== undefined && player.starTimer > 0;
      if (isCurrentlyStar && !wasStarActiveRef.current) {
        wasStarActiveRef.current = true;
        if (!isMuted) {
          audioEngine.playBgm('superstar');
        }
      } else if (!isCurrentlyStar && wasStarActiveRef.current) {
        wasStarActiveRef.current = false;
        if (!isMuted) {
          const mTheme = activeLevel.id % 10 === 0 ? "boss" : activeLevel.theme;
          audioEngine.playBgm(mTheme);
        }
      }

      // 2. Logic: Collision with Platforms
      activePlayers.forEach(({ ref: pRef, num }) => {
        platforms.forEach((p) => {
          if (
            pRef.x < p.x + p.width &&
            pRef.x + pRef.width > p.x &&
            pRef.y < p.y + p.height &&
            pRef.y + pRef.height > p.y
          ) {
            // If in Sequel Mode and colliding with a spring launchpad!
            if (isSequelMode && p.isSpring) {
              pRef.y = p.y - pRef.height - 4; // pop out of platform slightly
              pRef.dy = activeLevel.jumpStrength * 1.55; // MASSIVE SUPER SPRING BOUNCE!
              pRef.grounded = false;
              pRef.airJumps = 0; // reset air jumps for good measure
              p.springCooldown = 12; // visual compress frames
              audioEngine.playJump(); // play bounce sound!
              
              // Spawn ring sparks
              for (let i = 0; i < 8; i++) {
                particlesRef.current.push({
                  x: p.x + p.width / 2 + (Math.random() * 12 - 6),
                  y: p.y,
                  size: Math.random() * 4 + 2,
                  speed: Math.random() * 2.5 + 1
                });
              }
              return;
            }

            if (pRef.dy > 0) {
              pRef.y = p.y - pRef.height;
              pRef.dy = 0;
              pRef.grounded = true;
              pRef.airJumps = 0; // Reset double jumps upon landing!

              // Carry player with moving platform!
              if (isSequelMode && p.isMoving) {
                const speed = p.speed || 1;
                const dir = p.dir || 1;
                if (p.rangeX && p.rangeX > 0) {
                  pRef.x += dir * speed;
                }
                if (p.rangeY && p.rangeY > 0) {
                  pRef.y += dir * speed;
                }
              }
            }
          }
        });
      });

      // 2b. Logic: Collision with Interactive Blocks (? blocks, ! blocks, bricks)
      blocksRef.current.forEach((b) => {
        // Handle bump animation decay
        if (b.bumpTimer && b.bumpTimer > 0) {
          b.bumpTimer--;
          if (b.bumpTimer > 5) {
            b.bumpY = -7;
          } else {
            b.bumpY = b.bumpTimer * -1.4;
          }
        } else {
          b.bumpY = 0;
        }

        activePlayers.forEach(({ ref: pRef, num }) => {
          const playerLeft = pRef.x;
          const playerRight = pRef.x + pRef.width;
          const playerTop = pRef.y;
          const playerBottom = pRef.y + pRef.height;

          const blockLeft = b.x;
          const blockRight = b.x + b.width;
          const blockTop = b.y;
          const blockBottom = b.y + b.height;

          if (
            playerRight > blockLeft &&
            playerLeft < blockRight &&
            playerBottom > blockTop &&
            playerTop < blockBottom
          ) {
            const overlapLeft = playerRight - blockLeft;
            const overlapRight = blockRight - playerLeft;
            const overlapTop = playerBottom - blockTop;
            const overlapBottom = blockBottom - playerTop;

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapTop) {
              if (pRef.dy >= 0) {
                pRef.y = b.y - pRef.height;
                pRef.dy = 0;
                pRef.grounded = true;
              }
            } else if (minOverlap === overlapBottom) {
              if (pRef.dy < 0) {
                pRef.y = b.y + b.height;
                pRef.dy = 1.5;

                if (!b.isHit) {
                  b.isHit = true;
                  b.bumpY = -10;
                  b.bumpTimer = 10;

                  if (b.content === 'coin') {
                    soundEffectManager.playCoin();
                    coinsRef.current.push({
                      id: Date.now() + Math.random(),
                      x: b.x + b.width / 2,
                      y: b.y - 30,
                      collected: true
                    });
                    for (let i = 0; i < 8; i++) {
                      particlesRef.current.push({
                        x: b.x + b.width / 2 - 15 + Math.random() * 30,
                        y: b.y - 15 - Math.random() * 25,
                        size: Math.random() * 3 + 2,
                        speed: Math.random() * 1.5 + 0.5
                      });
                    }
                  } else if (b.content !== 'empty') {
                    audioEngine.playCheckpoint();
                    const pType = b.content as PowerUpType;
                    powerUpsRef.current.push({
                      id: Date.now() + Math.random(),
                      type: pType,
                      x: b.x + (b.width - 32) / 2,
                      y: b.y - 32,
                      width: 32,
                      height: 32,
                      collected: false,
                      spawnOffset: 32
                    });
                    for (let i = 0; i < 6; i++) {
                      particlesRef.current.push({
                        x: b.x + b.width / 2 - 10 + Math.random() * 20,
                        y: b.y - 10 - Math.random() * 20,
                        size: Math.random() * 2.5 + 1.5,
                        speed: Math.random() * 1.5 + 0.5
                      });
                    }
                  }
                } else {
                  audioEngine.playJump();
                  b.bumpY = -4;
                  b.bumpTimer = 6;
                }
              }
            } else if (minOverlap === overlapLeft) {
              pRef.x = b.x - pRef.width;
              pRef.dx = 0;
            } else if (minOverlap === overlapRight) {
              pRef.x = b.x + b.width;
              pRef.dx = 0;
            }
          }
        });
      });

      // Update Projectiles
      projectilesRef.current = projectilesRef.current.filter(p => {
        p.x += p.vx;
        p.vy += 0.45; // Gravity on bouncing projectile
        p.y += p.vy;

        let collided = false;
        platforms.forEach(plat => {
          if (
            p.x < plat.x + plat.width &&
            p.x + p.width > plat.x &&
            p.y < plat.y + plat.height &&
            p.y + p.height > plat.y
          ) {
            if (p.vy > 0 && p.y + p.height - p.vy <= plat.y + 4) {
              p.y = plat.y - p.height;
              p.vy = -5.5; // Bounce up!
            } else {
              collided = true;
            }
          }
        });

        // Collision with enemies
        enemies.forEach(e => {
          if (
            !collided &&
            p.x < e.x + e.width &&
            p.x + p.width > e.x &&
            p.y < e.y + e.height &&
            p.y + p.height > e.y
          ) {
            collided = true; // Dissipate projectile
            if (p.type === 'fireball') {
              audioEngine.playStomp();
              if (e.type === 'boss') {
                const boss = e as any;
                if (!boss.shellState || boss.shellState <= 0) {
                  e.health! -= 1;
                  if (e.health! <= 0) {
                    enemiesRef.current = enemies.filter(item => item.id !== e.id);
                  }
                }
              } else {
                enemiesRef.current = enemies.filter(item => item.id !== e.id);
              }
            } else {
              audioEngine.playCheckpoint();
              e.isFrozen = true;
              e.freezeTimer = 300; // Frozen for 5 seconds
              e.speed = 0;
            }
          }
        });

        if (p.x < 0 || p.x > GAME_WIDTH || p.y > GAME_HEIGHT) {
          collided = true;
        }
        return !collided;
      });

      // Update Boss Fireballs
      bossFireballsRef.current = bossFireballsRef.current.filter(f => {
        if ((f as any).isBarrel) {
          // Gravity-affected falling physics for pirate barrels!
          (f as any).vy = ((f as any).vy || 0) + 0.18;
          f.x += f.vx;
          f.y += f.vy;

          // Check landing or bouncing off platforms
          platforms.forEach(plat => {
            if (f.x + f.width > plat.x && f.x < plat.x + plat.width) {
              if (f.y + f.height >= plat.y && f.y + f.height - f.vy <= plat.y + 10 && f.vy > 0) {
                f.y = plat.y - f.height;
                f.vy = -Math.abs(f.vy) * 0.45; // high elasticity bounce!
                if (Math.abs(f.vy) < 0.6) f.vy = 0; // stop vertical hopping
              }
            }
          });
        } else {
          f.x += f.vx;
          f.y += f.vy;
        }

        // Check collision with either active player
        let hitPlayer = false;
        activePlayers.forEach(({ ref: pRef, num }) => {
          if (
            !hitPlayer &&
            !pRef.isDead &&
            pRef.x < f.x + f.width &&
            pRef.x + pRef.width > f.x &&
            pRef.y < f.y + f.height &&
            pRef.y + pRef.height > f.y
          ) {
            handleDeath();
            hitPlayer = true;
          }
        });

        if (hitPlayer) return false; // remove fireball on hit

        // Limit range / bounds to avoid leaking offscreen objects
        if (f.x < -100 || f.x > GAME_WIDTH + 100 || f.y < -100 || f.y > GAME_HEIGHT + 100) {
          return false;
        }

        return true;
      });

      // 3. Logic: Enemy Movement & Collision
      enemies.forEach(e => {
        // Apply physical gravity to all enemies
        const enemyGrav = activeLevel.theme === 'underwater' ? 0.08 : 0.45;
        const enemyTerminal = activeLevel.theme === 'underwater' ? 4 : 10;
        e.vy = Math.min((e.vy || 0) + enemyGrav, enemyTerminal);
        e.y += e.vy;

        // Platform collisions for enemies
        platforms.forEach((p) => {
          if (
            e.x < p.x + p.width &&
            e.x + e.width > p.x &&
            e.y < p.y + p.height &&
            e.y + e.height > p.y
          ) {
            if (e.vy! > 0 && e.y + e.height - e.vy! <= p.y + 6) {
              e.y = p.y - e.height;
              e.vy = 0;
            }
          }
        });

        // Block collisions for enemies
        blocksRef.current.forEach((b) => {
          if (
            e.x < b.x + b.width &&
            e.x + e.width > b.x &&
            e.y < b.y + b.height &&
            e.y + e.height > b.y
          ) {
            if (e.vy! > 0 && e.y + e.height - e.vy! <= b.y + 6) {
              e.y = b.y - e.height;
              e.vy = 0;
            }
          }
        });

        // Boundary constraint: Don't let enemies fall past the main ground
        const maxGroundY = 450 - e.height;
        if (e.y > maxGroundY) {
          e.y = maxGroundY;
          e.vy = 0;
        }

        if (e.isFrozen) {
          if (e.freezeTimer && e.freezeTimer > 0) {
            e.freezeTimer--;
          } else {
            e.isFrozen = false;
            e.isSliding = false;
            e.speed = e.type === 'boss' ? 3 : (1 + currentLevelIndex * 0.05);
          }

          if (e.isSliding) {
            e.x += e.slideSpeed || 0;
            if (e.x < 0) { e.x = 0; e.slideSpeed = Math.abs(e.slideSpeed || 8); }
            if (e.x + e.width > GAME_WIDTH) { e.x = GAME_WIDTH - e.width; e.slideSpeed = -Math.abs(e.slideSpeed || 8); }
            
            // Defeat other enemies it collides with
            enemies.forEach(other => {
              if (other.id !== e.id && !other.isFrozen) {
                const distDX = Math.abs((e.x + e.width/2) - (other.x + other.width/2));
                const distDY = Math.abs((e.y + e.height/2) - (other.y + other.height/2));
                if (distDX < 30 && distDY < 30) {
                  enemiesRef.current = enemiesRef.current.filter(item => item.id !== other.id);
                  audioEngine.playStomp();
                }
              }
            });
          }
        } else {
          // Move enemy
          if (e.type === 'boss') {
            const boss = e as any;
            
            // Initialize custom boss properties if not present
            if (boss.bossType === undefined) {
              boss.bossType = activeLevel.theme; // e.g., 'castle', 'factory', 'magma', 'snowy', 'candy'
              boss.aiState = 'idle'; // 'idle', 'preparing', 'jumping', 'stumped'
              boss.aiTimer = 100;
              boss.jumpTimer = 150;
              boss.shellState = 0; // for Giant Koopa shell spinning
            }
            
            // Trapped helper robot triggers inside active boss fight!
            const isBossActive = true;
            if (isBossActive) {
              if (boss.helperSpeechTimer === undefined) {
                boss.helperSpeechTimer = 100;
                boss.helperDropTimer = 300;
                helperDialogueRef.current = { text: "Aayu! Be careful, a giant boss is guarding the area!", timer: 120 };
              }
              
              boss.helperSpeechTimer--;
              boss.helperDropTimer--;
              
              const trappedCharKey = activeLevel.id === 10 ? "aaru" :
                                     activeLevel.id === 20 ? "rishu" :
                                     activeLevel.id === 30 ? "aadi" :
                                     activeLevel.id === 40 ? "shau" :
                                     activeLevel.id === 50 ? "riu" : "riu";
                                     
              if (boss.helperSpeechTimer <= 0) {
                boss.helperSpeechTimer = 240 + Math.random() * 120;
                const advices = [
                  `Help me, Aayu! I'm trapped here!`,
                  `Jump on its head when it gets tired on the ground!`,
                  `Be careful of its heavy jumps and landing shockwaves!`,
                  `I'm scouring for items to throw down, watch out!`,
                  `Your Dash ability is perfect for escaping the slam!`,
                  `Stay strong! Let's save the robotic realm!`
                ];
                helperDialogueRef.current = {
                  text: advices[Math.floor(Math.random() * advices.length)],
                  timer: 155
                };
                audioEngine.playCoin();
              }
              
              if (boss.helperDropTimer <= 0) {
                boss.helperDropTimer = 360 + Math.random() * 200;
                const items: PowerUpType[] = ['mushroom', 'fireflower', 'iceflower', 'star', 'minimushroom'];
                const item = items[Math.floor(Math.random() * items.length)];
                
                powerUpsRef.current.push({
                  id: Date.now() + Math.random(),
                  type: item,
                  x: 480 + (Math.random() * 80 - 40),
                  y: 110,
                  width: 30,
                  height: 30,
                  collected: false,
                  spawnOffset: 0
                });
                
                helperDialogueRef.current = {
                  text: `HERE'S A ${item.toUpperCase()}! USE IT QUICK!`,
                  timer: 160
                };
                audioEngine.playCheckpoint();
              }
            }
            
            // Movement physics for the boss (shell spin or Red Ball 4 boss bounce)
            if (boss.shellState > 0) {
              boss.shellState--;
              e.width = 75;
              e.height = 70;
              e.x += e.speed * 2.5; // mega accelerated spin
              if (e.x < 50) {
                e.x = 50;
                e.speed = Math.abs(e.speed);
                audioEngine.playCheckpoint();
              }
              if (e.x + e.width > GAME_WIDTH - 50) {
                e.x = GAME_WIDTH - 50 - e.width;
                e.speed = -Math.abs(e.speed);
                audioEngine.playCheckpoint();
              }
              
              // shell friction sparks
              if (Math.random() < 0.15) {
                particlesRef.current.push({
                  x: e.x + e.width/2 + (Math.random() * 40 - 20),
                  y: e.y + e.height - 10,
                  size: Math.random() * 3 + 1.5,
                  speed: Math.random() * 1.5 + 0.5
                });
              }
            } else {
              // Standard Red Ball 4 Boss Loop
              e.width = 85;
              e.height = 85;
              
              boss.jumpTimer--;
              
              // Target player distance
              const distToX = (player.x + player.width/2) - (e.x + e.width/2);
              const maxGroundY = 450 - e.height;
              
              if (boss.aiState === 'stumped') {
                e.speed = 0;
                boss.aiTimer--;
                if (boss.aiTimer <= 0) {
                  boss.aiState = 'idle';
                  boss.jumpTimer = 130 + Math.random() * 40;
                }
              } else if (boss.aiState === 'preparing') {
                e.speed = 0;
                boss.aiTimer--;
                e.x += (Math.random() * 6 - 3); // shake!
                
                if (boss.aiTimer <= 0) {
                  boss.aiState = 'jumping';
                  e.vy = -13.5;
                  e.speed = distToX > 0 ? 4.5 : -4.5;
                  audioEngine.playJump();
                }
              } else if (boss.aiState === 'jumping') {
                e.x += e.speed;
                if (e.x < 50) { e.x = 50; e.speed = Math.abs(e.speed); }
                if (e.x + e.width > GAME_WIDTH - 50) { e.x = GAME_WIDTH - 50 - e.width; e.speed = -Math.abs(e.speed); }
                
                // Land check
                if (e.vy! > 0 && e.y >= maxGroundY - 8) {
                  boss.aiState = 'stumped';
                  boss.aiTimer = 70; // weary vulnerable state
                  e.vy = 0;
                  e.y = maxGroundY;
                  audioEngine.playStomp();
                  
                  // Expand ground shockwave rings
                  for (let i = 0; i < 18; i++) {
                    particlesRef.current.push({
                      x: e.x + e.width/2,
                      y: 445,
                      size: Math.random() * 4.5 + 3,
                      speed: (i % 2 === 0 ? 1 : -1) * (2.2 + Math.random() * 4.5)
                    });
                  }
                  
                  // Castle Boss Stomp spawns fire/shock sparks
                  if (boss.bossType === 'castle') {
                    bossFireballsRef.current.push({
                      id: Date.now() + Math.random(),
                      x: e.x,
                      y: 425,
                      vx: -5.5,
                      vy: 0,
                      width: 15,
                      height: 15,
                      isMini: true
                    });
                    bossFireballsRef.current.push({
                      id: Date.now() + Math.random(),
                      x: e.x + e.width,
                      y: 425,
                      vx: 5.5,
                      vy: 0,
                      width: 15,
                      height: 15,
                      isMini: true
                    });
                  }
                }
              } else {
                // pacing on ground
                e.x += e.speed;
                if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
                
                if (boss.jumpTimer <= 0) {
                  boss.aiState = 'preparing';
                  boss.aiTimer = 45;
                }
                
                // Shoot sequences or unique boss magical skills
                const isMiniActive = player.powerUp === 'mini';
                const fireProb = isMiniActive ? 0.04 : 0.018;
                if (Math.random() < fireProb) {
                  const dx = (player.x + player.width/2) - (e.x + e.width/2);
                  const dy = (player.y + player.height/2) - (e.y + e.height/2);
                  const dist = Math.hypot(dx, dy);
                  if (dist < 650) {
                    const angle = Math.atan2(dy, dx);
                    
                    if (boss.bossType === 'snowy') {
                      // Ice Koopa shoots cold freeze ice spikes!
                      bossFireballsRef.current.push({
                        id: Date.now() + Math.random(),
                        x: e.x + e.width/2,
                        y: e.y + e.height/3,
                        vx: Math.cos(angle) * 5.5,
                        vy: Math.sin(angle) * 5.5,
                        width: 16,
                        height: 16,
                        isMini: false
                      });
                      audioEngine.playCheckpoint();
                    } else if (boss.bossType === 'magma') {
                      // Magma Crab summons falling volcanic magma boulders from above player
                      bossFireballsRef.current.push({
                        id: Date.now() + Math.random(),
                        x: player.x + (Math.random() * 120 - 60),
                        y: -20,
                        vx: 0,
                        vy: 5.0,
                        width: 22,
                        height: 22,
                        isMini: false
                      });
                      audioEngine.playStomp();
                    } else {
                      // Default / Goomba / Castle boss standard synthetic fireballs
                      bossFireballsRef.current.push({
                        id: Date.now() + Math.random(),
                        x: e.x + e.width/2 - 10,
                        y: e.y + e.height/3 - 10,
                        vx: Math.cos(angle) * 3.8,
                        vy: Math.sin(angle) * 3.8,
                        width: 20,
                        height: 20,
                        isMini: false
                      });
                      audioEngine.playJump();
                    }
                  }
                }
              }
            }
          } else if (e.type === 'ghost') {
            // Ghost flight physics: ignore gravity bounds and pursue player when back is turned
            e.vy = 0;
            const playerToChase = activePlayers[0]?.ref || player;
            const ghostIsLeftOfPlayer = e.x < playerToChase.x;
            const playerIsFacingLeft = facingLeftRef.current;
            const isLookingAtGhost = (ghostIsLeftOfPlayer && playerIsFacingLeft) || (!ghostIsLeftOfPlayer && !playerIsFacingLeft);

            if (isLookingAtGhost) {
              (e as any).isShy = true;
            } else {
              (e as any).isShy = false;
              const dx = playerToChase.x - e.x;
              const dy = playerToChase.y - e.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 400) {
                const flySpeed = 1.0;
                e.x += (dx / dist) * flySpeed;
                e.y += (dy / dist) * flySpeed;
              } else {
                e.x += e.speed;
                if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
              }
            }
          } else if (e.type === 'guard') {
            // Guard patrol paces and shoots quick taser darts if player is sighted
            e.x += e.speed * 1.15;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;

            const playerToSight = activePlayers[0]?.ref || player;
            const distY = Math.abs(playerToSight.y - e.y);
            const distX = Math.abs(playerToSight.x - e.x);
            if (distY < 60 && distX < 220) {
              if (Math.random() < 0.015) {
                bossFireballsRef.current.push({
                  id: Date.now() + Math.random(),
                  x: e.x + (e.speed > 0 ? e.width : 0),
                  y: e.y + e.height / 3,
                  vx: e.speed > 0 ? 5 : -5,
                  vy: 0,
                  width: 10,
                  height: 4,
                  isMini: true
                });
              }
            }
          } else if (e.type === 'grumpy_pirate') {
            // Grumpy pirate paces back and forth and throws bouncing wooden casks at the player!
            e.x += e.speed * 0.95;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;

            const playerToSight = activePlayers[0]?.ref || player;
            const distY = Math.abs(playerToSight.y - e.y);
            const distX = Math.abs(playerToSight.x - e.x);

            // If player is within range, toss a barrel!
            if (distX < 280 && distY < 180) {
              if (Math.random() < 0.016) { // once every ~1.5 to 2 seconds
                const throwDir = playerToSight.x < e.x ? -1 : 1;
                bossFireballsRef.current.push({
                  id: Date.now() + Math.random(),
                  x: e.x + (throwDir > 0 ? e.width : -24),
                  y: e.y + 2, // shoulder/hand height
                  vx: throwDir * (2.2 + Math.random() * 1.5),
                  vy: -4.0, // upward toss arc trajectory
                  width: 22,
                  height: 22,
                  isMini: false,
                  isBarrel: true
                } as any);
                audioEngine.playJump(); // play nice audio jump/impact on barrel throw!
              }
            }
          } else if (e.type === 'alien') {
            // Alien flies/hovers with high-tech ufo thrust!
            e.vy = 0;
            e.x += e.speed * 1.35;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
            e.y += Math.sin(Date.now() / 150 + e.id) * 1.8;
            if (e.y > 400) e.y = 400;
            if (e.y < 80) e.y = 80;
          } else if (e.type === 'void_eye') {
            // Void eye hovering and weaving in deep space
            e.vy = 0;
            e.x += e.speed * 1.0;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
            e.y += Math.sin(Date.now() / 180 + e.id * 5) * 1.2;
            if (e.y > 410) e.y = 410;
            if (e.y < 60) e.y = 60;
          } else if (e.type === 'wind_spirit') {
            // Wind spirit floats in an infinity loop pattern
            e.vy = 0;
            e.x += e.speed * 1.1;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
            e.y += Math.cos(Date.now() / 200 + e.id) * 1.5;
            if (e.y > 380) e.y = 380;
            if (e.y < 80) e.y = 80;
          } else if (e.type === 'raptor') {
            // Raptors sprint very fast on the ground!
            e.x += e.speed * 1.9;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
          } else if (e.type === 'cryo_slime') {
            // Slime slides slowly
            e.x += e.speed * 0.75;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
          } else if (e.type === 'neon_vector_car') {
            // Vector cars cruise at premium retro speeds!
            e.x += e.speed * 2.4;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
          } else if (e.type === 'fish') {
            // Fish swimming physics: counteract vertical gravity and swim sinusoidally
            e.vy = 0;
            e.x += e.speed * 1.25;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
            
            // Gentle sinusoidal swimming wave
            e.y += Math.sin(Date.now() / 250 + e.id * 10) * 1.5;
            
            // Constrain within organic swimming lanes (above ground, below water line)
            if (e.y > 400) e.y = 400;
            if (e.y < 120) e.y = 120;
          } else {
            e.x += e.speed;
            if (Math.abs(e.x - e.startX) > e.range) e.speed *= -1;
          }
        }

        // Collision with player
        activePlayers.forEach(({ ref: pRef, num }) => {
          if (
            !pRef.isDead &&
            pRef.x < e.x + e.width &&
            pRef.x + pRef.width > e.x &&
            pRef.y < e.y + e.height &&
            pRef.y + pRef.height > e.y
          ) {
            if (pRef.starTimer && pRef.starTimer > 0) {
              audioEngine.playStomp();
              if (e.type === 'boss') {
                const boss = e as any;
                if (boss.shellState && boss.shellState > 0) {
                  pRef.dy = -11;
                } else {
                  e.health! -= 1;
                  pRef.dy = -11;
                  if (boss.bossType === 'castle') {
                    boss.shellState = 240;
                  }
                  if (e.health! <= 0) {
                    enemiesRef.current = enemies.filter(item => item.id !== e.id);
                  }
                }
              } else {
                enemiesRef.current = enemies.filter(item => item.id !== e.id);
              }
            } else if (e.isFrozen) {
              // Kick frozen block
              audioEngine.playJump();
              e.isSliding = true;
              e.slideSpeed = (pRef.x + pRef.width/2 < e.x + e.width/2) ? 8 : -8;
              pRef.x += (pRef.x + pRef.width/2 < e.x + e.width/2) ? -15 : 15;
            } else if (pRef.dy > 0 && pRef.y + pRef.height < e.y + e.height / 2 && e.type !== 'ghost') {
              // Stomp logic
              if (e.type === 'boss') {
                const boss = e as any;
                if (boss.shellState && boss.shellState > 0) {
                  audioEngine.playJump();
                  pRef.dy = -11; // bounce off spin
                } else {
                  audioEngine.playStomp();
                  e.health! -= 1;
                  pRef.dy = -11; // high reward jump bounce
                  
                  if (boss.bossType === 'castle') {
                    boss.shellState = 240;
                    e.speed = e.speed > 0 ? 3.5 : -3.5;
                  } else {
                    boss.aiState = 'stumped';
                    boss.aiTimer = 85;
                  }
                  
                  if (e.health! <= 0) {
                    enemiesRef.current = enemies.filter(item => item.id !== e.id);
                    for (let i = 0; i < 28; i++) {
                      particlesRef.current.push({
                        x: e.x + e.width / 2,
                        y: e.y + e.height / 2,
                        size: Math.random() * 4.5 + 2,
                        speed: Math.random() * 6 + 1.5
                      });
                    }
                  }
                }
              } else if (e.type === 'koopa') {
                if (!e.isShell) {
                  e.isShell = true;
                  e.speed = 0;
                  pRef.dy = -10;
                } else {
                  e.speed = e.speed === 0 ? 8 : 0;
                  pRef.dy = -10;
                }
              } else if (e.type === 'gummy_bear') {
                enemiesRef.current = enemiesRef.current.filter(item => item.id !== e.id);
                if (e.width >= 35) {
                  enemiesRef.current.push(
                    {
                      id: e.id * 10 + 1,
                      type: 'gummy_bear',
                      x: Math.max(0, e.x - 15),
                      y: e.y,
                      width: 25,
                      height: 25,
                      speed: -1.8,
                      range: e.range / 1.5,
                      startX: Math.max(0, e.startX - 15)
                    },
                    {
                      id: e.id * 10 + 2,
                      type: 'gummy_bear',
                      x: Math.min(GAME_WIDTH - 25, e.x + 15),
                      y: e.y,
                      width: 25,
                      height: 25,
                      speed: 1.8,
                      range: e.range / 1.5,
                      startX: Math.min(GAME_WIDTH - 25, e.startX + 15)
                    }
                  );
                }
                audioEngine.playStomp();
                pRef.dy = -10;
              } else {
                enemiesRef.current = enemiesRef.current.filter(item => item.id !== e.id);
                pRef.dy = -10;
              }
            } else {
              if (num === 1) {
                handleDeath();
              } else {
                // CPU companion gets temporary blinks shield (infinite lives!)
                pRef.shieldTimer = 60;
                audioEngine.playJump(); // subtle bounce feedback
              }
            }
          }
        });
      });

      // 4. Logic: Boundaries
      activePlayers.forEach(({ ref: pRef, num }) => {
        if (!pRef.isDead) {
          if (pRef.y > GAME_HEIGHT) {
            if (num === 1) {
              handleDeath();
            } else {
              // CPU companion simply teleports close to Player 1! (Infinite lives)
              pRef.x = player.x - 40;
              pRef.y = player.y - 10;
              pRef.dy = 0;
            }
          }
          if (pRef.y < 0) { pRef.y = 0; pRef.dy = 0; }
          if (pRef.x < 0) pRef.x = 0;
          if (pRef.x + pRef.width > GAME_WIDTH) pRef.x = GAME_WIDTH - pRef.width;
        }
      });

      // 5. Logic: Checkpoint and FlagPole
      if (activeLevel.checkpoint && !activeLevel.checkpoint.reached) {
        let reachedCP = false;
        activePlayers.forEach(({ ref: pRef }) => {
          if (!reachedCP && !pRef.isDead) {
            const dx = (pRef.x + pRef.width / 2) - activeLevel.checkpoint!.x;
            const dy = (pRef.y + pRef.height / 2) - activeLevel.checkpoint!.y;
            if (Math.abs(dx) < 40 && Math.abs(dy) < 60) {
              reachedCP = true;
              activeLevel.checkpoint!.reached = true;
              audioEngine.playCheckpoint();
              
              // Set checkpoint coordinates so they respawn here wonderfully!
              playerRef.current.checkpointX = activeLevel.checkpoint!.x;
              playerRef.current.checkpointY = activeLevel.checkpoint!.y - playerRef.current.height;
            }
          }
        });
      }

      // 5b. Key Collection Logic (Sequel Mode)
      if (isSequelMode && isKeyRequired && keyRef.current && !keyRef.current.collected) {
        const key = keyRef.current;
        let collectedKey = false;
        activePlayers.forEach(({ ref: pRef }) => {
          if (!collectedKey && !pRef.isDead) {
            const dx = (pRef.x + pRef.width / 2) - key.x;
            const dy = (pRef.y + pRef.height / 2) - key.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 32) {
              collectedKey = true;
              key.collected = true;
              
              // Give the key to the player!
              playerRef.current.hasKey = true;
              
              soundEffectManager.playCoin(); // sweet key pickup tone!
              
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: key.x + (Math.random() * 12 - 6),
                  y: key.y + (Math.random() * 12 - 6),
                  size: Math.random() * 4 + 2.5,
                  speed: Math.random() * 3 + 1
                });
              }
            }
          }
        });
      }

      let reachedFlag = false;
      let hasBothKey = true;
      if (isSequelMode && isKeyRequired) {
        hasBothKey = playerRef.current.hasKey;
      }
      
      activePlayers.forEach(({ ref: pRef, num }) => {
        if (!reachedFlag && !pRef.isDead) {
          const fdx = (pRef.x + pRef.width / 2) - activeLevel.flagPole.x;
          if (Math.abs(fdx) < 40 && pRef.y + pRef.height > activeLevel.flagPole.y - 120) {
            if (isSequelMode && isKeyRequired && !hasBothKey) {
              if (!pRef.keyWarningTimer || pRef.keyWarningTimer <= 0) {
                pRef.keyWarningTimer = 75; // show padlock warning banner
                audioEngine.playCheckpoint(); // alarm sound
              }
              // bounce back slightly
              pRef.x += (pRef.x < activeLevel.flagPole.x) ? -12 : 12;
            } else {
              reachedFlag = true;
            }
          }
        }
      });

      if (reachedFlag) {
        if (!hasPlayedLevelClearRef.current) {
          audioEngine.playLevelClear();
          hasPlayedLevelClearRef.current = true;
        }

        if (originalLevelIndexBeforePipeRef.current !== null) {
          const originalIdx = originalLevelIndexBeforePipeRef.current;
          originalLevelIndexBeforePipeRef.current = null; // reset
          setCurrentLevelIndex(originalIdx);
          setGameState(prev => ({
            ...prev,
            score: prev.score + 30
          }));
          
          // Respawn player back on the track
          player.x = 100;
          player.y = 300;
          player.dy = 0;
          player.dx = 0;
          
          alert("🏆 SECRET CAVE LEVEL CLEAR! Returning back to sector with a +30 COIN BONUS!");
          return;
        }
        
        // Character unlocking mechanism on boss completion
        const clearedId = activeLevel.id;
        let newlyUnlocked: string | null = null;
        if (clearedId === 10) newlyUnlocked = "aaru";
        else if (clearedId === 20) newlyUnlocked = "rishu";
        else if (clearedId === 30) newlyUnlocked = "aadi";
        else if (clearedId === 40) newlyUnlocked = "shau";
        else if (clearedId === 50) newlyUnlocked = "riu";

          // Calculate progression updates
          if (currentLevelIndex < 40) {
            // Classic Pt I level cleared (indices 0 to 39)
            const nextClassicIndex = currentLevelIndex + 1;
            if (nextClassicIndex > highestClassicUnlocked) {
              setHighestClassicUnlocked(nextClassicIndex);
              localStorage.setItem("sa_highest_classic_unlocked", String(nextClassicIndex));
            }
            if (nextClassicIndex === 40) {
              setIsCyberUnlocked(true);
              localStorage.setItem("sa_cyber_unlocked", "true");
            }
          } else {
            // Cyber Pt II cleared (indices 40 to 79)
            const nextCyberIndex = currentLevelIndex + 1;
            if (nextCyberIndex > highestCyberUnlocked) {
              setHighestCyberUnlocked(nextCyberIndex);
              localStorage.setItem("sa_highest_cyber_unlocked", String(nextCyberIndex));
            }
          }

          // If final game level beaten (Level 80)
          if (clearedId === 80) {
            setIsCreditsActive(true);
            setIsStarted(false);
            return;
          }

          if (newlyUnlocked) {
            setUnlockedChars(prev => {
              if (prev.includes(newlyUnlocked!)) return prev;
              const updated = [...prev, newlyUnlocked!];
              localStorage.setItem("sa_unlocked_chars", JSON.stringify(updated));
              return updated;
            });
            setUnlockNotification(newlyUnlocked);
            
            // Set rescued overlay which will delay the next level load until click continue
            setActiveSavedHeroUnlock({
              unlockedHeroId: newlyUnlocked,
              activeHeroId: selectedChar,
              level: clearedId
            });
          } else {
            // Delay auto-progression by showing a dedicated Level Clear Screen!
            setIsLevelClear(true);
          }
        }

      // 6. Logic: Coin Collection
      let currentScore = 0;
      coins.forEach((c) => {
        if (!c.collected) {
          let foundByPlayer = false;
          activePlayers.forEach(({ ref: pRef }) => {
            if (!foundByPlayer && !pRef.isDead) {
              const dx = (pRef.x + pRef.width / 2) - c.x;
              const dy = (pRef.y + pRef.height / 2) - c.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 30) {
                c.collected = true;
                foundByPlayer = true;
                audioEngine.playCoin();
              }
            }
          });
        }
        if (c.collected) currentScore++;
      });

      // 7. Logic: PowerUp collection
      const powerUps = powerUpsRef.current;
      powerUps.forEach(p => {
        if (p.spawnOffset === undefined) p.spawnOffset = 0;
        if (p.spawnOffset > 0) {
          p.spawnOffset -= 1.2;
          if (p.spawnOffset < 0) p.spawnOffset = 0;
        }

        if (!p.collected) {
          // Can only collect once powerup has emerged sufficiently (like classic Mario)
          if (p.spawnOffset > 15) return;

          let collectedByPlayer = false;
          activePlayers.forEach(({ ref: pRef }) => {
            if (!collectedByPlayer && !pRef.isDead) {
              const dx = (pRef.x + pRef.width / 2) - p.x;
              const dy = (pRef.y + pRef.height / 2) - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 32) {
                p.collected = true;
                collectedByPlayer = true;
                audioEngine.playCheckpoint(); // fanfare sounds on superpower activation
                if (p.type === 'mushroom') {
                  pRef.powerUp = 'mushroom';
                  pRef.width = 54;
                  pRef.height = 66;
                } else if (p.type === 'minimushroom') {
                  pRef.powerUp = 'mini';
                  pRef.width = 18;
                  pRef.height = 22;
                } else if (p.type === 'fireflower') {
                  pRef.powerUp = 'fire';
                  pRef.width = 54;
                  pRef.height = 66;
                } else if (p.type === 'iceflower') {
                  pRef.powerUp = 'ice';
                  pRef.width = 54;
                  pRef.height = 66;
                } else if (p.type === 'star') {
                  pRef.starTimer = 540; // 9 seconds
                }
              }
            }
          });
        }
      });

      // 8. Draw and State Update
      draw(ctx, activeLevel, player, platforms, coins, enemies);

      if (currentScore !== gameState.score) {
        setGameState(prev => ({ ...prev, score: currentScore }));
      }

      if (player.powerUp !== activePowerUpState) {
        setActivePowerUpState(player.powerUp);
      }

      animationId = requestAnimationFrame(update);
    };

    const draw = (
      ctx: CanvasRenderingContext2D, 
      activeLevel: Level,
      player: Player,
      platforms: Platform[],
      coins: Coin[],
      enemies: Enemy[]
    ) => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Background with Day to Night transition as player progresses
      const flagX = activeLevel.flagPole ? activeLevel.flagPole.x : 900;
      const progress = Math.min(1.0, Math.max(0, player.x / flagX));
      
      const nightTopColor = "#02020f";
      const nightBottomColor = "#0d0920";
      
      // Interpolate sky colors based on progress ratio
      const currentBgTop = interpolateColor(activeLevel.backgroundColor[0], nightTopColor, progress);
      const currentBgBottom = interpolateColor(activeLevel.backgroundColor[1], nightBottomColor, progress);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGradient.addColorStop(0, currentBgTop);
      bgGradient.addColorStop(1, currentBgBottom);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Celestial stars twinkling in the twilight as day turns into night
      if (progress > 0.3) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, " + ((progress - 0.3) * 1.4) + ")";
        for (let i = 0; i < 25; i++) {
          const starX = (i * 73) % GAME_WIDTH;
          const starY = (i * 19) % 180; // keep in upper sky area
          const starSize = 0.8 + (Math.sin(Date.now() / 250 + i) * 0.4);
          ctx.fillRect(starX, starY, starSize, starSize);
        }
        ctx.restore();
      }

      // 0b. Sequel Cyber Grid Visual Base Overlay
      if (isSequelMode) {
        ctx.save();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.075)"; // cyber cyan matrix grid
        ctx.lineWidth = 1.0;
        
        // Draw elegant vertical lines
        for (let gx = 0; gx < GAME_WIDTH; gx += 45) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, GAME_HEIGHT);
          ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let gy = 0; gy < GAME_HEIGHT; gy += 45) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(GAME_WIDTH, gy);
          ctx.stroke();
        }

        // Draw floating cyber bio-luminescent space particles
        ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
        for (let i = 0; i < 5; i++) {
          const sx = (Date.now() / 50 + i * 160) % GAME_WIDTH;
          const sy = (Math.sin(Date.now() / 500 + i) * 45 + 100 + i * 50) % GAME_HEIGHT;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // --- Background Decorations ---
      ctx.save();
      if (activeLevel.theme === 'surface') {
        // Pine and Oak trees in Sunny Surface levels
        const treePositions = [
          { x: 120, height: 160, baseWidth: 60, type: 'oak' },
          { x: 380, height: 210, baseWidth: 70, type: 'pine' },
          { x: 620, height: 180, baseWidth: 60, type: 'oak' },
          { x: 880, height: 230, baseWidth: 80, type: 'pine' }
        ];
        treePositions.forEach(t => {
          // Draw trunk
          ctx.fillStyle = "rgba(120, 53, 15, 0.4)";
          ctx.fillRect(t.x - 8, 450 - t.height, 16, t.height);
          
          if (t.type === 'pine') {
            // Layered pine canopy
            ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              const levelY = 450 - t.height + i * 40;
              const levelWidth = t.baseWidth - i * 15;
              ctx.moveTo(t.x, levelY - 30);
              ctx.lineTo(t.x - levelWidth / 2, levelY + 40);
              ctx.lineTo(t.x + levelWidth / 2, levelY + 40);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            // Rounded plush oak canopy
            ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
            ctx.beginPath();
            const cy = 450 - t.height;
            ctx.arc(t.x, cy, t.baseWidth / 2, 0, Math.PI * 2);
            ctx.arc(t.x - 20, cy + 15, t.baseWidth / 2.5, 0, Math.PI * 2);
            ctx.arc(t.x + 20, cy + 15, t.baseWidth / 2.5, 0, Math.PI * 2);
            ctx.arc(t.x, cy - 20, t.baseWidth / 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (activeLevel.theme === 'underwater') {
        // Water waving seagrass / vines
        const time = Date.now() / 800;
        ctx.strokeStyle = "rgba(22, 78, 99, 0.45)"; // dark cyan/teal
        for (let x = 60; x < GAME_WIDTH; x += 130) {
          ctx.lineWidth = 14;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x, 450);
          const bend = Math.sin(time + x / 100) * 16;
          ctx.bezierCurveTo(x + bend, 380, x - bend, 300, x + bend / 2, 220);
          ctx.stroke();
        }

        // Coral reef structures (wavy, bubbly, cute colors with absolute transparency)
        const corals = [
          { x: 140, type: 'fan', color: "rgba(244, 114, 182, 0.55)" }, // Pink
          { x: 290, type: 'branch', color: "rgba(192, 132, 252, 0.55)" }, // Purple
          { x: 480, type: 'fan', color: "rgba(251, 146, 60, 0.55)" }, // Orange
          { x: 710, type: 'branch', color: "rgba(244, 114, 182, 0.55)" }, // Pink
          { x: 860, type: 'fan', color: "rgba(45, 212, 191, 0.55)" }, // Teal
        ];

        corals.forEach(c => {
          ctx.save();
          ctx.translate(c.x, 450);
          const coralWiggle = Math.sin(time + c.x / 120) * 3;
          ctx.rotate(coralWiggle * Math.PI / 180);

          if (c.type === 'fan') {
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(0, -25, 20, 0, Math.PI * 2);
            ctx.arc(-18, -45, 15, 0, Math.PI * 2);
            ctx.arc(18, -45, 15, 0, Math.PI * 2);
            ctx.arc(0, -55, 18, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(0, -55);
            ctx.moveTo(0, -10); ctx.lineTo(-15, -45);
            ctx.moveTo(0, -10); ctx.lineTo(15, -45);
            ctx.stroke();
          } else {
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -50);
            ctx.moveTo(0, -25);
            ctx.quadraticCurveTo(-15, -35, -20, -55);
            ctx.moveTo(0, -15);
            ctx.quadraticCurveTo(15, -25, 23, -48);
            ctx.stroke();
          }
          ctx.restore();
        });
      } else if (activeLevel.theme === 'river') {
        // Normal green trees in the river level
        const treePositions = [
          { x: 90, height: 150, leavesRadius: 38 },
          { x: 270, height: 125, leavesRadius: 30 },
          { x: 540, height: 135, leavesRadius: 34 },
          { x: 730, height: 155, leavesRadius: 42 },
          { x: 900, height: 130, leavesRadius: 33 }
        ];
        treePositions.forEach(t => {
          ctx.fillStyle = "rgba(120, 53, 15, 0.35)";
          ctx.fillRect(t.x - 7, 450 - t.height, 14, t.height);
          
          ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
          ctx.beginPath();
          const cy = 450 - t.height;
          ctx.arc(t.x, cy, t.leavesRadius, 0, Math.PI * 2);
          ctx.arc(t.x - t.leavesRadius * 0.4, cy + t.leavesRadius * 0.2, t.leavesRadius * 0.8, 0, Math.PI * 2);
          ctx.arc(t.x + t.leavesRadius * 0.4, cy + t.leavesRadius * 0.2, t.leavesRadius * 0.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Waving translucent river water between our custom platforms (Gaps at [220, 380] and [620, 760])!
        ctx.fillStyle = "rgba(14, 165, 233, 0.68)"; // Deep sparkling water blue
        ctx.fillRect(220, 450, 160, 50);
        ctx.fillRect(620, 450, 140, 50);

        // Render wavy water lines on top of the river gaps
        const waveTime = Date.now() / 250;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // River wave 1 (Gap at 220px to 380px)
        ctx.beginPath();
        for (let wx = 220; wx <= 380; wx += 8) {
          const wy = 450 + Math.sin(waveTime + wx / 12) * 5;
          if (wx === 220) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        // River wave 2 (Gap at 620px to 760px)
        ctx.beginPath();
        for (let wx = 620; wx <= 760; wx += 8) {
          const wy = 450 + Math.sin(waveTime + wx / 12) * 5;
          if (wx === 620) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        // Render beautiful falling diagonal rain drops over the whole canvas screen!
        ctx.save();
        const rainTime = Date.now() / 150;
        ctx.strokeStyle = "rgba(186, 230, 253, 0.45)"; // light cyan-sky rain lines
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 40; i++) {
          const rx = (i * 27 + rainTime * 35) % GAME_WIDTH;
          const ry = (i * 13 + rainTime * 120) % GAME_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 16);
          ctx.stroke();
        }
        ctx.restore();
      } else if (activeLevel.theme === 'sky') {
        // Draw elegant puffy high-altitude background clouds
        const clouds = [
          { x: 120, y: 70, scale: 1.2 },
          { x: 380, y: 130, scale: 0.95 },
          { x: 610, y: 60, scale: 1.4 },
          { x: 860, y: 110, scale: 1.1 }
        ];
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        clouds.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 25 * c.scale, 0, Math.PI * 2);
          ctx.arc(c.x - 20 * c.scale, c.y + 5 * c.scale, 18 * c.scale, 0, Math.PI * 2);
          ctx.arc(c.x + 20 * c.scale, c.y + 5 * c.scale, 18 * c.scale, 0, Math.PI * 2);
          ctx.arc(c.x, c.y - 12 * c.scale, 20 * c.scale, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        });
      } else if (activeLevel.theme === 'village') {
        // Draw beautiful quaint village cottages in the backdrop
        const houses = [
          { x: 130, w: 75, h: 55, roofColor: "#ef4444", wallColor: "rgba(248, 250, 252, 0.45)" },
          { x: 480, w: 90, h: 65, roofColor: "#0f766e", wallColor: "rgba(253, 244, 215, 0.45)" },
          { x: 790, w: 70, h: 50, roofColor: "#6366f1", wallColor: "rgba(241, 245, 249, 0.45)" }
        ];
        houses.forEach(h => {
          // Draw wall
          ctx.fillStyle = h.wallColor;
          ctx.fillRect(h.x, 450 - h.h, h.w, h.h);
          
          // Small brown door
          ctx.fillStyle = "rgba(120, 53, 15, 0.65)";
          ctx.fillRect(h.x + h.w / 2 - 8, 450 - 24, 16, 24);

          // Small warm window lights!
          ctx.fillStyle = "rgba(253, 224, 71, 0.8)";
          ctx.fillRect(h.x + 12, 450 - h.h + 12, 12, 12);
          ctx.fillRect(h.x + h.w - 24, 450 - h.h + 12, 12, 12);

          // Gable roof
          ctx.fillStyle = h.roofColor;
          ctx.beginPath();
          ctx.moveTo(h.x - 8, 450 - h.h);
          ctx.lineTo(h.x + h.w / 2, 450 - h.h - 28);
          ctx.lineTo(h.x + h.w + 8, 450 - h.h);
          ctx.closePath();
          ctx.fill();
        });
      } else if (activeLevel.theme === 'farm') {
        // Hay fields, rustic fences, and a big red barn outline representing the farm
        ctx.fillStyle = "rgba(239, 68, 68, 0.28)"; // red barn backdrop silhouette
        ctx.beginPath();
        ctx.moveTo(560, 450);
        ctx.lineTo(560, 350);
        ctx.lineTo(615, 310);
        ctx.lineTo(670, 350);
        ctx.lineTo(670, 450);
        ctx.closePath();
        ctx.fill();

        // White barn doors X pattern
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(595, 410); ctx.lineTo(635, 450);
        ctx.moveTo(635, 410); ctx.lineTo(595, 450);
        ctx.stroke();

        // Round plush golden hay stacks in front of the barn!
        const haystacks = [
          { x: 180, r: 35 },
          { x: 400, r: 42 },
          { x: 780, r: 32 }
        ];
        ctx.fillStyle = "rgba(234, 179, 8, 0.4)";
        haystacks.forEach(h => {
          ctx.beginPath();
          ctx.arc(h.x, 450, h.r, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          
          // Little cross-hatch detail lines inside haystacks
          ctx.strokeStyle = "rgba(202, 138, 4, 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(h.x - h.r/2, 450 - h.r/3);
          ctx.lineTo(h.x + h.r/2, 450 - h.r/2);
          ctx.stroke();
        });
      } else if (activeLevel.theme === 'jungle') {
        // Large majestic Banyan trees with aerial roots in Jungle level
        const positions = [
          { x: 230, trunkWidth: 36, canopyRadius: 115 },
          { x: 750, trunkWidth: 42, canopyRadius: 135 }
        ];
        positions.forEach(t => {
          const treeY = 190;
          const groundY = 450;
          
          ctx.fillStyle = "rgba(100, 50, 10, 0.38)";
          ctx.beginPath();
          ctx.moveTo(t.x - t.trunkWidth / 2, groundY);
          ctx.lineTo(t.x - t.trunkWidth / 4, treeY + 40);
          ctx.lineTo(t.x - t.trunkWidth, treeY - 15);
          ctx.lineTo(t.x + t.trunkWidth, treeY - 15);
          ctx.lineTo(t.x + t.trunkWidth / 4, treeY + 40);
          ctx.lineTo(t.x + t.trunkWidth / 2, groundY);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(120, 53, 15, 0.22)";
          ctx.lineWidth = 2;
          const rootXOffsets = [-24, -14, -4, 4, 14, 24, -40, 40];
          rootXOffsets.forEach((ox) => {
            ctx.beginPath();
            ctx.moveTo(t.x + ox, treeY);
            ctx.bezierCurveTo(
              t.x + ox + Math.sin(ox + 1.2) * 8, treeY + 80,
              t.x + ox - Math.sin(ox + 2.5) * 8, treeY + 180,
              t.x + ox, groundY
            );
            ctx.stroke();
          });

          ctx.fillStyle = "rgba(6, 78, 59, 0.42)";
          ctx.beginPath();
          ctx.arc(t.x, treeY - 25, t.canopyRadius, 0, Math.PI * 2);
          ctx.arc(t.x - 50, treeY - 35, t.canopyRadius * 0.8, 0, Math.PI * 2);
          ctx.arc(t.x + 50, treeY - 35, t.canopyRadius * 0.8, 0, Math.PI * 2);
          ctx.arc(t.x - 85, treeY + 5, t.canopyRadius * 0.65, 0, Math.PI * 2);
          ctx.arc(t.x + 85, treeY + 5, t.canopyRadius * 0.65, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'beach') {
        // Swaying Palm trees in the Beach level
        const palms = [
          { x: 170, height: 185, swayFactor: 1.2 },
          { x: 520, height: 175, swayFactor: 0.8 },
          { x: 800, height: 205, swayFactor: 1.4 }
        ];
        
        const time = Date.now() / 1200;
        palms.forEach((p) => {
          ctx.save();
          ctx.translate(p.x, 450);
          
          const bend = Math.sin(time) * 11 * p.swayFactor;
          
          ctx.strokeStyle = "rgba(180, 110, 50, 0.38)";
          ctx.lineWidth = 11;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(bend * 0.3, -p.height * 0.4, bend * 0.7, -p.height * 0.8, bend, -p.height);
          ctx.stroke();
          
          ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
          ctx.lineWidth = 11;
          ctx.setLineDash([4, 11]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(bend * 0.3, -p.height * 0.4, bend * 0.7, -p.height * 0.8, bend, -p.height);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.translate(bend, -p.height);
          ctx.fillStyle = "rgba(22, 163, 74, 0.43)";
          
          const frondsCount = 6;
          for (let i = 0; i < frondsCount; i++) {
            ctx.save();
            const angle = (Math.PI * 2 * i) / frondsCount + time * 0.04;
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(20, -10, 55, 10);
            ctx.quadraticCurveTo(25, 20, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.restore();
        });
      } else if (activeLevel.theme === 'cave') {
        // Stalactites from ceiling
        ctx.fillStyle = "rgba(75, 85, 99, 0.45)"; // slate cavern rock
        const stalactites = [
          { x: 80, w: 40, h: 90 },
          { x: 230, w: 55, h: 120 },
          { x: 420, w: 35, h: 70 },
          { x: 590, w: 60, h: 140 },
          { x: 780, w: 45, h: 100 },
          { x: 910, w: 35, h: 80 }
        ];
        stalactites.forEach(s => {
          ctx.beginPath();
          ctx.moveTo(s.x - s.w/2, 0);
          ctx.lineTo(s.x + s.w/2, 0);
          ctx.lineTo(s.x, s.h);
          ctx.closePath();
          ctx.fill();
        });

        // Glowing cavern crystal gems
        const crystals = [
          { x: 150, y: 180, color: "rgba(236, 72, 153, 0.6)", glow: "#ec4899" }, // Ruby Pink
          { x: 340, y: 310, color: "rgba(6, 182, 212, 0.6)", glow: "#06b6d4" }, // Cyan Diamond
          { x: 510, y: 150, color: "rgba(234, 179, 8, 0.6)", glow: "#eab308" }, // Amber Topaz
          { x: 680, y: 350, color: "rgba(34, 197, 94, 0.6)", glow: "#22c55e" }, // Emerald Green
          { x: 880, y: 240, color: "rgba(168, 85, 247, 0.6)", glow: "#a855f7" }  // Amethyst Purple
        ];
        crystals.forEach((cry, ind) => {
          const size = 10;
          const pulse = Math.sin(Date.now() / 400 + ind) * 4;
          ctx.save();
          ctx.shadowBlur = 8 + pulse;
          ctx.shadowColor = cry.glow;
          ctx.fillStyle = cry.color;
          ctx.beginPath();
          ctx.moveTo(cry.x, cry.y - size);
          ctx.lineTo(cry.x + size, cry.y);
          ctx.lineTo(cry.x, cry.y + size);
          ctx.lineTo(cry.x - size, cry.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      } else if (activeLevel.theme === 'underground') {
        // Pipes running behind the stage
        ctx.strokeStyle = "rgba(71, 85, 105, 0.35)"; // grey metal pipe
        ctx.lineWidth = 16;
        ctx.lineCap = "butt";
        
        // Horizontal main steam conduits
        ctx.beginPath();
        ctx.moveTo(0, 100); ctx.lineTo(GAME_WIDTH, 100);
        ctx.moveTo(0, 360); ctx.lineTo(GAME_WIDTH, 360);
        ctx.stroke();

        // Vertical branches and power junctions
        ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(330, 0); ctx.lineTo(330, GAME_HEIGHT);
        ctx.moveTo(690, 0); ctx.lineTo(690, GAME_HEIGHT);
        ctx.stroke();

        // Glowing reactor conduit rings
        const time = Date.now() / 600;
        const ringsIdx = [100, 250, 400, 550, 700, 850];
        ringsIdx.forEach((rx, idx) => {
          const capActive = Math.sin(time + idx) > 0;
          ctx.fillStyle = capActive ? "rgba(34, 211, 238, 0.45)" : "rgba(71, 85, 105, 0.35)";
          ctx.fillRect(rx, 90, 15, 20);
          ctx.fillRect(rx + 50, 350, 15, 20);
        });

        // Industrial hazard lines on corners or columns
        ctx.fillStyle = "rgba(234, 179, 8, 0.18)"; // bright caution gold tint
        ctx.fillRect(40, 120, 24, 220);
        ctx.fillRect(920, 120, 24, 220);
        
        ctx.fillStyle = "rgba(15, 23, 42, 0.25)"; // black metal stripes
        for (let y = 130; y < 330; y += 30) {
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(64, y + 15);
          ctx.lineTo(64, y + 25);
          ctx.lineTo(40, y + 10);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(920, y);
          ctx.lineTo(944, y + 15);
          ctx.lineTo(944, y + 25);
          ctx.lineTo(920, y + 10);
          ctx.closePath();
          ctx.fill();
        }
      } else if (activeLevel.theme === 'city') {
        // High-contrast neon futuristic metropolis skyscrapers
        const bases = [
          { x: 40, w: 90, h: 290, col: "rgba(124, 58, 237, 0.15)", neon: "rgba(139, 92, 246, 0.25)" },
          { x: 160, w: 120, h: 360, col: "rgba(30, 41, 59, 0.25)", neon: "rgba(56, 189, 248, 0.3)" },
          { x: 310, w: 80, h: 220, col: "rgba(124, 58, 237, 0.15)", neon: "rgba(139, 92, 246, 0.25)" },
          { x: 420, w: 140, h: 310, col: "rgba(15, 23, 42, 0.3)", neon: "rgba(236, 72, 153, 0.25)" },
          { x: 590, w: 100, h: 340, col: "rgba(30, 41, 59, 0.25)", neon: "rgba(56, 189, 248, 0.3)" },
          { x: 720, w: 85, h: 260, col: "rgba(124, 58, 237, 0.15)", neon: "rgba(139, 92, 246, 0.25)" },
          { x: 840, w: 110, h: 380, col: "rgba(15, 23, 42, 0.32)", neon: "rgba(236, 72, 153, 0.28)" }
        ];

        bases.forEach(b => {
          // Draw building container
          ctx.fillStyle = b.col;
          ctx.fillRect(b.x, 450 - b.h, b.w, b.h);

          // Add elegant glowing top neon spire line
          ctx.fillStyle = b.neon;
          ctx.fillRect(b.x + b.w / 2 - 2, 450 - b.h - 25, 4, 25);
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, 450 - b.h - 25, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Grid of warm retro glowing yellow/blue window lights
          ctx.fillStyle = "rgba(250, 204, 21, 0.25)"; // yellow window light
          const colsCount = Math.floor(b.w / 22);
          const rowsCount = Math.floor(b.h / 32);
          for (let c = 0; c < colsCount; c++) {
            for (let r = 0; r < rowsCount; r++) {
              // Only light up select windows for realistic texture
              if ((b.x * c + r * 7) % 5 < 3) {
                const wx = b.x + 8 + c * 20;
                const wy = 450 - b.h + 12 + r * 28;
                ctx.fillRect(wx, wy, 8, 12);
              }
            }
          }
        });
      } else if (activeLevel.theme === 'desert') {
        // Warm ancient pyramids and elegant desert cacti
        ctx.fillStyle = "rgba(180, 83, 9, 0.12)"; // Warm brownish-orange shadows
        const pyramids = [
          { x: 150, w: 250, h: 140 },
          { x: 500, w: 320, h: 185 },
          { x: 800, w: 200, h: 115 }
        ];
        pyramids.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x - p.w/2, 450);
          ctx.lineTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w/2, 450);
          ctx.closePath();
          ctx.fill();
          
          // Side shadow for 3D pyramid block effect
          ctx.fillStyle = "rgba(120, 53, 4, 0.08)";
          ctx.beginPath();
          ctx.moveTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w/2, 450);
          ctx.lineTo(p.x, 450);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(180, 83, 9, 0.12)"; // restore
        });

        // Draw green desert cacti
        const cacti = [
          { x: 100, h: 75 },
          { x: 380, h: 90 },
          { x: 680, h: 65 },
          { x: 880, h: 80 }
        ];
        cacti.forEach(c => {
          ctx.fillStyle = "rgba(21, 128, 61, 0.35)"; // translucent cactus green
          // main trunk
          ctx.fillRect(c.x - 7, 450 - c.h, 14, c.h);
          // left branch
          ctx.fillRect(c.x - 22, 450 - c.h * 0.7, 15, 10);
          ctx.fillRect(c.x - 22, 450 - c.h * 0.9, 10, c.h * 0.3);
          // right branch
          ctx.fillRect(c.x + 7, 450 - c.h * 0.5, 15, 10);
          ctx.fillRect(c.x + 12, 450 - c.h * 0.75, 10, c.h * 0.35);
        });
      } else if (activeLevel.theme === 'island') {
        // Sandy tropical islands and palm trees in lagoons
        ctx.fillStyle = "rgba(14, 116, 144, 0.12)"; // water mounds
        const islands = [
          { x: 255, w: 190, h: 32 },
          { x: 645, w: 235, h: 48 },
          { x: 845, w: 150, h: 28 }
        ];
        islands.forEach(isl => {
          ctx.beginPath();
          ctx.ellipse(isl.x, 450, isl.w / 2, isl.h, 0, Math.PI, 0);
          ctx.fill();
        });

        // Beautiful swaying palm trees
        const palms = [
          { x: 300, height: 160, swayFactor: 0.9 },
          { x: 700, height: 180, swayFactor: 1.1 }
        ];
        const time = Date.now() / 1400;
        palms.forEach((p) => {
          ctx.save();
          ctx.translate(p.x, 450);
          const bend = Math.sin(time) * 9 * p.swayFactor;
          ctx.strokeStyle = "rgba(161, 98, 7, 0.42)"; // palm trunk
          ctx.lineWidth = 9;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(bend * 0.3, -p.height * 0.4, bend * 0.7, -p.height * 0.8, bend, -p.height);
          ctx.stroke();

          ctx.translate(bend, -p.height);
          ctx.fillStyle = "rgba(16, 185, 129, 0.45)"; // bright emerald fronds
          const frondsCount = 5;
          for (let i = 0; i < frondsCount; i++) {
            ctx.save();
            const angle = (Math.PI * 2 * i) / frondsCount + time * 0.05;
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(15, -8, 45, 8);
            ctx.quadraticCurveTo(20, 16, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        });
      } else if (activeLevel.theme === 'snowy') {
        // Snowy peaks and frost pines
        ctx.fillStyle = "rgba(148, 163, 184, 0.15)"; // mountains
        const peaks = [
          { x: 200, w: 260, h: 220 },
          { x: 480, w: 360, h: 280 },
          { x: 820, w: 240, h: 180 }
        ];
        peaks.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x - p.w/2, 450);
          ctx.lineTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w/2, 450);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "rgba(241, 245, 249, 0.35)"; // snowcap
          ctx.beginPath();
          ctx.moveTo(p.x - p.w * 0.1, 450 - p.h * 0.8);
          ctx.lineTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w * 0.1, 450 - p.h * 0.8);
          ctx.lineTo(p.x + p.w * 0.05, 450 - p.h * 0.72);
          ctx.lineTo(p.x, 450 - p.h * 0.76);
          ctx.lineTo(p.x - p.w * 0.05, 450 - p.h * 0.72);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(148, 163, 184, 0.15)"; // restore
        });

        // Pines
        const pines = [
          { x: 120, h: 80, layers: 3 },
          { x: 340, h: 110, layers: 4 },
          { x: 620, h: 90, layers: 3 },
          { x: 740, h: 100, layers: 3 },
          { x: 920, h: 75, layers: 3 }
        ];
        pines.forEach(p => {
          ctx.fillStyle = "rgba(100, 116, 139, 0.25)";
          ctx.fillRect(p.x - 5, 450 - p.h, 10, p.h);

          ctx.fillStyle = "rgba(15, 118, 110, 0.32)"; // forest teal
          for (let i = 0; i < p.layers; i++) {
            const layerYmin = 450 - p.h * 0.3 - (i * p.h * 0.22);
            const layerYmax = 450 - p.h * 0.05 - (i * p.h * 0.22);
            const layerWidth = 46 - i * 8;
            ctx.beginPath();
            ctx.moveTo(p.x - layerWidth/2, layerYmax);
            ctx.lineTo(p.x, layerYmin);
            ctx.lineTo(p.x + layerWidth/2, layerYmax);
            ctx.closePath();
            ctx.fill();

            // Snow dusting layer highlights
            ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
            ctx.beginPath();
            ctx.moveTo(p.x - layerWidth/4, layerYmax - (layerYmax - layerYmin)*0.5);
            ctx.lineTo(p.x, layerYmin);
            ctx.lineTo(p.x + layerWidth/4, layerYmax - (layerYmax - layerYmin)*0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(15, 118, 110, 0.32)";
          }
        });
      } else if (activeLevel.theme === 'mushroom') {
        // Magical bright fuchsia mushrooms with glowing neon caps
        const shrooms = [
          { x: 180, h: 110, color: "rgba(217, 70, 239, 0.35)", glow: "rgba(240, 153, 244, 0.35)", radius: 34 },
          { x: 440, h: 140, color: "rgba(14, 165, 233, 0.35)", glow: "rgba(186, 230, 253, 0.35)", radius: 42 },
          { x: 740, h: 120, color: "rgba(244, 63, 94, 0.35)", glow: "rgba(254, 205, 211, 0.35)", radius: 36 }
        ];
        const pulse = Math.sin(Date.now() / 400) * 3;
        shrooms.forEach(s => {
          ctx.fillStyle = "rgba(245, 245, 244, 0.32)";
          ctx.fillRect(s.x - 7, 450 - s.h, 14, s.h);

          ctx.fillStyle = s.color;
          ctx.shadowBlur = 10 + pulse;
          ctx.shadowColor = s.glow;
          ctx.beginPath();
          const cy = 450 - s.h;
          ctx.arc(s.x, cy + 4, s.radius + pulse/2, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Cute glow spores
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(s.x, cy - s.radius * 0.4, 4, 0, Math.PI * 2);
          ctx.arc(s.x - s.radius * 0.4, cy - s.radius * 0.1, 3, 0, Math.PI * 2);
          ctx.arc(s.x + s.radius * 0.4, cy - s.radius * 0.1, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'lab') {
        // High-tech laboratory panels, cyber tubes, and glowing laser nodes
        const cells = [
          { x: 150, h: 180, color: "rgba(14, 165, 233, 0.15)", fill: "rgba(14, 165, 233, 0.25)" },
          { x: 500, h: 220, color: "rgba(34, 197, 94, 0.15)", fill: "rgba(34, 197, 94, 0.25)" },
          { x: 800, h: 160, color: "rgba(239, 68, 68, 0.15)", fill: "rgba(239, 68, 68, 0.25)" }
        ];
        cells.forEach(c => {
          // Draw beaker/glass tube
          const grad = ctx.createLinearGradient(c.x - 20, 450 - c.h, c.x + 20, 450);
          grad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
          grad.addColorStop(1, "rgba(255, 255, 255, 0.03)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(c.x - 20, 450 - c.h, 40, c.h, [8, 8, 0, 0]);
          ctx.fill();
          
          // Draw chemistry fluid level inside
          ctx.fillStyle = c.fill;
          const fillHeight = c.h * 0.45 + Math.sin(Date.now() / 400 + c.x) * 10;
          ctx.fillRect(c.x - 17, 450 - fillHeight, 34, fillHeight);
          
          // Bubbles
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          for (let i = 0; i < 4; i++) {
            const bx = c.x + Math.sin(Date.now() / 500 + i * 153) * 12;
            const bAge = (Date.now() / 1200 + i * 0.25) % 1;
            const by = 450 - fillHeight + 15 + bAge * (fillHeight - 20);
            if (by < 450) {
              ctx.beginPath();
              ctx.arc(bx, by, Math.max(0.7, (1 - bAge) * 3), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
        
        // Server racks detailing
        ctx.fillStyle = "rgba(47, 55, 73, 0.4)";
        ctx.fillRect(320, 250, 60, 200);
        
        // blinking LED grids
        ctx.fillStyle = "#22c55e"; // green blinker
        if (Math.floor(Date.now() / 350) % 2 === 0) {
          ctx.fillRect(330, 270, 4, 4);
          ctx.fillRect(350, 290, 4, 4);
        }
        ctx.fillStyle = "#ef4444"; // red blinker
        if (Math.floor(Date.now() / 420) % 2 === 0) {
          ctx.fillRect(340, 270, 4, 4);
          ctx.fillRect(330, 290, 4, 4);
        }
      } else if (activeLevel.theme === 'zoo') {
        // Nature reserve animal cage frames, tall bamboo stalks, and enclosure signs
        ctx.fillStyle = "rgba(101, 163, 13, 0.4)"; // Mossy bamboo stalks
        const stalks = [90, 260, 410, 640, 810, 930];
        stalks.forEach((sx) => {
          ctx.fillRect(sx, 120, 8, 330);
          // Bamboo rings
          ctx.fillStyle = "rgba(190, 242, 100, 0.5)";
          for (let y = 140; y < 450; y += 40) {
            ctx.fillRect(sx - 1, y, 10, 3);
          }
          ctx.fillStyle = "rgba(101, 163, 13, 0.4)";
        });
        
        // Enclosure fences in the background
        ctx.strokeStyle = "rgba(120, 113, 108, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 120; x < GAME_WIDTH - 120; x += 140) {
          // Draw fence poles
          ctx.moveTo(x, 320); ctx.lineTo(x, 450);
          ctx.moveTo(x + 40, 320); ctx.lineTo(x + 40, 450);
          // linking bars
          ctx.moveTo(x, 340); ctx.lineTo(x + 40, 340);
          ctx.moveTo(x, 400); ctx.lineTo(x + 40, 400);
          
          // Draw "ZOO" sign
          if (x === 400) {
            ctx.save();
            ctx.fillStyle = "rgba(124, 45, 18, 0.6)"; // wooden sign
            ctx.fillRect(x - 10, 260, 60, 25);
            ctx.fillStyle = "#fef3c7";
            ctx.font = "bold 8px 'Space Grotesk', system-ui, sans-serif";
            ctx.fillText("🦁 SAFARI", x + 20, 276);
            ctx.restore();
          }
        }
        ctx.stroke();
      } else if (activeLevel.theme === 'prison') {
        // Security cell iron bars, escape hatches, and heavy lock doors in background
        ctx.strokeStyle = "rgba(148, 163, 184, 0.22)"; // heavy iron bars
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 60; x < GAME_WIDTH; x += 80) {
          ctx.moveTo(x, 30);
          ctx.lineTo(x, 450);
        }
        ctx.stroke();
        
        // Solid cell blocks doors
        ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
        ctx.fillRect(180, 150, 70, 300);
        ctx.fillRect(680, 150, 70, 300);
        
        // Little barred peepholes on cell doors
        ctx.fillStyle = "rgba(100, 116, 139, 0.5)";
        ctx.fillRect(200, 180, 30, 20);
        ctx.fillRect(700, 180, 30, 20);
      } else if (activeLevel.theme === 'spooky') {
        // Haunted mansion gothic windows and flying bat animations
        ctx.save();
        
        // Gothic window silhouettes
        const windows = [300, 700];
        windows.forEach(wx => {
          ctx.fillStyle = "rgba(139, 92, 246, 0.08)"; // dim purple glass
          ctx.beginPath();
          ctx.arc(wx, 160, 30, Math.PI, 0); // arched window top
          ctx.lineTo(wx + 30, 320);
          ctx.lineTo(wx - 30, 320);
          ctx.closePath();
          ctx.fill();
          
          ctx.strokeStyle = "rgba(59, 7, 100, 0.35)"; // dark leading bars
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(wx, 160, 30, Math.PI, 0);
          ctx.lineTo(wx + 30, 320);
          ctx.lineTo(wx - 30, 320);
          ctx.closePath();
          ctx.moveTo(wx, 130); ctx.lineTo(wx, 320); // vertical split
          ctx.moveTo(wx - 30, 220); ctx.lineTo(wx + 30, 220); // horizontal split
          ctx.stroke();
        });
        
        // Drifting bat silhouettes
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        const phase = Date.now() / 400;
        for (let i = 0; i < 3; i++) {
          const bx = 100 + i * 280 + Math.sin(phase + i) * 35;
          const by = 80 + i * 25 + Math.cos(phase * 1.5) * 15;
          // draw simple bat shape
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - 12, by - 6);
          ctx.lineTo(bx - 6, by);
          ctx.lineTo(bx, by + 4);
          ctx.lineTo(bx + 6, by);
          ctx.lineTo(bx + 12, by - 6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (activeLevel.theme === 'pirate') {
        // Pirate Ship Deck sails, masts, rigging, and ocean waves
        ctx.save();
        
        // Bobbing ship motion offset
        const shipBob = Math.sin(Date.now() / 650) * 8;
        
        // Let's draw 3 huge wooden masts
        ctx.fillStyle = "#5c3a21"; // rich wooden mast brown
        const mastXPositions = [200, 500, 800];
        const timePhase = Date.now() / 400;
        
        mastXPositions.forEach((mx, index) => {
          // Main mast vertical log
          ctx.fillRect(mx - 15, 20 + shipBob, 30, 430);
          
          // Horizontal yardarm spars holding sails
          ctx.fillRect(mx - 90, 80 + shipBob, 180, 14);
          ctx.fillRect(mx - 70, 240 + shipBob, 140, 10);
          
          // Large billowing pirate sails (white/beige cloth)
          const sailWaviness = Math.sin(timePhase + index * 2) * 6;
          ctx.fillStyle = "#fafaf9"; // sail canvas color
          
          // Top Sail
          ctx.beginPath();
          ctx.moveTo(mx - 80, 94 + shipBob);
          ctx.quadraticCurveTo(mx + sailWaviness, 120 + shipBob, mx + 80, 94 + shipBob);
          ctx.lineTo(mx + 60, 210 + shipBob);
          ctx.quadraticCurveTo(mx + sailWaviness, 225 + shipBob, mx - 60, 210 + shipBob);
          ctx.closePath();
          ctx.fill();
          
          // Draw a big black skull-and-crossbones emblem (Jolly Roger) on the center mast sail!
          if (index === 1) {
            ctx.fillStyle = "#1e293b"; // dark slate for emblem
            ctx.beginPath();
            // skull head
            ctx.arc(mx + sailWaviness / 2, 145 + shipBob, 10, 0, Math.PI * 2);
            ctx.fill();
            // skull jaw
            ctx.fillRect(mx + sailWaviness / 2 - 5, 155 + shipBob, 10, 6);
            
            // tiny red glowing pirate eyes!
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(mx + sailWaviness / 2 - 4, 144 + shipBob, 2, 0, Math.PI * 2);
            ctx.arc(mx + sailWaviness / 2 + 4, 144 + shipBob, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // white crossbones silhouette
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(mx - 18, 145 + shipBob); ctx.lineTo(mx + 18, 165 + shipBob);
            ctx.moveTo(mx - 18, 165 + shipBob); ctx.lineTo(mx + 18, 145 + shipBob);
            ctx.stroke();
          }
          
          // Mast Crow's Nest
          ctx.fillStyle = "#3d2314";
          ctx.fillRect(mx - 25, 40 + shipBob, 50, 16);
          
          // Crow's Nest borders
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(mx - 25, 40 + shipBob, 50, 16);
        });
        
        // Ship deck railing along the back of the deck
        ctx.fillStyle = "#4a2c0f"; // railing chocolate brown
        // Horizontal rails
        ctx.fillRect(0, 360 + shipBob, GAME_WIDTH, 12);
        ctx.fillRect(0, 410 + shipBob, GAME_WIDTH, 8);
        // Vertical rail balusters
        ctx.fillStyle = "#5c3a21";
        for (let rx = 20; rx < GAME_WIDTH; rx += 50) {
          ctx.fillRect(rx, 360 + shipBob, 10, 50);
        }
        
        // Distant rolling ocean waves in the immediate background layers
        ctx.fillStyle = "rgba(2, 132, 199, 0.28)"; // sea surge blue
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT);
        for (let wx = 0; wx <= GAME_WIDTH; wx += 40) {
          const waveY = 410 + Math.sin(wx * 0.02 + Date.now() / 350) * 10;
          ctx.lineTo(wx, waveY);
        }
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      } else if (activeLevel.theme === 'magma') {
        // Magma background: Glowing lava rivers, distant active volcano silhouettes shooting lava arcs, volcanic clouds.
        ctx.save();
        
        // Dark crimson volcanic smoke clouds drifting
        ctx.fillStyle = "rgba(127, 29, 29, 0.15)";
        const smokePhase = Date.now() / 800;
        for (let i = 0; i < 4; i++) {
          const cx = (i * 250 + smokePhase * 25) % GAME_WIDTH;
          const cy = 60 + Math.sin(smokePhase + i) * 15;
          ctx.beginPath();
          ctx.arc(cx, cy, 55, 0, Math.PI * 2);
          ctx.arc(cx - 30, cy + 10, 40, 0, Math.PI * 2);
          ctx.arc(cx + 30, cy + 10, 40, 0, Math.PI * 2);
          ctx.fill();
        }

        // Two massive brooding volcanic dark peak mountains in the background
        ctx.fillStyle = "rgba(40, 5, 5, 0.75)"; // very dark obsidian ash mountains
        const volcanoes = [
          { x: 280, w: 260, h: 280, craterW: 30 },
          { x: 680, w: 320, h: 320, craterW: 40 }
        ];
        volcanoes.forEach(v => {
          ctx.beginPath();
          ctx.moveTo(v.x - v.w/2, 450);
          ctx.lineTo(v.x - v.craterW/2, 450 - v.h);
          ctx.lineTo(v.x + v.craterW/2, 450 - v.h);
          ctx.lineTo(v.x + v.w/2, 450);
          ctx.closePath();
          ctx.fill();

          // Magma glow seeping out of the crater!
          const craterGlow = ctx.createRadialGradient(v.x, 454 - v.h, 2, v.x, 454 - v.h, v.craterW);
          craterGlow.addColorStop(0, "rgba(239, 68, 68, 0.95)"); // vibrant warning red
          craterGlow.addColorStop(0.5, "rgba(249, 115, 22, 0.6)"); // hot orange
          craterGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = craterGlow;
          ctx.beginPath();
          ctx.ellipse(v.x, 450 - v.h, v.craterW, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Liquid fire lava stream spilling down the slope of the volcano
          ctx.strokeStyle = "rgba(249, 115, 22, 0.8)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(v.x, 450 - v.h);
          ctx.quadraticCurveTo(v.x - v.craterW/3 + Math.sin(Date.now() / 400) * 4, 450 - v.h * 0.5, v.x - v.w * 0.15, 450);
          ctx.stroke();
        });

        // Lava river pools at the very bottom
        const lavaPulse = Math.abs(Math.sin(Date.now() / 600));
        ctx.fillStyle = `rgba(239, 68, 68, ${0.12 + lavaPulse * 0.08})`; // pulsing warm ambient floor glow
        ctx.fillRect(0, 360, GAME_WIDTH, 90);

        // Splashing magma bubbles in the background pool
        ctx.fillStyle = "rgba(249, 115, 22, 0.65)";
        for (let i = 0; i < 5; i++) {
          const bx = 150 + i * 185;
          const by = 410 + (i * 7) % 25 + Math.cos(Date.now() / 200 + i) * 6;
          ctx.beginPath();
          ctx.arc(bx, by, 3 + (Date.now() % (10 + i * 2)) / 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (activeLevel.theme === 'candy') {
        // Candy theme background: Sweet lollipop candy trees, sugar mountains, frosting rivers, jelly bean hills.
        ctx.save();

        // 1. Pastel pink and lilac giant marshmallow soft clouds
        ctx.fillStyle = "rgba(251, 207, 232, 0.3)"; // baby pink
        const candyPhase = Date.now() / 900;
        for (let i = 0; i < 3; i++) {
          const cx = (120 + i * 320 + candyPhase * 18) % GAME_WIDTH;
          const cy = 80 + Math.sin(candyPhase + i) * 12;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.arc(cx - 24, cy + 5, 30, 0, Math.PI * 2);
          ctx.arc(cx + 24, cy + 5, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        // 2. Rolling hills resembling giant pastel yellow, blue and lavender jelly beans
        const hills = [
          { x: 200, r: 180, color: "rgba(199, 210, 254, 0.38)" }, // lavender indigo hill
          { x: 550, r: 240, color: "rgba(254, 243, 199, 0.42)" }, // cream lemon hill
          { x: 850, r: 160, color: "rgba(167, 139, 250, 0.35)" }  // purple grape hill
        ];
        hills.forEach(h => {
          ctx.fillStyle = h.color;
          ctx.beginPath();
          ctx.arc(h.x, 450, h.r, Math.PI, 0);
          ctx.fill();
        });

        // 3. Whimsical candy cane pillars and giant swirling gourmet lollipops
        const lollipops = [
          { x: 140, r: 35, colors: ["#ef4444", "#ffffff"], height: 160 },
          { x: 420, r: 28, colors: ["#ec4899", "#ffffff"], height: 120 },
          { x: 740, r: 40, colors: ["#3b82f6", "#ffffff"], height: 190 }
        ];

        lollipops.forEach(l => {
          // Candy Cane striped sticks
          ctx.lineWidth = 10;
          ctx.strokeStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(l.x, 450);
          ctx.lineTo(l.x, 450 - l.height);
          ctx.stroke();

          // Red/pink spiral stripes on sticks
          ctx.strokeStyle = l.colors[0];
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 12]);
          ctx.beginPath();
          ctx.moveTo(l.x, 450);
          ctx.lineTo(l.x, 450 - l.height);
          ctx.stroke();
          ctx.setLineDash([]); // clear

          // Giant swirling Lollipop disc
          ctx.shadowBlur = 8;
          ctx.shadowColor = l.colors[0];
          
          ctx.fillStyle = l.colors[0];
          ctx.beginPath();
          ctx.arc(l.x, 450 - l.height, l.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Continuous swirl inside the disc
          ctx.strokeStyle = l.colors[1];
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          const swirlTicks = Date.now() / 250;
          for (let theta = 0; theta < Math.PI * 6; theta += 0.25) {
            const rad = (theta / (Math.PI * 6)) * (l.r - 4);
            const sx = l.x + Math.cos(theta + swirlTicks) * rad;
            const sy = 450 - l.height + Math.sin(theta + swirlTicks) * rad;
            if (theta === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        });

        // Whimsical white frosting drifts running along the ground
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)"; // frosting layer
        ctx.beginPath();
        ctx.moveTo(0, 440);
        for (let x = 0; x <= GAME_WIDTH; x += 50) {
          const fx = x;
          const fy = 432 + Math.sin(x * 0.03 + Date.now() / 400) * 6;
          ctx.lineTo(fx, fy);
        }
        ctx.lineTo(GAME_WIDTH, 450);
        ctx.lineTo(0, 450);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else if (activeLevel.theme === 'factory') {
        // Factory theme background: Steel trusses, spinning yellow hazard gears, copper steam pipes, ventilation fans.
        ctx.save();

        // 1. Dark looming background steel structural frameworks
        ctx.strokeStyle = "rgba(71, 85, 105, 0.22)"; // industrial steel frame grid
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Diagonal girders and support frames
        for (let gx = 0; gx < GAME_WIDTH + 100; gx += 160) {
          ctx.moveTo(gx - 40, -50); ctx.lineTo(gx + 120, 450);
          ctx.moveTo(gx + 120, -50); ctx.lineTo(gx - 40, 450);
          ctx.stroke();
        }
        // Horizontal girder lines
        ctx.fillStyle = "rgba(47, 55, 75, 0.25)";
        ctx.fillRect(0, 80, GAME_WIDTH, 20);
        ctx.fillRect(0, 260, GAME_WIDTH, 15);

        // 2. Copper Steam Pipes twisting in the background
        ctx.fillStyle = "rgba(180, 83, 9, 0.28)"; // copper bronze piping
        ctx.strokeStyle = "rgba(146, 64, 14, 0.35)";
        ctx.lineWidth = 1.8;
        
        const pipesY = [120, 310];
        pipesY.forEach(py => {
          // Draw long horizontal main pipeline
          ctx.fillRect(0, py, GAME_WIDTH, 14);
          ctx.strokeRect(0, py, GAME_WIDTH, 14);

          // Draw round copper joints / ring pipe flanges
          ctx.fillStyle = "rgba(154, 52, 18, 0.45)";
          for (let px = 180; px < GAME_WIDTH; px += 280) {
            ctx.fillRect(px, py - 3, 15, 20);
            ctx.strokeRect(px, py - 3, 15, 20);
          }
          ctx.fillStyle = "rgba(180, 83, 9, 0.28)"; // restore
        });

        // 3. Huge spinning hazard gears in background
        const gearTicks = Date.now() / 600;
        const gears = [
          { x: 340, y: 150, r: 50, speed: 1 },
          { x: 420, y: 190, r: 35, speed: -1.3 },
          { x: 800, y: 100, r: 60, speed: 0.7 }
        ];

        gears.forEach(g => {
          ctx.save();
          ctx.translate(g.x, g.y);
          ctx.rotate(gearTicks * g.speed);

          ctx.fillStyle = "rgba(100, 116, 139, 0.25)"; // iron gear silhouette
          ctx.strokeStyle = "rgba(71, 85, 105, 0.35)";
          ctx.lineWidth = 1.5;

          // Gear core circular disk
          ctx.beginPath();
          ctx.arc(0, 0, g.r * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Gear cog teeth sticking out
          const toothCount = 12;
          for (let t = 0; t < toothCount; t++) {
            const angle = (t * Math.PI * 2) / toothCount;
            ctx.save();
            ctx.rotate(angle);
            ctx.fillRect(-6, -g.r, 12, g.r * 0.4);
            ctx.strokeRect(-6, -g.r, 12, g.r * 0.4);
            ctx.restore();
          }

          // Gear central hollow axle
          ctx.fillStyle = "rgba(15, 23, 42, 0.5)"; // black metal center hole
          ctx.beginPath();
          ctx.arc(0, 0, g.r * 0.22, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // 4. Steaming hot exhaust vents puffing yellow smoke periodically
        const ventX = 640, ventY = 310;
        ctx.fillStyle = "rgba(51, 65, 85, 0.5)";
        ctx.fillRect(ventX - 18, ventY, 36, 110); // brick vent duct
        
        ctx.save();
        ctx.translate(ventX, ventY);
        const puffSize = 8 + Math.abs(Math.sin(Date.now() / 250) * 16);
        const puffColor = "rgba(234, 179, 8, 0.08)"; // tiny industrial fumes yellow
        ctx.fillStyle = puffColor;
        ctx.beginPath();
        ctx.arc(0, -puffSize/2, puffSize, 0, Math.PI * 2);
        ctx.arc(-puffSize*0.6, -puffSize-2, puffSize*0.7, 0, Math.PI * 2);
        ctx.arc(puffSize*0.6, -puffSize-2, puffSize*0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
      } else if (activeLevel.theme === 'castle') {
        // Castle theme background: Deep obsidian brick walls, royal crimson wall banners, fiery iron torches.
        ctx.save();

        // 1. Dark Fortress brick wall lines
        ctx.strokeStyle = "rgba(9, 9, 11, 0.6)"; // dark grout seam lines
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const blockW = 80, blockH = 40;
        for (let y = 0; y < 450; y += blockH) {
          ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); // horizontal masonry seam
          const offsetShift = (y / blockH) % 2 === 0 ? 0 : blockW / 2;
          for (let x = offsetShift; x < GAME_WIDTH + 50; x += blockW) {
            ctx.moveTo(x, y); ctx.lineTo(x, y + blockH); // vertical brick division
          }
        }
        ctx.stroke();

        // 2. Majestic Royal Crimson Tapestries Hanging from vault hooks
        const banners = [180, 520, 820];
        banners.forEach(bx => {
          // Golden Banner Hook rod
          ctx.fillStyle = "#eab308"; // solid elegant gold
          ctx.fillRect(bx - 32, 45, 64, 4);
          ctx.beginPath();
          ctx.arc(bx - 32, 47, 4, 0, Math.PI*2);
          ctx.arc(bx + 32, 47, 4, 0, Math.PI*2);
          ctx.fill();

          // Crimson banner cloth gracefully hanging down
          ctx.fillStyle = "#b91c1c"; // rich gothic blood red
          ctx.beginPath();
          ctx.moveTo(bx - 25, 49);
          ctx.lineTo(bx + 25, 49);
          ctx.lineTo(bx + 25, 190);
          ctx.lineTo(bx, 215); // swallowtail split banner cut
          ctx.lineTo(bx - 25, 190);
          ctx.closePath();
          ctx.fill();

          // Rich Gold embroidery trimming borders and central Royal insignia
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Shield star emblem on active banner center
          ctx.fillStyle = "#eac315";
          ctx.beginPath();
          ctx.moveTo(bx, 100);
          ctx.lineTo(bx - 8, 115);
          ctx.lineTo(bx - 8, 130);
          ctx.quadraticCurveTo(bx, 142, bx, 145);
          ctx.quadraticCurveTo(bx, 142, bx + 8, 130);
          ctx.lineTo(bx + 8, 115);
          ctx.closePath();
          ctx.fill();

          // Dark grey fringe bottom shadows
          ctx.fillStyle = "#7f1d1d";
          ctx.fillRect(bx - 25, 190, 50, 4);
        });

        // 3. Flame Torches with animated dynamic spark glows
        const torches = [80, 360, 680, 920];
        const torchTime = Date.now() / 120;
        
        torches.forEach((tx, index) => {
          // Iron torch holding bracket
          ctx.fillStyle = "#3f3f46";
          ctx.fillRect(tx - 3, 160, 6, 45); // angled stick
          ctx.fillRect(tx - 10, 150, 20, 10); // cup holder

          // Warm ambient circular background flame glow
          const radialPlsh = 1 + Math.abs(Math.sin(torchTime + index) * 0.15);
          const glowGrad = ctx.createRadialGradient(tx, 140, 2, tx, 140, 26 * radialPlsh);
          glowGrad.addColorStop(0, "rgba(249, 115, 22, 0.7)");  // vivid orange
          glowGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.4)"); // warm crimson red shadow
          glowGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(tx, 140, 26 * radialPlsh, 0, Math.PI*2);
          ctx.fill();

          // Inner white-hot yellow fire flame core
          const flameH = 22 + Math.sin(torchTime + index * 4) * 5;
          ctx.fillStyle = "#facc15"; // happy gold flame
          ctx.beginPath();
          ctx.moveTo(tx - 6, 148);
          ctx.quadraticCurveTo(tx - 8, 135, tx, 148 - flameH); // flame point
          ctx.quadraticCurveTo(tx + 8, 135, tx + 6, 148);
          ctx.closePath();
          ctx.fill();
        });

        ctx.restore();
      } else if (activeLevel.theme === 'egypt') {
        // Blazing ancient desert sun
        ctx.fillStyle = "rgba(251, 146, 60, 0.2)"; // Soft glowing golden sun
        ctx.beginPath();
        ctx.arc(820, 100, 60, 0, Math.PI * 2);
        ctx.fill();

        // Warm majestic pyramids with shadow sides
        ctx.fillStyle = "rgba(217, 119, 6, 0.15)"; // Soft sandstone shadow
        const pyramids = [
          { x: 220, w: 280, h: 170 },
          { x: 580, w: 340, h: 210 },
          { x: 860, w: 220, h: 130 }
        ];
        pyramids.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x - p.w/2, 450);
          ctx.lineTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w/2, 450);
          ctx.closePath();
          ctx.fill();
          
          // Pyramid dark shadow side for 3D depth
          ctx.fillStyle = "rgba(146, 64, 14, 0.12)";
          ctx.beginPath();
          ctx.moveTo(p.x, 450 - p.h);
          ctx.lineTo(p.x + p.w/2, 450);
          ctx.lineTo(p.x, 450);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(217, 119, 6, 0.15)"; // restore
        });

        // Elegant Egyptian Obelisk Pillars
        const obelisks = [100, 420, 720];
        obelisks.forEach(ox => {
          ctx.fillStyle = "rgba(180, 83, 9, 0.22)"; // Rich sandstone obelisk
          // Main column tapering upwards
          ctx.beginPath();
          ctx.moveTo(ox - 10, 450);
          ctx.lineTo(ox - 6, 320);
          ctx.lineTo(ox + 6, 320);
          ctx.lineTo(ox + 10, 450);
          ctx.closePath();
          ctx.fill();

          // Pyramidion point top
          ctx.fillStyle = "rgba(146, 64, 14, 0.26)";
          ctx.beginPath();
          ctx.moveTo(ox - 6, 320);
          ctx.lineTo(ox, 305);
          ctx.lineTo(ox + 6, 320);
          ctx.closePath();
          ctx.fill();
        });

        // Ancient ground dunes
        ctx.fillStyle = "rgba(245, 158, 11, 0.1)";
        ctx.beginPath();
        ctx.ellipse(300, 450, 400, 40, 0, Math.PI, 0);
        ctx.ellipse(750, 450, 350, 30, 0, Math.PI, 0);
        ctx.fill();
      } else if (activeLevel.theme === 'park') {
        // Graceful green rolling hills
        ctx.fillStyle = "rgba(34, 197, 94, 0.12)";
        ctx.beginPath();
        ctx.ellipse(250, 450, 350, 80, 0, Math.PI, 0);
        ctx.ellipse(750, 450, 450, 110, 0, Math.PI, 0);
        ctx.fill();

        // Park trees
        const trees = [120, 340, 850];
        trees.forEach(tx => {
          // trunk
          ctx.fillStyle = "rgba(120, 53, 4, 0.35)";
          ctx.fillRect(tx - 6, 330, 12, 120);
          // leafy canopy
          ctx.fillStyle = "rgba(22, 163, 74, 0.38)";
          ctx.beginPath();
          ctx.arc(tx, 320, 35, 0, Math.PI * 2);
          ctx.arc(tx - 20, 300, 25, 0, Math.PI * 2);
          ctx.arc(tx + 20, 300, 25, 0, Math.PI * 2);
          ctx.fill();
        });

        // Playground Fence
        ctx.strokeStyle = "rgba(202, 138, 4, 0.28)"; // Friendly golden fencing
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let fx = 10; fx < GAME_WIDTH; fx += 40) {
          ctx.moveTo(fx, 400); ctx.lineTo(fx, 450);
          ctx.moveTo(fx - 10, 415); ctx.lineTo(fx + 30, 415);
        }
        ctx.stroke();

        // A beautiful children's double swing set!
        ctx.strokeStyle = "rgba(71, 85, 105, 0.4)"; // Metal frames
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Left frame A-support
        ctx.moveTo(560, 450); ctx.lineTo(590, 320); ctx.lineTo(620, 450);
        // Right frame A-support
        ctx.moveTo(680, 450); ctx.lineTo(710, 320); ctx.lineTo(740, 450);
        // Top bar
        ctx.moveTo(590, 320); ctx.lineTo(710, 320);
        ctx.stroke();

        // Draw little swing ropes & seats
        ctx.strokeStyle = "rgba(30, 41, 59, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Swing 1 ropes
        const s1Offset = Math.sin(Date.now() / 320) * 8;
        ctx.moveTo(615, 320); ctx.lineTo(615 + s1Offset, 410);
        ctx.moveTo(635, 320); ctx.lineTo(635 + s1Offset, 410);
        ctx.stroke();
        // Swing 1 seat
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)"; // Red seat
        ctx.fillRect(610 + s1Offset, 410, 30, 6);

        // Kids playing/waving in the background!
        // Kid 1 playing with a blue balloon
        ctx.save();
        ctx.translate(220, 410);
        // Head
        ctx.fillStyle = "rgba(244, 219, 186, 0.85)"; // skin tint
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        // Hair (cute cap)
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath(); ctx.arc(0, -2, 7, Math.PI, 0); ctx.fill();
        // Body (t-shirt)
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-6, 7, 12, 18);
        // Legs
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-5, 25, 4, 15);
        ctx.fillRect(1, 25, 4, 15);
        // Arm waving at screen!
        ctx.strokeStyle = "rgba(244, 219, 186, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, 9); ctx.lineTo(-12, 12); // left hand
        const rawArmY = -2 + Math.sin(Date.now() / 150) * 5;
        ctx.moveTo(5, 9); ctx.lineTo(14, rawArmY); // right waving hand
        ctx.stroke();
        // Balloon rope & balloon
        ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
        ctx.beginPath(); ctx.moveTo(14, rawArmY); ctx.quadraticCurveTo(24, rawArmY - 20, 20, rawArmY - 45); ctx.stroke();
        ctx.fillStyle = "rgba(59, 130, 246, 0.75)"; // glossy blue balloon
        ctx.beginPath(); ctx.ellipse(20, rawArmY - 55, 9, 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Kid 2 (girl with a ribbon jumping)
        ctx.save();
        ctx.translate(450, 415);
        ctx.fillStyle = "rgba(244, 219, 186, 0.85)";
        ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill();
        // dress
        ctx.fillStyle = "#ec4899"; // pink dress
        ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-9, 25); ctx.lineTo(9, 25); ctx.closePath(); ctx.fill();
        // legs
        ctx.fillStyle = "rgba(244, 219, 186, 0.85)";
        ctx.fillRect(-4, 25, 3, 10); ctx.fillRect(1, 25, 3, 10);
        // pony tails
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath(); ctx.arc(-7, -2, 3, 0, Math.PI * 2); ctx.arc(7, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Toy Blocks in the corner (Red, Blue, Yellow building cubes)
        ctx.save();
        ctx.translate(480, 430);
        ctx.fillStyle = "rgba(239, 68, 68, 0.75)"; ctx.fillRect(0, 5, 14, 15);
        ctx.fillStyle = "rgba(59, 130, 246, 0.75)"; ctx.fillRect(16, 5, 14, 15);
        ctx.fillStyle = "rgba(234, 179, 8, 0.75)"; ctx.fillRect(8, -10, 14, 15);
        ctx.restore();
      } else if (activeLevel.theme === 'stadium') {
        // Stadium Grandstands Seating outlines 
        ctx.fillStyle = "rgba(30, 41, 59, 0.6)"; // Dark metal seats
        ctx.beginPath();
        ctx.moveTo(0, 450);
        ctx.lineTo(250, 180);
        ctx.lineTo(750, 180);
        ctx.lineTo(1000, 450);
        ctx.closePath();
        ctx.fill();

        // Blinking celebration spectator flashlights (crowd simulation!)
        const cycle = Math.floor(Date.now() / 150);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        for (let i = 0; i < 24; i++) {
          const sx = 100 + (i * 37) % 800;
          const sy = 200 + (i * 13) % 200;
          if ((cycle + i) % 5 === 0) {
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + (Date.now() % 4) / 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Modern Glowing High-Beams Floodlights!
        const towers = [150, 850];
        towers.forEach(tx => {
          // Metal truss lattice pole
          ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx - 15, 450); ctx.lineTo(tx - 5, 120);
          ctx.moveTo(tx + 15, 450); ctx.lineTo(tx + 5, 120);
          ctx.stroke();

          // Cross trusses
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let y = 140; y < 450; y += 40) {
            ctx.moveTo(tx - 15, y); ctx.lineTo(tx + 15, y);
            ctx.moveTo(tx - 15, y); ctx.lineTo(tx + 15, y + 40);
          }
          ctx.stroke();

          // Floodlight head bracket
          ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
          ctx.fillRect(tx - 25, 100, 50, 20);

          // Glowing bulbs
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#38bdf8";
          ctx.beginPath();
          ctx.arc(tx - 15, 110, 6, 0, Math.PI * 2);
          ctx.arc(tx, 110, 6, 0, Math.PI * 2);
          ctx.arc(tx + 15, 110, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Conical light beams highlighting the stadium arena
          const beamGrad = ctx.createLinearGradient(tx, 110, tx, 420);
          beamGrad.addColorStop(0, "rgba(56, 189, 248, 0.18)");
          beamGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(tx - 20, 115);
          ctx.lineTo(tx - 180, 450);
          ctx.lineTo(tx + 180, 450);
          ctx.lineTo(tx + 20, 115);
          ctx.closePath();
          ctx.fill();
        });

        // Waving black-and-white Checkered Flag!
        ctx.save();
        ctx.translate(500, 160);
        const wave = Math.sin(Date.now() / 250);
        // Flagpole
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 120); ctx.stroke();

        // Fabric flag
        const fw = 60, fh = 36;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(fw * 0.5, 5 + wave * 6, fw, 5);
        ctx.lineTo(fw, 5 + fh);
        ctx.quadraticCurveTo(fw * 0.5, 5 + fh + wave * 6, 0, 5 + fh);
        ctx.closePath();
        ctx.fill();

        // Checkerboard boxes
        ctx.fillStyle = "#111827";
        const rows = 4;
        const cols = 6;
        const colW = fw / cols;
        const rowH = fh / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 === 1) {
              const xPos = c * colW;
              const yTopOffset = wave * 6 * Math.sin((c / cols) * Math.PI);
              ctx.fillRect(xPos, 5 + r * rowH + yTopOffset, colW + 0.5, rowH + 0.5);
            }
          }
        }
        ctx.restore();

        // F1 / Racecar styling outline parked on the asphalt!
        ctx.save();
        ctx.translate(320, 422);
        // Ground shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath(); ctx.ellipse(25, 23, 35, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Red sleek aerodynamic sport racer body
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-10, 15);
        ctx.quadraticCurveTo(5, 5, 25, 5); // top cockpit arc
        ctx.lineTo(55, 12); // nosecone slope
        ctx.lineTo(58, 20); // nose splitter
        ctx.lineTo(-12, 20); // underfloor
        ctx.closePath();
        ctx.fill();
        // Yellow stripes
        ctx.fillStyle = "#facc15";
        ctx.fillRect(10, 11, 20, 3);
        // Rear spoiler/wing
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-15, 0, 4, 15); // strut
        ctx.fillRect(-22, -2, 14, 4); // wingplane
        // Front nose spoiler helper wing
        ctx.fillRect(48, 14, 12, 4);
        // Black rubber slicks (wheels)
        ctx.fillStyle = "#111827";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        // Back wheel
        ctx.beginPath(); ctx.arc(0, 16, 9, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Front wheel
        ctx.beginPath(); ctx.arc(44, 17, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Wheels center cap
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath(); ctx.arc(0, 16, 3, 0, Math.PI*2); ctx.arc(44, 17, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // Speed lights/racing stripes on the road
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(50, 442, 80, 4);
        ctx.fillRect(280, 442, 100, 4);
        ctx.fillRect(550, 442, 120, 4);
        ctx.fillRect(820, 442, 70, 4);
      } else if (activeLevel.theme === 'space') {
        // Celestial space background: Sparkling starry field, colorful nebula dust, and orbiting planets!
        
        // 1. Draw glowing violet and magenta cosmic nebulae
        const nebulaGrad = ctx.createRadialGradient(250, 150, 20, 250, 150, 220);
        nebulaGrad.addColorStop(0, "rgba(139, 92, 246, 0.12)"); // soft violet
        nebulaGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.05)"); // translucent magenta
        nebulaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebulaGrad;
        ctx.beginPath();
        ctx.arc(250, 150, 220, 0, Math.PI * 2);
        ctx.fill();

        const nebulaGrad2 = ctx.createRadialGradient(720, 250, 10, 720, 250, 180);
        nebulaGrad2.addColorStop(0, "rgba(6, 182, 212, 0.08)"); // galactic cyan
        nebulaGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebulaGrad2;
        ctx.beginPath();
        ctx.arc(720, 250, 180, 0, Math.PI * 2);
        ctx.fill();

        // 2. Twin-colored stars (twinkling based on tick)
        const timeVal = Date.now() / 200;
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 37) % GAME_WIDTH;
          const sy = (i * 19) % 360; // keep in sky section primarily
          const blink = Math.sin(timeVal + i) * 0.4 + 0.6;
          ctx.fillStyle = `rgba(255, 255, 255, ${blink})`;
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 3 === 0) ? 1.5 : 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw slightly larger yellow/blue supergiant stars
        for (let i = 0; i < 8; i++) {
          const sx = 80 + i * 115 + Math.sin(timeVal/2 + i) * 5;
          const sy = 40 + (i * 47) % 180;
          const opacity = Math.sin(timeVal + i * 2) * 0.4 + 0.6;
          ctx.fillStyle = i % 2 === 0 ? `rgba(56, 189, 248, ${opacity})` : `rgba(253, 224, 71, ${opacity})`; // blue/yellow giants
          // Draw sparkling star flare cross
          ctx.lineWidth = 1;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath();
          ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
          ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
          ctx.stroke();
        }

        // 3. Majestic Ringed Gas Planet (Saturn-like)
        ctx.save();
        ctx.translate(140, 110);
        
        // Planet shadow side gradient
        const planetGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 24);
        planetGrad.addColorStop(0, "#fbbf24"); // yellow-orange body
        planetGrad.addColorStop(0.7, "#d97706");
        planetGrad.addColorStop(1, "#3f1b02"); // dark night zone
        
        // Tilt the whole planetary system
        ctx.rotate(-0.25);
        
        // Back rings
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 11, 0, Math.PI, Math.PI * 2); // semiellipse behind planet
        ctx.stroke();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 56, 13, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Planet spherical gas body
        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();

        // Front half of the rings overlapping planet body
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 11, 0, 0, Math.PI); // front ring
        ctx.stroke();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 56, 13, 0, 0, Math.PI);
        ctx.stroke();

        ctx.restore();

        // 4. Earth/Blue Moon in top right
        ctx.save();
        ctx.translate(840, 80);
        const bluePlanetGrad = ctx.createRadialGradient(-10, -10, 4, 0, 0, 45);
        bluePlanetGrad.addColorStop(0, "#38bdf8"); // bright azure
        bluePlanetGrad.addColorStop(0.6, "#1d4ed8"); // sapphire ocean depth
        bluePlanetGrad.addColorStop(1, "#030712"); // deep shadow
        ctx.fillStyle = bluePlanetGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.fill();

        // Green continents map illustration
        ctx.fillStyle = "rgba(34, 197, 94, 0.42)";
        ctx.beginPath();
        ctx.ellipse(-15, -5, 15, 20, 0.4, 0, Math.PI * 2);
        ctx.ellipse(15, 15, 12, 10, -0.2, 0, Math.PI * 2);
        ctx.ellipse(-5, 18, 10, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(5, -20, 14, 8, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 5. Friendly Floating Communication Satellite
        ctx.save();
        const satPhase = Date.now() / 1500;
        const satX = 500 + Math.sin(satPhase) * 60;
        const satY = 70 + Math.cos(satPhase * 1.5) * 15;
        ctx.translate(satX, satY);
        ctx.rotate(0.12 + Math.sin(satPhase / 2) * 0.1);

        // solar panels
        ctx.fillStyle = "rgba(14, 165, 233, 0.8)";
        ctx.fillRect(-35, -5, 16, 10);
        ctx.fillRect(19, -5, 16, 10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-35, -5, 16, 10);
        ctx.strokeRect(19, -5, 16, 10);

        // rods
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-35, 0); ctx.lineTo(35, 0);
        ctx.stroke();

        // center body
        const coreGrad = ctx.createLinearGradient(-5, -10, 5, 10);
        coreGrad.addColorStop(0, "#e2e8f0");
        coreGrad.addColorStop(1, "#475569");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 20, [3]);
        ctx.fill();

        // dish
        ctx.fillStyle = "#cbd5e1";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -12, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      } else if (activeLevel.theme === 'cybercity') {
        // Cyberpunk Neon City background: Holographic billboards, dark rainy streets, neon pink platforms, flying hover-buses
        ctx.save();
        
        // 1. Futuristic dark towering skylines silhouettes
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)"; // very dark blue slate skyscraper silhouettes
        const towers = [
          { x: 50, w: 90, h: 280 },
          { x: 180, w: 120, h: 320 },
          { x: 340, w: 80, h: 240 },
          { x: 460, w: 140, h: 360 },
          { x: 640, w: 110, h: 300 },
          { x: 790, w: 130, h: 340 },
          { x: 950, w: 80, h: 250 }
        ];
        towers.forEach(t => {
          ctx.fillRect(t.x - t.w/2, 450 - t.h, t.w, t.h);
          
          // Tiny glowing cyber window dots on towers (grid based)
          ctx.fillStyle = "rgba(236, 72, 153, 0.5)"; // magenta neon windows
          for (let wy = 450 - t.h + 20; wy < 440; wy += 35) {
            for (let wx = t.x - t.w/2 + 15; wx < t.x + t.w/2 - 15; wx += 25) {
              if ((Math.sin(wy * wx + Date.now()/1000) > 0.1)) {
                ctx.fillStyle = wy % 2 === 0 ? "rgba(56, 189, 248, 0.6)" : "rgba(236, 72, 153, 0.6)";
                ctx.fillRect(wx, wy, 4, 6);
              }
            }
          }
        });

        // 2. Holographic glowing billboards flashing
        const holographicGlow = Math.abs(Math.sin(Date.now() / 350));
        const billboards = [
          { x: 230, y: 160, w: 80, h: 40, text: "NEON", color: "rgba(236, 72, 153," }, // pink
          { x: 530, y: 110, w: 90, h: 45, text: "CYBER", color: "rgba(34, 211, 238," }, // cyan
          { x: 855, y: 150, w: 75, h: 35, text: "PLAY", color: "rgba(168, 85, 247," }  // purple
        ];
        billboards.forEach(b => {
          // Holographic projection beams starting from some base source
          ctx.strokeStyle = `${b.color}${0.05 + holographicGlow * 0.05})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + b.h/2);
          ctx.lineTo(b.x - 30, 450);
          ctx.lineTo(b.x + 30, 450);
          ctx.stroke();

          // Outer glowing advertisement sign borders
          ctx.strokeStyle = `${b.color}${0.5 + holographicGlow * 0.3})`;
          ctx.fillStyle = `${b.color}${0.1 + holographicGlow * 0.15})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h, [4]);
          ctx.fill();
          ctx.stroke();

          // Billboards text
          ctx.fillStyle = `${b.color}${0.9 + holographicGlow * 0.1})`;
          ctx.font = "bold 13px 'JetBrains Mono', Courier, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.text, b.x, b.y);
        });

        // 3. Gliding flying hover-buses/traffic
        const trafficSpeed = Date.now() / 150;
        const busY = [180, 260];
        busY.forEach((by, idx) => {
          const dir = idx % 2 === 0 ? 1 : -1;
          const bx = (idx * 300 + trafficSpeed * 4) % (GAME_WIDTH + 150) - 75;
          const drawX = dir === 1 ? bx : GAME_WIDTH - bx;

          ctx.fillStyle = idx % 2 === 0 ? "rgba(56, 189, 248, 0.4)" : "rgba(236, 72, 153, 0.4)";
          ctx.strokeStyle = idx % 2 === 0 ? "rgba(56, 189, 248, 0.85)" : "rgba(236, 72, 153, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(drawX - 30, by, 60, 14, [4]);
          ctx.fill();
          ctx.stroke();

          // Hover thruster backlight tail
          ctx.fillStyle = idx % 2 === 0 ? "rgba(236, 72, 153, 0.8)" : "rgba(56, 189, 248, 0.8)";
          ctx.fillRect(dir === 1 ? drawX - 35 : drawX + 31, by + 4, 4, 6);
        });

        ctx.restore();
      } else if (activeLevel.theme === 'steampunk') {
        // Steampunk Clockwork Tower background: Giant rotating gears, copper boiler pipes, vintage ticking clock hands
        ctx.save();

        // 1. Massive dark bronze skeletal clock face structure in background
        const clockTime = Date.now() / 1200;
        ctx.strokeStyle = "rgba(120, 53, 4, 0.15)"; // antique brass
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(500, 220, 160, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        // Inner clock ticking markings
        for (let m = 0; m < 12; m++) {
          const mAng = (m * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(500 + Math.cos(mAng) * 145, 220 + Math.sin(mAng) * 145);
          ctx.lineTo(500 + Math.cos(mAng) * 160, 220 + Math.sin(mAng) * 160);
          ctx.stroke();
        }
        // Clock heavy iron hands ticking!
        ctx.strokeStyle = "rgba(69, 26, 3, 0.28)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(500, 220);
        ctx.lineTo(500 + Math.cos(clockTime) * 105, 220 + Math.sin(clockTime) * 105); // minute hand
        ctx.stroke();
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(500, 220);
        ctx.lineTo(500 + Math.cos(clockTime/12) * 75, 220 + Math.sin(clockTime/12) * 75); // hour hand
        ctx.stroke();

        // 2. Interlocking antique gears spinning in various corners
        const gearTicksVal = Date.now() / 800;
        const steamGears = [
          { x: 150, y: 120, r: 65, speed: 1.2, color: "rgba(180, 83, 9, 0.22)" },
          { x: 260, y: 170, r: 45, speed: -1.2, color: "rgba(217, 119, 6, 0.18)" },
          { x: 820, y: 280, r: 85, speed: 0.6, color: "rgba(120, 53, 4, 0.25)" },
          { x: 910, y: 190, r: 50, speed: -1.0, color: "rgba(180, 83, 9, 0.25)" }
        ];

        steamGears.forEach(g => {
          ctx.save();
          ctx.translate(g.x, g.y);
          ctx.rotate(gearTicksVal * g.speed);

          ctx.fillStyle = g.color;
          ctx.strokeStyle = "rgba(69, 26, 3, 0.25)";
          ctx.lineWidth = 2.0;

          // Drawing gear body
          ctx.beginPath();
          ctx.arc(0, 0, g.r * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Drawing gear teeth
          const numT = 10;
          for (let t = 0; t < numT; t++) {
            const rotAng = (t * Math.PI * 2) / numT;
            ctx.save();
            ctx.rotate(rotAng);
            ctx.fillRect(-8, -g.r, 16, g.r * 0.35);
            ctx.strokeRect(-8, -g.r, 16, g.r * 0.35);
            ctx.restore();
          }

          // Gear center steel core hole
          ctx.fillStyle = "rgba(40, 10, 2, 0.4)";
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // 3. Copper boiler piping frames
        ctx.fillStyle = "rgba(146, 64, 14, 0.18)";
        ctx.fillRect(0, 60, GAME_WIDTH, 14);
        ctx.fillRect(0, 240, GAME_WIDTH, 14);
        ctx.fillRect(180, 0, 12, 450);

        ctx.restore();
      } else if (activeLevel.theme === 'cyber_atlantis') {
        // Sunken Cyber-Atlantis background: Floating neon jellyfish, digital sea currents, cyber ocean rays
        ctx.save();

        // 1. Digital cyan-green soft ambient sea rays seeping from ocean depths upper layers
        const atlantisRays = ctx.createLinearGradient(0, 0, 0, 450);
        atlantisRays.addColorStop(0, "rgba(6, 182, 212, 0.08)");
        atlantisRays.addColorStop(0.6, "rgba(20, 184, 166, 0.02)");
        atlantisRays.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = atlantisRays;
        ctx.fillRect(0, 0, GAME_WIDTH, 450);

        // 2. Neon digital Jellyfish swimming up/down
        const jellyTicks = Date.now() / 1100;
        const jellies = [
          { x: 220, y: 150, color: "rgba(34, 211, 238, 0.38)", speed: 1.1 },
          { x: 480, y: 250, color: "rgba(244, 63, 94, 0.32)", speed: 0.8 },
          { x: 760, y: 110, color: "rgba(168, 85, 247, 0.35)", speed: 1.3 }
        ];

        jellies.forEach((j, idx) => {
          // Hover and glide animation
          const jy = j.y + Math.sin(jellyTicks * j.speed + idx) * 35;
          const px = j.x + Math.cos(jellyTicks * 0.5 + idx) * 15;

          ctx.save();
          ctx.translate(px, jy);

          ctx.fillStyle = j.color;
          ctx.shadowColor = j.color;
          ctx.shadowBlur = 12;

          // Jelly dome cap
          ctx.beginPath();
          ctx.arc(0, 0, 18, Math.PI, 0, false);
          ctx.fill();

          // Ribbon tentacles dangling down
          ctx.strokeStyle = j.color;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let tx = -12; tx <= 12; tx += 6) {
            const wiggleOffset = Math.sin(Date.now() / 150 + tx) * 5;
            ctx.moveTo(tx, 1);
            ctx.quadraticCurveTo(tx + wiggleOffset, 15, tx + wiggleOffset/2, 32);
          }
          ctx.stroke();

          ctx.restore();
        });

        // 3. Digital coral reef silhouette at the very far back bottom
        ctx.fillStyle = "rgba(4, 47, 46, 0.65)"; // deep teal coral reef floor
        ctx.beginPath();
        ctx.moveTo(0, 450);
        ctx.lineTo(0, 410);
        ctx.quadraticCurveTo(150, 430, 280, 395);
        ctx.quadraticCurveTo(450, 430, 600, 380);
        ctx.quadraticCurveTo(780, 420, 1000, 390);
        ctx.lineTo(1000, 450);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else if (activeLevel.theme === 'void_nebula') {
        // Void Nebula background: Glowing black hole, pulsing purple accretion disk, anti-gravity space dust
        ctx.save();
        
        // Pulsing black hole at center
        const blackHolePulse = 1.0 + Math.sin(Date.now() / 250) * 0.08;
        const bhX = 500;
        const bhY = 180;
        
        // Accretion disk glow
        const spaceGlow = ctx.createRadialGradient(bhX, bhY, 5, bhX, bhY, 120);
        spaceGlow.addColorStop(0, "rgba(168, 85, 247, 0.45)"); // deep purple
        spaceGlow.addColorStop(0.5, "rgba(244, 63, 94, 0.15)"); // glowing rose pink
        spaceGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = spaceGlow;
        ctx.beginPath();
        ctx.arc(bhX, bhY, 120, 0, Math.PI * 2);
        ctx.fill();

        // Gravitational lens ring warp
        ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(bhX, bhY, 95 * blackHolePulse, 30 * blackHolePulse, Math.PI / 8, 0, Math.PI * 2);
        ctx.stroke();

        // Pitch black singularity event horizon
        ctx.fillStyle = "#020005";
        ctx.beginPath();
        ctx.arc(bhX, bhY, 32 * blackHolePulse, 0, Math.PI * 2);
        ctx.fill();

        // Distant spiral nebula vortexes
        ctx.strokeStyle = "rgba(147, 51, 234, 0.2)";
        ctx.lineWidth = 1.5;
        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.arc(150, 100, 40 + r * 15, Date.now()/1200, Date.now()/1200 + Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(880, 280, 60 + r * 20, Date.now()/1600, Date.now()/1600 + Math.PI, true);
          ctx.stroke();
        }

        ctx.restore();
      } else if (activeLevel.theme === 'sky_pagoda') {
        // Sky Pagoda background: Serene floating temple structures, clouds, red hanging lanterns
        ctx.save();

        // 1. Serene hanging red-orange paper lanterns gently swaying
        const lanternSway = Math.sin(Date.now() / 900) * 0.12;
        const lanterns = [
          { x: 140, y: 50, len: 45 },
          { x: 280, y: 30, len: 35 },
          { x: 740, y: 40, len: 55 },
          { x: 880, y: 60, len: 40 }
        ];

        lanterns.forEach(l => {
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(lanternSway);

          // Suspension cord
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, l.len);
          ctx.stroke();

          // Lantern glowing body
          const pulseGlow = Math.abs(Math.sin(Date.now() / 200 + l.x));
          ctx.fillStyle = `rgba(249, 115, 22, ${0.7 + pulseGlow * 0.25})`; // bright orange
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 10;
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-8, l.len, 16, 22, [4]);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Cute gold tassel at the bottom
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(-2, l.len + 22, 4, 10);

          ctx.restore();
        });

        // 2. Majestic floating Zen shrines in the sunset distance
        ctx.fillStyle = "rgba(30, 27, 75, 0.4)"; // deep mountain silhouette
        ctx.strokeStyle = "rgba(220, 38, 38, 0.4)"; // soft redwood borders
        ctx.lineWidth = 2.0;
        const shrines = [
          { x: 200, y: 180, w: 70, h: 40 },
          { x: 500, y: 110, w: 100, h: 55 },
          { x: 810, y: 210, w: 65, h: 35 }
        ];

        shrines.forEach(s => {
          ctx.save();
          // Floating vertical drift
          const floatOffset = Math.sin(Date.now() / 1400 + s.x) * 6;
          ctx.translate(0, floatOffset);

          // Island mass
          ctx.beginPath();
          ctx.moveTo(s.x - s.w/2, 450 - s.y);
          ctx.lineTo(s.x + s.w/2, 450 - s.y);
          ctx.lineTo(s.x + s.w/4, 450 - s.y + 25);
          ctx.lineTo(s.x - s.w/4, 450 - s.y + 25);
          ctx.closePath();
          ctx.fill();

          // Pagoda tiers / curved eaves
          ctx.fillStyle = "rgba(220, 38, 38, 0.55)";
          // tier 1
          ctx.beginPath();
          ctx.moveTo(s.x - s.w/3, 450 - s.y - 10);
          ctx.quadraticCurveTo(s.x, 450 - s.y - 25, s.x + s.w/3, 450 - s.y - 10);
          ctx.lineTo(s.x, 450 - s.y - 30);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });

        ctx.restore();
      } else if (activeLevel.theme === 'primal_jungle') {
        // Prehistoric Giant Jungle background: active volcanic soot, glowing lava veins, primeval skeleton rib silhouettes
        ctx.save();

        // Distant rumbling active volcano silhouette at center right
        ctx.fillStyle = "rgba(6, 78, 59, 0.7)"; // Primal heavy jungle forest silhouettes
        ctx.beginPath();
        ctx.moveTo(600, 450);
        ctx.lineTo(720, 180);
        ctx.lineTo(840, 450);
        ctx.closePath();
        ctx.fill();

        // Pulsing lava vent inside distant caldera
        const lavaPulse = Math.abs(Math.sin(Date.now() / 320));
        ctx.fillStyle = `rgba(239, 68, 68, ${0.45 + lavaPulse * 0.4})`;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(720, 182, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Skeleton fossilized dinosaur ribs towering in jungle
        ctx.strokeStyle = "rgba(4, 120, 87, 0.28)"; // bone forest shade
        ctx.lineWidth = 12;
        const ribs = [160, 230, 300, 770, 840, 910];
        ribs.forEach((rx, idx) => {
          const curveDir = idx < 3 ? 1 : -1;
          ctx.beginPath();
          ctx.ellipse(rx, 450, 40, 160, 0, Math.PI, Math.PI * 1.5, curveDir === -1);
          ctx.stroke();
        });

        ctx.restore();
      } else if (activeLevel.theme === 'cryo_cave') {
        // Cyber-Neon Glacial Cave background: Frozen computer server racks, matrix light streams scrolling, cool ice stalactites
        ctx.save();

        // 1. Digital cyberspace background matrix light streams
        const matrixSpeed = Date.now() / 80;
        ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
        ctx.font = "bold 11px monospace";
        for (let mx = 40; mx < GAME_WIDTH; mx += 140) {
          const myStart = (mx * 7 + matrixSpeed) % 360;
          ctx.fillText("CRYOPU", mx, myStart);
          ctx.fillText("010110", mx, myStart + 40);
          ctx.fillText("SYS_OK", mx, myStart + 80);
        }

        // 2. Towering massive server storage vaults glowing cyan
        const ServerX = [120, 450, 810];
        ServerX.forEach(sx => {
          // Dark cage vault
          ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(sx - 40, 90, 80, 280, [6]);
          ctx.fill();
          ctx.stroke();

          // Server units inside
          ctx.fillStyle = "rgba(34, 211, 238, 0.35)";
          for (let sy = 110; sy < 350; sy += 35) {
            ctx.fillRect(sx - 30, sy, 60, 16);
            // Flashing server statuses
            const microFlash = Math.sin((sy * sx) + Date.now()/400);
            ctx.fillStyle = microFlash > 0.3 ? "#22d3ee" : (microFlash < -0.3 ? "#ef4444" : "#1e293b");
            ctx.fillRect(sx - 24, sy + 5, 6, 6);
          }
        });

        // 3. Spiky ice stalactites hanging from the ceiling
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        const spikes = [50, 180, 310, 420, 560, 690, 800, 910];
        spikes.forEach(sx => {
          ctx.beginPath();
          ctx.moveTo(sx - 15, 0);
          ctx.lineTo(sx, 40 + Math.sin(Date.now() / 1200 + sx) * 10);
          ctx.lineTo(sx + 15, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        ctx.restore();
      }
      ctx.restore();

      // Particles
      if (activeLevel.theme === 'underwater') {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        particlesRef.current.forEach(p => {
          p.y -= p.speed;
          if (p.y < -10) p.y = GAME_HEIGHT + 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'snowy') {
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        particlesRef.current.forEach(p => {
          p.y += p.speed * 0.7;
          p.x += Math.sin(p.y / 25) * 0.5; // beautiful gentle drift
          if (p.y > GAME_HEIGHT + 5) {
            p.y = -5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'mushroom') {
        ctx.fillStyle = "rgba(232, 121, 249, 0.4)"; // soft pink/fuchsia glowing spores
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.35;
          p.x += Math.cos(p.y / 20) * 0.3;
          if (p.y < -5) {
            p.y = GAME_HEIGHT + 5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'desert') {
        ctx.fillStyle = "rgba(245, 158, 11, 0.18)"; // sand breeze micro grains
        particlesRef.current.forEach(p => {
          p.x += p.speed * 1.5;
          p.y += Math.sin(p.x / 40) * 0.2;
          if (p.x > GAME_WIDTH + 10) {
            p.x = -10;
            p.y = Math.random() * GAME_HEIGHT;
          }
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.4, 0.1, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'space') {
        ctx.fillStyle = "rgba(147, 51, 234, 0.35)"; // soft cosmos purple micro spores
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.25; // zero-g super slow ascent
          p.x += Math.sin(p.y / 35) * 0.15;
          if (p.y < -5) {
            p.y = GAME_HEIGHT + 5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'magma') {
        ctx.fillStyle = "rgba(249, 115, 22, 0.7)"; // fiery volcanic ash/sparks rising
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 1.2;
          p.x += Math.sin(p.y / 25) * 0.4;
          if (p.y < -5) {
            p.y = GAME_HEIGHT + 5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'candy') {
        const colors = ["#f43f5e", "#60a5fa", "#34d399", "#facc15", "#c084fc"]; // pink, blue, green, yellow, purple sprinkles
        particlesRef.current.forEach((p, idx) => {
          p.y += p.speed * 0.8;
          p.x += Math.cos(p.y / 30) * 0.2;
          if (p.y > GAME_HEIGHT + 5) {
            p.y = -5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.fillStyle = colors[idx % colors.length];
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 1.6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'factory') {
        ctx.fillStyle = "rgba(148, 163, 184, 0.3)"; // steel machinery grease grey vapor
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.5;
          p.x += p.speed * 0.2;
          if (p.y < -10) {
            p.y = GAME_HEIGHT + 10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'castle') {
        ctx.fillStyle = "rgba(251, 191, 36, 0.45)"; // ambient warm fire cinders
        particlesRef.current.forEach(p => {
          p.y += p.speed * 0.45;
          p.x += Math.sin(p.y / 15) * 0.3;
          if (p.y > GAME_HEIGHT + 5) {
            p.y = -5;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'cybercity') {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.65)"; // bright neon pink rain
        ctx.lineWidth = 1.5;
        particlesRef.current.forEach(p => {
          p.y += p.speed * 2.8; // rain falls very fast
          p.x -= p.speed * 1.1; // diagonal wind slide
          if (p.y > GAME_HEIGHT + 10) {
            p.y = -10;
            p.x = Math.random() * (GAME_WIDTH + 200);
          }
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 4, p.y + p.size * 5.0);
          ctx.stroke();
        });
      } else if (activeLevel.theme === 'steampunk') {
        ctx.fillStyle = "rgba(217, 119, 6, 0.28)"; // copper/brass clockwork vapors
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.45;
          p.x += Math.sin(p.y / 20) * 0.4;
          if (p.y < -10) {
            p.y = GAME_HEIGHT + 10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'cyber_atlantis') {
        ctx.fillStyle = "rgba(34, 211, 238, 0.4)"; // glowing cyan bubbles
        ctx.strokeStyle = "rgba(34, 211, 238, 0.7)";
        ctx.lineWidth = 1.0;
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 1.5; // bubble ascent
          p.x += Math.sin(p.y / 15) * 0.7; // aquatic sway
          if (p.y < -10) {
            p.y = GAME_HEIGHT + 10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (activeLevel.theme === 'void_nebula') {
        // Slow rising anti-gravity purple star particles
        ctx.fillStyle = "rgba(192, 132, 252, 0.55)"; 
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.35; // slow drift
          p.x += Math.sin(p.y / 40) * 0.3;
          if (p.y < -10) {
            p.y = GAME_HEIGHT + 10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.0, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'sky_pagoda') {
        // Floating peach-pink cherry blossom petals (windy sway)
        ctx.fillStyle = "rgba(251, 113, 133, 0.65)"; // soft peach pink
        particlesRef.current.forEach(p => {
          p.y += p.speed * 0.8;
          p.x += p.speed * 0.6 + Math.sin(p.y / 24) * 0.5; // wind drift
          if (p.y > GAME_HEIGHT + 10 || p.x > GAME_WIDTH + 10) {
            p.y = -10;
            p.x = Math.random() * (GAME_WIDTH - 200);
          }
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 1.2, p.size * 2.2, Math.PI / 6 + Math.sin(p.y / 15) * 0.2, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'primal_jungle') {
        // Volcanic glowing smoke embers
        ctx.fillStyle = "rgba(249, 115, 22, 0.555)"; // orange firebugs
        particlesRef.current.forEach(p => {
          p.y -= p.speed * 0.7; // embers rising
          p.x += Math.sin(p.y / 10) * 0.6;
          if (p.y < -10) {
            p.y = GAME_HEIGHT + 10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'cryo_cave') {
        // Frozen pixel sparkles drifting down
        ctx.fillStyle = "rgba(103, 232, 249, 0.6)"; // frozen neon blue-cyan ice dust
        particlesRef.current.forEach(p => {
          p.y += p.speed * 0.95;
          p.x += Math.sin(p.y / 20) * 0.45;
          if (p.y > GAME_HEIGHT + 10) {
            p.y = -10;
            p.x = Math.random() * GAME_WIDTH;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.71, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeLevel.theme === 'retrowave_highway') {
        // Hyper-speed neon cyber light-streaks speeding horizontal backward!
        particlesRef.current.forEach((p, idx) => {
          p.x -= p.speed * 2.8; // extremely fast backward driving speed
          if (p.x < -40) {
            p.x = GAME_WIDTH + 10;
            p.y = 80 + Math.random() * 160; // scattered in the sky area
          }
          ctx.fillStyle = idx % 2 === 0 ? "rgba(244, 63, 94, 0.6)" : "rgba(34, 211, 238, 0.6)";
          ctx.fillRect(p.x, p.y, p.size * 5 + 10, 1.5); // long laser tracers!
        });
      }

      // Platforms
      platforms.forEach((p) => {
        if (p.isPipe) {
          // Render highly polished Mario Warp Pipe!
          ctx.save();
          
          // Main pipe cylinder gradient (3D cylinder effect using horizontal linear gradients)
          const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
          grad.addColorStop(0, "#064e3b");    // Deep shadow emerald green
          grad.addColorStop(0.18, "#15803d"); // Forest green
          grad.addColorStop(0.42, "#4ade80"); // Bright metallic highlight line
          grad.addColorStop(0.68, "#16a34a"); // Base green
          grad.addColorStop(1, "#052e16");    // Almost black evergreen shadow

          const rimHeight = 24;
          const shaftOffset = 4;
          const shaftWidth = p.width - (shaftOffset * 2);
          const shaftX = p.x + shaftOffset;
          const shaftY = p.y + rimHeight;
          const shaftHeight = p.height - rimHeight;

          ctx.fillStyle = grad;
          ctx.strokeStyle = "#052e16";
          ctx.lineWidth = 3;
          
          ctx.beginPath();
          ctx.rect(shaftX, shaftY, shaftWidth, shaftHeight);
          ctx.fill();
          ctx.stroke();

          // Draw metallic shading lines inside the shaft to mimic real pixels
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(shaftX + shaftWidth * 0.35, shaftY + 2);
          ctx.lineTo(shaftX + shaftWidth * 0.35, shaftY + shaftHeight - 2);
          ctx.stroke();
          
          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.moveTo(shaftX + shaftWidth * 0.78, shaftY + 2);
          ctx.lineTo(shaftX + shaftWidth * 0.78, shaftY + shaftHeight - 2);
          ctx.stroke();

          // Draw rim (wider top cup section)
          const rimGrad = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
          rimGrad.addColorStop(0, "#052e16");
          rimGrad.addColorStop(0.12, "#16a34a");
          rimGrad.addColorStop(0.4, "#86efac"); // brighter flare
          rimGrad.addColorStop(0.75, "#15803d");
          rimGrad.addColorStop(1, "#022c22");

          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.rect(p.x, p.y, p.width, rimHeight);
          ctx.fill();
          ctx.stroke();

          // Highlight and shade lines for the rim
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x + p.width * 0.35, p.y + 2);
          ctx.lineTo(p.x + p.width * 0.35, p.y + rimHeight - 2);
          ctx.stroke();

          ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
          ctx.beginPath();
          ctx.moveTo(p.x + p.width * 0.8, p.y + 2);
          ctx.lineTo(p.x + p.width * 0.8, p.y + rimHeight - 2);
          ctx.stroke();

          // Inner hollow entrance shadow at the very top of pipe
          ctx.fillStyle = "#022c22";
          ctx.fillRect(p.x + 2, p.y + 1, p.width - 4, 3.5);

          ctx.restore();
          return; // skip standard platform drawing
        }

        if (isSequelMode && p.isSpring) {
          // Visual Springer board drawing!
          const activeSqz = (p.springCooldown && p.springCooldown > 0) ? p.springCooldown : 0;
          const squeezeFactor = activeSqz * 0.6; // squeeze offset
          
          ctx.save();
          ctx.translate(p.x + p.width/2, p.y + p.height);
          
          // Draw metallic zig zag support base
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(8, -3 + squeezeFactor);
          ctx.lineTo(-8, -6 + squeezeFactor * 1.5);
          ctx.lineTo(6, -9 + squeezeFactor * 2.0);
          ctx.lineTo(-4, -p.height);
          ctx.stroke();
          
          // Draw bright spring raspberry launchboard plate
          ctx.fillStyle = p.color || "#f43f5e";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-p.width/2, -p.height - 2 + squeezeFactor, p.width, 7, [3]);
          ctx.fill();
          ctx.stroke();
          
          // Small central glow bead
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(0, -p.height + 1.5 + squeezeFactor, 2.0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          return; // skip standard platform drawing
        }

        ctx.fillStyle = p.color || "#22c55e";
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, [4]);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(p.x, p.y + p.height - 5, p.width, 5);

        // Customize looking for cyber-hazard moving panels (caution stripes + glow edge)
        if (isSequelMode && p.isMoving) {
          ctx.save();
          // Clip drawing inside the rounded rectangle bounding box
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.width, p.height, [4]);
          ctx.clip();

          ctx.fillStyle = "rgba(251, 191, 36, 0.22)"; // translucent amber backing
          ctx.fillRect(p.x, p.y, p.width, p.height);

          ctx.strokeStyle = "#eab308"; // solid amber stripe
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let sx = p.x - 15; sx < p.x + p.width + 30; sx += 14) {
            ctx.moveTo(sx, p.y - 2);
            ctx.lineTo(sx - 12, p.y + p.height + 2);
          }
          ctx.stroke();

          ctx.restore();

          // Draw micro cyan neon ceiling border
          ctx.strokeStyle = "#22d3ee";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 1);
          ctx.lineTo(p.x + p.width, p.y + 1);
          ctx.stroke();
        }
      });

      // Interactive Blocks (? blocks, ! blocks, bricks)
      blocksRef.current.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y + (b.bumpY || 0));

        if (b.isHit) {
          ctx.fillStyle = "#475569";
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(0, 0, b.width, b.height, [6]);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.strokeRect(4, 4, b.width - 8, b.height - 8);

          ctx.fillStyle = "#1e293b";
          ctx.fillRect(4, 4, 3, 3);
          ctx.fillRect(b.width - 7, 4, 3, 3);
          ctx.fillRect(4, b.height - 7, 3, 3);
          ctx.fillRect(b.width - 7, b.height - 7, 3, 3);
        } else {
          if (b.type === 'question') {
            const pulse = Math.sin(Date.now() / 150) * 2;
            ctx.shadowBlur = 10 + pulse;
            ctx.shadowColor = "rgba(251, 191, 36, 0.6)";

            ctx.fillStyle = "#fbbf24";
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(0, 0, b.width, b.height, [6]);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = "#fef08a";
            ctx.lineWidth = 2;
            ctx.strokeRect(3, 3, b.width - 6, b.height - 6);

            ctx.fillStyle = "#78350f";
            ctx.font = "bold 24px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", b.width / 2, b.height / 2 + 1);
          } else if (b.type === 'exclamation') {
            const flash = (Math.floor(Date.now() / 200) % 2 === 0);
            ctx.shadowBlur = 10;
            ctx.shadowColor = flash ? "rgba(239, 68, 68, 0.6)" : "rgba(244, 63, 94, 0.3)";

            ctx.fillStyle = flash ? "#f43f5e" : "#e11d48";
            ctx.strokeStyle = "#9f1239";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(0, 0, b.width, b.height, [6]);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = "#fecdd3";
            ctx.lineWidth = 2;
            ctx.strokeRect(3, 3, b.width - 6, b.height - 6);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 26px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("!", b.width / 2, b.height / 2);
          } else if (b.type === 'brick') {
            ctx.fillStyle = "#b45309";
            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(0, 0, b.width, b.height, [3]);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            ctx.moveTo(0, b.height / 2);
            ctx.lineTo(b.width, b.height / 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(b.width / 4, 0); ctx.lineTo(b.width / 4, b.height / 2);
            ctx.moveTo(3 * b.width / 4, 0); ctx.lineTo(3 * b.width / 4, b.height / 2);
            ctx.moveTo(b.width / 2, b.height / 2); ctx.lineTo(b.width / 2, b.height);
            ctx.stroke();

            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(1, 1, b.width - 2, 2);
            ctx.fillRect(1, b.height / 2 + 1, b.width - 2, 2);
          }
        }
        ctx.restore();
      });

      // Castle at the Flag Pole!
      ctx.save();
      const castX = activeLevel.flagPole.x + 45; // Center of castle
      const groundY = activeLevel.flagPole.y; // 450
      
      // Determine stone colors according to level theme
      let stoneColor = "#64748b"; // surface default (slate)
      let seamColor = "#334155";
      let doorColor = "#1e293b";
      let flagOnCastleColor = "#ef4444";
      
      if (activeLevel.theme === 'underwater') {
        stoneColor = "#0f766e"; // Deep teal
        seamColor = "#115e59";
        doorColor = "#042f2e";
        flagOnCastleColor = "#2dd4bf";
      } else if (activeLevel.theme === 'beach') {
        stoneColor = "#b45309"; // Warm bronze sandstone
        seamColor = "#78350f";
        doorColor = "#451a03";
        flagOnCastleColor = "#fbbf24";
      } else if (activeLevel.theme === 'jungle') {
        stoneColor = "#065f46"; // Dark emerald
        seamColor = "#022c22";
        doorColor = "#022c22";
        flagOnCastleColor = "#34d399";
      } else if (activeLevel.theme === 'river') {
        stoneColor = "#334155"; // Wet dark slate
        seamColor = "#1e293b";
        doorColor = "#0f172a";
        flagOnCastleColor = "#38bdf8";
      } else if (activeLevel.theme === 'surface') {
        // Classic red brick castle
        stoneColor = "#b91c1c";
        seamColor = "#7f1d1d";
        doorColor = "#450a0a";
        flagOnCastleColor = "#facc15";
      } else if (activeLevel.theme === 'cave') {
        stoneColor = "#4338ca"; // Dark violet cavern brick
        seamColor = "#312e81";
        doorColor = "#1e1b4b";
        flagOnCastleColor = "#f43f5e";
      } else if (activeLevel.theme === 'underground') {
        stoneColor = "#1e293b"; // Heavy carbon steel
        seamColor = "#0f172a";
        doorColor = "#020617";
        flagOnCastleColor = "#22c55e";
      } else if (activeLevel.theme === 'city') {
        stoneColor = "#334155"; // High-tech chromium grey
        seamColor = "#0891b2";
        doorColor = "#0f172a";
        flagOnCastleColor = "#eab308";
      } else if (activeLevel.theme === 'desert') {
        stoneColor = "#d97706"; // Warm sandstone temple brick
        seamColor = "#b45309";
        doorColor = "#78350f";
        flagOnCastleColor = "#fef08a";
      } else if (activeLevel.theme === 'island') {
        stoneColor = "#0ea5e9"; // Lagoon blue cobalt block
        seamColor = "#0284c7";
        doorColor = "#0c4a6e";
        flagOnCastleColor = "#fbbf24";
      } else if (activeLevel.theme === 'snowy') {
        stoneColor = "#cbd5e1"; // Glacier slate
        seamColor = "#94a3b8";
        doorColor = "#475569";
        flagOnCastleColor = "#38bdf8";
      } else if (activeLevel.theme === 'mushroom') {
        stoneColor = "#a21caf"; // Enchanted magenta stone
        seamColor = "#701a75";
        doorColor = "#4a044e";
        flagOnCastleColor = "#f472b6";
      } else if (activeLevel.theme === 'lab') {
        stoneColor = "#0284c7"; // electric blue laboratory brick
        seamColor = "#0369a1";
        doorColor = "#0c4a6e";
        flagOnCastleColor = "#22c55e";
      } else if (activeLevel.theme === 'zoo') {
        stoneColor = "#15803d"; // park ranger stone green
        seamColor = "#14532d";
        doorColor = "#062f15";
        flagOnCastleColor = "#facc15";
      } else if (activeLevel.theme === 'prison') {
        stoneColor = "#4b5563"; // concrete prison tower slate
        seamColor = "#1f2937";
        doorColor = "#111827";
        flagOnCastleColor = "#ef4444";
      } else if (activeLevel.theme === 'spooky') {
        stoneColor = "#581c87"; // ghostly purple masonry
        seamColor = "#3b0764";
        doorColor = "#1e1b4b";
        flagOnCastleColor = "#ec4899";
      } else if (activeLevel.theme === 'pirate') {
        stoneColor = "#5c3a21"; // rich mahogany wood logs
        seamColor = "#3d2314";
        doorColor = "#1a0d02";
        flagOnCastleColor = "#eab308"; // golden pirate emblem flag
      } else if (activeLevel.theme === 'egypt') {
        stoneColor = "#d97706"; // golden sandstone brick
        seamColor = "#92400e";
        doorColor = "#78350f";
        flagOnCastleColor = "#fbbf24"; // brilliant gold flag
      } else if (activeLevel.theme === 'park') {
        stoneColor = "#22c55e"; // playground structure green
        seamColor = "#15803d";
        doorColor = "#166534";
        flagOnCastleColor = "#facc15"; // happy yellow flag
      } else if (activeLevel.theme === 'stadium') {
        stoneColor = "#4b5563"; // racetrack concrete grey
        seamColor = "#374151";
        doorColor = "#111827";
        flagOnCastleColor = "#2563eb"; // electric racing blue flag
      } else if (activeLevel.theme === 'space') {
        stoneColor = "#0f172a"; // deep slate spacecraft hull
        seamColor = "#38bdf8";  // neon cyber blue seams
        doorColor = "#1e293b";
        flagOnCastleColor = "#a855f7"; // galactic purple flag
      } else if (activeLevel.theme === 'magma') {
        stoneColor = "#450a0a"; // volcanic obsidian core
        seamColor = "#ea580c";  // molten lava grout seams
        doorColor = "#270202";
        flagOnCastleColor = "#ef4444"; // fire red flag
      } else if (activeLevel.theme === 'candy') {
        stoneColor = "#f472b6"; // sugary pink candy block
        seamColor = "#db2777";  // strawberry syrup lines
        doorColor = "#be185d";
        flagOnCastleColor = "#c084fc"; // grape purple bubble flag
      } else if (activeLevel.theme === 'factory') {
        stoneColor = "#334155"; // iron plating rivet panels
        seamColor = "#f59e0b";  // caution hazard amber borders
        doorColor = "#1e293b";
        flagOnCastleColor = "#eab308"; // warning yellow flag
      } else if (activeLevel.theme === 'castle') {
        stoneColor = "#1e1b4b"; // deep royal sapphire stone brick
        seamColor = "#fbbf24";  // luxury golden tile grout
        doorColor = "#0f172a";
        flagOnCastleColor = "#dc2626"; // royal crimson guard flag
      } else if (activeLevel.theme === 'cybercity') {
        stoneColor = "#1e1b4b"; // deep neon indigo
        seamColor = "#ec4899";  // neon hot pink seams
        doorColor = "#0f172a";
        flagOnCastleColor = "#f43f5e"; // bright rose flag
      } else if (activeLevel.theme === 'steampunk') {
        stoneColor = "#451a03"; // vintage clockwork block
        seamColor = "#ca8a04";  // ticking gold gear rims
        doorColor = "#271201";
        flagOnCastleColor = "#eab308"; // shiny brass flag
      } else if (activeLevel.theme === 'cyber_atlantis') {
        stoneColor = "#0f766e"; // deep teal submerged ruin block
        seamColor = "#22d3ee";  // cyber scale cyan lines
        doorColor = "#115e59";
        flagOnCastleColor = "#06b6d4"; // underwater cyan flag
      }

      // Draw Main Castle block (central structure)
      ctx.fillStyle = stoneColor;
      ctx.fillRect(castX - 25, groundY - 60, 50, 60);

      // Main tower battlements (crenellations)
      ctx.fillRect(castX - 25, groundY - 68, 10, 8);
      ctx.fillRect(castX - 5, groundY - 68, 10, 8);
      ctx.fillRect(castX + 15, groundY - 68, 10, 8);

      // Side Towers (Left & Right)
      // Left Tower
      ctx.fillStyle = stoneColor;
      ctx.fillRect(castX - 38, groundY - 80, 14, 80);
      // Left Battlement
      ctx.fillRect(castX - 40, groundY - 88, 8, 8);
      ctx.fillRect(castX - 30, groundY - 88, 8, 8);

      // Right Tower
      ctx.fillRect(castX + 24, groundY - 80, 14, 80);
      // Right Battlement
      ctx.fillRect(castX + 22, groundY - 88, 8, 8);
      ctx.fillRect(castX + 32, groundY - 88, 8, 8);

      // Draw detailed Brick Lines on center block & towers
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 1.5;
      
      // Horizontal lines on central wall
      for (let yOffset = 15; yOffset < 60; yOffset += 15) {
        ctx.beginPath();
        ctx.moveTo(castX - 25, groundY - yOffset);
        ctx.lineTo(castX + 25, groundY - yOffset);
        ctx.stroke();
      }
      // Horizontal lines on left tower
      for (let yOffset = 15; yOffset < 80; yOffset += 15) {
        ctx.beginPath();
        ctx.moveTo(castX - 38, groundY - yOffset);
        ctx.lineTo(castX - 24, groundY - yOffset);
        ctx.stroke();
      }
      // Horizontal lines on right tower
      for (let yOffset = 15; yOffset < 80; yOffset += 15) {
        ctx.beginPath();
        ctx.moveTo(castX + 24, groundY - yOffset);
        ctx.lineTo(castX + 38, groundY - yOffset);
        ctx.stroke();
      }

      // Add Arched Doorway in the Center
      ctx.fillStyle = doorColor;
      ctx.beginPath();
      ctx.roundRect(castX - 10, groundY - 28, 20, 28, [10, 10, 0, 0]);
      ctx.fill();

      // Door outline
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(castX - 10, groundY - 28, 20, 28, [10, 10, 0, 0]);
      ctx.stroke();

      // Royal Flag on Left and Right Towers
      // Left flag
      ctx.strokeStyle = "#94a3b8"; // grey flag pole
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(castX - 33, groundY - 88);
      ctx.lineTo(castX - 33, groundY - 105);
      ctx.stroke();
      
      ctx.fillStyle = flagOnCastleColor;
      ctx.beginPath();
      ctx.moveTo(castX - 33, groundY - 105);
      ctx.lineTo(castX - 18, groundY - 98);
      ctx.lineTo(castX - 33, groundY - 91);
      ctx.closePath();
      ctx.fill();

      // Right flag
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(castX + 31, groundY - 88);
      ctx.lineTo(castX + 31, groundY - 105);
      ctx.stroke();
      
      ctx.fillStyle = flagOnCastleColor;
      ctx.beginPath();
      ctx.moveTo(castX + 31, groundY - 105);
      ctx.lineTo(castX + 46, groundY - 98);
      ctx.lineTo(castX + 31, groundY - 91);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Flag Pole
      ctx.save();
      ctx.translate(activeLevel.flagPole.x, activeLevel.flagPole.y);
      ctx.fillStyle = "#475569"; // Slate 700
      ctx.fillRect(-2, -150, 4, 150);
      ctx.fillStyle = isSequelMode ? (player.hasKey ? "#10b981" : "#ef4444") : "#ef4444"; // green flag when unlocked!
      ctx.beginPath();
      ctx.moveTo(2, -150);
      ctx.lineTo(30, -135);
      ctx.lineTo(2, -120);
      ctx.fill();
      // Ball on top
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, -155, 5, 0, Math.PI * 2);
      ctx.fill();

      // Padlock overlay (Sequel Mode and locked gate)
      if (isSequelMode && !player.hasKey) {
        ctx.save();
        ctx.translate(14, -135); // right inside the red flag area
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#f43f5e";
        
        // Red steel lock block
        ctx.fillStyle = "#ef4444";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-8, -2, 16, 12, [3]);
        ctx.fill();
        ctx.stroke();
        
        // Shackle loop arch
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, -2, 5.0, Math.PI, 0); 
        ctx.stroke();
        
        // Keyhole detailing
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-0.6, 3, 1.2, 3);
        
        ctx.restore();
      } else if (activeLevel.theme === 'retrowave_highway') {
        // Retrowave Highway: glowing striped neon synth sun, wireframe mountains, and perspective grid floor
        ctx.save();

        const sunX = 500;
        const sunY = 200;
        const sunRadius = 75;

        // 1. Neon Grid Mountains / Silhouettes in the distance
        ctx.fillStyle = "#1e1b4b"; // deep night violet
        ctx.strokeStyle = "#db2777"; // glowing pink neon vector
        ctx.lineWidth = 1.5;
        const peakPositions = [150, 320, 680, 850];
        peakPositions.forEach((px, idx) => {
          ctx.beginPath();
          ctx.moveTo(px - 100, 260);
          ctx.lineTo(px, 130 + (idx % 2) * 20);
          ctx.lineTo(px + 100, 260);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mountain internal grid lines
          ctx.beginPath();
          ctx.moveTo(px, 130 + (idx % 2) * 20);
          ctx.lineTo(px, 260);
          ctx.moveTo(px - 50, 195 + (idx % 2) * 10);
          ctx.lineTo(px + 50, 195 + (idx % 2) * 10);
          ctx.stroke();
        });

        // 2. Large Synthwave Radial Sunset Sun
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, "#facc15"); // premium retro yellow
        sunGrad.addColorStop(0.5, "#f43f5e"); // vibrant pink-rose
        sunGrad.addColorStop(1, "#9d174d"); // dark magenta

        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, Math.PI, 0, false); // Half sun rising over horizon
        ctx.fill();

        // Retro horizontal black scanning stripes through the sun
        ctx.fillStyle = "#04010a"; // background base color
        for (let sy = sunY - sunRadius; sy < sunY; sy += 9) {
          // Stripes get wider as we go down to simulate depth
          const relativeHeight = (sy - (sunY - sunRadius)) / sunRadius;
          const stripeHeight = 2.0 + relativeHeight * 3.5;
          ctx.fillRect(sunX - sunRadius - 10, sy, sunRadius * 2 + 20, stripeHeight);
        }

        // 3. Perspective Highway Ground Grid
        ctx.strokeStyle = "#0891b2"; // cyan grid lines
        ctx.lineWidth = 2.0;
        
        // Vertical perspective rays converging to the center-horizon
        const horizonY = 260;
        for (let rx = -200; rx <= GAME_WIDTH + 200; rx += 100) {
          ctx.beginPath();
          ctx.moveTo(500, horizonY);
          ctx.lineTo(rx, GAME_HEIGHT);
          ctx.stroke();
        }

        // Horizontal scrolling grid lines
        const gridOffset = (Date.now() / 25) % 40;
        ctx.strokeStyle = "rgba(244, 63, 94, 0.55)"; // hot pink horizontal dividers
        for (let gy = horizonY; gy < GAME_HEIGHT; gy += 25) {
          // Adjust scroll speed / positioning relative to perspective index
          const perspectiveY = gy + gridOffset * ((gy - horizonY) / (GAME_HEIGHT - horizonY));
          if (perspectiveY < GAME_HEIGHT) {
            ctx.beginPath();
            ctx.moveTo(0, perspectiveY);
            ctx.lineTo(GAME_WIDTH, perspectiveY);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      ctx.restore();

      // Checkpoint
      if (activeLevel.checkpoint) {
        ctx.save();
        ctx.translate(activeLevel.checkpoint.x, activeLevel.checkpoint.y);
        ctx.fillStyle = "#64748b";
        ctx.fillRect(-2, -40, 4, 40);
        ctx.fillStyle = activeLevel.checkpoint.reached ? "#22c55e" : "#ef4444";
        // Flag for checkpoint
        ctx.beginPath();
        ctx.moveTo(2, -40);
        ctx.lineTo(20, -30);
        ctx.lineTo(2, -20);
        ctx.fill();
        ctx.restore();
      }

      // Draw PowerUps
      powerUpsRef.current.forEach(p => {
        if (!p.collected) {
          ctx.save();
          
          const spawnOffset = p.spawnOffset || 0;
          const bob = Math.sin((Date.now() + p.id * 100) / 150) * 4;
          
          ctx.translate(p.x, p.y + bob + spawnOffset);

          // Center-anchored scale transition when emerging + continuous breathing scale
          ctx.translate(16, 16);
          const emergenceScale = p.spawnOffset !== undefined ? (32 - p.spawnOffset) / 32 : 1.0;
          const pulseScale = 1.0 + Math.sin((Date.now() + p.id * 200) / 180) * 0.06;
          ctx.scale(emergenceScale * pulseScale, emergenceScale * pulseScale);
          ctx.translate(-16, -16);

          // Dynamic pulsing visual glow
          const glowPulse = Math.sin(Date.now() / 150) * 4;
          ctx.shadowBlur = 10 + glowPulse;
          ctx.shadowColor = p.type === 'mushroom' ? "rgba(239, 68, 68, 0.7)" :
                            p.type === 'minimushroom' ? "rgba(168, 85, 247, 0.7)" :
                            p.type === 'fireflower' ? "rgba(249, 115, 22, 0.7)" :
                            p.type === 'iceflower' ? "rgba(56, 189, 248, 0.7)" : "rgba(251, 191, 36, 0.85)";

          // Draw rotating sparkles orbiting the powerup
          const auraTime = Date.now() / 300;
          ctx.save();
          ctx.translate(16, 16);
          ctx.rotate(auraTime);
          ctx.fillStyle = p.type === 'mushroom' ? "rgba(239, 68, 68, 0.4)" :
                          p.type === 'minimushroom' ? "rgba(168, 85, 247, 0.4)" :
                          p.type === 'fireflower' ? "rgba(249, 115, 22, 0.4)" :
                          p.type === 'iceflower' ? "rgba(56, 189, 248, 0.4)" : "rgba(251, 191, 36, 0.5)";
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const dist = 24 + Math.sin(Date.now() / 100 + i) * 2;
            ctx.beginPath();
            ctx.ellipse(Math.cos(angle) * dist, Math.sin(angle) * dist, 2.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          if (p.type === 'mushroom') {
            // Stem
            ctx.fillStyle = "#fef3c7";
            ctx.beginPath();
            ctx.roundRect(6, 14, 18, 16, [4]);
            ctx.fill();
            // Eyes
            ctx.fillStyle = "#000";
            ctx.fillRect(10, 18, 2, 4);
            ctx.fillRect(18, 18, 2, 4);
            // Cap
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(15, 12, 15, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            // Spots
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(15, 6, 3, 0, Math.PI * 2);
            ctx.arc(8, 10, 2.5, 0, Math.PI * 2);
            ctx.arc(22, 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'minimushroom') {
            // Mini Mushroom (Cute and 20% smaller layout)
            ctx.save();
            ctx.translate(3, 3);
            ctx.scale(0.8, 0.8);
            // Stem
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(6, 14, 18, 16, [4]);
            ctx.fill();
            // Eyes
            ctx.fillStyle = "#000";
            ctx.fillRect(10, 18, 2, 4);
            ctx.fillRect(18, 18, 2, 4);
            // Purple/Lavender Cap
            ctx.fillStyle = "#a855f7";
            ctx.beginPath();
            ctx.arc(15, 12, 15, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            // Cute baby spots
            ctx.fillStyle = "#fbcfe8";
            ctx.beginPath();
            ctx.arc(15, 6, 2.5, 0, Math.PI * 2);
            ctx.arc(8, 10, 2, 0, Math.PI * 2);
            ctx.arc(22, 10, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (p.type === 'fireflower') {
            // Stem / Leaves
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(15, 15);
            ctx.lineTo(15, 28);
            ctx.stroke();
            ctx.fillStyle = "#22c55e";
            ctx.beginPath();
            ctx.ellipse(8, 22, 6, 3, Math.PI/6, 0, Math.PI*2);
            ctx.ellipse(22, 22, 6, 3, -Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            // Flower
            ctx.fillStyle = "#ef4444";
            ctx.beginPath(); ctx.ellipse(15, 10, 14, 10, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.beginPath(); ctx.ellipse(15, 10, 10, 7, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#fef08a";
            ctx.beginPath(); ctx.ellipse(15, 10, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#000";
            ctx.fillRect(13, 8, 1.5, 3);
            ctx.fillRect(15.5, 8, 1.5, 3);
          } else if (p.type === 'iceflower') {
            // Stem
            ctx.strokeStyle = "#0ea5e9";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(15, 15);
            ctx.lineTo(15, 28);
            ctx.stroke();
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.ellipse(8, 22, 6, 3, Math.PI/6, 0, Math.PI*2);
            ctx.ellipse(22, 22, 6, 3, -Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            // Flower
            ctx.fillStyle = "#1d4ed8";
            ctx.beginPath(); ctx.ellipse(15, 10, 14, 10, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath(); ctx.ellipse(15, 10, 10, 7, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.ellipse(15, 10, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#000";
            ctx.fillRect(13, 8, 1.5, 3);
            ctx.fillRect(15.5, 8, 1.5, 3);
          } else if (p.type === 'star') {
            // Spinning Star Animation
            ctx.save();
            ctx.translate(15, 15);
            ctx.rotate((Date.now() / 320) % (Math.PI * 2));
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            const rOuter = 15;
            const rInner = 6;
            for (let i = 0; i < 10; i++) {
              const r = i % 2 === 0 ? rOuter : rInner;
              const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
              ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Eyes
            ctx.fillStyle = "#000";
            ctx.fillRect(-2, -3, 1.5, 4);
            ctx.fillRect(0.5, -3, 1.5, 4);
            ctx.restore();
          }
          ctx.restore();
        }
      });

      // Draw Projectiles
      projectilesRef.current.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        const pulse = Math.sin(Date.now() / 50) * 2;
        ctx.beginPath();
        ctx.arc(p.width/2, p.height/2, p.width/2 + pulse, 0, Math.PI * 2);
        if (p.type === 'fireball') {
          ctx.fillStyle = "#ef4444";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
          ctx.fill();
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(p.width/2, p.height/2, p.width/4 + pulse/2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#38bdf8";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.width/2, p.height/2, p.width/4 + pulse/2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Boss Fireballs
      bossFireballsRef.current.forEach(f => {
        ctx.save();
        ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
        
        // Pulsate & Rotate fireball/barrel
        const pulse = Math.sin(Date.now() / 60) * (f.isMini ? 1.5 : 3);
        const angle = (Date.now() / 150) % (Math.PI * 2);
        
        if ((f as any).isBarrel) {
          // Rolling barrel rotation based on horizontal position
          const rollAngle = f.x / 14;
          ctx.rotate(rollAngle);
          
          // Draw wooden cask barrel
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(0,0,0,0.45)";
          
          // Outer barrel body (dark cedar brown)
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.roundRect(-f.width / 2, -f.height / 2, f.width, f.height, [4]);
          ctx.fill();
          
          // Lighter wood planks in the center
          ctx.fillStyle = "#9a3412";
          ctx.fillRect(-f.width / 2 + 3, -f.height / 2 + 1, f.width - 6, f.height - 2);
          
          // Darker slit separations inside
          ctx.fillStyle = "#451a03";
          ctx.fillRect(-f.width / 4, -f.height / 2, 2, f.height);
          ctx.fillRect(f.width / 4 - 2, -f.height / 2, 2, f.height);
          
          // Iron rivet bands at top and bottom
          ctx.fillStyle = "#475569"; // slate steel banding
          ctx.fillRect(-f.width / 2, -f.height / 3, f.width, 3.5);
          ctx.fillRect(-f.width / 2, f.height / 3 - 3.5, f.width, 3.5);
          
          // Iron rivets dots
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.arc(-f.width/3, -f.height/3 + 1.5, 1, 0, Math.PI*2);
          ctx.arc(0, -f.height/3 + 1.5, 1, 0, Math.PI*2);
          ctx.arc(f.width/3, -f.height/3 + 1.5, 1, 0, Math.PI*2);
          ctx.arc(-f.width/3, f.height/3 - 1.5, 1, 0, Math.PI*2);
          ctx.arc(0, f.height/3 - 1.5, 1, 0, Math.PI*2);
          ctx.arc(f.width/3, f.height/3 - 1.5, 1, 0, Math.PI*2);
          ctx.fill();
        } else {
          ctx.rotate(angle);

          if (f.isMini) {
          // Cyber Fuchsia CPU Sparks or Golden Solar Sparks for Riu
          const isRiu = selectedChar === "riu";
          ctx.shadowBlur = 10 + Math.abs(pulse);
          ctx.shadowColor = isRiu ? "#fde047" : "#e9d5ff"; // soft yellow vs violet glow

          // Outer plasma neon fuchsia or golden orange
          ctx.fillStyle = isRiu ? "rgba(245, 158, 11, 0.85)" : "rgba(168, 85, 247, 0.85)";
          ctx.beginPath();
          ctx.arc(0, 0, f.width / 2 + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Inner white hyper-energy core
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(0, 0, f.width / 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Core bright glow shadow
          ctx.shadowBlur = 12 + Math.abs(pulse);
          ctx.shadowColor = "#f43f5e"; // hot neon rose/red

          // Draw multiple layered circles for realistic hot plasma look
          // Outer aura
          ctx.fillStyle = "rgba(239, 68, 68, 0.85)"; // solid orange-red
          ctx.beginPath();
          ctx.arc(0, 0, f.width / 2 + pulse, 0, Math.PI * 2);
          ctx.fill();

          // Inner fire gold core
          ctx.fillStyle = "#fbbf24"; // deep gold yellow
          ctx.beginPath();
          ctx.arc(0, 0, f.width / 3, 0, Math.PI * 2);
          ctx.fill();

          // Core central spark
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(2, -2, f.width / 6, 0, Math.PI * 2);
          ctx.fill();

          // Floating trailing ember lines
          ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-f.width/2 - 4, -4);
          ctx.lineTo(-f.width/2 - 12, -2);
          ctx.moveTo(-f.width/2 - 6, 3);
          ctx.lineTo(-f.width/2 - 15, 6);
          ctx.stroke();
        }
      }
        ctx.restore();
      });

      // 10. Trapped Locked Helper Cage rendering in boss levels!
      if (activeLevel.id % 10 === 0) {
        ctx.save();
        
        // Draw double hanging support chains
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(500 - 30, 0); ctx.lineTo(500 - 30, 95);
        ctx.moveTo(500 + 30, 0); ctx.lineTo(500 + 30, 95);
        ctx.stroke();

        // Draw metal cage body
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(500 - 45, 95, 90, 85, [8]);
        ctx.fill();
        ctx.stroke();

        // Find trapped character config
        const trappedKey = activeLevel.id === 10 ? "aaru" :
                            activeLevel.id === 20 ? "rishu" :
                            activeLevel.id === 30 ? "aadi" :
                            activeLevel.id === 40 ? "shau" :
                            activeLevel.id === 50 ? "riu" : "riu";
        const trappedConfig = CHARACTERS[trappedKey];
        if (trappedConfig) {
          const isBossDefeated = !enemies.some(e => e.type === 'boss') || activeSavedHeroUnlock !== null;
          const bounceOffset = isBossDefeated ? Math.sin(Date.now() / 150) * 8 : 0;
          const drawY = 142 + bounceOffset;

          // Draw character body representation inside/outside the cage! (A real customized robot indeed!)
          ctx.save();
          
          // Draw miniature lower body / torso
          ctx.fillStyle = trappedConfig.lowerColor || trappedConfig.mainColor;
          ctx.beginPath();
          ctx.roundRect(500 - 11, drawY + 8, 22, 14, [4]);
          ctx.fill();

          // Small chest accent plate
          ctx.fillStyle = trappedConfig.chestColor || trappedConfig.accentColor;
          ctx.fillRect(500 - 5, drawY + 11, 10, 4);

          // Head/Helmet
          ctx.fillStyle = trappedConfig.mainColor;
          ctx.beginPath();
          ctx.roundRect(500 - 16, drawY - 18, 32, 26, [8]);
          ctx.fill();

          // Dark digital face visor screen
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.roundRect(500 - 12, drawY - 13, 24, 15, [4]);
          ctx.fill();

          // Visor eyes
          ctx.fillStyle = trappedConfig.accentColor;
          if (isBossDefeated) {
            // Blinking, ultra-happy curved cyber eyes!
            ctx.strokeStyle = trappedConfig.accentColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(500 - 6, drawY - 6, 3, Math.PI, 0);
            ctx.arc(500 + 6, drawY - 6, 3, Math.PI, 0);
            ctx.stroke();
          } else {
            // Worried, glowing digital dots
            ctx.beginPath();
            ctx.arc(500 - 6, drawY - 6, 2.5, 0, Math.PI * 2);
            ctx.arc(500 + 6, drawY - 6, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Antenna receiver on top
          ctx.strokeStyle = trappedConfig.limbColor || trappedConfig.mainColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(500, drawY - 18);
          ctx.lineTo(500, drawY - 26);
          ctx.stroke();
          
          ctx.fillStyle = trappedConfig.accentColor;
          ctx.beginPath();
          ctx.arc(500, drawY - 27, 2, 0, Math.PI * 2);
          ctx.fill();

          // Side ear caps modules details
          ctx.fillStyle = trappedConfig.accentColor;
          ctx.fillRect(500 - 19, drawY - 9, 3, 10);
          ctx.fillRect(500 + 16, drawY - 9, 3, 10);

          if (isBossDefeated) {
            // Sparkles and hearts pop above
            ctx.fillStyle = "#facc15";
            ctx.font = "10px sans-serif";
            ctx.fillText("✨", 500 - 20, drawY - 30);
            ctx.fillText("❤️", 500 + 15, drawY - 30);
          } else {
            // Robotic sweat drop or distress sparkle
            ctx.fillStyle = "#60a5fa";
            ctx.font = "8px sans-serif";
            ctx.fillText("💧", 500 + 15, drawY - 20);
          }

          ctx.restore();
        }

        // Draw iron vertical cage prison bars
        const isBossDefeated = !enemies.some(e => e.type === 'boss') || activeSavedHeroUnlock !== null;
        if (!isBossDefeated) {
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 4;
          for (let bx = 500 - 35; bx <= 500 + 35; bx += 14) {
            ctx.beginPath();
            ctx.moveTo(bx, 95);
            ctx.lineTo(bx, 180);
            ctx.stroke();
          }
        } else {
          // Draw broken bent-outwards bars! This is super cool!
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 4.5;
          
          // Left bar bent outwards left
          ctx.beginPath();
          ctx.moveTo(500 - 35, 95);
          ctx.quadraticCurveTo(500 - 55, 137, 500 - 35, 180);
          ctx.stroke();

          // Right bar bent outwards right
          ctx.beginPath();
          ctx.moveTo(500 + 35, 95);
          ctx.quadraticCurveTo(500 + 55, 137, 500 + 35, 180);
          ctx.stroke();

          // Gold celebratory sparkle particles around the freed character!
          ctx.fillStyle = "#facc15";
          const sparkTime = Date.now() / 150;
          for (let i = 0; i < 5; i++) {
            const angle = sparkTime + i * (Math.PI * 2 / 5);
            const r = 25 + Math.sin(sparkTime * 2 + i) * 6;
            const sx = 500 + Math.cos(angle) * r;
            const sy = 142 + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + Math.abs(Math.sin(sparkTime + i) * 1.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw Speech advice Bubble above cage!
        const displaySpeech = isBossDefeated || (helperDialogueRef.current.timer > 0 && helperDialogueRef.current.text);
        if (displaySpeech) {
          ctx.save();
          // Speech Bubble box
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(500 - 180, 18, 360, 58, [12]);
          ctx.fill();
          ctx.stroke();

          // Speech triangular pointer pointing down onto the cage
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(500 - 12, 76);
          ctx.lineTo(500, 88);
          ctx.lineTo(500 + 12, 76);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Dialogue advice text
          ctx.fillStyle = "#1e293b";
          ctx.font = "black 10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(trappedConfig ? trappedConfig.name.toUpperCase() : "HERO", 500, 36);
          
          ctx.fillStyle = "#4b5563";
          ctx.font = "bold 9.5px 'Inter', sans-serif";
          
          const speechText = isBossDefeated 
            ? `FREEDOM! WE OVERTHREW THE OVERLORD! THANK YOU, ${rescuerName.toUpperCase()}!`
            : helperDialogueRef.current.text;
          ctx.fillText(speechText, 500, 53);
          
          ctx.restore();
        }

        ctx.restore();
      }

      // Enemies
      enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

        // THE ENEMIES WILL CHEER US THROUGH THE ENTIRE LEVEL (Goombas, Koopas, Crabs, Bosses alike!)
        if (!e.isShell && isStarted && !gameState.isWin && !gameState.isGameOver && gameMode === 'racing') {
          ctx.save();
          // Pick a cheer dynamic message based on the enemy's x coordinate so it's stable per enemy, but rotates over time
          const cheerTimeIndex = Math.floor((Date.now() + Math.floor(e.x || 0)) / 1400);
          const namePart = rescuerName.toUpperCase();
          const cheers = [
            `GO ${namePart}! 🙌`,
            `${namePart} IS INTENSE! ⚡`,
            `YOU GO, ${namePart}! 🌟`,
            `SO FAST, ${namePart}! 🏎️`,
            `LEGENDARY RUN! 👑`,
            `YOU GOT THIS, ${namePart}! 🏆`,
            `KICK SOME DUST! 📣`,
            `LET'S GO, ${namePart}! 🚀`
          ];
          const cheerText = cheers[cheerTimeIndex % cheers.length];
          
          ctx.font = "bold 7px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          
          // Gently floating bubble offset
          const bounce = Math.sin(Date.now() / 140 + (e.x || 0)) * 2;
          const bubbleW = ctx.measureText(cheerText).width + 8;
          const bubbleH = 11;
          const bubbleX = 0;
          const bubbleY = -e.height / 2 - 13 + bounce;
          
          // Draw speech bubble background
          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.strokeStyle = "#fbbf24"; // cheerful golden yellow border!
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, [4]);
          ctx.fill();
          ctx.stroke();
          
          // Tiny pointer pointing down from bubble
          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.beginPath();
          ctx.moveTo(-3, bubbleY + bubbleH / 2);
          ctx.lineTo(3, bubbleY + bubbleH / 2);
          ctx.lineTo(0, bubbleY + bubbleH / 2 + 2.5);
          ctx.closePath();
          ctx.fill();
          
          // Write yellow cheerful text
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(cheerText, bubbleX, bubbleY + 2.3);
          ctx.restore();
        }
        
        if (e.type === 'boss') {
          const time = Date.now() / 250;
          const wobble = Math.sin(time) * 4;
          const boss = e as any;
          const isMiniHero = playerRef.current.powerUp === 'mini';
          const isRiu = selectedChar === "riu";

          // Header Text HP Gauge
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 13px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          
          let bossName = "GIGA-FORTRESS CPU";
          if (boss.bossType === 'castle') bossName = "GIANT SPIKY KOOPA";
          else if (boss.bossType === 'factory') bossName = "GIANT ROBOTIC GOOMBA";
          else if (boss.bossType === 'magma') bossName = "GIANT MOLTEN MAGMA CRAB";
          else if (boss.bossType === 'snowy') bossName = "GIANT GLACIAL ICE KOOPA";
          else if (boss.bossType === 'candy') bossName = "GIANT CANDY GUMDROP KING";

          ctx.fillText(`⚡ ${bossName} [HP: ${e.health}] ⚡`, 0, -e.height/2 - 25);

          // Healthbar outline & filled meter
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.beginPath();
          ctx.roundRect(-e.width/2 - 10, -e.height/2 - 15, e.width + 20, 8, [4]);
          ctx.fill();
          
          const isFinalLevel = LEVELS[currentLevelIndex].id === 50;
          const maxHP = isFinalLevel ? 15 : (4 + Math.floor(LEVELS[currentLevelIndex].id / 10) * 2);
          const hpPercent = Math.max(0, (e.health || 1) / maxHP);
          ctx.fillStyle = hpPercent > 0.4 ? "#22c55e" : "#f43f5e";
          ctx.beginPath();
          ctx.roundRect(-e.width/2 - 10, -e.height/2 - 15, (e.width + 20) * hpPercent, 8, [4]);
          ctx.fill();

          // 1. Giant Spiky Koopa (Level 10 / Theme Castle)
          if (boss.bossType === 'castle') {
            ctx.save();
            if (boss.shellState && boss.shellState > 0) {
              ctx.rotate(time * 3);
              ctx.fillStyle = "#92400e";
              ctx.beginPath();
              ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = "#ea580c";
              for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.moveTo(-10, -e.width/2 + 2);
                ctx.lineTo(0, -e.width/2 - 14);
                ctx.lineTo(10, -e.width/2 + 2);
                ctx.fill();
              }
              ctx.strokeStyle = "#451a03";
              ctx.lineWidth = 4;
              ctx.stroke();
            } else {
              const legWaddle = Math.sin(time) * 10;
              ctx.fillStyle = "#eab308";
              ctx.fillRect(-28, e.height / 2 - 12 + legWaddle, 14, 18);
              ctx.fillRect(14, e.height / 2 - 12 - legWaddle, 14, 18);
              
              ctx.fillStyle = "#ea580c";
              ctx.beginPath();
              ctx.moveTo(-e.width / 2, 10);
              ctx.lineTo(-e.width / 2 - 20, 22);
              ctx.lineTo(-e.width / 2 + 10, 25);
              ctx.fill();

              ctx.fillStyle = "#15803d"; // huge green shell backing
              ctx.beginPath();
              ctx.arc(0, 0, e.width / 2 + 3, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = "#ea580c";
              ctx.beginPath();
              ctx.moveTo(14, -e.height/2 + 4);
              ctx.lineTo(26, -e.height/2 - 14);
              ctx.lineTo(34, -e.height/2);
              ctx.fill();

              ctx.fillStyle = "#fef08a";
              ctx.beginPath();
              ctx.ellipse(22, -10, 20, 16, 0.1, 0, Math.PI*2);
              ctx.fill();
              ctx.fillStyle = "#ea580c";
              ctx.fillRect(12, -26, 18, 5);
              ctx.fillStyle = "#f43f5e";
              ctx.beginPath();
              ctx.arc(24, -14, 3, 0, Math.PI*2);
              ctx.fill();
            }
            ctx.restore();
          }
          // 2. Giant Mechanical Goomba (Level 20 / Theme Factory)
          else if (boss.bossType === 'factory') {
            ctx.save();
            if (boss.aiState === 'stumped') {
              ctx.translate(wobble * 0.4, 12);
            } else {
              ctx.translate(0, wobble);
            }
            
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(-e.width/2 - 4, e.height/2 - 6, e.width + 8, 12);
            
            const grad = ctx.createLinearGradient(-e.width/2, -e.height/2, e.width/2, e.height/2);
            grad.addColorStop(0, "#4b5563");
            grad.addColorStop(0.5, "#1f2937");
            grad.addColorStop(1, "#111827");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(-e.width/2, -e.height/2, e.width, e.height, [8]);
            ctx.fill();
            
            const rBlink = Math.sin(Date.now() / 150) > 0;
            ctx.fillStyle = rBlink ? "#ef4444" : "#7f1d1d";
            ctx.beginPath();
            ctx.arc(0, -e.height/2, 11, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = "#f97316";
            ctx.fillRect(-28, -14, 18, 6);
            ctx.fillRect(10, -14, 18, 6);
            
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(-20, 14, 6, 10);
            ctx.fillRect(0, 14, 6, 10);
            ctx.fillRect(15, 14, 6, 10);
            
            ctx.restore();
          }
          // 3. Giant Molten Magma Crab (Level 30 / Theme Magma)
          else if (boss.bossType === 'magma') {
            ctx.save();
            ctx.translate(0, wobble);
            
            const snap = Math.sin(time * 2.5) * 15;
            ctx.fillStyle = "#b91c1c";
            ctx.save();
            ctx.translate(-e.width/2 - 14, -8);
            ctx.rotate(-snap * Math.PI / 180);
            ctx.fillRect(-20, -12, 18, 24);
            ctx.fillStyle = "#ea580c";
            ctx.fillRect(-26, -5, 6, 10);
            ctx.restore();
            
            ctx.fillStyle = "#b91c1c";
            ctx.save();
            ctx.translate(e.width/2 + 14, -8);
            ctx.rotate(snap * Math.PI / 180);
            ctx.fillRect(2, -12, 18, 24);
            ctx.fillStyle = "#ea580c";
            ctx.fillRect(20, -5, 6, 10);
            ctx.restore();
            
            const moltenGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, e.width/2);
            moltenGrad.addColorStop(0, "#f97316");
            moltenGrad.addColorStop(0.4, "#ea580c");
            moltenGrad.addColorStop(1, "#450a0a");
            ctx.fillStyle = moltenGrad;
            ctx.beginPath();
            ctx.ellipse(0, 4, e.width/2 + 10, e.height/2 - 5, 0, 0, Math.PI*2);
            ctx.fill();
            
            ctx.strokeStyle = "#450a0a";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-16, -10); ctx.lineTo(-20, -28);
            ctx.moveTo(16, -10); ctx.lineTo(20, -28);
            ctx.stroke();
            
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(-20, -28, 5, 0, Math.PI*2);
            ctx.arc(20, -28, 5, 0, Math.PI*2);
            ctx.fill();
            
            ctx.restore();
          }
          // 4. Giant Glacial Ice Koopa (Level 40 / Theme Snowy)
          else if (boss.bossType === 'snowy') {
            ctx.save();
            ctx.translate(0, wobble);
            
            ctx.fillStyle = "#bae6fd";
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, e.width/2 + 2, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = "#ffffff";
            for (let i = 0; i < 6; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.beginPath();
              ctx.moveTo(-8, -e.width/2);
              ctx.lineTo(0, -e.width/2 - 15);
              ctx.lineTo(8, -e.width/2);
              ctx.fill();
            }
            
            ctx.fillStyle = "#e0f2fe";
            ctx.beginPath();
            ctx.ellipse(18, -6, 16, 12, 0, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = "#0284c7";
            ctx.beginPath();
            ctx.arc(22, -8, 2.5, 0, Math.PI*2);
            ctx.fill();
            
            ctx.restore();
          }
          // 5. Giant Candy Gumdrop King (Level 50 / Theme Candy)
          else if (boss.bossType === 'candy') {
            ctx.save();
            ctx.translate(0, wobble);
            
            ctx.fillStyle = "#db2777";
            ctx.beginPath();
            ctx.arc(0, -10, e.width / 2, Math.PI, 0);
            ctx.lineTo(e.width/2, 15);
            ctx.lineTo(-e.width/2, 15);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = "#eab308";
            ctx.beginPath();
            ctx.moveTo(-18, -e.width/2 - 5);
            ctx.lineTo(-24, -e.width/2 - 18);
            ctx.lineTo(-6, -e.width/2 - 10);
            ctx.lineTo(0, -e.width/2 - 24);
            ctx.lineTo(6, -e.width/2 - 10);
            ctx.lineTo(24, -e.width/2 - 18);
            ctx.lineTo(18, -e.width/2 - 5);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = "#ffffff"; ctx.fillRect(-10, -5, 3, 3);
            ctx.fillStyle = "#facc15"; ctx.fillRect(12, -2, 3, 3);
            ctx.fillStyle = "#60a5fa"; ctx.fillRect(-5, 6, 3, 3);
            
            ctx.restore();
          }
          // 6. Cybernetic Overlord CPU (Fallback or Level 80 final)
          else {
            // SHOULDER JOINTS
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(-e.width/2 - 16, -10, 16, 20); // Left socket
            ctx.fillRect(e.width/2, -10, 16, 20);  // Right socket

            // MASSIVE ROBOTIC ARMS (Wiggling / swinging)
            ctx.fillStyle = "#475569";
            const leftArmSwing = Math.sin(time) * 12;
            const rightArmSwing = -Math.sin(time) * 12;
            ctx.save();
            ctx.translate(-e.width/2 - 12, 0);
            ctx.rotate(leftArmSwing * Math.PI / 180);
            ctx.fillRect(-10, 0, 10, 35);
            ctx.fillStyle = "#ec4899";
            ctx.fillRect(-14, 30, 6, 12);
            ctx.fillRect(-4, 30, 6, 12);
            ctx.restore();

            ctx.save();
            ctx.translate(e.width/2 + 12, 0);
            ctx.rotate(rightArmSwing * Math.PI / 180);
            ctx.fillRect(0, 0, 10, 35);
            ctx.fillStyle = "#ec4899";
            ctx.fillRect(-2, 30, 6, 12);
            ctx.fillRect(8, 30, 6, 12);
            ctx.restore();

            // MAIN METALLIC CHASSIS (Body)
            const gGrad = ctx.createLinearGradient(-e.width/2, -e.height/2, e.width/2, e.height/2);
            gGrad.addColorStop(0, "#475569");
            gGrad.addColorStop(0.5, "#334155");
            gGrad.addColorStop(1, "#1e293b");
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.roundRect(-e.width/2, -e.height/2, e.width, e.height, [16]);
            ctx.fill();

            ctx.fillStyle = "#94a3b8";
            const dGrid = [
              { x: -e.width/2 + 8, y: -e.height/2 + 8 },
              { x: e.width/2 - 8, y: -e.height/2 + 8 },
              { x: -e.width/2 + 8, y: e.height/2 - 8 },
              { x: e.width/2 - 8, y: e.height/2 - 8 }
            ];
            dGrid.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
            });

            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-e.width/4, -e.height/2);
            ctx.lineTo(-e.width/4 - 6, -e.height/2 - 18);
            ctx.moveTo(e.width/4, -e.height/2);
            ctx.lineTo(e.width/4 + 6, -e.height/2 - 18);
            ctx.stroke();

            const blink = Math.sin(Date.now() / 120) > 0;
            ctx.fillStyle = blink ? "#f43f5e" : "#881337";
            ctx.beginPath();
            ctx.arc(-e.width/4 - 6, -e.height/2 - 18, 5, 0, Math.PI * 2);
            ctx.arc(e.width/4 + 6, -e.height/2 - 18, 5, 0, Math.PI * 2);
            ctx.fill();

            const isMiniActive = playerRef.current.powerUp === 'mini';
            ctx.fillStyle = isMiniActive ? (isRiu ? (Math.sin(Date.now() / 80) > 0 ? "#422006" : "#0f172a") : (Math.sin(Date.now() / 80) > 0 ? "#2e1065" : "#0f172a")) : "#0f172a";
            ctx.beginPath();
            ctx.roundRect(-e.width/2 + 14, -e.height/3, e.width - 28, 28, [6]);
            ctx.fill();

            if (isMiniActive) {
              ctx.shadowBlur = 6;
              ctx.shadowColor = isRiu ? "#eab308" : "#d946ef";
              ctx.strokeStyle = isRiu ? "#fde047" : "#f472b6";
              ctx.lineWidth = 1.5;
              
              const radarSweep = Math.sin(Date.now() / 150) * (e.width / 2.5);
              ctx.beginPath();
              ctx.moveTo(radarSweep, -e.height/3 + 4);
              ctx.lineTo(radarSweep, -e.height/3 + 24);
              ctx.stroke();

              ctx.fillStyle = isRiu ? "rgba(234, 179, 8, 0.2)" : "rgba(236, 72, 153, 0.2)";
              ctx.fillRect(radarSweep - 10, -e.height/3 + 6, 20, 16);
              ctx.font = "black 5px 'JetBrains Mono', monospace";
              ctx.fillStyle = "#ffffff";
              ctx.fillText("TARGET_1x1", radarSweep, -e.height/3 + 12);
              ctx.shadowBlur = 0;
            } else {
              const scanX = Math.sin(Date.now() / 250) * (e.width/2 - 25);
              ctx.fillStyle = "#f43f5e";
              ctx.shadowBlur = 8;
              ctx.shadowColor = "#f43f5e";
              ctx.fillRect(scanX - 6, -e.height/3 + 4, 12, 20);
              ctx.shadowBlur = 0;
            }

            ctx.fillStyle = isMiniActive ? (Date.now() % 300 > 150 ? (isRiu ? "#fef08a" : "#a855f7") : (isRiu ? "#f59e0b" : "#38bdf8")) : "#f43f5e";
            ctx.beginPath();
            ctx.moveTo(-22, -18); ctx.lineTo(-10, -14); ctx.lineTo(-22, -10); ctx.closePath();
            ctx.moveTo(22, -18); ctx.lineTo(10, -14); ctx.lineTo(22, -10); ctx.closePath();
            ctx.fill();

            const corePulse = Math.sin(Date.now() / 150) * 4;
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#eab308";
            ctx.fillStyle = "rgba(234, 179, 8, 0.4)";
            ctx.beginPath();
            ctx.arc(0, 15, 16 + corePulse, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = "#eab308";
            ctx.beginPath();
            ctx.arc(0, 15, 10, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 15, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = "#1e293b";
            ctx.fillRect(-e.width/3, e.height/2, 14, 10);
            ctx.fillRect(e.width/3 - 14, e.height/2, 14, 10);
          }
        } else if (e.type === 'koopa') {
          const shellColor = e.isShell ? "#b91c1c" : "#15803d";
          const headColor = "#fde68a"; // Light yellow
          const lookDir = e.speed > 0 ? 1 : -1;
          const time = Date.now() / 150;

          if (!e.isShell) {
            // Legs
            ctx.fillStyle = headColor;
            const legSwing = Math.sin(time) * 5;
            ctx.beginPath();
            ctx.ellipse(-12, 10 + legSwing, 6, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(12, 10 - legSwing, 6, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(-10, 14 - legSwing, 6, 4, 0, 0, Math.PI * 2);
            ctx.ellipse(10, 14 + legSwing, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head & Neck
            const headBob = Math.sin(time * 0.8) * 3;
            ctx.fillStyle = headColor;
            ctx.beginPath();
            ctx.ellipse(lookDir * 18, -8 + headBob, 8, 6, lookDir * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Eye
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(lookDir * 21, -9 + headBob, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Main Shell
          ctx.fillStyle = shellColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Shell Pattern
          ctx.strokeStyle = "rgba(0,0,0,0.2)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-e.width/2, 0); ctx.lineTo(e.width/2, 0);
          ctx.moveTo(0, -e.height/2); ctx.lineTo(0, e.height/2);
          ctx.stroke();

          // White rim
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 4, e.width / 2, 4, 0, 0, Math.PI * 2);
          ctx.stroke();

          if (e.isShell && e.speed !== 0) {
            ctx.rotate(time * 2);
          }
        } else if (e.type === 'crab') {
          // Drawing a highly polished Crab!
          ctx.save();
          // Wiggling legs
          const legWiggle = Math.sin(Date.now() / 80) * 4;
          ctx.fillStyle = "#ea580c"; // Deep orange for legs
          
          // Jointed legs under the crab body
          ctx.beginPath();
          ctx.ellipse(-14, 10 + legWiggle, 6, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(-8, 11 - legWiggle, 6, 3, Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(14, 10 - legWiggle, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(8, 11 + legWiggle, 6, 3, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();

          // Animated claws (pinching / opening-closing based on game time)
          const clawAngle = Math.sin(Date.now() / 150) * 0.2 + 0.1;
          
          // Left Claw
          ctx.save();
          ctx.translate(-15, -4);
          ctx.rotate(-clawAngle);
          ctx.fillStyle = "#ef4444"; // Red
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 5, -0.4, 0, Math.PI * 2); // joint
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-6, -6, 8, 0, Math.PI, true);
          ctx.fill();
          ctx.restore();

          // Right Claw
          ctx.save();
          ctx.translate(15, -4);
          ctx.rotate(clawAngle);
          ctx.fillStyle = "#ef4444"; // Red
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 5, 0.4, 0, Math.PI * 2); // joint
          ctx.fill();
          ctx.beginPath();
          ctx.arc(6, -6, 8, 0, Math.PI, true);
          ctx.fill();
          ctx.restore();

          // Cute flat capsule body
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.roundRect(-16, -2, 32, 16, [10]);
          ctx.fill();

          // Highlighting on body shell
          ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
          ctx.beginPath();
          ctx.ellipse(-6, 2, 5, 2, -0.1, 0, Math.PI * 2);
          ctx.fill();

          // Eyes on stalks
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          
          ctx.beginPath();
          ctx.moveTo(-6, -2);
          ctx.lineTo(-6, -11);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(6, -2);
          ctx.lineTo(6, -11);
          ctx.stroke();

          // White eyes + black pupils
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-6, -11, 4.5, 0, Math.PI * 2);
          ctx.arc(6, -11, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(-6, -11, 1.8, 0, Math.PI * 2);
          ctx.arc(6, -11, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (e.type === 'alien') {
          // Drawing a highly polished alien inside a hovering UFO flying saucer
          ctx.save();

          // Smooth hovering bounce
          const hoverOffset = Math.sin(Date.now() / 150) * 4;
          ctx.translate(0, hoverOffset);

          // 1. Draw glowing engine fire or thruster blast underneath
          const thrustSize = 6 + Math.abs(Math.sin(Date.now() / 60) * 8);
          const thrustGrad = ctx.createLinearGradient(0, 10, 0, 10 + thrustSize);
          thrustGrad.addColorStop(0, "rgba(56, 189, 248, 0.8)"); // electric blue thrust
          thrustGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
          ctx.fillStyle = thrustGrad;
          ctx.beginPath();
          ctx.moveTo(-10, 10);
          ctx.lineTo(0, 10 + thrustSize);
          ctx.lineTo(10, 10);
          ctx.closePath();
          ctx.fill();

          // 2. Draw UFO Glass Dome
          ctx.fillStyle = "rgba(186, 230, 253, 0.5)"; // cyan glass dome
          ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, -2, 14, Math.PI, 0, false);
          ctx.fill();
          ctx.stroke();

          // 3. Cute little green alien inside!
          ctx.fillStyle = "#22c55e"; // lime alien skin
          // Alien head
          ctx.beginPath();
          ctx.ellipse(0, -5, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Cute little single antenna
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, -11);
          ctx.lineTo(0, -16);
          ctx.stroke();
          // Antenna tip bulb
          ctx.fillStyle = "#ec4899"; // glowing pink antenna tip
          ctx.beginPath();
          ctx.arc(0, -17, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Three cute big alien white eyes
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-4, -6, 2.5, 0, Math.PI * 2); // left eye
          ctx.arc(0, -7.5, 3.2, 0, Math.PI * 2); // middle eye (bigger)
          ctx.arc(4, -6, 2.5, 0, Math.PI * 2); // right eye
          ctx.fill();

          // Three black pupils
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(-4, -6, 1.0, 0, Math.PI * 2);
          ctx.arc(0, -7.5, 1.4, 0, Math.PI * 2);
          ctx.arc(4, -6, 1.0, 0, Math.PI * 2);
          ctx.fill();

          // Cute smile
          ctx.strokeStyle = "#15803d";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, -3.5, 2.5, 0.1, Math.PI - 0.1, false);
          ctx.stroke();

          // Glass shine reflection highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.ellipse(-6, -8, 4, 1.8, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // 4. Draw metal flying saucer UFO rim/base
          const rimGrad = ctx.createLinearGradient(-18, 0, 18, 12);
          rimGrad.addColorStop(0, "#475569");
          rimGrad.addColorStop(0.5, "#94a3b8");
          rimGrad.addColorStop(1, "#334155");
          ctx.fillStyle = rimGrad;
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.ellipse(0, 6, 20, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Small blinking warning lights on the UFO saucer rim!
          const flash = Math.floor(Date.now() / 120) % 3;
          const lights = [-12, -4, 4, 12];
          lights.forEach((lx, li) => {
            ctx.fillStyle = (flash === li % 3) ? "#ef4444" : "#f59e0b"; // red or amber
            ctx.beginPath();
            ctx.arc(lx, 6, 1.8, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
        } else if (e.type === 'drone') {
          // Rogue Patrol Drone - High-contrast metallic dark drone shell
          ctx.save();
          
          // Hover oscillation movement
          const hoverOffset = Math.sin(Date.now() / 120 + e.id) * 3;
          ctx.translate(0, hoverOffset);

          // Real Pulsing RED tracking laser shooting straight down from drone center to physical level floor ground
          const laserGlow = Math.abs(Math.sin(Date.now() / 90));
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + laserGlow * 0.4})`;
          ctx.lineWidth = 1.8 + laserGlow * 2.5;
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 450 - e.y); // dynamic beam matching floor ground coordinates precisely
          ctx.stroke();
          ctx.restore();

          // Left Propeller Blade Spinning
          ctx.save();
          ctx.translate(-18, -4);
          ctx.rotate(Date.now() / 40);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
          ctx.stroke();
          ctx.restore();

          // Right Propeller Blade Spinning
          ctx.save();
          ctx.translate(18, -4);
          ctx.rotate(Date.now() / 40 + Math.PI/2);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
          ctx.stroke();
          ctx.restore();

          // Left support arm
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(-18, -4);
          ctx.moveTo(10, 0); ctx.lineTo(18, -4);
          ctx.stroke();

          // Main spherical tech body core
          const shellGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
          shellGrad.addColorStop(0, "#334155"); // shiny slate steel
          shellGrad.addColorStop(0.7, "#1e293b"); // deep slate shadows
          shellGrad.addColorStop(1, "#0f172a");
          ctx.fillStyle = shellGrad;
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing scanning lens in the middle (flashing red scanner)
          const blinkValue = Math.floor(Date.now() / 200) % 2;
          ctx.fillStyle = blinkValue === 0 ? "#ef4444" : "#b91c1c"; // energetic flash
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = blinkValue === 0 ? 8 : 2;
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset shadows

          // Cyber metallic grid accents
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI, true);
          ctx.stroke();

          ctx.restore();
        } else if (e.type === 'clockwork_soldier') {
          // Wind-up Toy Soldier - Majestic steampunk brass marching mech
          ctx.save();

          const facingLeft = e.speed < 0;
          if (facingLeft) {
            ctx.scale(-1, 1);
          }

          // Back rotating winding brass key
          ctx.save();
          ctx.translate(-14, -2);
          ctx.rotate(Date.now() / 150); // rotating ticking animation
          ctx.fillStyle = "#eab308"; // metallic brass
          ctx.strokeStyle = "#854d0e";
          ctx.lineWidth = 1.5;
          // Key rod
          ctx.fillRect(0, -2, 10, 4);
          ctx.strokeRect(0, -2, 10, 4);
          // Key winged handles
          ctx.beginPath();
          ctx.arc(10, -4, 4.5, 0, Math.PI * 2);
          ctx.arc(10, 4, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Clicking mechanical marching legs (scissors movement)
          const legSwing = Math.sin(Date.now() / 130) * 8;
          ctx.strokeStyle = "#334155"; // carbon rods
          ctx.lineWidth = 3.5;
          
          // Left Leg
          ctx.beginPath();
          ctx.moveTo(-5, 10);
          ctx.lineTo(-5 - legSwing, 19);
          ctx.stroke();
          // Right Leg
          ctx.beginPath();
          ctx.moveTo(5, 10);
          ctx.lineTo(5 + legSwing, 19);
          ctx.stroke();

          // Brass shoes
          ctx.fillStyle = "#ca8a04";
          ctx.beginPath();
          ctx.arc(-5 - legSwing, 19, 3.5, 0, Math.PI, true);
          ctx.arc(5 + legSwing, 19, 3.5, 0, Math.PI, true);
          ctx.fill();

          // Majestic brass plate armor body
          const armorGrad = ctx.createLinearGradient(-10, -10, 10, 10);
          armorGrad.addColorStop(0, "#f59e0b"); // bright brass
          armorGrad.addColorStop(0.5, "#d97706");
          armorGrad.addColorStop(1, "#7c2d12"); // deep rustic bronze shadow
          ctx.fillStyle = armorGrad;
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-9, -10, 18, 20, [3]);
          ctx.fill();
          ctx.stroke();

          // Soldier brass rivet studs
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(-5, -6, 1.2, 0, Math.PI * 2);
          ctx.arc(5, -6, 1.2, 0, Math.PI * 2);
          ctx.arc(-5, 2, 1.2, 0, Math.PI * 2);
          ctx.arc(5, 2, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Steampunk mechanical head gear
          const gearHeadGrad = ctx.createLinearGradient(-7, -24, 7, -10);
          gearHeadGrad.addColorStop(0, "#94a3b8"); // chromium steel faceplate
          gearHeadGrad.addColorStop(1, "#475569");
          ctx.fillStyle = gearHeadGrad;
          ctx.beginPath();
          ctx.roundRect(-7, -22, 14, 12, [2]);
          ctx.fill();
          ctx.stroke();

          // Crimson red army helmet hair plumes
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(-8, -22);
          ctx.quadraticCurveTo(0, -32, 8, -22);
          ctx.lineTo(0, -26);
          ctx.closePath();
          ctx.fill();

          // Glowing mechanical blue eye slots
          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 6;
          ctx.fillRect(-4, -18, 3, 2.2);
          ctx.fillRect(1, -18, 3, 2.2);
          ctx.shadowBlur = 0; // reset

          ctx.restore();
        } else if (e.type === 'gummy_bear') {
          // Bouncing Gummy Bear - Cute, translucent color bounces
          ctx.save();

          // Animated gummy bounce squish
          const bounceScaleX = 1 + Math.sin(Date.now() / 90) * 0.12;
          const bounceScaleY = 1 - Math.sin(Date.now() / 90) * 0.12;
          ctx.scale(bounceScaleX, bounceScaleY);

          // Tracing translucent gelatinous gummy body (uses colors based on enemy id index)
          const colSets = [
            { main: "rgba(16, 185, 129, 0.78)", highlight: "rgba(110, 231, 183, 0.9)" }, // Green Apple
            { main: "rgba(244, 63, 94, 0.78)", highlight: "rgba(253, 164, 175, 0.9)" },  // Strawberry Red
            { main: "rgba(249, 115, 22, 0.78)", highlight: "rgba(253, 186, 116, 0.9)" }  // Juicy Orange
          ];
          const chosenCol = colSets[e.id % colSets.length];

          ctx.fillStyle = chosenCol.main;
          ctx.strokeStyle = chosenCol.highlight;
          ctx.lineWidth = 1.8;

          // Jelly ears
          ctx.beginPath();
          ctx.arc(-8, -12, 5, 0, Math.PI * 2);
          ctx.arc(8, -12, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Main body and head
          ctx.beginPath();
          ctx.roundRect(-12, -10, 24, 22, [8]); // head/face
          ctx.roundRect(-10, 4, 20, 12, [6]);  // thick lower body
          ctx.fill();
          ctx.stroke();

          // Grumpy eyes (slanting downwards angry eyebrows)
          ctx.strokeStyle = "#450a0a";
          ctx.lineWidth = 1.8;
          // Left grumpy brow
          ctx.beginPath();
          ctx.moveTo(-8, -5); ctx.lineTo(-2, -2);
          ctx.stroke();
          // Right grumpy brow
          ctx.beginPath();
          ctx.moveTo(8, -5); ctx.lineTo(2, -2);
          ctx.stroke();

          // Grumpy angry pupils
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-5, -1, 3.2, 0, Math.PI * 2);
          ctx.arc(5, -1, 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(-4, -0.5, 1.2, 0, Math.PI * 2);
          ctx.arc(4, -0.5, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Cute round candy bear snout/muzzle
          ctx.fillStyle = chosenCol.highlight;
          ctx.beginPath();
          ctx.ellipse(0, 4, 4.5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tiny nose
          ctx.fillStyle = "#450a0a";
          ctx.beginPath();
          ctx.arc(0, 3, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Tiny grumpy mouth frown curve
          ctx.strokeStyle = "#450a0a";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 7.5, 2.0, Math.PI + 0.3, -0.3, false);
          ctx.stroke();

          ctx.restore();
        } else if (e.type === 'angler_robot') {
          // Robotic Angler Fish - mechanical deep sea predator
          ctx.save();

          const facingLeft = e.speed < 0;
          if (facingLeft) {
            ctx.scale(-1, 1);
          }

          // Swimming tail fins vertical wiggle
          const tailWag = Math.sin(Date.now() / 110) * 0.4;
          ctx.save();
          ctx.translate(-13, 1);
          ctx.rotate(tailWag);
          ctx.fillStyle = "#14b8a6"; // cyan glowing fins
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-12, -9);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-12, 9);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Cyber light stalk on top of head with glowing blue bulb
          const bulbOffset = Math.sin(Date.now() / 120) * 3;
          ctx.strokeStyle = "#64748b"; // tech cable rod
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(4, -10);
          ctx.quadraticCurveTo(14, -22, 18, -14 + bulbOffset);
          ctx.stroke();

          // Bulby angler light ray projector (shining cyan beams forward!)
          const rayGlow = Math.abs(Math.sin(Date.now() / 140));
          ctx.save();
          ctx.translate(18, -14 + bulbOffset);
          // Drawing light cones outwards
          const beamGrad = ctx.createRadialGradient(0, 0, 1, 15, 10, 40);
          beamGrad.addColorStop(0, "rgba(34, 211, 238, 0.75)");
          beamGrad.addColorStop(0.3, "rgba(34, 211, 238, 0.2)");
          beamGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(60, -20);
          ctx.lineTo(60, 40);
          ctx.closePath();
          ctx.fill();

          // Neon cyan capsule lightbulb
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Steel mechanical body structure
          const bodyGrad = ctx.createLinearGradient(-14, -10, 14, 10);
          bodyGrad.addColorStop(0, "#475569"); // dark metallic scale
          bodyGrad.addColorStop(0.6, "#334155");
          bodyGrad.addColorStop(1, "#0f172a");
          ctx.fillStyle = bodyGrad;
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-14, -10, 28, 20, [8]);
          ctx.fill();
          ctx.stroke();

          // Screwed-in rivet highlights on steel plate fish
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.arc(-8, -6, 1.0, 0, Math.PI * 2);
          ctx.arc(-8, 6, 1.0, 0, Math.PI * 2);
          ctx.arc(4, 6, 1.0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing glowing target RED laser fish eye
          ctx.fillStyle = "#ef4444";
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(6, -2, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Mechanical scary teeth plates
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // Upper spikes
          ctx.moveTo(6, 4); ctx.lineTo(8, 7);
          ctx.moveTo(10, 4); ctx.lineTo(12, 7);
          // Lower spikes
          ctx.moveTo(6, 8); ctx.lineTo(8, 5);
          ctx.moveTo(10, 8); ctx.lineTo(12, 5);
          ctx.stroke();

          ctx.restore();
        } else if (e.type === 'void_eye') {
          // Void Eye - floating hyperdimensional space eyeball
          ctx.save();
          const hoverOffset = Math.sin(Date.now() / 130 + e.id) * 4;
          ctx.translate(0, hoverOffset);

          // Waving dimensional tentacles underneath
          ctx.strokeStyle = "rgba(168, 85, 247, 0.7)";
          ctx.lineWidth = 2.5;
          for (let tx = -8; tx <= 8; tx += 8) {
            ctx.beginPath();
            ctx.moveTo(tx, 4);
            const wiggle = Math.sin(Date.now() / 140 + tx) * 8;
            ctx.quadraticCurveTo(tx + wiggle, 14, tx + wiggle / 2, 24);
            ctx.stroke();
          }

          // Outer pulsing violet shell
          const outerGlow = ctx.createRadialGradient(-2, -2, 2, 0, 0, 15);
          outerGlow.addColorStop(0, "#c084fc");
          outerGlow.addColorStop(0.7, "#7e22ce");
          outerGlow.addColorStop(1, "#3b0764");
          ctx.fillStyle = outerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();

          // Sclera / Inner Eye White
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing neon gold iris in center
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Pitch-black pupil slit
          ctx.fillStyle = "#000000";
          ctx.fillRect(-1.2, -3, 2.4, 6);

          ctx.restore();
        } else if (e.type === 'wind_spirit') {
          // Wind Spirit - spinning wind elemental tornado
          ctx.save();
          
          // Hover swing
          const swingX = Math.sin(Date.now() / 150) * 8;
          ctx.translate(swingX, 0);

          // Render nested spinning transparent vortexes
          const spiralAngle = Date.now() / 60;
          ctx.strokeStyle = "rgba(254, 242, 242, 0.45)";
          for (let r = 4; r < 20; r += 5) {
            ctx.save();
            ctx.rotate(spiralAngle * (r % 2 === 0 ? 1 : -1) * 0.3);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();
          }

          // Tiny rose petals rotating inside
          ctx.fillStyle = "rgba(251, 113, 133, 0.85)";
          for (let p = 0; p < 3; p++) {
            const petalAng = (spiralAngle * 0.7) + (p * Math.PI * 2 / 3);
            const px = Math.cos(petalAng) * 12;
            const py = Math.sin(petalAng) * 12;
            ctx.beginPath();
            ctx.ellipse(px, py, 2.5, 4, petalAng, 0, Math.PI * 2);
            ctx.fill();
          }

          // Whiskered wind mask incenter
          ctx.fillStyle = "rgba(254, 242, 242, 0.9)";
          ctx.beginPath();
          ctx.roundRect(-8, -6, 16, 12, [5]);
          ctx.fill();

          // Cute tiny cyan slit breeze-eyes
          ctx.fillStyle = "#06b6d4";
          ctx.fillRect(-5, -2, 3, 2);
          ctx.fillRect(2, -2, 3, 2);

          ctx.restore();
        } else if (e.type === 'raptor') {
          // Raptor - quick prehistoric primeval reptile predator sprint
          ctx.save();

          const leftFacing = e.speed < 0;
          if (leftFacing) {
            ctx.scale(-1, 1);
          }

          // Tail running swing back/forth
          const tailWag = Math.sin(Date.now() / 90) * 0.4;
          ctx.save();
          ctx.translate(-14, 2);
          ctx.rotate(tailWag);
          ctx.fillStyle = "#15803d"; // dark green
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-18, -4);
          ctx.lineTo(-6, -8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Running legs alternating cycle
          const runCycle = Math.floor(Date.now() / 110) % 2;
          ctx.strokeStyle = "#166534";
          ctx.lineWidth = 3.5;
          
          if (runCycle === 0) {
            // Leg 1 ahead, Leg 2 behind
            ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-10, 16); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(10, 16); ctx.stroke();
          } else {
            // Alternate leg orientations
            ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(2, 16); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(-3, 16); ctx.stroke();
          }

          // Main horizontal raptor posture torso
          const bodyGrad = ctx.createLinearGradient(-14, -8, 14, 8);
          bodyGrad.addColorStop(0, "#22c55e"); // bright lime green
          bodyGrad.addColorStop(1, "#15803d");
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.roundRect(-14, -10, 24, 16, [4]);
          ctx.fill();

          // Feathery back crest (orange punk stripes)
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.moveTo(-10, -10);
          ctx.lineTo(-13, -15);
          ctx.lineTo(-6, -10);
          ctx.lineTo(-9, -16);
          ctx.lineTo(-2, -10);
          ctx.closePath();
          ctx.fill();

          // Snapping sharp layout jaws extending forward
          ctx.fillStyle = "#15803d";
          ctx.beginPath();
          ctx.roundRect(4, -8, 14, 8, [2]); // upper snout dome
          ctx.roundRect(4, -1, 10, 5, [1]);  // lower jaw
          ctx.fill();

          // Tiny yellow reptilian eye slot
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(8, -6, 2, 0, Math.PI * 2);
          ctx.fill();

          // Tiny sharp predator teeth spikes
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(8, -1); ctx.lineTo(9, 1);
          ctx.moveTo(11, -1); ctx.lineTo(12, 1);
          ctx.stroke();

          ctx.restore();
        } else if (e.type === 'cryo_slime') {
          // Translucent Cyber-neon Cryo Slime block sliding
          ctx.save();

          // Translucent sliding squish compression
          const slidingGlow = Math.sin(Date.now() / 140) * 0.08;
          ctx.scale(1 + slidingGlow, 1 - slidingGlow);

          // Translucent cyber cyan glacial cube shield
          ctx.fillStyle = "rgba(6, 182, 212, 0.72)";
          ctx.strokeStyle = "rgba(103, 232, 249, 0.95)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-14, -12, 28, 24, [5]);
          ctx.fill();
          ctx.stroke();

          // Glacier corner light reflections
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.moveTo(-10, -9);
          ctx.lineTo(8, -9);
          ctx.lineTo(-10, 2);
          ctx.closePath();
          ctx.fill();

          // Core circuitry glowing matrix bars inside the block (frozen chips)
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(-6, -2, 12, 3);
          ctx.fillRect(-4, 3, 8, 3);

          // Slanted frosted angry eyes
          ctx.strokeStyle = "#083344";
          ctx.lineWidth = 2.0;
          // Angry left brow
          ctx.beginPath();
          ctx.moveTo(-8, -5); ctx.lineTo(-3, -2);
          ctx.stroke();
          // Angry right brow
          ctx.beginPath();
          ctx.moveTo(8, -5); ctx.lineTo(3, -2);
          ctx.stroke();

          // Glowing cyber cyan pupils
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(-5, -0.5, 2.5, 0, Math.PI * 2);
          ctx.arc(5, -0.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        } else if (e.type === 'neon_vector_car') {
          // Neon Vector Car: A sleek vector-drawn 80s supercar with glowing headlights and cyber hubcaps
          ctx.save();

          const leftFacing = e.speed < 0;
          if (leftFacing) {
            ctx.scale(-1, 1);
          }

          // 1. Headlight projections (yellow beams shining out in front)
          ctx.save();
          const beamGrad = ctx.createLinearGradient(12, 4, 120, 6);
          beamGrad.addColorStop(0, "rgba(250, 204, 21, 0.45)"); // yellow glow start
          beamGrad.addColorStop(1, "rgba(250, 204, 21, 0)"); // fade out
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(12, 2);
          ctx.lineTo(130, -5);
          ctx.lineTo(130, 22);
          ctx.lineTo(12, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // 2. Main Car silhouette / Body panels (hot pink / neon magenta vector contours)
          ctx.fillStyle = "#1e1b4b"; // dark void metal
          ctx.strokeStyle = "#f43f5e"; // hot pink outlines
          ctx.lineWidth = 2.0;
          
          ctx.beginPath();
          ctx.moveTo(-18, 8);  // rear bottom
          ctx.lineTo(-18, 0);  // rear bumper
          ctx.lineTo(-8, -4);  // spoiler/back windshield deck
          ctx.lineTo(1, -7);   // cabin roof
          ctx.lineTo(9, -7);   // windshield incline
          ctx.lineTo(18, 4);   // low wedge nose front bumper
          ctx.lineTo(18, 8);   // front lower edge
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 3. Cabin Windshield and Glass (cyan vector grid fill)
          ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
          ctx.strokeStyle = "#22d3ee";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(-5, -3);
          ctx.lineTo(1, -6);
          ctx.lineTo(6, -6);
          ctx.lineTo(10, 3);
          ctx.lineTo(-2, 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 4. Rear brake light and front blinker (neon grid detailing)
          ctx.fillStyle = "#ef4444"; // red rear light
          ctx.fillRect(-17, 0, 3, 3);

          ctx.fillStyle = "#fbbf24"; // amber headlight
          ctx.fillRect(17, 3, 2, 3);

          // 5. Glowing retro vector wheels (neon cyber hubcaps)
          const spinOffset = Date.now() / 60;
          const wheelsX = [-11, 10];
          wheelsX.forEach(wx => {
            ctx.save();
            ctx.translate(wx, 8);
            ctx.rotate(spinOffset);

            // Outer tire
            ctx.fillStyle = "#0c0a0f";
            ctx.strokeStyle = "#f43f5e";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Glowing vector spoke
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(4, 0);
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 4);
            ctx.stroke();

            ctx.restore();
          });

          ctx.restore();
        } else if (e.type === 'fish') {
          // Drawing a highly polished animated Cheep Cheep (Fish)!
          ctx.save();
          // Swimming body wiggle (sideways tail wag)
          const tailWiggle = Math.sin(Date.now() / 100) * 0.4;
          const leftFacing = e.speed < 0;

          if (leftFacing) {
            ctx.scale(-1, 1);
          }

          // Back caudal tail fin (orange/yellow)
          ctx.save();
          ctx.translate(-e.width / 2 + 2, 0);
          ctx.rotate(tailWiggle);
          ctx.fillStyle = "#f97316"; // Bright orange
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-12, -10);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-12, 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Main round fish body
          ctx.fillStyle = "#ef4444"; // Red top half
          ctx.beginPath();
          ctx.arc(0, 0, e.width / 2, Math.PI, 0, false);
          ctx.fill();

          ctx.fillStyle = "#ffffff"; // White bottom half
          ctx.beginPath();
          ctx.arc(0, 0, e.width / 2, 0, Math.PI, false);
          ctx.fill();

          // Cute yellow dorsal peak fin on head
          ctx.fillStyle = "#facc15"; // Yellow
          ctx.beginPath();
          ctx.moveTo(-4, -e.height / 2);
          ctx.lineTo(8, -e.height / 2 - 8);
          ctx.lineTo(4, -e.height / 2 + 4);
          ctx.closePath();
          ctx.fill();

          // Large white goggles eyes with black pupils
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(5, -6, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(6, -6, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Big round pink cheek
          ctx.fillStyle = "rgba(244, 63, 94, 0.6)";
          ctx.beginPath();
          ctx.arc(4, 3, 4, 0, Math.PI * 2);
          ctx.fill();

          // Flapping pectoral wing-fins (white, moving up/down)
          const wingFlap = Math.sin(Date.now() / 80) * 0.3;
          ctx.save();
          ctx.translate(-2, 2);
          ctx.rotate(wingFlap + 0.2);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Yellow round puffer lips
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(e.width / 2 - 1, 2, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (e.type === 'ghost') {
          // Draw a custom floating spooky Ghost!
          ctx.save();
          
          // Hover breathing floating effect
          const hoverY = Math.sin(Date.now() / 180 + e.id) * 3.5;
          ctx.translate(0, hoverY);
          
          const isShy = (e as any).isShy;
          ctx.fillStyle = isShy ? "rgba(230, 235, 255, 0.55)" : "rgba(255, 255, 255, 0.85)";
          
          // Shy ghosts have blush circles
          if (isShy) {
            ctx.fillStyle = "rgba(216, 180, 254, 0.65)"; // purple blush glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#a855f7";
          } else {
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
          }

          // Main Ghost torso
          ctx.beginPath();
          ctx.arc(0, -5, e.width / 2.2, Math.PI, 0); // head dome
          ctx.lineTo(e.width / 2.2, e.height / 3);
          
          // Wavy bottom skirt trails
          const wave = Math.sin(Date.now() / 90) * 4;
          ctx.lineTo(e.width / 2.5, e.height / 2);
          ctx.quadraticCurveTo(e.width / 4, e.height / 2.5 + wave, e.width / 8, e.height / 2);
          ctx.quadraticCurveTo(0, e.height / 2.5 - wave, -e.width / 8, e.height / 2);
          ctx.quadraticCurveTo(-e.width / 4, e.height / 2.5 + wave, -e.width / 2.5, e.height / 2);
          
          ctx.lineTo(-e.width / 2.2, e.height / 3);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          
          // Large spooky eyes
          ctx.fillStyle = isShy ? "#581c87" : "#000000"; // purple eyes when shy
          ctx.beginPath();
          if (isShy) {
            // Covering face shy eyes (draw little curved lines)
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#581c87";
            ctx.beginPath();
            ctx.arc(-8, -4, 3, 0, Math.PI, true);
            ctx.arc(8, -4, 3, 0, Math.PI, true);
            ctx.stroke();
            
            // Draw cute blush spots
            ctx.fillStyle = "rgba(236, 72, 153, 0.5)";
            ctx.beginPath();
            ctx.arc(-11, 2, 3, 0, Math.PI * 2);
            ctx.arc(11, 2, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw hands covering face
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(-5, 0, 4, 0, Math.PI * 2);
            ctx.arc(5, 0, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Big open pursuing eyes
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.ellipse(-7, -4, 4, 5.5, 0, 0, Math.PI * 2);
            ctx.ellipse(7, -4, 4, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#e11d48"; // glowing red pupils!
            ctx.beginPath();
            const lookDirX = e.speed > 0 ? 1 : -1;
            ctx.arc(-7 + lookDirX, -4, 1.8, 0, Math.PI * 2);
            ctx.arc(7 + lookDirX, -4, 1.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Cute open mouth
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.ellipse(0, 5, 2.5, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Tiny vampire fangs
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(-2, 2); ctx.lineTo(-1, 5); ctx.lineTo(0, 2);
            ctx.moveTo(0, 2); ctx.lineTo(1, 4.5); ctx.lineTo(2, 2);
            ctx.closePath();
            ctx.fill();
          }
          
          ctx.restore();
        } else if (e.type === 'guard') {
          // Draw a Prison / Tech-Laboratory security Guard agent!
          ctx.save();
          
          const lookDir = e.speed > 0 ? 1 : -1;
          const walkPhase = Math.sin(Date.now() / 90) * 5;
          
          // Heavy steel walker boots
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-12, e.height / 2 - 6 + (walkPhase > 0 ? walkPhase : 0), 10, 8);
          ctx.fillRect(2, e.height / 2 - 6 + (walkPhase < 0 ? -walkPhase : 0), 10, 8);
          
          // Heavy armored uniform torso (blue-gray)
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(-e.width / 2.3, -e.height / 3, e.width * 0.86, e.height * 0.7, [6]);
          ctx.fill();
          
          // High-visibility security neon yellow harness straps
          ctx.fillStyle = "#eab308";
          ctx.fillRect(-e.width/3, -e.height/3, 5, e.height * 0.65);
          ctx.fillRect(e.width/3 - 5, -e.height/3, 5, e.height * 0.65);
          ctx.fillRect(-e.width/2.3, -1, e.width * 0.86, 4);
          
          // Security officer helmet/visor
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(0, -e.height / 2.5, 11, 0, Math.PI * 2);
          ctx.fill();
          
          // Glowing electric visor screen
          ctx.fillStyle = "#ef4444"; // red security visor
          ctx.beginPath();
          ctx.roundRect(lookDir * 1.5 - 6, -e.height / 2.5 - 2, 11, 3.5, [1]);
          ctx.fill();
          
          // Laser gun weapon held outward
          ctx.fillStyle = "#475569";
          ctx.fillRect(lookDir * 8, 2, lookDir * 14, 6);
          ctx.fillStyle = "#ef4444"; // laser tip muzzle
          ctx.fillRect(lookDir * 20, 3, lookDir * 2, 4);
          
          ctx.restore();
        } else if (e.type === 'grumpy_pirate') {
          // Draw a gorgeous custom Grumpy Pirate!
          ctx.save();
          
          const lookDir = e.speed > 0 ? 1 : -1;
          const walkPhase1 = Math.sin(Date.now() / 90) * 5;
          const walkPhase2 = Math.cos(Date.now() / 90) * 5;
          const isThrowing = Math.floor(Date.now() / 250) % 6 === 0; // Arm throwing pose occasionally

          // 1. LEGS (One sturdy leather pirate boot, one wooden peg leg!)
          // Sturdy Boot (Left side relative to walking body)
          ctx.fillStyle = "#1e1b4b"; // deep midnight blue/black leather boot
          ctx.fillRect(-12, e.height / 2 - 6 + (walkPhase1 > 0 ? walkPhase1 : 0), 9, 8);
          // Golden buckle on the boot
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(-11, e.height / 2 - 4 + (walkPhase1 > 0 ? walkPhase1 : 0), 3, 2);

          // Authentic Peg Leg (Right side)
          ctx.fillStyle = "#7c2d12"; // dark red-brown timber
          ctx.fillRect(4, e.height / 2 - 10 + (walkPhase2 > 0 ? walkPhase2 : 0), 4, 11); // peg post
          ctx.fillStyle = "#d97706"; // brass tip
          ctx.fillRect(3.5, e.height / 2 + (walkPhase2 > 0 ? walkPhase2 : 0), 5, 2);

          // 2. TORSO - Sailor Striped Shirt (Red/White) & Deep Blue Sea Coat
          // Draw broad sailor shirt
          ctx.fillStyle = "#f8fafc"; // White fabric
          ctx.beginPath();
          ctx.roundRect(-e.width / 2.3, -e.height / 5, e.width * 0.86, e.height * 0.55, [4]);
          ctx.fill();

          // Horizontal Red striped cuts
          ctx.fillStyle = "#dc2626"; // Crimson Pirate Stripes
          ctx.fillRect(-e.width / 2.3, -e.height / 5 + 4, e.width * 0.86, 3.5);
          ctx.fillRect(-e.width / 2.3, -e.height / 5 + 11, e.width * 0.86, 3.5);
          ctx.fillRect(-e.width / 2.3, -e.height / 5 + 18, e.width * 0.86, 3.5);

          // Navy blue sea coat jacket flaps on top of stripes
          ctx.fillStyle = "#1e293b"; // Obsidian navy coat
          ctx.fillRect(-e.width / 2.2, -e.height / 5, 6, e.height * 0.5); // left jacket fold
          ctx.fillRect(e.width / 2.2 - 6, -e.height / 5, 6, e.height * 0.5); // right jacket fold

          // Shiny Brass Coat Buttons (Vertical on outer jacket coat rims)
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(-e.width / 2.2 + 3, -e.height / 5 + 6, 1.8, 0, Math.PI * 2);
          ctx.arc(-e.width / 2.2 + 3, -e.height / 5 + 14, 1.8, 0, Math.PI * 2);
          ctx.arc(e.width / 2.2 - 3, -e.height / 5 + 6, 1.8, 0, Math.PI * 2);
          ctx.arc(e.width / 2.2 - 3, -e.height / 5 + 14, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // 3. PIRATE HEAD (Peach skin, massive black beard, eyepatch & earring)
          ctx.fillStyle = "#fed7aa"; // pirate peach sun-tanned skin
          ctx.beginPath();
          ctx.arc(0, -e.height / 3, 11, 0, Math.PI * 2);
          ctx.fill();

          // Shiny golden pirate loop earring (hoop hanging on the side)
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(-e.width / 4, -e.height / 3 + 2, 4.5, 0.5 * Math.PI, 1.5 * Math.PI);
          ctx.stroke();

          // Massive black pirate beard covering the chin!
          ctx.fillStyle = "#18181b"; // Charcoal black beard
          ctx.beginPath();
          ctx.arc(0, -e.height / 3 + 4, 11, 0, Math.PI);
          ctx.lineTo(e.width / 3.5, -e.height / 3 + 1);
          ctx.lineTo(-e.width / 3.5, -e.height / 3 + 1);
          ctx.closePath();
          ctx.fill();
          
          // Little dangling beard braids!
          ctx.fillStyle = "#18181b";
          ctx.fillRect(-4, -e.height / 3 + 11, 3, 5);
          ctx.fillRect(2, -e.height / 3 + 11, 3, 5);
          ctx.fillStyle = "#e2e8f0"; // silver bead clamps
          ctx.fillRect(-4, -e.height / 3 + 14, 3, 1.5);
          ctx.fillRect(2, -e.height / 3 + 14, 3, 1.5);

          // One visible glowing pirate eye
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          let eyeX = lookDir > 0 ? 4 : -4;
          ctx.arc(eyeX, -e.height / 3 - 2, 3, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "#15803d"; // ocean green iris
          ctx.beginPath();
          ctx.arc(eyeX + lookDir * 0.5, -e.height / 3 - 2, 1.3, 0, Math.PI*2);
          ctx.fill();

          // Black leather Eyepatch over the other side
          let patchX = lookDir > 0 ? -4 : 4;
          ctx.fillStyle = "#09090b"; // pure black leather
          ctx.beginPath();
          ctx.arc(patchX, -e.height / 3 - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Eyepatch diagonal crossband cord strap
          ctx.strokeStyle = "#09090b";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(-11, -e.height / 3 - 6);
          ctx.lineTo(11, -e.height / 3 + 1);
          ctx.stroke();

          // Angry bushy grumpy pirate eyebrows
          ctx.strokeStyle = "#18181b";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-7, -e.height / 3 - 6); ctx.lineTo(-1, -e.height / 3 - 4); // angry slant left
          ctx.moveTo(1, -e.height / 3 - 4); ctx.lineTo(7, -e.height / 3 - 6); // angry slant right
          ctx.stroke();

          // Grumpy frown mouth (visible through parts of the beard)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -e.height / 3 + 2, 4, Math.PI, 0, false); // inverted frown arc
          ctx.stroke();

          // 4. TRICORNE PIRATE HAT (Classic captain black leather with gold rim & mini Jolly Roger)
          ctx.save();
          ctx.translate(0, -e.height / 3 - 8);
          
          // Main hat base
          ctx.fillStyle = "#09090b"; // dark charcoal hat
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Three upturned corners of the tricorne brim
          ctx.beginPath();
          ctx.moveTo(-17, 2);
          ctx.quadraticCurveTo(-14, -10, -5, -8);
          ctx.quadraticCurveTo(0, -11, 5, -8);
          ctx.quadraticCurveTo(14, -10, 17, 2);
          ctx.quadraticCurveTo(0, 5, -17, 2);
          ctx.closePath();
          ctx.fill();

          // Golden golden edge trim
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Mini central skull emblem (Jolly Roger) on the front fold
          ctx.fillStyle = "#f8fafc"; // pure bone white
          ctx.beginPath();
          ctx.arc(0, -3, 2.8, 0, Math.PI * 2); // skull dome
          ctx.fillRect(-1.5, -1, 3, 3); // jaw
          ctx.fill();
          // tiny crossbones lines
          ctx.strokeStyle = "#f8fafc";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-4, -1); ctx.lineTo(4, 1);
          ctx.moveTo(-4, 1); ctx.lineTo(4, -1);
          ctx.stroke();

          ctx.restore();

          // 5. PIRATE WEAPON / TOSSING HAND (Holding steel hook or lifting heavy rolling barrel!)
          ctx.fillStyle = "#475569"; // slate grey metal weapon
          if (isThrowing) {
            // Throwing pose! Raised arm
            ctx.fillStyle = "#fed7aa"; // bare flesh throwing arm
            ctx.fillRect(lookDir * 8, -6, lookDir * 12, 5);
            ctx.fillStyle = "#d97706"; // a mini wooden barrel in hand
            ctx.fillRect(lookDir * 16, -11, 8, 10);
          } else {
            // Resting pose: Dreaded pirate cold steel hook!
            ctx.strokeStyle = "#cbd5e1"; // shining silver
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(lookDir * 10, 3);
            ctx.quadraticCurveTo(lookDir * 16, -2, lookDir * 15, -6); // curved hook pointy end
            ctx.stroke();
            // Gold hook base sleeve wrapper
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(lookDir * 7, 1, lookDir * 4, 4);
          }

          ctx.restore();
        } else {
          // Goomba
          ctx.fillStyle = "#5d4037";
          const waddle = Math.sin(Date.now() / 100) * 4;
          ctx.beginPath();
          ctx.ellipse(-8, 12 + (waddle > 0 ? waddle : 0), 8, 4, 0, 0, Math.PI * 2);
          ctx.ellipse(8, 12 + (waddle < 0 ? -waddle : 0), 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fef3c7";
          ctx.beginPath(); ctx.roundRect(-e.width / 3, -2, (e.width / 3) * 2, 14, [4]); ctx.fill();
          ctx.fillStyle = "#92400e";
          ctx.beginPath(); ctx.moveTo(-e.width/2, 2); ctx.bezierCurveTo(-e.width/2, -18, e.width/2, -18, e.width/2, 2); ctx.lineTo(e.width/2 - 4, 5); ctx.lineTo(-(e.width/2 - 4), 5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(-5, -6, 4, 6, 0.1, 0, Math.PI * 2); ctx.ellipse(5, -6, 4, 6, -0.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI * 2); ctx.arc(4, -5, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Draw ICE surrounding if frozen
        if (e.isFrozen) {
          ctx.fillStyle = "rgba(186, 230, 253, 0.65)";
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-e.width/2 - 3, -e.height/2 - 3, e.width + 6, e.height + 6, [8]);
          ctx.fill();
          ctx.stroke();
          // Diagonal shimmer lines
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-e.width/2 + 2, -e.height/2 + 2);
          ctx.lineTo(-e.width/2 + 15, -e.height/2 + 15);
          ctx.stroke();
        }

        // Draw Speech Bubble reacting to Mini Player!
        if (playerRef.current.powerUp === 'mini' && !playerRef.current.isDead && gameMode === 'racing') {
          ctx.save();
          
          let quotes: string[] = [];
          if (e.type === 'boss') {
            quotes = [
              "TARGET MINIMIZED! DISCHARGING MICROPARTICLES!",
              "SCANNING SYSTEM MISMATCH: SUB-CENTIMETER THREAT!",
              "MAX ZOOM CALIBRATION FAIL! INTRUDER IS COIN-SIZED!",
              "SYSTEM OVERLOAD! TARGET IS ONLY 18 PIXELS BIG!"
            ];
          } else if (e.type === 'koopa') {
            quotes = [
              "Whoa, a micro robot!",
              "Watch out, don't get squished!",
              "Hey tiny! Are you a dust mote?",
              "Look, a byte-sized bot!"
            ];
          } else if (e.type === 'crab') {
            quotes = [
              "Pinch the micro-bug!",
              "Is that a crawling coin?!",
              "Who shrank the challenger?",
              "Pincer radar is lagging!"
            ];
          } else {
            // Goomba
            quotes = [
              "Am I a giant now?",
              "So tiny! Too cute to stomp!",
              "Hey! Where did you go?",
              "Is that a walking micro-chip?!"
            ];
          }

          // Pick active quote based on stable enemy id so it doesn't flicker
          const quoteIndex = Math.floor(Math.abs(e.id) % quotes.length);
          const activeQuote = quotes[quoteIndex];

          ctx.font = "bold 9px 'Fira Code', 'JetBrains Mono', monospace";
          const measure = ctx.measureText(activeQuote);
          const textW = measure.width;
          const bubbleW = textW + 14;
          const bubbleH = 18;
          // Position relative to enemy center: draw above their head
          const bx = -bubbleW / 2;
          const by = -e.height / 2 - 24;

          // Cute floating offset animation based on time for realistic breathing
          const breatheY = Math.sin(Date.now() / 150 + e.id) * 2;

          ctx.translate(0, breatheY);

          // Shadow / Border glow for premium cyber arcade aesthetic
          const isRiu = selectedChar === "riu";
          ctx.shadowBlur = 6;
          ctx.shadowColor = e.type === 'boss' ? (isRiu ? "#eab308" : "#ec4899") : (isRiu ? "#f59e0b" : "#a855f7");

          // Draw Rounded white bubble backing
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.strokeStyle = e.type === 'boss' ? (isRiu ? "#fef08a" : "#f472b6") : (isRiu ? "#fde047" : "#d8b4fe");
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(bx, by, bubbleW, bubbleH, [5]);
          ctx.fill();
          ctx.stroke();

          // Reset shadow for text drawing to maintain crisp readability
          ctx.shadowBlur = 0;

          // Tiny speech bubble pointer sticking down
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.beginPath();
          ctx.moveTo(-5, by + bubbleH);
          ctx.lineTo(0, by + bubbleH + 4);
          ctx.lineTo(5, by + bubbleH);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = e.type === 'boss' ? (isRiu ? "#fef08a" : "#f472b6") : (isRiu ? "#fde047" : "#d8b4fe");
          ctx.beginPath();
          ctx.moveTo(-5, by + bubbleH);
          ctx.lineTo(0, by + bubbleH + 4);
          ctx.lineTo(5, by + bubbleH);
          ctx.stroke();

          // Rendering quote text cleanly
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(activeQuote, 0, by + bubbleH / 2 + 0.5);

          ctx.restore();
        }

        ctx.restore();
      });

      // Coins
      coins.forEach((c) => {
        if (!c.collected) {
          ctx.save();
          const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
          ctx.translate(c.x, c.y);
          ctx.scale(scale, scale);
          ctx.fillStyle = "#fbbf24";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        }
      });

      // Rotating Gate Key (Sequel Mode)
      if (isSequelMode && isKeyRequired && keyRef.current && !keyRef.current.collected) {
        const key = keyRef.current;
        ctx.save();
        ctx.translate(key.x, key.y + Math.sin(Date.now() / 150) * 4); // floating hover offset
        
        // Spinning velocity factor
        const spin = (Date.now() / 320) % (Math.PI * 2);
        ctx.rotate(spin);
        
        // Energetic glow back shadow
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#facc15";
        
        // Golden metallic colors
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.5;
        
        // Key head ring
        ctx.beginPath();
        ctx.arc(-8, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Key shaft line
        ctx.fillRect(-2, -2, 16, 4);
        ctx.strokeRect(-2, -2, 16, 4);
        
        // Prongs
        ctx.fillRect(8, 2, 2.5, 4.5);
        ctx.fillRect(11.5, 2, 2.5, 4.5);
        
        ctx.restore();
      }

      // Draw Racing Mode Opponent Hero Cyber Cars!
      if (gameMode === 'racing') {
        opponentsRef.current.forEach((opp, idx) => {
          const ox = opp.x;
          const oy = opp.y;

          ctx.save();

          // Hurt blinking (translucent on alternate intervals)
          if (opp.shieldTimer && opp.shieldTimer > 0 && Math.floor(opp.shieldTimer / 4) % 2 === 0) {
            ctx.globalAlpha = 0.25;
          }

          ctx.translate(ox + 22, oy + 27); // centered position

          // If damaged, copy player's movement and spin around!
          if (opp.spinAngle) {
            ctx.rotate(opp.spinAngle);
          }

          // 1. Sleek low-slung Wedge-shaped Formula Chassis
          ctx.fillStyle = opp.accentColor;
          ctx.beginPath();
          ctx.moveTo(-32, 14); // rear wing joint
          ctx.lineTo(-12, 6);  // back motor vents
          ctx.lineTo(-4, 18);  // cockpit depth
          ctx.lineTo(12, 18);  // cockpit nose floor
          ctx.lineTo(28, 14);  // streamlined nose cone
          ctx.lineTo(34, 21);  // razor splitter plate
          ctx.lineTo(34, 24);  // ground lip
          ctx.lineTo(-32, 24); // flat ground underbelly
          ctx.closePath();
          ctx.fill();

          // Highlight Stripe accents
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-18, 10, 8, 3);
          ctx.fillStyle = opp.chestColor;
          ctx.fillRect(16, 15, 8, 2);

          // 2. Cyber Racing Tires with spinning spokes!
          const wheelCenters = [-18, 18];
          const wheelRadius = 9;
          const spinAngle = (Date.now() / 55) + idx * 2.3;

          wheelCenters.forEach(wx => {
            // outer tire
            ctx.fillStyle = "#0f172a"; // deep void carbon
            ctx.beginPath();
            ctx.arc(wx, 22, wheelRadius, 0, Math.PI * 2);
            ctx.fill();

            // inner rim
            ctx.strokeStyle = opp.chestColor;
            ctx.lineWidth = 1.8;
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            ctx.beginPath();
            ctx.arc(wx, 22, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // rotating alloy spokes represent high-speed spinning!
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(wx - Math.cos(spinAngle)*4.5, 22 - Math.sin(spinAngle)*4.5);
            ctx.lineTo(wx + Math.cos(spinAngle)*4.5, 22 + Math.sin(spinAngle)*4.5);
            ctx.moveTo(wx - Math.cos(spinAngle + Math.PI/2)*4.5, 22 - Math.sin(spinAngle + Math.PI/2)*4.5);
            ctx.lineTo(wx + Math.cos(spinAngle + Math.PI/2)*4.5, 22 + Math.sin(spinAngle + Math.PI/2)*4.5);
            ctx.stroke();
          });

          // 3. Aerodynamic Spoiler Wing
          ctx.strokeStyle = opp.mainColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-26, 14);
          ctx.lineTo(-24, 2);
          ctx.stroke();

          ctx.fillStyle = opp.limbColor;
          ctx.beginPath();
          ctx.roundRect(-30, 0, 13, 4, [2]);
          ctx.fill();

          // 4. Compact Steering Column & Wheel
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(6, 12);
          ctx.lineTo(10, 4);
          ctx.stroke();

          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.ellipse(10, 0, 2, 5, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();

          // 5. Hero Robot Driver (Top Body & Helmet)
          // Torso Sitting in cockpit
          ctx.fillStyle = opp.lowerColor;
          ctx.beginPath();
          ctx.roundRect(-10, -8, 20, 18, [4]);
          ctx.fill();

          // Glowing reactor heart
          ctx.fillStyle = opp.chestColor;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          // Interactive cyber driving hands pulling/turning!
          ctx.strokeStyle = opp.limbColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-6, -2);
          ctx.lineTo(8, -1);
          ctx.stroke();

          // Helmet head
          ctx.fillStyle = opp.mainColor;
          ctx.beginPath();
          ctx.roundRect(-10, -24, 20, 16, [6]);
          ctx.fill();

          // Glowing face screen
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.roundRect(-7, -20, 14, 8, [3]);
          ctx.fill();

          // Laser optics visor line
          ctx.fillStyle = opp.accentColor;
          ctx.fillRect(-4, -18, 8, 3);

          // Head communications antennae
          ctx.strokeStyle = opp.limbColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -24);
          ctx.lineTo(0, -32);
          ctx.stroke();
          ctx.fillStyle = opp.accentColor;
          ctx.beginPath();
          ctx.arc(0, -33, 2, 0, Math.PI * 2);
          ctx.fill();

          // Driver's target sign text tag
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 8.5px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.shadowBlur = 0;
          ctx.fillText(opp.name.toUpperCase(), 0, -42);

          // Exhaust spark/glow effect
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
          ctx.beginPath();
          ctx.arc(-34, 18, 3 + Math.sin(Date.now() / 45) * 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });
      }

      // Draw Rising Lava in Floor is Lava Mode
      if (gameMode === 'lava') {
        const ly = lavaYRef.current;
        if (ly < GAME_HEIGHT + 100) {
          ctx.save();
          
          // Outer Glow on top of the lava surface
          ctx.shadowColor = "#f97316"; // vibrant orange glow
          ctx.shadowBlur = 15;
          
          // Draw wavy lava top
          ctx.fillStyle = "rgba(239, 68, 68, 0.85)"; // translucent crimson
          ctx.beginPath();
          ctx.moveTo(0, ly);
          
          // Create an active rolling wave on the lava surface
          const waveCount = 10;
          const segmentWidth = GAME_WIDTH / waveCount;
          for (let i = 0; i <= waveCount; i++) {
            const wx = i * segmentWidth;
            // Wave amplitude and phase
            const waveAmp = 4;
            const waveY = ly + Math.sin((Date.now() / 400) + (i * 1.5)) * waveAmp;
            ctx.lineTo(wx, waveY);
          }
          
          ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
          ctx.lineTo(0, GAME_HEIGHT);
          ctx.closePath();
          ctx.fill();
          
          // High-contrast, molten inner details
          ctx.shadowBlur = 0; // disable shadow for interior details
          const lavaGrad = ctx.createLinearGradient(0, ly, 0, GAME_HEIGHT);
          lavaGrad.addColorStop(0, "rgba(249, 115, 22, 0.9)"); // molten orange on top
          lavaGrad.addColorStop(0.3, "rgba(239, 68, 68, 0.9)"); // hot red
          lavaGrad.addColorStop(1, "rgba(127, 29, 29, 0.95)"); // deep obsidian maroon
          
          ctx.fillStyle = lavaGrad;
          ctx.beginPath();
          ctx.moveTo(0, ly + 2);
          for (let i = 0; i <= waveCount; i++) {
            const wx = i * segmentWidth;
            const waveY = ly + 2 + Math.sinh(Math.sin((Date.now() / 420) + (i * 1.2))) * 3.5;
            ctx.lineTo(wx, waveY);
          }
          ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
          ctx.lineTo(0, GAME_HEIGHT);
          ctx.closePath();
          ctx.fill();

          // Rising heat/magma bubbles
          ctx.fillStyle = "#fde047"; // hot yellow bubbles
          for (let i = 0; i < 8; i++) {
            const bx = (Math.sin(i * 133 + Date.now() / 2000) * 0.5 + 0.5) * GAME_WIDTH;
            const bAge = (Date.now() / 1500 + i * 2.5) % 1; // ages 0 to 1
            const by = GAME_HEIGHT - bAge * (GAME_HEIGHT - ly);
            if (by > ly) {
              ctx.beginPath();
              ctx.arc(bx, by, Math.max(0.5, (1 - bAge) * 4), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Hot steam/sparks crackling above the surface!
          ctx.fillStyle = "rgba(249, 115, 22, 0.7)";
          for (let i = 0; i < 12; i++) {
            const sx = (Math.cos(i * 492 + Date.now() / 1500) * 0.5 + 0.5) * GAME_WIDTH;
            const sAge = (Date.now() / 800 + i * 1.3) % 1;
            const sy = ly - sAge * 35; // rises up to 35px above lava
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2 * (1 - sAge), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // Glowing warning vignette if lava is dangerously close (less than 110px)
      if (gameMode === 'lava' && !player.isDead) {
        const dist = lavaYRef.current - (player.y + player.height);
        if (dist < 110) {
          const intensity = Math.min(0.35, (110 - dist) / 110 * 0.35);
          const pulse = Math.sin(Date.now() / 100) * 0.12 + 0.88;
          ctx.save();
          const warningGrad = ctx.createRadialGradient(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 4,
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 1.4
          );
          warningGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
          warningGrad.addColorStop(1, `rgba(239, 68, 68, ${intensity * pulse})`);
          ctx.fillStyle = warningGrad;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
          
          // Draw bold alert text "⚠️ CRITICAL: LAVA RISING!" nicely
          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.font = "bold 10px 'Space Grotesk', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("⚠️ CRITICAL: LAVA RISING!", GAME_WIDTH / 2, 28);
          ctx.restore();
        }
      }

      // Draw Prison Mode searchlights and overlay
      if (gameMode === 'prison') {
        ctx.save();
        
        // Dark prison yard shadows overlay
        ctx.fillStyle = "rgba(10, 10, 15, 0.42)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Two rotating security spotlight cones
        const time = Date.now() / 1000;
        const lights = [
          { sx: 200, sy: 0, x: 250 + Math.sin(time) * 180, y: 400, r: 65, color: "rgba(250, 204, 21, 0.28)" },
          { sx: 800, sy: 0, x: 750 + Math.cos(time * 1.2) * 180, y: 400, r: 65, color: "rgba(250, 204, 21, 0.28)" }
        ];

        lights.forEach(l => {
          // Draw cone beam
          ctx.fillStyle = l.color;
          ctx.beginPath();
          ctx.moveTo(l.sx, l.sy);
          ctx.lineTo(l.x - l.r, l.y);
          ctx.lineTo(l.x + l.r, l.y);
          ctx.closePath();
          ctx.fill();
          
          // Draw floor illumination puddle
          ctx.fillStyle = "rgba(250, 204, 21, 0.4)";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#facc15";
          ctx.beginPath();
          ctx.ellipse(l.x, l.y, l.r, l.r / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        
        // Draw Alarm indicator if alarm is active
        if (alarmTimerRef.current && alarmTimerRef.current > 0) {
          const pulse = Math.sin(Date.now() / 80) * 0.15 + 0.85;
          
          // Red glowing vignette border
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 * pulse})`;
          ctx.lineWidth = 14;
          ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
          
          // 🚨 ALARM OVERLAY TEXT
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.font = "bold 11px 'Space Grotesk', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🚨 SECURITY LOCKDOWN: ACTIVE ALARM 🚨", GAME_WIDTH / 2, 28);
        } else {
          // Normal security warning indicator
          ctx.fillStyle = "rgba(250, 204, 21, 0.8)";
          ctx.font = "bold 9px 'Space Grotesk', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🔒 SECURE OUTPOST - AVOID SPOTLIGHTS!", GAME_WIDTH / 2, 25);
        }
        
        ctx.restore();
      }

      // Spooky Mansion Mode Ambient Overlays
      if (gameMode === 'spooky') {
        ctx.save();
        
        // Purple horror ambient night glow
        const spookGrad = ctx.createRadialGradient(
          GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 3,
          GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 1.1
        );
        spookGrad.addColorStop(0, "rgba(28, 15, 50, 0.1)");
        spookGrad.addColorStop(1, "rgba(8, 2, 18, 0.65)");
        ctx.fillStyle = spookGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Floating spooky details - cobwebs in the top corners!
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1.2;
        
        // Top-left cobweb
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(60, 0);
        ctx.moveTo(0, 0); ctx.lineTo(0, 60);
        ctx.moveTo(0, 0); ctx.lineTo(45, 45);
        ctx.moveTo(30, 0); ctx.quadraticCurveTo(20, 20, 0, 30);
        ctx.moveTo(50, 0); ctx.quadraticCurveTo(35, 35, 0, 50);
        ctx.stroke();
        
        // Top-right cobweb
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH, 0); ctx.lineTo(GAME_WIDTH - 60, 0);
        ctx.moveTo(GAME_WIDTH, 0); ctx.lineTo(GAME_WIDTH, 60);
        ctx.moveTo(GAME_WIDTH, 0); ctx.lineTo(GAME_WIDTH - 45, 45);
        ctx.moveTo(GAME_WIDTH - 30, 0); ctx.quadraticCurveTo(GAME_WIDTH - 20, 20, GAME_WIDTH, 30);
        ctx.moveTo(GAME_WIDTH - 50, 0); ctx.quadraticCurveTo(GAME_WIDTH - 35, 35, GAME_WIDTH, 50);
        ctx.stroke();
        
        // Spooky banner label
        ctx.fillStyle = "rgba(168, 85, 247, 0.85)"; // purple theme
        ctx.font = "bold 9.5px 'Space Grotesk', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👻 SPOOKY HAUNTED HQ - Ghost evasion active!", GAME_WIDTH / 2, 25);
        
        ctx.restore();
      }

      // Draw Robot Players
      const playersToDraw: { ref: Player; isP1: boolean; charName: string }[] = [
        { ref: player, isP1: true, charName: selectedChar }
      ];

      if (cpuActiveRef.current && !cpuPlayerRef.current.isDead) {
        // Draw CPU companion with a distinct appearance if active
        playersToDraw.push({ 
          ref: cpuPlayerRef.current, 
          isP1: false, 
          charName: selectedChar === 'aaryan' ? 'aaru' : 'aaryan' 
        });
      }

      playersToDraw.forEach(({ ref: p, isP1, charName }) => {
        // Hurt blinking
        if (p.shieldTimer && p.shieldTimer > 0 && Math.floor(p.shieldTimer / 4) % 2 === 0) {
          return;
        }

        ctx.save();
        // Translate to character center
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        if (p.isDead) ctx.rotate(Math.PI); 
        
        const time = Date.now() / 100;
        const isRunning = p.dx !== 0 && p.grounded;
        const isJumping = !p.grounded;

        // Custom Idle Dance step rotation and vertical bumpy vibe!
        const isDancing = playerIdleTicksRef.current >= 240 && !p.isDead && !isRunning && !isJumping && gameMode !== 'racing';
        if (isDancing) {
          const danceBounce = Math.abs(Math.sin(Date.now() / 120)) * 6; // 6px bounce
          const danceAngle = Math.sin(Date.now() / 100) * 0.18; // slight tilting wave
          ctx.translate(0, -danceBounce);
          ctx.rotate(danceAngle);
        }

        const tilt = p.isDead ? 0 : p.dx * 0.05;
        if (!p.isDead && !isDancing) ctx.rotate(tilt);

        // Auto-scale context coordinates to match current Mushroom big / normal size!
        let scaleX = p.width / 44;
        let scaleY = p.height / 54;
        ctx.scale(scaleX, scaleY);

        // Superpower coloring & themes
        const isInvincible = p.starTimer && p.starTimer > 0;
        const rainbowColor = `hsl(${(Date.now() / 2) % 360}, 90%, 65%)`;
        const rainbowAccent = `hsl(${(Date.now() / 2 + 120) % 360}, 90%, 50%)`;

        const charConfig = CHARACTERS[charName] || CHARACTERS.aayu;

        let mainColor = charConfig.mainColor;
        let accentColor = charConfig.accentColor;
        let lowerColor = charConfig.lowerColor;
        let limbColor = charConfig.limbColor;
        let chestColor = charConfig.chestColor;

        if (isInvincible) {
          mainColor = rainbowColor;
          accentColor = rainbowAccent;
          lowerColor = rainbowColor;
          limbColor = rainbowAccent;
          chestColor = rainbowColor;
        } else if (p.powerUp === 'fire') {
          mainColor = "#ffffff";
          accentColor = "#ef4444"; 
          lowerColor = "#fee2e2";
          limbColor = "#b91c1c";
          chestColor = "#f97316";
        } else if (p.powerUp === 'ice') {
          mainColor = "#ffffff";
          accentColor = "#06b6d4"; 
          lowerColor = "#e0f2fe";
          limbColor = "#0284c7";
          chestColor = "#38bdf8";
        } else if (p.powerUp === 'mushroom') {
          mainColor = charConfig.mainColor; 
          accentColor = charConfig.accentColor; 
          lowerColor = charConfig.lowerColor; 
          limbColor = charConfig.limbColor;
          chestColor = "#eab308"; // Golden chest glow indicator on extra size
        } else if (p.powerUp === 'mini') {
          if (charName === "riu") {
            mainColor = charConfig.mainColor; 
            accentColor = charConfig.accentColor; 
            lowerColor = charConfig.lowerColor; 
            limbColor = charConfig.limbColor;
            chestColor = charConfig.chestColor;
          } else {
            mainColor = "#d8b4fe"; // Lavender top
            accentColor = "#a855f7"; // Royal purple helm halo/accents
            lowerColor = "#f3e8ff"; // Sweet light purple overalls
            limbColor = "#7e22ce"; // Deep violet boots/gloves
            chestColor = "#fb7185"; // Glowing neon mini rose core indicator!
          }
        }

        const isSwimming = activeLevel.theme === 'underwater';

        // 1. ARMS
        if (!p.isDead) {
          if (gameMode === 'racing') {
            // Steering Column & racing wheel console
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(6, 12);
            ctx.lineTo(10, 4);
            ctx.stroke();

            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.ellipse(10, 0, 2, 5, -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();

            // Cyber steering gripping limbs
            ctx.strokeStyle = limbColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-6, -2);
            ctx.lineTo(8, -1);
            ctx.stroke();
          } else {
            ctx.fillStyle = accentColor;
            if (isSwimming) {
              const swimCycle = (Date.now() / 160) % (Math.PI * 2);
              
              // Left Arm
              ctx.save();
              ctx.translate(-14, 0); // left shoulder pivot
              const leftSwimAngle = -Math.PI / 4.5 - Math.sin(swimCycle) * (Math.PI / 2.8);
              ctx.rotate(leftSwimAngle);
              ctx.beginPath();
              ctx.roundRect(-4, 0, 8, 22, [4]);
              ctx.fill();
              ctx.restore();

              // Right Arm
              ctx.save();
              ctx.translate(14, 0); // right shoulder pivot
              const rightSwimAngle = Math.PI / 4.5 + Math.sin(swimCycle) * (Math.PI / 2.8);
              ctx.rotate(rightSwimAngle);
              ctx.beginPath();
              ctx.roundRect(-4, 0, 8, 22, [4]);
              ctx.fill();
              ctx.restore();
            } else if (isJumping) {
              ctx.beginPath();
              ctx.roundRect(-26, -20, 8, 16, [4]);
              ctx.roundRect(18, -20, 8, 16, [4]);
              ctx.fill();
            } else {
              const armSwing = isRunning ? Math.sin(time) * 12 : 0;
              const isDancing = playerIdleTicksRef.current >= 240;
              const isWaving = playerIdleTicksRef.current >= 120 && !isDancing;

              if (isDancing) {
                // Raise both arms high and sway them back and forth in a super cute disco pose!
                ctx.save();
                ctx.translate(-14, 4); // Left shoulder pivot
                const leftDanceAngle = -Math.PI * 0.7 - Math.sin(Date.now() / 85) * 0.6;
                ctx.rotate(leftDanceAngle);
                ctx.beginPath();
                ctx.roundRect(-4, 0, 8, 16, [4]);
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.translate(14, 4); // Right shoulder pivot
                const rightDanceAngle = Math.PI * 0.7 + Math.cos(Date.now() / 85) * 0.6;
                ctx.rotate(rightDanceAngle);
                ctx.beginPath();
                ctx.roundRect(-4, 0, 8, 16, [4]);
                ctx.fill();
                ctx.restore();
              } else if (isWaving) {
                // Left hand/arm points normally downward
                ctx.beginPath();
                ctx.roundRect(-24, 5, 8, 14, [4]);
                ctx.fill();

                // Right arm raises near the head to wave excitedly at the screen!
                ctx.save();
                ctx.translate(20, 4); // Pivot shoulder
                const waveAngle = -Math.PI * 0.7 + Math.sin(Date.now() / 90) * 0.45;
                ctx.rotate(waveAngle);
                ctx.beginPath();
                ctx.roundRect(-4, 0, 8, 15, [4]);
                ctx.fill();
                ctx.restore();
              } else {
                ctx.beginPath();
                ctx.roundRect(-24, 5 + armSwing, 8, 14, [4]);
                ctx.roundRect(16, 5 - armSwing, 8, 14, [4]);
                ctx.fill();
              }
            }
          }
        }

        // 2. LEGS
        if (!p.isDead && gameMode !== 'racing') {
          ctx.fillStyle = limbColor;
          if (isSwimming) {
            const swimCycle = (Date.now() / 160) % (Math.PI * 2);
            const leftLegAngle = -0.15 - Math.sin(swimCycle + Math.PI / 2) * 0.25;
            const rightLegAngle = 0.15 + Math.sin(swimCycle + Math.PI / 2) * 0.25;

            ctx.save();
            ctx.translate(-8, 15); // Left hip pivot
            ctx.rotate(leftLegAngle);
            ctx.beginPath();
            ctx.roundRect(-5, 0, 10, 14, [4]);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.translate(8, 15); // Right hip pivot
            ctx.rotate(rightLegAngle);
            ctx.beginPath();
            ctx.roundRect(-5, 0, 10, 14, [4]);
            ctx.fill();
            ctx.restore();
          } else if (isJumping) {
            ctx.beginPath();
            ctx.roundRect(-16, 20, 10, 10, [4]);
            ctx.roundRect(6, 20, 10, 10, [4]);
            ctx.fill();
          } else {
            const legSwing = isRunning ? Math.sin(time) * 10 : 0;
            ctx.beginPath();
            ctx.roundRect(-16, 22 + (legSwing > 0 ? legSwing : 0), 12, 10, [4]);
            ctx.roundRect(4, 22 + (legSwing < 0 ? -legSwing : 0), 12, 10, [4]);
            ctx.fill();
          }
        }

        // 3. HEAD
        ctx.fillStyle = p.isDead ? "#94a3b8" : mainColor;
        ctx.beginPath(); ctx.roundRect(-22, -27, 44, 34, [20, 20, 10, 10]); ctx.fill();
        
        // Halo/Antenna
        ctx.strokeStyle = accentColor; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.ellipse(0, -25, 14, 6, 0, Math.PI, 0); ctx.stroke();
        
        // Side Panels
        ctx.fillStyle = accentColor; 
        ctx.beginPath(); ctx.ellipse(-22, -10, 6, 12, 0, 0, Math.PI * 2); ctx.ellipse(22, -10, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
        
        // Face Screen
        ctx.fillStyle = p.isDead ? "#334155" : "#0f172a"; 
        ctx.beginPath(); ctx.roundRect(-16, -20, 32, 20, [10]); ctx.fill();
        
        if (!p.isDead) {
          ctx.shadowBlur = 8; ctx.shadowColor = accentColor; ctx.fillStyle = mainColor;
          const look = p.dx * 0.3; 
          
          if (charName === "riu") {
            ctx.beginPath(); 
            ctx.arc(-8 + look, -10, 5, 0, Math.PI * 2); 
            ctx.arc(8 + look, -10, 5, 0, Math.PI * 2); 
            ctx.fill();
          } else {
            ctx.beginPath(); 
            ctx.ellipse(-8 + look, -10, 4, 6, 0, 0, Math.PI * 2); 
            ctx.ellipse(8 + look, -10, 4, 6, 0, 0, Math.PI * 2); 
            ctx.fill(); 
          }
          ctx.shadowBlur = 0;

          // Custom baby boy attributes for Riu
          if (charName === "riu") {
            ctx.fillStyle = "rgba(244, 63, 94, 0.5)"; 
            ctx.beginPath();
            ctx.arc(-11 + look, -5, 3.5, 0, Math.PI * 2);
            ctx.arc(11 + look, -5, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ec4899"; // pink shield
            ctx.beginPath();
            ctx.roundRect(-5 + look, -5, 10, 6, [3]);
            ctx.fill();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(look, -2, 2, 0, Math.PI * 2); // pacifier handle ring
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2; 
          ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-4, -6); ctx.moveTo(-4, -12); ctx.lineTo(-10, -6); ctx.stroke(); 
          ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(10, -6); ctx.moveTo(10, -12); ctx.lineTo(4, -6); ctx.stroke();
        }

        // 4. LOWER BODY
        if (gameMode === 'racing') {
          // Draw standard cozy torso sitting snugly inside the car
          ctx.fillStyle = lowerColor;
          ctx.beginPath();
          ctx.roundRect(-10, -8, 20, 18, [4]);
          ctx.fill();

          // Glowing reactor heart
          ctx.fillStyle = chestColor;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          // Sleek low-slung Wedge-shaped Formula Chassis
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.moveTo(-32, 14); // rear spoiler attachment point
          ctx.lineTo(-12, 6);  // back motor vents 
          ctx.lineTo(-4, 18);  // cockpit depth
          ctx.lineTo(12, 18);  // player footrest
          ctx.lineTo(28, 14);  // aerodynamic nose
          ctx.lineTo(34, 21);  // splitter plate
          ctx.lineTo(34, 24);  // front ground clearance lip
          ctx.lineTo(-32, 24); // flat ground underbelly
          ctx.closePath();
          ctx.fill();

          // Customize racing stripes & details
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-18, 10, 8, 3);
          ctx.fillStyle = chestColor;
          ctx.fillRect(16, 15, 8, 2);

          // 2. Cyber Racing Tires with spinning alloy spokes!
          const wheelCenters = [-18, 18];
          const wheelRadius = 9;
          const spinVelocity = (Date.now() / 50) * (p.dx !== 0 ? (p.dx > 0 ? 1.55 : -1.55) : 0.4);

          wheelCenters.forEach(wx => {
            // outer carbon tire
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(wx, 22, wheelRadius, 0, Math.PI * 2);
            ctx.fill();

            // inner rim alloy
            ctx.strokeStyle = chestColor;
            ctx.lineWidth = 1.8;
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            ctx.beginPath();
            ctx.arc(wx, 22, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // spinning spoke spokes to represent wheel motion
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(wx - Math.cos(spinVelocity)*4.5, 22 - Math.sin(spinVelocity)*4.5);
            ctx.lineTo(wx + Math.cos(spinVelocity)*4.5, 22 + Math.sin(spinVelocity)*4.5);
            ctx.moveTo(wx - Math.cos(spinVelocity + Math.PI/2)*4.5, 22 - Math.sin(spinVelocity + Math.PI/2)*4.5);
            ctx.lineTo(wx + Math.cos(spinVelocity + Math.PI/2)*4.5, 22 + Math.sin(spinVelocity + Math.PI/2)*4.5);
            ctx.stroke();
          });

          // 3. Aerodynamic Spoiler Wing
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-26, 14);
          ctx.lineTo(-24, 2);
          ctx.stroke();

          ctx.fillStyle = limbColor;
          ctx.beginPath();
          ctx.roundRect(-30, 0, 13, 4, [2]);
          ctx.fill();

          // Tail rocket flame exhaust ring!
          ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
          ctx.beginPath();
          ctx.arc(-34, 18, 3.5 + Math.sin(Date.now() / 40) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.isDead ? "#94a3b8" : lowerColor; 
          ctx.beginPath(); ctx.roundRect(-14, 5, 28, 18, [5, 5, 10, 10]); ctx.fill();
          
          // Chest Light
          ctx.fillStyle = p.isDead ? "#475569" : chestColor;
          ctx.beginPath();
          ctx.roundRect(-6, 10, 12, 6, [2]);
          ctx.fill();
        }

        // Floating rotating superstar orbital sparkles
        if (isInvincible) {
          const orbitRadius = 26;
          const starCount = 4;
          const angleOffset = Date.now() / 220;
          ctx.save();
          ctx.translate(0, -35); // above player's helmet antennae
          for (let i = 0; i < starCount; i++) {
            const angle = angleOffset + (i * Math.PI * 2) / starCount;
            const sx = Math.cos(angle) * orbitRadius;
            const sy = Math.sin(angle) * orbitRadius * 0.45;
            const starColor = `hsl(${(Date.now() / 2 + i * 90) % 360}, 100%, 65%)`;
            
            ctx.fillStyle = starColor;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 7);
            ctx.quadraticCurveTo(sx, sy, sx + 7, sy);
            ctx.quadraticCurveTo(sx, sy, sx, sy + 7);
            ctx.quadraticCurveTo(sx, sy, sx - 7, sy);
            ctx.quadraticCurveTo(sx, sy, sx, sy - 7);
            ctx.fill();
          }
          ctx.restore();
        }

        // Draw elegant player name tag above the helmet/antennae!
        if (!p.isDead) {
          ctx.save();
          // Remove scaling specifically for text so it is always crisp, un-skewed, and readable
          ctx.scale(1 / scaleX, 1 / scaleY);
          ctx.fillStyle = gameMode === 'racing' ? "#ffffff" : "rgba(30, 41, 59, 1)";
          ctx.font = "bold 8.5px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          
          const displayName = isP1 ? rescuerName.toUpperCase() : charConfig.name.toUpperCase() + " [CO-OP]";
          ctx.fillText(displayName, 0, -46 * scaleY);
          ctx.restore();
        }

        // Speech Bubble if Waving/Idle!
        const isWaving = playerIdleTicksRef.current >= 120;
        if (isWaving && !p.isDead && gameMode !== 'racing') {
          // Trigger speaking voice ONCE on entering the waving state
          if (!playerSpokenRef.current) {
            playerSpokenRef.current = true;
            
            // Get text to say
            let speakText = "Hi!";
            let voiceGender: 'male' | 'female' | 'baby' = 'male';

            if (charName === "aayu") {
              speakText = "Hi! Let's dash!";
              voiceGender = 'male';
            } else if (charName === "aaru") {
              speakText = "Hello! Ready for action?";
              voiceGender = 'male';
            } else if (charName === "rishu") {
              speakText = "Hey! Ready to seek coins?";
              voiceGender = 'male';
            } else if (charName === "aadi") {
              speakText = "Greetings, commander!";
              voiceGender = 'male';
            } else if (charName === "shau") {
              speakText = "Hi! Let's have fun!";
              voiceGender = 'female';
            } else if (charName === "riu") {
              speakText = "Hi!";
              voiceGender = 'baby';
            }
            
            // Trigger TTS voice with gender specification (Removed speak audio for robots - text bubble only)
            // audioEngine.speak(speakText, { gender: voiceGender });
          }

          // Render Speech Bubble above head!
          ctx.save();
          ctx.scale(1 / scaleX, 1 / scaleY); // Un-scaled coordinate system for crisp typography

          let bubbleText = "Hi! 🤖";
          const isDancing = playerIdleTicksRef.current >= 240;
          if (isDancing) {
            bubbleText = "Check out my sweet dances! 🎵🕺⚡";
          } else {
            if (charName === "aayu") bubbleText = "Hi! Let's dash! ⚡";
            if (charName === "aaru") bubbleText = "Hello! Ready for action? 🔥";
            if (charName === "rishu") bubbleText = "Hey! Ready to seek coins? 🌟";
            if (charName === "aadi") bubbleText = "Greetings, commander! 🚀";
            if (charName === "shau") bubbleText = "Haaai! Let's have fun! ✨";
            if (charName === "riu") bubbleText = "Gah gah! Hi! 🍼";
          }

          ctx.font = "bold 9.5px 'Fira Code', 'JetBrains Mono', monospace";
          const measure = ctx.measureText(bubbleText);
          const textW = measure.width;
          const bubbleW = textW + 16;
          const bubbleH = 20;
          const bx = -bubbleW / 2;
          
          // Draw bubble higher up so it clears the name tag completely
          const by = -78 * scaleY; 

          // Interactive floating breathe animation
          const breatheY = Math.sin(Date.now() / 150) * 2.5;
          ctx.translate(0, breatheY);

          // Shadow glow backing
          ctx.shadowBlur = 8;
          ctx.shadowColor = accentColor;

          // Round Rect Speech Bubble Background
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(bx, by, bubbleW, bubbleH, [6]);
          ctx.fill();
          ctx.stroke();

          // Clear shadows for crisp readable text rendering
          ctx.shadowBlur = 0;

          // Tiny speech pointer drawing sticking out of the bottom of the bubble, pointing to the robot's head!
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.moveTo(-6, by + bubbleH);
          ctx.lineTo(0, by + bubbleH + 6);
          ctx.lineTo(6, by + bubbleH);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-6, by + bubbleH);
          ctx.lineTo(0, by + bubbleH + 6);
          ctx.lineTo(6, by + bubbleH);
          ctx.stroke();

          // Draw the text inside bubble
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(bubbleText, 0, by + bubbleH / 2 + 0.5);

          ctx.restore();
        }

        ctx.restore();
      });
    };

    animationId = requestAnimationFrame(update);

    return () => {
      isLoopActiveRef.current = false;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [currentLevelIndex, gameState.isWin, gameState.isGameOver, gameState.lives, isStarted, selectedChar, gameMode]);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const gameComponent = (
    <div className={`relative overflow-hidden bg-sky-200 transition-all duration-300 ${
      isFullscreen 
        ? 'w-full h-full md:h-[85vh] md:max-h-[700px] md:aspect-[2/1] border-0 md:border-4 md:border-white/20 md:rounded-[2rem] shadow-none md:shadow-[0_0_50px_rgba(0,0,0,0.8)]' 
        : tvMode
          ? 'w-full aspect-[2/1] rounded-[2rem] shadow-[0_24px_60px_rgba(0,0,0,0.9)] border-[10px] md:border-[15px] border-neutral-800 bg-zinc-950 ring-2 ring-amber-900/30'
          : 'w-full aspect-[2/1] rounded-3xl shadow-2xl border-4 border-slate-900/10'
    } ${tvMode ? 'crt-frame' : ''}`}>
      {!isStarted ? (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-200 to-amber-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto select-none pointer-events-auto">
          {/* Subtle overlay elements for aesthetic (star fields / neon grids) */}
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(255,255,255,0.5)_0%,transparent_70%) pointer-events-none" />

          {/* Floating animated musical notes background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <span className="absolute text-pink-600/15 text-2xl font-bold animate-pulse" style={{ left: '12%', top: '35%', animationDuration: '4s' }}>🎵</span>
            <span className="absolute text-cyan-600/15 text-3xl font-bold animate-pulse" style={{ left: '88%', top: '22%', animationDuration: '6s' }}>🎶</span>
            <span className="absolute text-violet-600/15 text-xl font-bold animate-pulse" style={{ left: '48%', top: '15%', animationDuration: '3s' }}>🎼</span>
            <span className="absolute text-amber-600/15 text-2xl font-bold animate-pulse" style={{ left: '78%', top: '75%', animationDuration: '7s' }}>🎵</span>
            <span className="absolute text-indigo-605/15 text-3xl font-bold animate-pulse" style={{ left: '22%', top: '68%', animationDuration: '5s' }}>🎶</span>
          </div>

          {/* Top Line Header Bar */}
          <div className="w-full flex justify-between items-center z-10 text-[10px] sm:text-xs text-slate-600 font-bold">
            <span className="flex items-center gap-1.5 font-black uppercase text-amber-600 tracking-[0.15em] bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-1 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
              SAGA EDITION v1.2
            </span>
            <span className="font-mono text-slate-600 flex items-center gap-1.5 tracking-wider">
              {tvMode ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  CRT VINTAGE TV LIVE 📺
                </>
              ) : (
                "ARCADE READY 🕹️"
              )}
            </span>
          </div>

          {/* Hero & Title Center Area with Giga Robot Vibe Face-off (Centered vertical flow) */}
          <div className="flex flex-col items-center justify-center gap-6 my-auto z-10 w-full max-w-2xl px-4 text-center">
            {/* Top: Title content */}
            <div className="flex flex-col items-center text-center max-w-lg">
              <span className="text-[10px] uppercase font-black tracking-[0.3em] text-blue-700 mb-1.5">
                The Epic Platformer Saga
              </span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none uppercase select-none">
                <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent block transform -skew-x-3">SUPER AARYAN</span>
                <span className="text-slate-800 drop-shadow-[0_2px_4px_rgba(255,255,255,0.7)] block mt-0.5 tracking-wider text-2xl sm:text-3xl">ADVENTURE</span>
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold max-w-md bg-white/45 backdrop-blur-xs px-4 py-1.5 rounded-xl border border-white/20">
                Jump, shoot, dive through beautiful corals, dodge snapping red crabs, and defeat the giant Giga Robot Boss at the castle!
              </p>
            </div>

            {/* In Between: Awesome Center-Aligned Face-off Poster Graphics containing the Robot */}
            <div className="relative flex items-center justify-center w-72 h-48 sm:w-80 sm:h-52 md:w-[440px] md:h-[260px] select-none shrink-0 filter drop-shadow-[0_8px_30px_rgba(30,41,59,0.12)] bg-white/45 border border-white/60 p-2.5 rounded-3xl backdrop-blur-md">
              <svg viewBox="0 0 320 240" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                <defs>
                  <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="eyesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <linearGradient id="armorHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <radialGradient id="laserFlash" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffe4e6" />
                    <stop offset="40%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="laserImpact" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff1f2" />
                    <stop offset="50%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Sunshine in the background */}
                <circle cx="160" cy="50" r="30" fill="url(#sunGlow)" className="animate-pulse" />
                <circle cx="160" cy="50" r="14" fill="#fbbf24" />

                {/* Friendly clouds */}
                <path d="M 40 70 Q 50 55 65 60 Q 80 50 95 60 Q 110 55 115 70 Z" fill="#ffffff" opacity="0.9" />
                <path d="M 220 85 Q 230 73 243 77 Q 255 67 268 77 Q 278 73 282 85 Z" fill="#ffffff" opacity="0.9" />

                {/* Sand ground */}
                <path d="M -10 175 Q 100 160 200 180 T 330 175 L 330 240 L -10 240 Z" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2.5" />
                
                {/* Beach items */}
                <path d="M 120 170 L 122 163 L 125 170 L 128 161 L 131 170" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 190 173 L 192 166 L 195 173" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

                {/* DYNAMIC METALLIC ROBOT AVATAR (Full Body! not in half) based on selected character! */}
                <g transform="translate(100, 118)" className="animate-bounce" style={{ animationDuration: '2.5s' }}>
                  {/* Character shadow */}
                  <ellipse cx="0" cy="52" rx="16" ry="4" fill="rgba(120,113,108,0.22)" />
                  
                  {/* Legs */}
                  <rect x="-10" y="38" width="8" height="14" rx="3.5" fill={CHARACTERS[selectedChar].limbColor} stroke="#475569" strokeWidth="1" />
                  <rect x="2" y="38" width="8" height="14" rx="3.5" fill={CHARACTERS[selectedChar].limbColor} stroke="#475569" strokeWidth="1" />
                  
                  {/* Hip / Pelvis */}
                  <rect x="-13" y="24" width="26" height="15" rx="5" fill={CHARACTERS[selectedChar].lowerColor} stroke="#475569" strokeWidth="1" />
                  <rect x="-13" y="28" width="26" height="4" fill={CHARACTERS[selectedChar].limbColor} />
                  
                  {/* Body Torso */}
                  <rect x="-16" y="-6" width="32" height="31" rx="8" fill={CHARACTERS[selectedChar].mainColor} stroke="#475569" strokeWidth="1.5" />
                  {/* Glowing chest reactor */}
                  <circle cx="0" cy="10" r="7" fill={CHARACTERS[selectedChar].chestColor} />
                  <circle cx="0" cy="10" r="3" fill="#ffffff" className="animate-pulse" />
                  
                  {/* Left Arm (Relaxed) */}
                  <circle cx="-19" cy="2" r="4" fill={CHARACTERS[selectedChar].limbColor} />
                  <rect x="-23" y="2" width="6" height="15" rx="2" fill={CHARACTERS[selectedChar].limbColor} transform="rotate(15, -19, 2)" />
                  
                  {/* Robot Head shape */}
                  <rect x="-15" y="-36" width="30" height="26" rx="8" fill={CHARACTERS[selectedChar].mainColor} stroke="#475569" strokeWidth="1.5" />
                  
                  {/* Face plate screen */}
                  <rect x="-11" y="-30" width="22" height="11" rx="3.5" fill="#0f172a" />
                  {/* Glowing small eyes */}
                  <circle cx="-5" cy="-24" r="1.5" fill={CHARACTERS[selectedChar].accentColor} className="animate-pulse" />
                  <circle cx="5" cy="-24" r="1.5" fill={CHARACTERS[selectedChar].accentColor} className="animate-pulse" />
                  
                  {/* Antenna */}
                  <line x1="0" y1="-36" x2="0" y2="-44" stroke={CHARACTERS[selectedChar].accentColor} strokeWidth="2.5" />
                  <circle cx="0" cy="-44" r="3" fill={CHARACTERS[selectedChar].accentColor} />
                  <circle cx="0" cy="-44" r="5.5" fill={CHARACTERS[selectedChar].accentColor} opacity="0.35" className="animate-ping" style={{ animationDuration: '1.2s' }} />

                  {/* Right Arm (Extended Launcher Blaster Shooting Right) */}
                  <g transform="translate(13, 4)">
                    <circle cx="0" cy="0" r="4.5" fill={CHARACTERS[selectedChar].limbColor} />
                    <rect x="-1" y="-3" width="18" height="7" rx="2.5" fill={CHARACTERS[selectedChar].limbColor} />
                    <rect x="15" y="-6" width="10" height="12" rx="2" fill={CHARACTERS[selectedChar].accentColor} />
                    <rect x="25" y="-4" width="3" height="8" rx="1" fill="#f43f5e" />
                  </g>
                </g>

                {/* Animated Laser Shoot Chipped Beam and Particle Spray */}
                <g>
                  {/* Laser line to Evil Boss chest */}
                  <line x1="141" y1="122" x2="220" y2="122" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" opacity="0.3" className="animate-pulse" />
                  <line x1="141" y1="122" x2="220" y2="122" stroke="#ff7185" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Flash aura */}
                  <circle cx="141" cy="122" r="8" fill="url(#laserFlash)" />
                  <circle cx="220" cy="122" r="11" fill="url(#laserImpact)" />
                  
                  {/* Flying cute 8-bit digital dots */}
                  <g className="animate-pulse">
                    <circle cx="160" cy="122" r="4" fill="#f43f5e" />
                    <circle cx="160" cy="122" r="1.5" fill="#ffffff" />
                    
                    <circle cx="180" cy="122" r="4.5" fill="#38bdf8" />
                    <circle cx="180" cy="122" r="2" fill="#ffffff" />
                    
                    <circle cx="200" cy="122" r="4" fill="#fb7185" />
                    <circle cx="200" cy="122" r="1.5" fill="#ffffff" />
                  </g>
                </g>

                {/* Full Body Evil Robot Boss (Full Body! not in half) */}
                <g transform="translate(220, 92)" className="animate-bounce" style={{ animationDuration: '3.6s', transformOrigin: 'center' }}>
                  {/* Giant robot base shadow */}
                  <ellipse cx="0" cy="80" rx="20" ry="4" fill="rgba(15,23,42,0.18)" />
                  
                  {/* Heavy Mechanical Feet */}
                  <rect x="-18" y="64" width="13" height="16" rx="4.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  <rect x="5" y="64" width="13" height="16" rx="4.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  {/* Hip struts */}
                  <rect x="-11" y="52" width="22" height="12" rx="3.5" fill="#334155" stroke="#475569" strokeWidth="1" />
                  
                  {/* Main Heavy Body Unit */}
                  <rect x="-24" y="10" width="48" height="42" rx="9" fill="url(#bodyGrad)" stroke="#475569" strokeWidth="1.5" />
                  
                  {/* Armor Front Plate */}
                  <path d="M -18 16 L 18 16 L 14 36 L -14 36 Z" fill="url(#armorHighlight)" />
                  
                  {/* Danger Reactor Core */}
                  <circle cx="0" cy="30" r="8" fill="#ef4444" className="animate-pulse" />
                  <circle cx="0" cy="30" r="3" fill="#ffffff" />

                  {/* Left Menacing Hand Claws */}
                  <g transform="translate(-24, 18) rotate(-25)">
                    <rect x="-13" y="-3" width="14" height="6" rx="2" fill="#334155" />
                    <path d="M -13 -3 L -21 -6 L -17 0" stroke="#64748b" strokeWidth="1.8" fill="none" />
                  </g>
                  
                  {/* Right Heavy Blaster */}
                  <g transform="translate(24, 18) rotate(15)">
                    <rect x="0" y="-3" width="14" height="6" rx="2" fill="#334155" />
                    <circle cx="14" cy="0" r="3.5" fill="#e2e8f0" />
                    <path d="M 14 -3 Q 22 -8 18 -12" stroke="#ec4899" strokeWidth="2.2" fill="none" />
                  </g>

                  {/* Neck spacer */}
                  <rect x="-6" y="-2" width="12" height="12" fill="#334155" />

                  {/* Boss Head Unit */}
                  <rect x="-20" y="-32" width="40" height="30" rx="9" fill="url(#bodyGrad)" stroke="#475569" strokeWidth="1.5" />
                  <rect x="-16" y="-26" width="32" height="11" rx="2.5" fill="#0f172a" stroke="#1e293b" />
                  
                  {/* Glowing Laser Slit Visor */}
                  <polygon points="-12,-20 12,-20 8,-17 -8,-17" fill="url(#eyesGrad)" />
                  <circle cx="-1" cy="-19" r="1.5" fill="#fde047" className="animate-pulse" />

                  {/* Antennas */}
                  <line x1="0" y1="-32" x2="0" y2="-44" stroke="#ef4444" strokeWidth="2.5" />
                  <circle cx="0" cy="-44" r="3.5" fill="#ef4444" className="animate-pulse" />
                  <rect x="-23" y="-22" width="3" height="10" rx="1" fill="#334155" />
                  <rect x="20" y="-22" width="3" height="10" rx="1" fill="#334155" />
                </g>
              </svg>
            </div>

            {/* Bottom: Play controls and synth dashboard */}
            <div className="flex flex-col items-center w-full max-w-sm">
              {/* Franchise Spin-off Spreads Tab Row Selector */}
              <div className="w-full mb-3 select-none text-center">
                <span className="text-[9px] uppercase font-black tracking-widest text-indigo-750 block mb-1">
                  🎮 CHOOSE FRANCHISE GAME SPIN-OFF:
                </span>
                <div className="grid grid-cols-3 gap-1 bg-indigo-950/10 p-1 rounded-xl border border-indigo-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeriesGame('platformer');
                      audioEngine.playCoin();
                    }}
                    className={`py-1.5 px-1 rounded-lg font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      selectedSeriesGame === 'platformer'
                        ? "bg-slate-800 text-white shadow-xs scale-102 border-b-2 border-slate-950"
                        : "text-indigo-950 hover:text-indigo-800 hover:bg-white/40"
                    }`}
                  >
                    🏃‍♂️ PLATFORMER
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeriesGame('flappy');
                      audioEngine.playJump();
                    }}
                    className={`py-1.5 px-0.5 rounded-lg font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      selectedSeriesGame === 'flappy'
                        ? "bg-teal-600 text-white shadow-xs scale-102 border-b-2 border-teal-900"
                        : "text-teal-950 hover:text-teal-800 hover:bg-white/40"
                    }`}
                  >
                    🐥 FLAPPY GATE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeriesGame('space');
                      audioEngine.playCoin();
                    }}
                    className={`py-1.5 px-1 rounded-lg font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      selectedSeriesGame === 'space'
                        ? "bg-purple-600 text-white shadow-xs scale-102 border-b-2 border-purple-900"
                        : "text-purple-950 hover:text-purple-800 hover:bg-white/40"
                    }`}
                  >
                    🚀 SPACE BLAST
                  </button>
                </div>
              </div>

              {selectedSeriesGame === 'platformer' && (
                <>
                  {/* Episode Selection Slider (Classic vs Sequel) */}
                  <div className="w-full mb-2.5 select-none text-center">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 block mb-1">
                      SELECT ADVENTURE EPISODE:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-900/10 p-1 rounded-xl border border-white/40">
                      <button
                        type="button"
                        onClick={() => handleSelectSequelMode(false)}
                        className={`py-1.5 px-2 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          !isSequelMode
                            ? "bg-slate-800 text-white shadow-xs scale-102 border-b-2 border-slate-950"
                            : "text-slate-600 hover:text-slate-800 hover:bg-white/40"
                        }`}
                      >
                        Classic Part I
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSequelMode(true)}
                        className={`py-1.5 px-2 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          isSequelMode
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xs scale-102 border-b-2 border-indigo-900"
                            : "text-indigo-650 hover:text-indigo-800 hover:bg-white/40"
                        }`}
                      >
                        Cyber Part II {isCyberUnlocked ? "🔑" : "🔒"}
                      </button>
                    </div>
                  </div>

                  {/* Game Mode Selector (Story, Racing, Adventure) */}
                  <div className="w-full mb-2.5 select-none text-center">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 block mb-1">
                      SELECT GAME MODE:
                    </span>
                    <div className="grid grid-cols-6 gap-1 bg-slate-900/10 p-1 rounded-xl border border-white/40">
                      <button
                        type="button"
                        onClick={() => setGameMode('story')}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'story'
                            ? "bg-slate-800 text-white shadow-xs scale-102 border-b-2 border-slate-950"
                            : "text-slate-650 hover:text-slate-800 hover:bg-white/30"
                        }`}
                      >
                        📖 Story
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGameMode('racing');
                          alert("🏎️ RACING MODE ACTIVATED!\nCompete against RIVAL BOT 2.0. Cross the finish line first to win!");
                        }}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'racing'
                            ? "bg-rose-600 text-white shadow-xs scale-102 border-b-2 border-rose-900"
                            : "text-rose-700 hover:text-rose-900 hover:bg-white/30"
                        }`}
                      >
                        🏎️ Race
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGameMode('adventure');
                          alert("🧭 ADVENTURE MODE ACTIVATED!\nUnlocked Triple-Jumps & Dashing abilities across all zones!");
                        }}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'adventure'
                            ? "bg-amber-500 text-slate-950 shadow-xs scale-102 border-b-2 border-amber-700"
                            : "text-amber-700 hover:text-amber-950 hover:bg-white/30"
                        }`}
                      >
                        🧭 Explore
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGameMode('lava');
                          alert("🔥 FLOOR IS LAVA MODE ACTIVATED!\nLava rises from the bottom! Escape upward to checkpoints and flagpole before getting consumed!");
                        }}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'lava'
                            ? "bg-red-650 text-white shadow-xs scale-102 border-b-2 border-red-950 animate-pulse"
                            : "text-red-700 hover:text-red-950 hover:bg-white/30"
                        }`}
                      >
                        🔥 Lava
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGameMode('prison');
                          alert("👮 PRISON ESCAPE MODE ACTIVATED!\nAvoid rotating security spotlights! Triggering local alarms alerts active drones and speeds up surrounding guards!");
                        }}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'prison'
                            ? "bg-zinc-700 text-white shadow-xs scale-102 border-b-2 border-zinc-900"
                            : "text-zinc-700 hover:text-zinc-950 hover:bg-white/30"
                        }`}
                      >
                        🔒 Prison
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGameMode('spooky');
                          alert("👻 SPOOKY MANSION MODE ACTIVATED!\nWatch your back! Ghosts pursuing you hover and freeze whenever you turn around to face them!");
                        }}
                        className={`py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                          gameMode === 'spooky'
                            ? "bg-purple-600 text-white shadow-xs scale-102 border-b-2 border-purple-950"
                            : "text-purple-700 hover:text-purple-950 hover:bg-white/30"
                        }`}
                      >
                        👻 Spooky
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Rescuer Name Custom Input */}
              <div className="w-full mb-2.5 select-none text-center">
                <span className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-600 block mb-1">
                  Savior / Player Name:
                </span>
                <input
                  type="text"
                  maxLength={16}
                  value={rescuerName}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 14);
                    setRescuerName(clean);
                    try {
                      localStorage.setItem("sa_rescuer_name", clean || "Aaryan");
                    } catch (err) {}
                  }}
                  onBlur={() => {
                    if (!rescuerName.trim()) {
                      setRescuerName("Aaryan");
                      try {
                        localStorage.setItem("sa_rescuer_name", "Aaryan");
                      } catch (err) {}
                    }
                  }}
                  className="w-full h-8 px-3 rounded-lg bg-white border border-slate-250 text-center text-[10px] font-black text-slate-850 focus:border-indigo-400 focus:outline-hidden tracking-wider uppercase shadow-xs mb-1.5"
                  placeholder="ENTER YOUR NAME"
                />
              </div>

              {/* Character Selector Option (Multiple Characters Grid) */}
              <div className="w-full mb-3 select-none text-center">
                <span className="text-[9px] uppercase font-black tracking-[0.18em] text-cyan-700 block mb-1">
                  CHOOSE YOUR ROBOT CHARACTER:
                </span>
                <div className="grid grid-cols-6 gap-1 bg-slate-900/15 p-1 rounded-xl border border-white/40">
                  {Object.values(CHARACTERS).map((char) => {
                    const isSelected = selectedChar === char.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => {
                          setSelectedChar(char.id as any);
                          audioEngine.playCoin(); 
                        }}
                        className={`py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-1 border ${
                          isSelected
                            ? "bg-slate-800 text-white shadow-xs scale-102 border-indigo-500/50"
                            : "bg-white/40 border-transparent text-slate-700 hover:text-slate-905 hover:bg-white/70"
                        }`}
                        title={`Select ${char.name}`}
                      >
                        <span className="text-[9.5px] font-black tracking-tight uppercase leading-none">
                          {char.name}
                        </span>
                        <div 
                          className="w-2 h-2 rounded-full shadow-xs" 
                          style={{ backgroundColor: char.accentColor, border: `1px solid ${char.mainColor}` }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSeriesGame === 'platformer' && (
                <div className="w-full mb-3 select-none text-center">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 block mb-1">
                    STARTING LEVEL:
                  </span>
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLevelIndex((prev) => (prev > 0 ? prev - 1 : LEVELS.length - 1));
                        audioEngine.playJump();
                      }}
                      className="w-8 h-8 rounded-lg bg-white/75 border border-slate-200 text-slate-700 hover:bg-white hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer font-black text-xs shadow-xs"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTitleLevelSelect(true)}
                      className="px-3 h-8 rounded-lg bg-white border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-xs active:scale-98 transition flex items-center justify-between cursor-pointer grow select-none gap-2"
                    >
                      <span className="text-[11px] font-black text-slate-800 tracking-tight leading-none truncate max-w-[130px]">
                        {LEVELS[currentLevelIndex].name}
                      </span>
                      <span className="text-[8px] uppercase font-black text-indigo-600 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded shrink-0 leading-none">
                        Lvl {currentLevelIndex + 1}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLevelIndex((prev) => (prev < LEVELS.length - 1 ? prev + 1 : 0));
                        audioEngine.playJump();
                      }}
                      className="w-8 h-8 rounded-lg bg-white/75 border border-slate-200 text-slate-700 hover:bg-white hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer font-black text-xs shadow-xs"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              )}

              {/* Core Action Plays */}
              <div className="flex gap-2 items-center justify-center w-full mb-2">
                <button
                  onClick={() => startGame(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 border border-emerald-400/10 hover:scale-102"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Play Sound
                </button>
                
                <button
                  onClick={() => startGame(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 border border-white/5 hover:scale-102"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  Play Muted
                </button>
              </div>

              {/* Dynamic Interactive Cinematic Trailer Button */}
              <button
                type="button"
                onClick={() => {
                  setIsTrailerActive(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl mb-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(239,68,68,0.25)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border border-red-500/20 hover:scale-102 animate-pulse"
              >
                <span>🎬 WATCH ARCADE TEASER TRAILER</span>
              </button>

              {/* Retro Vintage Music Synthesizer on Title Poster with High-Fidelity WAV downloader */}
              <div className="w-full p-2.5 rounded-xl bg-white/65 border border-slate-200 flex items-center justify-between gap-2.5 text-left shadow-xs z-10 backdrop-blur-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <Music className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
                    {isExportingAudio && (
                      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] uppercase font-bold tracking-wider text-slate-500 block leading-none truncate">
                      BGM CODE: {LEVELS[currentLevelIndex].theme.toUpperCase()}
                    </span>
                    <span className="text-[7.5px] text-slate-400 block leading-none mt-1 font-semibold">
                      Procedural 8-Bit Acoustic Synth
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleDownloadTitleTheme}
                  disabled={isExportingAudio}
                  className="px-2 py-1.5 flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer active:scale-95 disabled:opacity-60 disabled:pointer-events-none select-none shadow-sm hover:shadow"
                  title="Synthesize and Download Title Theme (.wav)"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>{isExportingAudio ? "RECORDING..." : "DOWNLOAD BGM"}</span>
                </button>
              </div>
            </div>
          </div>



          {/* Bottom Controls / Creators Bar */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-center z-10 text-[9px] sm:text-[10px] text-slate-500 font-bold border-t border-white/5 pt-3 gap-2 mt-2">
            <div className="flex items-center gap-3">
              <span>KEYS: <kbd className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px]">A/D/🠔/🠖</kbd> Move</span>
              <span><kbd className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px]">SPACE</kbd> Jump</span>
              <span><kbd className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px]">SHIFT/F/E</kbd> Shoot</span>
            </div>
            <div className="text-slate-400 select-none uppercase tracking-wider">
              BY <span className="text-yellow-400 font-black">AARYAN MURTY</span> & <span className="text-yellow-400 font-black">AARAV BAVEJA</span>
            </div>
          </div>

          {/* Level selection modal overlay for Title Screen */}
          <AnimatePresence>
            {showTitleLevelSelect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 pointer-events-auto"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative w-full max-w-2xl max-h-[90%] bg-slate-900/95 border-2 border-indigo-500/40 rounded-[2rem] p-6 flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.25)]"
                >
                  <button
                    type="button"
                    onClick={() => setShowTitleLevelSelect(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Close warp menu"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-indigo-400 block pb-1">
                        SELECT STARTING REGION
                      </span>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                        Warp Regions ({LEVELS.length} Levels)
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 px-3 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                        FREE LEVEL WAPING (ALL UNLOCKED)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAllLevelsUnlocked(prev => !prev);
                          audioEngine.playCoin();
                        }}
                        className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 shrink-0 ${
                          allLevelsUnlocked ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            allLevelsUnlocked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable grid list of levels */}
                  <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0 select-none">
                    {LEVELS.map((lvl, index) => {
                      const isLvlLocked = allLevelsUnlocked
                        ? false
                        : index < 40 
                          ? (index > highestClassicUnlocked) 
                          : (!isCyberUnlocked || index > highestCyberUnlocked);

                      const isCurrent = index === currentLevelIndex;
                      const isBoss = lvl.id % 10 === 0;
                      const themeStyle = isLvlLocked
                        ? "opacity-40 border-slate-950 bg-slate-950/30 text-slate-500 cursor-not-allowed"
                        : isBoss ? "hover:border-red-500 text-red-100 border-red-950 bg-red-950/20" :
                          lvl.theme === "underwater" ? "hover:border-cyan-500 text-cyan-100 border-cyan-950 bg-cyan-950/20" :
                          lvl.theme === "jungle" ? "hover:border-emerald-500 text-emerald-100 border-emerald-950 bg-emerald-950/20" :
                          lvl.theme === "river" ? "hover:border-sky-500 text-sky-100 border-sky-950 bg-sky-950/20" :
                          lvl.theme === "beach" ? "hover:border-amber-500 text-amber-100 border-amber-950 bg-amber-950/20" :
                          lvl.theme === "desert" ? "hover:border-yellow-500 text-yellow-105 border-yellow-950 bg-yellow-950/20" :
                          lvl.theme === "island" ? "hover:border-teal-500 text-teal-100 border-teal-950 bg-teal-950/20" :
                          lvl.theme === "snowy" ? "hover:border-slate-300 text-slate-100 border-slate-700 bg-slate-700/20" :
                          lvl.theme === "mushroom" ? "hover:border-fuchsia-500 text-fuchsia-100 border-fuchsia-950 bg-fuchsia-950/20" :
                          lvl.theme === "lab" ? "hover:border-sky-400 text-sky-100 border-sky-950 bg-sky-950/20" :
                          lvl.theme === "zoo" ? "hover:border-lime-500 text-lime-100 border-lime-950 bg-lime-950/20" :
                          lvl.theme === "prison" ? "hover:border-neutral-400 text-neutral-100 border-neutral-700 bg-neutral-700/20" :
                          lvl.theme === "spooky" ? "hover:border-violet-500 text-violet-100 border-violet-950 bg-violet-950/20" :
                          lvl.theme === "pirate" ? "hover:border-sky-500 text-sky-100 border-sky-950 bg-sky-950/20" :
                          lvl.theme === "egypt" ? "hover:border-amber-650 text-amber-100 border-amber-950 bg-amber-950/20" :
                          lvl.theme === "park" ? "hover:border-green-500 text-green-100 border-green-950 bg-green-950/20" :
                          lvl.theme === "stadium" ? "hover:border-indigo-500 text-indigo-100 border-indigo-950 bg-indigo-950/20" :
                          lvl.theme === "space" ? "hover:border-purple-500 text-purple-100 border-purple-950 bg-purple-950/20" :
                          lvl.theme === "magma" ? "hover:border-red-650 text-red-100 border-red-950 bg-red-950/20" :
                          lvl.theme === "candy" ? "hover:border-pink-400 text-pink-100 border-pink-950 bg-pink-950/20" :
                          lvl.theme === "factory" ? "hover:border-zinc-400 text-zinc-100 border-zinc-950 bg-zinc-950/20" :
                          lvl.theme === "castle" ? "hover:border-slate-400 text-slate-100 border-slate-950 bg-slate-950/20" :
                          "hover:border-blue-500 text-blue-100 border-slate-800 bg-slate-800/20";

                      return (
                        <button
                          key={lvl.id || index}
                          type="button"
                          onClick={() => {
                            if (isLvlLocked) {
                              audioEngine.playStomp(); // buzzer tone
                              return;
                            }
                            setCurrentLevelIndex(index);
                            // Slices episode automatically during jump warping
                            setIsSequelMode(index >= 40);
                            setShowTitleLevelSelect(false);
                            audioEngine.playJump();
                          }}
                          className={`group p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all duration-150 cursor-pointer ${themeStyle} ${
                            isCurrent && !isLvlLocked
                              ? "ring-2 ring-yellow-400 border-yellow-400 hover:border-yellow-400 bg-yellow-400/10 text-yellow-300 font-extrabold"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              {isBoss ? "👑 BOSS" : `${lvl.theme}`} 
                              {isLvlLocked && "🔒"}
                            </span>
                            {isCurrent && !isLvlLocked && (
                              <span className="text-[9px] font-black bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full animate-pulse">
                                SELECTED
                              </span>
                            )}
                            {isLvlLocked && (
                              <span className="text-[8px] font-bold text-red-450 bg-red-950/45 px-1 py-0.2 rounded">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight line-clamp-1 text-white">
                            {lvl.name}
                          </span>
                          <span className="text-[9px] text-white/40 font-mono">
                            Level {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          <canvas 
            ref={canvasRef} 
            width={GAME_WIDTH} 
            height={GAME_HEIGHT} 
            className={`block ${isFullscreen ? 'w-full h-full object-contain bg-sky-950/20' : 'w-full h-full'}`} 
          />
          <HUD 
            score={
              selectedSeriesGame === 'flappy' 
                ? flappyScoreRef.current 
                : selectedSeriesGame === 'space' 
                  ? spaceScoreRef.current 
                  : gameState.score
            } 
            totalCoins={selectedSeriesGame === 'platformer' ? coinsRef.current.length : 0} 
            isWin={selectedSeriesGame === 'platformer' ? gameState.isWin : false} 
            isGameOver={
              selectedSeriesGame === 'flappy' 
                ? flappyIsGameOverRef.current 
                : selectedSeriesGame === 'space' 
                  ? spaceIsGameOverRef.current 
                  : gameState.isGameOver
            }
            lives={
              selectedSeriesGame === 'flappy' 
                ? 1 
                : selectedSeriesGame === 'space' 
                  ? spaceLivesRef.current 
                  : gameState.lives
            }
            onRestart={resetGame}
            levelName={
              selectedSeriesGame === 'flappy'
                ? "GATE DODGER INFINITE 🐥"
                : selectedSeriesGame === 'space'
                  ? "GALAXY BLASTER INSANITY 🚀"
                  : level.name
            }
            activePowerUp={selectedSeriesGame === 'platformer' ? playerRef.current.powerUp : 'normal'}
            starTimer={selectedSeriesGame === 'platformer' ? playerRef.current.starTimer : 0}
            characterName={CHARACTERS[selectedChar].name}
            onHome={handleHome}
            onSelectLevel={handleSelectLevel}
            currentLevelIndex={currentLevelIndex}
            levelsList={LEVELS}
            isPaused={isPaused}
            onTogglePause={togglePause}
            isSequelMode={selectedSeriesGame === 'platformer' ? isSequelMode : false}
            hasKey={selectedSeriesGame === 'platformer' ? keyCollected : false}
            isKeyRequired={selectedSeriesGame === 'platformer' ? isKeyRequired : false}
            dashCooldown={selectedSeriesGame === 'platformer' ? dashCooldown : 0}
            keyWarningTimer={selectedSeriesGame === 'platformer' ? keyWarning : 0}
            gameMode={selectedSeriesGame === 'platformer' ? gameMode : 'story'}
            playerX={playerRef.current.x}
            rivalX={rivalXRef.current}
            flagX={level.flagPole ? level.flagPole.x : 900}
            isCpuActive={isCpuActive}
            onToggleCpu={() => {
              setIsCpuActive(prev => !prev);
              audioEngine.playCheckpoint(); // retro select sound
            }}
            isLevelClear={isLevelClear}
            onNextLevel={() => {
              audioEngine.playCheckpoint();
              setIsLevelClear(false);
              
              // Synchronously reset player coordinates and velocities to prevent instant flagpole completion triggers
              playerRef.current.x = INITIAL_PLAYER.x;
              playerRef.current.y = INITIAL_PLAYER.y;
              playerRef.current.dx = 0;
              playerRef.current.dy = 0;
              playerRef.current.isDead = false;
              playerRef.current.hasKey = !isKeyRequired;
              wasStarActiveRef.current = false;
              playerRef.current.starTimer = 0;
              playerRef.current.shieldTimer = 0;

              if (currentLevelIndex < LEVELS.length - 1) {
                setCurrentLevelIndex(prev => prev + 1);
              } else {
                setGameState(prev => ({ ...prev, isWin: true }));
              }
            }}
            onCancelLevelClear={() => {
              audioEngine.playCheckpoint();
              setIsLevelClear(false);
              // Back the player up away from the flagpole so they do not instantly re-trigger the victory condition
              playerRef.current.x = Math.max(0, playerRef.current.x - 60);
            }}
          />

          {/* Glassmorphic Pause Overlay Menu */}
          <AnimatePresence>
            {isPaused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 text-white pointer-events-auto select-none"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 15 }}
                  transition={{ type: "spring", damping: 25, stiffness: 180 }}
                  className="w-full max-w-sm bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center animate-pulse">
                    <Pause className="w-8 h-8 font-black fill-blue-400" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white mb-1">
                      Adventure Paused
                    </h3>
                    <p className="text-xs text-slate-400">
                      Take a breath. Press <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-[10px]">P</kbd> or Escape to resume.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full mt-1">
                    <button
                      onClick={togglePause}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/10 cursor-pointer transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Resume Game
                    </button>
                    
                    <button
                      onClick={() => {
                        togglePause();
                        resetGame();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-white/5 transition active:scale-95"
                    >
                      Restart Level
                    </button>

                    <button
                      onClick={() => {
                        handleHome();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-rose-950 hover:bg-rose-900 active:bg-rose-950 text-rose-200 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-rose-500/20 transition active:scale-95 shadow-md"
                    >
                      <Home className="w-3.5 h-3.5 text-rose-450" />
                      Back to Home (Title Screen)
                    </button>

                    <div className="flex items-center gap-2 w-full mt-2 justify-center">
                      <button
                        onClick={() => setIsMuted(prev => !prev)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                          !isMuted ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-slate-800 border-white/5 text-slate-400'
                        }`}
                      >
                        {isMuted ? "Sound Off 🔇" : "Sound On 🎵"}
                      </button>
                      
                      <button
                        onClick={() => setControlsMode(prev => prev === 'computer' ? 'mobile' : 'computer')}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-white/5 text-slate-400 bg-slate-800 text-[10px] font-black uppercase tracking-wider hover:text-white transition cursor-pointer active:scale-95"
                      >
                        Mode: {controlsMode}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Mobile Controls overlay */}
          <AnimatePresence>
            {controlsMode === 'mobile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 pointer-events-none flex items-end justify-between p-4 sm:p-6 select-none z-10"
              >
                {/* D-Pad on bottom-left */}
                <div className="flex gap-2 pointer-events-auto pb-4">
                  <button
                    onTouchStart={startLeft}
                    onTouchEnd={stopLeft}
                    onTouchCancel={stopLeft}
                    onMouseDown={startLeft}
                    onMouseUp={stopLeft}
                    onMouseLeave={stopLeft}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/50 hover:bg-black/60 active:scale-90 select-none border border-white/20 shadow-2xl backdrop-blur-md flex items-center justify-center text-white cursor-pointer touch-none transition-all active:bg-blue-600/60"
                    aria-label="Walk Left"
                  >
                    <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                  <button
                    onTouchStart={startRight}
                    onTouchEnd={stopRight}
                    onTouchCancel={stopRight}
                    onMouseDown={startRight}
                    onMouseUp={stopRight}
                    onMouseLeave={stopRight}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/50 hover:bg-black/60 active:scale-90 select-none border border-white/20 shadow-2xl backdrop-blur-md flex items-center justify-center text-white cursor-pointer touch-none transition-all active:bg-blue-600/60"
                    aria-label="Walk Right"
                  >
                    <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                  <button
                    onTouchStart={startDown}
                    onTouchEnd={stopDown}
                    onTouchCancel={stopDown}
                    onMouseDown={startDown}
                    onMouseUp={stopDown}
                    onMouseLeave={stopDown}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-600/50 hover:bg-orange-600/75 active:scale-90 select-none border border-orange-400/40 shadow-[0_0_15px_rgba(249,115,22,0.3)] backdrop-blur-md flex flex-col items-center justify-center text-white cursor-pointer touch-none transition-all active:bg-orange-600/80"
                    aria-label="Enter Cave / Descend"
                    title="Enter Cave / Descend (S or Down)"
                  >
                    <ArrowDown className="w-6 h-6 sm:w-8 sm:h-8 text-orange-200" />
                    <span className="text-[6.5px] uppercase font-black tracking-tight leading-none mt-0.5 text-orange-200 whitespace-nowrap">Enter Cave</span>
                  </button>
                </div>

                {/* Jump and Action/Shoot buttons on bottom-right */}
                <div className="pointer-events-auto pb-4 flex items-center gap-2">
                  {(playerRef.current.powerUp === 'fire' || playerRef.current.powerUp === 'ice') && (
                    <button
                      onTouchStart={(e) => { e.preventDefault(); triggerShoot(); }}
                      onMouseDown={(e) => { e.preventDefault(); triggerShoot(); }}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${
                        playerRef.current.powerUp === 'fire'
                          ? 'bg-red-600/90 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] active:bg-red-500'
                          : 'bg-cyan-500/95 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)] active:bg-cyan-400'
                      } text-white flex items-center justify-center font-black text-xs uppercase select-none cursor-pointer touch-none transition-all hover:scale-105 active:scale-95`}
                      aria-label="Shoot Projectile"
                    >
                      Shoot
                    </button>
                  )}

                  <button
                    onTouchStart={triggerJump}
                    onMouseDown={triggerJump}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600/90 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] border-2 border-blue-400 select-none cursor-pointer touch-none transition-all"
                    aria-label="Jump"
                  >
                    <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Hero Savior & Unlocked Cinematic Overlay */}
      <AnimatePresence>
        {activeSavedHeroUnlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 pointer-events-auto select-none overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.88, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 25 }}
              className="relative w-full max-w-[480px] bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-yellow-400 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(234,179,8,0.25)] flex flex-col items-center text-center gap-3 border-double"
            >
              {/* Confetti floats */}
              <div className="absolute top-2 left-6 text-lg animate-bounce">🎈</div>
              <div className="absolute top-6 right-6 text-lg animate-pulse">🎉</div>
              <div className="absolute bottom-4 left-8 text-lg animate-pulse">✨</div>
              <div className="absolute bottom-8 right-8 text-lg animate-bounce">🥇</div>

              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xs shrink-0">
                🏆 MISSION COMPLISHED 🏆
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-yellow-400 uppercase tracking-tight leading-none shrink-0">
                HERO UNLOCKED!
              </h2>

              {/* Interactive Animated Cutscene Window */}
              <div id="interactive-cutscene" className="relative w-full h-32 bg-slate-950/95 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center gap-10">
                {/* Cyber grid background pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.15)_1px,transparent_1px)] bg-[size:10px_10px] animate-pulse"></div>
                
                {/* Savior Robot */}
                <motion.div 
                  animate={{ y: [0, -3, 0], rotate: [0, 2, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="flex flex-col items-center select-none"
                >
                  {/* Head of Savior */}
                  <div 
                    style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.mainColor || '#0ea5e9' }}
                    className="w-10 h-8 rounded-t-lg rounded-b-md relative border-2 border-slate-950 flex flex-col items-center justify-center p-0.5"
                  >
                    <div className="w-7 h-4 bg-slate-950 rounded-xs flex items-center justify-around">
                      <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.accentColor || '#38bdf8' }} className="w-1.5 h-1.5 rounded-full animate-ping"></div>
                      <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.accentColor || '#38bdf8' }} className="w-1.5 h-1.5 rounded-full animate-ping"></div>
                    </div>
                    <div style={{ borderColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.accentColor || '#38bdf8' }} className="absolute -top-1.5 w-4 h-1 border-t-2"></div>
                  </div>
                  {/* Torso of Savior */}
                  <div 
                    style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.lowerColor || '#e0f2fe' }}
                    className="w-8 h-6 rounded-b-md relative border-2 border-slate-950 mt-0.5 flex items-center justify-center"
                  >
                    <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.activeHeroId]?.chestColor || '#f59e0b' }} className="w-3 h-1.5 rounded-xs"></div>
                  </div>
                  <span className="text-[7px] font-black mt-1 text-cyan-400">HERO</span>
                </motion.div>

                {/* Epic Energy Break Beam spacer */}
                <div className="flex flex-col items-center justify-center gap-1 text-[11px] font-black text-indigo-400 animate-pulse">
                  <span>✨</span>
                  <span>⚡</span>
                  <span>✨</span>
                </div>

                {/* Rescued Robot running out of melting Cage! */}
                <motion.div 
                  animate={{ y: [0, -14, 0], scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1, repeatType: "reverse" }}
                  className="flex flex-col items-center select-none"
                >
                  {/* Exploding / melting cage bg */}
                  <div className="absolute opacity-20 text-yellow-500 font-extrabold text-sm animate-ping">🔓 BAM!</div>
                  
                  {/* Head of Rescued */}
                  <div 
                    style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.mainColor || '#ec4899' }}
                    className="w-10 h-8 rounded-t-lg rounded-b-md relative border-2 border-slate-950 flex flex-col items-center justify-center p-0.5"
                  >
                    <div className="w-7 h-4 bg-slate-950 rounded-xs flex items-center justify-around">
                      <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.accentColor || '#f43f5e' }} className="w-1.5 h-1.5 rounded-full animate-bounce"></div>
                      <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.accentColor || '#f43f5e' }} className="w-1.5 h-1.5 rounded-full animate-bounce"></div>
                    </div>
                    <div style={{ borderColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.accentColor || '#f43f5e' }} className="absolute -top-1.5 w-4 h-1 border-t-2"></div>
                  </div>
                  {/* Torso of Rescued */}
                  <div 
                    style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.lowerColor || '#fdf2f8' }}
                    className="w-8 h-6 rounded-b-md relative border-2 border-slate-950 mt-0.5 flex items-center justify-center"
                  >
                    <div style={{ backgroundColor: CHARACTERS[activeSavedHeroUnlock.unlockedHeroId]?.chestColor || '#10b981' }} className="w-3 h-1.5 rounded-xs"></div>
                  </div>
                  <span className="text-[7px] font-black mt-1 text-yellow-400 animate-pulse">RESCUED!</span>
                </motion.div>
              </div>

              {/* Heartfelt Rescuer Thank you message! */}
              <div className="bg-slate-950/70 border border-indigo-505/20 px-3.5 py-3 rounded-2xl text-left w-full max-w-sm">
                <span className="text-[7px] uppercase font-extrabold tracking-widest text-indigo-400 block mb-0.5">
                  OFFICIAL THANK YOU NOTE
                </span>
                <p className="text-[10px] text-slate-200 leading-relaxed font-semibold">
                  "Dear <span className="text-yellow-400 font-extrabold">{rescuerName.toUpperCase()}</span>,
                  <br />
                  Words cannot express our infinite gratitude! On Level {activeSavedHeroUnlock.level}, you risked your lives and guided <span className="text-cyan-400 font-black">{activeSavedHeroUnlock.activeHeroId.toUpperCase()}</span> with legendary skill to conquer the threat and break my heavy metal cell! 
                  <br />
                  <br />
                  Because you saved me, I am officially pledging my super-abilities to your squadron. Let's conquer the rest of this galaxy together!"
                  <br />
                  <span className="block text-right text-[9px] text-yellow-500 font-black mt-1">
                    — From {activeSavedHeroUnlock.unlockedHeroId.toUpperCase()}
                  </span>
                </p>
              </div>

              {/* Accept & Advance Button */}
              <button
                type="button"
                onClick={() => {
                  audioEngine.playCheckpoint();
                  if (currentLevelIndex < LEVELS.length - 1) {
                    setCurrentLevelIndex(prev => prev + 1);
                  } else {
                    setGameState(prev => ({ ...prev, isWin: true }));
                  }
                  setActiveSavedHeroUnlock(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md transition cursor-pointer active:scale-95 flex items-center justify-center gap-1 border border-yellow-300/30 font-bold"
              >
                🔓 Add {activeSavedHeroUnlock.unlockedHeroId.toUpperCase()} to Team & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "About Us" Cinematic Scrolling Credits Overlay */}
      <AnimatePresence>
        {isCreditsActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950 flex flex-col pointer-events-auto select-none text-white overflow-hidden p-4 sm:p-6"
          >
            {/* Cosmic star backgrounds */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,24,48,0.95)_0%,rgba(10,10,13,1)_100%)] pointer-events-none" />
            
            {/* Credits roll viewport */}
            <div className="flex-1 w-full flex flex-col items-center justify-start relative pt-4 overflow-hidden">
              {/* Spinning gold trophy */}
              <motion.div 
                animate={{ rotateY: 360 }} 
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="w-12 h-12 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full flex items-center justify-center border-2 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] mb-2 relative z-10 shrink-0"
              >
                <Trophy className="w-6 h-6 text-slate-950" />
              </motion.div>

              <h1 className="text-sm sm:text-base font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-150 to-amber-450 uppercase tracking-[0.2em] mb-2 relative z-10 shrink-0">
                🏆 CHAMPION CREATORS CREDITS 🏆
              </h1>

              {/* Autoscrolling credits board */}
              <div className="relative w-full max-w-sm flex-1 overflow-hidden h-[150px] sm:h-[180px] border border-white/5 bg-black/40 rounded-2xl p-4 flex flex-col justify-start">
                <motion.div
                  initial={{ y: 160 }}
                  animate={{ y: -390 }}
                  transition={{
                    duration: 18,
                    ease: "linear",
                    repeat: Infinity
                  }}
                  className="flex flex-col gap-6 text-center text-[10px] font-bold text-slate-300"
                >
                  <div>
                    <span className="text-[8px] uppercase font-black tracking-widest text-slate-550 block mb-0.5">THE WORLD SAVIOR HERO</span>
                    <span className="text-yellow-400 font-extrabold text-xs">{rescuerName.toUpperCase()}</span>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase font-black tracking-widest text-slate-550 block mb-0.5">CHIEF GAME DESIGNER</span>
                    <span className="text-indigo-400 font-black text-xs block leading-none">AARYAN MURTY</span>
                    <span className="text-slate-500 text-[8px] block mt-0.5">Level Designs & Progression Algorithms</span>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">TECHNICAL DIRECTOR</span>
                    <span className="text-sky-400 font-black text-xs block leading-none">AARAV BAVEJA</span>
                    <span className="text-slate-500 text-[8px] block mt-0.5">Physics Modeling & Canvas Core Renderers</span>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">8-BIT SYNTH MUSIC SOUND TRACKS</span>
                    <span className="text-pink-400 font-black text-xs block leading-none">Web Audio Node Synth API</span>
                    <span className="text-slate-500 text-[8px] block mt-0.5">Sequenced Theme Synthesizers</span>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase font-black tracking-widest text-slate-500 block mb-0.5">STORY & CODES</span>
                    <span className="text-emerald-400 font-black text-xs block leading-none">DeepMind Antigravity AI Agent</span>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-yellow-400 text-[10px] font-black uppercase tracking-wider block">THANK YOU FOR PLAYING!</span>
                    <p className="text-[8px] text-slate-500 max-w-xs mx-auto mt-0.5 leading-relaxed">
                      You completed all 80 episodes! Classic Part I and Cyber Part II are officially conquered.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Escape Credits Controls */}
              <div className="w-full max-w-sm flex gap-2 justify-center items-center py-2.5 bg-slate-950/70 z-10 backdrop-blur-xs shrink-0 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playCoin();
                    setIsCreditsActive(false);
                    setIsStarted(false); // return to title screen
                  }}
                  className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-[9px] tracking-wider uppercase border border-white/5 cursor-pointer active:scale-95 transition"
                >
                  ← TITLE MENU
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playCheckpoint();
                    // Reset all progress locks
                    setHighestClassicUnlocked(0);
                    setHighestCyberUnlocked(40);
                    setIsCyberUnlocked(false);
                    localStorage.setItem("sa_highest_classic_unlocked", "0");
                    localStorage.setItem("sa_highest_cyber_unlocked", "40");
                    localStorage.setItem("sa_cyber_unlocked", "false");
                    setIsCreditsActive(false);
                    setIsStarted(false);
                  }}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-650 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-[9px] tracking-wider uppercase shadow-sm cursor-pointer active:scale-95 transition"
                >
                  ↺ RESET PROGRESS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎬 HIGH-OCTANE INTERACTIVE RETRO ARCADE TRAILER THEATRE OVERLAY */}
      <AnimatePresence>
        {isTrailerActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950 flex flex-col pointer-events-auto select-none text-white overflow-hidden p-4 sm:p-5"
          >
            {/* Space Nebula Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(29,78,216,0.18)_0%,rgba(10,10,13,1)_100%)] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            {/* Header: Controls */}
            <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="p-0.5 px-1.5 rounded bg-red-650 text-white text-[8px] sm:text-[9px] font-black tracking-widest animate-pulse">ARCADE LIVE DEMO</span>
                <h2 className="text-xs font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                  SA RECKONING SPECIAL TEASER
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playCoin();
                  setIsTrailerActive(false);
                }}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[8px] sm:text-[9px] uppercase font-black tracking-wider transition cursor-pointer flex items-center gap-1.5 hover:scale-103 active:scale-95"
              >
                <span>SKIP TEASER ⤫</span>
              </button>
            </div>

            {/* Main Stage Panel mimicking a gorgeous CRT terminal screen */}
            <div className="flex-1 w-full max-w-4xl mx-auto rounded-2xl border-4 border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between p-3.5 bg-radial-gradient">
              {/* Progress timeline dots */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 relative z-20 pt-1 shrink-0">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const label = 
                    num === 0 ? "INVASION" :
                    num === 1 ? "CREATORS" :
                    num === 2 ? "CLASSIC" :
                    num === 3 ? "STRIKE" :
                    num === 4 ? "CYBERTRON" :
                    num === 5 ? "DECRYPT" :
                    num === 6 ? "RECRUIT" :
                    "THEATRE";
                  const isActive = trailerScene === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        audioEngine.playJump();
                        setTrailerScene(num);
                        const timerMarks = [0, 5, 10, 16, 22, 29, 36, 42];
                        setTrailerTimer(timerMarks[num]);
                      }}
                      className={`h-6 px-2 rounded-md flex flex-col items-center justify-center transition border ${
                        isActive 
                          ? "bg-red-650 border-red-500 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] font-bold scale-102" 
                          : "bg-slate-950/80 border-slate-850 hover:border-slate-500 text-slate-400 hover:text-white"
                      } cursor-pointer`}
                    >
                      <span className="text-[7px] font-mono leading-none tracking-tight block uppercase">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CENTER DISPLAY AREA */}
              <div className="flex-1 w-full flex items-center justify-center py-2 relative">
                <AnimatePresence mode="wait">
                  {trailerScene === 0 && (
                    <motion.div
                      key="scene0"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center gap-3 text-center max-w-xl px-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ repeat: Infinity, duration: 2.2 }}
                        className="text-yellow-405 font-extrabold text-[9px] tracking-[0.25em] uppercase"
                      >
                        ⚡ THREAT DETECTED ⚡
                      </motion.div>
                      <h1 className="text-xl sm:text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-rose-500 to-amber-500 tracking-tight leading-none">
                        COGNITIVE RECKONING
                      </h1>
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-red-500/25 max-w-sm">
                        <p className="text-xs font-mono text-cyan-400 leading-relaxed font-bold">
                          "IN A GALAXY OF COMPROMISED CIRCUITS..."
                        </p>
                        <p className="text-[10px] text-slate-350 leading-relaxed mt-2 font-semibold">
                          The final Overlord has injected viral bugs. All classic level sectors are locked!
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 1 && (
                    <motion.div
                      key="scene1"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="flex flex-col items-center justify-center gap-3 text-center"
                    >
                      <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">CHIEF GAME DESIGNERS</span>
                      <div className="flex gap-4 items-center">
                        <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-center min-w-[100px]">
                          <span className="text-xl">🤖</span>
                          <h3 className="text-[10px] font-black text-indigo-300 mt-0.5 uppercase">Aaryan Murty</h3>
                          <p className="text-[7px] text-slate-500 uppercase tracking-widest leading-none">Level Designs</p>
                        </div>
                        <span className="text-yellow-405 font-black text-xs">&</span>
                        <div className="p-2.5 bg-pink-950/40 border border-pink-500/20 rounded-xl text-center min-w-[100px]">
                          <span className="text-xl">⚡</span>
                          <h3 className="text-[10px] font-black text-pink-300 mt-0.5 uppercase">Aarav Baveja</h3>
                          <p className="text-[7px] text-slate-500 uppercase tracking-widest leading-none">Engine Model</p>
                        </div>
                      </div>
                      <p className="text-slate-300 text-[10px] font-mono leading-relaxed max-w-xs font-semibold">
                        "Two high-power specialists build the ultimate retro platforming environment!"
                      </p>
                    </motion.div>
                  )}

                  {trailerScene === 2 && (
                    <motion.div
                      key="scene2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full max-h-[170px] bg-sky-950/20 border border-cyan-500/20 rounded-2xl relative overflow-hidden flex flex-col justify-between p-2"
                    >
                      <div className="absolute top-1.5 left-2 text-[7px] font-mono font-black uppercase text-cyan-400 tracking-wider">
                        SIMULATION: COGNITIVE EPISODE I
                      </div>
                      <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[7px] font-mono text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        RUNNING DEMO
                      </div>

                      {/* Mock Gameplay Arena */}
                      <div className="flex-1 w-full relative flex items-center justify-center">
                        <div className="absolute bottom-3 inset-x-0 h-3 bg-emerald-900 border-t-2 border-emerald-500 flex items-center justify-around">
                          <div className="w-2.5 h-2.5 bg-amber-950 rounded-sm"></div>
                          <div className="w-2.5 h-2.5 bg-amber-950 rounded-sm"></div>
                        </div>

                        {/* Animated Hero character jumping */}
                        <motion.g
                          animate={{ 
                            x: [-100, -20, 20, 100, -100], 
                            y: [0, -25, 0, -25, 0] 
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 4, 
                            ease: "easeInOut" 
                          }}
                          className="absolute bottom-6 flex flex-col items-center"
                        >
                          <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] relative shadow-md">
                            <span>🤖</span>
                            <motion.span 
                              animate={{ y: [-8, -20], opacity: [0, 1, 0] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="absolute -top-3 text-[7px] text-yellow-300 font-extrabold"
                            >
                              🪙
                            </motion.span>
                          </div>
                        </motion.g>

                        {/* Simulated slimes */}
                        <div className="absolute bottom-4 right-10 w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center animate-bounce">
                          <span className="text-[5px]">😈</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/85 rounded-lg p-1.5 border border-slate-800 text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-cyan-300 block">CLASSIC LEVEL PLATFORMER</span>
                        <p className="text-[8px] text-slate-400 leading-none mt-0.5">Jump over slimes, bounce off ledges, and collect gold coins!</p>
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 3 && (
                    <motion.div
                      key="scene3"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center gap-2.5 text-center max-w-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500 text-red-500 flex items-center justify-center text-xl animate-bounce">
                        💀
                      </div>
                      <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">
                        🚨 TEAM MEMBERS TAKEN HOSTAGE 🚨
                      </h3>
                      <p className="text-[9.5px] text-slate-300 leading-relaxed font-semibold">
                        The Overlord lock-caged all squad warriors in metal cells! Only one remains to initiate rescue operations.
                      </p>
                      
                      <div className="grid grid-cols-4 gap-2 mt-1 shrink-0">
                        {['aayu', 'shau', 'riu'].map((c, i) => (
                          <div key={i} className="opacity-45 scale-90 border border-red-500/30 rounded-xl p-1 bg-red-950/10 text-center relative">
                            <span className="text-sm">🔒</span>
                            <span className="absolute -inset-0.5 border border-red-650/40 rounded-xl flex items-center justify-center text-[8px] font-black text-red-405 uppercase bg-black/55">LOCKED</span>
                          </div>
                        ))}
                        <div className="scale-100 border border-cyan-400 rounded-xl p-1 bg-cyan-950/20 text-center relative animate-pulse">
                          <span className="text-sm">🤖</span>
                          <span className="block text-[6px] font-bold text-cyan-400 mt-0.5">READY</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 4 && (
                    <motion.div
                      key="scene4"
                      initial={{ opacity: 0, x: 25 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -25 }}
                      className="w-full h-full max-h-[170px] bg-slate-900 border border-violet-500/20 rounded-2xl relative overflow-hidden flex flex-col justify-between p-2"
                    >
                      <div className="absolute top-1.5 left-2 text-[7px] font-mono font-black uppercase text-indigo-400 tracking-wider">
                        SIMULATION: COGNITIVE EPISODE II (SEQUEL)
                      </div>
                      <div className="absolute top-1.5 right-2 flex items-center gap-1.5 text-[7px] font-mono text-yellow-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        SEQUEL MODE
                      </div>

                      {/* Mock Cyber arena */}
                      <div className="flex-1 w-full relative flex items-center justify-center">
                        <div className="absolute top-[40px] left-6 w-16 h-1.5 bg-indigo-950 border-t border-indigo-400" />
                        <div className="absolute bottom-[30px] right-6 w-16 h-1.5 bg-indigo-950 border-t border-indigo-400" />
                        
                        {/* Springs */}
                        <div className="absolute bottom-[30px] right-14 w-6 h-2 bg-emerald-500 border border-emerald-300 rounded" />

                        {/* Animated Hero dashing in air with cyan spark trails */}
                        <motion.g
                          animate={{ 
                            x: [-60, 20, 20, -60], 
                            y: [20, -10, 20, 20],
                            scale: [1, 1.15, 1, 1]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 3.5, 
                            ease: "easeInOut" 
                          }}
                          className="absolute flex flex-col items-center"
                        >
                          <div className="w-4.5 h-4.5 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-[10px] relative shadow-lg">
                            <span>🤖</span>
                            <span className="absolute -left-2 top-0 text-[8px] text-cyan-400 leading-none">~~</span>
                          </div>
                        </motion.g>
                      </div>

                      <div className="bg-slate-950/85 rounded-lg p-1.5 border border-slate-800 text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-[#818cf8] block leading-none">DOUBLE JUMP & MECHANICAL SPRING SPRINTS</span>
                        <p className="text-[8px] text-slate-400 mt-0.5">Execute dual-leap actions, custom dashes, and green spring launches!</p>
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 5 && (
                    <motion.div
                      key="scene5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-2.5 text-center max-w-sm"
                    >
                      <motion.div 
                        animate={{ rotateY: 360 }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        className="w-10 h-10 bg-gradient-to-r from-yellow-405 to-amber-500 rounded-xl flex items-center justify-center border border-yellow-350 shadow-md"
                      >
                        <span className="text-xl">🔑</span>
                      </motion.div>
                      <div>
                        <h3 className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                          DECRYPT COGNITIVE LOCK GATES!
                        </h3>
                        <p className="text-[9px] text-slate-300 mt-1 leading-relaxed">
                          Levels are sealed under lock cages! Retrieve the decryptor physical key to clear blockages and warp safely.
                        </p>
                      </div>
                      <div className="w-full bg-slate-950/80 p-2 rounded-xl border border-white/5 flex items-center justify-around shrink-0 max-w-xs">
                        <div className="text-center">
                          <span className="text-[10px]">🔐</span>
                          <span className="text-[6.5px] text-red-400 font-bold uppercase block mt-0.5">LOCKED</span>
                        </div>
                        <span className="text-yellow-400 text-[10px] font-bold">➔</span>
                        <div className="text-center">
                          <span className="text-[10px]">🗝️</span>
                          <span className="text-[6.5px] text-yellow-450 font-bold uppercase block mt-0.5">FOUND</span>
                        </div>
                        <span className="text-yellow-400 text-[10px] font-bold">➔</span>
                        <div className="text-center">
                          <span className="text-[10px]">🔓</span>
                          <span className="text-[6.5px] text-emerald-400 font-bold uppercase block mt-0.5">WARPED</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 6 && (
                    <motion.div
                      key="scene6"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center gap-2 text-center w-full max-w-md"
                    >
                      <span className="text-[8px] font-black tracking-widest text-[#a855f7] uppercase leading-none">TEAM CONSTRUCT</span>
                      <h3 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-400 uppercase leading-none">
                        ASSEMBLE THE REBEL SQUAD
                      </h3>
                      <p className="text-[9px] text-slate-350 leading-relaxed font-semibold">
                        Clear sectors to burst cages! Recruit trapped characters, incorporating advanced custom vectors!
                      </p>

                      <div className="grid grid-cols-4 gap-2 w-full mt-1">
                        {[
                          { id: 'aayu', name: 'Aayu', role: 'DASH UNIT', icon: '🤖' },
                          { id: 'shau', name: 'Shau', role: 'HEAVY BOT', icon: '🧱' },
                          { id: 'riu', name: 'Riu', role: 'LASER GALAXY', icon: '⚡' },
                          { id: 'dev', name: 'Dev', role: 'RESCUER CORE', icon: '👑' }
                        ].map((hero, i) => (
                          <div key={i} className="bg-slate-950/60 border border-violet-500/20 rounded-xl p-1.5 flex flex-col items-center">
                            <span className="text-lg animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>{hero.icon}</span>
                            <span className="text-[8px] font-black text-white mt-0.5 uppercase block leading-none">{hero.name}</span>
                            <span className="text-[6px] text-indigo-400 font-mono tracking-wider uppercase block mt-0.5">{hero.role}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {trailerScene === 7 && (
                    <motion.div
                      key="scene7"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex flex-col items-center justify-center gap-3 text-center max-w-xl px-2"
                    >
                      <div className="bg-gradient-to-r from-yellow-405 to-orange-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md">
                        🎬 TEASER FINALE 🎬
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-550">
                        SUPER AARYAN ADVENTURE
                      </h1>
                      <div className="bg-slate-950/95 border border-yellow-405/40 p-2.5 rounded-xl w-full max-w-sm mt-0.5 text-slate-300 font-mono text-[9px] text-left">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <div>
                            <span className="text-[6.5px] text-slate-500 block leading-none">TOTAL SECTORS</span>
                            <span className="text-[10px] text-white font-extrabold">80 SECURED SCENES</span>
                          </div>
                          <div>
                            <span className="text-[6.5px] text-slate-500 block leading-none">ROSTER RECRUITS</span>
                            <span className="text-[10px] text-yellow-400 font-extrabold">4 COMPANION BOTS</span>
                          </div>
                          <div>
                            <span className="text-[6.5px] text-slate-500 block leading-none">CREATED BY</span>
                            <span className="text-[10px] text-cyan-405 font-bold truncate">M. AARYAN & B. AARAV</span>
                          </div>
                          <div>
                            <span className="text-[6.5px] text-slate-500 block leading-none">DECIBEL DESIGN</span>
                            <span className="text-[10px] text-pink-400 font-extrabold">8-BIT SYNTHS</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playCheckpoint();
                          setIsTrailerActive(false);
                          setIsSequelMode(true);
                          setCurrentLevelIndex(40);
                          startGame(true);
                        }}
                        className="w-full max-w-xs py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-white font-black text-[10px] uppercase tracking-wider shadow-lg transition cursor-pointer active:scale-95 flex items-center justify-center gap-1 border border-emerald-400/20 hover:scale-102"
                      >
                        🚀 START PLAYING CYBER SEQUEL NOW 🚀
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FOOTER DESCRIPTIVE CAPTION */}
              <div className="relative z-20 mt-1 p-2 rounded-xl bg-slate-950/80 border border-slate-850 flex items-center justify-between gap-2.5 shrink-0">
                <div className="text-left flex-1 min-w-0">
                  <span className="text-[6.5px] font-mono uppercase font-black tracking-widest text-[#a855f7] block leading-none">
                    TEASER VOICE DESCRIPTION • SCENE {trailerScene}/7
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-200 mt-0.5 font-semibold leading-tight block truncate sm:whitespace-normal">
                    {trailerScene === 0 && `“In a compromised galaxy, the Cognitive Overlord has injected errors inside the level sectors...”`}
                    {trailerScene === 1 && `“Uniting core architects Aaryan Murty and Aarav Baveja to map a state-of-the-art physics simulation!”`}
                    {trailerScene === 2 && `“Conquer the classic side-scroller worlds, collect golden coins, and face legendary platforming challenges!”`}
                    {trailerScene === 3 && `“But catastrophe strikes! All team squads are locked into mechanical grid blocks.”`}
                    {trailerScene === 4 && `“Witness the high-octane Cyber Part II sequel: Double Jumps, Dash speedways, and high-bounce Springpads!”`}
                    {trailerScene === 5 && `“Search for the missing decryptor key in each sector to unlock secure gate portals to proceed!”`}
                    {trailerScene === 6 && `“Rescue kidnapped heroes and unlock their powerful capabilities in your squadron roster!”`}
                    {trailerScene === 7 && `“The cosmic stage is set for the ultimate 8-bit conquest. Can you conquer all 80 sectors?”`}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 z-20 select-none">
                  <div className="text-[8px] font-mono text-cyan-405 leading-none bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                    ⏱️ {trailerTimer}s
                  </div>
                  
                  {/* Action Navigation Buttons */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playCoin();
                        setTrailerScene(0);
                        setTrailerTimer(0);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-855 hover:bg-slate-800 text-[7px] uppercase font-black tracking-wider transition cursor-pointer leading-none"
                    >
                      RESET ↺
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playJump();
                        setTrailerScene(prev => (prev < 7 ? prev + 1 : 0));
                        const timerMarks = [0, 5, 10, 16, 22, 29, 36, 42];
                        const nextSceneIndex = trailerScene < 7 ? trailerScene + 1 : 0;
                        setTrailerTimer(timerMarks[nextSceneIndex]);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-emerald-400 text-[7px] uppercase font-black tracking-wider transition cursor-pointer leading-none"
                    >
                      NEXT ➔
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyber Locked Episode Warning Dialog */}
      <AnimatePresence>
        {lockedCyberPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 pointer-events-auto select-none"
          >
            <motion.div
              initial={{ scale: 0.88, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 15 }}
              className="w-full max-w-sm bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3.5 text-center text-white"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse">
                <Lock className="w-6 h-6 text-indigo-400" />
              </div>

              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-yellow-405 leading-none">
                  ⚠️ Episode II Locked
                </h3>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  CYBER PART II is locked until you complete the final boss of Classic Part I (Level 40).
                </p>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <button
                  onClick={() => {
                    audioEngine.playCoin();
                    setLockedCyberPrompt(false);
                  }}
                  className="w-full py-2 rounded-lg bg-indigo-650 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer transition active:scale-95"
                >
                  🔒 Play Classic Pt I
                </button>
                
                <button
                  onClick={() => {
                    audioEngine.playCheckpoint();
                    // Cheat Override bypass!
                    setIsCyberUnlocked(true);
                    localStorage.setItem("sa_cyber_unlocked", "true");
                    setLockedCyberPrompt(false);
                    // Automatically load Episode II starting level (Level 41, index 40)
                    setIsSequelMode(true);
                    setCurrentLevelIndex(40);
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-emerald-400 text-[10px] font-black uppercase tracking-wider cursor-pointer border border-white/5 transition active:scale-95 flex items-center justify-center gap-1 font-bold"
                >
                  🔓 DEV CHEAT BYPASS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Absolute Overlays for CRT retro TV mode */}
      {tvMode && (
        <>
          <div className="absolute inset-0 pointer-events-none crt-scanlines z-[45]" />
          <div className="absolute inset-0 pointer-events-none crt-roll z-[46]" />
          <div className="absolute inset-0 pointer-events-none crt-vignette z-[47]" />
          <div className="absolute inset-0 pointer-events-none crt-glare z-[48]" />
        </>
      )}
    </div>
  );

  // If in immersive full-screen wrapper mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col justify-center items-center select-none font-sans overflow-hidden">
        {/* Sleek, space-saving floating overlays inside Fullscreen mode to free up 100% of display height */}
        <div className="absolute top-4 left-4 z-[100000] hidden sm:flex items-center gap-3 backdrop-blur-md bg-slate-900/60 border border-white/10 px-4 py-2 rounded-2xl pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Super Aaryan Adventure</span>
          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">{level.name}</span>
        </div>

        {/* Level badge for extra small phone screens */}
        <div className="absolute top-4 left-4 z-[100000] flex sm:hidden items-center backdrop-blur-md bg-slate-900/60 border border-white/10 px-3 py-1.5 rounded-xl pointer-events-none">
          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">{level.name}</span>
        </div>

        {/* Compact quick-access controller panel overlay on top right */}
        <div className="absolute top-4 right-4 z-[100000] flex items-center gap-2">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
              !isMuted ? 'bg-green-600/90 border-green-500 text-white' : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden leading-none xs:inline ml-1">{isMuted ? "" : "SFX"}</span>
          </button>
          
          <button
            onClick={() => setControlsMode(prev => prev === 'computer' ? 'mobile' : 'computer')}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 transition cursor-pointer flex items-center justify-center text-xs font-bold uppercase tracking-wider backdrop-blur-md"
            title="Toggle Controls"
          >
            {controlsMode === 'mobile' ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            <span className="hidden leading-none xs:inline ml-1">{controlsMode === 'mobile' ? "Keys" : "Touch"}</span>
          </button>

          <button
            onClick={() => setTvMode(prev => !prev)}
            className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
              tvMode ? 'bg-indigo-600/95 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] animate-pulse' : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
            title="Toggle Retro CRT TV Mode"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden leading-none xs:inline ml-1">{tvMode ? "CRT On" : "CRT Off"}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center justify-center p-2 rounded-xl bg-red-600/95 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer backdrop-blur-md border border-red-500"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden leading-none xs:inline ml-1">Exit</span>
          </button>
        </div>

        {/* Immersive Game Canvas Frame */}
        <div className="w-full h-full flex items-center justify-center relative p-0">
          {gameComponent}
        </div>

        {/* Dynamic Rotation Helper Hint for mobile players */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none flex flex-col items-center gap-1 text-center bg-slate-950/80 backdrop-blur-sm px-4 py-2 border border-white/5 rounded-2xl animate-bounce md:hidden">
          <p className="text-[10px] font-black text-yellow-400">🔄 Landscape Mode Recommended</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1000px] gap-5">
      {/* 1. Immersive Game Canvas (Positioned at the top for maximum visibility) */}
      {gameComponent}

      {/* 2. Controls Mode Switcher & Features Bar (Moved from top to here) */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-3">
        <div className="flex items-center justify-between md:justify-start gap-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Selected Controller
            </span>
          </div>
          <div className="bg-slate-150/80 p-0.5 rounded-xl border border-slate-200/50 flex items-center gap-0.5">
            <button
              onClick={() => setControlsMode('computer')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                controlsMode === 'computer' 
                  ? 'bg-white text-slate-900 shadow-sm scale-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Computer
            </button>
            <button
              onClick={() => setControlsMode('mobile')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                controlsMode === 'mobile' 
                  ? 'bg-white text-blue-600 shadow-sm scale-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile Controls
            </button>
          </div>
        </div>

        {/* Music and Fullscreen Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-stretch md:justify-end">
          {/* Global Volume Slider */}
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs transition-all ${
            isMuted 
              ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60' 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800'
          }`}>
            {isMuted || globalVolume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="text-[9px] font-black uppercase tracking-wider select-none shrink-0">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={isMuted}
              value={isMuted ? 0 : globalVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setGlobalVolume(vol);
                audioEngine.setVolume(vol);
              }}
              className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none disabled:cursor-not-allowed"
              title={isMuted ? "Muted" : `Volume: ${Math.round(globalVolume * 100)}%`}
            />
            <span className="font-mono text-[9px] w-8 text-right font-bold shrink-0">
              {isMuted ? "0%" : `${Math.round(globalVolume * 100)}%`}
            </span>
          </div>

          <button
            onClick={() => setIsMuted(prev => !prev)}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-150 cursor-pointer ${
              !isMuted 
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 shadow-[0_0_12px_rgba(34,197,94,0.15)] animate-pulse' 
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title={isMuted ? "Unmute Retro Synth BGM & SFX" : "Mute Sound"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-red-500" />
                Sound Off
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-green-600 animate-bounce" />
                Sound On 🎵
              </>
            )}
          </button>
          
          <button
            onClick={() => setTvMode(prev => !prev)}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-150 cursor-pointer ${
              tvMode 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.15)] ring-2 ring-indigo-400/20' 
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Toggle Vintage CRT TV Scanlines & Bezel"
          >
            <Tv className={`w-4 h-4 ${tvMode ? 'text-indigo-600 animate-pulse' : 'text-slate-500'}`} />
            {tvMode ? "TV Mode On" : "TV Mode Off"}
          </button>
          
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer shadow-md"
            title="Enter Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}

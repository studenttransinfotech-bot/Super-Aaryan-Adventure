import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Coins, Heart, AlertCircle, Zap, Sparkles, Home, LayoutGrid, X, Pause, Play, Key, Lock } from "lucide-react";

interface HUDProps {
  score: number;
  totalCoins: number;
  isWin: boolean;
  isGameOver: boolean;
  lives: number;
  levelName: string;
  onRestart: () => void;
  activePowerUp?: 'normal' | 'mushroom' | 'fire' | 'ice' | 'mini';
  starTimer?: number;
  characterName?: string;
  onHome?: () => void;
  onSelectLevel?: (index: number) => void;
  currentLevelIndex?: number;
  levelsList?: any[];
  isPaused?: boolean;
  onTogglePause?: () => void;
  // Sequel properties
  isSequelMode?: boolean;
  hasKey?: boolean;
  isKeyRequired?: boolean;
  dashCooldown?: number;
  keyWarningTimer?: number;
  // Game Modes stats
  gameMode?: 'story' | 'racing' | 'adventure' | 'lava' | 'prison' | 'spooky';
  playerX?: number;
  rivalX?: number;
  flagX?: number;
  // CPU Companion Buddy trigger
  isCpuActive?: boolean;
  onToggleCpu?: () => void;
  // Level victory prompt
  isLevelClear?: boolean;
  onNextLevel?: () => void;
  onCancelLevelClear?: () => void;
}

export default function HUD({ 
  score, 
  totalCoins, 
  isWin, 
  isGameOver, 
  lives, 
  onRestart, 
  levelName, 
  activePowerUp, 
  starTimer,
  characterName,
  onHome,
  onSelectLevel,
  currentLevelIndex = 0,
  levelsList = [],
  isPaused = false,
  onTogglePause,
  // Destructure sequel items with defaults
  isSequelMode = false,
  hasKey = false,
  isKeyRequired = false,
  dashCooldown = 0,
  keyWarningTimer = 0,
  // Game Modes defaults
  gameMode = 'story',
  playerX = 100,
  rivalX = 100,
  flagX = 900,
  isCpuActive = false,
  onToggleCpu,
  isLevelClear = false,
  onNextLevel,
  onCancelLevelClear
}: HUDProps) {
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  
  const isDashReady = dashCooldown <= 0;
  const dashPercentage = Math.max(0, Math.min(100, Math.round(((35 - dashCooldown) / 35) * 100)));

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none p-4 sm:p-6 flex flex-col justify-between">
      {/* Universal Dynamic Level Progress Bar */}
      <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 bg-slate-950/95 border border-white/10 px-4 py-2 rounded-2xl pointer-events-auto flex flex-col gap-1.5 w-64 sm:w-80 shadow-[0_4px_24px_rgba(0,0,0,0.7)] select-none">
        <div className="flex justify-between items-center text-[9px] font-black tracking-widest font-mono">
          <span className="text-cyan-400">🤖 {characterName || 'BOT'}</span>
          <span className="text-white/70">
            {Math.max(0, Math.round(flagX - playerX)) > 0 ? `${Math.max(0, Math.round(flagX - playerX))}M LEFT` : '🏁 GOAL REACHED!'}
          </span>
          <span className="text-rose-400">🏁 GOAL</span>
        </div>
        
        <div className="relative w-full h-2.5 bg-slate-900/95 rounded-full border border-slate-800 overflow-visible">
          {/* Animated Glow Highlight on filled track */}
          <div 
            style={{ width: `${Math.max(0, Math.min(100, (playerX / flagX) * 100))}%` }}
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ease-out ${
              gameMode === 'lava' 
                ? 'bg-gradient-to-r from-orange-600 via-red-500 to-yellow-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
            }`}
          />

          {/* Micro ticking marker for player */}
          <div 
            style={{ left: `${Math.max(0, Math.min(94, (playerX / flagX) * 100))}%` }} 
            className="absolute -top-1.5 -ml-1.5 w-5.5 h-5.5 rounded-full bg-slate-900 border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.8)] text-xs z-10 transition-all duration-75 ease-out"
          >
            {activePowerUp === 'mini' ? '👶' : '🤖'}
          </div>

          {/* Rival marker (only in racing mode) */}
          {gameMode === 'racing' && (
            <div 
              style={{ left: `${Math.max(0, Math.min(94, (rivalX / flagX) * 100))}%` }} 
              className="absolute -top-1.5 -ml-1.5 w-5.5 h-5.5 rounded-full bg-slate-950 border border-rose-500 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.8)] text-xs z-10 transition-all duration-75 ease-out"
            >
              🏎️
            </div>
          )}
        </div>
      </div>

      {/* HUD Top bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={levelName}
              className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 inline-flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">{levelName}</span>
            </motion.div>

            {/* Game Mode Pill Indicator */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`backdrop-blur-md border px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1 shadow-md ${
                gameMode === 'racing' ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' :
                gameMode === 'adventure' ? 'bg-amber-950/80 border-amber-500/40 text-amber-300' :
                gameMode === 'lava' ? 'bg-red-950/90 border-red-500/60 text-red-100 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]' :
                gameMode === 'prison' ? 'bg-zinc-900/90 border-zinc-500/60 text-zinc-300 shadow-[0_0_12px_rgba(100,116,139,0.4)]' :
                gameMode === 'spooky' ? 'bg-purple-950/90 border-purple-500/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]' :
                'bg-slate-950/80 border-slate-700/40 text-slate-300'
              }`}
            >
              <span>{gameMode === 'racing' ? '🏎️' : gameMode === 'adventure' ? '🧭' : gameMode === 'lava' ? '🔥' : gameMode === 'prison' ? '🔒' : gameMode === 'spooky' ? '👻' : '📖'}</span>
              <span>{gameMode === 'adventure' ? 'EXPLORE' : gameMode === 'lava' ? 'FLOOR IS LAVA' : gameMode === 'prison' ? 'PRISON ESCAPE' : gameMode === 'spooky' ? 'SPOOKY MANSION' : gameMode.toUpperCase()}</span>
            </motion.div>

            {isSequelMode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
              >
                <span>🚀</span>
                <span>EPISODE II ACTIVE</span>
              </motion.div>
            )}

            {characterName && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-950/70 backdrop-blur-md border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"
              >
                <span>🤖</span>
                <span>{characterName}</span>
              </motion.div>
            )}

            {activePowerUp && activePowerUp !== 'normal' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                key={'p1-'+activePowerUp}
                className={`hidden sm:inline-flex bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest items-center gap-1.5 ${
                  activePowerUp === 'mushroom' ? 'border-orange-500 text-orange-400' :
                  activePowerUp === 'mini' ? 'border-fuchsia-500 text-fuchsia-400 font-bold animate-pulse' :
                  activePowerUp === 'fire' ? 'border-red-500 text-red-500 animate-pulse' :
                  'border-cyan-400 text-cyan-400 animate-pulse'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{activePowerUp === 'mini' ? 'mini bot' : activePowerUp}</span>
              </motion.div>
            )}

            {starTimer && starTimer > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-400 text-yellow-400 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 animate-bounce"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Invincible ({Math.ceil(starTimer / 60)}s)
              </motion.div>
            ) : null}
          </div>

          <div className="hidden sm:flex flex-wrap gap-2">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-3 w-fit shadow-md"
            >
              <div className="bg-yellow-400 p-1.5 rounded-full shadow-lg">
                <Coins className="w-5 h-5 text-yellow-905" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold leading-none mb-0.5">Coins</span>
                <span className="text-xl font-black text-white leading-tight">
                  {score} <span className="text-white/40">/ {totalCoins}</span>
                </span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-3 w-fit shadow-md"
            >
              <div className="bg-red-500 p-1.5 rounded-full shadow-lg">
                <Heart className={`w-5 h-5 text-white ${lives === 1 ? 'animate-bounce' : ''}`} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold leading-none mb-0.5">Lives</span>
                <span className="text-xl font-black text-white leading-tight">
                  {lives}
                </span>
              </div>
            </motion.div>

            {/* Sequel-specific stats: Custom Key collection state & Dash state */}
            {isSequelMode && (
              <>
                {isKeyRequired && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`backdrop-blur-md px-4 py-2 rounded-2xl border flex items-center gap-3 w-fit shadow-lg transition-all duration-300 ${
                      hasKey 
                        ? 'bg-amber-950/60 border-amber-400/80 text-amber-200 animate-pulse' 
                        : 'bg-black/50 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full shadow-md ${hasKey ? 'bg-amber-400 text-yellow-950' : 'bg-slate-800 text-slate-500'}`}>
                      <Key className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest font-bold leading-none mb-0.5 text-white/50">GATE KEY</span>
                      <span className="text-xs font-black uppercase leading-tight">
                        {hasKey ? 'UNLOCKED' : 'REQUIRED'}
                      </span>
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`backdrop-blur-md px-4 py-2 rounded-2xl border flex items-center gap-3 w-fit shadow-lg transition-all duration-300 ${
                    isDashReady 
                      ? 'bg-cyan-950/60 border-cyan-400/80 text-cyan-200' 
                      : 'bg-black/50 border-white/10 text-slate-400'
                  }`}
                >
                  <div className={`p-1.5 rounded-full shadow-md ${isDashReady ? 'bg-cyan-400 text-cyan-950 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold leading-none mb-0.5 text-white/50">CYBER DASH</span>
                    <span className="text-xs font-black uppercase leading-tight">
                      {isDashReady ? 'READY (Shift)' : `RECHARGING (${dashPercentage}%)`}
                    </span>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Ultra-sleek, non-intrusive metadata pill bar for mobile devices */}
          <div className="flex sm:hidden items-center gap-2.5 text-white font-black text-[10px] font-mono bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 pointer-events-none mt-1 shadow-md">
            <span className="text-red-400">❤️ {lives}</span>
            <span className="w-px h-2.5 bg-white/20" />
            <span className="text-yellow-405">🪙 {score}</span>
            {isSequelMode && isKeyRequired && (
              <>
                <span className="w-px h-2.5 bg-white/20" />
                <span className={hasKey ? "text-amber-400 animate-pulse font-extrabold" : "text-white/40"}>
                  🔑 {hasKey ? "KEY ONBOARD" : "KEY REQ"}
                </span>
              </>
            )}
            {isSequelMode && (
              <>
                <span className="w-px h-2.5 bg-white/20" />
                <span className={isDashReady ? "text-cyan-400 font-extrabold animate-pulse" : "text-white/40"}>
                  ⚡ {isDashReady ? "DASH OK" : `${dashPercentage}%`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2.5">


            <button
              type="button"
              onClick={() => {
                const audio = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audio) {
                  const osc = audio.createOscillator();
                  const gain = audio.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(880, audio.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(1200, audio.currentTime + 0.15);
                  gain.gain.setValueAtTime(0.01, audio.currentTime); // very soft/safe volume!
                  gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.15);
                  osc.connect(gain);
                  gain.connect(audio.destination);
                  osc.start();
                  osc.stop(audio.currentTime + 0.15);
                }

                const element = document.createElement("a");
                const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offline Super Aaryan Adventure</title>
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 50px 20px;
    }
    .card {
      background: #0f172a;
      border: 2px solid #38bdf8;
      border-radius: 20px;
      padding: 30px;
      max-width: 500px;
      margin: 0 auto;
      box-shadow: 0 10px 30px rgba(56, 189, 248, 0.2);
    }
    h1 { color: #38bdf8; margin-top: 0; }
    p { line-height: 1.6; }
    .btn {
      display: inline-block;
      background: #38bdf9;
      color: #0f172a;
      padding: 12px 24px;
      text-decoration: none;
      font-weight: bold;
      border-radius: 10px;
      margin-top: 15px;
      transition: background 0.2s;
    }
    .btn:hover { background: #7dd3fc; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Super Aaryan Adventure</h1>
    <p>Your game download package is prepared successfully! This local build package installs directly on any computer or Android phone for 100% offline gameplay.</p>
    <a href="${window.location.origin}" class="btn">LAUNCH STANDALONE OFFLINE PORTAL</a>
  </div>
</body>
</html>`;
                const file = new Blob([pageHtml], { type: 'text/html' });
                element.href = URL.createObjectURL(file);
                element.download = "SuperAaryanAdventure-Offline.html";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-cyan-950/95 hover:bg-cyan-900 text-cyan-205 hover:text-white border border-cyan-500/40 transition cursor-pointer flex items-center gap-1 text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95"
              title="DownloadStandalone offline phone HTML5 installer package"
            >
              <span>📲</span>
              <span>Install Offline</span>
            </button>

            {onTogglePause && (
              <button
                onClick={onTogglePause}
                className={`px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 ${
                  isPaused 
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white animate-pulse' 
                    : 'bg-slate-950/90 hover:bg-slate-800 border-slate-700/60 text-slate-100 hover:text-white'
                }`}
                title={isPaused ? "Resume Adventure (P)" : "Pause Adventure (P)"}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-white text-white" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}

            {onHome && (
              <button
                onClick={onHome}
                className="px-3.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 hover:text-white border border-rose-500/40 transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
                title="Back to Title Screen (Hotkey: H)"
              >
                <Home className="w-4 h-4 text-rose-450 animate-pulse" />
                <span>Home</span>
              </button>
            )}

            {onSelectLevel && levelsList && levelsList.length > 0 && (
              <button
                onClick={() => setShowLevelSelect(prev => !prev)}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-100 hover:text-white border border-indigo-500/40 transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95"
                title="Warp Select Level Menu (Hotkey: L)"
              >
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <span>Levels</span>
              </button>
            )}
          </div>

          <h1 className="text-white font-black text-lg sm:text-2xl drop-shadow-lg uppercase tracking-tighter leading-none hidden sm:block">
            {isSequelMode ? "Super Aaryan Adventure II" : "Super Aaryan Adventure"}
          </h1>
          <p className="text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest drop-shadow-md hidden sm:block">
            {isSequelMode ? "EPISODE II: CYBERTRON RECKONING" : "Murty x Baveja"}
          </p>
        </div>
      </div>

      {/* Center slots & Warning overlays */}
      <div className="flex-1 flex flex-col justify-end items-center pointer-events-none w-full">
        <AnimatePresence>
          {isSequelMode && keyWarningTimer && keyWarningTimer > 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -15 }}
              className="bg-red-950/95 border-2 border-red-500/80 text-red-200 px-6 py-3 rounded-2xl flex items-center gap-2.5 shadow-[0_0_24px_rgba(239,68,68,0.5)] tracking-wide pointer-events-auto shrink-0 mb-4 animate-pulse"
            >
              <Lock className="w-5 h-5 text-red-400" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                🔒 GATE PADLOCKED! COLLECT THE KEY FIRST! 🔑
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isLevelClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-slate-950/90 backdrop-blur-md z-40"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border-4 border-emerald-500 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center max-w-sm w-full mx-4"
            >
              <div className="bg-emerald-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-emerald-400">
                <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-400 block mb-1">
                Episode Completed!
              </span>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-1">
                Level {currentLevelIndex + 1}
              </h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-6 italic">
                "{levelName}"
              </p>

              {/* Score breakdown metrics stats */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 text-left flex flex-col gap-2 mb-6">
                <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-300">
                  <span>🏅 SCORE IN LEVEL</span>
                  <span className="font-extrabold text-emerald-400 font-mono text-xs">{score} PTS</span>
                </div>
                <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-300">
                  <span>🔋 LIVES REMAINING</span>
                  <span className="font-extrabold text-amber-400">{lives} x ♥</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                {onNextLevel && (
                  <button
                    onClick={onNextLevel}
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 py-3 sm:py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 shadow-[0_4px_16px_rgba(52,211,153,0.35)] cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Next level</span>
                    <span>➔</span>
                  </button>
                )}
                
                <button
                  onClick={onRestart}
                  className="w-full bg-slate-805 hover:bg-slate-800 text-slate-300 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 border border-slate-705/50 cursor-pointer transition"
                >
                  ↻ Replay Level
                </button>

                {onCancelLevelClear && (
                  <button
                    onClick={onCancelLevelClear}
                    className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-300 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 cursor-pointer transition"
                    title="Dismiss victory screen and stay on this level"
                  >
                    ✕ Cancel & Stay on Level
                  </button>
                )}

                {onHome && (
                  <button
                    onClick={() => {
                      if (onCancelLevelClear) {
                        onCancelLevelClear();
                      }
                      onHome();
                    }}
                    className="w-full bg-rose-950/95 hover:bg-rose-900/90 border border-rose-800/50 text-rose-200 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 cursor-pointer transition flex items-center justify-center gap-1.5 mt-1"
                    title="Quit to Main Menu"
                  >
                    <Home className="w-3.5 h-3.5 text-rose-400" />
                    <span>Quit to Main Menu</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-8 border-yellow-400"
            >
              <div className="bg-yellow-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trophy className="w-12 h-12 text-yellow-600" />
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Victory!</h2>
              <p className="text-slate-500 font-medium mb-8">You've conquered all 22 levels!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={onRestart}
                  className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wide hover:bg-slate-800 transition-colors shadow-xl active:scale-95 transform cursor-pointer"
                >
                  Legendary Restart
                </button>
                {onHome && (
                  <button
                    onClick={onHome}
                    className="w-full sm:w-auto bg-rose-950 hover:bg-rose-900 text-rose-100 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wide border border-rose-500/30 transition active:scale-95 transform cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Home className="w-4 h-4 text-rose-450" />
                    Return to Home
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-red-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-center border-8 border-red-500 overflow-hidden relative"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
              <div className="bg-red-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-500/30">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Game Over</h2>
              <p className="text-slate-400 font-medium mb-8">The robot needs repairs!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={onRestart}
                  className="w-full sm:w-auto bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wide hover:bg-red-600 transition-colors shadow-xl active:scale-95 transform cursor-pointer"
                >
                  Try Again
                </button>
                {onHome && (
                  <button
                    onClick={onHome}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wide border border-white/5 transition active:scale-95 transform cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Home className="w-4 h-4 text-rose-450" />
                    Return to Home
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLevelSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85%] bg-slate-900/95 border-2 border-indigo-500/40 rounded-[2rem] p-6 flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.25)]"
            >
              <button
                onClick={() => setShowLevelSelect(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close warp menu"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-indigo-400 block">
                  FAST WARP LEVEL SELECTION
                </span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  Warp Regions ({levelsList?.length || 50} Levels)
                </h3>
              </div>

              {/* Scrollable grid list of levels */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0 select-none">
                {levelsList?.map((lvl, index) => {
                  const isCurrent = index === currentLevelIndex;
                  const isBoss = lvl.id % 10 === 0;
                  const themeStyle =
                    isBoss ? "hover:border-red-500 text-red-100 border-red-950 bg-red-950/20" :
                    lvl.theme === "underwater" ? "hover:border-cyan-500 text-cyan-100 border-cyan-950 bg-cyan-950/20" :
                    lvl.theme === "jungle" ? "hover:border-emerald-500 text-emerald-100 border-emerald-950 bg-emerald-950/20" :
                    lvl.theme === "river" ? "hover:border-sky-500 text-sky-100 border-sky-950 bg-sky-950/20" :
                    lvl.theme === "beach" ? "hover:border-amber-500 text-amber-100 border-amber-950 bg-amber-950/20" :
                    "hover:border-blue-500 text-blue-100 border-slate-800 bg-slate-800/20";

                  return (
                    <button
                      key={lvl.id || index}
                      onClick={() => {
                        if (onSelectLevel) onSelectLevel(index);
                        setShowLevelSelect(false);
                      }}
                      className={`group p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all duration-150 cursor-pointer ${themeStyle} ${
                        isCurrent
                          ? "ring-2 ring-yellow-400 border-yellow-400 hover:border-yellow-400 bg-yellow-400/10 text-yellow-300 font-extrabold"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          {isBoss ? "👑 BOSS" : `${lvl.theme}`}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full animate-pulse">
                            ACTIVE
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
  );
}

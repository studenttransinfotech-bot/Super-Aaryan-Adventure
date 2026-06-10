# 🎮 Super Aaryan Adventure

Welcome to **Super Aaryan Adventure**! A high-octane, feature-rich retro-inspired action platformer built with cutting-edge web technologies (React, Vite, Tailwind CSS, Framer Motion) and driven by a robust custom real-time Web Audio synthesizer.

Explore over 50 levels of cybernetic challenges, dive into Pipeline zones, and experience incredibly responsive side-scrolling platforming mechanics right in your browser!

---

## ✨ Features

*   **Three Distinct Game Modes**:
    *   📖 **Story Mode**: Embark on a grand progression across uniquely themed worlds with progressive difficulty.
    *   ⏱️ **Racing Mode**: Face the ultimate clock! Optimize your routes, dash through narrow gaps, and beat your personal records.
    *   🗺️ **Adventure Mode**: Open-ended layout exploration with unrestricted level designs.
*   **Custom Synthesizer Dynamic Audio Engine**:
    *   No external heavy MP3/WAV files! Every sound effect (SFX) and background music (BGM) track is synthesized in real-time in your browser using the Web Audio API.
    *   **Thematic Audio Styling**:
        *   🌊 **Underwater Levels**: Immersive, high-energy syncopated tropical accordion & ragtime bassline inspired by *Super Mario Sunshine's Delfino Plaza*!
        *   🏰 **Magma & Castle**: Menacing, heavy sinister organ marches using spooky minor scales.
        *   🧪 **Factory & Lab**: Tech-forward mechanical loops and bubbly digital soundscapes.
        *   🏡 **Village, Farm & Zoo**: Cozy folk walks, rustic country barn dances, and hopping safari cartoon grooves.
        *   ❄️ **Snowy & Sky**: Dreamy cloud breezes, high winds, and sparkly winter glacier bells.
*   **Highly Responsive Mechanics**:
    *   Fluid jumping, dual-leap double jumps, and precise control physics.
    *   **High-Tech Dash**: Bullet-speed horizontal air-dashes that project glowing cyan electron trail particle splashes.
    *   Enemies can be stomped, secret blocks can be bumped, and glowing key collectibles trigger physical gateway portals.
*   **Visual Highlights**:
    *   Dynamic Day-to-Night transitions.
    *   Stunning Framer Motion menu, overlay, and HUD animations.
    *   Real-time customized canvas rendering with flexible aspect-ratio bounds.

---

## 🛠️ Technology Stack

*   **Frontend Library**: [React 18](https://react.dev/)
*   **Build Utility**: [Vite](https://vite.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Animations**: [Motion/React](https://motion.dev/) (Framer Motion)
*   **Synthesizer Engine**: Standard Web Audio API Oscillator nodes (triangle, sine, square waves)
*   **Canvas Rendering**: HTML5 Canvas with custom particle and camera engines

---

## 🚀 Setting Up Locally

To run the game on your local development server or set up your own modifications:

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd super-aaryan-adventure
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development environment
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** (or the port specified in your console) to view the game in your browser!

### 4. Build for Production
To bundle the optimized static client files under `/dist`:
```bash
npm run build
```

---

## 🎮 How to Play

*   **Move Left / Right**: `A` / `D` or `ArrowLeft` / `ArrowRight`
*   **Jump / Double Jump**: `Space`, `W` or `ArrowUp`
*   **Dash ⚡**: Left `Shift` or press the interactive Dash button (performs a dash in your current facing direction!)
*   **Interact / Pipeline Enter**: `S` or `ArrowDown` inside pipeline segments.

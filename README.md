# OUTPOST COMMANDER
### Lunar Mission Control & Junior Astronaut Training Simulator
**NASA Space Apps Challenge 2026 — Category: Build a Junior Astronaut Mission Trainer**

*Every Decision Determines the Future of Your Lunar Outpost.*

---

## Overview

**OUTPOST COMMANDER** is an educational lunar mission control simulation and astronaut training experience set near the Moon's South Pole (Shackleton Crater rim). Designed for students, educators, and space challenge evaluators, it combines accessible turn-based decision making with authentic lunar physics, closed-loop life support engineering, and verified NASA planetary datasets.

---

## Key Features

### 1. 13-Second Judge Quick Test (Instant Evaluation)
- Immediate interactive power-crisis simulation: micrometeoroid damage on Sol 1 creates an electrical deficit.
- Three real operational decisions:
  1. *Prioritize Life Support* (protects O₂/water, defers science).
  2. *Preserve Battery Power* (sheds non-essential buses, sustains power reserves).
  3. *Continue Scientific Operations* (maximizes research output at elevated crew risk).
- Real simulation engine execution showing exact before/after physics.
- **Flawless Continuity**: Clicking **EXPLORE FULL MISSION** transitions directly into Mission Day 2, retaining all exact resources, research points, and crisis outcomes.

### 2. Junior Astronaut Cadet Mode
- Interactive, non-intrusive science checkpoints on Days 1, 3, 5, and 7:
  - **Day 1**: Solar Ridge Siting (quasi-continuous polar illumination).
  - **Day 3**: Closed-Loop ECLSS (water recovery, CO₂ scrubbing, electrolysis).
  - **Day 5**: Regolith Radiation Shielding (secondary neutrons & GCR mitigation).
  - **Day 7**: Cabeus Crater LCROSS Water Ice Extraction.
- Earnable Science Badges and an official Junior Astronaut Certification in the Final Mission Report.
- Flexible option for advanced players to toggle **Commander Sandbox** for unassisted simulation.

### 3. Scientific Calibration & Physical Units
- **Power & Energy**: kW for power flow, kWh for battery capacity.
- **Atmosphere & ECLSS**: Calibrated kg O₂ reserves based on NASA STD-3001 astronaut metabolic consumption (~0.84 kg O₂/person/day).
- **Water Management**: Calibrated Liters H₂O tracking closed-loop recovery.
- **Nutrition**: kCal tracking based on spaceflight diet standards (~3,000 kCal/day/astronaut).
- **Lunar Temporal Scale**: Explicit distinction between Mars "Sol" terminology and Moon mission operational days (24h Earth UTC shifts within the ~29.5-day synodic lunar illumination cycle).

### 4. NASA Data Integration & Live Space Weather
- **NASA DONKI Feed**: Live solar flare and space weather alerts with fallback baselines.
- **Planetary Data System (PDS) Citations**: Direct reference links to:
  - LRO Diviner (DLRE) thermal data showing sub-40 K cold traps.
  - LRO LOLA polar topography and elevation models.
  - LCROSS 2009 Cabeus Crater water ice spectroscopic confirmation.
  - NASA Space Radiation Analysis Group (SRAG) dose rate baselines.

### 5. Flight Director AI Advisor & Resilient Architecture
- Server-side Gemini 2.5 Flash operational advisory proxy (`/api/advisor`) providing tactical guidance.
- Deterministic rules-engine fallback when offline or without an active API key.
- Zero login or account creation required; instant in-browser accessibility.

---

## Running the Application

### Development Server
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Verification & Testing
```bash
# Run logic unit test suite
npx --yes tsx --test src/engine/simulation.test.ts

# Type check
npm run lint

# Production build
npm run build
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

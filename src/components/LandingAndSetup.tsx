import React, { useState } from 'react';
import { ArrowRight, Award, Play, RotateCcw, ShieldCheck, Users, Zap } from 'lucide-react';
import { DIFFICULTY_MODIFIERS, SCENARIOS, SIMULATION_DISCLAIMER } from '../engine/data';
import type { CampaignConfig, DifficultyId, GameState, ScenarioId, TrainingMode } from '../engine/types';
import heroImg from '../assets/images/lunar_south_pole_hero_1794669958658.jpg';

export function LandingScreen({
  hasAutosave,
  autosavePreview,
  corruptedNotice,
  onStartJudgeDemo,
  onStartSetup,
  onQuickStartDefault,
  onResumeAutosave,
}: {
  hasAutosave: boolean;
  autosavePreview: GameState | null;
  corruptedNotice: boolean;
  onStartJudgeDemo: () => void;
  onStartSetup: () => void;
  onQuickStartDefault: () => void;
  onResumeAutosave: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050810] text-slate-100">
      {/* Full-Bleed Lunar South Pole Artwork */}
      <div className="absolute inset-0">
        {!imgError ? (
          <img
            src={heroImg}
            alt="Lunar south pole research outpost along Shackleton Crater rim"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-center opacity-85"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_75%_55%,#1e293b_0%,#090d18_55%,#050810_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050810]/95 via-[#050810]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-[#050810]/35" />
      </div>

      {/* Main Content Over Calm Left Negative Space */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="20" cy="20" r="18" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.85" />
              <path d="M7 26C13 21 27 21 33 26" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M20 8L26 24H14L20 8Z" stroke="#F8FAFC" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="20" cy="18" r="2.2" fill="#38BDF8" />
            </svg>
            <span className="font-mono text-xs tracking-wide text-sky-300">
              NASA Space Apps Challenge 2026 · Lunar Survival Simulation
            </span>
          </div>
        </div>

        <div className="my-auto max-w-xl py-10">
          <h1
            className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ textWrap: 'balance' }}
          >
            OUTPOST COMMANDER
          </h1>
          <p className="mt-3 text-lg font-medium leading-snug text-sky-200 sm:text-xl">
            Every decision determines the future of your lunar outpost.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            Take command of humanity&apos;s south-pole research station. Keep power, oxygen, water,
            food, and crew safety in balance while building habitats and exploring permanently shadowed
            craters.
          </p>

          {corruptedNotice && (
            <div className="mt-4 rounded border border-amber-500/40 bg-amber-950/60 px-4 py-2.5 text-xs text-amber-200">
              A previous browser save could not be read and was skipped safely. You can start a new mission below.
            </div>
          )}

          <div className="mt-8 space-y-3">
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                data-judge-quick-test="true"
                onClick={onStartJudgeDemo}
                className="inline-flex items-center gap-2.5 rounded border border-amber-400/70 bg-amber-500 px-6 py-3.5 text-sm font-bold tracking-wide text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>JUDGE QUICK TEST</span>
              </button>

              <button
                type="button"
                data-start="true"
                onClick={onStartSetup}
                className="inline-flex items-center gap-2.5 rounded bg-blue-600 px-6 py-3.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>START MISSION</span>
              </button>

              {hasAutosave && autosavePreview ? (
                <button
                  type="button"
                  onClick={onResumeAutosave}
                  className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-900/90 px-5 py-3.5 text-sm font-medium text-slate-100 transition-colors hover:border-sky-400 hover:bg-slate-800 whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  <span>
                    Resume {autosavePreview.config.missionName} (Day {autosavePreview.day || autosavePreview.sol})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onQuickStartDefault}
                  className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-sky-400 hover:text-white whitespace-nowrap"
                >
                  <span>Quick Play · Cadet Mode (Day 1)</span>
                  <ArrowRight className="h-4 w-4 text-sky-400" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="font-mono text-xs text-amber-200/90">
              Judge Quick Test: 13-second interactive power-crisis demo powered by the real simulation engine · No setup required
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            5 Lunar Scenarios · Interactive Base &amp; Crew · NASA Science &amp; AI Guidance
          </span>
          <span className="max-w-xl text-slate-400">
            Educational simulation with simplified illustrative values — not operational NASA telemetry.
          </span>
        </div>
      </div>
    </div>
  );
}

export function MissionSetupScreen({
  onBack,
  onLaunchCampaign,
}: {
  onBack: () => void;
  onLaunchCampaign: (config: CampaignConfig) => void;
}) {
  const [commanderName, setCommanderName] = useState('Cmdr. Elena Vance');
  const [missionName, setMissionName] = useState('Artemis Shackleton Alpha');
  const [crewSize, setCrewSize] = useState(4);
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('cadet');
  const [scenario, setScenario] = useState<ScenarioId>('first_outpost');

  const selectedScenario = SCENARIOS[scenario];
  const selectedDiff = DIFFICULTY_MODIFIERS[difficulty];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commanderName.trim() || !missionName.trim()) return;
    onLaunchCampaign({
      commanderName: commanderName.trim(),
      missionName: missionName.trim(),
      crewSize,
      difficulty,
      trainingMode,
      scenario,
    });
  };

  return (
    <div className="min-h-screen bg-[#060911] px-4 py-5 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <p className="font-mono text-xs text-sky-400">
              Mission Setup · Step 1 of 1
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-3xl" style={{ textWrap: 'balance' }}>
              Choose Your Lunar Mission
            </h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            Back to Title
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-5 lg:grid-cols-12">
          {/* Left: Commander & Difficulty */}
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-3 rounded border border-slate-800 bg-[#0b111e] p-4">
              <h2 className="text-sm font-semibold text-white">Commander &amp; Crew</h2>
              <div>
                <label htmlFor="commander-name" className="block text-xs font-medium text-slate-300">
                  Commander Name
                </label>
                <input
                  id="commander-name"
                  type="text"
                  required
                  maxLength={40}
                  value={commanderName}
                  onChange={(e) => setCommanderName(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-[#070b14] px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="mission-name" className="block text-xs font-medium text-slate-300">
                  Mission Name
                </label>
                <input
                  id="mission-name"
                  type="text"
                  required
                  maxLength={48}
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-[#070b14] px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="crew-size" className="text-xs font-medium text-slate-300">
                    Crew Size
                  </label>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-sky-300">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {crewSize} Astronauts
                  </span>
                </div>
                <input
                  id="crew-size"
                  type="range"
                  min={3}
                  max={6}
                  step={1}
                  value={crewSize}
                  onChange={(e) => setCrewSize(Number(e.target.value))}
                  className="mt-1.5 w-full accent-blue-500"
                />
                <div className="mt-0.5 flex justify-between font-mono text-[11px] text-slate-400">
                  <span>3 (Lean)</span>
                  <span>4 (Standard)</span>
                  <span>5</span>
                  <span>6 (Full)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 rounded border border-slate-800 bg-[#0b111e] p-4">
              <h2 className="text-sm font-semibold text-white">Training Track</h2>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setTrainingMode('cadet')}
                  className={`rounded border p-2.5 text-left transition-colors ${
                    trainingMode === 'cadet'
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-slate-800 bg-[#070b14] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Award className="h-4 w-4 text-amber-400" aria-hidden="true" />
                      <span>Cadet Mode (Junior Astronaut)</span>
                    </span>
                    {trainingMode === 'cadet' && (
                      <span className="font-mono text-xs text-sky-300">Selected</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Recommended for students &amp; judges. Guided science checkpoints on Days 1, 3, 5, 7, earnable badges, and certificate.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTrainingMode('commander')}
                  className={`rounded border p-2.5 text-left transition-colors ${
                    trainingMode === 'commander'
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-slate-800 bg-[#070b14] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Commander Sandbox</span>
                    {trainingMode === 'commander' && (
                      <span className="font-mono text-xs text-sky-300">Selected</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Full independent outpost control. No checkpoint quizzes, pure simulation autonomy.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 rounded border border-slate-800 bg-[#0b111e] p-4">
              <h2 className="text-sm font-semibold text-white">Difficulty</h2>
              <div className="grid gap-2">
                {(['easy', 'normal', 'hard'] as DifficultyId[]).map((id) => {
                  const d = DIFFICULTY_MODIFIERS[id];
                  const active = difficulty === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDifficulty(id)}
                      className={`rounded border p-2.5 text-left transition-colors ${
                        active
                          ? 'border-blue-500 bg-blue-950/40'
                          : 'border-slate-800 bg-[#070b14] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{d.label}</span>
                        {active && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-sky-300">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{d.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: 5 Scenarios & Direct Launch */}
          <div className="flex flex-col justify-between space-y-4 rounded border border-slate-800 bg-[#0b111e] p-4 lg:col-span-7">
            <div className="space-y-2.5">
              <h2 className="text-sm font-semibold text-white">Select Mission Scenario</h2>
              <div className="grid gap-2">
                {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
                  const s = SCENARIOS[id];
                  const active = scenario === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setScenario(id)}
                      className={`rounded border px-3.5 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-blue-500 bg-blue-950/35'
                          : 'border-slate-800 bg-[#070b14] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{s.title}</span>
                        <span className="font-mono text-xs tabular-nums text-sky-300">
                          {s.targetDays || s.targetSols} Days · Sunlight {s.startingModifiers.solarBasePct}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-slate-300">{s.subtitle}</p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Scenario Briefing Preview */}
              <div className="rounded border border-slate-800 bg-[#070b14] p-3 space-y-1.5">
                <div className="text-xs font-semibold text-sky-300">
                  Mission Briefing: {selectedScenario.title} ({selectedDiff.label})
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{selectedScenario.briefing}</p>
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-200">What you will learn: </strong>
                  {selectedScenario.scienceFocus}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-3">
              <p className="max-w-md text-[11px] leading-snug text-slate-400">
                {SIMULATION_DISCLAIMER}
              </p>
              <button
                type="submit"
                data-launch-campaign="true"
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <span>Launch Mission — Day 1</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

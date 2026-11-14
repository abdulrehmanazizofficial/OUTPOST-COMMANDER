import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Compass,
  FlaskConical,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  JUDGE_DEMO_CHOICES,
  createJudgeDemoState,
  executeJudgeDecision,
  extractJudgeMetrics,
  type JudgeChoiceId,
  type JudgeDecisionOutcome,
} from '../engine/judgeDemo';
import type { GameState } from '../engine/types';
import { StatusIndicator, TelemetryMeter } from './CommonUI';
import heroImg from '../assets/images/lunar_south_pole_hero_1794669958658.jpg';

type DemoBeat = 1 | 2 | 3 | 4 | 5;

const BEAT_LABELS: { beat: DemoBeat; time: string; title: string }[] = [
  { beat: 1, time: '0–2s', title: 'The Hook' },
  { beat: 2, time: '2–4s', title: 'The Problem' },
  { beat: 3, time: '4–8s', title: 'The Decision' },
  { beat: 4, time: '8–11s', title: 'Real Consequences' },
  { beat: 5, time: '11–13s', title: 'The Science' },
];

function formatSigned(val: number, suffix = ''): string {
  if (val > 0) return `+${val}${suffix}`;
  return `${val}${suffix}`;
}

export function JudgeDemoView({
  onExploreFullMission,
  onExitToTitle,
}: {
  onExploreFullMission: (state?: GameState) => void;
  onExitToTitle: () => void;
}) {
  const [demoState, setDemoState] = useState(() => createJudgeDemoState());
  const [outcome, setOutcome] = useState<JudgeDecisionOutcome | null>(null);
  const [beat, setBeat] = useState<DemoBeat>(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgError, setImgError] = useState(false);

  const baselineMetrics = useMemo(() => extractJudgeMetrics(demoState), [demoState]);

  // Guided 13-second pacing timer (pauses cleanly at Beat 3 awaiting the judge's real decision,
  // then continues through Beat 4 -> Beat 5 once a choice is selected).
  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (!outcome) {
          // Pre-decision: advance 0 -> 2s (Beat 1->2), 2 -> 4s (Beat 2->3), hold at 4.0s+ on Decision
          if (prev >= 5) return prev;
          const next = +(prev + 0.5).toFixed(1);
          if (next >= 4) setBeat(3);
          else if (next >= 2) setBeat(2);
          return next;
        } else {
          // Post-decision: advance 8 -> 11s (Beat 4 -> Beat 5)
          if (prev >= 13) return 13;
          const next = +(prev + 0.5).toFixed(1);
          if (next >= 11) setBeat(5);
          else setBeat(4);
          return next;
        }
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [paused, outcome]);

  const handleSelectChoice = (choiceId: JudgeChoiceId) => {
    const result = executeJudgeDecision(demoState, choiceId);
    setOutcome(result);
    setBeat(4);
    setElapsedSec(8);
  };

  const handleReplay = () => {
    setDemoState(createJudgeDemoState());
    setOutcome(null);
    setBeat(1);
    setElapsedSec(0);
    setPaused(false);
  };

  const handleJumpBeat = (targetBeat: DemoBeat) => {
    if (targetBeat <= 3) {
      if (outcome && targetBeat < 3) {
        setBeat(targetBeat);
        return;
      }
      setBeat(targetBeat);
      setElapsedSec(targetBeat === 1 ? 0 : targetBeat === 2 ? 2 : 4);
    } else if (outcome) {
      setBeat(targetBeat);
      setElapsedSec(targetBeat === 4 ? 8 : 11);
    }
  };

  const activePowerStatus =
    baselineMetrics.batteryPct <= 40 ? 'warning' : 'nominal';

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100">
      {/* Slim Demo Mode Top Bar (distinct from Full Campaign HUD; unpinned on narrow mobile to keep viewport clear) */}
      <header className="relative z-30 border-b border-slate-800 bg-[#070b14]/95 md:sticky md:top-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display text-sm font-bold tracking-wide text-white whitespace-nowrap shrink-0">
              OUTPOST COMMANDER
            </span>
            <span className="text-slate-600 shrink-0" aria-hidden="true">·</span>
            <span className="font-mono text-xs font-medium text-amber-300 whitespace-nowrap truncate">
              DEMO MODE · Judge Test
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden font-mono text-xs tabular-nums text-slate-400 sm:inline">
              {Math.min(13, Math.round(elapsedSec))}s / 13s
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Resume guided timer' : 'Pause guided timer'}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-white whitespace-nowrap"
            >
              {paused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>Pause</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-white whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Replay Demo</span>
            </button>
            <button
              type="button"
              onClick={onExitToTitle}
              className="rounded border border-slate-800 bg-[#0b111e] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white whitespace-nowrap"
            >
              Exit to Title
            </button>
          </div>
        </div>

        {/* 5-Beat Guided Timeline Strip */}
        <div className="border-t border-slate-800/80 bg-[#050810]">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
            {BEAT_LABELS.map((item) => {
              const unlocked = item.beat <= 3 || Boolean(outcome);
              const isCurrent = beat === item.beat;
              const isDone =
                (item.beat < beat && unlocked) || (Boolean(outcome) && item.beat <= 3);
              return (
                <button
                  key={item.beat}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => handleJumpBeat(item.beat)}
                  className={`flex items-center gap-2 rounded px-2.5 py-1 text-left font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600/25 text-sky-200 ring-1 ring-sky-400/50'
                      : isDone
                      ? 'text-emerald-300 hover:bg-slate-900'
                      : unlocked
                      ? 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      : 'cursor-not-allowed text-slate-600'
                  }`}
                >
                  <span className="tabular-nums opacity-80">{item.time}</span>
                  <span className="font-sans font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3.5 px-4 py-3.5 sm:px-6">
        {!outcome ? (
          <>
            {/* BEATS 1 & 2: THE HOOK + THE PROBLEM */}
            <section
              aria-label="Mission Alert and Outpost Status"
              className="grid gap-4 lg:grid-cols-12 items-stretch"
            >
              {/* Left 7 Cols: Lunar Scene, Critical Alert, Schematic Flow & Crew */}
              <div className="flex flex-col justify-between overflow-hidden rounded border border-slate-800 bg-[#0b111e] lg:col-span-7">
                {/* Lunar Outpost Scene Header */}
                <div className="relative min-h-[142px] overflow-hidden border-b border-slate-800 p-4 sm:px-5 sm:py-4">
                  {!imgError ? (
                    <img
                      src={heroImg}
                      alt="Shackleton Crater lunar south pole outpost during low-power alert"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,#1e293b_0%,#090d18_70%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050810]/95 via-[#060a14]/85 to-[#060a14]/55" />

                  <div className="relative z-10 max-w-2xl space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
                      <span>CRITICAL MISSION ALERT · SHACKLETON RIM · MISSION DAY 1</span>
                    </div>
                    <h1
                      className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
                      style={{ textWrap: 'balance' }}
                    >
                      YOUR LUNAR OUTPOST IS RUNNING LOW ON POWER.
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-200">
                      Micrometeoroid damage dropped the Solar Array to{' '}
                      <strong className="font-mono text-amber-300">
                        {baselineMetrics.solarConditionPct}%
                      </strong>{' '}
                      condition. Outpost demand (
                      <span className="font-mono tabular-nums text-white">
                        {baselineMetrics.powerDemandKw} kW
                      </span>
                      ) exceeds generation (
                      <span className="font-mono tabular-nums text-amber-300">
                        {baselineMetrics.powerGenerationKw} kW
                      </span>
                      ) — draining batteries toward blackout.
                    </p>
                  </div>
                </div>

                {/* Visual Power-to-Life-Support Dependency & Crew Strip */}
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                      Habitat Grid &amp; Crew Dependency
                    </h2>
                    <span className="font-mono text-xs text-slate-400">
                      Real-Time Simulation Engine State
                    </span>
                  </div>

                  {/* Clean Inline SVG Outpost Power Dependency Schematic */}
                  <div className="rounded border border-slate-800 bg-[#070b14] p-2.5">
                    <svg
                      viewBox="0 0 640 124"
                      className="h-auto w-full"
                      role="img"
                      aria-label="Diagram showing damaged Solar Array feeding Battery Bank, splitting into Essential Life Support and Science Lab"
                    >
                      {/* Bus connectors */}
                      <line x1="145" y1="62" x2="215" y2="62" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5 4" />
                      <line x1="355" y1="62" x2="415" y2="36" stroke="#38BDF8" strokeWidth="2" />
                      <line x1="355" y1="62" x2="415" y2="90" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" />

                      {/* Solar Array Node */}
                      <rect x="10" y="24" width="135" height="74" rx="6" fill="#0f172a" stroke="#F59E0B" strokeWidth="1.5" />
                      <text x="22" y="45" fill="#FBBF24" fontSize="11" fontFamily="monospace" fontWeight="700">
                        SOLAR ARRAY
                      </text>
                      <text x="22" y="65" fill="#F8FAFC" fontSize="14" fontFamily="monospace" fontWeight="700">
                        {baselineMetrics.powerGenerationKw} kW Output
                      </text>
                      <text x="22" y="85" fill="#CBD5E1" fontSize="10" fontFamily="sans-serif">
                        Condition {baselineMetrics.solarConditionPct}% (Damaged)
                      </text>

                      {/* Battery Storage Node */}
                      <rect x="215" y="20" width="140" height="82" rx="6" fill="#131c2e" stroke="#FB7185" strokeWidth="1.5" />
                      <text x="227" y="42" fill="#FDA4AF" fontSize="11" fontFamily="monospace" fontWeight="700">
                        BATTERY RESERVE
                      </text>
                      <text x="227" y="64" fill="#FFFFFF" fontSize="15" fontFamily="monospace" fontWeight="700">
                        {baselineMetrics.batteryPct}% ({baselineMetrics.batteryKwh} kWh)
                      </text>
                      <text x="227" y="85" fill="#FCA5A5" fontSize="10" fontFamily="monospace">
                        Net: {baselineMetrics.netPowerKw} kW deficit
                      </text>

                      {/* Essential Life Support Bus */}
                      <rect x="415" y="8" width="215" height="50" rx="6" fill="#0c192c" stroke="#38BDF8" strokeWidth="1.5" />
                      <text x="427" y="28" fill="#7DD3FC" fontSize="11" fontFamily="monospace" fontWeight="700">
                        ESSENTIAL LIFE SUPPORT
                      </text>
                      <text x="427" y="46" fill="#E2E8F0" fontSize="11" fontFamily="sans-serif">
                        O2 Scrubbers · Water · Heating (24 kW)
                      </text>

                      {/* Science & Aux Bus */}
                      <rect x="415" y="68" width="215" height="50" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
                      <text x="427" y="88" fill="#CBD5E1" fontSize="11" fontFamily="monospace" fontWeight="700">
                        SCIENCE &amp; GREENHOUSE
                      </text>
                      <text x="427" y="106" fill="#94A3B8" fontSize="11" fontFamily="sans-serif">
                        Science Lab · Hydroponics (20 kW)
                      </text>
                    </svg>
                  </div>

                  {/* Crew Status Strip */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {demoState.crew.map((member) => (
                      <div
                        key={member.id}
                        className="rounded border border-slate-800 bg-[#070b14] px-2.5 py-1.5"
                      >
                        <div className="truncate text-xs font-semibold text-white">{member.name}</div>
                        <div className="truncate text-[11px] text-slate-400">{member.role}</div>
                        <div className="mt-0.5 font-mono text-[11px] tabular-nums text-emerald-300">
                          Health {Math.round(member.health)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: The Problem — 4 Affected Vitals + Dependency Explanation */}
              <div
                className={`flex flex-col justify-between rounded border bg-[#0b111e] p-4 transition-colors lg:col-span-5 ${
                  beat === 2 ? 'border-sky-500/70' : 'border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-bold text-white">
                      Why This Matters: Life Support Needs Power
                    </h2>
                    <span className="shrink-0 whitespace-nowrap">
                      <StatusIndicator status={activePowerStatus} label="Grid Deficit" />
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">
                    On the Moon, electricity directly powers{' '}
                    <strong className="text-white">oxygen electrolysis</strong>,{' '}
                    <strong className="text-white">water distillation</strong>, and{' '}
                    <strong className="text-white">habitat thermal heaters</strong>. If batteries
                    exhaust, life-support output drops sharply and crew safety falls.
                  </p>

                  <div className="space-y-3.5 rounded border border-slate-800 bg-[#070b14] p-4">
                    <TelemetryMeter
                      label="Power (Battery Reserve)"
                      value={baselineMetrics.batteryPct}
                      warningThreshold={45}
                      criticalThreshold={25}
                      deltaText={`${baselineMetrics.batteryKwh} kWh · ${baselineMetrics.netPowerKw} kW`}
                    />
                    <TelemetryMeter
                      label="Oxygen Supply"
                      value={baselineMetrics.oxygenPct}
                      warningThreshold={50}
                      criticalThreshold={30}
                      deltaText="ECLSS Electrolysis"
                    />
                    <TelemetryMeter
                      label="Water Reserves"
                      value={baselineMetrics.waterPct}
                      warningThreshold={50}
                      criticalThreshold={30}
                      deltaText="Closed-Loop Recovery"
                    />
                    <TelemetryMeter
                      label="Crew Safety"
                      value={baselineMetrics.crewSafetyPct}
                      warningThreshold={55}
                      criticalThreshold={35}
                      deltaText={`Health ${baselineMetrics.crewAvgHealth}% · Thermal ${baselineMetrics.thermalControlPct}%`}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <span>Research Points: <strong className="font-mono tabular-nums text-sky-300">{baselineMetrics.researchPoints} RP</strong></span>
                  <span>Materials: <strong className="font-mono tabular-nums text-slate-200">{baselineMetrics.materials} u</strong></span>
                </div>
              </div>
            </section>

            {/* BEAT 3: THE DECISION (3 Real Interactive Choices) */}
            <section
              aria-label="Commander Decision"
              className={`rounded border bg-[#0b111e] p-4 transition-colors ${
                beat === 3 ? 'border-blue-500' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-sky-400">
                    COMMANDER DECISION · SELECT ONE ACTION TO RUN THE SIMULATION
                  </p>
                  <h2 className="mt-0.5 font-display text-lg font-bold text-white sm:text-xl">
                    How Will You Respond to the Power Shortage?
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  Each button executes the real simulation engine
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {JUDGE_DEMO_CHOICES.map((choice, idx) => {
                  const icons = [HeartPulse, BatteryCharging, FlaskConical];
                  const Icon = icons[idx];
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      data-judge-choice={choice.id}
                      onClick={() => handleSelectChoice(choice.id)}
                      className="group flex flex-col justify-between rounded border border-slate-700 bg-[#070b14] p-3.5 text-left transition-colors hover:border-blue-500 hover:bg-blue-950/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Icon className="h-5 w-5 text-sky-400 shrink-0" aria-hidden="true" />
                          <span className="font-mono text-[11px] text-slate-400">
                            Option 0{idx + 1}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-white group-hover:text-sky-200">
                          {choice.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {choice.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 font-mono text-[11px] text-sky-300">
                        <span className="truncate">{choice.engineActionSummary}</span>
                        <ArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* BEATS 4 & 5: REAL CONSEQUENCES + THE SCIENCE */
          <div className="space-y-5">
            {/* BEAT 4: Real Engine Execution & Before/After Table */}
            <section
              aria-label="Simulation Consequences"
              className="rounded border border-slate-800 bg-[#0b111e] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <p className="font-mono text-xs text-sky-400">
                    REAL SIMULATION ENGINE RESULT · MISSION DAY 1 → MISSION DAY {outcome.afterState.day || outcome.afterState.sol}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                    Decision Executed: {outcome.choiceTitle}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-2 rounded border border-slate-700 bg-[#070b14] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-white whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>Try Another Decision</span>
                </button>
              </div>

              {/* 5 Before-and-After Metric Tiles */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: 'Battery Power',
                    before: `${outcome.before.batteryPct}% (${outcome.before.batteryKwh} kWh)`,
                    after: `${outcome.after.batteryPct}% (${outcome.after.batteryKwh} kWh)`,
                    delta: outcome.after.batteryKwh - outcome.before.batteryKwh,
                    deltaText: `${formatSigned(outcome.after.batteryKwh - outcome.before.batteryKwh, ' kWh')}`,
                    note: `Solar ${outcome.after.solarConditionPct}% (${outcome.after.solarStatus})`,
                    goodWhenPositive: true,
                  },
                  {
                    label: 'Oxygen Supply',
                    before: `${outcome.before.oxygenPct}%`,
                    after: `${outcome.after.oxygenPct}%`,
                    delta: outcome.after.oxygenPct - outcome.before.oxygenPct,
                    deltaText: `${formatSigned(outcome.after.oxygenPct - outcome.before.oxygenPct, '%')}`,
                    note: 'ECLSS Breathable Air',
                    goodWhenPositive: true,
                  },
                  {
                    label: 'Water Reserves',
                    before: `${outcome.before.waterPct}%`,
                    after: `${outcome.after.waterPct}%`,
                    delta: outcome.after.waterPct - outcome.before.waterPct,
                    deltaText: `${formatSigned(outcome.after.waterPct - outcome.before.waterPct, '%')}`,
                    note: `Food ${outcome.after.foodPct}% (${formatSigned(outcome.after.foodPct - outcome.before.foodPct, '%')})`,
                    goodWhenPositive: true,
                  },
                  {
                    label: 'Crew Safety',
                    before: `${outcome.before.crewSafetyPct}%`,
                    after: `${outcome.after.crewSafetyPct}%`,
                    delta: outcome.after.crewSafetyPct - outcome.before.crewSafetyPct,
                    deltaText: `${formatSigned(outcome.after.crewSafetyPct - outcome.before.crewSafetyPct, '%')}`,
                    note: `Health ${outcome.after.crewAvgHealth}% · Thermal ${outcome.after.thermalControlPct}%`,
                    goodWhenPositive: true,
                  },
                  {
                    label: 'Research Output',
                    before: `${outcome.before.researchPoints} RP`,
                    after: `${outcome.after.researchPoints} RP`,
                    delta: outcome.after.researchPoints - outcome.before.researchPoints,
                    deltaText: `${formatSigned(outcome.after.researchPoints - outcome.before.researchPoints, ' RP')}`,
                    note: 'Science Progress',
                    goodWhenPositive: true,
                  },
                ].map((m) => {
                  const tone =
                    m.delta > 0
                      ? 'text-emerald-400'
                      : m.delta < 0
                      ? 'text-rose-400'
                      : 'text-slate-400';
                  return (
                    <div
                      key={m.label}
                      className="rounded border border-slate-800 bg-[#070b14] p-3.5"
                    >
                      <div className="text-xs font-medium text-slate-400">{m.label}</div>
                      <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-mono text-lg font-bold tabular-nums text-white">
                          {m.after}
                        </span>
                        <span className={`font-mono text-xs font-semibold tabular-nums ${tone}`}>
                          {m.deltaText}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                        Before: {m.before}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{m.note}</div>
                    </div>
                  );
                })}
              </div>

              {/* Trade-Off Breakdown */}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="font-mono text-xs font-semibold text-emerald-300">
                    WHAT YOU PROTECTED / GAINED
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">{outcome.gainedHeadline}</p>
                </div>
                <div className="rounded border border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="font-mono text-xs font-semibold text-amber-300">
                    THE REAL TRADE-OFF / COST
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">{outcome.costHeadline}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                {outcome.tradeOffSummary}
              </p>

              {outcome.afterState.lastSolSummary?.warnings &&
                outcome.afterState.lastSolSummary.warnings.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                    <span>
                      <strong>Engine Alert:</strong> {outcome.afterState.lastSolSummary.warnings[0]}
                    </span>
                  </div>
                )}
            </section>

            {/* BEAT 5: THE SCIENCE + EXPLORE FULL MISSION */}
            <section
              aria-label="NASA Scientific Takeaway and Full Mission Launch"
              className="rounded border border-sky-500/40 bg-[#0b1322] p-5 sm:p-6"
            >
              <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
                <div className="space-y-3 lg:col-span-8">
                  <div className="flex items-center gap-2 font-mono text-xs text-sky-300">
                    <Sparkles className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
                    <span>NASA LUNAR SCIENCE TAKEAWAY · ARTEMIS SOUTH POLE</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {outcome.scienceTakeaway}
                  </p>
                  <p
                    className="font-display text-lg font-bold tracking-wide text-white sm:text-xl"
                    style={{ textWrap: 'balance' }}
                  >
                    ONE DECISION CAN CHANGE THE FUTURE OF A LUNAR OUTPOST.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 lg:col-span-4 lg:items-end">
                  <button
                    type="button"
                    data-explore-full-mission="true"
                    onClick={() => onExploreFullMission(outcome?.afterState)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-5 py-3.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 lg:w-auto whitespace-nowrap"
                  >
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    <span>EXPLORE FULL MISSION</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="inline-flex w-full items-center justify-center gap-2 rounded border border-slate-700 bg-[#070b14] px-4 py-2.5 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-white lg:w-auto whitespace-nowrap"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                    <span>Replay Demo &amp; Test Other Choices</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

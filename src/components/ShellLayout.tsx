import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  Droplets,
  Flame,
  HelpCircle,
  Layers,
  Menu,
  Shield,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { SCENARIOS } from '../engine/data';
import { computeBaseBalances } from '../engine/simulation';
import type { GameState } from '../engine/types';

export type PrimaryTabId = 'mission' | 'base' | 'crew' | 'explore' | 'science';
export type HubTabId = 'advisor' | 'analytics' | 'logs' | 'settings';

const PRIMARY_TABS: { id: PrimaryTabId; label: string }[] = [
  { id: 'mission', label: 'MISSION' },
  { id: 'base', label: 'BASE' },
  { id: 'crew', label: 'CREW' },
  { id: 'explore', label: 'EXPLORE' },
  { id: 'science', label: 'SCIENCE' },
];

type VitalKey = 'power' | 'oxygen' | 'water' | 'food' | 'safety';

export function ShellLayout({
  state,
  activeTab,
  onSelectTab,
  onOpenHub,
  onOpenReport,
  onAdvanceSol,
  onOpenTutorial,
  onStartJudgeDemo,
  children,
}: {
  state: GameState;
  activeTab: PrimaryTabId;
  onSelectTab: (tab: PrimaryTabId) => void;
  onOpenHub: (tab: HubTabId) => void;
  onOpenReport: () => void;
  onAdvanceSol: () => void;
  onOpenTutorial: () => void;
  onStartJudgeDemo?: () => void;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedVital, setExpandedVital] = useState<VitalKey | null>(null);

  const balances = computeBaseBalances(state);
  const batteryPct = Math.round(
    (state.resources.batteryKwh / Math.max(1, state.resources.batteryCapacityKwh)) * 100
  );
  const avgHealth = Math.round(
    state.crew.reduce((acc, c) => acc + c.health, 0) / Math.max(1, state.crew.length)
  );
  const avgFatigue = Math.round(
    state.crew.reduce((acc, c) => acc + c.fatigue, 0) / Math.max(1, state.crew.length)
  );
  const unresolvedEvents = state.events.filter((e) => !e.resolved);
  const hasCriticalEvent = unresolvedEvents.some((e) => e.severity === 'Critical');

  const safetyComposite = Math.round(
    avgHealth * 0.65 + state.resources.radiationShieldingPct * 0.35
  );
  const safetyLevel: 'safe' | 'caution' | 'critical' =
    avgHealth < 55 || state.environment.radiationLevel === 'Solar Particle Alert'
      ? 'critical'
      : avgHealth < 72 ||
        state.resources.radiationShieldingPct < 45 ||
        state.environment.radiationLevel !== 'Nominal'
      ? 'caution'
      : 'safe';

  const emergencyActive =
    state.resources.oxygenPct < 30 || batteryPct < 18 || hasCriticalEvent || avgHealth < 45;

  const currentDay = state.day || state.sol || 1;
  const targetDays = state.targetDays || state.targetSols || 10;
  const lunarCycle = state.lunarCycleDay || 1;

  const vitals: {
    key: VitalKey;
    label: string;
    valueText: string;
    subText: string;
    status: 'good' | 'warn' | 'bad';
    icon: React.ReactNode;
    plainExplanation: string;
    lunarFact: string;
  }[] = [
    {
      key: 'power',
      label: 'Power',
      valueText: `${batteryPct}%`,
      subText: `${balances.netPowerKw >= 0 ? '+' : ''}${balances.netPowerKw} kW (${Math.round(state.resources.batteryKwh)}/${state.resources.batteryCapacityKwh} kWh)`,
      status: batteryPct <= 22 ? 'bad' : batteryPct <= 45 || balances.netPowerKw < 0 ? 'warn' : 'good',
      icon: <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />,
      plainExplanation: `Storage: ${Math.round(state.resources.batteryKwh)}/${state.resources.batteryCapacityKwh} kWh. Generation: +${balances.powerGenerationKw} kW (${state.environment.solarIlluminationPct}% illumination on Solar Ridge) vs Base Demand: -${balances.powerDemandKw} kW. Net: ${balances.netPowerKw} kW.`,
      lunarFact:
        'At the lunar south pole, crater rims experience prolonged illumination while crater floors remain in permanent shadow. Solar panels must be paired with energy storage (batteries/regenerative fuel cells) during shadow passes.',
    },
    {
      key: 'oxygen',
      label: 'Oxygen',
      valueText: `${Math.round(state.resources.oxygenPct)}%`,
      subText: `${state.resources.oxygenKg ? `${state.resources.oxygenKg} kg O₂` : `${balances.oxygenDelta >= 0 ? '+' : ''}${balances.oxygenDelta}%/d`}`,
      status:
        state.resources.oxygenPct <= 28
          ? 'bad'
          : state.resources.oxygenPct <= 50 || balances.oxygenDelta < 0
          ? 'warn'
          : 'good',
      icon: <Wind className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />,
      plainExplanation: `Pressurized breathable air pool (~${state.resources.oxygenKg || 120} kg O₂ based on NASA STD-3001 crew human metabolic consumption ~0.84 kg O₂/astronaut/day). ECLSS electrolysis and plants regenerate O₂.`,
      lunarFact:
        'NASA standard ECLSS on the ISS recycles over 98% of oxygen and water. On the Moon, ISRU electrolysis of crater water ice can also supplement life-support supplies.',
    },
    {
      key: 'water',
      label: 'Water',
      valueText: `${Math.round(state.resources.waterPct)}%`,
      subText: `${state.resources.waterLiters ? `${state.resources.waterLiters} L H₂O` : `${balances.waterDelta >= 0 ? '+' : ''}${balances.waterDelta}%/d`}`,
      status:
        state.resources.waterPct <= 28
          ? 'bad'
          : state.resources.waterPct <= 50 || balances.waterDelta < 0
          ? 'warn'
          : 'good',
      icon: <Droplets className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />,
      plainExplanation: `Potable & recycled water reservoir (~${state.resources.waterLiters || 250} Liters). Recovered by closed-loop filtration and augmented by rover sorties mining Permanently Shadowed Crater ice deposits.`,
      lunarFact:
        'NASA LCROSS (2009) confirmed ~5.5% water ice by mass in Cabeus crater. Harvesting local lunar ice saves millions of dollars per ton compared to launching water from Earth.',
    },
    {
      key: 'food',
      label: 'Food',
      valueText: `${Math.round(state.resources.foodPct)}%`,
      subText: `${state.resources.foodKcal ? `${Math.round(state.resources.foodKcal / 1000)}k kCal` : `${balances.foodDelta >= 0 ? '+' : ''}${balances.foodDelta}%/d`}`,
      status:
        state.resources.foodPct <= 28
          ? 'bad'
          : state.resources.foodPct <= 50 || balances.foodDelta < 0
          ? 'warn'
          : 'good',
      icon: <Flame className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />,
      plainExplanation: `Nutrition store (~${Math.round((state.resources.foodKcal || 450000) / 1000)}k kCal; NASA baseline ~3,000 kCal/day/astronaut). Pre-packaged rations are supplemented by fresh Greenhouse hydroponic crops.`,
      lunarFact:
        'Hydroponic and aeroponic LED growth chambers recycle crew-exhaled CO₂ into fresh biomass while boosting astronaut psychological morale on long-duration exploration.',
    },
    {
      key: 'safety',
      label: 'Crew Safety',
      valueText:
        safetyLevel === 'critical'
          ? 'Critical'
          : safetyLevel === 'caution'
          ? 'Caution'
          : 'Safe',
      subText: `HP ${avgHealth}% · Shd ${Math.round(state.resources.radiationShieldingPct)}%`,
      status: safetyLevel === 'critical' ? 'bad' : safetyLevel === 'caution' ? 'warn' : 'good',
      icon: <Shield className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />,
      plainExplanation: `Integrated safety index (${safetyComposite}/100): Crew Health (${avgHealth}%), Fatigue (${avgFatigue}%), Thermal Control (${Math.round(state.resources.thermalControlPct)}%), and Radiation Shielding (${Math.round(state.resources.radiationShieldingPct)}%, Environment: ${state.environment.radiationLevel}).`,
      lunarFact:
        'Lacking a protective atmosphere and global magnetic field, lunar outposts use 1–2 meters of packed regolith shielding or underground lava tubes to protect against cosmic rays and solar flares.',
    },
  ];

  const activeVitalDetail = expandedVital
    ? vitals.find((v) => v.key === expandedVital) || null
    : null;

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100">
      {/* Slim Sticky Game Header (<= 56px mobile height) */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-800/90 bg-[#070b14]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          {/* Left: Brand + Mobile Menu */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-200 hover:bg-slate-800 md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('mission')}
              className="flex items-center gap-2 text-left min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="20" cy="20" r="18" stroke="#38BDF8" strokeWidth="1.6" />
                <path d="M20 9L26 24H14L20 9Z" stroke="#F8FAFC" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="20" cy="18" r="2.2" fill="#38BDF8" />
              </svg>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold tracking-wide text-white">
                  OUTPOST COMMANDER
                </div>
                <div className="hidden truncate font-mono text-[11px] text-slate-400 sm:block">
                  Day {currentDay}/{targetDays} · Lunar Illumination Day {lunarCycle}/30 · {SCENARIOS[state.config.scenario].title}
                </div>
              </div>
            </button>
          </div>

          {/* Center: Clean 5-Destination Navigation (Desktop) */}
          <nav aria-label="Primary game sections" className="hidden items-center gap-1 md:flex">
            {PRIMARY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const eventCount = tab.id === 'mission' ? unresolvedEvents.length : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setExpandedVital(null);
                    onSelectTab(tab.id);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {eventCount > 0 && (
                    <span
                      className={`font-mono text-[11px] font-bold tabular-nums ${
                        active ? 'text-amber-200' : 'text-amber-400'
                      }`}
                    >
                      ({eventCount})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Advisor, Ops Hub, Help & Primary Sol Advance CTA */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onStartJudgeDemo && (
              <button
                type="button"
                onClick={onStartJudgeDemo}
                title="Launch 13-Second Judge Quick Test"
                className="hidden md:inline-flex items-center gap-1 rounded border border-amber-400/60 bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 hover:text-white whitespace-nowrap shrink-0"
              >
                <span>★ 13s Judge Demo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenHub('advisor')}
              title="Open Mission AI Advisor"
              className="hidden sm:inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-500/60 hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">AI Advisor</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenHub('analytics')}
              title="Analytics, Mission Logs, Saves & Settings"
              aria-label="Open Mission Hub"
              className="hidden sm:inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <span className="hidden xl:inline">Hub</span>
            </button>

            <button
              type="button"
              onClick={onOpenTutorial}
              aria-label="How to Command guide"
              title="How to Command"
              className="hidden sm:inline-flex rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {state.campaignStatus === 'active' ? (
              <button
                type="button"
                data-advance-sol="true"
                onClick={onAdvanceSol}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <span>Advance to Day {currentDay + 1}</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap shrink-0"
              >
                <span>Final Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-[#070b14] px-4 py-3 md:hidden space-y-3">
            <div className="text-[11px] font-mono text-slate-400">
              Day {currentDay}/{targetDays} · Lunar Cycle {lunarCycle}/30 · {state.config.missionName}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_TABS.map((tab) => {
                const active = activeTab === tab.id;
                const eventCount = tab.id === 'mission' ? unresolvedEvents.length : 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded border px-3 py-2 text-xs font-semibold ${
                      active
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-800 bg-[#0b111e] text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {eventCount > 0 && (
                      <span className="font-mono text-amber-300">({eventCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-800 pt-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenHub('advisor');
                  setMobileMenuOpen(false);
                }}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sky-300"
              >
                AI Advisor
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenHub('analytics');
                  setMobileMenuOpen(false);
                }}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-200"
              >
                Analytics &amp; Logs
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenHub('settings');
                  setMobileMenuOpen(false);
                }}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-200"
              >
                Saves &amp; Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTutorial();
                  setMobileMenuOpen(false);
                }}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-200"
              >
                How to Play
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Container */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        {/* Emergency Banner (only when survival threshold or critical event demands attention) */}
        {emergencyActive && state.campaignStatus === 'active' && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-rose-500/40 bg-rose-950/35 px-4 py-2.5 text-xs text-rose-100"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>
                Outpost Alert:{' '}
                {hasCriticalEvent
                  ? 'A critical story event needs your decision on the MISSION screen.'
                  : state.resources.oxygenPct < 30
                  ? 'Oxygen is critically low! Tune Life Support or check Base power.'
                  : batteryPct < 18
                  ? 'Battery storage is nearly empty! Repair solar panels or conserve power.'
                  : 'Crew health is critically low! Schedule Crew Rest & Recovery.'}
              </span>
            </div>
            {activeTab !== 'mission' && (
              <button
                type="button"
                onClick={() => onSelectTab('mission')}
                className="font-mono text-xs font-semibold text-rose-200 underline hover:text-white whitespace-nowrap"
              >
                Go to MISSION →
              </button>
            )}
          </div>
        )}

        {/* 5 Simple Outpost Vitals Strip (Click any vital to understand it) */}
        <section aria-label="Outpost Five Vitals" className="no-print space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {vitals.map((v) => {
              const isOpen = expandedVital === v.key;
              const borderClass = isOpen
                ? 'border-sky-400 bg-[#0e172a]'
                : v.status === 'bad'
                ? 'border-rose-500/50 bg-[#170c14]'
                : v.status === 'warn'
                ? 'border-amber-500/40 bg-[#15110a]'
                : 'border-slate-800 bg-[#0b111e] hover:border-slate-700';
              const valueClass =
                v.status === 'bad'
                  ? 'text-rose-400'
                  : v.status === 'warn'
                  ? 'text-amber-300'
                  : 'text-white';

              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setExpandedVital(isOpen ? null : v.key)}
                  aria-expanded={isOpen}
                  className={`flex flex-col justify-between rounded border px-3 py-2.5 text-left transition-colors ${borderClass}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      {v.icon}
                      <span>{v.label}</span>
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180 text-sky-400' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className={`font-mono text-lg font-bold tabular-nums ${valueClass}`}>
                      {v.valueText}
                    </span>
                    <span className="truncate font-mono text-[11px] tabular-nums text-slate-400">
                      {v.subText}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Quiet Materials & Research Readout */}
            <div className="flex flex-col justify-between rounded border border-slate-800/80 bg-[#080d18] px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-400">Regolith &amp; Science</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-xs tabular-nums">
                <span className="text-slate-100">
                  <strong className="text-sm text-white">
                    {state.resources.materialsKg ? `${state.resources.materialsKg}` : `${Math.round(state.resources.materials)}`}
                  </strong>{' '}
                  kg
                </span>
                <span className="text-sky-300">
                  <strong className="text-sm">{Math.round(state.resources.researchPoints)}</strong>{' '}
                  RP
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Simple Science Explanation for Selected Vital */}
          {activeVitalDetail && (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded border border-sky-500/35 bg-[#0c1526] px-4 py-3 text-xs">
              <div className="max-w-4xl space-y-1">
                <div className="font-semibold text-sky-300">
                  {activeVitalDetail.label}: How it works
                </div>
                <p className="leading-relaxed text-slate-200">{activeVitalDetail.plainExplanation}</p>
                <p className="leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Real Lunar Science: </strong>
                  {activeVitalDetail.lunarFact}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedVital(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close vital explanation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Active Tab View */}
        {children}
      </main>
    </div>
  );
}

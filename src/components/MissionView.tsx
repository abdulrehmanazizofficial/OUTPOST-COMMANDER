import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  ChevronRight,
  Compass,
  Hammer,
  HelpCircle,
  Info,
  ShieldAlert,
  Sparkles,
  Sun,
  Thermometer,
  Users,
  X,
} from 'lucide-react';
import { SCENARIOS, SIMULATION_DISCLAIMER, SOL_DIRECTIVES } from '../engine/data';
import {
  canQueueDirective,
  canResolveEventChoice,
  computeBaseBalances,
} from '../engine/simulation';
import type { GameState, SolDirectiveId } from '../engine/types';
import { StatusIndicator } from './CommonUI';
import type { HubTabId, PrimaryTabId } from './ShellLayout';

export function MissionView({
  state,
  onToggleDirective,
  onResolveChoice,
  onAdvanceSol,
  onAnswerCheckpoint,
  onDismissCheckpoint,
  onSelectTab,
  onOpenHub,
  onOpenReport,
}: {
  state: GameState;
  onToggleDirective: (id: SolDirectiveId) => void;
  onResolveChoice: (eventId: string, choiceId: string) => void;
  onAdvanceSol: () => void;
  onAnswerCheckpoint?: (optionId: string) => void;
  onDismissCheckpoint?: () => void;
  onSelectTab: (tab: PrimaryTabId) => void;
  onOpenHub: (tab: HubTabId) => void;
  onOpenReport: () => void;
}) {
  const [showAllActions, setShowAllActions] = useState(false);
  const [showHistoryEvents, setShowHistoryEvents] = useState(false);
  const [hideStudentHint, setHideStudentHint] = useState(false);

  const scenario = SCENARIOS[state.config.scenario];
  const balances = computeBaseBalances(state);
  const batteryPct = Math.round(
    (state.resources.batteryKwh / Math.max(1, state.resources.batteryCapacityKwh)) * 100
  );
  const avgFatigue = Math.round(
    state.crew.reduce((acc, c) => acc + c.fatigue, 0) / Math.max(1, state.crew.length)
  );
  const unresolvedEvents = state.events.filter((e) => !e.resolved);
  const resolvedEvents = state.events.filter((e) => e.resolved);
  const completedObjectives = state.objectives.filter((o) => o.completed).length;
  const damagedModules = state.modules.filter((m) => m.status === 'damaged');
  const greenhouseBuilt = state.modules.some(
    (m) => m.id === 'greenhouse' && (m.status === 'operational' || m.status === 'damaged')
  );

  // Pick top-4 context-relevant Sol actions while always letting the player expand all 9
  const recommendedActionIds = useMemo(() => {
    const scored: { id: SolDirectiveId; score: number }[] = SOL_DIRECTIVES.map((dir) => {
      let score = 10;
      const selected = state.queuedDirectives.includes(dir.id);
      if (selected) score += 200; // keep currently chosen actions visible

      const solar = state.modules.find((m) => m.id === 'solar_array');
      if (dir.id === 'repair_solar') {
        if (balances.netPowerKw < 0 || batteryPct < 55 || (solar && solar.conditionPct < 82)) {
          score += 90;
        }
      }
      if (dir.id === 'inspect_eclss') {
        if (state.resources.oxygenPct < 70 || balances.oxygenDelta <= 1) score += 85;
      }
      if (dir.id === 'recycle_water') {
        if (state.resources.waterPct < 70 || balances.waterDelta <= 1) score += 80;
      }
      if (dir.id === 'extra_food') {
        if (greenhouseBuilt && (state.resources.foodPct < 75 || balances.foodDelta <= 1)) score += 78;
        else if (!greenhouseBuilt) score -= 50;
      }
      if (dir.id === 'rest_crew') {
        if (avgFatigue > 45) score += 75;
      }
      if (dir.id === 'boost_shielding') {
        if (
          state.environment.radiationLevel !== 'Nominal' ||
          state.resources.radiationShieldingPct < 60
        ) {
          score += 70;
        }
      }
      if (dir.id === 'maintain_comms' && state.resources.commsQualityPct < 75) score += 60;
      if (dir.id === 'focused_research') score += 45;
      if (dir.id === 'emergency_prep' && unresolvedEvents.length > 0) score += 40;
      return { id: dir.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return new Set(scored.slice(0, 4).map((x) => x.id));
  }, [
    avgFatigue,
    balances.foodDelta,
    balances.netPowerKw,
    balances.oxygenDelta,
    balances.waterDelta,
    batteryPct,
    greenhouseBuilt,
    state.environment.radiationLevel,
    state.modules,
    state.queuedDirectives,
    state.resources.commsQualityPct,
    state.resources.foodPct,
    state.resources.oxygenPct,
    state.resources.radiationShieldingPct,
    state.resources.waterPct,
    unresolvedEvents.length,
  ]);

  const visibleDirectives = showAllActions
    ? SOL_DIRECTIVES
    : SOL_DIRECTIVES.filter((d) => recommendedActionIds.has(d.id));

  // Clear plain-English headline telling the player what needs attention right now
  const currentProblemSummary = useMemo(() => {
    if (state.campaignStatus === 'completed') {
      return `Mission complete! You sustained ${state.config.missionName} for all ${state.targetSols} Sols.`;
    }
    if (state.campaignStatus === 'interrupted') {
      return 'Emergency abort triggered. Open your Final Mission Report to review what happened and replay.';
    }
    if (unresolvedEvents.length > 0) {
      return `${unresolvedEvents.length} urgent situation report needs your decision below before advancing the Sol.`;
    }
    if (damagedModules.length > 0) {
      return `${damagedModules.map((m) => m.name).join(', ')} damaged — repair on the BASE tab or schedule maintenance.`;
    }
    if (balances.netPowerKw < 0 || batteryPct < 40) {
      return `Power deficit (${balances.netPowerKw} kW). Clean solar arrays, switch Power Priority on BASE, or conserve battery.`;
    }
    if (state.resources.foodPct < 65 && !greenhouseBuilt) {
      return 'Food stores are shrinking. Visit BASE to build a Greenhouse for fresh hydroponic crops.';
    }
    if (avgFatigue >= 65) {
      return 'Crew fatigue is rising. Pick "Crew Recovery & Morale Rotation" below or give astronauts rest on CREW.';
    }
    return 'All core systems are stable. Choose up to 3 actions below, build or explore, then advance to the next Sol.';
  }, [
    avgFatigue,
    balances.netPowerKw,
    batteryPct,
    damagedModules,
    greenhouseBuilt,
    state.campaignStatus,
    state.config.missionName,
    state.resources.foodPct,
    state.targetSols,
    unresolvedEvents.length,
  ]);

  return (
    <div className="space-y-5">
      {/* Environmental Story Banner */}
      <section className="rounded border border-slate-800 bg-[#0b111e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-sky-400">
              <span>
                Day {state.day || state.sol} of {state.targetDays || state.targetSols}
              </span>
              <span>·</span>
              <span>Lunar Cycle Day {state.lunarCycleDay || 1}/30</span>
              <span>·</span>
              <span>{scenario.title}</span>
              <span>·</span>
              <span className="capitalize">{state.config.difficulty}</span>
              {state.trainingMode === 'cadet' && (
                <>
                  <span>·</span>
                  <span className="text-amber-300">Junior Astronaut Track</span>
                </>
              )}
            </div>
            <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
              {state.config.missionName}
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">{currentProblemSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded border border-slate-800 bg-[#070b14] px-4 py-3 font-mono text-xs tabular-nums">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <div>
                <div className="text-[10px] text-slate-400">SUNLIGHT</div>
                <div className="text-slate-100">{state.environment.solarIlluminationPct}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <div>
                <div className="text-[10px] text-slate-400">SURFACE</div>
                <div className="text-slate-100">{state.environment.surfaceTempC} °C</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`h-4 w-4 ${
                  state.environment.radiationLevel === 'Nominal'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="text-[10px] text-slate-400">SPACE WEATHER</div>
                <div
                  className={
                    state.environment.radiationLevel === 'Nominal'
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }
                >
                  {state.environment.radiationLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sol 1 Friendly Loop Guide (Dismissible) */}
      {(state.day === 1 || state.sol === 1) && !hideStudentHint && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-sky-500/30 bg-[#0c1526] px-4 py-3 text-xs text-slate-200">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
            <div>
              <strong className="text-sky-300">How to play each turn: </strong>
              1. Check your 5 vitals above · 2. Handle any active events or Cadet Checkpoints · 3. Pick 1–3 actions below
              (or build on <strong className="text-white">BASE</strong> / explore on{' '}
              <strong className="text-white">EXPLORE</strong>) · 4. Click{' '}
              <strong className="text-white">Advance to Next Day</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHideStudentHint(true)}
            className="text-slate-400 hover:text-white"
            aria-label="Dismiss quick gameplay hint"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Junior Astronaut Cadet Science Checkpoint (Interactive Educational Challenge) */}
      {state.activeCheckpoint && (
        <section
          aria-label="Cadet Science Checkpoint"
          className="rounded border border-amber-400/50 bg-[#0d1424] p-5 space-y-4 shadow-lg shadow-amber-950/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" role="img" aria-label={state.activeCheckpoint.badgeName}>
                🛡️
              </span>
              <div>
                <div className="flex items-center gap-2 font-mono text-xs text-amber-300">
                  <span>JUNIOR ASTRONAUT CADET CHECKPOINT · DAY {state.activeCheckpoint.dayTriggered}</span>
                  <span>·</span>
                  <span className="text-sky-300">{state.activeCheckpoint.topic}</span>
                </div>
                <h2 className="text-base font-bold text-white sm:text-lg">
                  {state.activeCheckpoint.badgeName}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 font-mono text-xs text-amber-300">
                Reward: +{state.activeCheckpoint.rewardRp} RP &amp; Badge
              </span>
              {onDismissCheckpoint && (
                <button
                  type="button"
                  onClick={onDismissCheckpoint}
                  className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-200">
            {state.activeCheckpoint.question}
          </p>

          {/* Options */}
          <div className="grid gap-2.5 md:grid-cols-3">
            {state.activeCheckpoint.options.map((opt) => {
              const answeredOptionId = state.cadetAnswers?.[state.activeCheckpoint!.id];
              const isSelected = answeredOptionId === opt.id;
              const hasAnswered = Boolean(answeredOptionId);
              const isCorrectOpt = opt.correct;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => onAnswerCheckpoint?.(opt.id)}
                  className={`flex flex-col justify-between rounded border p-3.5 text-left transition-colors ${
                    hasAnswered
                      ? isCorrectOpt
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100'
                        : isSelected
                        ? 'border-rose-500 bg-rose-950/40 text-rose-100'
                        : 'border-slate-800 bg-[#070b14] opacity-50'
                      : 'border-slate-700 bg-[#070b14] hover:border-sky-400 hover:bg-slate-900 text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.text}</span>
                  {hasAnswered && isSelected && (
                    <span className="mt-2 font-mono text-[11px] font-bold">
                      {isCorrectOpt ? '✓ Correct Choice!' : '✗ Incorrect choice'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Explanation */}
          {state.cadetAnswers?.[state.activeCheckpoint.id] && (
            <div className="rounded border border-sky-500/40 bg-[#070e1b] p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-300">
                  {state.cadetAnswers[state.activeCheckpoint.id] ===
                  state.activeCheckpoint.options.find((o) => o.correct)?.id
                    ? '★ Scientific Mastery Confirmed! Badge Awarded!'
                    : 'Science Feedback:'}
                </span>
                {onDismissCheckpoint && (
                  <button
                    type="button"
                    onClick={onDismissCheckpoint}
                    className="font-medium text-sky-400 underline hover:text-white"
                  >
                    Continue
                  </button>
                )}
              </div>
              <p className="text-slate-200 leading-relaxed">
                {state.activeCheckpoint.explanation}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Earned Cadet Badges Strip */}
      {state.cadetBadges && state.cadetBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-slate-800 bg-[#080d18] px-3.5 py-2">
          <span className="font-mono text-xs text-amber-300">Earned Badges:</span>
          {state.cadetBadges.map((badgeStr, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200"
            >
              <span>🏅</span>
              <span className="font-medium">{badgeStr}</span>
            </span>
          ))}
        </div>
      )}

      {/* End-of-Sol Telemetry Debrief Banner */}
      {state.lastSolSummary && (
        <section
          aria-label="End of Sol Summary"
          className="rounded border border-sky-500/30 bg-[#0c1526] p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              Sol {state.lastSolSummary.solCompleted} Results
            </h2>
            <div className="flex flex-wrap gap-3 font-mono text-xs tabular-nums">
              <span
                className={
                  state.lastSolSummary.powerBalanceKw >= 0 ? 'text-emerald-400' : 'text-amber-300'
                }
              >
                Power {state.lastSolSummary.powerBalanceKw >= 0 ? '+' : ''}
                {state.lastSolSummary.powerBalanceKw} kW
              </span>
              <span className="text-slate-200">
                O2 {state.lastSolSummary.oxygenDelta >= 0 ? '+' : ''}
                {state.lastSolSummary.oxygenDelta}%
              </span>
              <span className="text-slate-200">
                H2O {state.lastSolSummary.waterDelta >= 0 ? '+' : ''}
                {state.lastSolSummary.waterDelta}%
              </span>
              <span className="text-slate-200">
                Food {state.lastSolSummary.foodDelta >= 0 ? '+' : ''}
                {state.lastSolSummary.foodDelta}%
              </span>
              <span className="text-sky-300">+{state.lastSolSummary.researchGained} RP</span>
            </div>
          </div>

          {(state.lastSolSummary.highlights.length > 0 ||
            state.lastSolSummary.warnings.length > 0) && (
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              {state.lastSolSummary.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-1.5 text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{h}</span>
                </div>
              ))}
              {state.lastSolSummary.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Active Story Events & Decisions (Right Inline!) */}
      {unresolvedEvents.length > 0 && (
        <section aria-label="Active Mission Events" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>Situation Requiring Your Decision ({unresolvedEvents.length})</span>
            </h2>
          </div>

          {unresolvedEvents.map((evt) => (
            <article
              key={evt.id}
              className="space-y-4 rounded border border-amber-500/45 bg-[#12100d] p-5"
            >
              <div className="space-y-1.5">
                <div className="font-mono text-xs text-amber-300">
                  Sol {evt.solTriggered} · {evt.severity} · {evt.affectedSystems.join(', ')}
                </div>
                <h3 className="text-lg font-bold text-white">{evt.title}</h3>
                <p className="text-sm leading-relaxed text-slate-200">{evt.description}</p>
              </div>

              <div className="rounded border border-slate-800 bg-[#080c15] p-3 text-xs leading-relaxed text-slate-300">
                <strong className="text-sky-300">Why this happens on the Moon: </strong>
                {evt.educationalNote}
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {evt.choices.map((choice) => {
                  const check = canResolveEventChoice(state, evt.id, choice.id);
                  return (
                    <div
                      key={choice.id}
                      className="flex flex-col justify-between rounded border border-slate-700 bg-[#080d17] p-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{choice.label}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                          {choice.description}
                        </p>
                        <div className="mt-2 font-mono text-xs text-sky-300">
                          {choice.consequencePreview}
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={!check.allowed}
                          onClick={() => onResolveChoice(evt.id, choice.id)}
                          className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                        >
                          Choose This Response
                        </button>
                        {!check.allowed && check.reason && (
                          <p className="mt-1.5 text-[11px] text-amber-400">{check.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Main Split: Focused Sol Actions + Mission Objectives & Station Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Recommended Sol Actions */}
        <section className="space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                Choose Actions for Sol {state.sol}
              </h2>
              <p className="text-xs text-slate-400">
                {showAllActions
                  ? 'Showing all 9 available actions. Pick up to 3 before advancing.'
                  : 'Top 4 recommended actions based on current outpost telemetry (max 3).'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-sky-300">
                {state.queuedDirectives.length} / 3 Selected
              </span>
              <button
                type="button"
                onClick={() => setShowAllActions((v) => !v)}
                className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                {showAllActions ? 'Show Recommended (4)' : 'Show All 9 Actions'}
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {visibleDirectives.map((dir) => {
              const selected = state.queuedDirectives.includes(dir.id);
              const check = canQueueDirective(state, dir.id);
              const disabled = !selected && !check.allowed;

              return (
                <button
                  key={dir.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleDirective(dir.id)}
                  className={`flex flex-col justify-between rounded border p-3.5 text-left transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-950/45'
                      : disabled
                      ? 'cursor-not-allowed border-slate-800/70 bg-[#070b14]/50 opacity-55'
                      : 'border-slate-800 bg-[#070b14] hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{dir.label}</span>
                      <span
                        className={`font-mono text-[10px] font-semibold uppercase ${
                          selected ? 'text-emerald-300' : 'text-sky-400'
                        }`}
                      >
                        {selected ? 'Selected' : 'Pick'}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-sky-300">{dir.shortEffect}</div>
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                      {dir.description}
                    </p>
                  </div>
                  {disabled && check.reason && (
                    <div className="mt-2 text-[11px] text-amber-400">{check.reason}</div>
                  )}
                </button>
              );
            })}
          </div>

          {state.campaignStatus === 'active' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-400">
                Projected Battery next Sol:{' '}
                <strong className="font-mono tabular-nums text-slate-200">
                  {Math.max(
                    0,
                    Math.min(
                      state.resources.batteryCapacityKwh,
                      Math.round(state.resources.batteryKwh + balances.netPowerKw * 1.8)
                    )
                  )}{' '}
                  kWh
                </strong>{' '}
                ({batteryPct}% now)
              </div>
              <button
                type="button"
                onClick={onAdvanceSol}
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
              >
                <span>Execute &amp; Advance to Sol {state.sol + 1}</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-300">
                Campaign status: <strong className="text-white uppercase">{state.campaignStatus}</strong>
              </span>
              <button
                type="button"
                onClick={onOpenReport}
                className="rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Open Final Mission Report
              </button>
            </div>
          )}
        </section>

        {/* Right: Mission Goals, Quick Actions & Event History */}
        <div className="space-y-4 lg:col-span-5">
          {/* Mission Objectives */}
          <section className="rounded border border-slate-800 bg-[#0b111e] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Mission Goals</h2>
              <span className="font-mono text-xs tabular-nums text-sky-300">
                {completedObjectives} / {state.objectives.length} Done
              </span>
            </div>
            <ul className="space-y-3">
              {state.objectives.map((obj) => (
                <li
                  key={obj.id}
                  className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-2.5 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{obj.title}</div>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                      {obj.description}
                    </p>
                    <div className="mt-1 font-mono text-[11px] text-sky-300">
                      {obj.progressText}
                    </div>
                  </div>
                  {obj.completed ? (
                    <StatusIndicator status="nominal" label="Done" />
                  ) : (
                    <StatusIndicator status="caution" label="Active" />
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Direct Station Shortcuts */}
          <section className="rounded border border-slate-800 bg-[#0b111e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Outpost Operations</h2>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => onSelectTab('base')}
                className="flex items-center gap-2 rounded border border-slate-800 bg-[#070b14] px-3 py-2.5 text-left text-slate-200 hover:border-sky-500/60"
              >
                <Hammer className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Build &amp; Repair</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('crew')}
                className="flex items-center gap-2 rounded border border-slate-800 bg-[#070b14] px-3 py-2.5 text-left text-slate-200 hover:border-sky-500/60"
              >
                <Users className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span>Assign Crew</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('explore')}
                className="flex items-center gap-2 rounded border border-slate-800 bg-[#070b14] px-3 py-2.5 text-left text-slate-200 hover:border-sky-500/60"
              >
                <Compass className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span>Explore &amp; Tech</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenHub('advisor')}
                className="flex items-center gap-2 rounded border border-slate-800 bg-[#070b14] px-3 py-2.5 text-left text-slate-200 hover:border-sky-500/60"
              >
                <Bot className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                <span>Ask AI Advisor</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              <span>{scenario.scienceFocus}</span>
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-1 font-mono text-sky-400 hover:underline whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Score Projection</span>
              </button>
            </div>
          </section>

          {/* Past Event Decisions Archive (Collapsible) */}
          {resolvedEvents.length > 0 && (
            <section className="rounded border border-slate-800 bg-[#0b111e] p-4">
              <button
                type="button"
                onClick={() => setShowHistoryEvents((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-200"
              >
                <span>Past Decisions ({resolvedEvents.length})</span>
                <span className="font-mono text-sky-400">
                  {showHistoryEvents ? 'Hide' : 'Show'}
                </span>
              </button>
              {showHistoryEvents && (
                <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs">
                  {resolvedEvents.map((evt) => (
                    <li key={evt.id} className="space-y-0.5">
                      <div className="font-medium text-white">
                        Sol {evt.solTriggered}: {evt.title}
                      </div>
                      <div className="text-slate-400">
                        Chose &ldquo;{evt.chosenOptionLabel}&rdquo; ·{' '}
                        <span className="font-mono text-emerald-400">{evt.outcomeSummary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">{SIMULATION_DISCLAIMER}</p>
    </div>
  );
}

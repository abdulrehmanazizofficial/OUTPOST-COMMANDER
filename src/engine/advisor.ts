import { SCENARIOS } from './data';
import { computeBaseBalances } from './simulation';
import type { GameState, ScreenId } from './types';

export interface AdvisorRecommendation {
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  rationale: string;
  suggestedSection: string;
  targetScreen: ScreenId;
}

export interface AdvisorReport {
  source: 'gemini' | 'deterministic-fallback';
  model?: string;
  advisoryNotice: string;
  riskLevel: 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  situationSummary: string;
  recommendations: AdvisorRecommendation[];
  scienceNote: string;
}

function mapSectionToScreen(section: string): ScreenId {
  const s = section.toLowerCase();
  if (s.includes('base') || s.includes('sim')) return 'base';
  if (s.includes('crew')) return 'crew';
  if (s.includes('resource') || s.includes('power') || s.includes('water')) return 'resources';
  if (s.includes('construct')) return 'construction';
  if (s.includes('explor')) return 'exploration';
  if (s.includes('event')) return 'events';
  if (s.includes('research') || s.includes('science')) return 'research';
  return 'dashboard';
}

export function generateDeterministicAdvice(state: GameState, question?: string): AdvisorReport {
  const balances = computeBaseBalances(state);
  const batteryPct = Math.round((state.resources.batteryKwh / state.resources.batteryCapacityKwh) * 100);
  const avgFatigue = Math.round(state.crew.reduce((a, c) => a + c.fatigue, 0) / state.crew.length);
  const avgHealth = Math.round(state.crew.reduce((a, c) => a + c.health, 0) / state.crew.length);
  const damagedModules = state.modules.filter((m) => m.status === 'damaged');
  const unresolvedEvents = state.events.filter((e) => !e.resolved);

  const recommendations: AdvisorRecommendation[] = [];

  if (unresolvedEvents.length > 0) {
    recommendations.push({
      priority: 'URGENT',
      title: `Resolve Active Anomaly: ${unresolvedEvents[0].title}`,
      rationale: `${unresolvedEvents.length} unresolved mission event(s) require commander disposition before advancing the Sol.`,
      suggestedSection: 'Mission Events',
      targetScreen: 'events',
    });
  }

  if (balances.netPowerKw < 0 || batteryPct < 40) {
    const solar = state.modules.find((m) => m.id === 'solar_array');
    if (solar && solar.conditionPct < 80) {
      recommendations.push({
        priority: 'URGENT',
        title: 'Repair Solar Power Array & Prioritize Life Support',
        rationale: `Power balance is ${balances.netPowerKw} kW with Battery at ${batteryPct}% and Solar Array condition at ${Math.round(solar.conditionPct)}%.`,
        suggestedSection: 'Lunar Base Simulator',
        targetScreen: 'base',
      });
    } else {
      recommendations.push({
        priority: 'HIGH',
        title: 'Switch Power Bus to Conservation or Life Support First',
        rationale: `Current electrical demand (${balances.powerDemandKw} kW) exceeds generation (${balances.powerGenerationKw} kW). Conserve battery before shadow phases.`,
        suggestedSection: 'Resource Management',
        targetScreen: 'resources',
      });
    }
  }

  if (state.resources.oxygenPct < 55 || balances.oxygenDelta < 0) {
    recommendations.push({
      priority: 'URGENT',
      title: 'Inspect Life Support & Assign Medical/Engineering Oversight',
      rationale: `Oxygen reserves at ${Math.round(state.resources.oxygenPct)}% (projected ${balances.oxygenDelta >= 0 ? '+' : ''}${balances.oxygenDelta}%/Sol).`,
      suggestedSection: 'Mission Control Dashboard',
      targetScreen: 'dashboard',
    });
  }

  if (state.resources.waterPct < 55 || balances.waterDelta < 0) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Increase Water Recycling or Target PSR Water-Ice Site',
      rationale: `Water reserves sit at ${Math.round(state.resources.waterPct)}% with net ${balances.waterDelta}%/Sol delta.`,
      suggestedSection: 'Resource Management',
      targetScreen: 'resources',
    });
  }

  if (
    state.resources.foodPct < 55 &&
    state.modules.some((m) => m.id === 'greenhouse' && m.status === 'unbuilt')
  ) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Construct Hydroponic Greenhouse',
      rationale: `Food inventory is ${Math.round(state.resources.foodPct)}% and no Greenhouse is yet built to offset crew consumption.`,
      suggestedSection: 'Construction & Infrastructure',
      targetScreen: 'construction',
    });
  }

  if (damagedModules.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      title: `Repair Damaged Hardware (${damagedModules.map((m) => m.name).join(', ')})`,
      rationale: 'Damaged modules operate at ~52% efficiency while drawing full maintenance attention.',
      suggestedSection: 'Lunar Base Simulator',
      targetScreen: 'base',
    });
  }

  if (avgFatigue > 60 || avgHealth < 70) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Schedule Crew Rest & Recovery Rotation',
      rationale: `Average crew fatigue is ${avgFatigue}% and health is ${avgHealth}%. Fatigued crew lose task efficiency.`,
      suggestedSection: 'Crew Management',
      targetScreen: 'crew',
    });
  }

  if (
    state.environment.radiationLevel !== 'Nominal' &&
    state.modules.some((m) => m.id === 'radiation_shelter' && m.status === 'unbuilt')
  ) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Prepare Radiation Protection / Construct Shelter',
      rationale: `Solar radiation level is ${state.environment.radiationLevel}; shielding is currently ${Math.round(state.resources.radiationShieldingPct)}%.`,
      suggestedSection: 'Construction & Infrastructure',
      targetScreen: 'construction',
    });
  }

  if (recommendations.length < 2) {
    const nextObjective = state.objectives.find((o) => !o.completed);
    recommendations.push({
      priority: 'MEDIUM',
      title: nextObjective ? `Advance Objective: ${nextObjective.title}` : 'Expand Scientific Output',
      rationale: nextObjective
        ? `Core systems are stable. Focus on "${nextObjective.description}" (${nextObjective.progressText}).`
        : 'Outpost telemetry is nominal. Consider researching upgrades or launching surface expeditions.',
      suggestedSection: 'Research & Science Center',
      targetScreen: 'research',
    });
  }

  let riskLevel: AdvisorReport['riskLevel'] = 'NOMINAL';
  if (
    state.resources.oxygenPct < 35 ||
    batteryPct < 20 ||
    avgHealth < 55 ||
    unresolvedEvents.some((e) => e.severity === 'Critical')
  ) {
    riskLevel = 'CRITICAL';
  } else if (
    balances.netPowerKw < -4 ||
    state.resources.waterPct < 45 ||
    state.resources.foodPct < 45 ||
    damagedModules.length > 0
  ) {
    riskLevel = 'HIGH';
  } else if (unresolvedEvents.length > 0 || avgFatigue > 55) {
    riskLevel = 'ELEVATED';
  }

  const questionContext = question?.trim()
    ? ` Addressing your query ("${question.trim()}"):`
    : '';

  return {
    source: 'deterministic-fallback',
    advisoryNotice:
      'Advisory Only — Generated by deterministic Mission Operations Rules Engine. Never modifies game resources automatically.',
    riskLevel,
    situationSummary: `Sol ${state.sol} of ${state.targetSols} (${SCENARIOS[state.config.scenario].title}).${questionContext} Outpost power balance is ${balances.netPowerKw >= 0 ? '+' : ''}${balances.netPowerKw} kW with ${batteryPct}% battery, ${Math.round(state.resources.oxygenPct)}% O2, ${Math.round(state.resources.waterPct)}% H2O, and ${Math.round(state.resources.foodPct)}% food.`,
    recommendations: recommendations.slice(0, 4),
    scienceNote:
      'Lunar south-pole operations balance continuous solar ridge harvesting against multi-day crater shadowing, electrostatic dust abrasion, and closed-loop ECLSS recycling.',
  };
}

export async function fetchAiAdvisorReport(
  state: GameState,
  question?: string
): Promise<AdvisorReport> {
  const deterministic = generateDeterministicAdvice(state, question);
  const batteryPct = Math.round((state.resources.batteryKwh / state.resources.batteryCapacityKwh) * 100);

  const snapshot = {
    missionName: state.config.missionName,
    commanderName: state.config.commanderName,
    scenarioTitle: SCENARIOS[state.config.scenario].title,
    difficulty: state.config.difficulty,
    sol: state.sol,
    targetSols: state.targetSols,
    environment: {
      solarIlluminationPct: state.environment.solarIlluminationPct,
      surfaceTempC: state.environment.surfaceTempC,
      radiationLevel: state.environment.radiationLevel,
      dustStormActive: state.environment.dustHazardActive,
      commsQualityPct: Math.round(state.resources.commsQualityPct),
    },
    resources: {
      powerGeneration: state.resources.powerGeneration,
      powerDemand: state.resources.powerDemand,
      batteryPct,
      oxygenPct: Math.round(state.resources.oxygenPct),
      waterPct: Math.round(state.resources.waterPct),
      foodPct: Math.round(state.resources.foodPct),
      radiationShieldingPct: Math.round(state.resources.radiationShieldingPct),
      materials: Math.round(state.resources.materials),
      researchPoints: Math.round(state.resources.researchPoints),
    },
    crewSummary: {
      count: state.crew.length,
      avgHealth: Math.round(state.crew.reduce((a, c) => a + c.health, 0) / state.crew.length),
      avgFatigue: Math.round(state.crew.reduce((a, c) => a + c.fatigue, 0) / state.crew.length),
      avgMorale: Math.round(state.crew.reduce((a, c) => a + c.morale, 0) / state.crew.length),
    },
    damagedModules: state.modules.filter((m) => m.status === 'damaged').map((m) => m.name),
    unbuiltCriticalModules: state.modules
      .filter((m) => m.status === 'unbuilt' && ['greenhouse', 'science_lab', 'radiation_shelter', 'rover_garage'].includes(m.id))
      .map((m) => m.name),
    activeEvents: state.events.filter((e) => !e.resolved).map((e) => `${e.title} (${e.severity})`),
    incompleteObjectives: state.objectives.filter((o) => !o.completed).map((o) => `${o.title}: ${o.progressText}`),
  };

  try {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, snapshot }),
    });
    if (!res.ok) return deterministic;
    const data = await res.json();
    if (data.source === 'gemini' && data.advice) {
      const recs = Array.isArray(data.advice.recommendations)
        ? data.advice.recommendations.map(
            (r: { priority?: string; title?: string; rationale?: string; suggestedSection?: string }) => ({
              priority: (['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(r.priority || '')
                ? r.priority
                : 'MEDIUM') as AdvisorRecommendation['priority'],
              title: r.title || 'Review Outpost Telemetry',
              rationale: r.rationale || '',
              suggestedSection: r.suggestedSection || 'Mission Control Dashboard',
              targetScreen: mapSectionToScreen(r.suggestedSection || ''),
            })
          )
        : deterministic.recommendations;

      return {
        source: 'gemini',
        model: data.model || 'gemini-4-hydrogen',
        advisoryNotice: data.advisoryNotice,
        riskLevel: (['NOMINAL', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(data.advice.riskLevel)
          ? data.advice.riskLevel
          : deterministic.riskLevel) as AdvisorReport['riskLevel'],
        situationSummary: data.advice.situationSummary || deterministic.situationSummary,
        recommendations: recs,
        scienceNote: data.advice.scienceNote || deterministic.scienceNote,
      };
    }
    return deterministic;
  } catch {
    return deterministic;
  }
}

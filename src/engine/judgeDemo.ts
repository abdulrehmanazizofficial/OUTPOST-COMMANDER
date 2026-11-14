import {
  advanceSol,
  computeBaseBalances,
  createNewCampaign,
  evaluateObjectives,
  recalculateLiveDerivedMetrics,
  setPowerPriority,
  toggleModuleActive,
  toggleQueuedDirective,
} from './simulation';
import type { GameState } from './types';

export type JudgeChoiceId =
  | 'prioritize_life_support'
  | 'preserve_battery'
  | 'continue_science';

export interface JudgeChoiceDefinition {
  id: JudgeChoiceId;
  title: string;
  subtitle: string;
  engineActionSummary: string;
  intendedTradeOff: string;
}

export interface JudgeMetricsSnapshot {
  batteryKwh: number;
  batteryPct: number;
  powerGenerationKw: number;
  powerDemandKw: number;
  netPowerKw: number;
  oxygenPct: number;
  waterPct: number;
  foodPct: number;
  thermalControlPct: number;
  radiationShieldingPct: number;
  crewAvgHealth: number;
  crewAvgMorale: number;
  crewAvgFatigue: number;
  crewSafetyPct: number;
  researchPoints: number;
  materials: number;
  solarConditionPct: number;
  solarStatus: string;
}

export interface JudgeDecisionOutcome {
  choiceId: JudgeChoiceId;
  choiceTitle: string;
  beforeState: GameState;
  afterState: GameState;
  before: JudgeMetricsSnapshot;
  after: JudgeMetricsSnapshot;
  tradeOffSummary: string;
  gainedHeadline: string;
  costHeadline: string;
  scienceTakeaway: string;
  executedDirectives: string[];
}

export const JUDGE_DEMO_CHOICES: JudgeChoiceDefinition[] = [
  {
    id: 'prioritize_life_support',
    title: 'Prioritize Life Support',
    subtitle: 'Route remaining power to ECLSS oxygen & water loops while shedding non-essential Science Lab load.',
    engineActionSummary: 'Life Support Bus Priority · Standby Science Lab · Tune ECLSS & Shielding',
    intendedTradeOff: 'Protects breathable O2 and crew safety, while battery drains further and science pauses.',
  },
  {
    id: 'preserve_battery',
    title: 'Preserve Battery Power',
    subtitle: 'Enter energy conservation mode, power down labs & greenhouse, and repair the damaged solar array.',
    engineActionSummary: 'Conservation Bus Priority · Standby Labs & Greenhouse · Solar Dust Sweep',
    intendedTradeOff: 'Saves battery reserves and restores solar generation, at the cost of food yield and research.',
  },
  {
    id: 'continue_science',
    title: 'Continue Scientific Operations',
    subtitle: 'Keep all research labs running at peak output to maximize lunar discovery despite low power.',
    engineActionSummary: 'Science Push Bus Priority · Focused Research Campaign · Full Module Load',
    intendedTradeOff: 'Surges Research Points rapidly, but critically depletes batteries, habitat heating, and crew health.',
  },
];

export const JUDGE_SCIENCE_TAKEAWAY =
  'Near the lunar south pole, crater rims cast long shadows and sunlight strikes solar panels near the horizon. NASA Artemis architectures must balance real-time load shedding, regenerative batteries, and closed-loop life support (ECLSS) so crew safety never fails when power drops.';

export function createJudgeDemoState(): GameState {
  const base = createNewCampaign({
    commanderName: 'Cmdr. Elena Vance',
    missionName: 'Shackleton Rim Power Demo',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'power_crisis',
  });

  const next = structuredClone(base);
  next.tutorialDismissed = true;
  next.autoSaveEnabled = false;

  // Bring Science Lab online so power allocation trade-offs across
  // Life Support, Energy Conservation, and Scientific Operations are real and measurable.
  const lab = next.modules.find((m) => m.id === 'science_lab');
  if (lab) {
    lab.status = 'operational';
    lab.conditionPct = 90;
  }

  // Preset urgent power crisis snapshot (37% battery in warning zone with -33 kW net deficit)
  next.resources.batteryKwh = 74;
  next.resources.oxygenPct = 74;
  next.resources.waterPct = 72;
  next.resources.foodPct = 76;
  next.resources.materials = 120;
  next.resources.researchPoints = 34;
  next.environment.solarIlluminationPct = 86;
  next.environment.phaseLabel = 'Damaged Photovoltaic Grid';
  next.events = [];

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);

  const bal = computeBaseBalances(next);
  next.history = [
    {
      sol: 1,
      powerGeneration: bal.powerGenerationKw,
      powerDemand: bal.powerDemandKw,
      batteryPct: Math.round((next.resources.batteryKwh / next.resources.batteryCapacityKwh) * 100),
      oxygenPct: Math.round(next.resources.oxygenPct),
      waterPct: Math.round(next.resources.waterPct),
      foodPct: Math.round(next.resources.foodPct),
      avgHealth: Math.round(next.crew.reduce((a, c) => a + c.health, 0) / next.crew.length),
      avgMorale: Math.round(next.crew.reduce((a, c) => a + c.morale, 0) / next.crew.length),
      avgFatigue: Math.round(next.crew.reduce((a, c) => a + c.fatigue, 0) / next.crew.length),
      researchPoints: next.resources.researchPoints,
      equipmentAvgPct: bal.equipmentAvgPct,
      operationalModules: next.modules.filter((m) => m.status === 'operational').length,
    },
  ];

  return next;
}

export function extractJudgeMetrics(state: GameState): JudgeMetricsSnapshot {
  const crewAvgHealth = Math.round(
    state.crew.reduce((sum, c) => sum + c.health, 0) / Math.max(1, state.crew.length)
  );
  const crewAvgMorale = Math.round(
    state.crew.reduce((sum, c) => sum + c.morale, 0) / Math.max(1, state.crew.length)
  );
  const crewAvgFatigue = Math.round(
    state.crew.reduce((sum, c) => sum + c.fatigue, 0) / Math.max(1, state.crew.length)
  );
  const crewSafetyPct = Math.round(crewAvgHealth * 0.65 + state.resources.radiationShieldingPct * 0.35);
  const solar = state.modules.find((m) => m.id === 'solar_array');
  const bal = computeBaseBalances(state);

  return {
    batteryKwh: Math.round(state.resources.batteryKwh),
    batteryPct: Math.round(
      (state.resources.batteryKwh / Math.max(1, state.resources.batteryCapacityKwh)) * 100
    ),
    powerGenerationKw: bal.powerGenerationKw,
    powerDemandKw: bal.powerDemandKw,
    netPowerKw: bal.netPowerKw,
    oxygenPct: Math.round(state.resources.oxygenPct),
    waterPct: Math.round(state.resources.waterPct),
    foodPct: Math.round(state.resources.foodPct),
    thermalControlPct: Math.round(state.resources.thermalControlPct),
    radiationShieldingPct: Math.round(state.resources.radiationShieldingPct),
    crewAvgHealth,
    crewAvgMorale,
    crewAvgFatigue,
    crewSafetyPct,
    researchPoints: Math.round(state.resources.researchPoints),
    materials: Math.round(state.resources.materials),
    solarConditionPct: Math.round(solar?.conditionPct ?? 0),
    solarStatus: solar?.status ?? 'unbuilt',
  };
}

export function executeJudgeDecision(
  baseState: GameState,
  choiceId: JudgeChoiceId
): JudgeDecisionOutcome {
  const beforeState = structuredClone(baseState);
  const before = extractJudgeMetrics(beforeState);
  let working = structuredClone(baseState);
  const choiceDef = JUDGE_DEMO_CHOICES.find((c) => c.id === choiceId)!;

  if (choiceId === 'prioritize_life_support') {
    working = setPowerPriority(working, 'life_support_first');
    working = toggleModuleActive(working, 'science_lab').nextState;
    working = toggleQueuedDirective(working, 'inspect_eclss');
    working = toggleQueuedDirective(working, 'boost_shielding');
  } else if (choiceId === 'preserve_battery') {
    working = setPowerPriority(working, 'conservation');
    working = toggleModuleActive(working, 'science_lab').nextState;
    working = toggleModuleActive(working, 'greenhouse').nextState;
    working = toggleQueuedDirective(working, 'repair_solar');
  } else {
    working = setPowerPriority(working, 'science_push');
    working = toggleQueuedDirective(working, 'focused_research');
  }

  // Execute the actual simulation step (deterministic seed avoids unrelated random events)
  const afterState = advanceSol(working, 0.92);
  afterState.autoSaveEnabled = true;
  afterState.tutorialDismissed = true;
  afterState.day = 2;
  afterState.sol = 2;
  afterState.targetDays = 10;
  afterState.targetSols = 10;
  afterState.campaignStatus = 'active';

  const after = extractJudgeMetrics(afterState);

  const o2Diff = after.oxygenPct - before.oxygenPct;
  const batDiff = after.batteryKwh - before.batteryKwh;
  const foodDiff = after.foodPct - before.foodPct;
  const rpDiff = after.researchPoints - before.researchPoints;
  const healthDiff = after.crewAvgHealth - before.crewAvgHealth;
  const safetyDiff = after.crewSafetyPct - before.crewSafetyPct;
  const thermalDiff = after.thermalControlPct - before.thermalControlPct;

  let gainedHeadline = '';
  let costHeadline = '';
  let tradeOffSummary = '';

  if (choiceId === 'prioritize_life_support') {
    gainedHeadline = `Oxygen ${o2Diff >= 0 ? `+${o2Diff}` : o2Diff}% · Crew Safety ${safetyDiff >= 0 ? `+${safetyDiff}` : safetyDiff}%`;
    costHeadline = `Battery ${batDiff} kWh · Science limited (+${rpDiff} RP)`;
    tradeOffSummary =
      'Shedding the Science Lab kept Life Support and Water loops at full power while ECLSS tuning boosted breathable oxygen and habitat shielding. Battery reserves still fell because the Solar Array remains unrepaired.';
  } else if (choiceId === 'preserve_battery') {
    gainedHeadline = `Saved ${Math.abs(batDiff) < 15 ? 'battery buffer' : 'power'} (${after.batteryPct}% left) · Solar repaired to ${after.solarConditionPct}%`;
    costHeadline = `Food ${foodDiff}% · Research slowed (+${rpDiff} RP)`;
    tradeOffSummary =
      'Powering down non-essential modules and sending engineers to sweep regolith dust off the Solar Array stabilized the power grid for future Mission Days. Pausing the Greenhouse reduced food reserves in exchange for grid survival.';
  } else {
    gainedHeadline = `Research surged +${rpDiff} RP (${before.researchPoints} → ${after.researchPoints})`;
    costHeadline = `Battery plunged to ${after.batteryPct}% · Thermal ${thermalDiff}% · Crew Health ${healthDiff}%`;
    tradeOffSummary =
      'Running every lab under Science Push delivered major scientific output, but caused severe battery depletion. Habitat heaters lost margin and crew health, morale, and thermal stability dropped sharply.';
  }

  return {
    choiceId,
    choiceTitle: choiceDef.title,
    beforeState,
    afterState,
    before,
    after,
    tradeOffSummary,
    gainedHeadline,
    costHeadline,
    scienceTakeaway: JUDGE_SCIENCE_TAKEAWAY,
    executedDirectives: afterState.lastSolSummary?.directivesApplied ?? [],
  };
}

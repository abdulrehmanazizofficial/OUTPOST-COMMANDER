import {
  CADET_CHECKPOINTS,
  DIFFICULTY_MODIFIERS,
  EVENT_TEMPLATES,
  INITIAL_CREW_ROSTER,
  MASTER_CADET_BADGE,
  SCENARIOS,
  SOL_DIRECTIVES,
  createInitialModules,
  createInitialResearch,
  createInitialSites,
} from './data';
import type {
  ActiveExpedition,
  CadetCheckpoint,
  CampaignConfig,
  CampaignOutcomeTier,
  CrewMember,
  CrewTask,
  GameState,
  LogCategory,
  LogEntry,
  MissionEvent,
  MissionObjective,
  MissionScoreBreakdown,
  ModuleId,
  ModuleState,
  PowerPriorityMode,
  ScenarioId,
  SolDirectiveId,
  TrainingMode,
} from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function defaultTaskForRole(role: CrewMember['role']): CrewTask {
  switch (role) {
    case 'Mission Commander':
      return 'Operations';
    case 'Engineer':
      return 'Power & Repairs';
    case 'Scientist':
      return 'Research';
    case 'Medical Officer':
      return 'Life Support';
    case 'Robotics Specialist':
      return 'Exploration';
    case 'Agricultural Specialist':
      return 'Agriculture';
  }
}

function buildScenarioObjectives(scenario: ScenarioId, targetSols: number): MissionObjective[] {
  const common: MissionObjective[] = [
    {
      id: 'obj-survive',
      title: `Sustain Outpost Through Sol ${targetSols}`,
      description: 'Maintain crew survival and core habitat habitability across the full campaign.',
      completed: false,
      progressText: `Sol 1 / ${targetSols}`,
    },
    {
      id: 'obj-tech',
      title: 'Advance Lunar Technology (3+ Upgrades)',
      description: 'Unlock at least 3 nodes in the Research & Science Center.',
      completed: false,
      progressText: '0 / 3 researched',
    },
  ];

  switch (scenario) {
    case 'first_outpost':
      return [
        ...common,
        {
          id: 'obj-greenhouse',
          title: 'Commission Greenhouse & Science Lab',
          description: 'Construct both the Greenhouse and Science Laboratory to achieve self-sustaining science.',
          completed: false,
          progressText: '0 / 2 operational',
        },
        {
          id: 'obj-explore-2',
          title: 'Complete 2 Surface Expeditions',
          description: 'Build a Rover Garage and complete 2 lunar surface expeditions.',
          completed: false,
          progressText: '0 / 2 completed',
        },
      ];
    case 'water_ice':
      return [
        ...common,
        {
          id: 'obj-psr-ice',
          title: 'Sample a Permanently Shadowed Region',
          description: 'Complete an expedition to Shackleton PSR Margin or Cabeus Ice Prospect.',
          completed: false,
          progressText: '0 / 1 PSR site sampled',
        },
        {
          id: 'obj-water-reserves',
          title: 'Maintain ≥ 75% Water Reserves',
          description: 'Keep water storage healthy through extraction and recycling.',
          completed: false,
          progressText: 'Tracking water level',
        },
      ];
    case 'power_crisis':
      return [
        ...common,
        {
          id: 'obj-solar-repair',
          title: 'Restore Solar Array Above 85%',
          description: 'Repair the damaged Solar Power Array and upgrade Battery Storage to Level 2.',
          completed: false,
          progressText: 'Solar < 85% / Battery Lv 1',
        },
        {
          id: 'obj-battery-buffer',
          title: 'Build 60%+ Battery Buffer',
          description: 'Stabilize outpost energy reserves above 60% capacity.',
          completed: false,
          progressText: 'Monitoring charge',
        },
      ];
    case 'dust_emergency':
      return [
        ...common,
        {
          id: 'obj-dust-mitigation',
          title: 'Research Electrodynamic Dust Shields',
          description: 'Unlock Electrodynamic Dust Shields to protect exposed hardware.',
          completed: false,
          progressText: 'Locked',
        },
        {
          id: 'obj-restore-systems',
          title: 'Restore All Core Modules ≥ 85% Condition',
          description: 'Clean and repair Main Habitat, Solar Array, Life Support, and Comms Array.',
          completed: false,
          progressText: 'Pending repairs',
        },
      ];
    case 'long_night':
      return [
        ...common,
        {
          id: 'obj-shelter-upgrade',
          title: 'Upgrade Battery Storage & Radiation Shelter',
          description: 'Keep Radiation Shelter operational and upgrade Battery Storage to Level 2+.',
          completed: false,
          progressText: 'Battery Lv 1',
        },
        {
          id: 'obj-morale-keep',
          title: 'Preserve Crew Health & Morale ≥ 70%',
          description: 'Protect the crew from thermal stress and isolation fatigue.',
          completed: false,
          progressText: 'Monitoring crew',
        },
      ];
  }
}

export function createNewCampaign(rawConfig: CampaignConfig): GameState {
  const scenarioDef = SCENARIOS[rawConfig.scenario];
  const diff = DIFFICULTY_MODIFIERS[rawConfig.difficulty];
  const crewSize = clamp(Math.round(rawConfig.crewSize), 3, 6);
  const targetDays = scenarioDef.targetDays || scenarioDef.targetSols || 10;
  const trainingMode: TrainingMode = rawConfig.trainingMode || 'cadet';

  const modules = createInitialModules(rawConfig.scenario);
  const research = createInitialResearch();
  const sites = createInitialSites();

  const crew: CrewMember[] = INITIAL_CREW_ROSTER.slice(0, crewSize).map((base) => ({
    ...base,
    health: clamp(Math.round(92 * diff.resourceMultiplier), 72, 100),
    fatigue: rawConfig.difficulty === 'hard' ? 24 : 14,
    morale: clamp(Math.round(86 * diff.resourceMultiplier), 68, 98),
    task: defaultTaskForRole(base.role),
    onExpeditionId: null,
  }));

  const batteryCapacityKwh = 200;
  const startBattery = clamp(
    Math.round(scenarioDef.startingModifiers.batteryKwh * diff.resourceMultiplier),
    40,
    batteryCapacityKwh
  );

  const initialCheckpoint =
    trainingMode === 'cadet' && CADET_CHECKPOINTS.length > 0
      ? structuredClone(CADET_CHECKPOINTS[0])
      : null;

  const state: GameState = {
    version: 1,
    campaignId: makeId('cmp'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      commanderName: rawConfig.commanderName.trim() || 'Commander Vance',
      missionName: rawConfig.missionName.trim() || 'Artemis South Outpost Alpha',
      crewSize,
      difficulty: rawConfig.difficulty,
      scenario: rawConfig.scenario,
      trainingMode,
    },
    day: 1,
    targetDays,
    sol: 1,
    targetSols: targetDays,
    lunarCycleDay: 1,
    trainingMode,
    activeCheckpoint: initialCheckpoint,
    cadetBadges: [],
    cadetAnswers: {},
    campaignStatus: 'active',
    endlessMode: false,
    powerPriority: 'balanced',
    emergencyPreparednessActive: false,
    resources: {
      powerGeneration: 0,
      powerDemand: 0,
      batteryKwh: startBattery,
      batteryCapacityKwh,
      oxygenPct: clamp(Math.round(scenarioDef.startingModifiers.oxygenPct * diff.resourceMultiplier), 45, 100),
      waterPct: clamp(Math.round(scenarioDef.startingModifiers.waterPct * diff.resourceMultiplier), 45, 100),
      foodPct: clamp(Math.round(scenarioDef.startingModifiers.foodPct * diff.resourceMultiplier), 45, 100),
      radiationShieldingPct: rawConfig.scenario === 'long_night' ? 80 : 48,
      thermalControlPct: rawConfig.scenario === 'long_night' ? 72 : 88,
      commsQualityPct: rawConfig.scenario === 'dust_emergency' ? 68 : 86,
      materials: Math.max(55, scenarioDef.startingModifiers.materials + diff.materialBonus),
      researchPoints: scenarioDef.startingModifiers.researchPoints,
    },
    environment: {
      solarIlluminationPct: scenarioDef.startingModifiers.solarBasePct,
      surfaceTempC: scenarioDef.startingModifiers.nightActive ? -168 : -42,
      radiationLevel: rawConfig.scenario === 'long_night' ? 'Elevated' : 'Nominal',
      dustHazardActive: Boolean(scenarioDef.startingModifiers.dustActive),
      nightPhaseActive: Boolean(scenarioDef.startingModifiers.nightActive),
      phaseLabel: scenarioDef.startingModifiers.nightActive
        ? 'Low-Sun Eclipse Window'
        : scenarioDef.startingModifiers.dustActive
        ? 'Electrostatic Dust Plume'
        : 'Nominal Sunlit Ridge',
    },
    modules,
    crew,
    research,
    sites,
    activeExpeditions: [],
    events: [],
    objectives: buildScenarioObjectives(rawConfig.scenario, targetDays),
    queuedDirectives: [],
    logs: [
      {
        id: makeId('log'),
        sol: 1,
        category: 'Objective',
        title: `Mission Initialized: ${scenarioDef.title}`,
        detail: `${rawConfig.missionName || 'Artemis South Outpost Alpha'} assumed command under ${diff.label} difficulty with ${crewSize} crew members (${trainingMode === 'cadet' ? 'Cadet Training Track' : 'Commander Sandbox'}).`,
        severity: 'info',
      },
    ],
    history: [],
    lastSolSummary: null,
    discoveries: [],
    tutorialDismissed: false,
    autoSaveEnabled: true,
  };

  // Seed initial contextual alert for scenarios with active crisis
  if (rawConfig.scenario === 'power_crisis') {
    state.events.push(instantiateEvent('evt-battery-thermal', 1));
  } else if (rawConfig.scenario === 'dust_emergency') {
    state.events.push(instantiateEvent('evt-dust-coating', 1));
  }

  recalculateLiveDerivedMetrics(state);
  evaluateObjectives(state);
  state.history.push(createHistorySnapshot(state));
  return state;
}

function instantiateEvent(templateId: string, sol: number): MissionEvent {
  const tpl = EVENT_TEMPLATES.find((t) => t.id === templateId) || EVENT_TEMPLATES[0];
  return {
    id: makeId('evt'),
    templateId: tpl.id,
    solTriggered: sol,
    title: tpl.title,
    description: tpl.description,
    severity: tpl.severity,
    affectedSystems: tpl.affectedSystems,
    educationalNote: tpl.educationalNote,
    choices: tpl.choices.map((c) => ({ ...c, effects: { ...c.effects } })),
    resolved: false,
  };
}

export interface BaseBalancePreview {
  powerGenerationKw: number;
  powerDemandKw: number;
  netPowerKw: number;
  oxygenDelta: number;
  waterDelta: number;
  foodDelta: number;
  researchDelta: number;
  shieldingTotalPct: number;
  commsTargetPct: number;
  equipmentAvgPct: number;
}

export function computeBaseBalances(state: GameState): BaseBalancePreview {
  const diff = DIFFICULTY_MODIFIERS[state.config.difficulty];
  const hasEclssTech = isResearched(state, 'res-eclss-1');
  const hasWaterTech = isResearched(state, 'res-water-1');
  const hasAgriTech = isResearched(state, 'res-agri-1');
  const hasRadTech = isResearched(state, 'res-rad-1');
  const hasHabTech = isResearched(state, 'res-hab-1');

  const crewCount = state.crew.length;
  const availableCrew = state.crew.filter((c) => !c.onExpeditionId);

  const roleMatchesTask = (role: CrewMember['role'], task: CrewTask): boolean =>
    (role === 'Mission Commander' && task === 'Operations') ||
    (role === 'Engineer' && task === 'Power & Repairs') ||
    (role === 'Scientist' && task === 'Research') ||
    (role === 'Medical Officer' && (task === 'Life Support' || task === 'Rest & Recovery')) ||
    (role === 'Robotics Specialist' && (task === 'Exploration' || task === 'Power & Repairs')) ||
    (role === 'Agricultural Specialist' && task === 'Agriculture');

  const taskSkill = (task: CrewTask): number =>
    availableCrew
      .filter((c) => c.task === task)
      .reduce((acc, c) => {
        const synergy = roleMatchesTask(c.role, task) ? 1.35 : 1.0;
        return acc + c.skill * synergy * (1 - c.fatigue / 220);
      }, 0);

  const repairSkill = taskSkill('Power & Repairs');
  const lifeSupportSkill = taskSkill('Life Support');
  const agriSkill = taskSkill('Agriculture');
  const researchSkill = taskSkill('Research');
  const opsSkill = taskSkill('Operations');

  let powerGen = 0;
  let powerDemand = 0;
  let o2Prod = 0;
  let waterProd = 0;
  let foodProd = 0;
  let researchGain = 2 + Math.round(researchSkill * 0.65);
  let shieldingSum = 12 + (hasRadTech ? 15 : 0);
  let commsSum = 12;

  const demandMultiplier =
    (hasHabTech ? 0.85 : 1.0) *
    (state.powerPriority === 'conservation' ? 0.82 : state.powerPriority === 'science_push' ? 1.1 : 1.0);

  for (const mod of state.modules) {
    if (mod.status !== 'operational' && mod.status !== 'damaged') continue;
    const eff =
      (mod.status === 'damaged' ? 0.52 : 1.0) *
      clamp(mod.conditionPct / 100, 0.35, 1.0) *
      (1 + (mod.level - 1) * 0.28);

    if (mod.powerDrawKw < 0) {
      const solarFactor = state.environment.solarIlluminationPct / 100;
      const engineerBoost = 1 + Math.min(0.25, repairSkill * 0.015);
      powerGen += Math.abs(mod.powerDrawKw) * eff * solarFactor * engineerBoost;
    } else {
      // Load shedding in life_support_first reduces non-essential power draw slightly
      const priorityFactor =
        state.powerPriority === 'life_support_first' &&
        (mod.category === 'Science' || mod.category === 'Exploration')
          ? 0.55
          : 1.0;
      powerDemand += mod.powerDrawKw * (1 + (mod.level - 1) * 0.14) * demandMultiplier * priorityFactor;
    }

    if (mod.oxygenDelta > 0) {
      const eclssMult = (hasEclssTech ? 1.25 : 1.0) * (1 + Math.min(0.25, lifeSupportSkill * 0.015));
      o2Prod += mod.oxygenDelta * eff * eclssMult;
    } else {
      o2Prod += mod.oxygenDelta;
    }

    if (mod.waterDelta > 0) {
      const waterMult = (hasWaterTech ? 1.25 : 1.0) * (1 + Math.min(0.2, lifeSupportSkill * 0.012));
      waterProd += mod.waterDelta * eff * waterMult;
    } else {
      waterProd += mod.waterDelta;
    }

    if (mod.foodDelta > 0) {
      const agriMult = (hasAgriTech ? 1.3 : 1.0) * (1 + Math.min(0.3, agriSkill * 0.02));
      foodProd += mod.foodDelta * eff * agriMult;
    } else {
      foodProd += mod.foodDelta;
    }

    if (mod.researchDelta > 0) {
      const sciMult = state.powerPriority === 'science_push' ? 1.25 : 1.0;
      researchGain += mod.researchDelta * eff * sciMult;
    }

    shieldingSum += mod.shieldingBonus * eff;
    commsSum += mod.commsBonus * eff;
  }

  // Crew baseline consumption (illustrative per Sol)
  const crewO2Use = crewCount * 1.65 * diff.consumptionMultiplier;
  const crewWaterUse = crewCount * 1.45 * diff.consumptionMultiplier;
  const crewFoodUse = crewCount * 1.55 * diff.consumptionMultiplier;

  // Directive modifiers preview
  let dirO2 = 0;
  let dirWater = 0;
  let dirFood = 0;
  let dirResearch = 0;
  let dirPowerCost = 0;

  for (const d of state.queuedDirectives) {
    if (d === 'extra_food') {
      dirFood += 8;
      dirWater -= 4;
      dirPowerCost += 5;
    } else if (d === 'recycle_water') {
      dirWater += 9;
      dirPowerCost += 6;
    } else if (d === 'inspect_eclss') {
      dirO2 += 6;
    } else if (d === 'focused_research') {
      dirResearch += 14;
      dirPowerCost += 6;
    } else if (d === 'maintain_comms') {
      dirPowerCost += 4;
    } else if (d === 'emergency_prep') {
      dirPowerCost += 5;
    }
  }

  const builtModules = state.modules.filter((m) => m.status !== 'unbuilt');
  const equipmentAvgPct =
    builtModules.length > 0
      ? Math.round(builtModules.reduce((acc, m) => acc + m.conditionPct, 0) / builtModules.length)
      : 100;

  const opsBonus = Math.min(8, opsSkill * 0.5);

  return {
    powerGenerationKw: round1(powerGen),
    powerDemandKw: round1(powerDemand + dirPowerCost * 0.4),
    netPowerKw: round1(powerGen - (powerDemand + dirPowerCost * 0.4)),
    oxygenDelta: round1(o2Prod - crewO2Use + dirO2 + opsBonus * 0.15),
    waterDelta: round1(waterProd - crewWaterUse + dirWater),
    foodDelta: round1(foodProd - crewFoodUse + dirFood),
    researchDelta: Math.round(researchGain + dirResearch),
    shieldingTotalPct: clamp(Math.round(shieldingSum), 0, 100),
    commsTargetPct: clamp(Math.round(commsSum), 0, 100),
    equipmentAvgPct,
  };
}

export function isResearched(state: GameState, researchId: string): boolean {
  return state.research.some((r) => r.id === researchId && r.unlocked);
}

export function recalculateLiveDerivedMetrics(state: GameState): void {
  const balances = computeBaseBalances(state);
  state.resources.powerGeneration = balances.powerGenerationKw;
  state.resources.powerDemand = balances.powerDemandKw;

  // Calibrated physical units (grounded in NASA STD-3001 & ISS ECLSS baselines)
  state.resources.oxygenKg = round1((state.resources.oxygenPct / 100) * 120);
  state.resources.waterLiters = Math.round((state.resources.waterPct / 100) * 500);
  state.resources.foodKcal = Math.round((state.resources.foodPct / 100) * 120 * 2800);
  state.resources.materialsKg = Math.round(state.resources.materials * 25);

  // Synchronize day & sol properties
  state.day = state.day || state.sol || 1;
  state.sol = state.day;
  state.targetDays = state.targetDays || state.targetSols || 10;
  state.targetSols = state.targetDays;
  state.lunarCycleDay = ((state.day - 1) % 30) + 1;

  // Shielding combines passive hull/shelter mitigation plus manual regolith reinforcements (capped cleanly)
  const shelterMod = state.modules.find((m) => m.id === 'radiation_shelter');
  if (shelterMod && shelterMod.status === 'inactive') {
    state.resources.radiationShieldingPct = clamp(balances.shieldingTotalPct, 0, 100);
  } else {
    state.resources.radiationShieldingPct = clamp(
      Math.max(state.resources.radiationShieldingPct, balances.shieldingTotalPct),
      0,
      100
    );
  }

  // Comms reflects Comms Array availability
  const commsModule = state.modules.find((m) => m.id === 'comms_array');
  if (commsModule && commsModule.status !== 'operational' && commsModule.status !== 'damaged') {
    state.resources.commsQualityPct = 20;
  } else if (state.resources.commsQualityPct < 25) {
    state.resources.commsQualityPct = Math.min(balances.commsTargetPct, 45);
  }
}

export interface ActionCheckResult {
  allowed: boolean;
  reason?: string;
}

export function canConstructModule(state: GameState, moduleId: ModuleId): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is already concluded.' };
  }
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) return { allowed: false, reason: 'Module not found.' };
  if (mod.status !== 'unbuilt') {
    return { allowed: false, reason: `${mod.name} is already constructed or in progress.` };
  }
  if (mod.requiredResearchId && !isResearched(state, mod.requiredResearchId)) {
    const req = state.research.find((r) => r.id === mod.requiredResearchId);
    return {
      allowed: false,
      reason: `Requires research: "${req?.name || mod.requiredResearchId}" in the Research & Science Center.`,
    };
  }
  if (state.resources.materials < mod.buildCostMaterials) {
    return {
      allowed: false,
      reason: `Insufficient materials: needs ${mod.buildCostMaterials} units (${Math.floor(state.resources.materials)} available).`,
    };
  }
  return { allowed: true };
}

export function constructModule(state: GameState, moduleId: ModuleId): { nextState: GameState; message: string } {
  const check = canConstructModule(state, moduleId);
  if (!check.allowed) {
    throw new Error(check.reason || 'Cannot construct module.');
  }
  const next = structuredClone(state);
  const mod = next.modules.find((m) => m.id === moduleId)!;
  next.resources.materials -= mod.buildCostMaterials;
  mod.status = 'under_construction';
  mod.constructionSolRemaining = 1;
  mod.conditionPct = 100;

  appendLog(next, {
    category: 'Construction',
    title: `Construction Started: ${mod.name}`,
    detail: `Allocated ${mod.buildCostMaterials} material units. Commissioning completes at the start of Sol ${next.sol + 1}.`,
    severity: 'info',
  });

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `${mod.name} construction initiated (-${mod.buildCostMaterials} materials). Online next Sol.`,
  };
}

export function canUpgradeModule(state: GameState, moduleId: ModuleId): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is concluded.' };
  }
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) return { allowed: false, reason: 'Module not found.' };
  if (mod.status !== 'operational') {
    return { allowed: false, reason: `${mod.name} must be operational before upgrading.` };
  }
  if (mod.level >= mod.maxLevel) {
    return { allowed: false, reason: `${mod.name} is already at maximum Level ${mod.maxLevel}.` };
  }
  const cost = mod.upgradeCostMaterials * mod.level;
  if (state.resources.materials < cost) {
    return {
      allowed: false,
      reason: `Insufficient materials: Level ${mod.level + 1} upgrade requires ${cost} units (${Math.floor(state.resources.materials)} available).`,
    };
  }
  return { allowed: true };
}

export function upgradeModule(state: GameState, moduleId: ModuleId): { nextState: GameState; message: string } {
  const check = canUpgradeModule(state, moduleId);
  if (!check.allowed) throw new Error(check.reason || 'Cannot upgrade module.');

  const next = structuredClone(state);
  const mod = next.modules.find((m) => m.id === moduleId)!;
  const cost = mod.upgradeCostMaterials * mod.level;
  next.resources.materials -= cost;
  mod.level += 1;
  mod.conditionPct = clamp(mod.conditionPct + 10, 0, 100);

  if (mod.id === 'battery_storage') {
    next.resources.batteryCapacityKwh += 70;
    next.resources.batteryKwh = clamp(next.resources.batteryKwh + 25, 0, next.resources.batteryCapacityKwh);
  }

  appendLog(next, {
    category: 'Construction',
    title: `Upgraded ${mod.name} to Level ${mod.level}`,
    detail: `Invested ${cost} material units to boost module throughput and structural resilience.`,
    severity: 'success',
  });

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `${mod.name} upgraded to Level ${mod.level} (-${cost} materials).`,
  };
}

export function canRepairModule(state: GameState, moduleId: ModuleId): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is concluded.' };
  }
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) return { allowed: false, reason: 'Module not found.' };
  if (mod.status === 'unbuilt' || mod.status === 'under_construction') {
    return { allowed: false, reason: `${mod.name} is not yet built.` };
  }
  if (mod.conditionPct >= 98 && mod.status === 'operational') {
    return { allowed: false, reason: `${mod.name} is already in optimal condition.` };
  }
  const repairCost = mod.status === 'damaged' ? 14 : 8;
  if (state.resources.materials < repairCost) {
    return {
      allowed: false,
      reason: `Insufficient materials: repair requires ${repairCost} units (${Math.floor(state.resources.materials)} available).`,
    };
  }
  return { allowed: true };
}

export function repairModule(state: GameState, moduleId: ModuleId): { nextState: GameState; message: string } {
  const check = canRepairModule(state, moduleId);
  if (!check.allowed) throw new Error(check.reason || 'Cannot repair module.');

  const next = structuredClone(state);
  const mod = next.modules.find((m) => m.id === moduleId)!;
  const repairCost = mod.status === 'damaged' ? 14 : 8;
  next.resources.materials -= repairCost;
  mod.conditionPct = clamp(mod.conditionPct + 32, 0, 100);
  if (mod.status === 'damaged' && mod.conditionPct >= 65) {
    mod.status = 'operational';
  }

  appendLog(next, {
    category: 'Action',
    title: `Repaired ${mod.name}`,
    detail: `Spent ${repairCost} materials. Condition restored to ${Math.round(mod.conditionPct)}%.`,
    severity: 'success',
  });

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `${mod.name} repaired to ${Math.round(mod.conditionPct)}% (-${repairCost} materials).`,
  };
}

export function toggleModuleActive(state: GameState, moduleId: ModuleId): { nextState: GameState; message: string } {
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) throw new Error('Module not found.');
  if (mod.id === 'main_habitat' || mod.id === 'life_support') {
    throw new Error(`${mod.name} is critical life-support infrastructure and cannot be shut down.`);
  }
  if (mod.status !== 'operational' && mod.status !== 'inactive') {
    throw new Error(`${mod.name} cannot be toggled while ${mod.status.replace('_', ' ')}.`);
  }

  const next = structuredClone(state);
  const target = next.modules.find((m) => m.id === moduleId)!;
  target.status = target.status === 'operational' ? 'inactive' : 'operational';

  appendLog(next, {
    category: 'Action',
    title: `${target.name} set to ${target.status.toUpperCase()}`,
    detail:
      target.status === 'inactive'
        ? 'Placed on standby to conserve electrical power.'
        : 'Brought back online into active outpost grid.',
    severity: 'info',
  });

  recalculateLiveDerivedMetrics(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `${target.name} is now ${target.status}.`,
  };
}

export function assignCrewTask(state: GameState, crewId: string, task: CrewTask): GameState {
  const next = structuredClone(state);
  const member = next.crew.find((c) => c.id === crewId);
  if (!member) throw new Error('Crew member not found.');
  if (member.onExpeditionId) {
    throw new Error(`${member.name} is currently deployed on a surface expedition.`);
  }
  member.task = task;

  appendLog(next, {
    category: 'Action',
    title: `Crew Reassigned: ${member.name}`,
    detail: `${member.role} assigned to ${task}.`,
    severity: 'info',
  });

  recalculateLiveDerivedMetrics(next);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function canUnlockResearch(state: GameState, researchId: string): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is concluded.' };
  }
  const node = state.research.find((r) => r.id === researchId);
  if (!node) return { allowed: false, reason: 'Research node not found.' };
  if (node.unlocked) return { allowed: false, reason: `${node.name} is already researched.` };

  for (const pre of node.prerequisites) {
    const preNode = state.research.find((r) => r.id === pre);
    if (!preNode?.unlocked) {
      return {
        allowed: false,
        reason: `Prerequisite required: "${preNode?.name || pre}".`,
      };
    }
  }
  if (state.resources.researchPoints < node.cost) {
    return {
      allowed: false,
      reason: `Insufficient Research Points: needs ${node.cost} RP (${Math.floor(state.resources.researchPoints)} available).`,
    };
  }
  return { allowed: true };
}

export function unlockResearch(state: GameState, researchId: string): { nextState: GameState; message: string } {
  const check = canUnlockResearch(state, researchId);
  if (!check.allowed) throw new Error(check.reason || 'Cannot unlock research.');

  const next = structuredClone(state);
  const node = next.research.find((r) => r.id === researchId)!;
  next.resources.researchPoints -= node.cost;
  node.unlocked = true;

  if (node.id === 'res-solar-1') {
    next.resources.batteryCapacityKwh += 60;
    next.resources.batteryKwh = clamp(next.resources.batteryKwh + 20, 0, next.resources.batteryCapacityKwh);
  } else if (node.id === 'res-rad-1') {
    next.resources.radiationShieldingPct = clamp(next.resources.radiationShieldingPct + 15, 0, 100);
  } else if (node.id === 'res-hab-1') {
    next.resources.thermalControlPct = clamp(next.resources.thermalControlPct + 8, 0, 100);
  }

  appendLog(next, {
    category: 'Science',
    title: `Research Completed: ${node.name}`,
    detail: node.benefitSummary,
    severity: 'success',
  });

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `Unlocked ${node.name} (-${node.cost} RP).`,
  };
}

export function canLaunchExpedition(
  state: GameState,
  siteId: string,
  crewIds: string[]
): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is concluded.' };
  }
  const site = state.sites.find((s) => s.id === siteId);
  if (!site) return { allowed: false, reason: 'Site not found.' };

  const roverMod = state.modules.find((m) => m.id === 'rover_garage');
  if (!roverMod || (roverMod.status !== 'operational' && roverMod.status !== 'damaged')) {
    return {
      allowed: false,
      reason: 'Rover Garage must be constructed and operational before launching surface expeditions.',
    };
  }
  if (roverMod.conditionPct < site.minRoverCondition) {
    return {
      allowed: false,
      reason: `Rover Garage condition (${Math.round(roverMod.conditionPct)}%) is below site safety threshold (${site.minRoverCondition}%). Repair Rover Garage first.`,
    };
  }
  if (state.resources.commsQualityPct < site.minCommsPct) {
    return {
      allowed: false,
      reason: `Communications quality (${Math.round(state.resources.commsQualityPct)}%) is below required ${site.minCommsPct}% link margin.`,
    };
  }
  if (state.resources.batteryKwh < site.powerCostKwh + 15) {
    return {
      allowed: false,
      reason: `Insufficient battery reserve: requires ${site.powerCostKwh} kWh plus 15 kWh safety buffer.`,
    };
  }
  if (crewIds.length === 0) {
    return { allowed: false, reason: 'Select at least 1 available crew member for the expedition.' };
  }
  for (const cid of crewIds) {
    const member = state.crew.find((c) => c.id === cid);
    if (!member) return { allowed: false, reason: 'Selected crew member not found.' };
    if (member.onExpeditionId) {
      return { allowed: false, reason: `${member.name} is already deployed on an expedition.` };
    }
    if (member.fatigue >= 82 || member.health <= 45) {
      return {
        allowed: false,
        reason: `${member.name} requires rest/medical recovery before surface EVA (Fatigue ${Math.round(member.fatigue)}%, Health ${Math.round(member.health)}%).`,
      };
    }
  }
  if (state.activeExpeditions.some((e) => e.siteId === siteId)) {
    return { allowed: false, reason: `An expedition to ${site.name} is already underway.` };
  }
  return { allowed: true };
}

export function launchExpedition(
  state: GameState,
  siteId: string,
  crewIds: string[]
): { nextState: GameState; message: string } {
  const check = canLaunchExpedition(state, siteId, crewIds);
  if (!check.allowed) throw new Error(check.reason || 'Cannot launch expedition.');

  const next = structuredClone(state);
  const site = next.sites.find((s) => s.id === siteId)!;
  next.resources.batteryKwh = clamp(next.resources.batteryKwh - site.powerCostKwh, 0, next.resources.batteryCapacityKwh);

  const expId = makeId('exp');
  const expedition: ActiveExpedition = {
    id: expId,
    siteId: site.id,
    siteName: site.name,
    assignedCrewIds: [...crewIds],
    solsRemaining: site.durationSols,
    totalSols: site.durationSols,
    startedSol: next.sol,
  };
  next.activeExpeditions.push(expedition);

  for (const cid of crewIds) {
    const member = next.crew.find((c) => c.id === cid)!;
    member.onExpeditionId = expId;
    member.task = 'Exploration';
  }

  appendLog(next, {
    category: 'Action',
    title: `Expedition Launched: ${site.name}`,
    detail: `${crewIds.length} crew deployed (${site.durationSols} Sol duration, -${site.powerCostKwh} kWh rover charge).`,
    severity: 'info',
  });

  recalculateLiveDerivedMetrics(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `Rover team dispatched to ${site.name} (-${site.powerCostKwh} kWh).`,
  };
}

export function canQueueDirective(state: GameState, directiveId: SolDirectiveId): ActionCheckResult {
  if (state.campaignStatus !== 'active') {
    return { allowed: false, reason: 'Campaign is concluded.' };
  }
  if (state.queuedDirectives.includes(directiveId)) {
    return { allowed: true }; // Toggling off is always allowed
  }
  if (state.queuedDirectives.length >= 3) {
    return { allowed: false, reason: 'Maximum 3 Sol Directives can be scheduled per Sol.' };
  }
  const def = SOL_DIRECTIVES.find((d) => d.id === directiveId);
  if (!def) return { allowed: false, reason: 'Directive not found.' };

  if (def.requiresModule) {
    const mod = state.modules.find((m) => m.id === def.requiresModule);
    if (!mod || (mod.status !== 'operational' && mod.status !== 'damaged')) {
      return {
        allowed: false,
        reason: `Requires ${mod?.name || def.requiresModule} to be built and online.`,
      };
    }
  }
  const committedMaterials = state.queuedDirectives.reduce((sum, id) => {
    const item = SOL_DIRECTIVES.find((x) => x.id === id);
    return sum + (item?.requiresMaterials || 0);
  }, 0);
  if (
    def.requiresMaterials &&
    state.resources.materials < committedMaterials + def.requiresMaterials
  ) {
    return {
      allowed: false,
      reason: `Requires ${def.requiresMaterials} additional materials (${Math.floor(
        state.resources.materials - committedMaterials
      )} uncommitted).`,
    };
  }
  return { allowed: true };
}

export function toggleQueuedDirective(state: GameState, directiveId: SolDirectiveId): GameState {
  const next = structuredClone(state);
  if (next.queuedDirectives.includes(directiveId)) {
    next.queuedDirectives = next.queuedDirectives.filter((id) => id !== directiveId);
  } else {
    const check = canQueueDirective(next, directiveId);
    if (!check.allowed) throw new Error(check.reason || 'Cannot queue directive.');
    next.queuedDirectives.push(directiveId);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function setPowerPriority(state: GameState, mode: PowerPriorityMode): GameState {
  const next = structuredClone(state);
  next.powerPriority = mode;
  recalculateLiveDerivedMetrics(next);
  appendLog(next, {
    category: 'Action',
    title: `Power Bus Priority: ${mode.replace(/_/g, ' ').toUpperCase()}`,
    detail: 'Adjusted electrical load distribution across habitat and science modules.',
    severity: 'info',
  });
  next.updatedAt = new Date().toISOString();
  return next;
}

export function canResolveEventChoice(
  state: GameState,
  eventId: string,
  choiceId: string
): ActionCheckResult {
  const evt = state.events.find((e) => e.id === eventId);
  if (!evt) return { allowed: false, reason: 'Event not found.' };
  if (evt.resolved) return { allowed: false, reason: 'Event already resolved.' };
  const choice = evt.choices.find((c) => c.id === choiceId);
  if (!choice) return { allowed: false, reason: 'Choice not found.' };

  if (choice.requiresMaterials && state.resources.materials < choice.requiresMaterials) {
    return {
      allowed: false,
      reason: `Requires ${choice.requiresMaterials} materials (${Math.floor(state.resources.materials)} available).`,
    };
  }
  if (choice.requiresBatteryKwh && state.resources.batteryKwh < choice.requiresBatteryKwh) {
    return {
      allowed: false,
      reason: `Requires ${choice.requiresBatteryKwh} kWh battery reserve (${Math.round(state.resources.batteryKwh)} kWh available).`,
    };
  }
  return { allowed: true };
}

export function resolveEventChoice(
  state: GameState,
  eventId: string,
  choiceId: string
): { nextState: GameState; message: string } {
  const check = canResolveEventChoice(state, eventId, choiceId);
  if (!check.allowed) throw new Error(check.reason || 'Cannot resolve event.');

  const next = structuredClone(state);
  const evt = next.events.find((e) => e.id === eventId)!;
  const choice = evt.choices.find((c) => c.id === choiceId)!;
  const fx = choice.effects;

  // Apply preparedness mitigation on negative deltas
  const mitigate = (delta: number | undefined): number => {
    if (!delta) return 0;
    if (delta < 0 && next.emergencyPreparednessActive) {
      return Math.round(delta * 0.5);
    }
    return delta;
  };

  if (fx.batteryKwh) {
    next.resources.batteryKwh = clamp(
      next.resources.batteryKwh + mitigate(fx.batteryKwh),
      0,
      next.resources.batteryCapacityKwh
    );
  }
  if (fx.oxygenPct) next.resources.oxygenPct = clamp(next.resources.oxygenPct + mitigate(fx.oxygenPct), 0, 100);
  if (fx.waterPct) next.resources.waterPct = clamp(next.resources.waterPct + mitigate(fx.waterPct), 0, 100);
  if (fx.foodPct) next.resources.foodPct = clamp(next.resources.foodPct + mitigate(fx.foodPct), 0, 100);
  if (fx.materials) next.resources.materials = Math.max(0, next.resources.materials + fx.materials);
  if (fx.researchPoints) next.resources.researchPoints = Math.max(0, next.resources.researchPoints + fx.researchPoints);
  if (fx.radiationShieldingPct) {
    next.resources.radiationShieldingPct = clamp(
      next.resources.radiationShieldingPct + fx.radiationShieldingPct,
      0,
      100
    );
  }
  if (fx.commsQualityPct) {
    next.resources.commsQualityPct = clamp(next.resources.commsQualityPct + mitigate(fx.commsQualityPct), 0, 100);
  }

  for (const member of next.crew) {
    if (fx.crewHealthDelta) member.health = clamp(member.health + mitigate(fx.crewHealthDelta), 0, 100);
    if (fx.crewMoraleDelta) member.morale = clamp(member.morale + mitigate(fx.crewMoraleDelta), 0, 100);
    if (fx.crewFatigueDelta) member.fatigue = clamp(member.fatigue + fx.crewFatigueDelta, 0, 100);
  }

  const targetModId = fx.damageModuleId || fx.repairModuleId;
  if (targetModId && fx.moduleConditionDelta) {
    const mod = next.modules.find((m) => m.id === targetModId);
    if (mod && mod.status !== 'unbuilt') {
      const delta = fx.moduleConditionDelta < 0 ? mitigate(fx.moduleConditionDelta) : fx.moduleConditionDelta;
      mod.conditionPct = clamp(mod.conditionPct + delta, 15, 100);
      if (mod.conditionPct < 55) mod.status = 'damaged';
      else if (mod.status === 'damaged' && mod.conditionPct >= 65) mod.status = 'operational';
    }
  }

  if (next.emergencyPreparednessActive && (evt.severity === 'Warning' || evt.severity === 'Critical')) {
    next.emergencyPreparednessActive = false;
  }

  evt.resolved = true;
  evt.chosenOptionLabel = choice.label;
  evt.outcomeSummary = choice.consequencePreview;

  appendLog(next, {
    category: 'Event',
    title: `Resolved: ${evt.title}`,
    detail: `Selected "${choice.label}" (${choice.consequencePreview}).`,
    severity: evt.severity === 'Critical' ? 'warning' : 'info',
  });

  recalculateLiveDerivedMetrics(next);
  evaluateObjectives(next);
  next.updatedAt = new Date().toISOString();
  return {
    nextState: next,
    message: `Event resolved: ${choice.label}.`,
  };
}

export function advanceSol(state: GameState, randomSeedOverride?: number): GameState {
  if (state.campaignStatus !== 'active') {
    throw new Error('Cannot advance Sol on a concluded campaign.');
  }

  const next = structuredClone(state);
  const currentSol = next.sol;
  const diff = DIFFICULTY_MODIFIERS[next.config.difficulty];
  const hasDustShields = isResearched(next, 'res-robot-1');
  const hasCryoCoring = isResearched(next, 'res-explore-1');

  const highlights: string[] = [];
  const warnings: string[] = [];
  const directivesApplied: string[] = [];

  const prevO2 = next.resources.oxygenPct;
  const prevWater = next.resources.waterPct;
  const prevFood = next.resources.foodPct;
  const prevResearch = next.resources.researchPoints;

  // 1. Apply queued Sol directives
  for (const dirId of next.queuedDirectives) {
    const dirDef = SOL_DIRECTIVES.find((d) => d.id === dirId);
    if (!dirDef) continue;
    directivesApplied.push(dirDef.label);

    if (dirId === 'repair_solar') {
      const solar = next.modules.find((m) => m.id === 'solar_array');
      if (solar && next.resources.materials >= 8) {
        next.resources.materials -= 8;
        solar.conditionPct = clamp(solar.conditionPct + 16, 0, 100);
        if (solar.conditionPct >= 65 && solar.status === 'damaged') solar.status = 'operational';
        highlights.push(`Solar Array cleaned and calibrated (${Math.round(solar.conditionPct)}% condition).`);
      }
    } else if (dirId === 'inspect_eclss') {
      const eclss = next.modules.find((m) => m.id === 'life_support');
      if (eclss && next.resources.materials >= 6) {
        next.resources.materials -= 6;
        eclss.conditionPct = clamp(eclss.conditionPct + 12, 0, 100);
        if (eclss.conditionPct >= 65 && eclss.status === 'damaged') eclss.status = 'operational';
        next.resources.oxygenPct = clamp(next.resources.oxygenPct + 6, 0, 100);
        highlights.push('Life Support System inspected and O2 cartridges refreshed.');
      }
    } else if (dirId === 'boost_shielding') {
      if (next.resources.materials >= 10) {
        next.resources.materials -= 10;
        next.resources.radiationShieldingPct = clamp(next.resources.radiationShieldingPct + 10, 0, 100);
        highlights.push('Habitat regolith radiation shielding reinforced (+10%).');
      }
    } else if (dirId === 'rest_crew') {
      for (const c of next.crew) {
        if (!c.onExpeditionId) {
          c.fatigue = clamp(c.fatigue - 18, 0, 100);
          c.morale = clamp(c.morale + 10, 0, 100);
          c.health = clamp(c.health + 5, 0, 100);
        }
      }
      highlights.push('Crew completed rest & recovery rotation.');
    } else if (dirId === 'maintain_comms') {
      next.resources.commsQualityPct = clamp(next.resources.commsQualityPct + 14, 0, 100);
      highlights.push('Deep-Space Communications Array aligned (+14% link quality).');
    } else if (dirId === 'emergency_prep') {
      next.emergencyPreparednessActive = true;
      highlights.push('Emergency contingency kits staged for next anomaly.');
    } else if (dirId === 'focused_research') {
      for (const c of next.crew) {
        if (!c.onExpeditionId) c.fatigue = clamp(c.fatigue + 6, 0, 100);
      }
    }
  }

  // 2. Compute & apply base balances (includes directive power/O2/water/food/RP modifiers)
  const balances = computeBaseBalances(next);

  // Power & Battery update (illustrative scaling factor)
  const powerDeltaKwh = round1(balances.netPowerKw * 1.8);
  next.resources.batteryKwh = clamp(next.resources.batteryKwh + powerDeltaKwh, 0, next.resources.batteryCapacityKwh);

  const blackoutActive = next.resources.batteryKwh <= 0 && balances.netPowerKw < 0;
  if (next.resources.batteryKwh <= 10 || blackoutActive) {
    warnings.push(
      blackoutActive
        ? 'Total electrical blackout! Life-support and lab output severely degraded.'
        : 'Critical battery depletion! Non-essential thermal heaters strained.'
    );
    next.resources.thermalControlPct = clamp(next.resources.thermalControlPct - 12, 20, 100);
    for (const c of next.crew) {
      c.health = clamp(c.health - 6, 0, 100);
      c.morale = clamp(c.morale - 6, 0, 100);
    }
  } else {
    next.resources.thermalControlPct = clamp(next.resources.thermalControlPct + 2, 20, 100);
  }

  // Oxygen, Water, Food, Research updates (reduced if total blackout)
  const o2Change = blackoutActive && balances.oxygenDelta > 0 ? round1(balances.oxygenDelta * 0.35 - 2) : balances.oxygenDelta;
  const h2oChange = blackoutActive && balances.waterDelta > 0 ? round1(balances.waterDelta * 0.35 - 1.5) : balances.waterDelta;
  const foodChange = blackoutActive && balances.foodDelta > 0 ? round1(balances.foodDelta * 0.4 - 1.5) : balances.foodDelta;
  const rpGain = blackoutActive ? Math.round(balances.researchDelta * 0.25) : balances.researchDelta;

  next.resources.oxygenPct = clamp(round1(next.resources.oxygenPct + o2Change), 0, 100);
  next.resources.waterPct = clamp(round1(next.resources.waterPct + h2oChange), 0, 100);
  next.resources.foodPct = clamp(round1(next.resources.foodPct + foodChange), 0, 100);
  next.resources.researchPoints = Math.round(next.resources.researchPoints + rpGain);

  // Comms trends gradually toward commsTargetPct based on Comms Array tier & condition
  const commsDiff = balances.commsTargetPct - next.resources.commsQualityPct;
  next.resources.commsQualityPct = clamp(
    Math.round(next.resources.commsQualityPct + commsDiff * 0.35),
    15,
    100
  );

  // Apply resource scarcity penalties if O2, Water, or Food drop low
  if (next.resources.oxygenPct < 25) {
    warnings.push('Low Oxygen Reserves (<25%) — Crew health impacted.');
    for (const c of next.crew) c.health = clamp(c.health - 9, 0, 100);
  }
  if (next.resources.waterPct < 25) {
    warnings.push('Low Water Reserves (<25%) — Crew hydration and morale impacted.');
    for (const c of next.crew) {
      c.health = clamp(c.health - 6, 0, 100);
      c.morale = clamp(c.morale - 6, 0, 100);
    }
  }
  if (next.resources.foodPct < 25) {
    warnings.push('Low Food Inventory (<25%) — Rationing reduces morale and stamina.');
    for (const c of next.crew) {
      c.morale = clamp(c.morale - 7, 0, 100);
      c.fatigue = clamp(c.fatigue + 6, 0, 100);
    }
  }

  // 3. Complete constructions in progress
  for (const mod of next.modules) {
    if (mod.status === 'under_construction') {
      mod.constructionSolRemaining = Math.max(0, mod.constructionSolRemaining - 1);
      if (mod.constructionSolRemaining === 0) {
        mod.status = 'operational';
        mod.conditionPct = 100;
        if (mod.id === 'battery_storage') {
          next.resources.batteryCapacityKwh += 70;
        }
        highlights.push(`${mod.name} finished commissioning and is now operational.`);
        appendLog(next, {
          category: 'Construction',
          title: `Module Commissioned: ${mod.name}`,
          detail: `${mod.name} came online at 100% condition.`,
          severity: 'success',
        });
      }
    }
  }

  // 4. Equipment wear & dust effects
  const wearBase = next.environment.dustHazardActive ? (hasDustShields ? 2.5 : 5.2) : hasDustShields ? 1.2 : 2.2;
  const engineerRepairFactor = next.crew
    .filter((c) => !c.onExpeditionId && c.task === 'Power & Repairs')
    .reduce((acc, c) => acc + c.skill * 0.28, 0);

  for (const mod of next.modules) {
    if (mod.status === 'operational' || mod.status === 'damaged') {
      const wear = Math.max(0.5, wearBase - engineerRepairFactor * 0.35);
      mod.conditionPct = clamp(round1(mod.conditionPct - wear), 10, 100);
      if (mod.conditionPct < 55 && mod.status === 'operational') {
        mod.status = 'damaged';
        warnings.push(`${mod.name} degraded below 55% and requires repair.`);
        appendLog(next, {
          category: 'Warning',
          title: `Module Degraded: ${mod.name}`,
          detail: `Condition dropped to ${Math.round(mod.conditionPct)}%. Output reduced until repaired.`,
          severity: 'warning',
        });
      }
    }
  }

  // 5. Advance Crew fatigue, health, and morale
  const hasMedicalMod = next.modules.some((m) => m.id === 'medical_module' && m.status === 'operational');
  const medicalOfficerPresent = next.crew.some((c) => c.role === 'Medical Officer' && !c.onExpeditionId);

  for (const c of next.crew) {
    if (c.task === 'Rest & Recovery' && !c.onExpeditionId) {
      c.fatigue = clamp(c.fatigue - 22, 0, 100);
      c.health = clamp(c.health + (hasMedicalMod ? 10 : 6), 0, 100);
      c.morale = clamp(c.morale + 7, 0, 100);
    } else {
      const workFatigue = c.onExpeditionId ? 13 : 7;
      c.fatigue = clamp(c.fatigue + workFatigue, 0, 100);
    }

    if (c.fatigue > 80) {
      c.health = clamp(c.health - 4, 0, 100);
      c.morale = clamp(c.morale - 5, 0, 100);
    } else if (hasMedicalMod || medicalOfficerPresent) {
      c.health = clamp(c.health + 2, 0, 100);
    }

    if (next.environment.radiationLevel !== 'Nominal' && next.resources.radiationShieldingPct < 60) {
      c.health = clamp(c.health - 4, 0, 100);
    }
  }

  // 6. Advance Active Expeditions
  const completedExpIds: string[] = [];
  for (const exp of next.activeExpeditions) {
    exp.solsRemaining -= 1;
    if (exp.solsRemaining <= 0) {
      completedExpIds.push(exp.id);
      const site = next.sites.find((s) => s.id === exp.siteId);
      if (site) {
        const expStationBuilt = next.modules.some(
          (m) => m.id === 'exploration_station' && m.status === 'operational'
        );
        const yieldMult = (hasCryoCoring ? 1.35 : 1.0) * (expStationBuilt ? 1.25 : 1.0);
        const waterGain = Math.round(site.waterBonus * yieldMult);
        const matGain = Math.round(site.materialsBonus * (expStationBuilt ? 1.2 : 1.0));
        const resGain = Math.round(site.researchBonus * yieldMult);

        next.resources.waterPct = clamp(next.resources.waterPct + waterGain, 0, 100);
        next.resources.materials += matGain;
        next.resources.researchPoints += resGain;
        site.discovered = true;
        site.completedCount += 1;

        const discoveryMsg = `${site.name}: ${site.scienceSummary} (+${waterGain}% Water, +${matGain} Materials, +${resGain} RP)`;
        if (!next.discoveries.includes(discoveryMsg)) {
          next.discoveries.push(discoveryMsg);
        }
        highlights.push(`Expedition returned from ${site.name} (+${resGain} RP, +${waterGain}% Water).`);
        appendLog(next, {
          category: 'Science',
          title: `Expedition Completed: ${site.name}`,
          detail: `Yielded +${waterGain}% water, +${matGain} materials, and +${resGain} research points.`,
          severity: 'success',
        });

        // Reveal deeper sites progressively
        if (site.id === 'site-ridge') {
          const psr = next.sites.find((s) => s.id === 'site-shackleton-psr');
          if (psr) psr.discovered = true;
        } else if (site.id === 'site-shackleton-psr') {
          const shoemaker = next.sites.find((s) => s.id === 'site-shoemaker');
          const cabeus = next.sites.find((s) => s.id === 'site-cabeus');
          if (shoemaker) shoemaker.discovered = true;
          if (cabeus) cabeus.discovered = true;
        }
      }

      for (const cid of exp.assignedCrewIds) {
        const member = next.crew.find((c) => c.id === cid);
        if (member) {
          member.onExpeditionId = null;
          member.task = defaultTaskForRole(member.role);
          member.morale = clamp(member.morale + 5, 0, 100);
        }
      }
    }
  }
  next.activeExpeditions = next.activeExpeditions.filter((e) => !completedExpIds.includes(e.id));

  // 7. Advance Day / Sol & update Environment
  next.day = currentSol + 1;
  next.sol = next.day;
  next.lunarCycleDay = ((next.day - 1) % 30) + 1;
  next.queuedDirectives = [];

  // Trigger Cadet Checkpoint if on designated day in Cadet Mode
  if (next.trainingMode === 'cadet') {
    const chk = CADET_CHECKPOINTS.find((c) => c.dayTriggered === next.day);
    if (chk && !next.cadetAnswers?.[chk.id]) {
      next.activeCheckpoint = structuredClone(chk);
    }
  }

  updateEnvironmentForSol(next);

  // 8. Contextual Dynamic Event Generation (max 2 unresolved events at once)
  const unresolvedCount = next.events.filter((e) => !e.resolved).length;
  const roll = randomSeedOverride ?? Math.random();
  if (unresolvedCount < 2 && roll < diff.eventRiskFactor) {
    const hasGreenhouse = next.modules.some(
      (m) => m.id === 'greenhouse' && (m.status === 'operational' || m.status === 'damaged')
    );
    const hasRover = next.modules.some(
      (m) => m.id === 'rover_garage' && (m.status === 'operational' || m.status === 'damaged')
    );
    const hasScienceLab = next.modules.some(
      (m) => m.id === 'science_lab' && (m.status === 'operational' || m.status === 'damaged')
    );
    const hasShelter = next.modules.some(
      (m) => m.id === 'radiation_shelter' && (m.status === 'operational' || m.status === 'damaged')
    );

    const recentTemplates = new Set(next.events.slice(-3).map((e) => e.templateId));
    const eligible = EVENT_TEMPLATES.filter(
      (tpl) =>
        !recentTemplates.has(tpl.id) &&
        tpl.conditionCheck({
          hasGreenhouse,
          hasRover,
          hasScienceLab,
          hasShelter,
          scenario: next.config.scenario,
          sol: next.sol,
        })
    );

    if (eligible.length > 0) {
      const idx = Math.floor((roll * 1000) % eligible.length);
      const chosenTpl = eligible[idx];
      const evt = instantiateEvent(chosenTpl.id, next.sol);
      next.events.unshift(evt);
      warnings.push(`New Mission Event: ${evt.title}`);
      appendLog(next, {
        category: 'Event',
        title: `Event Triggered: ${evt.title}`,
        detail: `${evt.severity} — ${evt.description}`,
        severity: evt.severity === 'Critical' ? 'critical' : 'warning',
      });
    }
  }

  // 9. Update Objectives, Check Critical Failure or Campaign Completion
  evaluateObjectives(next);

  const avgHealth = next.crew.reduce((a, c) => a + c.health, 0) / next.crew.length;
  if (next.resources.oxygenPct <= 0 || avgHealth <= 15) {
    next.campaignStatus = 'interrupted';
    appendLog(next, {
      category: 'Warning',
      title: 'Emergency Crew Evacuation Ordered',
      detail:
        next.resources.oxygenPct <= 0
          ? 'Oxygen reserves exhausted; emergency ascent vehicle activated.'
          : 'Crew medical safety threshold breached; mission concluded early.',
      severity: 'critical',
    });
  } else if (!next.endlessMode && next.sol > next.targetSols) {
    next.campaignStatus = 'completed';
    appendLog(next, {
      category: 'Objective',
      title: `Primary ${next.targetSols}-Sol Campaign Completed`,
      detail: 'All scheduled campaign Sols completed. Final Mission Report is ready.',
      severity: 'success',
    });
  }

  // 10. End-of-Sol Summary & History Snapshot
  recalculateLiveDerivedMetrics(next);
  next.lastSolSummary = {
    solCompleted: currentSol,
    powerBalanceKw: balances.netPowerKw,
    oxygenDelta: round1(next.resources.oxygenPct - prevO2),
    waterDelta: round1(next.resources.waterPct - prevWater),
    foodDelta: round1(next.resources.foodPct - prevFood),
    researchGained: Math.round(next.resources.researchPoints - prevResearch),
    directivesApplied,
    highlights,
    warnings,
  };

  appendLog(next, {
    category: 'Resource',
    title: `End of Sol ${currentSol} Summary`,
    detail: `Net Power ${balances.netPowerKw >= 0 ? '+' : ''}${balances.netPowerKw} kW | O2 ${Math.round(next.resources.oxygenPct)}% | H2O ${Math.round(next.resources.waterPct)}% | Food ${Math.round(next.resources.foodPct)}% | RP ${next.resources.researchPoints}`,
    severity: warnings.length > 0 ? 'warning' : 'info',
  });

  next.history.push(createHistorySnapshot(next));
  next.updatedAt = new Date().toISOString();
  return next;
}

function updateEnvironmentForSol(state: GameState): void {
  const s = state.sol;
  const scenario = state.config.scenario;
  let solar = 85;
  let nightActive = false;
  let tempC = -44;
  let rad: GameState['environment']['radiationLevel'] = 'Nominal';
  let dust = scenario === 'dust_emergency' && s <= 6;
  let phaseLabel = 'Nominal Sunlit Ridge';

  if (scenario === 'long_night') {
    solar = s >= 4 && s <= 8 ? 24 : s === 3 || s === 9 ? 42 : 68;
    nightActive = s >= 3 && s <= 9;
    tempC = nightActive ? -178 : -92;
    phaseLabel = nightActive ? 'Deep Eclipse / Low Solar Horizon' : 'Twilight Ridge Transition';
  } else if (scenario === 'power_crisis') {
    solar = clamp(56 + (s % 3) * 8, 45, 80);
    tempC = -68;
    phaseLabel = 'Intermittent Crater Shadowing';
  } else if (scenario === 'dust_emergency') {
    solar = dust ? 64 : 84;
    tempC = -52;
    phaseLabel = dust ? 'Electrostatic Dust Plume' : 'Post-Plume Clearing';
  } else {
    // Periodic realistic low-sun dip around Sol 6-7
    if (s === 6 || s === 7) {
      solar = 58;
      tempC = -112;
      phaseLabel = 'Transient Crater Rim Shadow';
    } else {
      solar = 86 + ((s * 3) % 10);
      tempC = -38 - (s % 5) * 3;
      phaseLabel = 'Nominal Sunlit Ridge';
    }
  }

  if (s === 5 || s === 8) {
    rad = 'Elevated';
  }

  state.environment = {
    solarIlluminationPct: solar,
    surfaceTempC: tempC,
    radiationLevel: rad,
    dustHazardActive: dust,
    nightPhaseActive: nightActive,
    phaseLabel,
  };
}

export function evaluateObjectives(state: GameState): void {
  const unlockedResearchCount = state.research.filter((r) => r.unlocked).length;
  const completedExpeditionsCount = state.sites.reduce((acc, s) => acc + s.completedCount, 0);

  for (const obj of state.objectives) {
    if (obj.id === 'obj-survive') {
      const done = state.sol > state.targetSols || state.campaignStatus === 'completed';
      obj.completed = done;
      obj.progressText = done
        ? `${state.targetSols} / ${state.targetSols} Sols sustained`
        : `Sol ${Math.min(state.sol, state.targetSols)} / ${state.targetSols}`;
    } else if (obj.id === 'obj-tech') {
      obj.completed = unlockedResearchCount >= 3;
      obj.progressText = `${unlockedResearchCount} / 3 researched`;
    } else if (obj.id === 'obj-greenhouse') {
      const gh = state.modules.some((m) => m.id === 'greenhouse' && m.status === 'operational');
      const lab = state.modules.some((m) => m.id === 'science_lab' && m.status === 'operational');
      const count = (gh ? 1 : 0) + (lab ? 1 : 0);
      obj.completed = count === 2;
      obj.progressText = `${count} / 2 operational`;
    } else if (obj.id === 'obj-explore-2') {
      obj.completed = completedExpeditionsCount >= 2;
      obj.progressText = `${completedExpeditionsCount} / 2 completed`;
    } else if (obj.id === 'obj-psr-ice') {
      const psrDone = state.sites
        .filter((s) => s.terrainType === 'PSR Margin')
        .reduce((a, s) => a + s.completedCount, 0);
      obj.completed = psrDone >= 1;
      obj.progressText = `${psrDone} / 1 PSR site sampled`;
    } else if (obj.id === 'obj-water-reserves') {
      obj.completed = state.resources.waterPct >= 75;
      obj.progressText = `Current Water: ${Math.round(state.resources.waterPct)}% (Target ≥ 75%)`;
    } else if (obj.id === 'obj-solar-repair') {
      const solar = state.modules.find((m) => m.id === 'solar_array');
      const bat = state.modules.find((m) => m.id === 'battery_storage');
      const solarOk = (solar?.conditionPct || 0) >= 85;
      const batOk = (bat?.level || 1) >= 2;
      obj.completed = solarOk && batOk;
      obj.progressText = `Solar ${Math.round(solar?.conditionPct || 0)}% · Battery Lv ${bat?.level || 1}`;
    } else if (obj.id === 'obj-battery-buffer') {
      const pct = Math.round((state.resources.batteryKwh / state.resources.batteryCapacityKwh) * 100);
      obj.completed = pct >= 60;
      obj.progressText = `Battery Charge: ${pct}% (Target ≥ 60%)`;
    } else if (obj.id === 'obj-dust-mitigation') {
      const unlocked = isResearched(state, 'res-robot-1');
      obj.completed = unlocked;
      obj.progressText = unlocked ? 'Researched' : 'Not yet unlocked';
    } else if (obj.id === 'obj-restore-systems') {
      const coreIds: ModuleId[] = ['main_habitat', 'solar_array', 'life_support', 'comms_array'];
      const passing = coreIds.filter(
        (id) => (state.modules.find((m) => m.id === id)?.conditionPct || 0) >= 85
      ).length;
      obj.completed = passing === coreIds.length;
      obj.progressText = `${passing} / ${coreIds.length} core modules ≥ 85%`;
    } else if (obj.id === 'obj-shelter-upgrade') {
      const shelter = state.modules.find((m) => m.id === 'radiation_shelter');
      const bat = state.modules.find((m) => m.id === 'battery_storage');
      const ok = shelter?.status === 'operational' && (bat?.level || 1) >= 2;
      obj.completed = ok;
      obj.progressText = `Shelter ${shelter?.status || 'unbuilt'} · Battery Lv ${bat?.level || 1}`;
    } else if (obj.id === 'obj-morale-keep') {
      const avgHealth = Math.round(state.crew.reduce((a, c) => a + c.health, 0) / state.crew.length);
      const avgMorale = Math.round(state.crew.reduce((a, c) => a + c.morale, 0) / state.crew.length);
      obj.completed = avgHealth >= 70 && avgMorale >= 70;
      obj.progressText = `Health ${avgHealth}% · Morale ${avgMorale}%`;
    }
  }
}

export function continueEndlessOperations(state: GameState): GameState {
  const next = structuredClone(state);
  next.endlessMode = true;
  next.campaignStatus = 'active';
  appendLog(next, {
    category: 'Objective',
    title: 'Extended Lunar Operations Authorized',
    detail: 'Commander elected to continue outpost operations beyond the primary 10-Sol horizon.',
    severity: 'info',
  });
  next.updatedAt = new Date().toISOString();
  return next;
}

export function calculateMissionScore(state: GameState): MissionScoreBreakdown {
  const avgHealth = state.crew.reduce((a, c) => a + c.health, 0) / state.crew.length;
  const avgMorale = state.crew.reduce((a, c) => a + c.morale, 0) / state.crew.length;
  const avgFatigue = state.crew.reduce((a, c) => a + c.fatigue, 0) / state.crew.length;

  const crewSafetyScore = clamp(
    Math.round(avgHealth * 0.55 + avgMorale * 0.3 + (100 - avgFatigue) * 0.15),
    0,
    100
  );

  const batteryPct = (state.resources.batteryKwh / state.resources.batteryCapacityKwh) * 100;
  const resourceSustainabilityScore = clamp(
    Math.round(
      state.resources.oxygenPct * 0.3 +
        state.resources.waterPct * 0.25 +
        state.resources.foodPct * 0.25 +
        batteryPct * 0.2
    ),
    0,
    100
  );

  const builtModules = state.modules.filter((m) => m.status !== 'unbuilt');
  const avgCondition =
    builtModules.length > 0
      ? builtModules.reduce((a, m) => a + m.conditionPct, 0) / builtModules.length
      : 0;
  const expansionBonus = clamp((builtModules.length - 6) * 5, 0, 20);
  const infrastructureReliabilityScore = clamp(Math.round(avgCondition * 0.8 + expansionBonus), 0, 100);

  const unlockedCount = state.research.filter((r) => r.unlocked).length;
  const discoveryCount = state.discoveries.length;
  const scientificProgressScore = clamp(
    Math.round((unlockedCount / state.research.length) * 65 + Math.min(35, discoveryCount * 10)),
    0,
    100
  );

  const completedObjs = state.objectives.filter((o) => o.completed).length;
  const objectiveCompletionScore = Math.round((completedObjs / Math.max(1, state.objectives.length)) * 100);

  const totalScore = Math.round(
    crewSafetyScore * 0.3 +
      resourceSustainabilityScore * 0.25 +
      infrastructureReliabilityScore * 0.2 +
      scientificProgressScore * 0.15 +
      objectiveCompletionScore * 0.1
  );

  let outcomeTier: CampaignOutcomeTier;
  if (state.campaignStatus === 'interrupted') {
    outcomeTier = 'MISSION INTERRUPTED';
  } else if (totalScore >= 84 && completedObjs >= state.objectives.length - 1) {
    outcomeTier = 'OUTSTANDING SUCCESS';
  } else if (totalScore >= 68) {
    outcomeTier = 'SUCCESSFUL MISSION';
  } else {
    outcomeTier = 'PARTIAL SUCCESS';
  }

  return {
    totalScore,
    crewSafetyScore,
    resourceSustainabilityScore,
    infrastructureReliabilityScore,
    scientificProgressScore,
    objectiveCompletionScore,
    outcomeTier,
  };
}

export interface FinalReportAnalysis {
  score: MissionScoreBreakdown;
  daysCompleted: number;
  solsCompleted: number; // Backwards compatibility
  bestDecisions: string[];
  mistakesAndLessons: string[];
  majorChallenges: string[];
  outcomeExplanation: string;
  cadetBadgesEarned: string[];
  cadetSummary?: string;
}

export function evaluateFinalReport(state: GameState): FinalReportAnalysis {
  const score = calculateMissionScore(state);
  const daysCompleted = Math.max(0, (state.day || state.sol) - 1);
  const solsCompleted = daysCompleted;

  const bestDecisions: string[] = [];
  const mistakesAndLessons: string[] = [];
  const majorChallenges: string[] = [];

  const unlockedCount = state.research.filter((r) => r.unlocked).length;
  if (unlockedCount >= 3) {
    bestDecisions.push(`Completed ${unlockedCount} research breakthroughs, strengthening outpost self-reliance.`);
  }
  if (state.discoveries.length >= 2) {
    bestDecisions.push(`Executed ${state.discoveries.length} scientific surface discoveries across lunar south-pole terrain.`);
  }
  if (state.modules.some((m) => m.id === 'greenhouse' && m.status === 'operational')) {
    bestDecisions.push('Commissioned hydroponic Greenhouse production to stabilize long-term crew nutrition.');
  }
  if (state.modules.some((m) => m.id === 'radiation_shelter' && m.status === 'operational')) {
    bestDecisions.push('Constructed dedicated Radiation Shelter mass shielding for crew safety.');
  }
  if (bestDecisions.length === 0) {
    bestDecisions.push('Maintained core habitat pressurization and life-support continuity under constrained margins.');
  }

  if (state.resources.waterPct < 45) {
    mistakesAndLessons.push('Water reserves fell below 45%; earlier water recycling upgrades or PSR ice expeditions improve resilience.');
  }
  if (state.resources.batteryKwh / state.resources.batteryCapacityKwh < 0.35) {
    mistakesAndLessons.push('Battery storage finished critically low; pair Solar Array repairs with Battery Storage upgrades before shadow phases.');
  }
  const damagedCount = state.modules.filter((m) => m.status === 'damaged').length;
  if (damagedCount > 0) {
    mistakesAndLessons.push(`${damagedCount} module(s) ended damaged; proactive engineer assignments and dust shielding reduce wear.`);
  }
  const exhaustedCrew = state.crew.filter((c) => c.fatigue > 75).length;
  if (exhaustedCrew > 0) {
    mistakesAndLessons.push(`${exhaustedCrew} crew member(s) experienced high fatigue; schedule periodic Rest & Recovery rotations.`);
  }
  if (mistakesAndLessons.length === 0) {
    mistakesAndLessons.push('Resource reserves and equipment reliability remained balanced; continue optimizing autonomous dust mitigation.');
  }

  for (const evt of state.events.slice(0, 5)) {
    majorChallenges.push(`Day ${evt.solTriggered}: ${evt.title} (${evt.severity})`);
  }
  if (majorChallenges.length === 0) {
    majorChallenges.push('Managed baseline south-pole thermal, power, and closed-loop life support demands.');
  }

  const outcomeExplanation =
    score.outcomeTier === 'OUTSTANDING SUCCESS'
      ? 'Outpost Commander achieved exceptional crew safety, closed-loop resource sustainability, scientific progress, and scenario objectives.'
      : score.outcomeTier === 'SUCCESSFUL MISSION'
      ? 'The lunar outpost operated reliably through the mission window with healthy crew margins and constructive science returns.'
      : score.outcomeTier === 'PARTIAL SUCCESS'
      ? 'The crew survived the campaign, though resource deficits, deferred maintenance, or incomplete objectives constrained mission performance.'
      : 'Critical life-support or crew health thresholds forced an early emergency abort before completing the 10-day campaign.';

  const cadetBadgesEarned = state.cadetBadges || [];
  const cadetSummary =
    state.trainingMode === 'cadet'
      ? `Junior Astronaut Cadet Certification: Earned ${cadetBadgesEarned.length} Science Badge(s)${
          cadetBadgesEarned.length > 0 ? ` (${cadetBadgesEarned.join(', ')})` : ''
        }. Demonstrated systems-thinking mastery across lunar solar geometry, ECLSS recycling, and space radiation safety.`
      : undefined;

  return {
    score,
    daysCompleted,
    solsCompleted,
    bestDecisions,
    mistakesAndLessons,
    majorChallenges,
    outcomeExplanation,
    cadetBadgesEarned,
    cadetSummary,
  };
}

export function answerCadetCheckpoint(
  state: GameState,
  checkpointId: string,
  optionId: string
): {
  nextState: GameState;
  wasCorrect: boolean;
  badgeEarned?: string;
  explanation: string;
  message: string;
} {
  const next = structuredClone(state);
  const chk = CADET_CHECKPOINTS.find((c) => c.id === checkpointId);
  if (!chk) {
    return {
      nextState: next,
      wasCorrect: false,
      explanation: 'Checkpoint not found.',
      message: 'Unknown science checkpoint.',
    };
  }

  const selectedOpt = chk.options.find((o) => o.id === optionId);
  const wasCorrect = Boolean(selectedOpt?.correct);

  if (!next.cadetBadges) next.cadetBadges = [];
  if (!next.cadetAnswers) next.cadetAnswers = {};

  next.cadetAnswers[checkpointId] = optionId;

  let badgeEarned: string | undefined = undefined;
  if (wasCorrect) {
    if (!next.cadetBadges.includes(chk.badgeName)) {
      next.cadetBadges.push(chk.badgeName);
      badgeEarned = chk.badgeName;
    }
    next.resources.researchPoints += chk.rewardRp;

    const allCorrect = CADET_CHECKPOINTS.every((c) => {
      const chosenOptId = next.cadetAnswers[c.id];
      const chosenOpt = c.options.find((o) => o.id === chosenOptId);
      return chosenOpt?.correct === true;
    });
    if (allCorrect && !next.cadetBadges.includes(MASTER_CADET_BADGE)) {
      next.cadetBadges.push(MASTER_CADET_BADGE);
      badgeEarned = `${chk.badgeName} & ${MASTER_CADET_BADGE}`;
    }

    appendLog(next, {
      category: 'Science',
      title: `Cadet Checkpoint Mastered: ${chk.badgeName}`,
      detail: `Correct! ${chk.explanation} (+${chk.rewardRp} Research Points)`,
      severity: 'success',
    });
  } else {
    appendLog(next, {
      category: 'Science',
      title: `Cadet Checkpoint Reviewed: ${chk.topic}`,
      detail: `Educational Review: ${chk.explanation}`,
      severity: 'info',
    });
  }

  next.activeCheckpoint = null;
  recalculateLiveDerivedMetrics(next);
  next.updatedAt = new Date().toISOString();

  return {
    nextState: next,
    wasCorrect,
    badgeEarned,
    explanation: chk.explanation,
    message: wasCorrect
      ? `Correct! Earned "${chk.badgeName}" badge and +${chk.rewardRp} RP.`
      : `Reviewed: ${chk.explanation}`,
  };
}

export function dismissCadetCheckpoint(state: GameState): GameState {
  const next = structuredClone(state);
  next.activeCheckpoint = null;
  return next;
}

export const advanceDay = advanceSol;

function createHistorySnapshot(state: GameState) {
  const built = state.modules.filter((m) => m.status !== 'unbuilt');
  const operational = state.modules.filter((m) => m.status === 'operational').length;
  const equipmentAvgPct =
    built.length > 0 ? Math.round(built.reduce((a, m) => a + m.conditionPct, 0) / built.length) : 100;

  return {
    sol: state.sol,
    powerGeneration: state.resources.powerGeneration,
    powerDemand: state.resources.powerDemand,
    batteryPct: Math.round((state.resources.batteryKwh / state.resources.batteryCapacityKwh) * 100),
    oxygenPct: Math.round(state.resources.oxygenPct),
    waterPct: Math.round(state.resources.waterPct),
    foodPct: Math.round(state.resources.foodPct),
    avgHealth: Math.round(state.crew.reduce((a, c) => a + c.health, 0) / state.crew.length),
    avgMorale: Math.round(state.crew.reduce((a, c) => a + c.morale, 0) / state.crew.length),
    avgFatigue: Math.round(state.crew.reduce((a, c) => a + c.fatigue, 0) / state.crew.length),
    researchPoints: state.resources.researchPoints,
    equipmentAvgPct,
    operationalModules: operational,
  };
}

function appendLog(
  state: GameState,
  entry: { category: LogCategory; title: string; detail: string; severity: LogEntry['severity'] }
): void {
  state.logs.unshift({
    id: makeId('log'),
    sol: state.sol,
    ...entry,
  });
  if (state.logs.length > 250) {
    state.logs = state.logs.slice(0, 250);
  }
}

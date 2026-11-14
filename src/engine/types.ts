export type ScreenId =
  | 'overview'
  | 'dashboard'
  | 'base'
  | 'resources'
  | 'crew'
  | 'construction'
  | 'exploration'
  | 'events'
  | 'research'
  | 'advisor'
  | 'analytics'
  | 'logs'
  | 'report'
  | 'nasa_data'
  | 'settings';

export type DifficultyId = 'easy' | 'normal' | 'hard';

export type ScenarioId =
  | 'first_outpost'
  | 'water_ice'
  | 'power_crisis'
  | 'dust_emergency'
  | 'long_night';

export type ModuleId =
  | 'main_habitat'
  | 'solar_array'
  | 'battery_storage'
  | 'life_support'
  | 'water_facility'
  | 'greenhouse'
  | 'science_lab'
  | 'medical_module'
  | 'radiation_shelter'
  | 'comms_array'
  | 'rover_garage'
  | 'exploration_station';

export type ModuleStatus =
  | 'unbuilt'
  | 'under_construction'
  | 'operational'
  | 'damaged'
  | 'inactive';

export type CrewRole =
  | 'Mission Commander'
  | 'Engineer'
  | 'Scientist'
  | 'Medical Officer'
  | 'Robotics Specialist'
  | 'Agricultural Specialist';

export type CrewTask =
  | 'Operations'
  | 'Power & Repairs'
  | 'Life Support'
  | 'Agriculture'
  | 'Research'
  | 'Exploration'
  | 'Rest & Recovery';

export type ResearchCategory =
  | 'Life Support Technology'
  | 'Advanced Water Recycling'
  | 'Lunar Agriculture'
  | 'Solar Energy Storage'
  | 'Radiation Protection'
  | 'Autonomous Robotics'
  | 'Surface Exploration'
  | 'Habitat Efficiency';

export type SolDirectiveId =
  | 'extra_food'
  | 'recycle_water'
  | 'repair_solar'
  | 'inspect_eclss'
  | 'boost_shielding'
  | 'focused_research'
  | 'rest_crew'
  | 'maintain_comms'
  | 'emergency_prep';

export type LogCategory =
  | 'Action'
  | 'Resource'
  | 'Construction'
  | 'Event'
  | 'Science'
  | 'Objective'
  | 'Warning';

export type PowerPriorityMode = 'balanced' | 'life_support_first' | 'science_push' | 'conservation';

export type CampaignOutcomeTier =
  | 'OUTSTANDING SUCCESS'
  | 'SUCCESSFUL MISSION'
  | 'PARTIAL SUCCESS'
  | 'MISSION INTERRUPTED';

export interface ResourceState {
  powerGeneration: number; // kW illustrative output
  powerDemand: number; // kW illustrative load
  batteryKwh: number; // current stored energy
  batteryCapacityKwh: number; // max battery storage
  oxygenPct: number; // 0-100%
  waterPct: number; // 0-100%
  foodPct: number; // 0-100%
  radiationShieldingPct: number; // 0-100%
  thermalControlPct: number; // 0-100%
  commsQualityPct: number; // 0-100%
  materials: number; // structural & spare parts units
  researchPoints: number; // accumulated science/research points
  oxygenKg?: number;
  waterLiters?: number;
  foodKcal?: number;
  materialsKg?: number;
}

export interface EnvironmentalConditions {
  solarIlluminationPct: number; // 0-100%
  surfaceTempC: number; // °C illustrative lunar south pole temp
  radiationLevel: 'Nominal' | 'Elevated' | 'Solar Particle Alert';
  dustHazardActive: boolean;
  nightPhaseActive: boolean;
  phaseLabel: string;
}

export interface ModuleState {
  id: ModuleId;
  name: string;
  shortCode: string;
  category: 'Core' | 'Energy' | 'Life Support' | 'Science' | 'Exploration';
  description: string;
  status: ModuleStatus;
  level: number; // 1 to 3
  maxLevel: number;
  conditionPct: number; // 0-100%
  constructionSolRemaining: number;
  buildCostMaterials: number;
  upgradeCostMaterials: number;
  powerDrawKw: number; // negative if generates power, positive if consumes
  oxygenDelta: number;
  waterDelta: number;
  foodDelta: number;
  researchDelta: number;
  shieldingBonus: number;
  commsBonus: number;
  requiredResearchId?: string;
  svgX: number;
  svgY: number;
  scienceNote: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  skill: number; // 1-10
  health: number; // 0-100
  fatigue: number; // 0-100 (higher = more tired)
  morale: number; // 0-100
  task: CrewTask;
  onExpeditionId: string | null;
}

export interface ResearchNode {
  id: string;
  category: ResearchCategory;
  name: string;
  description: string;
  cost: number;
  prerequisites: string[];
  unlocked: boolean;
  benefitSummary: string;
  unlocksModuleId?: ModuleId;
}

export interface ExplorationSite {
  id: string;
  name: string;
  sectorCode: string;
  distanceKm: number;
  terrainType: 'Sunlit Ridge' | 'Crater Rim' | 'PSR Margin' | 'Regolith Basin';
  description: string;
  powerCostKwh: number;
  durationSols: number;
  minRoverCondition: number;
  minCommsPct: number;
  waterBonus: number;
  materialsBonus: number;
  researchBonus: number;
  mapX: number; // 0-100 %
  mapY: number; // 0-100 %
  discovered: boolean;
  completedCount: number;
  scienceSummary: string;
}

export interface ActiveExpedition {
  id: string;
  siteId: string;
  siteName: string;
  assignedCrewIds: string[];
  solsRemaining: number;
  totalSols: number;
  startedSol: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  consequencePreview: string;
  requiresMaterials?: number;
  requiresBatteryKwh?: number;
  effects: {
    batteryKwh?: number;
    oxygenPct?: number;
    waterPct?: number;
    foodPct?: number;
    materials?: number;
    researchPoints?: number;
    radiationShieldingPct?: number;
    commsQualityPct?: number;
    crewHealthDelta?: number;
    crewMoraleDelta?: number;
    crewFatigueDelta?: number;
    damageModuleId?: ModuleId;
    repairModuleId?: ModuleId;
    moduleConditionDelta?: number;
  };
}

export interface MissionEvent {
  id: string;
  templateId: string;
  solTriggered: number;
  title: string;
  description: string;
  severity: 'Info' | 'Caution' | 'Warning' | 'Critical';
  affectedSystems: string[];
  educationalNote: string;
  choices: EventChoice[];
  resolved: boolean;
  chosenOptionLabel?: string;
  outcomeSummary?: string;
}

export interface MissionObjective {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progressText: string;
}

export interface LogEntry {
  id: string;
  sol: number;
  category: LogCategory;
  title: string;
  detail: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
}

export interface SolHistoryEntry {
  sol: number;
  powerGeneration: number;
  powerDemand: number;
  batteryPct: number;
  oxygenPct: number;
  waterPct: number;
  foodPct: number;
  avgHealth: number;
  avgMorale: number;
  avgFatigue: number;
  researchPoints: number;
  equipmentAvgPct: number;
  operationalModules: number;
}

export interface SolSummary {
  solCompleted: number;
  powerBalanceKw: number;
  oxygenDelta: number;
  waterDelta: number;
  foodDelta: number;
  researchGained: number;
  directivesApplied: string[];
  highlights: string[];
  warnings: string[];
}

export type TrainingMode = 'cadet' | 'commander';

export interface CadetCheckpoint {
  id: string;
  dayTriggered: number;
  badgeName: string;
  topic: string;
  question: string;
  options: { id: string; text: string; correct: boolean }[];
  explanation: string;
  nasaSource: string;
  rewardRp: number;
  answered?: boolean;
  wasCorrect?: boolean;
  selectedOptionId?: string;
}

export interface CampaignConfig {
  commanderName: string;
  missionName: string;
  crewSize: number;
  difficulty: DifficultyId;
  scenario: ScenarioId;
  trainingMode?: TrainingMode;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  code: string;
  title: string;
  subtitle: string;
  briefing: string;
  scienceFocus: string;
  targetDays: number;
  targetSols: number; // Backwards-compatible alias
  startingModifiers: {
    batteryKwh: number;
    oxygenPct: number;
    waterPct: number;
    foodPct: number;
    materials: number;
    researchPoints: number;
    solarBasePct: number;
    dustActive?: boolean;
    nightActive?: boolean;
  };
}

export interface MissionScoreBreakdown {
  totalScore: number; // 0-100
  crewSafetyScore: number; // 0-100
  resourceSustainabilityScore: number; // 0-100
  infrastructureReliabilityScore: number; // 0-100
  scientificProgressScore: number; // 0-100
  objectiveCompletionScore: number; // 0-100
  outcomeTier: CampaignOutcomeTier;
}

export interface GameState {
  version: number;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  config: CampaignConfig;
  day: number; // 1-indexed Earth 24-hour Mission Day (NASA operational duty cycle)
  targetDays: number;
  sol: number; // Backwards-compatible alias for day
  targetSols: number; // Backwards-compatible alias for targetDays
  lunarCycleDay: number; // Day 1-30 in the ~29.53 Earth-day synodic lunar day/night month
  trainingMode: TrainingMode;
  activeCheckpoint: CadetCheckpoint | null;
  cadetBadges: string[];
  cadetAnswers: Record<string, string>;
  campaignStatus: 'active' | 'completed' | 'interrupted';
  endlessMode: boolean;
  powerPriority: PowerPriorityMode;
  emergencyPreparednessActive: boolean;
  resources: ResourceState;
  environment: EnvironmentalConditions;
  modules: ModuleState[];
  crew: CrewMember[];
  research: ResearchNode[];
  sites: ExplorationSite[];
  activeExpeditions: ActiveExpedition[];
  events: MissionEvent[];
  objectives: MissionObjective[];
  queuedDirectives: SolDirectiveId[];
  logs: LogEntry[];
  history: SolHistoryEntry[];
  lastSolSummary: SolSummary | null;
  discoveries: string[];
  tutorialDismissed: boolean;
  autoSaveEnabled: boolean;
}

export interface SavedCampaignMeta {
  slotId: string;
  campaignId: string;
  missionName: string;
  commanderName: string;
  scenario: ScenarioId;
  difficulty: DifficultyId;
  sol: number;
  targetSols: number;
  day?: number;
  targetDays?: number;
  trainingMode?: TrainingMode;
  campaignStatus: 'active' | 'completed' | 'interrupted';
  savedAt: string;
  score: number;
}


import type {
  CadetCheckpoint,
  CrewMember,
  DifficultyId,
  ExplorationSite,
  ModuleState,
  ResearchNode,
  ScenarioDefinition,
  ScenarioId,
  SolDirectiveId,
} from './types';

export const SIMULATION_DISCLAIMER =
  'Educational Simulation Notice: Conversion baselines are calibrated from NASA technical standards (NASA STD-3001, NASA TM-20205008240, ISS ECLSS reports). Values are simplified illustrative models for learning about lunar exploration challenges, not operational spacecraft telemetry.';

export const CADET_CHECKPOINTS: CadetCheckpoint[] = [
  {
    id: 'chk-day-1',
    dayTriggered: 1,
    badgeName: 'Solar Systems Engineer',
    topic: 'Solar Ridge Siting & Polar Sun Angle',
    question: 'Why do NASA Artemis habitat architectures place solar arrays along elevated south-pole crater rims?',
    options: [
      {
        id: 'opt-1a',
        text: 'The grazing sun angle keeps high ridges illuminated for 70–90% of the lunar year.',
        correct: true,
      },
      {
        id: 'opt-1b',
        text: 'The lunar equator is completely dark all year round.',
        correct: false,
      },
      {
        id: 'opt-1c',
        text: 'Elevated crater rims are much warmer than room temperature.',
        correct: false,
      },
    ],
    explanation:
      'Because the Moon’s spin axis has an obliquity of only ~1.54°, the Sun skims the horizon at grazing angles. Elevated crater rims receive sunlight for 70–90% of the year, while adjacent crater floors stay permanently dark (< 40 K).',
    nasaSource: 'NASA Artemis III Science Definition Report & LRO LOLA Topography Data',
    rewardRp: 15,
  },
  {
    id: 'chk-day-3',
    dayTriggered: 3,
    badgeName: 'ECLSS Specialist',
    topic: 'Closed-Loop Water & Oxygen Recycling',
    question: 'How does modern NASA Environmental Control and Life Support (ECLSS) achieve high sustainability in space?',
    options: [
      {
        id: 'opt-2a',
        text: 'By venting all cabin moisture to create vacuum ice.',
        correct: false,
      },
      {
        id: 'opt-2b',
        text: 'Using distillation and brine processing to recover up to 98% of habitat water.',
        correct: true,
      },
      {
        id: 'opt-2c',
        text: 'By flying heavy fresh-water resupply tanks from Earth every single week.',
        correct: false,
      },
    ],
    explanation:
      'NASA demonstrated a 98% water recovery milestone aboard the ISS by pairing the Urine Processor Assembly with the vacuum-distillation Brine Processor Assembly (BPA), drastically reducing required launch mass.',
    nasaSource: 'NASA ISS Environmental Control & Life Support Systems Technical Release',
    rewardRp: 15,
  },
  {
    id: 'chk-day-5',
    dayTriggered: 5,
    badgeName: 'Radiation Safety Officer',
    topic: 'Space Radiation & Regolith Shielding',
    question: 'Why is packed lunar regolith (soil) effective for protecting astronauts during Solar Particle Events?',
    options: [
      {
        id: 'opt-3a',
        text: 'Dense mass layers of regolith physically absorb and scatter ionizing protons.',
        correct: true,
      },
      {
        id: 'opt-3b',
        text: 'Lunar regolith generates an artificial planetary magnetic shield.',
        correct: false,
      },
      {
        id: 'opt-3c',
        text: 'Regolith reflects cosmic rays back toward the Sun like a mirror.',
        correct: false,
      },
    ],
    explanation:
      'Without an Earth-like atmosphere or magnetic field, lunar habitats rely on meters of compacted regolith bulkheads and hydrogen-rich water walls to block galactic cosmic rays and sudden solar proton storms.',
    nasaSource: 'NASA Space Radiation Analysis Group (SRAG) Operational Baselines',
    rewardRp: 15,
  },
  {
    id: 'chk-day-7',
    dayTriggered: 7,
    badgeName: 'Cryo-ISRU Prospector',
    topic: 'Permanently Shadowed Crater Ice (LCROSS Findings)',
    question: 'What did NASA’s LCROSS impact mission confirm inside the permanently shadowed Cabeus crater?',
    options: [
      {
        id: 'opt-4a',
        text: 'Flowing rivers of warm liquid brine under the surface.',
        correct: false,
      },
      {
        id: 'opt-4b',
        text: 'Approximately 5.6% water ice by mass trapped in cryogenic regolith.',
        correct: true,
      },
      {
        id: 'opt-4c',
        text: 'Zero water molecules anywhere in the polar region.',
        correct: false,
      },
    ],
    explanation:
      'In October 2009, LCROSS impacted Cabeus crater (plunging into a -233 °C cold trap) and measured ~5.6 ± 2.9% water ice by mass in the ejecta plume, proving the viability of lunar In-Situ Resource Utilization.',
    nasaSource: 'NASA LCROSS Science Team Results (Cabeus Crater Water Detection)',
    rewardRp: 20,
  },
];

export const MASTER_CADET_BADGE = 'Certified Junior Astronaut Outpost Commander';

export const DIFFICULTY_MODIFIERS: Record<
  DifficultyId,
  {
    label: string;
    description: string;
    resourceMultiplier: number;
    consumptionMultiplier: number;
    materialBonus: number;
    eventRiskFactor: number;
  }
> = {
  easy: {
    label: 'Easy',
    description: 'Generous initial reserves, lower consumption rates, and forgiving anomalies.',
    resourceMultiplier: 1.2,
    consumptionMultiplier: 0.8,
    materialBonus: 45,
    eventRiskFactor: 0.55,
  },
  normal: {
    label: 'Normal',
    description: 'Balanced Artemis-inspired baseline supplies, realistic trade-offs, and steady hazards.',
    resourceMultiplier: 1.0,
    consumptionMultiplier: 1.0,
    materialBonus: 0,
    eventRiskFactor: 0.78,
  },
  hard: {
    label: 'Hard',
    description: 'Tight supply margins, steeper power & ECLSS demands, and frequent lunar hazards.',
    resourceMultiplier: 0.85,
    consumptionMultiplier: 1.22,
    materialBonus: -25,
    eventRiskFactor: 1.0,
  },
};

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  first_outpost: {
    id: 'first_outpost',
    code: 'SCN-01',
    title: 'First Lunar Outpost',
    subtitle: 'Establish and sustain an operational south-pole research base.',
    briefing:
      'Your crew has touched down near the sunlit rim of Shackleton Crater. Commission core life-support and agricultural infrastructure, balance solar power with battery reserves, and sustain 10 Mission Days of continuous operations.',
    scienceFocus: 'Closed-loop Environmental Control & Life Support (ECLSS) and solar ridge siting.',
    targetDays: 10,
    targetSols: 10,
    startingModifiers: {
      batteryKwh: 155,
      oxygenPct: 86,
      waterPct: 82,
      foodPct: 80,
      materials: 145,
      researchPoints: 25,
      solarBasePct: 88,
    },
  },
  water_ice: {
    id: 'water_ice',
    code: 'SCN-02',
    title: 'Water Ice Discovery',
    subtitle: 'Investigate permanently shadowed regions while safeguarding crew and rovers.',
    briefing:
      'Orbital neutron spectrometer data indicates subsurface hydrogen deposits along nearby permanently shadowed craters. Deploy rover teams to sample water-ice targets, process volatile reserves, and preserve power during deep-shadow traverses across 10 Mission Days.',
    scienceFocus: 'In-Situ Resource Utilization (ISRU) and Permanently Shadowed Regions (PSRs).',
    targetDays: 10,
    targetSols: 10,
    startingModifiers: {
      batteryKwh: 140,
      oxygenPct: 84,
      waterPct: 68,
      foodPct: 82,
      materials: 155,
      researchPoints: 35,
      solarBasePct: 84,
    },
  },
  power_crisis: {
    id: 'power_crisis',
    code: 'SCN-03',
    title: 'Power Crisis',
    subtitle: 'Sustain life support amid degraded solar arrays and erratic generation.',
    briefing:
      'A micrometeoroid strike and terrain shadowing have reduced primary solar output while battery banks sit below optimal capacity. Prioritize critical life support, repair energy infrastructure, and keep the crew warm and oxygenated across 10 Mission Days.',
    scienceFocus: 'Lunar power budgeting, energy storage, and load-shedding prioritization.',
    targetDays: 10,
    targetSols: 10,
    startingModifiers: {
      batteryKwh: 92,
      oxygenPct: 80,
      waterPct: 78,
      foodPct: 78,
      materials: 135,
      researchPoints: 30,
      solarBasePct: 58,
    },
  },
  dust_emergency: {
    id: 'dust_emergency',
    code: 'SCN-04',
    title: 'Lunar Dust Emergency',
    subtitle: 'Mitigate abrasive electrostatic regolith dust affecting seals and radiators.',
    briefing:
      'High-velocity electrostatic lunar dust lofted during nearby landing plume activity has coated solar panels, degraded seals, and strained air filtration. Clean and repair systems, protect crew respiratory health, and restore nominal operations over 10 Mission Days.',
    scienceFocus: 'Electrostatic lunar regolith abrasion, airlocks, and thermal radiator fouling.',
    targetDays: 10,
    targetSols: 10,
    startingModifiers: {
      batteryKwh: 125,
      oxygenPct: 76,
      waterPct: 76,
      foodPct: 80,
      materials: 140,
      researchPoints: 30,
      solarBasePct: 68,
      dustActive: true,
    },
  },
  long_night: {
    id: 'long_night',
    code: 'SCN-05',
    title: 'The Long Lunar Night',
    subtitle: 'Endure an extended low-sunlight eclipse cycle with thermal and energy discipline.',
    briefing:
      'Low solar elevation and regional ridge shadowing have plunged the outpost into an extended period of scarce sunlight and extreme cold (-175 °C). Expand battery storage, conserve power, maintain thermal shielding, and protect crew morale across 10 Mission Days.',
    scienceFocus: 'Extreme thermal management, battery endurance, and psychological resilience.',
    targetDays: 10,
    targetSols: 10,
    startingModifiers: {
      batteryKwh: 170,
      oxygenPct: 85,
      waterPct: 82,
      foodPct: 84,
      materials: 150,
      researchPoints: 35,
      solarBasePct: 38,
      nightActive: true,
    },
  },
};

export const INITIAL_CREW_ROSTER: Omit<CrewMember, 'health' | 'fatigue' | 'morale' | 'task' | 'onExpeditionId'>[] = [
  {
    id: 'crew-1',
    name: 'Cmdr. Elena Vance',
    role: 'Mission Commander',
    skill: 9,
  },
  {
    id: 'crew-2',
    name: 'Lt. Marcus Chen',
    role: 'Engineer',
    skill: 8,
  },
  {
    id: 'crew-3',
    name: 'Dr. Amara Okafor',
    role: 'Scientist',
    skill: 9,
  },
  {
    id: 'crew-4',
    name: 'Dr. Sofia Lindqvist',
    role: 'Medical Officer',
    skill: 8,
  },
  {
    id: 'crew-5',
    name: 'Eng. Mateo Silva',
    role: 'Robotics Specialist',
    skill: 8,
  },
  {
    id: 'crew-6',
    name: 'Dr. Priya Nair',
    role: 'Agricultural Specialist',
    skill: 8,
  },
];

export function createInitialModules(scenario: ScenarioId): ModuleState[] {
  const dustPenalty = scenario === 'dust_emergency' ? 24 : 0;
  const powerCrisis = scenario === 'power_crisis';

  return [
    {
      id: 'main_habitat',
      name: 'Main Habitat',
      shortCode: 'HAB-01',
      category: 'Core',
      description: 'Pressurized living quarters, command deck, and thermal envelope for the lunar crew.',
      status: 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: 96 - Math.round(dustPenalty * 0.4),
      constructionSolRemaining: 0,
      buildCostMaterials: 0,
      upgradeCostMaterials: 55,
      powerDrawKw: 8,
      oxygenDelta: -2,
      waterDelta: -1,
      foodDelta: 0,
      researchDelta: 2,
      shieldingBonus: 35,
      commsBonus: 15,
      svgX: 250,
      svgY: 170,
      scienceNote: 'Multi-layer micrometeoroid and thermal insulation keeps interior temperatures near 21 °C despite extreme external swings.',
    },
    {
      id: 'solar_array',
      name: 'Solar Power Array',
      shortCode: 'PWR-SOL',
      category: 'Energy',
      description: 'Vertical tracking photovoltaic towers positioned to capture low-angle south-pole sunlight.',
      status: powerCrisis ? 'damaged' : 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: powerCrisis ? 54 : 92 - dustPenalty,
      constructionSolRemaining: 0,
      buildCostMaterials: 45,
      upgradeCostMaterials: 50,
      powerDrawKw: -36, // Generates 36 kW at 100% illumination & condition
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 0,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 90,
      svgY: 95,
      scienceNote: 'Near the lunar south pole, sunlight skims horizontally across crater rims, making vertical arrays far more effective than flat panels.',
    },
    {
      id: 'battery_storage',
      name: 'Battery Storage',
      shortCode: 'PWR-BAT',
      category: 'Energy',
      description: 'Regenerative fuel cell and lithium-ion storage bank buffering eclipse periods and peak rover charging.',
      status: 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: powerCrisis ? 68 : 94,
      constructionSolRemaining: 0,
      buildCostMaterials: 40,
      upgradeCostMaterials: 45,
      powerDrawKw: 2,
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 0,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 90,
      svgY: 235,
      scienceNote: 'High-density storage allows an outpost to survive multi-day shadows cast by surrounding crater walls.',
    },
    {
      id: 'life_support',
      name: 'Life Support System',
      shortCode: 'ECLSS-1',
      category: 'Life Support',
      description: 'Atmospheric oxygen generation, CO2 scrubbing, trace contaminant control, and pressure regulation.',
      status: 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: 93 - Math.round(dustPenalty * 0.6),
      constructionSolRemaining: 0,
      buildCostMaterials: 50,
      upgradeCostMaterials: 55,
      powerDrawKw: 9,
      oxygenDelta: 11,
      waterDelta: -2,
      foodDelta: 0,
      researchDelta: 1,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 250,
      svgY: 75,
      scienceNote: 'Closed-loop ECLSS uses Sabatier reactions and electrolysis to recover breathable O2 from exhaled CO2 and water.',
    },
    {
      id: 'water_facility',
      name: 'Water Processing Facility',
      shortCode: 'H2O-REC',
      category: 'Life Support',
      description: 'Greywater recovery, urine distillation, and regolith volatile ice extraction interface.',
      status: 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: 90 - Math.round(dustPenalty * 0.4),
      constructionSolRemaining: 0,
      buildCostMaterials: 45,
      upgradeCostMaterials: 50,
      powerDrawKw: 7,
      oxygenDelta: 2,
      waterDelta: 10,
      foodDelta: 0,
      researchDelta: 1,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 410,
      svgY: 75,
      scienceNote: 'Modern spacecraft water recovery systems reclaim over 90% of moisture; lunar ice extraction could provide propellant as well as drinking water.',
    },
    {
      id: 'greenhouse',
      name: 'Greenhouse',
      shortCode: 'BIO-GH',
      category: 'Life Support',
      description: 'Hydroponic LED crop chambers producing fresh nutrition while supplementing O2 regeneration.',
      status: scenario === 'first_outpost' ? 'unbuilt' : 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: scenario === 'first_outpost' ? 100 : 88,
      constructionSolRemaining: 0,
      buildCostMaterials: 45,
      upgradeCostMaterials: 50,
      powerDrawKw: 8,
      oxygenDelta: 3,
      waterDelta: -3,
      foodDelta: 12,
      researchDelta: 2,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 545,
      svgY: 135,
      scienceNote: 'Controlled-environment hydroponics convert waste CO2 into edible biomass while providing vital psychological comfort to isolated crews.',
    },
    {
      id: 'science_lab',
      name: 'Science Laboratory',
      shortCode: 'SCI-LAB',
      category: 'Science',
      description: 'Analytical spectrometers, regolith gloveboxes, and biology benches accelerating technology research.',
      status: scenario === 'water_ice' ? 'operational' : 'unbuilt',
      level: 1,
      maxLevel: 3,
      conditionPct: 94,
      constructionSolRemaining: 0,
      buildCostMaterials: 50,
      upgradeCostMaterials: 55,
      powerDrawKw: 6,
      oxygenDelta: 0,
      waterDelta: -1,
      foodDelta: 0,
      researchDelta: 14,
      shieldingBonus: 0,
      commsBonus: 0,
      svgX: 410,
      svgY: 185,
      scienceNote: 'Isolating lunar regolith inside nitrogen-purged gloveboxes prevents terrestrial oxidation before sample analysis.',
    },
    {
      id: 'medical_module',
      name: 'Medical Module',
      shortCode: 'MED-BAY',
      category: 'Life Support',
      description: 'Crew health diagnostics, exercise countermeasures, and recovery suite for fatigue and dust exposure.',
      status: 'unbuilt',
      level: 1,
      maxLevel: 3,
      conditionPct: 100,
      constructionSolRemaining: 0,
      buildCostMaterials: 40,
      upgradeCostMaterials: 45,
      powerDrawKw: 4,
      oxygenDelta: 0,
      waterDelta: -1,
      foodDelta: 0,
      researchDelta: 2,
      shieldingBonus: 5,
      commsBonus: 0,
      svgX: 250,
      svgY: 270,
      scienceNote: 'In 1/6th Earth gravity, resistive exercise and respiratory monitoring protect bone density and lung health from fine dust.',
    },
    {
      id: 'radiation_shelter',
      name: 'Radiation Shelter',
      shortCode: 'RAD-SHD',
      category: 'Life Support',
      description: 'Regolith-bermed storm shelter shielding crew from high-energy Solar Particle Events (SPEs).',
      status: scenario === 'long_night' ? 'operational' : 'unbuilt',
      level: 1,
      maxLevel: 3,
      conditionPct: 95,
      constructionSolRemaining: 0,
      buildCostMaterials: 55,
      upgradeCostMaterials: 60,
      powerDrawKw: 3,
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 0,
      shieldingBonus: 45,
      commsBonus: 0,
      svgX: 112,
      svgY: 165,
      scienceNote: 'Without a global magnetic field or thick atmosphere, lunar crews rely on mass shielding (water walls or compacted regolith) during solar storms.',
    },
    {
      id: 'comms_array',
      name: 'Communications Array',
      shortCode: 'COM-DSN',
      category: 'Core',
      description: 'High-gain Ka-band dish linking the south-pole outpost to Earth Deep Space Network and lunar relays.',
      status: 'operational',
      level: 1,
      maxLevel: 3,
      conditionPct: 91 - Math.round(dustPenalty * 0.5),
      constructionSolRemaining: 0,
      buildCostMaterials: 35,
      upgradeCostMaterials: 40,
      powerDrawKw: 4,
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 2,
      shieldingBonus: 0,
      commsBonus: 72,
      svgX: 410,
      svgY: 280,
      scienceNote: 'At the lunar south pole, Earth hovers near the horizon, requiring elevated relay towers or orbital satellites for continuous link margin.',
    },
    {
      id: 'rover_garage',
      name: 'Rover Garage',
      shortCode: 'ROV-BAY',
      category: 'Exploration',
      description: 'Pressurized charging dock, dust-mitigation airlock, and repair bay for surface exploration rovers.',
      status: scenario === 'water_ice' ? 'operational' : 'unbuilt',
      level: 1,
      maxLevel: 3,
      conditionPct: 92,
      constructionSolRemaining: 0,
      buildCostMaterials: 50,
      upgradeCostMaterials: 55,
      powerDrawKw: 5,
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 3,
      shieldingBonus: 0,
      commsBonus: 5,
      svgX: 545,
      svgY: 245,
      scienceNote: 'Suitport airlocks allow astronauts and rovers to dock externally, keeping abrasive lunar regolith outside crew living volumes.',
    },
    {
      id: 'exploration_station',
      name: 'Exploration Equipment Station',
      shortCode: 'EXP-EQP',
      category: 'Exploration',
      description: 'Portable drill rigs, volatile sample canisters, and cryogenic ice-coring instruments for deep traverses.',
      status: 'unbuilt',
      level: 1,
      maxLevel: 3,
      conditionPct: 100,
      constructionSolRemaining: 0,
      buildCostMaterials: 45,
      upgradeCostMaterials: 50,
      powerDrawKw: 3,
      oxygenDelta: 0,
      waterDelta: 0,
      foodDelta: 0,
      researchDelta: 6,
      shieldingBonus: 0,
      commsBonus: 5,
      requiredResearchId: 'res-explore-1',
      svgX: 650,
      svgY: 190,
      scienceNote: 'Cryogenic core drills preserve trapped lunar volatiles at sub-zero temperatures without sublimating water molecules.',
    },
  ];
}

export function createInitialResearch(): ResearchNode[] {
  return [
    {
      id: 'res-eclss-1',
      category: 'Life Support Technology',
      name: 'Closed-Loop Sabatier Scrubbers',
      description: 'Improves CO2-to-O2 recovery efficiency across Life Support modules.',
      cost: 25,
      prerequisites: [],
      unlocked: false,
      benefitSummary: '+25% Oxygen generation from Life Support systems.',
    },
    {
      id: 'res-water-1',
      category: 'Advanced Water Recycling',
      name: 'Vapor Compression Distillation',
      description: 'Upgrades greywater and brine recovery rates inside Water Processing.',
      cost: 25,
      prerequisites: [],
      unlocked: false,
      benefitSummary: '+25% Water recovery per Day and reduced waste loss.',
    },
    {
      id: 'res-agri-1',
      category: 'Lunar Agriculture',
      name: 'Spectral LED Hydroponics',
      description: 'Tunes narrow-band wavelengths to boost crop yield with lower water draw.',
      cost: 30,
      prerequisites: [],
      unlocked: false,
      benefitSummary: '+30% Food output from Greenhouse modules.',
    },
    {
      id: 'res-solar-1',
      category: 'Solar Energy Storage',
      name: 'High-Density Regenerative Fuel Cells',
      description: 'Expands outpost battery capacity and reduces overnight conversion losses.',
      cost: 30,
      prerequisites: [],
      unlocked: false,
      benefitSummary: '+60 kWh maximum battery capacity immediately.',
    },
    {
      id: 'res-rad-1',
      category: 'Radiation Protection',
      name: 'Hydrogenated Regolith Composites',
      description: 'Enhances habitat and shelter shielding against Solar Particle Events.',
      cost: 35,
      prerequisites: ['res-eclss-1'],
      unlocked: false,
      benefitSummary: '+15% Outpost radiation shielding effectiveness.',
    },
    {
      id: 'res-robot-1',
      category: 'Autonomous Robotics',
      name: 'Electrodynamic Dust Shields',
      description: 'Uses alternating electric fields to repel abrasive regolith dust off solar panels and seals.',
      cost: 35,
      prerequisites: ['res-solar-1'],
      unlocked: false,
      benefitSummary: 'Halves dust-related module degradation each Day.',
    },
    {
      id: 'res-explore-1',
      category: 'Surface Exploration',
      name: 'Cryogenic Volatile Coring',
      description: 'Unlocks construction of the Exploration Equipment Station and improves PSR yield.',
      cost: 35,
      prerequisites: ['res-water-1'],
      unlocked: false,
      benefitSummary: 'Unlocks Exploration Equipment Station and +35% expedition science/water yield.',
      unlocksModuleId: 'exploration_station',
    },
    {
      id: 'res-hab-1',
      category: 'Habitat Efficiency',
      name: 'Smart Thermal & Load Bus',
      description: 'Automates radiator loops and habitat power distribution.',
      cost: 40,
      prerequisites: ['res-eclss-1', 'res-solar-1'],
      unlocked: false,
      benefitSummary: '-15% total module power consumption and +8% thermal stability.',
    },
  ];
}

export function createInitialSites(): ExplorationSite[] {
  return [
    {
      id: 'site-landing',
      name: 'Shackleton Rim Base Camp',
      sectorCode: 'LZ-01',
      distanceKm: 0.4,
      terrainType: 'Sunlit Ridge',
      description: 'Immediate perimeter around landing pad; high solar illumination and easy regolith sampling.',
      powerCostKwh: 8,
      durationSols: 1,
      minRoverCondition: 25,
      minCommsPct: 30,
      waterBonus: 3,
      materialsBonus: 18,
      researchBonus: 14,
      mapX: 48,
      mapY: 50,
      discovered: true,
      completedCount: 0,
      scienceSummary: 'Baseline regolith compaction and geotechnical bearing measurements near the landing zone.',
    },
    {
      id: 'site-ridge',
      name: 'Connecting Ridge Overlook',
      sectorCode: 'SR-02',
      distanceKm: 3.2,
      terrainType: 'Sunlit Ridge',
      description: 'Elevated ridge connecting Shackleton and de Gerlache craters with near-continuous solar visibility.',
      powerCostKwh: 14,
      durationSols: 1,
      minRoverCondition: 40,
      minCommsPct: 45,
      waterBonus: 4,
      materialsBonus: 24,
      researchBonus: 20,
      mapX: 30,
      mapY: 38,
      discovered: true,
      completedCount: 0,
      scienceSummary: 'Ideal candidate site for future multi-tower solar arrays and optical Earth-link relays.',
    },
    {
      id: 'site-shackleton-psr',
      name: 'Shackleton PSR Margin',
      sectorCode: 'PSR-03',
      distanceKm: 5.8,
      terrainType: 'PSR Margin',
      description: 'Steep rim boundary entering permanent shadow where temperatures plunge below -200 °C.',
      powerCostKwh: 22,
      durationSols: 2,
      minRoverCondition: 55,
      minCommsPct: 55,
      waterBonus: 16,
      materialsBonus: 16,
      researchBonus: 28,
      mapX: 52,
      mapY: 26,
      discovered: false,
      completedCount: 0,
      scienceSummary: 'Cold-trap regolith samples confirming hydroxyl and surface water-ice signatures.',
    },
    {
      id: 'site-shoemaker',
      name: 'Shoemaker Rim Anomaly',
      sectorCode: 'CR-04',
      distanceKm: 8.4,
      terrainType: 'Crater Rim',
      description: 'Exposed ancient impact ejecta rich in ilmenite (FeTiO3), useful for oxygen extraction tests.',
      powerCostKwh: 20,
      durationSols: 2,
      minRoverCondition: 60,
      minCommsPct: 55,
      waterBonus: 6,
      materialsBonus: 36,
      researchBonus: 26,
      mapX: 66,
      mapY: 66,
      discovered: false,
      completedCount: 0,
      scienceSummary: 'Titanium-rich basaltic fragments suitable for hydrogen-reduction oxygen production.',
    },
    {
      id: 'site-cabeus',
      name: 'Cabeus Ice Prospect',
      sectorCode: 'PSR-05',
      distanceKm: 11.2,
      terrainType: 'PSR Margin',
      description: 'Deep volatile target inspired by LCROSS impact findings showing concentrated subsurface water ice.',
      powerCostKwh: 28,
      durationSols: 2,
      minRoverCondition: 70,
      minCommsPct: 65,
      waterBonus: 24,
      materialsBonus: 22,
      researchBonus: 38,
      mapX: 20,
      mapY: 74,
      discovered: false,
      completedCount: 0,
      scienceSummary: 'Subsurface volatile core analysis confirming multi-percent water-ice concentration.',
    },
  ];
}

export const SOL_DIRECTIVES: {
  id: SolDirectiveId;
  label: string;
  shortEffect: string;
  description: string;
  requiresMaterials?: number;
  requiresModule?: string;
}[] = [
  {
    id: 'extra_food',
    label: 'Boost Greenhouse Production',
    shortEffect: '+8 Food · -4 Water · -5 kWh',
    description: 'Run extended photoperiods in the Greenhouse to increase harvest yield today.',
    requiresModule: 'greenhouse',
  },
  {
    id: 'recycle_water',
    label: 'Intensive Water Reclamation',
    shortEffect: '+9 Water · -6 kWh',
    description: 'Run high-pressure secondary distillation cycles across the Water Processing Facility.',
    requiresModule: 'water_facility',
  },
  {
    id: 'repair_solar',
    label: 'Solar Array Dust Sweep & Calibration',
    shortEffect: '+16% Solar Condition · -8 Materials',
    description: 'Clean regolith dust from photovoltaic arrays and recalibrate sun-tracking actuators.',
    requiresMaterials: 8,
  },
  {
    id: 'inspect_eclss',
    label: 'Inspect & Tune Life Support',
    shortEffect: '+12% ECLSS Cond · +6 O2 · -6 Materials',
    description: 'Verify oxygen seals, replace CO2 sorbent cartridges, and purge dust filters.',
    requiresMaterials: 6,
  },
  {
    id: 'boost_shielding',
    label: 'Reinforce Radiation Protection',
    shortEffect: '+10% Shielding · -10 Materials',
    description: 'Pack additional lunar regolith bags around core habitat bulkheads.',
    requiresMaterials: 10,
  },
  {
    id: 'focused_research',
    label: 'Focused Science Campaign',
    shortEffect: '+14 Research Pts · -6 kWh · +6 Crew Fatigue',
    description: 'Dedicate lab telemetry and crew focus to accelerating lunar technology breakthroughs.',
  },
  {
    id: 'rest_crew',
    label: 'Crew Recovery & Morale Rotation',
    shortEffect: '-18 Fatigue · +10 Morale · +5 Health',
    description: 'Schedule light duty, Earth family video calls, and medical recovery checks.',
  },
  {
    id: 'maintain_comms',
    label: 'Calibrate Deep-Space Comms',
    shortEffect: '+14% Comms Quality · -4 kWh',
    description: 'Re-align high-gain Ka-band dish tracking and verify orbital relay buffers.',
  },
  {
    id: 'emergency_prep',
    label: 'Emergency Contingency Drill',
    shortEffect: 'Halves next hazard loss · -5 kWh',
    description: 'Stage pressure patch kits, reserve O2 bottles, and shelter readiness for incoming anomalies.',
  },
];

export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  severity: 'Info' | 'Caution' | 'Warning' | 'Critical';
  affectedSystems: string[];
  educationalNote: string;
  conditionCheck: (ctx: {
    hasGreenhouse: boolean;
    hasRover: boolean;
    hasScienceLab: boolean;
    hasShelter: boolean;
    scenario: ScenarioId;
    sol: number;
  }) => boolean;
  choices: {
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
      damageModuleId?: 'solar_array' | 'battery_storage' | 'life_support' | 'water_facility' | 'greenhouse' | 'comms_array' | 'rover_garage';
      repairModuleId?: 'solar_array' | 'battery_storage' | 'life_support' | 'water_facility' | 'greenhouse' | 'comms_array' | 'rover_garage';
      moduleConditionDelta?: number;
    };
  }[];
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'evt-solar-flare',
    title: 'Solar Particle Event (SPE) Watch',
    description:
      'Space weather monitors detected a coronal mass ejection directed toward the Earth-Moon system. Elevated proton flux is expected for the next 24 hours.',
    severity: 'Critical',
    affectedSystems: ['Radiation Protection', 'Crew Health', 'Communications'],
    educationalNote:
      'Unlike Earth, the Moon lacks a global magnetosphere. Crews rely on localized mass shielding (water walls and regolith shelters) during Solar Particle Events.',
    conditionCheck: ({ sol }) => sol >= 2,
    choices: [
      {
        id: 'shelter-protocol',
        label: 'Enact Radiation Shelter Protocol',
        description: 'Move non-essential crew into shielded quarters and pause exterior operations.',
        consequencePreview: '-12 kWh · +5% Shielding · +4 Fatigue',
        requiresBatteryKwh: 12,
        effects: {
          batteryKwh: -12,
          radiationShieldingPct: 5,
          crewFatigueDelta: 4,
          crewMoraleDelta: 2,
        },
      },
      {
        id: 'berm-reinforce',
        label: 'Emergency Regolith Berm Patch',
        description: 'Use spare structural kits to reinforce weak radiation seams.',
        consequencePreview: '-14 Materials · +10% Shielding · +4 Research',
        requiresMaterials: 14,
        effects: {
          materials: -14,
          radiationShieldingPct: 10,
          researchPoints: 4,
        },
      },
      {
        id: 'ride-out',
        label: 'Continue Nominal Operations',
        description: 'Maintain full output and rely solely on existing habitat hull shielding.',
        consequencePreview: '-8 Crew Health · -6 Morale · -8% Comms',
        effects: {
          crewHealthDelta: -8,
          crewMoraleDelta: -6,
          commsQualityPct: -8,
        },
      },
    ],
  },
  {
    id: 'evt-dust-coating',
    title: 'Electrostatic Regolith Dust Surge',
    description:
      'Solar UV charging along the terminator line lofted fine silicate dust across the south-pole ridge, coating optical sensors and solar array bearings.',
    severity: 'Warning',
    affectedSystems: ['Solar Power Array', 'Equipment Condition'],
    educationalNote:
      'Lunar dust is jagged and electrostatically charged, clinging tenaciously to thermal radiators, spacesuit joints, and photovoltaic surfaces.',
    conditionCheck: () => true,
    choices: [
      {
        id: 'clean-arrays',
        label: 'Deploy Crew Brush & Brushless Purge',
        description: 'Spend spare filters and crew effort to immediately clean arrays.',
        consequencePreview: '-10 Materials · +6 Fatigue · Preserves Solar Condition',
        requiresMaterials: 10,
        effects: {
          materials: -10,
          crewFatigueDelta: 6,
          repairModuleId: 'solar_array',
          moduleConditionDelta: 8,
        },
      },
      {
        id: 'accept-dust',
        label: 'Defer Cleaning Until Next Maintenance Cycle',
        description: 'Conserve materials now and accept temporary solar array degradation.',
        consequencePreview: '-16% Solar Array Condition · -6 kWh',
        effects: {
          damageModuleId: 'solar_array',
          moduleConditionDelta: -16,
          batteryKwh: -6,
        },
      },
    ],
  },
  {
    id: 'evt-water-loop',
    title: 'Water Distillation Brine Clogging',
    description:
      'Calcium sulfate precipitates have partially fouled the primary vapor compression condenser inside the Water Processing Facility.',
    severity: 'Warning',
    affectedSystems: ['Water Processing Facility', 'Water Reserves'],
    educationalNote:
      'On the ISS and future lunar bases, mineral precipitation in closed-loop urine and greywater processors is a primary maintenance challenge.',
    conditionCheck: () => true,
    choices: [
      {
        id: 'flush-loop',
        label: 'Flush & Replace Condenser Cartridges',
        description: 'Use spare parts and minor water flush to restore peak recovery efficiency.',
        consequencePreview: '-10 Materials · -4% Water · +10% Water Facility Condition',
        requiresMaterials: 10,
        effects: {
          materials: -10,
          waterPct: -4,
          repairModuleId: 'water_facility',
          moduleConditionDelta: 10,
        },
      },
      {
        id: 'bypass-filter',
        label: 'Run Reduced-Throughput Bypass',
        description: 'Keep the system online at reduced pressure without spending spare parts.',
        consequencePreview: '-9% Water · -12% Water Facility Condition',
        effects: {
          waterPct: -9,
          damageModuleId: 'water_facility',
          moduleConditionDelta: -12,
        },
      },
    ],
  },
  {
    id: 'evt-greenhouse-blight',
    title: 'Hydroponic Nutrient Imbalance',
    description:
      'Root-zone oxygenation sensors in the Greenhouse show pH drift threatening the current leafy-greens harvest cycle.',
    severity: 'Caution',
    affectedSystems: ['Greenhouse', 'Food Production'],
    educationalNote:
      'Microgravity and 1/6g fluid dynamics change how water and dissolved oxygen coat plant roots, requiring active pH and nutrient monitoring.',
    conditionCheck: ({ hasGreenhouse }) => hasGreenhouse,
    choices: [
      {
        id: 'rebalance-nutrients',
        label: 'Rebalance Hydroponic Solution',
        description: 'Spend water and power to flush trays and stabilize crop yields.',
        consequencePreview: '-5% Water · -8 kWh · +6% Food · +8 Research',
        requiresBatteryKwh: 8,
        effects: {
          waterPct: -5,
          batteryKwh: -8,
          foodPct: 6,
          researchPoints: 8,
        },
      },
      {
        id: 'cull-tray',
        label: 'Isolate & Discard Affected Tray',
        description: 'Protect healthy racks at the cost of part of this Sol’s harvest.',
        consequencePreview: '-8% Food · +4 Morale Stability',
        effects: {
          foodPct: -8,
          crewMoraleDelta: -2,
        },
      },
    ],
  },
  {
    id: 'evt-comms-occultation',
    title: 'Horizon Terrain Comms Interference',
    description:
      'Low Earth elevation near the south-pole horizon combined with crater wall multipath reflection has degraded Ka-band downlink telemetry.',
    severity: 'Caution',
    affectedSystems: ['Communications Array'],
    educationalNote:
      'From the lunar south pole, Earth never rises high above the horizon, making terrain obstruction a real link-budget factor for Artemis missions.',
    conditionCheck: () => true,
    choices: [
      {
        id: 'relay-boost',
        label: 'Boost Transmitter Gain & Re-Aim',
        description: 'Spend battery power to lock onto a lunar orbital relay satellite.',
        consequencePreview: '-10 kWh · +14% Comms Quality · +5 Research',
        requiresBatteryKwh: 10,
        effects: {
          batteryKwh: -10,
          commsQualityPct: 14,
          researchPoints: 5,
        },
      },
      {
        id: 'store-forward',
        label: 'Switch to Store-and-Forward Buffer',
        description: 'Queue non-urgent science packets until link geometry improves.',
        consequencePreview: '-12% Comms Quality · -4 Morale',
        effects: {
          commsQualityPct: -12,
          crewMoraleDelta: -4,
        },
      },
    ],
  },
  {
    id: 'evt-battery-thermal',
    title: 'Battery Bank Thermal Drift',
    description:
      'Rapid shadow transition cooled one secondary battery rack below optimal operating temperature, increasing internal resistance.',
    severity: 'Warning',
    affectedSystems: ['Battery Storage', 'Power'],
    educationalNote:
      'Lunar surface temperatures swing over 250 °C between sunlit ridges and shadows; lithium-ion cells require active thermal heating to avoid capacity loss.',
    conditionCheck: () => true,
    choices: [
      {
        id: 'activate-heaters',
        label: 'Engage Active Thermal Heaters',
        description: 'Draw modest reserve energy to protect long-term cell capacity.',
        consequencePreview: '-10 kWh · +10% Battery Module Condition',
        requiresBatteryKwh: 10,
        effects: {
          batteryKwh: -10,
          repairModuleId: 'battery_storage',
          moduleConditionDelta: 10,
        },
      },
      {
        id: 'insulate-parts',
        label: 'Install Multi-Layer Foil Wrap',
        description: 'Use spare insulation kits to stabilize the rack permanently.',
        consequencePreview: '-12 Materials · +14% Battery Condition · +6 Research',
        requiresMaterials: 12,
        effects: {
          materials: -12,
          repairModuleId: 'battery_storage',
          moduleConditionDelta: 14,
          researchPoints: 6,
        },
      },
    ],
  },
  {
    id: 'evt-science-discovery',
    title: 'Unexpected Regolith Glass Spherule Find',
    description:
      'Routine perimeter core inspection uncovered pyroclastic volcanic glass beads containing trapped primordial water signatures.',
    severity: 'Info',
    affectedSystems: ['Scientific Research'],
    educationalNote:
      'Apollo 15 and 17 pyroclastic glass beads revealed measurable indigenous water inside the lunar interior, reshaping lunar science.',
    conditionCheck: () => true,
    choices: [
      {
        id: 'deep-assay',
        label: 'Run Full Spectrometer Assay',
        description: 'Dedicate battery power for high-resolution isotope analysis.',
        consequencePreview: '-10 kWh · +22 Research Points · +6 Crew Morale',
        requiresBatteryKwh: 10,
        effects: {
          batteryKwh: -10,
          researchPoints: 22,
          crewMoraleDelta: 6,
        },
      },
      {
        id: 'catalog-archive',
        label: 'Catalog Sample for Future Analysis',
        description: 'Store safely with zero energy expenditure.',
        consequencePreview: '+10 Research Points · +3 Crew Morale',
        effects: {
          researchPoints: 10,
          crewMoraleDelta: 3,
        },
      },
    ],
  },
  {
    id: 'evt-rover-actuator',
    title: 'Rover Suspension Dust Seizure',
    description:
      'Fine regolith particles worked into the rover wheel-hub seal after surface traverses, raising motor draw.',
    severity: 'Warning',
    affectedSystems: ['Rover Garage', 'Exploration'],
    educationalNote:
      'Apollo Lunar Roving Vehicle fenders were famously repaired with maps and duct tape after dust showers threatened wheel mechanisms and radiators.',
    conditionCheck: ({ hasRover }) => hasRover,
    choices: [
      {
        id: 'overhaul-hub',
        label: 'Overhaul Wheel Hub & Dust Seals',
        description: 'Replace seals in the Rover Garage before the next sortie.',
        consequencePreview: '-12 Materials · +15% Rover Garage Condition',
        requiresMaterials: 12,
        effects: {
          materials: -12,
          repairModuleId: 'rover_garage',
          moduleConditionDelta: 15,
        },
      },
      {
        id: 'run-diagnostics',
        label: 'Apply High-Torque Purge Cycle',
        description: 'Clear dust using battery power without spending spare seals.',
        consequencePreview: '-12 kWh · +5% Rover Garage Condition',
        requiresBatteryKwh: 12,
        effects: {
          batteryKwh: -12,
          repairModuleId: 'rover_garage',
          moduleConditionDelta: 5,
        },
      },
    ],
  },
  {
    id: 'evt-crew-fatigue',
    title: 'Circadian Rhythm & Workload Fatigue Alert',
    description:
      'Medical telemetry indicates elevated crew stress and disrupted sleep cycles due to continuous mission pacing under artificial habitat lighting.',
    severity: 'Caution',
    affectedSystems: ['Crew Health', 'Crew Morale'],
    educationalNote:
      'Long-duration analog habitats use tunable blue-enriched morning LEDs and warm evening lighting to prevent circadian drift during 14-day lunar nights.',
    conditionCheck: ({ sol }) => sol >= 3,
    choices: [
      {
        id: 'crew-standdown',
        label: 'Authorize Half-Sol Recovery Standdown',
        description: 'Reduce workload and schedule Earth-link personal time.',
        consequencePreview: '-16 Crew Fatigue · +10 Morale · +5 Health',
        effects: {
          crewFatigueDelta: -16,
          crewMoraleDelta: 10,
          crewHealthDelta: 5,
        },
      },
      {
        id: 'push-through',
        label: 'Maintain Current Operations Tempo',
        description: 'Keep science and maintenance running without slowing down.',
        consequencePreview: '+8 Fatigue · -6 Morale · +8 Research Points',
        effects: {
          crewFatigueDelta: 8,
          crewMoraleDelta: -6,
          researchPoints: 8,
        },
      },
    ],
  },
];

export const NASA_SCIENCE_TOPICS = [
  {
    id: 'south-pole',
    title: 'Lunar South-Pole Environment & Axial Tilt',
    badge: 'NASA LRO / LOLA Dataset',
    verifiedScience:
      'Data from NASA’s Lunar Reconnaissance Orbiter (LRO LOLA & Diviner) confirms the Moon’s tiny 1.54° axial obliquity. Elevated crater peaks receive sunlight for 70–90% of the year at grazing horizontal angles, while adjacent crater depressions remain in perpetual darkness.',
    gameplayConnection:
      'Models varying solar illumination across south-pole ridges and decouples the 24h operational Mission Day from the ~29.5-day synodic lunar cycle.',
    sourceTitle: 'NASA PDS Geosciences — LRO LOLA Topography Archive',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  },
  {
    id: 'psr',
    title: 'Permanently Shadowed Regions (PSRs) & Cold Traps',
    badge: 'LRO Diviner Thermal Map',
    verifiedScience:
      'NASA’s Diviner Lunar Radiometer Experiment measured surface temperatures inside south-pole crater floors (Shackleton, Shoemaker, Cabeus) as low as 25–40 K (-248 °C to -233 °C). These frigid cold traps preserve ancient volatiles and water ice.',
    gameplayConnection:
      'PSR exploration sites require higher rover thermal endurance and battery reserves in exchange for cryogenic water ice and regolith discoveries.',
    sourceTitle: 'NASA LRO Diviner Lunar Radiometer Experiment (UCLA / NASA JPL)',
    sourceUrl: 'https://www.diviner.ucla.edu/',
  },
  {
    id: 'water-ice',
    title: 'Water Ice & In-Situ Resource Utilization (ISRU)',
    badge: 'NASA LCROSS 2009 Impact Data',
    verifiedScience:
      'On October 9, 2009, NASA’s LCROSS spacecraft impacted Cabeus crater. Spectrometer analysis of the debris plume measured 5.6 ± 2.9% water ice by mass, confirming that lunar water can supply drinking water, oxygen, and rocket propellant.',
    gameplayConnection:
      'Water Processing Facility and PSR expeditions directly replenish potable water reserves and breathable oxygen through electrolysis.',
    sourceTitle: 'NASA LCROSS Mission Water Detection Science Report',
    sourceUrl: 'https://science.nasa.gov/mission/lcross/',
  },
  {
    id: 'solar-power',
    title: 'Solar Illumination & Kilowatt Power Budgeting',
    badge: 'NASA Artemis Surface Power Architecture',
    verifiedScience:
      'Because sunlight strikes south-pole topography horizontally, vertical solar tracking arrays on elevated ridges harvest power continuously, while regenerative fuel cells or lithium-ion battery banks buffer shadow passages.',
    gameplayConnection:
      'Power generation in kW directly balances habitat base load in kW, while battery capacity (kWh) buffers energy deficits during low-sunlight periods.',
    sourceTitle: 'NASA Lunar Surface Power Architecture Technical Reports',
    sourceUrl: 'https://www.nasa.gov/mission/artemis/',
  },
  {
    id: 'radiation',
    title: 'Space Radiation & Solar Particle Events (SPE)',
    badge: 'NASA SRAG & DONKI Space Weather',
    verifiedScience:
      'Outside Earth’s magnetosphere, lunar crews face continuous Galactic Cosmic Rays (GCRs) and unpredictable Solar Particle Events (SPEs). Compacted regolith mass and hydrogen-rich water walls provide effective ionizing radiation shielding.',
    gameplayConnection:
      'Radiation Shelter construction and regolith reinforcement directives protect crew health against elevated space-weather conditions.',
    sourceTitle: 'NASA Space Radiation Analysis Group (SRAG) Operational Baselines',
    sourceUrl: 'https://science.nasa.gov/biological-physical/focus-areas/space-radiation/',
  },
  {
    id: 'eclss',
    title: 'Closed-Loop ECLSS & Hydroponic Agriculture',
    badge: 'NASA ISS ECLSS 98% Recovery Milestone',
    verifiedScience:
      'NASA demonstrated a 98% water recovery milestone on the ISS using the Urine Processor Assembly and Brine Processor Assembly (BPA). Exhaled CO2 is reduced via the Sabatier reactor and supplemented by hydroponic LED growth chambers.',
    gameplayConnection:
      'Life Support, Water Processing, and Greenhouse modules form interdependent O2, H2O, and Food recycling loops upgradeable through the Research Tree.',
    sourceTitle: 'NASA ISS Environmental Control and Life Support Systems (ECLSS)',
    sourceUrl: 'https://www.nasa.gov/humans-in-space/life-support-systems/',
  },
];

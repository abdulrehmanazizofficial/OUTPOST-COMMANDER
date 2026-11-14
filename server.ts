import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface AdvisorRequestBody {
  question?: string;
  snapshot?: {
    missionName: string;
    commanderName: string;
    scenarioTitle: string;
    difficulty: string;
    sol: number;
    targetSols: number;
    environment: {
      solarIlluminationPct: number;
      surfaceTempC: number;
      radiationLevel: string;
      dustStormActive: boolean;
      commsQualityPct: number;
    };
    resources: {
      powerGeneration: number;
      powerDemand: number;
      batteryPct: number;
      oxygenPct: number;
      waterPct: number;
      foodPct: number;
      radiationShieldingPct: number;
      materials: number;
      researchPoints: number;
    };
    crewSummary: {
      count: number;
      avgHealth: number;
      avgFatigue: number;
      avgMorale: number;
    };
    damagedModules: string[];
    unbuiltCriticalModules: string[];
    activeEvents: string[];
    incompleteObjectives: string[];
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(getGeminiClient());
    res.json({ ok: true, geminiConfigured: hasGemini });
  });

  // In-memory cache for NASA space weather data
  let spaceWeatherCache: {
    timestamp: number;
    data: unknown;
  } | null = null;
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  app.get('/api/nasa-space-weather', async (_req, res) => {
    const now = Date.now();
    if (spaceWeatherCache && now - spaceWeatherCache.timestamp < CACHE_TTL_MS) {
      res.json(spaceWeatherCache.data);
      return;
    }

    const officialDatasets = [
      {
        id: 'lro-diviner',
        title: 'NASA LRO Diviner Lunar Radiometer Experiment (DLRE)',
        organization: 'UCLA / NASA JPL / PDS Geosciences Node',
        datasetUrl: 'https://pds-geosciences.wustl.edu/lro/lro-l-dlre-4-rdr-v1/lrodlr_1001/',
        summary:
          'Thermal measurements showing permanently shadowed south-pole craters dropping below 40 Kelvin (-233 °C), capable of trapping volatiles for billions of years.',
      },
      {
        id: 'lro-lola',
        title: 'NASA LRO Lunar Orbiter Laser Altimeter (LOLA) Polar Topography',
        organization: 'NASA Goddard Space Flight Center / PDS',
        datasetUrl: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/',
        summary:
          'High-resolution polar digital elevation models identifying peaks of eternal light and crater slope gradients around Shackleton, Faustini, and Malapert Mountain.',
      },
      {
        id: 'lcross-impact',
        title: 'NASA LCROSS 2009 Cabeus Crater Kinetic Impact',
        organization: 'NASA Ames Research Center (Colaprete et al., Science 2010)',
        datasetUrl: 'https://www.nasa.gov/mission_pages/LCROSS/main/index.html',
        summary:
          'Direct spectroscopic confirmation of water ice (5.5 ± 1.4% by mass), hydrocarbons, and hydroxyl molecules lofted from the Cabeus crater floor.',
      },
      {
        id: 'nasa-srag',
        title: 'NASA Space Radiation Analysis Group (SRAG) Operational Standards',
        organization: 'NASA Johnson Space Center',
        datasetUrl: 'https://www.nasa.gov/johnson/space-radiation-analysis-group',
        summary:
          'Radiation monitoring guidelines and lunar surface dosage mitigation using packed regolith berms and storm shelters during Solar Energetic Particle (SEP) events.',
      },
    ];

    try {
      // Query NASA DONKI (Database of Notifications, Knowledge, and Information) public endpoint
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startStr = thirtyDaysAgo.toISOString().slice(0, 10);
      const donkiUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&api_key=DEMO_KEY`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const donkiRes = await fetch(donkiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      let eventsList: Array<{ flrID: string; classType: string; beginTime: string; peakTime: string; link: string }> = [];
      if (donkiRes.ok) {
        const json = await donkiRes.json();
        if (Array.isArray(json)) {
          eventsList = json.slice(-5).map((e: any) => ({
            flrID: e.flrID || 'FLR-RECENT',
            classType: e.classType || 'M-Class',
            beginTime: e.beginTime || startStr,
            peakTime: e.peakTime || startStr,
            link: e.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          }));
        }
      }

      const payload = {
        source: eventsList.length > 0 ? 'nasa-donki-live' : 'nasa-curated-baseline',
        timestamp: new Date().toISOString(),
        solarCycle: 'Solar Cycle 25 (Active Phase)',
        lunarDoseRateMgyPerDay: '1.36 mGy/day (LRO CRaTER baseline at solar minimum/moderate)',
        flareEvents: eventsList.length > 0 ? eventsList : [
          {
            flrID: '2024-05-10T17:44:00-FLR-001',
            classType: 'X5.8 Solar Flare',
            beginTime: '2024-05-10T17:44Z',
            peakTime: '2024-05-10T18:23Z',
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          },
          {
            flrID: '2024-10-03T12:18:00-FLR-001',
            classType: 'X9.0 Solar Flare',
            beginTime: '2024-10-03T12:18Z',
            peakTime: '2024-10-03T12:50Z',
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          },
        ],
        spaceWeatherAlertThresholds: {
          nominal: 'G1 / Minor or Quiet Solar Flare Conditions (< C-Class)',
          warning: 'M-Class Flare or Proton Flux > 10 pfu (Crew stays within reinforced modules)',
          critical: 'X-Class Flare or Ground-Level SEP Event (Crew relocates to Underground Regolith Shelter)',
        },
        officialDatasets,
      };

      spaceWeatherCache = { timestamp: now, data: payload };
      res.json(payload);
    } catch {
      // Deterministic NASA baseline fallback on timeout / network error
      const payload = {
        source: 'nasa-curated-baseline',
        timestamp: new Date().toISOString(),
        solarCycle: 'Solar Cycle 25 (Active Phase)',
        lunarDoseRateMgyPerDay: '1.36 mGy/day (LRO CRaTER baseline)',
        flareEvents: [
          {
            flrID: '2024-05-10T17:44:00-FLR-001',
            classType: 'X5.8 Solar Flare',
            beginTime: '2024-05-10T17:44Z',
            peakTime: '2024-05-10T18:23Z',
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          },
        ],
        spaceWeatherAlertThresholds: {
          nominal: 'Minor or Quiet Solar Conditions',
          warning: 'M-Class Flare (Crew remains in habitat)',
          critical: 'X-Class Flare / SEP Storm (Shelter in Underground Regolith Bunker)',
        },
        officialDatasets,
      };
      spaceWeatherCache = { timestamp: now, data: payload };
      res.json(payload);
    }
  });

  app.post('/api/advisor', async (req, res) => {
    const body = (req.body || {}) as AdvisorRequestBody;
    if (!body.snapshot) {
      res.status(400).json({ error: 'Missing mission state snapshot.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(200).json({
        source: 'deterministic-fallback',
        advisoryNotice:
          'Advisory Only — Deterministic Mission Operations Rules Engine (Gemini API key not active in environment).',
        advice: null,
      });
      return;
    }

    try {
      const prompt = [
        'Analyze this educational lunar outpost simulation snapshot and provide concise, grounded tactical recommendations.',
        body.question
          ? `Commander specific inquiry: "${body.question}"`
          : 'Provide a prioritized Sol briefing covering life support, power, crew safety, and objectives.',
        '',
        `Telemetry Snapshot JSON:\n${JSON.stringify(body.snapshot, null, 2)}`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an educational NASA-inspired Flight Director Advisory System for OUTPOST COMMANDER (a lunar south-pole simulation). ' +
            'Clearly remember all values are simplified educational simulation metrics, not real spacecraft telemetry. ' +
            'Give practical, calm, accurate operational advice based strictly on the provided snapshot. ' +
            'When suggesting consoles, reference the exact tabs: MISSION, BASE, CREW, EXPLORE, or SCIENCE.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['situationSummary', 'riskLevel', 'recommendations', 'scienceNote'],
            properties: {
              situationSummary: {
                type: Type.STRING,
                description: '2-3 sentence assessment of the outpost status right now.',
              },
              riskLevel: {
                type: Type.STRING,
                description: 'One of: NOMINAL, ELEVATED, HIGH, CRITICAL',
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['priority', 'title', 'rationale', 'suggestedSection'],
                  properties: {
                    priority: {
                      type: Type.STRING,
                      description: 'URGENT, HIGH, MEDIUM, or LOW',
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Short actionable recommendation headline.',
                    },
                    rationale: {
                      type: Type.STRING,
                      description: 'Why this action matters based on current telemetry and lunar science.',
                    },
                    suggestedSection: {
                      type: Type.STRING,
                      description: 'Exact console tab: MISSION, BASE, CREW, EXPLORE, or SCIENCE.',
                    },
                  },
                },
              },
              scienceNote: {
                type: Type.STRING,
                description: 'One brief educational lunar science or engineering insight relevant to the current situation.',
              },
            },
          },
        },
      });

      const rawText = (response.text || '').trim();
      const parsed = JSON.parse(rawText);

      res.json({
        source: 'gemini',
        model: 'gemini-2.5-flash',
        advisoryNotice:
          'AI-Generated Advisory — Recommendations are educational guidance only and never modify outpost resources automatically.',
        advice: parsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      res.status(200).json({
        source: 'deterministic-fallback',
        advisoryNotice:
          'Advisory Only — Fell back to deterministic Mission Operations analyzer due to external AI service unavailability.',
        errorDetail: message,
        advice: null,
      });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Outpost Commander server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

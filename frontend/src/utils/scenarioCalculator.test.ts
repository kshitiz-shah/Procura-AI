import { describe, it, expect } from 'vitest';
import { calculateScenarioDifferential, SCENARIO_PRESETS, DEFAULT_SCENARIO_PARAMS } from './scenarioCalculator';
import { Scorecard } from '../types/procurement';

const mockScorecard: Scorecard = {
  evaluation_id: 'test-eval-001',
  currency: 'USD',
  scoring_fingerprint: 'test-fingerprint',
  ranking: [
    {
      vendor_id: 'vendor-apex-01',
      vendor_name: 'Apex Technologies Inc.',
      rank: 1,
      overall_score: '91.50',
      financial_score: '94.00',
      technical_score: '92.50',
      risk_score: '84.00',
      is_eligible: true,
      landed_cost: '392500',
      currency: 'USD',
    },
    {
      vendor_id: 'vendor-nexus-02',
      vendor_name: 'Nexus Industrial Solutions',
      rank: 2,
      overall_score: '87.20',
      financial_score: '85.50',
      technical_score: '95.00',
      risk_score: '81.00',
      is_eligible: true,
      landed_cost: '415000',
      currency: 'USD',
    },
  ],
};

describe('scenarioCalculator', () => {
  it('has valid presets with non-empty descriptions and weights', () => {
    expect(SCENARIO_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of SCENARIO_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.priceWeight).toBeGreaterThan(0);
      expect(preset.techWeight).toBeGreaterThan(0);
      expect(preset.riskWeight).toBeGreaterThan(0);
    }
  });

  it('calculates differentials under balanced baseline weights', () => {
    const result = calculateScenarioDifferential(
      mockScorecard,
      DEFAULT_SCENARIO_PARAMS.priceWeight,
      DEFAULT_SCENARIO_PARAMS.techWeight,
      DEFAULT_SCENARIO_PARAMS.riskWeight,
      DEFAULT_SCENARIO_PARAMS.costShockPct
    );

    expect(result.baseline_evaluation_id).toBe('test-eval-001');
    expect(result.differentials.length).toBe(2);
    expect(result.winner_displaced).toBe(false);
    expect(result.new_winner_name).toBe('Apex Technologies Inc.');
  });

  it('detects winner displacement when technical weight dominates', () => {
    // Nexus has higher technical score (95 vs 92.5) and lower financial score.
    // When technical weight is 80% and price weight is 10%, Nexus may challenge or displacement occurs.
    const result = calculateScenarioDifferential(
      mockScorecard,
      10, // low financial weight
      80, // high technical weight
      10,
      0
    );

    // Nexus: (85.5*10 + 95*80 + 81*10)/100 = 855 + 7600 + 810 = 9265 / 100 = 92.65
    // Apex:  (94*10 + 92.5*80 + 84*10)/100 = 940 + 7400 + 840 = 9180 / 100 = 91.80
    // So Nexus becomes #1 and winner is displaced!
    expect(result.winner_displaced).toBe(true);
    expect(result.new_winner_name).toBe('Nexus Industrial Solutions');
    expect(result.baseline_winner_name).toBe('Apex Technologies Inc.');
    expect(result.differentials[0].vendor_id).toBe('vendor-nexus-02');
  });

  it('applies cost shocks to landed cost accurately', () => {
    const costShock = 20; // +20%
    const result = calculateScenarioDifferential(mockScorecard, 40, 40, 20, costShock);

    const apexDiff = result.differentials.find((d) => d.vendor_id === 'vendor-apex-01');
    expect(apexDiff).toBeDefined();
    // 392500 * 1.2 = 471000
    expect(apexDiff!.scenario_cost).toBe(471000);
    expect(apexDiff!.delta_cost).toBe(78500);
  });
});

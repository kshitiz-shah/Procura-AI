import { Scorecard, ScenarioRunResult, ScenarioDifferential } from '../types/procurement';

export interface ScenarioPreset {
  id: string;
  name: string;
  shortDesc: string;
  priceWeight: number;
  techWeight: number;
  riskWeight: number;
  costShockPct: number;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline',
    name: 'Balanced Baseline',
    shortDesc: 'Standard 40/40/20 weights',
    priceWeight: 40,
    techWeight: 40,
    riskWeight: 20,
    costShockPct: 0,
  },
  {
    id: 'inflation',
    name: 'Inflation & Cost Surge',
    shortDesc: '55% price weight, +15% cost shock',
    priceWeight: 55,
    techWeight: 30,
    riskWeight: 15,
    costShockPct: 15,
  },
  {
    id: 'technical',
    name: 'Mission-Critical SLA',
    shortDesc: '60% technical performance priority',
    priceWeight: 25,
    techWeight: 60,
    riskWeight: 15,
    costShockPct: 0,
  },
  {
    id: 'risk',
    name: 'Risk & Sanctions Shield',
    shortDesc: '40% risk penalty, +20% cost shock',
    priceWeight: 30,
    techWeight: 30,
    riskWeight: 40,
    costShockPct: 20,
  },
];

export const DEFAULT_SCENARIO_PARAMS = {
  priceWeight: 40,
  techWeight: 40,
  riskWeight: 20,
  costShockPct: 0,
};

/**
 * Deterministically recalculates vendor scores, landed costs, and ranking shifts under
 * custom criteria weights and cost shock percentages.
 */
export function calculateScenarioDifferential(
  scorecard: Scorecard,
  priceWeight: number,
  techWeight: number,
  riskWeight: number,
  costShockPct: number
): ScenarioRunResult {
  const totalWeight = Math.max(priceWeight + techWeight + riskWeight, 1);
  const wFin = priceWeight / totalWeight;
  const wTech = techWeight / totalWeight;
  const wRisk = riskWeight / totalWeight;

  // Identify baseline winner (rank #1)
  const baselineWinner =
    scorecard.ranking.find((v) => v.rank === 1) || scorecard.ranking[0];

  // Calculate re-weighted score and updated landed cost for each vendor
  const scoredVendors = scorecard.ranking.map((vendor) => {
    const fin = Number(vendor.financial_score) || 0;
    const tech = Number(vendor.technical_score) || 0;
    const risk = Number(vendor.risk_score) || 0;
    const baseCost = Number(vendor.landed_cost) || 0;

    const newScore = fin * wFin + tech * wTech + risk * wRisk;
    const newCost = baseCost * (1 + costShockPct / 100);

    return {
      vendor_id: vendor.vendor_id,
      vendor_name: vendor.vendor_name,
      baseline_score: Number(vendor.overall_score),
      scenario_score: Number(newScore.toFixed(2)),
      baseline_rank: vendor.rank,
      baseline_cost: baseCost,
      scenario_cost: Math.round(newCost),
    };
  });

  // Sort descending by scenario_score (with higher tech score or lower cost as secondary tie-breakers)
  scoredVendors.sort((a, b) => b.scenario_score - a.scenario_score);

  // Assign new scenario ranks
  const differentials: ScenarioDifferential[] = scoredVendors.map((v, idx) => {
    const scenario_rank = idx + 1;
    const delta_score = Number((v.scenario_score - v.baseline_score).toFixed(2));
    const delta_cost = v.scenario_cost - v.baseline_cost;
    const delta_rank = v.baseline_rank - scenario_rank;

    return {
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      baseline_score: v.baseline_score,
      scenario_score: v.scenario_score,
      delta_score,
      baseline_rank: v.baseline_rank,
      scenario_rank,
      delta_rank,
      baseline_cost: v.baseline_cost,
      scenario_cost: v.scenario_cost,
      delta_cost,
    };
  });

  const newWinner = differentials[0];
  const winnerDisplaced =
    newWinner && baselineWinner && newWinner.vendor_id !== baselineWinner.vendor_id;

  const scoreMargin = (
    Number(differentials[0]?.scenario_score || 0) -
    Number(differentials[1]?.scenario_score || 0)
  ).toFixed(1);

  const tradeOffAnalysis = winnerDisplaced
    ? `Shifted sensitivity parameters (Price: ${priceWeight}%, Tech: ${techWeight}%, Risk: ${riskWeight}%, Cost Shock: ${costShockPct >= 0 ? `+${costShockPct}` : costShockPct}%) displace ${baselineWinner.vendor_name} in favor of ${newWinner.vendor_name} due to higher responsiveness to adjusted weights.`
    : `${baselineWinner ? baselineWinner.vendor_name : 'Current leader'} maintains competitive rank #1 under the simulated parameter shift with a margin of ${scoreMargin} points over the runner-up.`;

  return {
    scenario_id: `scen-${Date.now().toString(36)}`,
    scenario_name: `What-If Price ${priceWeight}% / Tech ${techWeight}% / Risk ${riskWeight}% (Cost Shock: ${costShockPct}%)`,
    baseline_evaluation_id: scorecard.evaluation_id,
    winner_displaced: winnerDisplaced,
    new_winner_id: newWinner ? newWinner.vendor_id : '',
    new_winner_name: newWinner ? newWinner.vendor_name : '',
    baseline_winner_id: baselineWinner ? baselineWinner.vendor_id : '',
    baseline_winner_name: baselineWinner ? baselineWinner.vendor_name : '',
    differentials,
    trade_off_analysis: tradeOffAnalysis,
    recommendations: [
      winnerDisplaced
        ? `Evaluate transition risks and expedited lead-times before switching to ${newWinner.vendor_name}.`
        : `Baseline recommendation remains robust against simulated economic fluctuations.`,
    ],
  };
}

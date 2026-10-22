import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Sparkles,
  Download,
  Check,
  RotateCcw,
} from 'lucide-react';
import { BentoCard } from '../bento/BentoCard';
import { Scorecard, ScenarioRunResult } from '../../types/procurement';
import { api } from '../../api/client';
import {
  SCENARIO_PRESETS,
  DEFAULT_SCENARIO_PARAMS,
  calculateScenarioDifferential,
  ScenarioPreset,
} from '../../utils/scenarioCalculator';

interface ScenarioStudioCardProps {
  scorecard: Scorecard;
}

export const ScenarioStudioCard: React.FC<ScenarioStudioCardProps> = ({ scorecard }) => {
  const [priceWeight, setPriceWeight] = useState<number>(DEFAULT_SCENARIO_PARAMS.priceWeight);
  const [techWeight, setTechWeight] = useState<number>(DEFAULT_SCENARIO_PARAMS.techWeight);
  const [riskWeight, setRiskWeight] = useState<number>(DEFAULT_SCENARIO_PARAMS.riskWeight);
  const [costShockPct, setCostShockPct] = useState<number>(DEFAULT_SCENARIO_PARAMS.costShockPct);
  const [activePresetId, setActivePresetId] = useState<string | null>('baseline');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioRunResult | null>(null);
  const [isExported, setIsExported] = useState<boolean>(false);

  const applyPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setPriceWeight(preset.priceWeight);
    setTechWeight(preset.techWeight);
    setRiskWeight(preset.riskWeight);
    setCostShockPct(preset.costShockPct);
  };

  const handleResetToBaseline = () => {
    setActivePresetId('baseline');
    setPriceWeight(DEFAULT_SCENARIO_PARAMS.priceWeight);
    setTechWeight(DEFAULT_SCENARIO_PARAMS.techWeight);
    setRiskWeight(DEFAULT_SCENARIO_PARAMS.riskWeight);
    setCostShockPct(DEFAULT_SCENARIO_PARAMS.costShockPct);
    setScenarioResult(null);
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const totalWeight = priceWeight + techWeight + riskWeight;
      const normalizedWeights = {
        financial: priceWeight / totalWeight,
        technical: techWeight / totalWeight,
        risk: riskWeight / totalWeight,
      };

      // Cost adjustments per vendor if costShockPct != 0
      const costAdjustments: Record<string, number> = {};
      if (costShockPct !== 0) {
        scorecard.ranking.forEach((v) => {
          const base = Number(v.landed_cost);
          costAdjustments[v.vendor_id] = base * (1 + costShockPct / 100);
        });
      }

      const res = await api.simulateScenario({
        scenario_name: `What-If Price Sensitivity ${priceWeight}% & Cost Shift ${costShockPct}%`,
        description: 'Simulated parameter shift against immutable baseline evaluation.',
        baseline_scorecard: scorecard,
        criteria_weights_override: normalizedWeights,
        landed_cost_adjustments: Object.keys(costAdjustments).length > 0 ? costAdjustments : undefined,
      });

      setScenarioResult(res);
    } catch {
      // Deterministic client-side fallback simulation when backend is offline or previewing
      const fallbackResult = calculateScenarioDifferential(
        scorecard,
        priceWeight,
        techWeight,
        riskWeight,
        costShockPct
      );
      setScenarioResult(fallbackResult);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportScenario = () => {
    if (!scenarioResult) return;

    const exportData = {
      platform: 'Sourcyn AI Procurement & Vendor Intelligence',
      exported_at: new Date().toISOString(),
      baseline_evaluation_id: scorecard.evaluation_id,
      scenario_id: scenarioResult.scenario_id,
      scenario_name: scenarioResult.scenario_name,
      applied_parameters: {
        price_weight_pct: priceWeight,
        tech_weight_pct: techWeight,
        risk_weight_pct: riskWeight,
        cost_shock_pct: costShockPct,
      },
      winner_displacement: {
        displaced: scenarioResult.winner_displaced,
        new_winner_id: scenarioResult.new_winner_id,
        new_winner_name: scenarioResult.new_winner_name,
        baseline_winner_id: scenarioResult.baseline_winner_id,
        baseline_winner_name: scenarioResult.baseline_winner_name,
      },
      differentials: scenarioResult.differentials,
      trade_off_analysis: scenarioResult.trade_off_analysis,
      recommendations: scenarioResult.recommendations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sourcyn-scenario-simulation-${scenarioResult.scenario_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  const renderDelta = (delta: number | string, isCost: boolean = false) => {
    const num = Number(delta);
    if (num > 0) {
      return (
        <span
          className={`inline-flex items-center text-xs font-mono font-bold ${
            isCost ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          <ArrowUpRight className="w-3 h-3 mr-0.5" />
          {isCost ? `+$${num.toLocaleString()}` : `+${num.toFixed(2)}`}
        </span>
      );
    }
    if (num < 0) {
      return (
        <span
          className={`inline-flex items-center text-xs font-mono font-bold ${
            isCost ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          <ArrowDownRight className="w-3 h-3 mr-0.5" />
          {isCost ? `-$${Math.abs(num).toLocaleString()}` : num.toFixed(2)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs font-mono text-slate-500">
        <Minus className="w-3 h-3 mr-0.5" /> 0.00
      </span>
    );
  };

  return (
    <BentoCard
      title="What-If Scenario Simulation Studio"
      subtitle="Agent 7 & Python Simulation Engine: Deep differential analysis & winner displacement detection"
      icon={Sliders}
      badge="Zero Side-Effects"
      badgeColor="steel"
      colSpan="col-span-1"
      className="lg:col-span-2"
      glow="steel"
      headerAction={
        scenarioResult ? (
          <button
            onClick={handleExportScenario}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-sm"
            title="Download scenario simulation report (JSON)"
          >
            {isExported ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#80A1C1]" />
                <span className="hidden sm:inline">Export Scenario</span>
              </>
            )}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Quick-Load Stress-Test Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Stress-Test Simulation Presets
            </label>
            <button
              type="button"
              onClick={handleResetToBaseline}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition"
              title="Reset parameters to baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to baseline</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCENARIO_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-[#80A1C1] bg-[#80A1C1]/10 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="block text-xs font-bold text-white leading-tight">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                    {preset.shortDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl border border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Price Sensitivity Weight</span>
              <span className="font-mono text-[#FAD4C0] font-bold">{priceWeight}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={priceWeight}
              onChange={(e) => {
                setPriceWeight(Number(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FAD4C0]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Technical SLA Weight</span>
              <span className="font-mono text-[#80A1C1] font-bold">{techWeight}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={techWeight}
              onChange={(e) => {
                setTechWeight(Number(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#80A1C1]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Risk Penalty Weight</span>
              <span className="font-mono text-amber-400 font-bold">{riskWeight}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={riskWeight}
              onChange={(e) => {
                setRiskWeight(Number(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Supply Chain Cost Shock</span>
              <span
                className={`font-mono font-bold ${
                  costShockPct > 0
                    ? 'text-rose-400'
                    : costShockPct < 0
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {costShockPct > 0 ? `+${costShockPct}%` : `${costShockPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={30}
              step={5}
              value={costShockPct}
              onChange={(e) => {
                setCostShockPct(Number(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs tracking-wide transition disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FAD4C0]" />
                <span>Simulating Differentials...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-[#FAD4C0]" />
                <span>Simulate Scenario Branch</span>
              </>
            )}
          </button>
        </div>

        {/* Winner Displacement Alert Banner */}
        {scenarioResult && scenarioResult.winner_displaced && (
          <div className="p-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Winner Displacement Alert!</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>{scenarioResult.new_winner_name}</strong> displaces{' '}
              <strong>{scenarioResult.baseline_winner_name}</strong> as the #1 ranked supplier under
              these shifted sensitivity constraints.
            </p>
          </div>
        )}

        {/* Differentials Comparison Table */}
        {scenarioResult && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Vendor</th>
                  <th className="py-2 px-2 text-center">Score</th>
                  <th className="py-2 px-2 text-center">Δ Score</th>
                  <th className="py-2 px-2 text-center">Rank</th>
                  <th className="py-2 px-3 text-right">Δ Landed Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {scenarioResult.differentials.map((diff) => (
                  <tr key={diff.vendor_id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2 px-3 font-sans font-semibold text-white">
                      {diff.vendor_name}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      {Number(diff.scenario_score).toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-center">{renderDelta(diff.delta_score)}</td>
                    <td className="py-2 px-2 text-center text-slate-300">
                      #{diff.scenario_rank}{' '}
                      <span className="text-[9px] text-slate-500 font-normal">
                        ({diff.baseline_rank !== diff.scenario_rank ? `was #${diff.baseline_rank}` : 'unchanged'})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{renderDelta(diff.delta_cost, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Agent 7 Qualitative Trade-off Synthesis */}
        {scenarioResult && scenarioResult.trade_off_analysis && (
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#80A1C1]" />
              <span>Agent 7 Trade-off Rationale:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {scenarioResult.trade_off_analysis}
            </p>
          </div>
        )}
      </div>
    </BentoCard>
  );
};

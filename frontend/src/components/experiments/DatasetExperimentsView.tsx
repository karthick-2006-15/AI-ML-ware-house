import React, { useState } from 'react';

import Card from '../common/Card';
import Badge from '../common/Badge';

export const DatasetExperimentsView: React.FC = () => {
  const [filterFamily, setFilterFamily] = useState<'ALL' | 'LR' | 'RF' | 'XGB'>('ALL');

  const experiments = [
    { id: 'EXP-LR-01', family: 'LR', name: 'Logistic Regression', params: 'C=0.01, L2 penalty', acc: '0.8337', rec: '49.62%', prec: '81.25%', f1: '0.6161', auc: '0.9160' },
    { id: 'EXP-LR-02', family: 'LR', name: 'Logistic Regression', params: 'C=0.10, L2 penalty', acc: '0.8295', rec: '57.25%', prec: '76.00%', f1: '0.6532', auc: '0.9174' },
    { id: 'EXP-LR-03', family: 'LR', name: 'Logistic Regression', params: 'C=1.00, L2 penalty', acc: '0.8254', rec: '60.31%', prec: '70.54%', f1: '0.6502', auc: '0.9178' },
    { id: 'EXP-LR-04', family: 'LR', name: 'Logistic Regression', params: 'C=10.0, L2 penalty', acc: '0.8337', rec: '71.76%', prec: '66.67%', f1: '0.6912', auc: '0.9191' },
    { id: 'EXP-RF-01', family: 'RF', name: 'Random Forest', params: 'n=100, default depth', acc: '0.8316', rec: '53.44%', prec: '77.78%', f1: '0.6335', auc: '0.8986' },
    { id: 'EXP-RF-02', family: 'RF', name: 'Random Forest', params: 'n=150, depth=12, split=5', acc: '0.8295', rec: '53.44%', prec: '76.92%', f1: '0.6306', auc: '0.9008' },
    { id: 'EXP-RF-03', family: 'RF', name: 'Random Forest', params: 'n=150, depth=10, balanced', acc: '0.8170', rec: '73.28%', prec: '64.43%', f1: '0.6857', auc: '0.9032' },
    { id: 'EXP-RF-04', family: 'RF', name: 'Random Forest', params: 'n=200, depth=8, balanced_sub', acc: '0.8046', rec: '72.52%', prec: '61.08%', f1: '0.6631', auc: '0.9015' },
    { id: 'EXP-XGB-01', family: 'XGB', name: 'XGBoost', params: 'lr=0.1, depth=6, n=100', acc: '0.8254', rec: '56.49%', prec: '71.15%', f1: '0.6298', auc: '0.8970' },
    { id: 'EXP-XGB-02', family: 'XGB', name: 'XGBoost', params: 'lr=0.05, depth=4, n=150', acc: '0.8316', rec: '59.54%', prec: '73.81%', f1: '0.6591', auc: '0.9084' },
    { id: 'EXP-XGB-03', family: 'XGB', name: 'XGBoost', params: 'lr=0.05, depth=4, spw=2.68', acc: '0.8170', rec: '83.21%', prec: '62.64%', f1: '0.7148', auc: '0.9096' },
    { id: 'EXP-XGB-04', family: 'XGB', name: 'Tuned XGBoost', params: 'spw=2.68, lr=0.03, gamma=1', acc: '0.8191', rec: '85.50%', prec: '62.22%', f1: '0.7203', auc: '0.9115', isChampion: true },
    { id: 'EXP-XGB-05', family: 'XGB', name: 'XGBoost', params: 'lr=0.03, depth=7, colsample=0.7', acc: '0.8274', rec: '78.63%', prec: '65.87%', f1: '0.7169', auc: '0.9081' },
  ];

  const filtered = filterFamily === 'ALL' ? experiments : experiments.filter(e => e.family === filterFamily);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Audit Trail & Empirical Benchmarks
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Dataset & Experiments
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Overview of the warehouse inventory dataset and all 10 logged experiments.
          </p>
        </div>

        <Badge variant="primary" size="md">
          logistics_dataset.csv (3,204 Rows)
        </Badge>
      </div>

      {/* 2. Dataset Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 flex flex-col justify-between text-center hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,217,255,0.2)] transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Samples</span>
          <span className="text-2xl font-black text-white font-mono my-1">3,204</span>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Complete
          </span>
        </Card>

        <Card className="p-4 flex flex-col justify-between text-center hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,217,255,0.2)] transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400">Raw Features</span>
          <span className="text-2xl font-black text-cyan-400 neon-text-cyan font-mono my-1">23</span>
          <span className="text-[10px] text-slate-400">&rarr; 38 Engineered</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between text-center hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,217,255,0.2)] transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400">Missing / Duplicates</span>
          <span className="text-2xl font-black text-white font-mono my-1">0 / 0</span>
          <span className="text-[10px] text-emerald-400 font-semibold">Zero Sanitization Loss</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between text-center hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400">Low Risk (Class 0)</span>
          <span className="text-2xl font-black text-emerald-400 neon-text-green font-mono my-1">2,334</span>
          <span className="text-[10px] text-slate-400 font-mono">72.85%</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between text-center hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400">High Risk (Class 1)</span>
          <span className="text-2xl font-black text-rose-400 neon-text-red font-mono my-1">870</span>
          <span className="text-[10px] text-slate-400 font-mono">27.15% (2.68:1)</span>
        </Card>
      </div>

      {/* 3. Experiments Table with Filter Tabs */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1A2D4A]">
          <div>
            <h2 className="text-base font-bold text-white">Controlled Experiment Matrix</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in results/experiment_log.csv across Logistic Regression, Random Forest, and XGBoost
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#08182A] border border-[#1A2D4A] rounded-xl p-1">
            {(['ALL', 'XGB', 'RF', 'LR'] as const).map((fam) => (
              <button
                key={fam}
                onClick={() => setFilterFamily(fam)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  filterFamily === fam
                    ? 'bg-[#1683FF] text-white shadow-[0_0_12px_rgba(22,131,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {fam}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1A2D4A] text-slate-400 uppercase font-mono">
                <th className="py-3 px-3">Exp ID</th>
                <th className="py-3 px-3">Model</th>
                <th className="py-3 px-3">Hyperparameters</th>
                <th className="py-3 px-3">Val Acc</th>
                <th className="py-3 px-3">Val Recall</th>
                <th className="py-3 px-3">Val Precision</th>
                <th className="py-3 px-3">Val F1</th>
                <th className="py-3 px-3">Val ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2D4A]/60">
              {filtered.map((exp) => (
                <tr
                  key={exp.id}
                  className={`transition-colors ${
                    exp.isChampion
                      ? 'bg-cyan-950/25 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(0,217,255,0.1)]'
                      : 'hover:bg-slate-800/20'
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">
                    {exp.id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                    {exp.name}
                    {exp.isChampion && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00D9FF] text-[9px] font-extrabold border border-cyan-400/60 shadow-[0_0_10px_rgba(0,217,255,0.3)] animate-pulse">
                        CHAMPION
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{exp.params}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{exp.acc}</td>
                  <td className={`py-3 px-3 font-mono font-bold ${exp.isChampion ? 'text-cyan-300 neon-text-cyan' : 'text-slate-300'}`}>
                    {exp.rec}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{exp.prec}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{exp.f1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">{exp.auc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default DatasetExperimentsView;

import React from 'react';

export default function AnalyticsCard({ title, value, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    green: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    purple: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-1">
          {title}
        </p>
        <h4 className="text-3xl font-extrabold text-white leading-none">
          {value}
        </h4>
      </div>
      <div className={`p-3.5 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

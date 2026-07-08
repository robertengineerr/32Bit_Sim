import React from 'react';
import { catalog, CATEGORY_ORDER } from '../data/partsCatalog.js';

const VARIANTS = {
  led: ['red', 'white', 'blue', 'green', 'yellow'],
  resistor: ['10', '100', '220', '330', '1k', '2k', '5.1k', '10k', '100k', '1M'],
};

export default function Toolbox({ onAdd }) {
  const grouped = {};
  for (const [type, def] of Object.entries(catalog)) {
    (grouped[def.category] ||= []).push({ type, def });
  }

  return (
    <div className="toolbox">
      <div className="toolbox-title">Parts</div>
      {CATEGORY_ORDER.filter((c) => grouped[c]).map((cat) => (
        <div key={cat} className="tb-category">
          <div className="tb-category-title">{cat}</div>
          {grouped[cat].map(({ type, def }) => {
            const variants = VARIANTS[type];
            if (variants) {
              return variants.map((v) => (
                <button key={`${type}-${v}`} className="tb-item" onClick={() => onAdd(type, v)} title={`${def.label} (${v})`}>
                  {def.label} <span className="tb-variant">{type === 'resistor' ? `${v}Ω` : v}</span>
                </button>
              ));
            }
            return (
              <button key={type} className="tb-item" onClick={() => onAdd(type)} title={def.label}>
                {def.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

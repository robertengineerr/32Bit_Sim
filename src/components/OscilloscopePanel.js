import React from 'react';

const SCOPE_WIDTH = 400; // viewBox width for the SVG graph
const SCOPE_HEIGHT = 140;
const GRAPH_TOP = 10;
const GRAPH_H = 120; // usable graph height (y=10 to y=130)
const VCC = 3.3;

// Map a voltage (0..3.3) to SVG y in [GRAPH_TOP, GRAPH_TOP+GRAPH_H]
function voltToY(v) {
  return GRAPH_TOP + (1 - Math.max(0, Math.min(VCC, v)) / VCC) * GRAPH_H;
}

export default function OscilloscopePanel({ scopePins, history, onRemove }) {
  if (!scopePins || scopePins.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "scope-panel",
      style: { padding: '8px 10px', color: '#475569', fontSize: 11 }
    }, "No pins probed. Enable Probe mode and click a pin to add it.");
  }

  const colors = ['#ef4444', '#fbbf24', '#22c55e', '#3b82f6'];
  const totalPoints = 150;

  // Build polylines for each probed pin
  const polylines = scopePins.map((sp, si) => {
    const color = sp.color || colors[si % colors.length];
    const points = [];
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      if (!entry || entry.voltages[si] === null || entry.voltages[si] === undefined) continue;
      const x = (i / (totalPoints - 1)) * SCOPE_WIDTH;
      const y = voltToY(entry.voltages[si]);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (points.length < 2) return null;
    return /*#__PURE__*/React.createElement("polyline", {
      key: si,
      points: points.join(' '),
      fill: "none",
      stroke: color,
      strokeWidth: 1.5,
      strokeLinejoin: "round"
    });
  });

  // Axis grid lines
  const gridLines = [
    { v: VCC, label: '3.3V' },
    { v: VCC / 2, label: '1.65V' },
    { v: 0, label: '0V' },
  ].map(({ v, label }) => {
    const y = voltToY(v);
    return /*#__PURE__*/React.createElement("g", { key: label },
      /*#__PURE__*/React.createElement("line", {
        x1: 0, y1: y, x2: SCOPE_WIDTH, y2: y,
        stroke: "#1f2937", strokeWidth: 1, strokeDasharray: v === 0 || v === VCC ? "none" : "3 3"
      }),
      /*#__PURE__*/React.createElement("text", {
        x: SCOPE_WIDTH - 2, y: y - 2,
        textAnchor: "end", fontSize: 8, fill: "#475569"
      }, label)
    );
  });

  return /*#__PURE__*/React.createElement("div", { className: "scope-panel" },
    // Pin labels row
    /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '6px',
        padding: '6px 10px 4px', alignItems: 'center'
      }
    },
      /*#__PURE__*/React.createElement("span", {
        style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }
      }, "Scope"),
      scopePins.map((sp, i) => {
        const color = sp.color || colors[i % colors.length];
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#1e293b', borderRadius: 4, padding: '2px 6px',
            fontSize: 10, color: color, border: `1px solid ${color}40`
          }
        },
          sp.label,
          /*#__PURE__*/React.createElement("button", {
            onClick: () => onRemove && onRemove(i),
            style: {
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', padding: '0 0 0 4px', fontSize: 10, lineHeight: 1
            }
          }, "\xD7")
        );
      })
    ),
    // SVG graph
    /*#__PURE__*/React.createElement("svg", {
      width: "100%",
      height: SCOPE_HEIGHT,
      viewBox: `0 0 ${SCOPE_WIDTH} ${SCOPE_HEIGHT}`,
      preserveAspectRatio: "none",
      style: { display: 'block', background: '#050d14' }
    },
      // Background
      /*#__PURE__*/React.createElement("rect", {
        x: 0, y: 0, width: SCOPE_WIDTH, height: SCOPE_HEIGHT,
        fill: "#050d14"
      }),
      // Grid lines
      ...gridLines,
      // Signal traces
      ...polylines.filter(Boolean)
    )
  );
}

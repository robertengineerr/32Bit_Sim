import React from 'react';
import { catalog } from '../data/partsCatalog.js';
import { computePinPositions } from '../utils/pinLayout.js';
import Pin from './shared/Pin.jsx';
import PartBody from './parts/PartBody.jsx';

export default function PartInstance({
  part, resolve, selected, wireDraftPin,
  onSelect, onDragStart, onPinDown, onPinUp, onInteract, onDelete,
}) {
  const def = catalog[part.type];
  if (!def) return null;
  const positions = computePinPositions(def);

  return (
    <g transform={`translate(${part.x} ${part.y})`}>
      <g
        onMouseDown={(e) => { e.stopPropagation(); onSelect(part.id); onDragStart(part.id, e); }}
      >
        {selected && (
          <rect x={-6} y={-6} width={def.width + 12} height={def.height + 12} rx={8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" />
        )}
        <PartBody part={part} def={def} resolve={resolve} onInteract={(action, payload) => onInteract(part.id, action, payload)} />
        <text x={def.width / 2} y={-12} textAnchor="middle" fontSize={10} fill="#475569">{part.label || def.label}</text>
      </g>
      {def.pins.map((pin) => {
        const pos = positions[pin.name];
        const level = resolve ? resolve.levelOf(part.id, pin.name) : null;
        const isEndpoint = wireDraftPin && wireDraftPin.partId === part.id && wireDraftPin.pin === pin.name;
        return (
          <Pin
            key={pin.name}
            x={pos.x} y={pos.y}
            name={pin.name}
            label={pin.label || pin.name}
            level={level}
            isWireEndpoint={isEndpoint}
            onPinDown={(name) => onPinDown(part.id, name)}
            onPinUp={(name) => onPinUp(part.id, name)}
          />
        );
      })}
      {selected && (
        <g
          transform={`translate(${def.width + 2} -20)`}
          onMouseDown={(e) => { e.stopPropagation(); onDelete(part.id); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={9} fill="#ef4444" />
          <text x={0} y={4} textAnchor="middle" fontSize={11} fill="white">×</text>
        </g>
      )}
    </g>
  );
}

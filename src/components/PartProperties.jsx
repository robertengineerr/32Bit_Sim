import React from 'react';
import { catalog } from '../data/partsCatalog.js';

const PROPERTY_FIELDS = {
  dht11: [
    { key: 'temperature', label: 'Temperature (°C)', min: -10, max: 50, step: 1 },
    { key: 'humidity', label: 'Humidity (%)', min: 0, max: 100, step: 1 },
  ],
  ultrasonic: [{ key: 'distanceCm', label: 'Distance (cm)', min: 2, max: 400, step: 1 }],
  photoresistor: [{ key: 'light', label: 'Light level', min: 0, max: 1, step: 0.01 }],
  thermistor: [{ key: 'tempC', label: 'Temperature (°C)', min: -20, max: 120, step: 1 }],
  potentiometer: [{ key: 'value', label: 'Knob position', min: 0, max: 1, step: 0.01 }],
};

export default function PartProperties({ part, bump }) {
  if (!part) return <div className="props-panel dim">Select a part to see its properties.</div>;
  const def = catalog[part.type];
  const fields = PROPERTY_FIELDS[part.type];
  if (!fields) return <div className="props-panel dim">{def.label} — no adjustable properties.</div>;

  return (
    <div className="props-panel">
      <div className="props-part-name">{part.label || def.label}</div>
      {fields.map((f) => (
        <label key={f.key} className="props-field">
          <span>{f.label}: {Number(part.state[f.key]).toFixed(f.step < 1 ? 2 : 0)}</span>
          <input
            type="range" min={f.min} max={f.max} step={f.step}
            value={part.state[f.key]}
            onChange={(e) => { part.state[f.key] = Number(e.target.value); bump(); }}
          />
        </label>
      ))}
    </div>
  );
}

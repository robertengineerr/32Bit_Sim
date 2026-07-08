import React, { useRef, useState, useCallback, useEffect } from 'react';
import { catalog } from '../data/partsCatalog.js';
import { computePinPositions } from '../utils/pinLayout.js';
import PartInstance from './PartInstance.jsx';

function pinAbsPos(part, pinName) {
  const def = catalog[part.type];
  const positions = computePinPositions(def);
  const p = positions[pinName];
  return { x: part.x + p.x, y: part.y + p.y };
}

export default function Canvas({ simulator, resolve, bump, selectedId, setSelectedId, selectedWireId, setSelectedWireId }) {
  const svgRef = useRef(null);
  const [wireDraft, setWireDraft] = useState(null); // { partId, pin }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null); // { partId, startX, startY, origX, origY }
  const joystickDragRef = useRef(null); // partId

  const toLocal = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left + svg.scrollLeft, y: clientY - rect.top + svg.scrollTop };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const pos = toLocal(e.clientX, e.clientY);
    setMousePos(pos);
    if (dragRef.current) {
      const { partId, startX, startY, origX, origY } = dragRef.current;
      const part = simulator.getPart(partId);
      if (part) {
        part.x = origX + (pos.x - startX);
        part.y = origY + (pos.y - startY);
        bump();
      }
    }
    if (joystickDragRef.current) {
      const part = simulator.getPart(joystickDragRef.current);
      if (part) {
        const def = catalog[part.type];
        const fx = Math.min(1, Math.max(0, (pos.x - part.x - 10) / (def.width - 20)));
        const fy = Math.min(1, Math.max(0, (pos.y - part.y - 10) / (def.height - 40)));
        part.state.x = fx;
        part.state.y = 1 - fy;
        bump();
      }
    }
  }, [toLocal, simulator, bump]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDragStart = useCallback((partId, e) => {
    const pos = toLocal(e.clientX, e.clientY);
    const part = simulator.getPart(partId);
    dragRef.current = { partId, startX: pos.x, startY: pos.y, origX: part.x, origY: part.y };
  }, [toLocal, simulator]);

  const onPinDown = useCallback((partId, pin) => {
    setWireDraft({ partId, pin });
  }, []);

  const onPinUp = useCallback((partId, pin) => {
    if (wireDraft && !(wireDraft.partId === partId && wireDraft.pin === pin)) {
      simulator.wires.push({
        id: `w${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        a: { partId: wireDraft.partId, pin: wireDraft.pin },
        b: { partId, pin },
        color: WIRE_COLORS[simulator.wires.length % WIRE_COLORS.length],
      });
      bump();
    }
    setWireDraft(null);
  }, [wireDraft, simulator, bump]);

  const onCanvasMouseUp = useCallback(() => {
    endDrag();
    setWireDraft(null);
  }, [endDrag]);

  const onInteract = useCallback((partId, action, payload) => {
    const part = simulator.getPart(partId);
    if (!part) return;
    switch (action) {
      case 'down': part.state.active = true; break;
      case 'up': part.state.active = false; break;
      case 'set': part.state.value = payload; break;
      case 'ir-press': simulator.emitIrCode(payload.charCodeAt(0) + payload.length * 97, payload); break;
      case 'rfid-tap': part.state.tapped = true; break;
      case 'membrane-down': part.state.pressed.add(payload); break;
      case 'membrane-up': part.state.pressed.delete(payload); break;
      case 'joystick-drag-start': joystickDragRef.current = partId; part.state.pressed = true; part.state.active = true; break;
      default: break;
    }
    bump();
  }, [simulator, bump]);

  const deletePart = useCallback((partId) => {
    simulator.parts = simulator.parts.filter((p) => p.id !== partId);
    simulator.wires = simulator.wires.filter((w) => w.a.partId !== partId && w.b.partId !== partId);
    setSelectedId(null);
    bump();
  }, [simulator, bump, setSelectedId]);

  const deleteWire = useCallback((wireId) => {
    simulator.wires = simulator.wires.filter((w) => w.id !== wireId);
    setSelectedWireId(null);
    bump();
  }, [simulator, bump, setSelectedWireId]);

  useEffect(() => {
    const up = () => {
      dragRef.current = null;
      setWireDraft(null);
      if (joystickDragRef.current) {
        const part = simulator.getPart(joystickDragRef.current);
        if (part) { part.state.x = 0.5; part.state.y = 0.5; part.state.pressed = false; part.state.active = false; }
        joystickDragRef.current = null;
        bump();
      }
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [simulator, bump]);

  const parts = simulator.parts;
  const wires = simulator.wires;

  return (
    <svg
      ref={svgRef}
      className="canvas-svg"
      onMouseMove={handleMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseDown={() => { setSelectedId(null); setSelectedWireId(null); }}
    >
      <defs>
        <pattern id="grid" width={20} height={20} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#e2e8f0" />
        </pattern>
      </defs>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />

      {wires.map((w) => {
        const pa = pinAbsPos(simulator.getPart(w.a.partId), w.a.pin);
        const pb = pinAbsPos(simulator.getPart(w.b.partId), w.b.pin);
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2;
        const selected = selectedWireId === w.id;
        return (
          <g key={w.id}>
            <path
              d={`M ${pa.x} ${pa.y} C ${pa.x} ${my} ${pb.x} ${my} ${pb.x} ${pb.y}`}
              stroke={w.color || '#f59e0b'} strokeWidth={selected ? 4 : 2.5} fill="none"
              onMouseDown={(e) => { e.stopPropagation(); setSelectedWireId(w.id); }}
              style={{ cursor: 'pointer' }}
            />
            {selected && (
              <g transform={`translate(${mx} ${my})`} onMouseDown={(e) => { e.stopPropagation(); deleteWire(w.id); }} style={{ cursor: 'pointer' }}>
                <circle r={8} fill="#ef4444" /><text y={4} textAnchor="middle" fontSize={10} fill="white">×</text>
              </g>
            )}
          </g>
        );
      })}

      {wireDraft && (() => {
        const pa = pinAbsPos(simulator.getPart(wireDraft.partId), wireDraft.pin);
        return <path d={`M ${pa.x} ${pa.y} L ${mousePos.x} ${mousePos.y}`} stroke="#facc15" strokeWidth={2} strokeDasharray="4 3" fill="none" />;
      })()}

      {parts.map((part) => (
        <PartInstance
          key={part.id}
          part={part}
          resolve={resolve}
          selected={selectedId === part.id}
          wireDraftPin={wireDraft}
          onSelect={setSelectedId}
          onDragStart={onDragStart}
          onPinDown={onPinDown}
          onPinUp={onPinUp}
          onInteract={onInteract}
          onDelete={deletePart}
        />
      ))}
    </svg>
  );
}

const WIRE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

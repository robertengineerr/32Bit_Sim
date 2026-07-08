import React, { useRef, useState, useCallback, useEffect } from 'react';
import { catalog } from '../data/partsCatalog.js';
import { pinWorldPos } from '../utils/pinLayout.js';
import { clonePart } from '../utils/circuitFactory.js';
import PartInstance from './PartInstance.js';
import SelectionToolbar from './shared/SelectionToolbar.js';

function pinAbsPos(part, pinName) {
  const def = catalog[part.type];
  return pinWorldPos(part, def, pinName);
}

// Exact for 0/90/180/270 rotation: rotating an axis-aligned rectangle by a
// multiple of 90 degrees around its own center yields another axis-aligned
// rectangle, just with width/height swapped at 90/270.
function partBounds(part, def) {
  const rot = ((part.rotation || 0) % 360 + 360) % 360;
  const swapped = rot === 90 || rot === 270;
  const w = swapped ? def.height : def.width;
  const h = swapped ? def.width : def.height;
  const cx = part.x + def.width / 2;
  const cy = part.y + def.height / 2;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

function rectsOverlap(a, b) {
  return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
}

export default function Canvas({
  simulator,
  resolve,
  bump,
  selectedIds,
  setSelectedIds,
  selectedWireId,
  setSelectedWireId,
  onResetBoard
}) {
  const svgRef = useRef(null);
  const [wireDraft, setWireDraft] = useState(null); // { partId, pin }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [marqueeRect, setMarqueeRect] = useState(null);
  const dragRef = useRef(null); // { origins: Map<partId,{x,y}>, startX, startY }
  const marqueeRef = useRef(null); // { startX, startY, additive, baseSelection }
  const joystickDragRef = useRef(null); // partId

  const toLocal = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: clientX - rect.left + svg.scrollLeft,
      y: clientY - rect.top + svg.scrollTop
    };
  }, []);

  const handleMouseMove = useCallback(e => {
    const pos = toLocal(e.clientX, e.clientY);
    setMousePos(pos);
    if (dragRef.current) {
      const { origins, startX, startY } = dragRef.current;
      const dx = pos.x - startX, dy = pos.y - startY;
      for (const [id, orig] of origins) {
        const part = simulator.getPart(id);
        if (part) {
          part.x = orig.x + dx;
          part.y = orig.y + dy;
        }
      }
      bump();
    }
    if (marqueeRef.current) {
      const { startX, startY } = marqueeRef.current;
      setMarqueeRect({
        x: Math.min(startX, pos.x),
        y: Math.min(startY, pos.y),
        width: Math.abs(pos.x - startX),
        height: Math.abs(pos.y - startY)
      });
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

  const onPartMouseDown = useCallback((partId, e) => {
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    setSelectedWireId(null);
    if (additive) {
      const next = new Set(selectedIds);
      if (next.has(partId)) next.delete(partId); else next.add(partId);
      setSelectedIds(next);
      return;
    }
    const nextSelection = selectedIds.has(partId) ? selectedIds : new Set([partId]);
    if (nextSelection !== selectedIds) setSelectedIds(nextSelection);
    const pos = toLocal(e.clientX, e.clientY);
    const origins = new Map();
    for (const id of nextSelection) {
      const p = simulator.getPart(id);
      if (p) origins.set(id, { x: p.x, y: p.y });
    }
    dragRef.current = { origins, startX: pos.x, startY: pos.y };
  }, [selectedIds, setSelectedIds, setSelectedWireId, toLocal, simulator]);

  const onCanvasMouseDown = useCallback(e => {
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    setSelectedWireId(null);
    if (!additive) setSelectedIds(new Set());
    const pos = toLocal(e.clientX, e.clientY);
    marqueeRef.current = { startX: pos.x, startY: pos.y, additive, baseSelection: new Set(selectedIds) };
    setMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }, [toLocal, setSelectedIds, setSelectedWireId, selectedIds]);

  const onPinDown = useCallback((partId, pin) => {
    setWireDraft({ partId, pin });
  }, []);

  const onPinUp = useCallback((partId, pin) => {
    if (wireDraft && !(wireDraft.partId === partId && wireDraft.pin === pin)) {
      simulator.wires.push({
        id: `w${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        a: { partId: wireDraft.partId, pin: wireDraft.pin },
        b: { partId, pin },
        color: WIRE_COLORS[simulator.wires.length % WIRE_COLORS.length]
      });
      bump();
    }
    setWireDraft(null);
  }, [wireDraft, simulator, bump]);

  const onCanvasMouseUp = useCallback(() => {
    endDrag();
    setWireDraft(null);
    if (marqueeRef.current) {
      const { additive, baseSelection } = marqueeRef.current;
      const rect = marqueeRect;
      if (rect && (rect.width > 3 || rect.height > 3)) {
        const hits = new Set(additive ? baseSelection : []);
        for (const part of simulator.parts) {
          const def = catalog[part.type];
          if (!def) continue;
          if (rectsOverlap(partBounds(part, def), rect)) hits.add(part.id);
        }
        setSelectedIds(hits);
      }
      marqueeRef.current = null;
      setMarqueeRect(null);
    }
  }, [endDrag, marqueeRect, simulator, setSelectedIds]);

  const onInteract = useCallback((partId, action, payload) => {
    const part = simulator.getPart(partId);
    if (!part) return;
    switch (action) {
      case 'down':
        part.state.active = true;
        break;
      case 'up':
        part.state.active = false;
        break;
      case 'set':
        part.state.value = payload;
        break;
      case 'ir-press':
        simulator.emitIrCode(payload.charCodeAt(0) + payload.length * 97, payload);
        break;
      case 'rfid-tap':
        part.state.tapped = true;
        break;
      case 'membrane-down':
        part.state.pressed.add(payload);
        break;
      case 'membrane-up':
        part.state.pressed.delete(payload);
        break;
      case 'joystick-drag-start':
        joystickDragRef.current = partId;
        part.state.pressed = true;
        part.state.active = true;
        break;
      case 'boot-down':
        part.state.bootPressed = true;
        break;
      case 'boot-up':
        part.state.bootPressed = false;
        break;
      case 'rst-down':
        part.state.rstPressed = true;
        onResetBoard && onResetBoard();
        break;
      case 'rst-up':
        part.state.rstPressed = false;
        break;
      default:
        break;
    }
    bump();
  }, [simulator, bump, onResetBoard]);

  const rotateSelection = useCallback(dir => {
    for (const id of selectedIds) {
      const part = simulator.getPart(id);
      if (part) part.rotation = ((part.rotation || 0) + dir * 90 + 360) % 360;
    }
    bump();
  }, [selectedIds, simulator, bump]);

  const flipSelection = useCallback(() => {
    for (const id of selectedIds) {
      const part = simulator.getPart(id);
      if (part) part.flipped = !part.flipped;
    }
    bump();
  }, [selectedIds, simulator, bump]);

  const duplicateSelection = useCallback(() => {
    const idMap = new Map();
    const newParts = [];
    for (const id of selectedIds) {
      const part = simulator.getPart(id);
      if (!part) continue;
      const clone = clonePart(part);
      idMap.set(id, clone.id);
      newParts.push(clone);
    }
    if (!newParts.length) return;
    simulator.parts.push(...newParts);
    for (const w of simulator.wires.slice()) {
      if (idMap.has(w.a.partId) && idMap.has(w.b.partId)) {
        simulator.wires.push({
          id: `w${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          a: { partId: idMap.get(w.a.partId), pin: w.a.pin },
          b: { partId: idMap.get(w.b.partId), pin: w.b.pin },
          color: w.color
        });
      }
    }
    setSelectedIds(new Set(newParts.map(p => p.id)));
    bump();
  }, [selectedIds, simulator, bump, setSelectedIds]);

  const deleteSelection = useCallback(() => {
    if (!selectedIds.size) return;
    simulator.parts = simulator.parts.filter(p => !selectedIds.has(p.id));
    simulator.wires = simulator.wires.filter(w => !selectedIds.has(w.a.partId) && !selectedIds.has(w.b.partId));
    setSelectedIds(new Set());
    bump();
  }, [selectedIds, simulator, bump, setSelectedIds]);

  const deleteWire = useCallback(wireId => {
    simulator.wires = simulator.wires.filter(w => w.id !== wireId);
    setSelectedWireId(null);
    bump();
  }, [simulator, bump, setSelectedWireId]);

  useEffect(() => {
    const up = () => {
      dragRef.current = null;
      setWireDraft(null);
      if (joystickDragRef.current) {
        const part = simulator.getPart(joystickDragRef.current);
        if (part) {
          part.state.x = 0.5;
          part.state.y = 0.5;
          part.state.pressed = false;
          part.state.active = false;
        }
        joystickDragRef.current = null;
        bump();
      }
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [simulator, bump]);

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedIds.size) return;
      const active = document.activeElement;
      const tag = active && active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable)) return;
      e.preventDefault();
      deleteSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds, deleteSelection]);

  const parts = simulator.parts;
  const wires = simulator.wires;

  let selectionBounds = null;
  if (selectedIds.size) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of selectedIds) {
      const part = simulator.getPart(id);
      const def = part && catalog[part.type];
      if (!def) continue;
      const b = partBounds(part, def);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (minX !== Infinity) selectionBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  return /*#__PURE__*/React.createElement("svg", {
    ref: svgRef,
    className: "canvas-svg",
    onMouseMove: handleMouseMove,
    onMouseUp: onCanvasMouseUp,
    onMouseDown: onCanvasMouseDown
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "grid",
    width: 20,
    height: 20,
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: 1,
    cy: 1,
    r: 1,
    fill: "#1e293b"
  }))), /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 0,
    width: "100%",
    height: "100%",
    fill: "url(#grid)"
  }), wires.map(w => {
    const pa = pinAbsPos(simulator.getPart(w.a.partId), w.a.pin);
    const pb = pinAbsPos(simulator.getPart(w.b.partId), w.b.pin);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const selected = selectedWireId === w.id;
    return /*#__PURE__*/React.createElement("g", {
      key: w.id
    }, /*#__PURE__*/React.createElement("path", {
      d: `M ${pa.x} ${pa.y} C ${pa.x} ${my} ${pb.x} ${my} ${pb.x} ${pb.y}`,
      stroke: w.color || '#f59e0b',
      strokeWidth: selected ? 4 : 2.5,
      fill: "none",
      onMouseDown: e => {
        e.stopPropagation();
        setSelectedWireId(w.id);
      },
      style: {
        cursor: 'pointer'
      }
    }), selected && /*#__PURE__*/React.createElement("g", {
      transform: `translate(${mx} ${my})`,
      onMouseDown: e => {
        e.stopPropagation();
        deleteWire(w.id);
      },
      style: {
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("circle", {
      r: 8,
      fill: "#ef4444"
    }), /*#__PURE__*/React.createElement("text", {
      y: 4,
      textAnchor: "middle",
      fontSize: 10,
      fill: "white"
    }, "\xD7")));
  }), wireDraft && (() => {
    const pa = pinAbsPos(simulator.getPart(wireDraft.partId), wireDraft.pin);
    return /*#__PURE__*/React.createElement("path", {
      d: `M ${pa.x} ${pa.y} L ${mousePos.x} ${mousePos.y}`,
      stroke: "#facc15",
      strokeWidth: 2,
      strokeDasharray: "4 3",
      fill: "none"
    });
  })(), parts.map(part => /*#__PURE__*/React.createElement(PartInstance, {
    key: part.id,
    part: part,
    resolve: resolve,
    selected: selectedIds.has(part.id),
    wireDraftPin: wireDraft,
    onPartMouseDown: onPartMouseDown,
    onPinDown: onPinDown,
    onPinUp: onPinUp,
    onInteract: onInteract
  })), marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) && /*#__PURE__*/React.createElement("rect", {
    x: marqueeRect.x,
    y: marqueeRect.y,
    width: marqueeRect.width,
    height: marqueeRect.height,
    fill: "rgba(59,130,246,0.15)",
    stroke: "#3b82f6",
    strokeDasharray: "4 3"
  }), selectionBounds && /*#__PURE__*/React.createElement(SelectionToolbar, {
    x: selectionBounds.x + selectionBounds.width / 2,
    y: selectionBounds.y - 22,
    onRotateCcw: () => rotateSelection(-1),
    onRotateCw: () => rotateSelection(1),
    onFlip: flipSelection,
    onDuplicate: duplicateSelection,
    onDelete: deleteSelection
  }));
}
const WIRE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

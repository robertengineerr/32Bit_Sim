import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { Simulator } from './engine/simulator.js';
import { createRuntime } from './engine/runtime.js';
import { AudioManager } from './engine/audio.js';
import { buildDefaultCircuit, CODE_SNIPPETS } from './data/examples.js';
import { createPart } from './utils/circuitFactory.js';
import { saveToLocalStorage, loadFromLocalStorage, downloadProject, deserializeProject } from './utils/persist.js';
import Canvas from './components/Canvas.js';
import Toolbox from './components/Toolbox.js';
import CodeEditor from './components/CodeEditor.js';
import ConsolePanel from './components/ConsolePanel.js';
import PartProperties from './components/PartProperties.js';
function useForceRender() {
  const [, setN] = useState(0);
  return useCallback(() => setN(n => n + 1), []);
}
export default function App() {
  const simRef = useRef(null);
  if (!simRef.current) simRef.current = new Simulator();
  const simulator = simRef.current;
  const runtimeRef = useRef(null);
  if (!runtimeRef.current) runtimeRef.current = createRuntime(simulator);
  const runtime = runtimeRef.current;
  const bump = useForceRender();
  const tickVersion = useSyncExternalStore(cb => simulator.subscribe(cb), () => simulator.getSnapshot(), () => simulator.getSnapshot());
  const [code, setCode] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedWireId, setSelectedWireId] = useState(null);
  const [running, setRunning] = useState(false);
  const [consoleLines, setConsoleLines] = useState([]);
  const [snippetName, setSnippetName] = useState('');
  const fileInputRef = useRef(null);
  useEffect(() => {
    simulator.onConsole = line => setConsoleLines(prev => [...prev.slice(-499), line]);
    const saved = loadFromLocalStorage();
    if (saved && saved.parts && saved.parts.length) {
      simulator.setCircuit(saved.parts, saved.wires || []);
      setCode(saved.code || '');
    } else {
      const demo = buildDefaultCircuit();
      simulator.setCircuit(demo.parts, demo.wires);
      setCode(demo.code);
    }
    simulator.start();
    bump();
    return () => simulator.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(() => saveToLocalStorage(simulator.parts, simulator.wires, code), 800);
    return () => clearTimeout(t);
  }, [tickVersion, code, simulator]);

  // Recomputed on every render (cheap for these circuit sizes) so pin colors
  // and part visuals never lag behind drag/wire/click interactions.
  const resolve = simulator.resolveNow();
  const handleAdd = useCallback((type, variant) => {
    const part = createPart(type, 500 + Math.random() * 80, 300 + Math.random() * 80, {
      stateArg: variant
    });
    simulator.parts.push(part);
    setSelectedIds(new Set([part.id]));
    bump();
  }, [simulator, bump]);
  const handleRun = useCallback(() => {
    if (!simulator.audio) simulator.audio = new AudioManager();
    simulator.audio.ensureCtx();
    setConsoleLines([]);
    simulator.consoleLines = [];
    setRunning(true);
    runtime.run(code, {
      onStop: () => setRunning(false),
      onError: () => setRunning(false)
    });
  }, [simulator, runtime, code]);
  const handleStop = useCallback(() => {
    runtime.stop();
    setRunning(false);
  }, [runtime]);
  const handleReset = useCallback(() => {
    runtime.stop();
    setRunning(false);
    simulator.resetPins();
    bump();
  }, [simulator, runtime, bump]);
  const handleClearCircuit = useCallback(() => {
    if (!confirm('Clear the whole canvas (parts + wires)? This cannot be undone.')) return;
    simulator.setCircuit([], []);
    setSelectedIds(new Set());
    setSelectedWireId(null);
    bump();
  }, [simulator, bump]);
  const handleLoadDemo = useCallback(() => {
    if (!confirm('Replace the current circuit with the starter demo circuit?')) return;
    const demo = buildDefaultCircuit();
    simulator.setCircuit(demo.parts, demo.wires);
    setCode(demo.code);
    bump();
  }, [simulator, bump]);
  const handleSaveFile = useCallback(() => {
    downloadProject(simulator.parts, simulator.wires, code);
  }, [simulator, code]);
  const handleLoadFile = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = deserializeProject(reader.result);
        simulator.setCircuit(data.parts, data.wires || []);
        setCode(data.code || '');
        bump();
      } catch (err) {
        alert('Could not load project file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [simulator, bump]);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, "32Bit\xA0Sim ", /*#__PURE__*/React.createElement("span", null, "ESP32-C3 Circuit Simulator")), /*#__PURE__*/React.createElement("div", {
    className: "controls"
  }, !running ? /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: handleRun
  }, "\u25B6 Run") : /*#__PURE__*/React.createElement("button", {
    className: "btn danger",
    onClick: handleStop
  }, "\u25A0 Stop"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: handleReset
  }, "Reset Pins"), /*#__PURE__*/React.createElement("select", {
    className: "btn",
    value: snippetName,
    onChange: e => {
      setSnippetName(e.target.value);
      if (CODE_SNIPPETS[e.target.value]) setCode(CODE_SNIPPETS[e.target.value]);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Load code example\u2026"), Object.keys(CODE_SNIPPETS).map(name => /*#__PURE__*/React.createElement("option", {
    key: name,
    value: name
  }, name))), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: handleLoadDemo
  }, "Starter Circuit"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: handleClearCircuit
  }, "Clear Canvas"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: handleSaveFile
  }, "Save .json"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => fileInputRef.current.click()
  }, "Load .json"), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: "application/json",
    style: {
      display: 'none'
    },
    onChange: handleLoadFile
  }))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement(Toolbox, {
    onAdd: handleAdd
  }), /*#__PURE__*/React.createElement("div", {
    className: "canvas-wrap"
  }, /*#__PURE__*/React.createElement(Canvas, {
    simulator: simulator,
    resolve: resolve,
    bump: bump,
    selectedIds: selectedIds,
    setSelectedIds: setSelectedIds,
    selectedWireId: selectedWireId,
    setSelectedWireId: setSelectedWireId,
    onResetBoard: handleReset
  })), /*#__PURE__*/React.createElement("div", {
    className: "side-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-title"
  }, "Selected Part"), /*#__PURE__*/React.createElement(PartProperties, {
    selectedIds: selectedIds,
    simulator: simulator,
    bump: bump
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel-title"
  }, "Firmware (JS, Arduino-style API)"), /*#__PURE__*/React.createElement(CodeEditor, {
    code: code,
    onChange: setCode,
    disabled: running
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel-title"
  }, "Serial Monitor"), /*#__PURE__*/React.createElement(ConsolePanel, {
    lines: consoleLines
  }))));
}
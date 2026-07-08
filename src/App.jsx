import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { Simulator } from './engine/simulator.js';
import { createRuntime } from './engine/runtime.js';
import { AudioManager } from './engine/audio.js';
import { buildDefaultCircuit, CODE_SNIPPETS } from './data/examples.js';
import { createPart } from './utils/circuitFactory.js';
import { saveToLocalStorage, loadFromLocalStorage, downloadProject, deserializeProject } from './utils/persist.js';
import Canvas from './components/Canvas.jsx';
import Toolbox from './components/Toolbox.jsx';
import CodeEditor from './components/CodeEditor.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import PartProperties from './components/PartProperties.jsx';

function useForceRender() {
  const [, setN] = useState(0);
  return useCallback(() => setN((n) => n + 1), []);
}

export default function App() {
  const simRef = useRef(null);
  if (!simRef.current) simRef.current = new Simulator();
  const simulator = simRef.current;

  const runtimeRef = useRef(null);
  if (!runtimeRef.current) runtimeRef.current = createRuntime(simulator);
  const runtime = runtimeRef.current;

  const bump = useForceRender();
  const tickVersion = useSyncExternalStore(
    (cb) => simulator.subscribe(cb),
    () => simulator.getSnapshot(),
    () => simulator.getSnapshot()
  );

  const [code, setCode] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedWireId, setSelectedWireId] = useState(null);
  const [running, setRunning] = useState(false);
  const [consoleLines, setConsoleLines] = useState([]);
  const [snippetName, setSnippetName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    simulator.onConsole = (line) => setConsoleLines((prev) => [...prev.slice(-499), line]);
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
    const part = createPart(type, 500 + Math.random() * 80, 300 + Math.random() * 80, { stateArg: variant });
    simulator.parts.push(part);
    setSelectedId(part.id);
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
      onError: () => setRunning(false),
    });
  }, [simulator, runtime, code]);

  const handleStop = useCallback(() => {
    runtime.stop();
    setRunning(false);
  }, [runtime]);

  const handleReset = useCallback(() => {
    runtime.stop();
    setRunning(false);
    const esp = simulator.esp32();
    if (esp) {
      for (const n of Object.keys(esp.state.pins)) esp.state.pins[n] = { mode: 'INPUT', value: 0, pwmValue: null };
    }
    bump();
  }, [simulator, runtime, bump]);

  const handleClearCircuit = useCallback(() => {
    if (!confirm('Clear the whole canvas (parts + wires)? This cannot be undone.')) return;
    simulator.setCircuit([], []);
    setSelectedId(null);
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

  const handleLoadFile = useCallback((e) => {
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">32Bit&nbsp;Sim <span>ESP32-C3 Circuit Simulator</span></div>
        <div className="controls">
          {!running ? (
            <button className="btn primary" onClick={handleRun}>▶ Run</button>
          ) : (
            <button className="btn danger" onClick={handleStop}>■ Stop</button>
          )}
          <button className="btn" onClick={handleReset}>Reset Pins</button>
          <select
            className="btn"
            value={snippetName}
            onChange={(e) => {
              setSnippetName(e.target.value);
              if (CODE_SNIPPETS[e.target.value]) setCode(CODE_SNIPPETS[e.target.value]);
            }}
          >
            <option value="">Load code example…</option>
            {Object.keys(CODE_SNIPPETS).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="btn" onClick={handleLoadDemo}>Starter Circuit</button>
          <button className="btn" onClick={handleClearCircuit}>Clear Canvas</button>
          <span className="spacer" />
          <button className="btn" onClick={handleSaveFile}>Save .json</button>
          <button className="btn" onClick={() => fileInputRef.current.click()}>Load .json</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleLoadFile} />
        </div>
      </header>
      <div className="main">
        <Toolbox onAdd={handleAdd} />
        <div className="canvas-wrap">
          <Canvas
            simulator={simulator}
            resolve={resolve}
            bump={bump}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedWireId={selectedWireId}
            setSelectedWireId={setSelectedWireId}
          />
        </div>
        <div className="side-panel">
          <div className="panel-title">Selected Part</div>
          <PartProperties part={selectedId ? simulator.getPart(selectedId) : null} bump={bump} />
          <div className="panel-title">Firmware (JS, Arduino-style API)</div>
          <CodeEditor code={code} onChange={setCode} disabled={running} />
          <div className="panel-title">Serial Monitor</div>
          <ConsolePanel lines={consoleLines} />
        </div>
      </div>
    </div>
  );
}

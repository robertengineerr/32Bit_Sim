import React, { useEffect, useRef } from 'react';

export default function ConsolePanel({ lines }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);

  return (
    <div className="console-panel" ref={ref}>
      {lines.length === 0 && <div className="console-line dim">Serial monitor — output from Serial.print()/println() appears here.</div>}
      {lines.map((l, i) => (
        <div key={i} className={`console-line ${l.startsWith('ERROR') ? 'err' : ''} ${l.startsWith('warn') ? 'warn' : ''}`}>{l}</div>
      ))}
    </div>
  );
}

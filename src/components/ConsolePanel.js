import React, { useEffect, useRef } from 'react';
export default function ConsolePanel({
  lines
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);
  return /*#__PURE__*/React.createElement("div", {
    className: "console-panel",
    ref: ref
  }, lines.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "console-line dim"
  }, "Serial monitor \u2014 output from Serial.print()/println() appears here."), lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `console-line ${l.startsWith('ERROR') ? 'err' : ''} ${l.startsWith('warn') ? 'warn' : ''}`
  }, l)));
}
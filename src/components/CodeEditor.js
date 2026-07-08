import React from 'react';
export default function CodeEditor({
  code,
  onChange,
  disabled
}) {
  const onKeyDown = e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart,
        end = el.selectionEnd;
      const next = code.slice(0, start) + '  ' + code.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };
  return /*#__PURE__*/React.createElement("textarea", {
    className: "code-editor",
    value: code,
    spellCheck: false,
    disabled: disabled,
    onChange: e => onChange(e.target.value),
    onKeyDown: onKeyDown
  });
}
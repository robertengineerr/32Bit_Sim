// Translates a practical subset of Arduino-flavored C++ into the JS dialect
// executed by runtime.js's AsyncFunction/env mechanism. This is a hand-written
// transpiler for the Arduino *sketch* subset of C++, not a C++ compiler:
// templates, multiple inheritance, operator overloading, namespaces and
// multi-file #includes are out of scope. See README "Important
// simplifications" for the full limitations list.

const PRIMITIVE_TYPES = new Set([
  'void', 'int', 'long', 'short', 'unsigned', 'signed', 'float', 'double', 'bool', 'boolean',
  'char', 'byte', 'word', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
  'int8_t', 'int16_t', 'int32_t', 'int64_t', 'auto'
]);
const QUALIFIERS = new Set(['const', 'static', 'volatile', 'inline']);
const CONTROL_KEYWORDS = new Set(['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'return', 'break', 'continue', 'try', 'catch', 'new', 'delete']);
// Library-provided types that our transpiler must recognize as "custom types"
// even though they don't follow the Capitalized-identifier heuristic (e.g.
// IRremote's `decode_results`), so `TypeName var;` / `TypeName var(args);` are
// still recognized as object instantiation rather than left untouched.
const KNOWN_LIBRARY_TYPES = new Set(['decode_results']);
const KNOWN_HEADERS = new Set([
  'Arduino.h', 'Servo.h', 'DHT.h', 'Wire.h', 'MFRC522.h', 'IRremote.h', 'IRremote.hpp',
  'IRremoteInt.h', 'Adafruit_SSD1306.h', 'Adafruit_GFX.h', 'SPI.h', 'math.h', 'stdint.h'
]);
const PUNCT_MULTI = [
  '<<=', '>>=', '...', '->', '::', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='
];

// ---------------------------------------------------------------- preprocessor

function stripPreprocessor(src, warnings) {
  const lines = src.split('\n');
  const out = [];
  for (const line of lines) {
    const m = /^(\s*)#\s*(\w+)(.*)$/.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, indent, directive, restRaw] = m;
    const rest = restRaw.trim();
    if (directive === 'include') {
      const hm = /[<"]([^>"]+)[>"]/.exec(rest);
      if (hm && !KNOWN_HEADERS.has(hm[1])) {
        warnings.push(`#include <${hm[1]}> ignored (not a recognized/simulated library)`);
      }
      out.push('');
      continue;
    }
    if (directive === 'define') {
      const dm = /^(\w+)(\([^)]*\))?\s*(.*)$/.exec(rest);
      if (dm) {
        const [, name, params, body] = dm;
        if (params) out.push(`${indent}function ${name}${params} { return (${body}); }`);
        else if (body) out.push(`${indent}const ${name} = ${body};`);
        else out.push(`${indent}const ${name} = true;`);
      } else {
        out.push('');
      }
      continue;
    }
    if (directive !== 'ifdef' && directive !== 'ifndef' && directive !== 'if' && directive !== 'else' &&
        directive !== 'elif' && directive !== 'endif' && directive !== 'pragma' && directive !== 'undef') {
      warnings.push(`#${directive} directive ignored`);
    }
    // #ifdef/#ifndef/#if/#else/#elif/#endif/#pragma/#undef: no conditional-
    // compilation support - drop the directive line itself either way.
    out.push('');
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- tokenizer

function tokenize(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r') {
      let j = i + 1;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r')) j++;
      tokens.push({ type: 'ws', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '\n') {
      tokens.push({ type: 'nl', value: '\n' });
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      tokens.push({ type: 'linecomment', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      tokens.push({ type: 'blockcomment', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"') { if (src[j] === '\\') j++; j++; }
      j = Math.min(n, j + 1);
      tokens.push({ type: 'string', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== "'") { if (src[j] === '\\') j++; j++; }
      j = Math.min(n, j + 1);
      tokens.push({ type: 'char', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9a-fA-FxX.]/.test(src[j])) j++;
      while (j < n && /[uUlLfF]/.test(src[j])) j++;
      tokens.push({ type: 'number', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }
    let matched = null;
    for (const p of PUNCT_MULTI) {
      if (src.startsWith(p, i)) { matched = p; break; }
    }
    if (matched) {
      tokens.push({ type: 'punct', value: matched });
      i += matched.length;
      continue;
    }
    tokens.push({ type: 'punct', value: c });
    i++;
  }
  return tokens;
}

function isTrivia(t) {
  return t.type === 'ws' || t.type === 'nl' || t.type === 'linecomment' || t.type === 'blockcomment';
}

// ---------------------------------------------------------------- transformer

class Transformer {
  constructor(tokens, warnings) {
    this.tokens = tokens;
    this.warnings = warnings;
    this.pos = 0;
    this.out = [];
    this.knownTypes = new Set();
    this.currentFieldNames = null; // Set<string> while emitting inside a method/constructor body
  }

  peek(offset = 0) {
    let idx = this.pos, seen = 0;
    while (idx < this.tokens.length) {
      if (!isTrivia(this.tokens[idx])) {
        if (seen === offset) return this.tokens[idx];
        seen++;
      }
      idx++;
    }
    return null;
  }

  significantIndexFrom(startIdx, offset) {
    let idx = startIdx, seen = 0;
    while (idx < this.tokens.length) {
      if (!isTrivia(this.tokens[idx])) {
        if (seen === offset) return idx;
        seen++;
      }
      idx++;
    }
    return -1;
  }

  isCustomTypeName(name) {
    return KNOWN_LIBRARY_TYPES.has(name) || this.knownTypes.has(name) || /^[A-Z]/.test(name);
  }

  emitTrivia() {
    while (this.pos < this.tokens.length && isTrivia(this.tokens[this.pos])) {
      this.out.push(this.tokens[this.pos].value);
      this.pos++;
    }
  }

  emitRaw(tok) {
    this.out.push(tok.value);
    this.pos++;
  }

  // Emits exactly one logical token at this.pos, applying (in order): call
  // await-ification, reference-operator stripping, sizeof-idiom rewriting,
  // and field-name -> this.field substitution. Always advances this.pos.
  emitOneTransformed() {
    if (this.trySizeofIdiom()) return;
    if (this.tryStripReferenceOperator()) return;
    if (this.trySubstituteFieldRef()) return;
    this.tryEmitAwaitedCall(); // side-effect only (pushes "await "); falls through
    this.emitRaw(this.tokens[this.pos]);
  }

  copyExprRange(endIdx) {
    while (this.pos <= endIdx) {
      if (isTrivia(this.tokens[this.pos])) { this.emitTrivia(); continue; }
      this.emitOneTransformed();
    }
  }

  // Detects the ROOT identifier of a call chain (`foo(...)`, `a.b(...)`,
  // `a.b.c(...)`) and pushes `await ` before it. Never triggers on a member
  // name itself (preceded by `.`/`->`), so `Serial.println(x)` becomes
  // `await Serial.println(x)`, not `Serial.await println(x)`.
  tryEmitAwaitedCall() {
    const tok = this.tokens[this.pos];
    if (tok.type !== 'ident') return false;
    let prevIdx = this.pos - 1;
    while (prevIdx >= 0 && isTrivia(this.tokens[prevIdx])) prevIdx--;
    const prevVal = prevIdx >= 0 ? this.tokens[prevIdx].value : null;
    if (prevVal === '.' || prevVal === '->' || prevVal === 'new') return false;
    if (CONTROL_KEYWORDS.has(tok.value) || PRIMITIVE_TYPES.has(tok.value)) return false;
    if (prevVal === 'function' || prevVal === 'async') return false;
    let idx = this.significantIndexFrom(this.pos + 1, 0);
    while (idx !== -1 && (this.tokens[idx].value === '.' || this.tokens[idx].value === '->')) {
      idx = this.significantIndexFrom(idx + 1, 0);
      if (idx === -1 || this.tokens[idx].type !== 'ident') return false;
      idx = this.significantIndexFrom(idx + 1, 0);
    }
    if (idx !== -1 && this.tokens[idx].value === '(') {
      this.out.push('await ');
    }
    return false;
  }

  tryStripReferenceOperator() {
    const tok = this.tokens[this.pos];
    if (tok.type !== 'punct' || tok.value !== '&') return false;
    let prevIdx = this.pos - 1;
    while (prevIdx >= 0 && isTrivia(this.tokens[prevIdx])) prevIdx--;
    const prevVal = prevIdx >= 0 ? this.tokens[prevIdx].value : null;
    const prevIsOperandStart = prevVal === null || ['(', ',', '=', '&&', '||', '!', 'return'].includes(prevVal);
    if (!prevIsOperandStart) return false;
    this.pos++; // drop the '&' token, don't emit it
    return true;
  }

  trySubstituteFieldRef() {
    if (!this.currentFieldNames) return false;
    const tok = this.tokens[this.pos];
    if (tok.type !== 'ident' || !this.currentFieldNames.has(tok.value)) return false;
    let prevIdx = this.pos - 1;
    while (prevIdx >= 0 && isTrivia(this.tokens[prevIdx])) prevIdx--;
    const prevVal = prevIdx >= 0 ? this.tokens[prevIdx].value : null;
    if (prevVal === '.' || prevVal === '->') return false;
    this.out.push('this.');
    this.emitRaw(tok);
    return true;
  }

  // Recognizes `sizeof(arr)/sizeof(arr[0])` (array-length idiom) and bare
  // `sizeof(x)` (unsupported - replaced with a harmless literal + warning).
  trySizeofIdiom() {
    const tok = this.tokens[this.pos];
    if (tok.type !== 'ident' || tok.value !== 'sizeof') return false;
    const openIdx = this.significantIndexFrom(this.pos + 1, 0);
    if (openIdx === -1 || this.tokens[openIdx].value !== '(') return false;
    const closeIdx = this.matchParen(openIdx);
    const innerTokens = [];
    for (let i = openIdx + 1; i < closeIdx; i++) if (!isTrivia(this.tokens[i])) innerTokens.push(this.tokens[i]);
    // check for the `sizeof(X) / sizeof(X[0])` idiom immediately following
    const slashIdx = this.significantIndexFrom(closeIdx + 1, 0);
    if (innerTokens.length === 1 && slashIdx !== -1 && this.tokens[slashIdx].value === '/') {
      const sizeof2Idx = this.significantIndexFrom(slashIdx + 1, 0);
      if (sizeof2Idx !== -1 && this.tokens[sizeof2Idx].value === 'sizeof') {
        const open2 = this.significantIndexFrom(sizeof2Idx + 1, 0);
        if (open2 !== -1 && this.tokens[open2].value === '(') {
          const close2 = this.matchParen(open2);
          const inner2 = [];
          for (let i = open2 + 1; i < close2; i++) if (!isTrivia(this.tokens[i])) inner2.push(this.tokens[i].value);
          const arrName = innerTokens[0].value;
          if (inner2.join('') === `${arrName}[0]`) {
            this.out.push(`${arrName}.length`);
            this.pos = close2 + 1;
            return true;
          }
        }
      }
    }
    this.warnings.push("sizeof() is only supported for the 'sizeof(arr)/sizeof(arr[0])' array-length idiom; replaced with 1");
    this.out.push('1');
    this.pos = closeIdx + 1;
    return true;
  }

  matchParen(idx) {
    let depth = 0;
    for (let i = idx; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'punct') continue;
      if (t.value === '(') depth++;
      else if (t.value === ')') { depth--; if (depth === 0) return i; }
    }
    return this.tokens.length - 1;
  }

  matchBrace(idx) {
    let depth = 0;
    for (let i = idx; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'punct') continue;
      if (t.value === '{') depth++;
      else if (t.value === '}') { depth--; if (depth === 0) return i; }
    }
    return this.tokens.length - 1;
  }

  matchBracket(idx) {
    let depth = 0;
    for (let i = idx; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'punct') continue;
      if (t.value === '[') depth++;
      else if (t.value === ']') { depth--; if (depth === 0) return i; }
    }
    return this.tokens.length - 1;
  }

  // Like findTopLevelDelims but specifically for locating an opening `{`
  // (e.g. a constructor body after a member-init-list): tracks only paren/
  // bracket depth, since `{` itself is the target rather than a depth-
  // increasing token to skip over.
  findTopLevelOpenBrace(fromIdx) {
    let depth = 0;
    for (let i = fromIdx; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'punct') continue;
      if (t.value === '(' || t.value === '[') depth++;
      else if (t.value === ')' || t.value === ']') depth--;
      else if (t.value === '{' && depth === 0) return i;
    }
    return this.tokens.length - 1;
  }

  findTopLevelDelims(fromIdx, delims) {
    let depth = 0;
    for (let i = fromIdx; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'punct') continue;
      if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
      else if (t.value === ')' || t.value === ']' || t.value === '}') depth--;
      else if (depth === 0 && delims.includes(t.value)) return i;
    }
    return this.tokens.length - 1;
  }

  // Reads leading type/qualifier tokens starting at significant index `idx`.
  readTypeTokens(idx) {
    let i = idx;
    let lastTypeIdent = null;
    let sawAny = false;
    while (i < this.tokens.length) {
      const t = this.tokens[i];
      if (isTrivia(t)) { i++; continue; }
      if (t.type === 'ident' && (QUALIFIERS.has(t.value) || PRIMITIVE_TYPES.has(t.value))) {
        sawAny = true;
        if (PRIMITIVE_TYPES.has(t.value)) lastTypeIdent = t.value;
        i++;
        continue;
      }
      break;
    }
    if (!sawAny) {
      const t = this.tokens[i];
      if (t && t.type === 'ident' && this.isCustomTypeName(t.value) && !CONTROL_KEYWORDS.has(t.value)) {
        const afterIdx = this.significantIndexFrom(i + 1, 0);
        if (afterIdx !== -1 && this.tokens[afterIdx].type === 'ident') {
          return { endIdx: i + 1, typeName: t.value, isCustomType: true };
        }
      }
      return null;
    }
    while (i < this.tokens.length) {
      const t = this.tokens[i];
      if (isTrivia(t)) { i++; continue; }
      if (t.type === 'punct' && (t.value === '*' || t.value === '&')) { i++; continue; }
      break;
    }
    return { endIdx: i, typeName: lastTypeIdent, isCustomType: false };
  }

  hasQualifier(typeInfo, qualifier) {
    for (let i = this.pos; i < typeInfo.endIdx; i++) {
      const t = this.tokens[i];
      if (!isTrivia(t) && t.value === qualifier) return true;
    }
    return false;
  }

  detypeParamList(openIdx, closeIdx) {
    const parts = [];
    let depth = 0;
    let cur = [];
    for (let idx = openIdx + 1; idx < closeIdx; idx++) {
      const t = this.tokens[idx];
      if (isTrivia(t)) continue;
      if (t.value === '(' || t.value === '[') depth++;
      if (t.value === ')' || t.value === ']') depth--;
      if (t.value === ',' && depth === 0) { parts.push(cur); cur = []; continue; }
      cur.push(t);
    }
    if (cur.length) parts.push(cur);
    const names = [];
    for (const part of parts) {
      const idents = part.filter((t) => t.type === 'ident' && !QUALIFIERS.has(t.value) && !PRIMITIVE_TYPES.has(t.value));
      if (idents.length) names.push(idents[idents.length - 1].value);
    }
    return names.join(', ');
  }

  // -------------------------------------------------------------- statements

  transformBlockContents(closeBraceIdx) {
    while (true) {
      this.emitTrivia();
      if (this.pos > closeBraceIdx) break;
      const tok = this.tokens[this.pos];
      if (tok === undefined) break;
      if (tok.type === 'punct' && tok.value === '}') break;
      if (!this.transformOneStatement()) {
        this.emitOneTransformed();
      }
    }
  }

  transformOneStatement() {
    const tok = this.tokens[this.pos];
    if (tok.type === 'ident' && (tok.value === 'class' || tok.value === 'struct')) {
      return this.transformClassOrStruct();
    }
    if (tok.type === 'ident' && ['if', 'for', 'while', 'switch', 'do', 'else', 'return', 'break', 'continue', 'try', 'catch'].includes(tok.value)) {
      return this.transformControlStatement();
    }
    const typeInfo = this.readTypeTokens(this.pos);
    if (typeInfo) {
      const nameIdx = this.significantIndexFrom(typeInfo.endIdx, 0);
      if (nameIdx !== -1 && this.tokens[nameIdx].type === 'ident') {
        const afterNameIdx = this.significantIndexFrom(nameIdx + 1, 0);
        const afterVal = afterNameIdx !== -1 ? this.tokens[afterNameIdx].value : null;
        if (afterVal === '(') {
          const closeParen = this.matchParen(afterNameIdx);
          const afterParenIdx = this.significantIndexFrom(closeParen + 1, 0);
          const afterParenVal = afterParenIdx !== -1 ? this.tokens[afterParenIdx].value : null;
          if (afterParenVal === '{') {
            return this.transformFunctionDef(typeInfo, nameIdx, afterNameIdx, closeParen);
          }
          if (typeInfo.isCustomType) {
            return this.transformObjectInstantiation(typeInfo, nameIdx, afterNameIdx, closeParen);
          }
          if (afterParenVal === ';') {
            this.pos = afterParenIdx + 1; // forward declaration - drop
            return true;
          }
        } else if (afterVal === ';' || afterVal === '=') {
          return this.transformVarDecl(typeInfo, nameIdx, afterNameIdx);
        } else if (afterVal === '[') {
          return this.transformArrayDecl(typeInfo, nameIdx, afterNameIdx);
        } else if (typeInfo.isCustomType) {
          return this.transformVarDecl(typeInfo, nameIdx, afterNameIdx);
        }
      }
    }
    return this.transformGenericStatement();
  }

  transformVarDecl(typeInfo, nameIdx, afterNameIdx) {
    const isConst = this.hasQualifier(typeInfo, 'const');
    this.pos = nameIdx;
    let first = true;
    while (true) {
      this.emitTrivia();
      if (!first) this.out.push(isConst ? 'const ' : 'let ');
      else this.out.push(isConst ? 'const ' : 'let ');
      first = false;
      this.emitRaw(this.tokens[this.pos]); // identifier
      const eqIdx = this.significantIndexFrom(this.pos, 0);
      const hasInit = eqIdx !== -1 && this.tokens[eqIdx].value === '=';
      const commaOrSemi = this.findTopLevelDelims(this.pos, [';', ',']);
      if (hasInit) {
        const braceIdx = this.significantIndexFrom(eqIdx + 1, 0);
        if (typeInfo.isCustomType && braceIdx !== -1 && this.tokens[braceIdx].value === '{') {
          const braceClose = this.matchBrace(braceIdx);
          this.out.push(` = new ${typeInfo.typeName}(`);
          this.pos = braceIdx + 1;
          this.copyExprRange(braceClose - 1);
          this.out.push(')');
          this.pos = braceClose + 1;
        } else {
          this.copyExprRange(commaOrSemi - 1);
        }
      } else if (typeInfo.isCustomType) {
        this.out.push(` = new ${typeInfo.typeName}()`);
        this.pos = commaOrSemi;
      }
      this.emitTrivia();
      if (this.tokens[this.pos] && this.tokens[this.pos].value === ',') {
        this.out.push(';');
        this.pos++;
        this.emitTrivia();
        continue;
      }
      break;
    }
    if (this.tokens[this.pos] && this.tokens[this.pos].value === ';') this.emitRaw(this.tokens[this.pos]);
    return true;
  }

  // Handles both 1D (`int a[5];`) and multi-dimensional (`int a[8][4] = {...};`)
  // array declarations. Nested brace-init lists are converted to nested JS
  // array literals recursively (a bare `{1,0,0,0}` is invalid JS otherwise).
  transformArrayDecl(typeInfo, nameIdx) {
    this.pos = nameIdx;
    this.out.push('let ');
    this.emitRaw(this.tokens[nameIdx]);
    const dims = [];
    let idx = this.significantIndexFrom(nameIdx + 1, 0);
    while (idx !== -1 && this.tokens[idx].value === '[') {
      const close = this.matchBracket(idx);
      const sizeToks = [];
      for (let i = idx + 1; i < close; i++) if (!isTrivia(this.tokens[i])) sizeToks.push(this.tokens[i].value);
      dims.push(sizeToks.join(''));
      idx = this.significantIndexFrom(close + 1, 0);
    }
    this.pos = idx;
    if (idx !== -1 && this.tokens[idx].value === '=') {
      const semi = this.findTopLevelDelims(idx, [';']);
      const braceIdx = this.significantIndexFrom(idx + 1, 0);
      if (braceIdx !== -1 && this.tokens[braceIdx].value === '{') {
        const braceClose = this.matchBrace(braceIdx);
        this.out.push(' = ');
        this.emitBraceInitAsArray(braceIdx, braceClose);
      } else {
        this.out.push(' = ');
        this.pos = idx + 1;
        this.copyExprRange(semi - 1);
      }
      this.pos = semi;
    } else {
      let expr = '0';
      for (let d = dims.length - 1; d >= 0; d--) {
        expr = d === dims.length - 1
          ? `new Array(${dims[d] || 0}).fill(0)`
          : `Array.from({ length: ${dims[d] || 0} }, () => ${expr})`;
      }
      this.out.push(` = ${expr}`);
    }
    if (this.tokens[this.pos] && this.tokens[this.pos].value === ';') this.emitRaw(this.tokens[this.pos]);
    return true;
  }

  emitBraceInitAsArray(openIdx, closeIdx) {
    this.out.push('[');
    this.pos = openIdx + 1;
    while (this.pos < closeIdx) {
      if (isTrivia(this.tokens[this.pos])) { this.emitTrivia(); continue; }
      if (this.tokens[this.pos].value === '{') {
        const innerClose = this.matchBrace(this.pos);
        this.emitBraceInitAsArray(this.pos, innerClose);
        continue;
      }
      this.emitOneTransformed();
    }
    this.out.push(']');
    this.pos = closeIdx + 1;
  }

  transformObjectInstantiation(typeInfo, nameIdx, openParenIdx, closeParenIdx) {
    this.pos = nameIdx;
    this.out.push('let ');
    this.emitRaw(this.tokens[nameIdx]);
    this.out.push(` = new ${typeInfo.typeName}`);
    this.pos = openParenIdx;
    this.emitRaw(this.tokens[openParenIdx]);
    this.copyExprRange(closeParenIdx - 1);
    this.emitRaw(this.tokens[closeParenIdx]);
    const semiIdx = this.significantIndexFrom(closeParenIdx + 1, 0);
    if (semiIdx !== -1 && this.tokens[semiIdx].value === ';') {
      this.pos = semiIdx;
      this.emitRaw(this.tokens[semiIdx]);
    }
    return true;
  }

  transformFunctionDef(typeInfo, nameIdx, openParenIdx, closeParenIdx) {
    const openBraceIdx = this.significantIndexFrom(closeParenIdx + 1, 0);
    const closeBraceIdx = this.matchBrace(openBraceIdx);
    this.pos = nameIdx;
    this.out.push('async function ');
    this.emitRaw(this.tokens[nameIdx]);
    this.pos = openParenIdx;
    this.emitRaw(this.tokens[openParenIdx]);
    this.out.push(this.detypeParamList(openParenIdx, closeParenIdx));
    this.pos = closeParenIdx;
    this.emitRaw(this.tokens[closeParenIdx]);
    this.pos = openBraceIdx;
    this.emitTrivia();
    this.emitRaw(this.tokens[openBraceIdx]);
    this.transformBlockContents(closeBraceIdx);
    this.pos = closeBraceIdx;
    this.emitRaw(this.tokens[closeBraceIdx]);
    return true;
  }

  transformClassOrStruct() {
    this.pos++; // consume class/struct
    this.emitTrivia();
    const nameIdx = this.pos;
    const className = this.tokens[nameIdx].value;
    this.knownTypes.add(className);
    let idx = this.significantIndexFrom(nameIdx + 1, 0);
    let baseName = null;
    if (idx !== -1 && this.tokens[idx].value === ':') {
      idx = this.significantIndexFrom(idx + 1, 0);
      if (idx !== -1 && ['public', 'private', 'protected'].includes(this.tokens[idx].value)) {
        idx = this.significantIndexFrom(idx + 1, 0);
      }
      if (idx !== -1 && this.tokens[idx].type === 'ident') {
        baseName = this.tokens[idx].value;
        idx = this.significantIndexFrom(idx + 1, 0);
      }
    }
    const openBraceIdx = idx;
    const closeBraceIdx = this.matchBrace(openBraceIdx);
    this.pos = nameIdx;
    this.out.push('class ');
    this.emitRaw(this.tokens[nameIdx]);
    if (baseName) this.out.push(` extends ${baseName}`);
    this.pos = openBraceIdx;
    this.emitTrivia();
    this.emitRaw(this.tokens[openBraceIdx]);
    this.transformClassBody(closeBraceIdx, className);
    this.pos = closeBraceIdx;
    this.emitRaw(this.tokens[closeBraceIdx]);
    const semiIdx = this.significantIndexFrom(closeBraceIdx + 1, 0);
    if (semiIdx !== -1 && this.tokens[semiIdx].value === ';') {
      this.pos = semiIdx;
      this.emitRaw(this.tokens[semiIdx]);
    }
    return true;
  }

  // Scans the class body (without emitting) to collect field names, so
  // methods appearing before a field's declaration (very common: public
  // methods first, private fields last) still know to rewrite bare
  // references to it as `this.field`.
  prescanClassFields(openBraceIdx, closeBraceIdx, className) {
    const fields = [];
    let i = openBraceIdx + 1;
    while (i < closeBraceIdx) {
      if (isTrivia(this.tokens[i])) { i++; continue; }
      const tok = this.tokens[i];
      if (tok.type === 'ident' && ['public', 'private', 'protected'].includes(tok.value)) {
        i = this.significantIndexFrom(i + 1, 0) + 1;
        continue;
      }
      if (tok.type === 'ident' && tok.value === className) {
        const nextIdx = this.significantIndexFrom(i + 1, 0);
        if (nextIdx !== -1 && this.tokens[nextIdx].value === '(') {
          const close = this.matchParen(nextIdx);
          const actualOpen = this.findTopLevelOpenBrace(close + 1);
          i = this.matchBrace(actualOpen) + 1;
          continue;
        }
      }
      const typeInfo = this.readTypeTokens(i);
      if (typeInfo) {
        const nameIdx = this.significantIndexFrom(typeInfo.endIdx, 0);
        if (nameIdx !== -1 && this.tokens[nameIdx].type === 'ident') {
          const afterNameIdx = this.significantIndexFrom(nameIdx + 1, 0);
          const afterVal = afterNameIdx !== -1 ? this.tokens[afterNameIdx].value : null;
          if (afterVal === '(') {
            const close = this.matchParen(afterNameIdx);
            const braceIdx = this.significantIndexFrom(close + 1, 0);
            if (braceIdx !== -1 && this.tokens[braceIdx].value === '{') {
              i = this.matchBrace(braceIdx) + 1;
              continue;
            }
          } else if (afterVal === ';' || afterVal === '=' || afterVal === '[') {
            fields.push(this.tokens[nameIdx].value);
            i = this.findTopLevelDelims(nameIdx, [';']) + 1;
            continue;
          }
        }
      }
      i++;
    }
    return fields;
  }

  transformClassBody(closeBraceIdx, className) {
    const openBraceIdx = this.pos; // caller left pos right after emitting '{'... actually pos is at '{' before emit
    const fields = this.prescanClassFields(this.pos - 1, closeBraceIdx, className);
    this.currentFieldNames = new Set(fields);
    let hasExplicitCtor = false;
    while (true) {
      this.emitTrivia();
      if (this.pos >= closeBraceIdx) break;
      const tok = this.tokens[this.pos];
      if (tok.type === 'ident' && ['public', 'private', 'protected'].includes(tok.value)) {
        const colonIdx = this.significantIndexFrom(this.pos + 1, 0);
        if (colonIdx !== -1 && this.tokens[colonIdx].value === ':') {
          this.pos = colonIdx + 1;
          continue;
        }
      }
      if (tok.type === 'ident' && tok.value === className) {
        const nextIdx = this.significantIndexFrom(this.pos + 1, 0);
        if (nextIdx !== -1 && this.tokens[nextIdx].value === '(') {
          hasExplicitCtor = true;
          this.transformConstructor(className, nextIdx);
          continue;
        }
      }
      const typeInfo = this.readTypeTokens(this.pos);
      if (typeInfo) {
        const nameIdx = this.significantIndexFrom(typeInfo.endIdx, 0);
        if (nameIdx !== -1 && this.tokens[nameIdx].type === 'ident') {
          const afterNameIdx = this.significantIndexFrom(nameIdx + 1, 0);
          const afterVal = afterNameIdx !== -1 ? this.tokens[afterNameIdx].value : null;
          if (afterVal === '(') {
            const closeParen = this.matchParen(afterNameIdx);
            const afterParenIdx = this.significantIndexFrom(closeParen + 1, 0);
            if (afterParenIdx !== -1 && this.tokens[afterParenIdx].value === '{') {
              this.transformMethodDef(nameIdx, afterNameIdx, closeParen);
              continue;
            }
          } else if (afterVal === ';' || afterVal === '=') {
            this.transformFieldDecl(typeInfo, nameIdx, afterNameIdx);
            continue;
          }
        }
      }
      this.emitOneTransformed();
    }
    if (!hasExplicitCtor && fields.length) {
      const params = fields.map((f, i) => `a${i}`);
      const body = fields.map((f, i) => `if (a${i} !== undefined) this.${f} = a${i};`).join(' ');
      this.out.push(`\n  constructor(${params.join(', ')}) { ${body} }\n`);
    }
    this.currentFieldNames = null;
    return fields;
  }

  transformFieldDecl(typeInfo, nameIdx, afterNameIdx) {
    const defaultForType = this.defaultValueFor(typeInfo.typeName);
    this.pos = nameIdx;
    this.emitRaw(this.tokens[nameIdx]);
    const semiIdx = this.findTopLevelDelims(this.pos, [';']);
    if (this.tokens[afterNameIdx] && this.tokens[afterNameIdx].value === '=') {
      this.pos = afterNameIdx;
      this.emitRaw(this.tokens[afterNameIdx]);
      this.copyExprRange(semiIdx - 1);
    } else {
      this.out.push(` = ${defaultForType}`);
      this.pos = semiIdx;
    }
    this.emitRaw(this.tokens[semiIdx]);
    return true;
  }

  defaultValueFor(typeName) {
    if (typeName === 'bool' || typeName === 'boolean') return 'false';
    if (typeName === 'String') return "''";
    return '0';
  }

  transformConstructor(className, openParenIdx) {
    const closeParenIdx = this.matchParen(openParenIdx);
    let idx = this.significantIndexFrom(closeParenIdx + 1, 0);
    const inits = [];
    if (idx !== -1 && this.tokens[idx].value === ':') {
      idx = this.significantIndexFrom(idx + 1, 0);
      while (idx !== -1 && this.tokens[idx].type === 'ident') {
        const memberName = this.tokens[idx].value;
        const parenIdx = this.significantIndexFrom(idx + 1, 0);
        const parenClose = this.matchParen(parenIdx);
        inits.push({ name: memberName, start: parenIdx + 1, end: parenClose - 1 });
        idx = this.significantIndexFrom(parenClose + 1, 0);
        if (idx !== -1 && this.tokens[idx].value === ',') {
          idx = this.significantIndexFrom(idx + 1, 0);
          continue;
        }
        break;
      }
    }
    const openBraceIdx = idx;
    const closeBraceIdx = this.matchBrace(openBraceIdx);
    this.out.push('constructor');
    this.pos = openParenIdx;
    this.emitRaw(this.tokens[openParenIdx]);
    this.out.push(this.detypeParamList(openParenIdx, closeParenIdx));
    this.pos = closeParenIdx;
    this.emitRaw(this.tokens[closeParenIdx]);
    this.pos = openBraceIdx;
    this.emitTrivia();
    this.emitRaw(this.tokens[openBraceIdx]);
    for (const init of inits) {
      this.out.push(`\n    this.${init.name} = `);
      const savedPos = this.pos;
      this.pos = init.start;
      this.copyExprRange(init.end);
      this.pos = savedPos;
      this.out.push(';');
    }
    this.pos = openBraceIdx + 1;
    this.transformBlockContents(closeBraceIdx);
    this.pos = closeBraceIdx;
    this.emitRaw(this.tokens[closeBraceIdx]);
  }

  transformMethodDef(nameIdx, openParenIdx, closeParenIdx) {
    const openBraceIdx = this.significantIndexFrom(closeParenIdx + 1, 0);
    const closeBraceIdx = this.matchBrace(openBraceIdx);
    this.pos = nameIdx;
    this.out.push('async ');
    this.emitRaw(this.tokens[nameIdx]);
    this.pos = openParenIdx;
    this.emitRaw(this.tokens[openParenIdx]);
    this.out.push(this.detypeParamList(openParenIdx, closeParenIdx));
    this.pos = closeParenIdx;
    this.emitRaw(this.tokens[closeParenIdx]);
    this.pos = openBraceIdx;
    this.emitTrivia();
    this.emitRaw(this.tokens[openBraceIdx]);
    this.transformBlockContents(closeBraceIdx);
    this.pos = closeBraceIdx;
    this.emitRaw(this.tokens[closeBraceIdx]);
  }

  transformControlStatement() {
    const tok = this.tokens[this.pos];
    if (['return', 'break', 'continue'].includes(tok.value)) {
      const semiIdx = this.findTopLevelDelims(this.pos, [';']);
      this.emitRaw(tok);
      this.copyExprRange(semiIdx - 1);
      if (this.tokens[this.pos] && this.tokens[this.pos].value === ';') this.emitRaw(this.tokens[this.pos]);
      return true;
    }
    if (tok.value === 'for') return this.transformForStatement();
    if (tok.value === 'else' || tok.value === 'do' || tok.value === 'try' || tok.value === 'catch') {
      this.emitRaw(tok);
      this.emitTrivia();
      if (this.tokens[this.pos] && this.tokens[this.pos].value === '(') {
        const close = this.matchParen(this.pos);
        this.copyExprRange(close);
      }
      this.emitTrivia();
      if (this.tokens[this.pos] && this.tokens[this.pos].value === '{') {
        const close = this.matchBrace(this.pos);
        this.emitRaw(this.tokens[this.pos]);
        this.transformBlockContents(close);
        this.pos = close;
        this.emitRaw(this.tokens[close]);
      } else {
        this.transformOneStatement();
      }
      return true;
    }
    // if / while / switch
    this.emitRaw(tok);
    this.emitTrivia();
    if (this.tokens[this.pos] && this.tokens[this.pos].value === '(') {
      const close = this.matchParen(this.pos);
      this.copyExprRange(close);
    }
    this.emitTrivia();
    if (this.tokens[this.pos] && this.tokens[this.pos].value === '{') {
      const close = this.matchBrace(this.pos);
      this.emitRaw(this.tokens[this.pos]);
      this.transformBlockContents(close);
      this.pos = close;
      this.emitRaw(this.tokens[close]);
    } else if (tok.value !== 'switch') {
      this.transformOneStatement();
    }
    return true;
  }

  // `for (TYPE i = 0; cond; update)` -> `for (let i = 0; cond; update)`
  // `for (TYPE x : container)` -> `for (const x of container)`
  transformForStatement() {
    this.emitRaw(this.tokens[this.pos]); // 'for'
    this.emitTrivia();
    const openParen = this.pos;
    this.emitRaw(this.tokens[openParen]); // '('
    const closeParen = this.matchParen(openParen);
    const firstSemi = this.findTopLevelDelims(this.pos, [';']);
    const colonIdx = this.findTopLevelDelims(this.pos, [':']);
    const isRangeBased = colonIdx < closeParen && firstSemi >= closeParen;
    if (isRangeBased) {
      const typeInfo = this.readTypeTokens(this.pos);
      if (typeInfo) {
        const isConst = this.hasQualifier(typeInfo, 'const') || true;
        this.out.push('const ');
        this.pos = this.significantIndexFrom(typeInfo.endIdx, 0);
      } else {
        this.out.push('const ');
      }
      const nameIdx = this.pos;
      this.emitTrivia();
      this.emitRaw(this.tokens[nameIdx]);
      this.pos = colonIdx;
      this.out.push(' of ');
      this.pos++;
      this.copyExprRange(closeParen - 1);
    } else {
      // classic 3-clause for
      const typeInfo = this.readTypeTokens(this.pos);
      if (typeInfo && this.significantIndexFrom(typeInfo.endIdx, 0) < firstSemi) {
        this.out.push('let ');
        this.pos = this.significantIndexFrom(typeInfo.endIdx, 0);
      }
      this.copyExprRange(closeParen - 1);
    }
    this.emitRaw(this.tokens[closeParen]); // ')'
    this.emitTrivia();
    if (this.tokens[this.pos] && this.tokens[this.pos].value === '{') {
      const close = this.matchBrace(this.pos);
      this.emitRaw(this.tokens[this.pos]);
      this.transformBlockContents(close);
      this.pos = close;
      this.emitRaw(this.tokens[close]);
    } else {
      this.transformOneStatement();
    }
    return true;
  }

  transformGenericStatement() {
    const semiIdx = this.findTopLevelDelims(this.pos, [';']);
    this.copyExprRange(Math.min(semiIdx, this.tokens.length - 1));
    if (this.tokens[this.pos] && this.tokens[this.pos].value === ';') this.emitRaw(this.tokens[this.pos]);
    return true;
  }

  run() {
    this.transformBlockContents(this.tokens.length - 1);
    this.emitTrivia();
    return this.out.join('');
  }
}

export function translateArduinoCpp(source) {
  const warnings = [];
  if (/\bfunction\s+setup\b/.test(source) && !/\bvoid\s+setup\b/.test(source)) {
    // Already-JS-dialect sketch (old format) - pass through unchanged.
    return { js: source, warnings };
  }
  const preprocessed = stripPreprocessor(source, warnings);
  const tokens = tokenize(preprocessed);
  const transformer = new Transformer(tokens, warnings);
  const js = transformer.run();
  return { js, warnings };
}

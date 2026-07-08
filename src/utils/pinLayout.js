// Computes local (x, y) coordinates for each pin of a catalog part, evenly
// spaced along whichever side ('left' | 'right' | 'top' | 'bottom') it belongs to.
export function computePinPositions(def) {
  const bySide = { left: [], right: [], top: [], bottom: [] };
  for (const pin of def.pins) bySide[pin.side].push(pin);

  const positions = {};
  const place = (list, isVertical) => {
    const n = list.length;
    list.forEach((pin, i) => {
      const frac = (i + 1) / (n + 1);
      if (isVertical) {
        positions[pin.name] = { x: 0, y: frac * def.height };
      } else {
        positions[pin.name] = { x: frac * def.width, y: 0 };
      }
    });
  };
  place(bySide.left, true);
  place(bySide.right, true);
  place(bySide.top, false);
  place(bySide.bottom, false);

  for (const pin of bySide.left) positions[pin.name].x = -8;
  for (const pin of bySide.right) positions[pin.name].x = def.width + 8;
  for (const pin of bySide.top) positions[pin.name].y = -8;
  for (const pin of bySide.bottom) positions[pin.name].y = def.height + 8;

  return positions;
}

// Maps a point in a part's local (unrotated, unflipped) w x h frame to world
// space, applying the part's flip (mirror around the vertical center line)
// then rotation (clockwise, around the box center) — must match the SVG
// transform PartInstance applies to the body/pin group: `translate(w/2 h/2)
// rotate(rotation) scale(flipped?-1:1, 1) translate(-w/2 -h/2)`.
export function transformLocalPoint(x, y, def, part) {
  const w = def.width, h = def.height;
  const cx = w / 2, cy = h / 2;
  let dx = x - cx;
  const dy = y - cy;
  if (part.flipped) dx = -dx;
  const rad = ((part.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return { x: part.x + cx + rx, y: part.y + cy + ry };
}

export function pinWorldPos(part, def, pinName) {
  const local = computePinPositions(def)[pinName];
  return transformLocalPoint(local.x, local.y, def, part);
}

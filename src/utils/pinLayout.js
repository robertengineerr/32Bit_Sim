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

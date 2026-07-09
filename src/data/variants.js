// Add-time AND post-placement editable variants for certain part types.
// `key` is the part.state field the variant controls; `options` are the
// selectable raw values; `formatLabel` optionally prettifies an option for display.
export const PART_VARIANTS = {
  led: {
    key: 'color',
    options: ['red', 'white', 'blue', 'green', 'yellow'],
  },
  resistor: {
    key: 'value',
    options: ['10', '100', '220', '330', '1k', '2k', '5.1k', '10k', '100k', '1M'],
    formatLabel: (v) => `${v}Ω`,
  },
  capacitor: {
    key: 'value',
    options: ['10n', '100n', '1u', '10u', '100u', '470u', '1000u'],
    formatLabel: (v) => `${v}F`,
  },
  psu: {
    key: 'voltage',
    options: ['1.8', '3.3', '5', '9', '12'],
    formatLabel: (v) => `${v}V`,
  },
};

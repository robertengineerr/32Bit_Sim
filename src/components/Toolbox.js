import React from 'react';
import { catalog, CATEGORY_ORDER } from '../data/partsCatalog.js';
import { PART_VARIANTS } from '../data/variants.js';
export default function Toolbox({
  onAdd
}) {
  const grouped = {};
  for (const [type, def] of Object.entries(catalog)) {
    (grouped[def.category] ||= []).push({
      type,
      def
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "toolbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbox-title"
  }, "Parts"), CATEGORY_ORDER.filter(c => grouped[c]).map(cat => /*#__PURE__*/React.createElement("div", {
    key: cat,
    className: "tb-category"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tb-category-title"
  }, cat), grouped[cat].map(({
    type,
    def
  }) => {
    const variantDef = PART_VARIANTS[type];
    if (variantDef) {
      return variantDef.options.map(v => /*#__PURE__*/React.createElement("button", {
        key: `${type}-${v}`,
        className: "tb-item",
        onClick: () => onAdd(type, v),
        title: `${def.label} (${v})`
      }, def.label, " ", /*#__PURE__*/React.createElement("span", {
        className: "tb-variant"
      }, variantDef.formatLabel ? variantDef.formatLabel(v) : v)));
    }
    return /*#__PURE__*/React.createElement("button", {
      key: type,
      className: "tb-item",
      onClick: () => onAdd(type),
      title: def.label
    }, def.label);
  }))));
}
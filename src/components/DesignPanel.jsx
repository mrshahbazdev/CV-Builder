import React from 'react';
import { templateList } from '../lib/templates.js';

/**
 * Print-safe accent palette: every swatch stays readable when the page is
 * printed in greyscale — no washed-out pastels.
 */
const PALETTE = ['#1f4e79', '#0f3d3e', '#5b2333', '#3d2c8d', '#8a5a00', '#14532d', '#7c2d12', '#111111'];

export default function DesignPanel({ doc, update }) {
  const d = doc.design;
  return (
    <div>
      <h2>Template</h2>
      <div className="tpl-row">
        {templateList().map(t => (
          <div key={t.id} className={`tpl-card ${d.template === t.id ? 'on' : ''}`}
            onClick={() => update(dd => { dd.design.template = t.id; })}>
            <div className="thumb">{t.name}</div>
            <b>{t.name}</b>
            <small>{t.blurb}</small>
            {t.free && <small className="free">Free</small>}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 16 }}>Density</h2>
      <div className="field">
        <label>Scales font size, line height and spacing together — nothing breaks.</label>
        <input type="range" min={-3} max={3} step={1} value={d.density}
          onChange={e => update(dd => { dd.design.density = +e.target.value; })} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
          <span>Airy</span><span>Compact</span>
        </div>
      </div>

      <h2 style={{ marginTop: 16 }}>Accent colour</h2>
      <div className="swatches">
        {PALETTE.map(c => (
          <div key={c} className={`swatch ${d.accent === c ? 'on' : ''}`}
            style={{ background: c }} onClick={() => update(dd => { dd.design.accent = c; })} />
        ))}
      </div>
    </div>
  );
}

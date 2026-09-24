import { getTemplate } from './templates.js';
import { SECTION_DEFS, DEFAULT_ORDER, uid } from './model.js';

export const A4 = { w: 210, h: 297 }; // mm

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtMonth(v) {
  if (!v) return '';
  const [y, m] = v.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return m ? `${months[+m - 1] || m} ${y}` : v;
}

function dateRange(e) {
  const s = fmtMonth(e.start);
  const en = e.current ? 'Present' : fmtMonth(e.end);
  if (!s && !en) return '';
  return `${s} – ${en}`;
}

/** Density slider: -3..3 scales type, spacing and line-height together. */
export function scale(tpl, density) {
  const k = 1 + (density || 0) * 0.045;
  return { size: tpl.baseSize * k, line: tpl.lineHeight * (1 + (density || 0) * 0.02), gap: 1 + (density || 0) * 0.08 };
}

export function cssFor(tpl, design) {
  const s = scale(tpl, design.density);
  const accent = design.accent || '#1f4e79';
  const titleCss = {
    'caps-rule': `text-transform:uppercase;letter-spacing:.12em;font-size:${(s.size * 0.92).toFixed(2)}pt;color:${accent};border-bottom:.4pt solid ${accent};padding-bottom:1.4mm;margin:0 0 ${(tpl.sectionGap * 0.6 * s.gap).toFixed(2)}mm 0;`,
    'accent-rule': `font-size:${(s.size * 1.05).toFixed(2)}pt;font-weight:700;color:${accent};border-bottom:.3pt solid ${accent}44;padding-bottom:1.2mm;margin:0 0 ${(tpl.sectionGap * 0.6 * s.gap).toFixed(2)}mm 0;`,
    'plain': `font-size:${(s.size * 1.1).toFixed(2)}pt;font-weight:700;color:#111;margin:0 0 ${(tpl.sectionGap * 0.5 * s.gap).toFixed(2)}mm 0;`
  }[tpl.sectionTitleStyle] || '';

  return `
    * { box-sizing:border-box; margin:0; padding:0; }
    .cv { font-family:${tpl.font}; font-size:${s.size.toFixed(2)}pt; line-height:${s.line.toFixed(2)}; color:#1a1a1a; }
    .cv h1.name { font-family:${tpl.headingFont}; font-size:${tpl.nameSize * (1 + (design.density || 0) * 0.02)}pt; font-weight:700; color:#111; }
    .cv .headline { font-size:${(s.size * 1.12).toFixed(2)}pt; color:${accent}; margin-top:1mm; }
    .cv .contact { display:flex; flex-wrap:wrap; gap:1mm 4mm; font-size:${(s.size * 0.9).toFixed(2)}pt; color:#444; margin-top:2mm; }
    .cv .chead { padding-bottom:4mm; }
    .cv .sectitle { ${titleCss} font-family:${tpl.headingFont}; }
    .cv .entry { margin-bottom:${(tpl.entryGap * s.gap).toFixed(2)}mm; }
    .cv .entry .row1 { display:flex; justify-content:space-between; align-items:baseline; gap:4mm; }
    .cv .entry .t1 { font-weight:700; font-family:${tpl.headingFont}; }
    .cv .entry .dates { color:#555; font-size:${(s.size * 0.88).toFixed(2)}pt; white-space:nowrap; }
    .cv .entry .t2 { color:#333; }
    .cv .entry .meta { color:#555; font-size:${(s.size * 0.88).toFixed(2)}pt; }
    .cv ul { margin:1mm 0 0 4.5mm; }
    .cv li { margin-bottom:.8mm; }
    .cv .skills .grp { margin-bottom:1.5mm; }
    .cv .skills .grp b { font-family:${tpl.headingFont}; }
    .cv .summary p { white-space:pre-wrap; }
    .cv .photo { width:22mm; height:22mm; border-radius:50%; object-fit:cover; }
    .cv .nameblock { display:flex; gap:6mm; align-items:center; }
    .cv .rail-wrap { display:flex; }
    .cv .rail { background:${accent}; color:#fff; padding:${tpl.railPad}mm; }
    .cv .rail .sectitle { color:#fff; border-color:#ffffff66; }
    .cv .rail .entry .dates, .cv .rail .meta, .cv .rail .t2 { color:#ffffffcc; }
    .cv .rail a { color:#fff; }
    .cv .maincol { flex:1; padding:16mm 14mm; }
    .cv .rail { width:${tpl.railWidth}mm; flex:none; padding-top:${Math.max(tpl.railPad, 16)}mm; padding-bottom:10mm; }
    .cv .rail .contact { flex-direction:column; gap:1mm; }
    .cv .rail .name { font-size:${tpl.nameSize * 0.7}pt; }
    .cv a { color:inherit; text-decoration:none; }
  `;
}

function contactHtml(p, tpl) {
  const bits = [p.email, p.phone, p.location].filter(Boolean).map(esc);
  for (const l of p.links || []) {
    if (l.url) bits.push(esc(l.label ? `${l.label}: ${l.url}` : l.url));
  }
  return bits.length ? `<div class="contact">${bits.map(b => `<span>${b}</span>`).join('')}</div>` : '';
}

export function headerHtml(doc, tpl) {
  const p = doc.profile;
  const photo = p.photo ? `<img class="photo" src="${p.photo}" alt="">` : '';
  return `<div class="chead"><div class="nameblock">${photo}<div>
    <h1 class="name">${esc(p.name) || 'Your Name'}</h1>
    ${p.headline ? `<div class="headline">${esc(p.headline)}</div>` : ''}
    ${tpl.columns === 'single' ? contactHtml(p, tpl) : ''}
  </div></div>${tpl.columns === 'rail' ? '' : ''}</div>`;
}

function entryTitle(e, sectionId) {
  switch (sectionId) {
    case 'experience': return { main: e.role, sub: [e.company, e.location].filter(Boolean).join(' · '), dates: dateRange(e) };
    case 'education': return { main: e.qualification, sub: [e.institution, e.field].filter(Boolean).join(' · '), dates: dateRange(e) };
    case 'projects': return { main: e.name, sub: [e.role, e.stack, e.link].filter(Boolean).join(' · '), dates: '' };
    case 'certificates': return { main: e.name, sub: [e.issuer, e.id, e.link].filter(Boolean).join(' · '), dates: fmtMonth(e.date) };
    case 'languages': return { main: e.name, sub: e.level || '', dates: '' };
    case 'awards': return { main: e.name, sub: [e.issuer, e.note].filter(Boolean).join(' · '), dates: fmtMonth(e.date) };
    case 'publications': return { main: e.title, sub: [e.authors, e.venue, e.doi].filter(Boolean).join(' · '), dates: e.year || '' };
    default: return { main: '', sub: '', dates: '' };
  }
}

function entryHtml(e, sectionId) {
  const t = entryTitle(e, sectionId);
  const bullets = (e.bullets || e.notes || []).filter(b => b.trim());
  return `<div class="entry">
    <div class="row1"><span class="t1">${esc(t.main)}</span><span class="dates">${esc(t.dates)}</span></div>
    ${t.sub ? `<div class="t2">${esc(t.sub)}</div>` : ''}
    ${bullets.length ? `<ul>${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

export function sectionTitle(label, tpl) {
  return `<div class="sectitle">${esc(label)}</div>`;
}

/**
 * Returns ordered block list for the visible sections of a version.
 * Each block = { key, html, keepWithNext }. A title block is glued to the
 * first block after it so a heading never lands alone at a page bottom.
 */
export function blocksFor(doc, version, design) {
  const tpl = getTemplate(design.template);
  const order = tpl.order || version.order || DEFAULT_ORDER;
  const hidden = new Set(version.hidden || []);
  const ov = version.overrides || {};
  const blocks = [];

  blocks.push({ key: 'header', sid: 'header', html: headerHtml(doc, tpl) });

  const push = (sid, label, html, keep) => blocks.push({ key: uid(), sid, label, html, keepWithNext: keep });

  for (const sid of order) {
    if (hidden.has(sid)) continue;
    const def = SECTION_DEFS.find(d => d.id === sid);
    if (!def) continue;
    const label = ov[`${sid}:title`] || def.label;
    const sec = doc.sections[sid] || {};

    if (def.kind === 'text') {
      const text = ov['summary:text'] ?? sec.text;
      if (!text || !text.trim()) continue;
      push(sid, label, sectionTitle(label, tpl), true);
      push(sid, label, `<div class="entry summary"><p>${esc(text)}</p></div>`);
      continue;
    }
    if (def.kind === 'groups') {
      const groups = (sec.groups || []).filter(g => (g.name || g.items || '').trim());
      if (!groups.length) continue;
      push(sid, label, sectionTitle(label, tpl), true);
      groups.forEach((g, i) => push(sid, label,
        `<div class="skills"><div class="grp"><b>${esc(g.name)}</b>${g.name && g.items ? ': ' : ''}${esc(g.items)}</div></div>`,
        i === 0));
      continue;
    }
    if (def.kind === 'custom') {
      for (const cs of sec.sections || []) {
        if (hidden.has(`custom:${cs.id}`)) continue;
        const items = (cs.entries || []).filter(e => (e.title || e.body || '').trim());
        if (!items.length) continue;
        push(`custom:${cs.id}`, cs.title, sectionTitle(cs.title || 'Section', tpl), true);
        items.forEach((e, i) => push(`custom:${cs.id}`, cs.title,
          `<div class="entry"><div class="row1"><span class="t1">${esc(e.title)}</span><span class="dates">${esc(e.dates || '')}</span></div>${e.body ? `<div class="t2" style="white-space:pre-wrap">${esc(e.body)}</div>` : ''}</div>`,
          i === 0));
      }
      continue;
    }

    const entries = (sec.entries || []).filter(e =>
      FIELD_KEYS.some(k => (e[k] || '').toString().trim() || e[k] === true) ||
      (e.bullets || e.notes || []).some(b => b.trim()));
    if (!entries.length) continue;
    push(sid, label, sectionTitle(label, tpl), true);
    entries.forEach((e, i) => push(sid, label, entryHtml(e, sid), i === 0));
  }
  return blocks;
}

const FIELD_KEYS = ['role','company','location','start','end','qualification','institution','field','grade','name','issuer','date','id','link','level','note','authors','title','venue','year','doi','stack'];

/** Full printable document: pages already packed by the caller. */
export function documentHtml(tpl, design, pagesHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    html, body { margin:0; padding:0; }
    ${cssFor(tpl, design)}
    .page { width:${A4.w}mm; height:${A4.h}mm; overflow:hidden; page-break-after:always; position:relative; background:#fff; }
    .page:last-child { page-break-after:auto; }
    .page-inner { padding:${tpl.columns === 'rail' ? '0' : tpl.margin + 'mm'}; height:100%; }
  </style></head><body>${pagesHtml}</body></html>`;
}

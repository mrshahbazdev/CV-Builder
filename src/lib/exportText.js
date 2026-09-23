import { SECTION_DEFS, DEFAULT_ORDER } from './model.js';
import { getTemplate } from './templates.js';

const rule = '-'.repeat(72);
const dbl = '='.repeat(72);

function fmtMonth(v) {
  if (!v) return '';
  const [y, m] = v.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return m ? `${months[+m - 1] || m} ${y}` : v;
}

function dates(e) {
  const s = fmtMonth(e.start);
  const en = e.current ? 'Present' : fmtMonth(e.end);
  return s || en ? `${s} – ${en}` : '';
}

function entryText(e, sid) {
  const lines = [];
  const head = {
    experience: [e.role, e.company],
    education: [e.qualification, e.institution],
    projects: [e.name, e.role],
    certificates: [e.name, e.issuer],
    languages: [e.name, e.level],
    awards: [e.name, e.issuer],
    publications: [e.title, e.venue]
  }[sid] || [];
  const h = head.filter(Boolean).join(' — ');
  const d = dates(e) || fmtMonth(e.date) || e.year || '';
  if (h) lines.push(d ? `${h}  (${d})` : h);
  const sub = [e.location, e.field, e.stack, e.link, e.id, e.note, e.authors, e.doi, e.grade]
    .filter(Boolean).join(' · ');
  if (sub) lines.push(sub);
  for (const b of e.bullets || e.notes || []) {
    if (b.trim()) lines.push(`  • ${b.trim()}`);
  }
  return lines.join('\n');
}

/** Plain-text rendering for paste-into-a-form exports. */
export function textFor(doc, version) {
  const tpl = getTemplate(doc.design?.template);
  const order = tpl.order || version.order || DEFAULT_ORDER;
  const hidden = new Set(version.hidden || []);
  const ov = version.overrides || {};
  const p = doc.profile;
  const out = [];

  out.push(p.name || 'Your Name');
  if (p.headline) out.push(p.headline);
  const c = [p.email, p.phone, p.location, ...(p.links || []).map(l => l.url)].filter(Boolean);
  if (c.length) out.push(c.join('  |  '));
  out.push(dbl);

  for (const sid of order) {
    if (hidden.has(sid)) continue;
    const def = SECTION_DEFS.find(d => d.id === sid);
    if (!def) continue;
    const label = (ov[`${sid}:title`] || def.label).toUpperCase();
    const sec = doc.sections[sid] || {};
    const lines = [];

    if (def.kind === 'text') {
      const t = ov['summary:text'] ?? sec.text;
      if (t && t.trim()) lines.push(t.trim());
    } else if (def.kind === 'groups') {
      for (const g of sec.groups || []) {
        if ((g.name || g.items || '').trim()) lines.push(`${g.name}${g.name && g.items ? ': ' : ''}${g.items}`);
      }
    } else if (def.kind === 'custom') {
      continue;
    } else {
      for (const e of sec.entries || []) {
        const t = entryText(e, sid);
        if (t.trim()) lines.push(t);
      }
    }

    if (lines.length) {
      out.push('', label, rule, lines.join('\n\n'));
    }
  }

  for (const cs of (doc.sections.custom?.sections || [])) {
    if (hidden.has(`custom:${cs.id}`)) continue;
    const lines = (cs.entries || [])
      .map(e => [e.title && e.dates ? `${e.title}  (${e.dates})` : e.title, e.body].filter(Boolean).join('\n'))
      .filter(s => s.trim());
    if (lines.length) out.push('', (cs.title || 'SECTION').toUpperCase(), rule, lines.join('\n\n'));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

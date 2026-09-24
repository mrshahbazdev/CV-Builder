import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType, BorderStyle } from 'docx';
import { SECTION_DEFS, DEFAULT_ORDER } from './model.js';
import { getTemplate } from './templates.js';

/**
 * DOCX export with real Word styles — recruiters and agencies do edit CVs,
 * so every paragraph carries a named style rather than ad-hoc formatting.
 */
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

function heading(text, accent) {
  return new Paragraph({
    text: text.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: accent.replace('#', '') } }
  });
}

function entryParagraphs(e, sid) {
  const d = dates(e) || fmtMonth(e.date) || e.year || '';
  const t1 = { experience: e.role, education: e.qualification, projects: e.name,
    certificates: e.name, languages: e.name, awards: e.name, publications: e.title }[sid];
  const sub = {
    experience: [e.company, e.location],
    education: [e.institution, e.field],
    projects: [e.role, e.stack, e.link],
    certificates: [e.issuer, e.id, e.link],
    languages: [e.level],
    awards: [e.issuer, e.note],
    publications: [e.authors, e.venue, e.doi]
  }[sid] || [];

  const out = [new Paragraph({
    children: [
      new TextRun({ text: t1 || '', bold: true }),
      ...(d ? [new TextRun({ text: `\t${d}`, color: '555555' })] : [])
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
    spacing: { before: 140 }
  })];

  const subText = sub.filter(Boolean).join(' · ');
  if (subText) out.push(new Paragraph({ children: [new TextRun({ text: subText, color: '333333' })] }));

  for (const b of e.bullets || e.notes || []) {
    if (b.trim()) out.push(new Paragraph({ text: b.trim(), bullet: { level: 0 } }));
  }
  return out;
}

export async function docxBlob(doc, version) {
  const tpl = getTemplate(doc.design?.template);
  const order = tpl.order || version.order || DEFAULT_ORDER;
  const hidden = new Set(version.hidden || []);
  const ov = version.overrides || {};
  const p = doc.profile;
  const accent = (doc.design?.accent || '#1f4e79');
  const children = [];

  children.push(new Paragraph({
    text: p.name || 'Your Name',
    heading: HeadingLevel.TITLE,
    spacing: { after: 40 }
  }));
  if (p.headline) children.push(new Paragraph({
    children: [new TextRun({ text: p.headline, color: accent.replace('#', ''), size: 24 })]
  }));
  const contact = [p.email, p.phone, p.location, ...(p.links || []).map(l => l.url)].filter(Boolean);
  if (contact.length) children.push(new Paragraph({
    children: [new TextRun({ text: contact.join('  |  '), color: '555555', size: 18 })],
    spacing: { after: 120 }
  }));

  for (const sid of order) {
    if (hidden.has(sid)) continue;
    const def = SECTION_DEFS.find(d => d.id === sid);
    if (!def || def.kind === 'custom') continue;
    const label = ov[`${sid}:title`] || def.label;
    const sec = doc.sections[sid] || {};
    const body = [];

    if (def.kind === 'text') {
      const t = ov['summary:text'] ?? sec.text;
      if (t && t.trim()) body.push(new Paragraph({ text: t.trim() }));
    } else if (def.kind === 'groups') {
      for (const g of sec.groups || []) {
        if (!(g.name || g.items || '').trim()) continue;
        body.push(new Paragraph({ children: [
          new TextRun({ text: `${g.name}: `, bold: true }),
          new TextRun({ text: g.items || '' })
        ] }));
      }
    } else {
      for (const e of sec.entries || []) body.push(...entryParagraphs(e, sid));
    }

    if (body.length) {
      children.push(heading(label, accent), ...body);
    }
  }

  for (const cs of doc.sections.custom?.sections || []) {
    if (hidden.has(`custom:${cs.id}`)) continue;
    const entries = (cs.entries || []).filter(e => (e.title || e.body || '').trim());
    if (!entries.length) continue;
    children.push(heading(cs.title || 'Section', accent));
    for (const e of entries) {
      children.push(new Paragraph({ children: [
        new TextRun({ text: e.title || '', bold: true }),
        ...(e.dates ? [new TextRun({ text: `  (${e.dates})`, color: '555555' })] : [])
      ] }));
      if (e.body) children.push(new Paragraph({ text: e.body }));
    }
  }

  const d = new Document({
    creator: p.name || 'Resumine',
    title: `${p.name || 'CV'} — ${version.name}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 21 } }
      }
    },
    sections: [{ children }]
  });
  return Packer.toBlob(d);
}

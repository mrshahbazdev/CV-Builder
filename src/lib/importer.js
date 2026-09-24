import { emptyDoc, uid } from './model.js';

/**
 * Import is a starting draft, never a claim of perfect parsing — the user
 * corrects the guessed sections in the editor.
 */
const HEADING_MAP = [
  [/^(summary|professional summary|profile|objective|about)/i, 'summary'],
  [/^(work experience|experience|employment|professional experience|career)/i, 'experience'],
  [/^(education|academic|qualifications)/i, 'education'],
  [/^(skills|technical skills|competencies|expertise)/i, 'skills'],
  [/^(projects|portfolio|selected work)/i, 'projects'],
  [/^(certificates|certifications|licenses|courses)/i, 'certificates'],
  [/^(languages)/i, 'languages'],
  [/^(awards|honors|achievements)/i, 'awards'],
  [/^(publications|papers|research)/i, 'publications']
];

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function toMonth(tok) {
  // Accepts "Mar 2021", "2021-03", "03/2021", "2021".
  let m = tok.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = tok.match(/^([a-z]{3,})\w*\s+(\d{4})$/i);
  if (m) { const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; if (mo) return `${m[2]}-${mo}`; }
  m = tok.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = tok.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01`;
  return '';
}

export function importJson(text) {
  const data = JSON.parse(text);
  // Native export? It has schema + profile.
  if (data.schema && data.profile) return data;
  // JSON Resume standard.
  if (data.basics) return fromJsonResume(data);
  throw new Error('Unrecognised JSON — expected a Resumine export or JSON Resume.');
}

function fromJsonResume(r) {
  const doc = emptyDoc();
  const b = r.basics || {};
  doc.profile.name = b.name || '';
  doc.profile.headline = b.label || '';
  doc.profile.email = b.email || '';
  doc.profile.phone = b.phone || '';
  doc.profile.location = [b.location?.city, b.location?.countryCode].filter(Boolean).join(', ');
  doc.profile.links = (b.profiles || []).map(p => ({ id: uid(), label: p.network || '', url: p.url || '' }));
  if (b.url) doc.profile.links.unshift({ id: uid(), label: 'Web', url: b.url });
  doc.sections.summary.text = b.summary || '';
  doc.sections.experience.entries = (r.work || []).map(w => ({
    id: uid(), role: w.position || '', company: w.name || w.company || '', location: w.location || '',
    start: (w.startDate || '').slice(0, 7), end: (w.endDate || '').slice(0, 7), current: !w.endDate,
    bullets: w.highlights || []
  }));
  doc.sections.education.entries = (r.education || []).map(e => ({
    id: uid(), qualification: `${e.studyType || ''} ${e.area || ''}`.trim(), institution: e.institution || '',
    field: e.area || '', start: (e.startDate || '').slice(0, 7), end: (e.endDate || '').slice(0, 7),
    grade: e.score || '', notes: e.courses || []
  }));
  doc.sections.skills.groups = (r.skills || []).map(s => ({ id: uid(), name: s.name || '', items: (s.keywords || []).join(', ') }));
  doc.sections.projects.entries = (r.projects || []).map(p => ({
    id: uid(), name: p.name || '', role: '', link: p.url || '', stack: (p.keywords || []).join(', '), bullets: p.highlights || (p.description ? [p.description] : [])
  }));
  doc.sections.certificates.entries = (r.certificates || []).map(c => ({
    id: uid(), name: c.name || '', issuer: c.issuer || '', date: (c.date || '').slice(0, 7), id: '', link: c.url || ''
  }));
  doc.sections.languages.entries = (r.languages || []).map(l => ({ id: uid(), name: l.language || '', level: l.fluency || '' }));
  doc.sections.awards.entries = (r.awards || []).map(a => ({ id: uid(), name: a.title || '', issuer: a.awarder || '', date: (a.date || '').slice(0, 7), note: a.summary || '' }));
  doc.sections.publications.entries = (r.publications || []).map(p => ({
    id: uid(), authors: '', title: p.name || '', venue: p.publisher || '', year: (p.releaseDate || '').slice(0, 4), doi: p.website || ''
  }));
  return doc;
}

/**
 * Heuristic section guesser for extracted plain text (PDF or DOCX).
 * Lines become bullets unless they look like a heading or a title row.
 */
export function importText(text) {
  const doc = emptyDoc();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let section = 'header';
  const buckets = { header: [], experience: [], education: [], skills: [], projects: [], certificates: [], languages: [], awards: [], publications: [], summary: [] };

  for (const line of lines) {
    const hit = HEADING_MAP.find(([re]) => re.test(line) && line.length < 60);
    if (hit) { section = hit[1]; continue; }
    (buckets[section] || buckets.header).push(line);
  }

  // Header: first non-empty line is the name; detect email/phone anywhere.
  doc.profile.name = buckets.header[0] || '';
  doc.profile.headline = buckets.header[1] || '';
  const joined = lines.join('\n');
  const em = joined.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (em) doc.profile.email = em[0];
  const ph = joined.match(/(\+?\d[\d\s()-]{7,}\d)/);
  if (ph) doc.profile.phone = ph[1].trim();
  const links = joined.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|twitter\.com|x\.com)\S*/gi) || [];
  doc.profile.links = [...new Set(links)].map(u => ({ id: uid(), label: u.split('.com')[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'Link', url: u }));

  const DATE_RE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4}|\d{4}[-/.]\d{1,2}|\d{1,2}[-/.]\d{4}|\d{4})\s*[-–—to]+\s*(present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4}|\d{4}[-/.]\d{1,2}|\d{1,2}[-/.]\d{4}|\d{4})/i;

  function guessEntries(list, keys) {
    const entries = [];
    let cur = null;
    for (const line of list) {
      const dm = line.match(DATE_RE);
      const isBullet = /^[•·\-*]/.test(line);
      if (dm && !isBullet) {
        if (cur) entries.push(cur);
        cur = { id: uid(), _title: line.slice(0, dm.index).replace(/[,|–—-]\s*$/, '').trim(),
          _dates: dm[0], bullets: [] };
      } else if (cur) {
        if (isBullet || line.length < 160) cur.bullets.push(line.replace(/^[•·\-*]\s*/, ''));
      } else {
        entries.push({ id: uid(), _title: line, _dates: '', bullets: [] });
      }
    }
    if (cur) entries.push(cur);
    return entries.map(({ _title, _dates, bullets, id }) => ({ id, _title, _dates, bullets }));
  }

  function fill(entries, map) {
    return entries.map(e => {
      const [s, en] = (e._dates || '').split(/\s*[-–—]+\s*/);
      const entry = { id: e.id, bullets: e.bullets };
      const titleBits = e._title.split(/\s*[|·@]\s*|\s+at\s+|\s*,\s*/).filter(Boolean);
      map(entry, titleBits, toMonth(s || ''), toMonth(en || ''));
      entry.current = /present|current|now/i.test(e._dates || '');
      return entry;
    });
  }

  doc.sections.experience.entries = fill(guessEntries(buckets.experience), (e, t, s, en) => {
    e.role = t[0] || ''; e.company = t[1] || ''; e.location = t[2] || ''; e.start = s; e.end = en;
  });
  doc.sections.education.entries = fill(guessEntries(buckets.education), (e, t, s, en) => {
    e.qualification = t[0] || ''; e.institution = t[1] || ''; e.field = t[2] || ''; e.start = s; e.end = en; e.grade = ''; e.notes = e.bullets; delete e.bullets;
  });
  doc.sections.projects.entries = fill(guessEntries(buckets.projects), (e, t) => {
    e.name = t[0] || ''; e.role = t[1] || ''; e.link = ''; e.stack = t[2] || '';
  });
  doc.sections.certificates.entries = fill(guessEntries(buckets.certificates), (e, t, s) => {
    e.name = t[0] || ''; e.issuer = t[1] || ''; e.date = s; e.id = ''; e.link = ''; delete e.bullets;
  });
  doc.sections.awards.entries = fill(guessEntries(buckets.awards), (e, t, s) => {
    e.name = t[0] || ''; e.issuer = t[1] || ''; e.date = s; e.note = ''; delete e.bullets;
  });
  doc.sections.publications.entries = fill(guessEntries(buckets.publications), (e, t) => {
    e.title = t[0] || ''; e.authors = ''; e.venue = t[1] || ''; e.year = (t[2] || '').slice(0, 4); e.doi = ''; delete e.bullets;
  });

  doc.sections.skills.groups = buckets.skills.length
    ? buckets.skills.map(l => {
        const [name, rest] = l.includes(':') ? l.split(/:(.*)/) : ['', l];
        return { id: uid(), name: (name || '').trim(), items: (rest ?? l).trim() };
      }).filter(g => g.items)
    : [];
  doc.sections.languages.entries = buckets.languages.map(l => {
    const [name, level] = l.split(/[-–:,(]/).map(s => s.trim());
    return { id: uid(), name: name || '', level: level || '' };
  }).filter(e => e.name);
  doc.sections.summary.text = buckets.summary.join(' ');

  // If the header bucket has more than name+headline, fold leftovers into summary.
  if (buckets.header.length > 2) {
    doc.sections.summary.text = [doc.sections.summary.text, ...buckets.header.slice(2)].filter(Boolean).join(' ');
  }
  return doc;
}

// Text extraction happens in the main process (import:pdfText): a bundled
// pdf.js worker would be blocked by CSP + the opaque file:// origin in the
// packaged renderer. Dev would pass, production would fail.
export async function importPdfBase64(b64) {
  const text = await window.api.imports.pdfText({ base64: b64 });
  return importText(text);
}

export async function importDocxBase64(b64) {
  const mammoth = await import('mammoth');
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const { value } = await mammoth.extractRawText({ arrayBuffer: bin.buffer });
  return importText(value);
}

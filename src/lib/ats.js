import { SECTION_DEFS } from './model.js';
import { textFor } from './exportText.js';

const STOP = new Set('a an the and or of to in for on with at by from as is are was were be been it its this that you your we our they their i he she his her'.split(' '));

const RECOGNISED_HEADINGS = [
  'summary', 'professional summary', 'objective',
  'work experience', 'experience', 'employment history',
  'education', 'skills', 'technical skills',
  'projects', 'certifications', 'certificates',
  'languages', 'awards', 'publications', 'volunteering', 'references'
];

const ACTION_VERBS = /^(led|built|launched|improved|reduced|increased|shipped|designed|developed|created|managed|delivered|grew|cut|drove|won|ran|introduced|migrated|automated|negotiated|spearheaded|architected|implemented|optimi[sz]ed|scaled|mentored|owned|authored|trained|coordinated|established|generated|streamlined|transformed|accelerated|engineered|programmed|analy[sz]ed)/i;
const WEAK_OPENERS = /^(responsible for|worked on|helped with|assisted with|involved in|duties included|tasked with)/i;

function allBullets(doc, version) {
  const hidden = new Set(version.hidden || []);
  const out = [];
  for (const [sid, sec] of Object.entries(doc.sections)) {
    if (!sec?.entries || hidden.has(sid)) continue;
    for (const e of sec.entries) {
      for (const b of e.bullets || e.notes || []) {
        if (b.trim()) out.push(b.trim());
      }
    }
  }
  return out;
}

/**
 * Rule-based ATS checklist. Every finding names what's wrong and how to fix
 * it — this is a linter, not a score oracle, and it's labelled that way.
 */
export function atsFindings(doc, version) {
  const f = [];
  const p = doc.profile;
  const hidden = new Set(version.hidden || []);
  const ok = (id, label, pass, fix) => f.push({ id, label, pass, fix: pass ? '' : fix });

  ok('contact-email', 'Contact: email present',
    /.+@.+\..+/.test(p.email || ''),
    'Add a machine-readable email address in Profile.');
  ok('contact-phone', 'Contact: phone present',
    /[\d+][\d\s()-]{5,}/.test(p.phone || ''),
    'Add a phone number in Profile — recruiters filter on it.');
  ok('name', 'Name set',
    (p.name || '').trim().length > 1,
    'Set your full name in Profile.');

  const summary = version.overrides?.['summary:text'] ?? doc.sections.summary?.text;
  ok('summary', 'Summary section present',
    !hidden.has('summary') && (summary || '').trim().length > 20,
    'Write 2–3 lines summarising role, years and one measurable result.');

  ok('experience', 'Work Experience section present',
    !hidden.has('experience') && (doc.sections.experience?.entries || []).length > 0,
    'Add at least one role under Work Experience — ATS ranking weights it heavily.');

  ok('skills', 'Skills section present',
    !hidden.has('skills') && (doc.sections.skills?.groups || []).some(g => (g.items || '').trim()),
    'Add a Skills section — it is the primary keyword source ATS systems index.');

  // Unrecognised custom headings: ATS parsers bucket by known names.
  const badTitles = SECTION_DEFS.filter(d => !hidden.has(d.id))
    .map(d => (version.overrides?.[`${d.id}:title`] || d.label).trim().toLowerCase())
    .filter(t => !RECOGNISED_HEADINGS.includes(t));
  ok('headings', 'Recognised section headings',
    badTitles.length === 0,
    `Rename to a standard heading (e.g. “Work Experience”, “Skills”) — “${badTitles[0]}” may not be indexed.`);

  // Date format consistency: prefer YYYY-MM everywhere.
  const badDates = [];
  for (const sec of Object.values(doc.sections)) {
    for (const e of sec.entries || []) {
      for (const k of ['start', 'end', 'date']) {
        const v = e[k];
        if (v && !/^\d{4}-\d{2}$/.test(v) && !e.current) badDates.push(v);
      }
    }
  }
  ok('dates', 'Dates parseable (YYYY-MM)',
    badDates.length === 0,
    `Use month-year for all dates — “${badDates[0]}” may not parse.`);

  const bullets = allBullets(doc, version);
  const weak = bullets.filter(b => WEAK_OPENERS.test(b) || !ACTION_VERBS.test(b));
  const noNumbers = bullets.filter(b => !/\d/.test(b));
  ok('verbs', 'Bullets start with action verbs',
    bullets.length === 0 || weak.length / bullets.length < 0.5,
    `${weak.length} bullet(s) start weak — lead with a verb: Led, Built, Reduced, Shipped.`);
  ok('numbers', 'Bullets quantify results',
    bullets.length === 0 || noNumbers.length / bullets.length < 0.6,
    `${noNumbers.length} bullet(s) have no number — add %, count, time or money (e.g. “cut load time 40%”).`);

  ok('links-text', 'Links as plain text, not hidden',
    (p.links || []).every(l => (l.url || '').trim()),
    'Fill in link URLs — ATS reads the text, not the click target.');

  return f;
}

export function atsScore(findings) {
  if (!findings.length) return 0;
  return Math.round(100 * findings.filter(f => f.pass).length / findings.length);
}

/**
 * Keyword coverage of a pasted job description vs the rendered CV text.
 * Terms = content words of length ≥3 plus 2-word phrases for capitalised/
 * hyphenated compounds. Returns matched and missing, ranked by JD frequency.
 */
export function keywordMatch(doc, version, jdText) {
  const cvText = textFor(doc, version).toLowerCase();
  const words = (jdText.toLowerCase().match(/[a-z][a-z+#./-]{2,}/g) || []);
  const freq = new Map();
  for (const w of words) {
    const t = w.replace(/^[./-]+|[./-]+$/g, '');
    if (t.length < 3 || STOP.has(t)) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  // Keep terms appearing more than once, plus tech-looking tokens.
  const terms = [...freq.entries()]
    .filter(([t, n]) => n > 1 || /[#+.]|js$|sql|api|css|aws|ci\/cd/i.test(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([t]) => t);

  const missing = terms.filter(t => !cvText.includes(t));
  const matched = terms.filter(t => cvText.includes(t));
  return { matched, missing, total: terms.length };
}

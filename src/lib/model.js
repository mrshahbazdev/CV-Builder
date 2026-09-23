export const SECTION_DEFS = [
  { id: 'summary',      label: 'Summary',      kind: 'text' },
  { id: 'experience',   label: 'Work Experience', kind: 'entries' },
  { id: 'education',    label: 'Education',    kind: 'entries' },
  { id: 'skills',       label: 'Skills',       kind: 'groups' },
  { id: 'projects',     label: 'Projects',     kind: 'entries' },
  { id: 'certificates', label: 'Certificates', kind: 'entries' },
  { id: 'languages',    label: 'Languages',    kind: 'entries' },
  { id: 'awards',       label: 'Awards',       kind: 'entries' },
  { id: 'publications', label: 'Publications', kind: 'entries' },
  { id: 'custom',       label: 'Custom Sections', kind: 'custom' }
];

export const FIELD_DEFS = {
  experience: [
    { key: 'role', label: 'Job title' },
    { key: 'company', label: 'Company' },
    { key: 'location', label: 'Location' },
    { key: 'start', label: 'Start', type: 'month' },
    { key: 'end', label: 'End', type: 'month' },
    { key: 'current', label: 'I currently work here', type: 'checkbox' },
    { key: 'bullets', label: 'Achievements', type: 'bullets' }
  ],
  education: [
    { key: 'qualification', label: 'Qualification' },
    { key: 'institution', label: 'Institution' },
    { key: 'field', label: 'Field of study' },
    { key: 'start', label: 'Start', type: 'month' },
    { key: 'end', label: 'End', type: 'month' },
    { key: 'grade', label: 'Grade' },
    { key: 'notes', label: 'Notes', type: 'bullets' }
  ],
  projects: [
    { key: 'name', label: 'Project name' },
    { key: 'role', label: 'Your role' },
    { key: 'link', label: 'Link' },
    { key: 'stack', label: 'Stack / tools' },
    { key: 'bullets', label: 'Highlights', type: 'bullets' }
  ],
  certificates: [
    { key: 'name', label: 'Certificate' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'date', label: 'Date', type: 'month' },
    { key: 'id', label: 'Credential ID' },
    { key: 'link', label: 'Link' }
  ],
  languages: [
    { key: 'name', label: 'Language' },
    { key: 'level', label: 'Level' }
  ],
  awards: [
    { key: 'name', label: 'Award' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'date', label: 'Date', type: 'month' },
    { key: 'note', label: 'Note' }
  ],
  publications: [
    { key: 'authors', label: 'Authors' },
    { key: 'title', label: 'Title' },
    { key: 'venue', label: 'Venue / journal' },
    { key: 'year', label: 'Year' },
    { key: 'doi', label: 'DOI / link' }
  ]
};

export const DEFAULT_ORDER = [
  'summary', 'experience', 'education', 'skills',
  'projects', 'certificates', 'languages', 'awards', 'publications'
];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyEntry(sectionId) {
  const entry = { id: uid() };
  for (const f of FIELD_DEFS[sectionId] || []) {
    entry[f.key] = f.type === 'bullets' ? [] : f.type === 'checkbox' ? false : '';
  }
  return entry;
}

export function emptyDoc() {
  return {
    schema: 1,
    profile: {
      name: '', headline: '', email: '', phone: '', location: '',
      links: [], photo: ''
    },
    sections: {
      summary: { text: '' },
      experience: { entries: [] },
      education: { entries: [] },
      skills: { groups: [] },
      projects: { entries: [] },
      certificates: { entries: [] },
      languages: { entries: [] },
      awards: { entries: [] },
      publications: { entries: [] },
      custom: { sections: [] }
    },
    versions: [{ id: uid(), name: 'Master', order: [...DEFAULT_ORDER], hidden: [], overrides: {}, jobDescription: '', lastAtsScore: null }],
    design: { template: 'classic', density: 0, accent: '#1f4e79' }
  };
}

export function activeVersion(doc) {
  return doc.versions[0] || { id: 'master', name: 'Master', order: DEFAULT_ORDER, hidden: [], overrides: {} };
}

export function addVersion(doc, name) {
  const v = { id: uid(), name, order: [...DEFAULT_ORDER], hidden: [], overrides: {}, jobDescription: '', lastAtsScore: null };
  doc.versions.push(v);
  return v;
}

export function sampleDoc() {
  const doc = emptyDoc();
  doc.profile = {
    name: 'Alex Rahman', headline: 'Senior Frontend Engineer',
    email: 'alex@example.com', phone: '+92 300 1234567', location: 'Lahore, Pakistan',
    links: [{ id: uid(), label: 'GitHub', url: 'github.com/alexrahman' },
            { id: uid(), label: 'LinkedIn', url: 'linkedin.com/in/alexrahman' }],
    photo: ''
  };
  doc.sections.summary = { text: 'Frontend engineer with 8 years building data-heavy web applications. Led migration of a 200k-user dashboard to React, cutting load times by 60%.' };
  doc.sections.experience = { entries: [
    { id: uid(), role: 'Senior Frontend Engineer', company: 'Systems Ltd', location: 'Lahore',
      start: '2021-03', end: '', current: true,
      bullets: ['Led a team of 4 rebuilding the analytics dashboard, improving LCP by 60%',
                'Introduced component library adopted across 5 products',
                'Cut bundle size 45% via code-splitting and lazy loading'] },
    { id: uid(), role: 'Frontend Developer', company: 'WebWorks', location: 'Karachi',
      start: '2017-06', end: '2021-02', current: false,
      bullets: ['Shipped 12 client projects on React and Vue',
                'Built A/B testing harness used in 30+ experiments'] }
  ]};
  doc.sections.education = { entries: [
    { id: uid(), qualification: 'BSc Computer Science', institution: 'LUMS', field: 'Computer Science',
      start: '2013-08', end: '2017-05', grade: '', notes: [] }
  ]};
  doc.sections.skills = { groups: [
    { id: uid(), name: 'Languages', items: 'JavaScript, TypeScript, Python' },
    { id: uid(), name: 'Frameworks', items: 'React, Vue, Node.js' }
  ]};
  return doc;
}

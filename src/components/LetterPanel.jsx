import React from 'react';

/**
 * Cover letter: shares the CV's template, header and typography so the pair
 * looks like a set. Pulls name/contact from the profile and a line from the
 * summary if the body is empty.
 */
export default function LetterPanel({ doc, update }) {
  const l = doc.letter || { recipient: '', company: '', role: '', body: '' };
  const set = (k, v) => update(d => { d.letter = d.letter || {}; d.letter[k] = v; });
  return (
    <div>
      <h2>Cover letter</h2>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>
        Uses the same template and header as your CV — they export as a matching pair.
      </p>
      <div className="field"><label>Recipient (name or “Hiring team”)</label>
        <input type="text" value={l.recipient} onChange={e => set('recipient', e.target.value)} /></div>
      <div className="field"><label>Company</label>
        <input type="text" value={l.company} onChange={e => set('company', e.target.value)} /></div>
      <div className="field"><label>Role you are applying for</label>
        <input type="text" value={l.role} onChange={e => set('role', e.target.value)} /></div>
      <div className="field"><label>Body</label>
        <textarea rows={14} value={l.body} onChange={e => set('body', e.target.value)}
          placeholder={'Dear Hiring Team,\n\n...\n\nBest regards,'} /></div>
      {!l.body.trim() && doc.sections.summary.text &&
        <button className="small" onClick={() => set('body',
          `Dear ${l.recipient || 'Hiring Team'},\n\nI am applying for the ${l.role || 'role'} at ${l.company || 'your company'}. ${doc.sections.summary.text}\n\nI would welcome the chance to discuss how my experience maps to what you need.\n\nBest regards,\n${doc.profile.name || ''}`
        )}>Draft from my summary</button>}
    </div>
  );
}

export function letterBlocksHtml(doc, design) {
  const l = doc.letter || {};
  const p = doc.profile;
  const contact = [p.email, p.phone, p.location, ...(p.links || []).map(x => x.url)].filter(Boolean).join(' · ');
  return `
    <div class="chead">
      <h1 class="name" style="font-size:18pt">${esc(p.name) || 'Your Name'}</h1>
      ${p.headline ? `<div class="headline">${esc(p.headline)}</div>` : ''}
      ${contact ? `<div class="contact"><span>${esc(contact)}</span></div>` : ''}
    </div>
    <div style="margin-top:8mm">
      ${l.company ? `<div style="margin-bottom:1mm"><b>${esc(l.company)}</b></div>` : ''}
      ${l.recipient ? `<div style="margin-bottom:6mm">${esc(l.recipient)}</div>` : ''}
      ${l.role ? `<div style="margin-bottom:4mm"><b>Re: ${esc(l.role)}</b></div>` : ''}
      <div class="summary" style="white-space:pre-wrap">${esc(l.body)}</div>
    </div>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

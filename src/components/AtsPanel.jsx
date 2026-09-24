import React, { useMemo } from 'react';
import { atsFindings, atsScore, keywordMatch } from '../lib/ats.js';

/**
 * A rule-based checklist, described honestly as one — not an "AI score".
 * Every finding says what is wrong and how to fix it.
 */
export default function AtsPanel({ doc, version, updateVersion }) {
  const findings = useMemo(() => atsFindings(doc, version), [doc, version]);
  const score = atsScore(findings);
  const jd = version.jobDescription || '';
  const match = useMemo(
    () => (jd.trim() ? keywordMatch(doc, version, jd) : null),
    [doc, version, jd]
  );

  const coverage = match && match.total ? Math.round(100 * match.matched.length / match.total) : null;

  return (
    <div>
      <h2>ATS check — “{version.name}”</h2>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>
        A rule-based checklist of how applicant tracking systems parse a CV.
        Every item says what to fix — it is a linter, not a magic score.
      </p>
      <div className="ver-row" style={{ marginBottom: 12 }}>
        <b>Checklist: {score}% passing</b>
      </div>
      {findings.map(f => (
        <div key={f.id} className="ver-row" style={{ alignItems: 'flex-start' }}>
          <span style={{ width: 16, textAlign: 'center', color: f.pass ? '#047857' : '#b45309' }}>{f.pass ? '✓' : '!'}</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontWeight: 600 }}>{f.label}</b>
            {!f.pass && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{f.fix}</div>}
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 18 }}>Job description match</h2>
      <div className="field">
        <label>Paste the job posting — see which of its terms your CV lacks.</label>
        <textarea rows={8} value={jd}
          onChange={e => updateVersion(v => { v.jobDescription = e.target.value; })} />
      </div>
      {match && (
        <div>
          <div className="ver-row"><b>Keyword coverage: {coverage}%</b><span style={{ color: 'var(--muted)', fontSize: 11 }}>{match.matched.length}/{match.total} terms</span></div>
          {match.missing.length > 0 && (
            <div className="entry-card" style={{ marginTop: 8 }}>
              <b>Missing from this version:</b>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {match.missing.map(t => <span key={t} style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{t}</span>)}
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                Only add terms that are true — ATS keyword-stuffing is screened by humans later.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

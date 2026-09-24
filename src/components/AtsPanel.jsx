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
      <p className="help">
        A rule-based checklist of how applicant tracking systems parse a CV.
        Every item says what to fix — it is a linter, not a magic score.
      </p>
      <div className={`ats-score ${score >= 80 ? 'good' : 'bad'}`}>
        <span className="num">{score}%</span>
        <div>
          <b>checks passing</b>
          <div className="fix">Fix the items marked ! below.</div>
        </div>
      </div>
      {findings.map(f => (
        <div key={f.id} className={`ats-row ${f.pass ? 'pass' : 'fail'}`}>
          <span className="tick" aria-hidden="true">{f.pass ? '✓' : '!'}</span>
          <div>
            <b>{f.label}</b>
            {!f.pass && <span className="fix">{f.fix}</span>}
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
          <div className={`ats-score ${coverage >= 60 ? 'good' : 'bad'}`}>
            <span className="num">{coverage}%</span>
            <div>
              <b>keyword coverage</b>
              <div className="fix">{match.matched.length}/{match.total} terms found in this version</div>
            </div>
          </div>
          {match.missing.length > 0 && (
            <div className="entry-card" style={{ marginTop: 8 }}>
              <b>Missing from this version:</b>
              <div className="chips">
                {match.missing.map(t => <span key={t} className="chip miss">{t}</span>)}
              </div>
              <p className="help" style={{ margin: '8px 0 0' }}>
                Only add terms that are true — ATS keyword-stuffing is screened by humans later.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { addVersion, uid, SECTION_DEFS } from '../lib/model.js';

/**
 * Versions share the master's data — a version is a name plus a set of
 * visibility flags, section order and per-section overrides. Editing the
 * master edits every version at once.
 */
export default function VersionsPanel({ doc, version, versionId, setVersionId, update, updateVersion }) {
  const [name, setName] = useState('');
  const [history, setHistory] = useState(null);

  return (
    <div>
      <h2>Versions</h2>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>
        One master CV, many tailored versions. Hide sections, rename headings and
        swap the summary per version — fix a typo once and it fixes everywhere.
      </p>
      {doc.versions.map(v => (
        <div key={v.id} className={`ver-row ${v.id === versionId ? 'on' : ''}`}>
          <b>{v.name}</b>
          <button className="small" onClick={() => setVersionId(v.id)}>Edit</button>
          {doc.versions.length > 1 &&
            <button className="small danger" onClick={() => {
              update(d => { d.versions = d.versions.filter(x => x.id !== v.id); });
              if (v.id === versionId) setVersionId(doc.versions[0].id);
            }}>✕</button>}
        </div>
      ))}
      <div className="field" style={{ marginTop: 10 }}>
        <div className="row">
          <input type="text" value={name} placeholder="e.g. Frontend — Systems Ltd" onChange={e => setName(e.target.value)} />
          <button className="small" disabled={!name.trim()} onClick={() => {
            update(d => addVersion(d, name.trim()));
            setName('');
          }}>+ New version</button>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>Section order & visibility — “{version.name}”</h2>
      {(version.order || []).map((sid, i) => {
        const def = SECTION_DEFS.find(d => d.id === sid);
        if (!def) return null;
        const hidden = (version.hidden || []).includes(sid);
        return (
          <div key={sid} className="ver-row">
            <b style={{ opacity: hidden ? .45 : 1 }}>{def.label}</b>
            <button className="small" disabled={i === 0} onClick={() => updateVersion(v => { const [x] = v.order.splice(i, 1); v.order.splice(i - 1, 0, x); })}>↑</button>
            <button className="small" disabled={i === version.order.length - 1} onClick={() => updateVersion(v => { const [x] = v.order.splice(i, 1); v.order.splice(i + 1, 0, x); })}>↓</button>
            <button className="small" onClick={() => updateVersion(v => {
              v.hidden = hidden ? v.hidden.filter(x => x !== sid) : [...(v.hidden || []), sid];
            })}>{hidden ? 'Show' : 'Hide'}</button>
          </div>
        );
      })}

      <h2 style={{ marginTop: 18 }}>History</h2>
      <button className="small" onClick={async () => setHistory(await window.api.store.history())}>View snapshots</button>
      {history && (
        <div style={{ marginTop: 8 }}>
          {history.length === 0 && <p style={{ color: 'var(--muted)' }}>No snapshots yet.</p>}
          {history.slice(0, 20).map(h => (
            <div key={h.id} className="ver-row">
              <b>{new Date(h.at).toLocaleString()}</b>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>{h.label}</span>
              <button className="small" onClick={async () => {
                const { doc: d } = await window.api.store.restore(h.id);
                if (d) update(dd => { Object.assign(dd, d); });
              }}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

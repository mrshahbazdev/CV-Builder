import React from 'react';
import { SECTION_DEFS, FIELD_DEFS, emptyEntry, uid } from '../lib/model.js';

const ACTION_VERBS = /^(led|built|launched|improved|reduced|increased|shipped|designed|developed|created|managed|delivered|grew|cut|drove|won|ran|introduced|migrated|automated|negotiated|spearheaded|architected|implemented|optimi[sz]ed)/i;
const WEAK_OPENERS = /^(responsible for|worked on|helped with|assisted with|involved in|duties included|tasked with)/i;

export default function Editor({ doc, version, pane, update, updateVersion }) {
  if (pane === 'profile') return <Profile doc={doc} update={update} />;

  const def = SECTION_DEFS.find(d => d.id === pane);
  if (!def) return null;

  const hidden = new Set(version.hidden || []);
  const isHidden = hidden.has(pane);
  const titleKey = `${pane}:title`;
  const title = version.overrides?.[titleKey] ?? def.label;

  return (
    <div>
      <h2>{def.label}</h2>
      <div className="field">
        <label>Section heading on the CV</label>
        <input type="text" value={title}
          onChange={e => updateVersion(v => { v.overrides = v.overrides || {}; v.overrides[titleKey] = e.target.value; })} />
      </div>
      <div className="field">
        <label><input type="checkbox" checked={isHidden}
          onChange={e => updateVersion(v => {
            v.hidden = v.hidden || [];
            v.hidden = e.target.checked ? [...v.hidden, pane] : v.hidden.filter(x => x !== pane);
          })} /> Hide in this version</label>
      </div>

      {def.kind === 'text' && <SummaryEditor doc={doc} version={version} update={update} updateVersion={updateVersion} />}
      {def.kind === 'entries' && <EntriesEditor doc={doc} sectionId={pane} update={update} />}
      {def.kind === 'groups' && <SkillsEditor doc={doc} update={update} />}
      {def.kind === 'custom' && <CustomEditor doc={doc} version={version} update={update} updateVersion={updateVersion} />}
    </div>
  );
}

function Profile({ doc, update }) {
  const p = doc.profile;
  const set = (k, v) => update(d => { d.profile[k] = v; });
  return (
    <div>
      <h2>Profile</h2>
      <div className="field"><label>Full name</label><input type="text" value={p.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="field"><label>Headline</label><input type="text" value={p.headline} onChange={e => set('headline', e.target.value)} placeholder="Senior Frontend Engineer" /></div>
      <div className="field"><label>Email</label><input type="text" value={p.email} onChange={e => set('email', e.target.value)} /></div>
      <div className="field"><label>Phone</label><input type="text" value={p.phone} onChange={e => set('phone', e.target.value)} /></div>
      <div className="field"><label>Location</label><input type="text" value={p.location} onChange={e => set('location', e.target.value)} /></div>
      <h2>Links</h2>
      {(p.links || []).map(l => (
        <div className="field" key={l.id}>
          <div className="row">
            <input type="text" value={l.label} placeholder="Label" onChange={e => update(d => { d.profile.links.find(x => x.id === l.id).label = e.target.value; })} />
            <input type="text" value={l.url} placeholder="URL" onChange={e => update(d => { d.profile.links.find(x => x.id === l.id).url = e.target.value; })} />
            <button className="small danger" onClick={() => update(d => { d.profile.links = d.profile.links.filter(x => x.id !== l.id); })}>✕</button>
          </div>
        </div>
      ))}
      <button className="small" onClick={() => update(d => { d.profile.links.push({ id: uid(), label: '', url: '' }); })}>+ Add link</button>
      <h2 style={{ marginTop: 16 }}>Photo</h2>
      <button className="small" onClick={async () => {
        const f = await window.api.app.openFile({ filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
        if (f?.dataUrl) set('photo', f.dataUrl);
      }}>Choose photo…</button>
      {p.photo && <button className="small danger" style={{ marginLeft: 6 }} onClick={() => set('photo', '')}>Remove</button>}
    </div>
  );
}

function SummaryEditor({ doc, version, update, updateVersion }) {
  const ov = version.overrides || {};
  const val = ov['summary:text'] ?? doc.sections.summary.text;
  return (
    <div className="field">
      <label>Summary {ov['summary:text'] !== undefined ? '(overridden in this version)' : ''}</label>
      <textarea rows={6} value={val}
        onChange={e => updateVersion(v => { v.overrides = v.overrides || {}; v.overrides['summary:text'] = e.target.value; })} />
      {ov['summary:text'] !== undefined &&
        <button className="small" onClick={() => updateVersion(v => { delete v.overrides['summary:text']; })}>Reset to master</button>}
    </div>
  );
}

function EntriesEditor({ doc, sectionId, update }) {
  const entries = doc.sections[sectionId].entries;
  const fields = FIELD_DEFS[sectionId] || [];
  return (
    <div>
      {entries.map((e, i) => (
        <div className="entry-card" key={e.id}>
          <div className="card-head">
            <b>{e.role || e.title || e.name || e.qualification || `Entry ${i + 1}`}</b>
            <span>
              <button className="small" disabled={i === 0} onClick={() => move(entries, i, -1, update, sectionId)}>↑</button>
              <button className="small" disabled={i === entries.length - 1} onClick={() => move(entries, i, 1, update, sectionId)}>↓</button>
              <button className="small danger" onClick={() => update(d => { d.sections[sectionId].entries = d.sections[sectionId].entries.filter(x => x.id !== e.id); })}>✕</button>
            </span>
          </div>
          {fields.map(f => (
            <Field key={f.key} f={f} entry={e} onChange={(k, v) => update(d => {
              const ent = d.sections[sectionId].entries.find(x => x.id === e.id);
              ent[k] = v;
            })} />
          ))}
        </div>
      ))}
      <button className="small" onClick={() => update(d => { d.sections[sectionId].entries.push(emptyEntry(sectionId)); })}>+ Add entry</button>
    </div>
  );
}

function move(entries, i, dir, update, sectionId) {
  update(d => {
    const arr = d.sections[sectionId].entries;
    const [x] = arr.splice(i, 1);
    arr.splice(i + dir, 0, x);
  });
}

function Field({ f, entry, onChange }) {
  if (f.type === 'checkbox') {
    return <div className="field"><label><input type="checkbox" checked={!!entry[f.key]} onChange={e => onChange(f.key, e.target.checked)} /> {f.label}</label></div>;
  }
  if (f.type === 'bullets') {
    const bullets = entry[f.key] || [];
    return (
      <div className="field">
        <label>{f.label}</label>
        {bullets.map((b, i) => (
          <div key={i}>
            <div className="bullet-row">
              <input type="text" value={b} onChange={e => { const nb = [...bullets]; nb[i] = e.target.value; onChange(f.key, nb); }} />
              <button className="small danger" onClick={() => onChange(f.key, bullets.filter((_, j) => j !== i))}>✕</button>
            </div>
            {b.trim() && WEAK_OPENERS.test(b.trim()) &&
              <div className="hint">Starts with a weak opener — try an action verb (“Led”, “Shipped”, “Reduced”).</div>}
            {b.trim() && !WEAK_OPENERS.test(b.trim()) && !ACTION_VERBS.test(b.trim()) && !/\d/.test(b) &&
              <div className="hint">Bullets read stronger with an action verb and a number.</div>}
          </div>
        ))}
        <button className="small" onClick={() => onChange(f.key, [...bullets, ''])}>+ Bullet</button>
      </div>
    );
  }
  return (
    <div className="field">
      <label>{f.label}</label>
      <input type={f.type === 'month' ? 'month' : 'text'} value={entry[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} />
    </div>
  );
}

function SkillsEditor({ doc, update }) {
  const groups = doc.sections.skills.groups;
  return (
    <div>
      {groups.map((g, i) => (
        <div className="entry-card" key={g.id}>
          <div className="card-head"><b>{g.name || `Group ${i + 1}`}</b>
            <button className="small danger" onClick={() => update(d => { d.sections.skills.groups = d.sections.skills.groups.filter(x => x.id !== g.id); })}>✕</button>
          </div>
          <div className="field"><label>Group name</label><input type="text" value={g.name} onChange={e => update(d => { d.sections.skills.groups.find(x => x.id === g.id).name = e.target.value; })} /></div>
          <div className="field"><label>Skills (comma-separated)</label><input type="text" value={g.items} onChange={e => update(d => { d.sections.skills.groups.find(x => x.id === g.id).items = e.target.value; })} /></div>
        </div>
      ))}
      <button className="small" onClick={() => update(d => { d.sections.skills.groups.push({ id: uid(), name: '', items: '' }); })}>+ Add group</button>
    </div>
  );
}

function CustomEditor({ doc, version, update, updateVersion }) {
  const sections = doc.sections.custom.sections;
  const hidden = new Set(version.hidden || []);
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>Anything that does not fit elsewhere — volunteering, patents, military service.</p>
      {sections.map(cs => (
        <div className="entry-card" key={cs.id}>
          <div className="card-head"><b>{cs.title || 'Untitled section'}</b>
            <span>
              <label style={{ fontSize: 11, marginRight: 6 }}>
                <input type="checkbox" checked={hidden.has(`custom:${cs.id}`)}
                  onChange={e => updateVersion(v => {
                    v.hidden = e.target.checked ? [...v.hidden, `custom:${cs.id}`] : v.hidden.filter(x => x !== `custom:${cs.id}`);
                  })} /> hide
              </label>
              <button className="small danger" onClick={() => update(d => { d.sections.custom.sections = d.sections.custom.sections.filter(x => x.id !== cs.id); })}>✕</button>
            </span>
          </div>
          <div className="field"><label>Section title</label><input type="text" value={cs.title} onChange={e => update(d => { d.sections.custom.sections.find(x => x.id === cs.id).title = e.target.value; })} /></div>
          {(cs.entries || []).map(en => (
            <div className="entry-card" key={en.id} style={{ background: '#fff' }}>
              <div className="field"><label>Title</label><input type="text" value={en.title} onChange={e => update(d => { d.sections.custom.sections.find(x => x.id === cs.id).entries.find(x => x.id === en.id).title = e.target.value; })} /></div>
              <div className="field"><label>Dates</label><input type="text" value={en.dates} onChange={e => update(d => { d.sections.custom.sections.find(x => x.id === cs.id).entries.find(x => x.id === en.id).dates = e.target.value; })} /></div>
              <div className="field"><label>Body</label><textarea value={en.body} onChange={e => update(d => { d.sections.custom.sections.find(x => x.id === cs.id).entries.find(x => x.id === en.id).body = e.target.value; })} /></div>
              <button className="small danger" onClick={() => update(d => { const c = d.sections.custom.sections.find(x => x.id === cs.id); c.entries = c.entries.filter(x => x.id !== en.id); })}>Remove entry</button>
            </div>
          ))}
          <button className="small" onClick={() => update(d => { d.sections.custom.sections.find(x => x.id === cs.id).entries.push({ id: uid(), title: '', dates: '', body: '' }); })}>+ Entry</button>
        </div>
      ))}
      <button className="small" onClick={() => update(d => { d.sections.custom.sections.push({ id: uid(), title: '', entries: [] }); })}>+ Custom section</button>
    </div>
  );
}

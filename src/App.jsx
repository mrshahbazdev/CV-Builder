import React, { useEffect, useRef, useState, useCallback } from 'react';
import { emptyDoc, sampleDoc, activeVersion, addVersion, uid, SECTION_DEFS, DEFAULT_ORDER } from './lib/model.js';
import { getTemplate, templateList } from './lib/templates.js';
import { blocksFor, documentHtml } from './lib/cvHtml.js';
import { packPages, packRailPages, measureBlocks } from './lib/paginate.js';
import { textFor } from './lib/exportText.js';
import { docxBlob } from './lib/docxExport.js';
import { importJson, importPdfBase64, importDocxBase64 } from './lib/importer.js';
import Editor from './components/Editor.jsx';
import Preview from './components/Preview.jsx';
import VersionsPanel from './components/VersionsPanel.jsx';
import DesignPanel from './components/DesignPanel.jsx';
import AtsPanel from './components/AtsPanel.jsx';
import LetterPanel, { letterBlocksHtml } from './components/LetterPanel.jsx';

const api = window.api;

export default function App() {
  const [doc, setDoc] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const [pane, setPane] = useState('profile');
  const [saveState, setSaveState] = useState('saved');
  const [firstRun, setFirstRun] = useState(false);
  const saveTimer = useRef(null);
  const snapTimer = useRef(null);

  useEffect(() => {
    api.store.load().then(({ doc: d }) => {
      const doc = d || sampleDoc();
      setDoc(doc);
      setVersionId(doc.versions[0].id);
      setFirstRun(!d);
    });
  }, []);

  // Autosave: every change is persisted after a short quiet period, and a
  // restorable snapshot is taken every few minutes of editing.
  useEffect(() => {
    if (!doc) return;
    setSaveState('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.store.save(doc);
      setSaveState('saved');
    }, 600);
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => api.store.snapshot(doc, 'autosave'), 3 * 60 * 1000);
  }, [doc]);

  const update = useCallback((fn) => {
    setDoc(prev => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const updateVersion = useCallback((fn) => {
    setDoc(prev => {
      const next = structuredClone(prev);
      const v = next.versions.find(v => v.id === versionId);
      if (v) fn(v);
      return next;
    });
  }, [versionId]);

  const exportPdf = useCallback(async () => {
    const tpl = getTemplate(doc.design.template);
    const v = doc.versions.find(v => v.id === versionId) || activeVersion(doc);
    const html = buildExportHtml(doc, v, tpl);
    const name = `${(doc.profile.name || 'cv').replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const res = await api.export.pdf({ html, suggestedName: name });
    if (res.ok) setSaveState('saved');
  }, [doc, versionId]);

  const exportTextFile = useCallback(async () => {
    const v = doc.versions.find(v => v.id === versionId) || activeVersion(doc);
    const text = textFor(doc, v);
    const name = `${(doc.profile.name || 'cv').replace(/\s+/g, '_').toLowerCase()}.txt`;
    await api.export.text({ text, suggestedName: name });
  }, [doc, versionId]);

  const exportDocx = useCallback(async () => {
    const v = doc.versions.find(v => v.id === versionId) || activeVersion(doc);
    const blob = await docxBlob(doc, v);
    const buf = await blob.arrayBuffer();
    const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
    const name = `${(doc.profile.name || 'cv').replace(/\s+/g, '_').toLowerCase()}.docx`;
    await api.export.binary({ base64, suggestedName: name,
      filters: [{ name: 'Word document', extensions: ['docx'] }] });
  }, [doc, versionId]);

  const exportLetterPdf = useCallback(async () => {
    const tpl = getTemplate(doc.design.template);
    const html = documentHtml(tpl, doc.design,
      `<div class="page"><div class="page-inner cv">${letterBlocksHtml(doc, doc.design)}</div></div>`);
    const name = `${(doc.profile.name || 'letter').replace(/\s+/g, '_').toLowerCase()}_letter.pdf`;
    await api.export.pdf({ html, suggestedName: name });
  }, [doc]);

  const importCv = useCallback(async () => {
    const f = await api.app.openFile({ filters: [
      { name: 'CV files', extensions: ['pdf', 'docx', 'json'] }
    ] });
    if (!f) return;
    try {
      let next;
      if (f.name.endsWith('.json')) next = importJson(f.text);
      else if (f.name.endsWith('.pdf')) next = await importPdfBase64(f.base64);
      else if (f.name.endsWith('.docx')) next = await importDocxBase64(f.base64);
      else return;
      if (confirm('Import as a starting draft? This replaces the current CV — a snapshot is saved first.')) {
        await api.store.snapshot(doc, 'before import');
        setDoc(next);
        setVersionId(next.versions[0].id);
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  }, [doc]);

  const exportJson = useCallback(async () => {
    const name = `${(doc.profile.name || 'cv').replace(/\s+/g, '_').toLowerCase()}.json`;
    await api.export.json({ json: JSON.stringify(doc, null, 2), suggestedName: name });
  }, [doc]);

  if (!doc) return null;

  const version = doc.versions.find(v => v.id === versionId) || doc.versions[0];
  const hidden = new Set(version.hidden || []);
  const navGroups = [
    { label: 'CV content', panes: [
      { id: 'profile', label: 'Profile' },
      ...SECTION_DEFS.map(s => ({ id: s.id, label: s.label }))
    ] },
    { label: 'Tailor per job', panes: [
      { id: 'versions', label: 'Versions' },
      { id: 'ats', label: 'ATS check' },
      { id: 'letter', label: 'Cover letter' }
    ] },
    { label: 'Look & send', panes: [
      { id: 'design', label: 'Design' }
    ] }
  ];

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand"><span className="mark">CV</span> Builder</span>
        <select className="verpick" value={versionId} aria-label="CV version"
          onChange={e => setVersionId(e.target.value)}
          title="Tailored version being edited">
          {doc.versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <span className={`status ${saveState === 'saved' ? '' : 'saving'}`}>{saveState === 'saved' ? 'Saved' : 'Saving…'}</span>
        <div className="spacer" />
        <button onClick={importCv} title="Start a draft from an existing CV file">Import…</button>
        <button onClick={exportTextFile}>Plain text</button>
        <button onClick={exportDocx}>DOCX</button>
        <button onClick={exportJson}>JSON</button>
        <button onClick={exportLetterPdf}>Letter PDF</button>
        <button className="primary" onClick={exportPdf}>Export PDF</button>
      </div>
      <div className="workspace">
        <div className="editor">
          <div className="nav" role="tablist" aria-label="Editor sections">
            {navGroups.map(g => (
              <div className="group" key={g.label}>
                <div className="glabel">{g.label}</div>
                {g.panes.map(p => (
                  <button key={p.id} role="tab" aria-selected={pane === p.id}
                    className={`${pane === p.id ? 'on' : ''} ${hidden.has(p.id) ? 'hidden-here' : ''}`}
                    title={hidden.has(p.id) ? 'Hidden in this version' : p.label}
                    onClick={() => setPane(p.id)}>{p.label}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="pane">
            {pane === 'versions'
              ? <VersionsPanel doc={doc} version={version} versionId={versionId}
                  setVersionId={setVersionId} update={update} updateVersion={updateVersion} />
              : pane === 'design'
                ? <DesignPanel doc={doc} update={update} />
              : pane === 'ats'
                ? <AtsPanel doc={doc} version={version} updateVersion={updateVersion} />
              : pane === 'letter'
                ? <LetterPanel doc={doc} update={update} />
                : <Editor doc={doc} version={version} pane={pane} update={update} updateVersion={updateVersion} />}
          </div>
        </div>
        <Preview doc={doc} version={version} design={doc.design} />
      </div>
      {firstRun && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Welcome">
          <div className="welcome">
            <h1>Welcome to CV Builder</h1>
            <p>Offline, private, and the export is always free. Pick a starting point — everything can be changed later.</p>
            <button className="choice" onClick={() => setFirstRun(false)}>
              <b>Start with the sample CV</b>
              <span>A filled-in example to poke at and replace with your own details.</span>
            </button>
            <button className="choice" onClick={() => { const d = emptyDoc(); setDoc(d); setVersionId(d.versions[0].id); setFirstRun(false); }}>
              <b>Start blank</b>
              <span>An empty CV — fill in your profile first, then add sections.</span>
            </button>
            <button className="choice" onClick={() => { setFirstRun(false); importCv(); }}>
              <b>Import an existing CV</b>
              <span>PDF, DOCX or JSON — parsed into a starting draft you can correct.</span>
            </button>
            <div className="foot">Your CV never leaves this computer — no account, no cloud.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export goes through the same block pipeline as the preview: measure the
 * blocks at print width, pack them into pages, emit a fixed-page document.
 */
function buildExportHtml(doc, version, tpl) {
  const blocks = blocksFor(doc, version, doc.design);
  let pagesHtml;
  if (tpl.columns === 'rail') {
    const { pages } = packRailPages(doc, tpl, doc.design, blocks);
    pagesHtml = pages.map(p =>
      `<div class="page"><div class="rail-wrap" style="height:100%"><div class="rail">${p.rail.map(b => b.html).join('')}</div><div class="maincol">${p.main.map(b => b.html).join('')}</div></div></div>`
    ).join('');
  } else {
    const w = 210 - tpl.margin * 2;
    const h = measureBlocks(blocks, tpl, doc.design, w);
    const pages = packPages(blocks, h, tpl);
    pagesHtml = pages.map(p =>
      `<div class="page"><div class="page-inner">${p.map(b => b.html).join('')}</div></div>`
    ).join('');
  }
  return documentHtml(tpl, doc.design, pagesHtml);
}

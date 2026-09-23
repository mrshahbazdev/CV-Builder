import React, { useEffect, useRef, useState, useCallback } from 'react';
import { emptyDoc, sampleDoc, activeVersion, addVersion, uid, SECTION_DEFS, DEFAULT_ORDER } from './lib/model.js';
import { getTemplate, templateList } from './lib/templates.js';
import { blocksFor, documentHtml } from './lib/cvHtml.js';
import { packPages, packRailPages, measureBlocks } from './lib/paginate.js';
import { textFor } from './lib/exportText.js';
import Editor from './components/Editor.jsx';
import Preview from './components/Preview.jsx';
import VersionsPanel from './components/VersionsPanel.jsx';
import DesignPanel from './components/DesignPanel.jsx';

const api = window.api;

export default function App() {
  const [doc, setDoc] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const [pane, setPane] = useState('profile');
  const [saveState, setSaveState] = useState('saved');
  const saveTimer = useRef(null);
  const snapTimer = useRef(null);

  useEffect(() => {
    api.store.load().then(({ doc: d }) => {
      const doc = d || sampleDoc();
      setDoc(doc);
      setVersionId(doc.versions[0].id);
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

  const exportJson = useCallback(async () => {
    const name = `${(doc.profile.name || 'cv').replace(/\s+/g, '_').toLowerCase()}.json`;
    await api.export.json({ json: JSON.stringify(doc, null, 2), suggestedName: name });
  }, [doc]);

  if (!doc) return null;

  const version = doc.versions.find(v => v.id === versionId) || doc.versions[0];
  const panes = [
    { id: 'profile', label: 'Profile' },
    ...SECTION_DEFS.map(s => ({ id: s.id, label: s.label })),
    { id: 'versions', label: 'Versions' },
    { id: 'design', label: 'Design' }
  ];

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">CV Builder</span>
        <span className="status">{saveState === 'saved' ? 'Saved' : 'Saving…'}</span>
        <div className="spacer" />
        <button onClick={exportTextFile}>Plain text</button>
        <button onClick={exportJson}>JSON</button>
        <button className="primary" onClick={exportPdf}>Export PDF</button>
      </div>
      <div className="workspace">
        <div className="editor">
          <div className="nav">
            {panes.map(p => (
              <button key={p.id} className={pane === p.id ? 'on' : ''} onClick={() => setPane(p.id)}>{p.label}</button>
            ))}
          </div>
          <div className="pane">
            {pane === 'versions'
              ? <VersionsPanel doc={doc} version={version} versionId={versionId}
                  setVersionId={setVersionId} update={update} updateVersion={updateVersion} />
              : pane === 'design'
                ? <DesignPanel doc={doc} update={update} />
                : <Editor doc={doc} version={version} pane={pane} update={update} updateVersion={updateVersion} />}
          </div>
        </div>
        <Preview doc={doc} version={version} design={doc.design} />
      </div>
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

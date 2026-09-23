import { A4, cssFor, sectionTitle, headerHtml } from './cvHtml.js';
import { getTemplate } from './templates.js';

const PX_PER_MM = 96 / 25.4;
let measurer = null;

function getMeasurer() {
  if (measurer) return measurer;
  measurer = document.createElement('div');
  measurer.setAttribute('aria-hidden', 'true');
  measurer.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(measurer);
  return measurer;
}

/**
 * Renders each block in a hidden column of the template's real content
 * width and returns its height in mm. Measuring on the live DOM keeps the
 * preview's page breaks identical to what printToPDF will produce.
 */
export function measureBlocks(blocks, tpl, design, widthMm) {
  const host = getMeasurer();
  host.innerHTML = `<style>${cssFor(tpl, design)}</style>` +
    `<div class="cv" style="width:${widthMm}mm">${blocks.map(b => `<div data-b>${b.html}</div>`).join('')}</div>`;
  const els = host.querySelectorAll('[data-b]');
  return Array.from(els).map(el => el.getBoundingClientRect().height / PX_PER_MM);
}

/**
 * Packs blocks into A4 pages. A block marked keepWithNext is glued to the
 * following one so a section heading can't sit alone at a page bottom.
 */
export function packPages(blocks, heights, tpl) {
  const contentH = A4.h - tpl.margin * 2;
  const groups = [];
  for (let i = 0; i < blocks.length; i++) {
    const g = { blocks: [blocks[i]], h: heights[i] };
    while (blocks[i].keepWithNext && i + 1 < blocks.length) {
      i++;
      g.blocks.push(blocks[i]);
      g.h += heights[i];
    }
    groups.push(g);
  }

  const pages = [[]];
  let used = 0;
  for (const g of groups) {
    if (used + g.h > contentH && used > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(...g.blocks);
    used += g.h;
  }
  return pages;
}

/**
 * Two-column rail layout: rail sections (skills, languages, certificates)
 * plus the profile contact block pack down a coloured rail; everything else
 * packs down the main column. Each page repeats the rail so later pages
 * keep the identity.
 */
export function packRailPages(doc, tpl, design, blocks) {
  const railIds = new Set(tpl.railSections || []);
  const rail = [];
  const main = [];
  let inRail = false;
  for (const b of blocks) {
    if (b.key === 'header') {
      // Name/headline stay in the main column; contact goes to the rail.
      const p = doc.profile;
      const contact = [p.email, p.phone, p.location, ...(p.links || []).map(l => l.url)]
        .filter(Boolean).join('<br>');
      if (contact) rail.push({ key: 'contact', html: `<div class="entry">${sectionTitle('Contact', tpl)}<div class="meta">${contact}</div></div>` });
      main.push({ key: 'header', html: `<div class="chead"><h1 class="name">${p.name || 'Your Name'}</h1>${p.headline ? `<div class="headline">${p.headline}</div>` : ''}</div>` });
      inRail = false;
      continue;
    }
    // Section titles switch which stream following blocks belong to.
    if (b.keepWithNext && b.html.includes('sectitle')) {
      inRail = railIds.has(lookupSection(b.label));
      (inRail ? rail : main).push(b);
      continue;
    }
    (inRail ? rail : main).push(b);
  }

  const railW = tpl.railWidth;
  const mainW = A4.w - railW - tpl.margin * 2;
  const railInnerW = railW - (tpl.railPad || 8) * 2;
  const railH = measureBlocks(rail, tpl, design, railInnerW);
  const mainH = measureBlocks(main, tpl, design, mainW);

  const mainPages = packPages(main, mainH, tpl);
  const railPages = packPages(rail, railH, { ...tpl, margin: tpl.railPad || 8 });

  const n = Math.max(mainPages.length, railPages.length);
  const pages = [];
  for (let i = 0; i < n; i++) {
    pages.push({ main: mainPages[i] || [], rail: railPages[i] || [] });
  }
  return { pages, contentH };
}

function lookupSection(label) {
  const map = { 'Skills': 'skills', 'Languages': 'languages', 'Certificates': 'certificates' };
  return map[label] || label.toLowerCase();
}

/** How full the last page is, 0..1 — used for the "mostly-empty page" warning. */
export function lastPageFill(blocks, heights, tpl, pages) {
  const contentH = A4.h - tpl.margin * 2;
  const last = pages[pages.length - 1];
  const idx = new Map(blocks.map((b, i) => [b.key, i]));
  const used = last.reduce((s, b) => s + (heights[idx.get(b.key)] || 0), 0);
  return used / contentH;
}

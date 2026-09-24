import { A4, cssFor, esc, sectionTitle } from './cvHtml.js';

const PX_PER_MM = 96 / 25.4;
let measurer = null;

// These mirror the rail CSS in cssFor(): .maincol padding and the rail's
// own top/bottom padding. Keep them in sync with cvHtml.js.
const MAINCOL_PAD_Y = 16;
const MAINCOL_PAD_X = 14;
const RAIL_PAD_BOTTOM = 10;

function getMeasurer() {
  if (measurer) return measurer;
  measurer = document.createElement('div');
  measurer.setAttribute('aria-hidden', 'true');
  measurer.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(measurer);
  return measurer;
}

/** Content height available on one A4 page for a template. */
export function contentHeight(tpl) {
  if (tpl.columns === 'rail') return A4.h - MAINCOL_PAD_Y * 2;
  return A4.h - tpl.margin * 2;
}

/** Content width of the column a stream of blocks is measured/packed in. */
export function streamWidth(tpl, stream) {
  if (tpl.columns === 'rail') {
    return stream === 'rail'
      ? tpl.railWidth - (tpl.railPad || 8) * 2
      : A4.w - tpl.railWidth - MAINCOL_PAD_X * 2;
  }
  return A4.w - tpl.margin * 2;
}

function railContentHeight(tpl) {
  // .rail { padding-top: max(railPad,16)mm; padding-bottom:10mm }
  return A4.h - Math.max(tpl.railPad || 8, MAINCOL_PAD_Y) - RAIL_PAD_BOTTOM;
}

/**
 * Renders each block in a hidden column of the template's real content
 * width and returns its height in mm. Each block is wrapped in a
 * `display:flow-root` div so child margins (entryGap, section-title
 * spacing) are contained instead of collapsing out and being missed.
 */
export function measureBlocks(blocks, tpl, design, widthMm) {
  const host = getMeasurer();
  host.innerHTML = `<style>${cssFor(tpl, design)}</style>` +
    `<div class="cv" style="width:${widthMm}mm">${blocks.map(b => `<div data-b style="display:flow-root">${b.html}</div>`).join('')}</div>`;
  const els = host.querySelectorAll('[data-b]');
  return Array.from(els).map(el => el.getBoundingClientRect().height / PX_PER_MM);
}

/**
 * Measures blocks and splits any single block that is taller than a page.
 * Only bullet lists are splittable (a job with very many bullets): the
 * entry is broken at <li> boundaries into page-sized chunks. A block that
 * is oversized and has no list is left as-is — nothing sensible to split.
 */
export function fitBlocks(blocks, tpl, design, widthMm, contentH) {
  const heights = measureBlocks(blocks, tpl, design, widthMm);
  if (!blocks.some((b, i) => heights[i] > contentH && b.html.includes('<li>'))) {
    return { blocks, heights };
  }
  const outBlocks = [];
  const outH = [];
  for (let i = 0; i < blocks.length; i++) {
    if (heights[i] <= contentH || !blocks[i].html.includes('<li>')) {
      outBlocks.push(blocks[i]);
      outH.push(heights[i]);
      continue;
    }
    const parts = splitListBlock(blocks[i], tpl, design, widthMm, contentH);
    const ph = measureBlocks(parts, tpl, design, widthMm);
    outBlocks.push(...parts);
    outH.push(...ph);
  }
  return { blocks: outBlocks, heights: outH };
}

function splitListBlock(block, tpl, design, widthMm, contentH) {
  const html = block.html;
  const ulStart = html.indexOf('<ul>');
  const ulEnd = html.lastIndexOf('</ul>');
  if (ulStart < 0 || ulEnd < 0) return [block];
  const head = html.slice(0, ulStart + 4);          // up to and incl. <ul>
  const tail = html.slice(ulEnd);                    // </ul> + closing tags
  const lis = html.slice(ulStart + 4, ulEnd).match(/<li>[\s\S]*?<\/li>/g) || [];
  if (lis.length < 2) return [block];

  const headH = measureBlocks([{ html: head + tail }], tpl, design, widthMm)[0];
  const liH = measureBlocks(
    lis.map(li => ({ html: `<div class="entry"><ul>${li}</ul></div>` })),
    tpl, design, widthMm
  );

  const parts = [];
  let cur = [];
  let used = headH;
  let first = true;
  for (let i = 0; i < lis.length; i++) {
    if (used + liH[i] > contentH * 0.97 && cur.length) {
      parts.push(first ? head + cur.join('') + tail : `<div class="entry"><ul>${cur.join('')}</ul></div>`);
      cur = []; used = 0; first = false;
    }
    cur.push(lis[i]);
    used += liH[i];
  }
  if (cur.length) {
    parts.push(first ? head + cur.join('') + tail : `<div class="entry"><ul>${cur.join('')}</ul></div>`);
  }
  return parts.map((h, i) => ({
    ...block, html: h, key: `${block.key}~${i}`, keepWithNext: i === 0 ? block.keepWithNext : false
  }));
}

/**
 * Packs blocks into A4 pages of the given content height. A block marked
 * keepWithNext is glued to the following one so a section heading can't
 * sit alone at a page bottom.
 */
export function packPages(blocks, heights, contentH) {
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
 * packs down the main column. Streams are routed by section id, so renamed
 * section headings still land in the right column.
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
      if (contact) rail.push({ key: 'contact', sid: 'profile', html: `<div class="entry">${sectionTitle('Contact', tpl)}<div class="meta">${contact}</div></div>` });
      main.push({ key: 'header', sid: 'header', html: `<div class="chead"><h1 class="name">${esc(p.name) || 'Your Name'}</h1>${p.headline ? `<div class="headline">${esc(p.headline)}</div>` : ''}</div>` });
      inRail = false;
      continue;
    }
    // Section titles switch which stream following blocks belong to.
    if (b.keepWithNext && b.html.includes('sectitle')) {
      inRail = railIds.has(b.sid);
      (inRail ? rail : main).push(b);
      continue;
    }
    (inRail ? rail : main).push(b);
  }

  const railFit = fitBlocks(rail, tpl, design, streamWidth(tpl, 'rail'), railContentHeight(tpl));
  const mainFit = fitBlocks(main, tpl, design, streamWidth(tpl, 'main'), contentHeight(tpl));

  const mainPages = packPages(mainFit.blocks, mainFit.heights, contentHeight(tpl));
  const railPages = packPages(railFit.blocks, railFit.heights, railContentHeight(tpl));

  const n = Math.max(mainPages.length, railPages.length);
  const pages = [];
  for (let i = 0; i < n; i++) {
    pages.push({ main: mainPages[i] || [], rail: railPages[i] || [] });
  }
  return { pages };
}

/** How full the last page is, 0..1 — used for the "mostly-empty page" warning. */
export function lastPageFill(blocks, heights, contentH, pages) {
  const last = pages[pages.length - 1];
  const idx = new Map(blocks.map((b, i) => [b.key, i]));
  const used = last.reduce((s, b) => s + (heights[idx.get(b.key)] || 0), 0);
  return used / contentH;
}

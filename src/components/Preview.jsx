import React, { useMemo } from 'react';
import { getTemplate } from '../lib/templates.js';
import { blocksFor, cssFor, A4 } from '../lib/cvHtml.js';
import { fitBlocks, packPages, packRailPages, lastPageFill, contentHeight, streamWidth } from '../lib/paginate.js';

/**
 * Live preview of real A4 pages. Blocks are measured at print width and
 * packed into fixed-height pages, so the break the user sees is the break
 * that ends up in the PDF — not a continuous scroll with dashed lines.
 */
export default function Preview({ doc, version, design }) {
  const tpl = getTemplate(design.template);

  const { pages, rail, heights, blocks } = useMemo(() => {
    const blocks = blocksFor(doc, version, design);
    if (tpl.columns === 'rail') {
      const { pages } = packRailPages(doc, tpl, design, blocks);
      return { pages, rail: true };
    }
    const fit = fitBlocks(blocks, tpl, design, streamWidth(tpl), contentHeight(tpl));
    return { pages: packPages(fit.blocks, fit.heights, contentHeight(tpl)), rail: false, heights: fit.heights, blocks: fit.blocks };
  }, [doc, version, design, tpl]);

  const pageCount = pages.length;
  let fill = 1;
  if (!rail && pages.length > 1) fill = lastPageFill(blocks, heights, contentHeight(tpl), pages);
  const spilling = pageCount > 1 && fill < 0.25;

  return (
    <div className="preview">
      <style>{cssFor(tpl, design)}</style>
      <div className="pagebadge">{pageCount} page{pageCount > 1 ? 's' : ''}</div>
      {spilling && <div className="spillwarn">Last page is only {Math.round(fill * 100)}% full — tighten or hide a section.</div>}
      {pages.map((p, i) => (
        <div key={i} className="page-wrap">
          {rail
            ? <div className="cv" style={{ width: `${A4.w}mm`, height: `${A4.h}mm`, overflow: 'hidden' }}>
                <div className="rail-wrap" style={{ height: '100%' }}>
                  <div className="rail" dangerouslySetInnerHTML={{ __html: p.rail.map(b => b.html).join('') }} />
                  <div className="maincol" dangerouslySetInnerHTML={{ __html: p.main.map(b => b.html).join('') }} />
                </div>
              </div>
            : <div className="cv" style={{ width: `${A4.w}mm`, height: `${A4.h}mm`, padding: `${tpl.margin}mm`, overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: p.map(b => b.html).join('') }} />}
        </div>
      ))}
    </div>
  );
}

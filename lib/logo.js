'use strict';
/* ============================================================
   MARKIPIE — code-drawn logo system (inline SVG, no raster assets)
   ------------------------------------------------------------
   Everything uses `currentColor`, so the logo inherits the colour of
   its container and works on light AND dark backgrounds with no
   second asset, no filters and no image requests.

   Exports:
     mark(opts)      compact monogram  — favicon, mobile, admin rail
     full(opts)      monogram + wordmark + rule + descriptor (navbar/footer)
     wordmark(opts)  type only
     stacked(opts)   centred lockup for intro / gallery hero
     favicon()       standalone SVG document for /favicon.svg
   ============================================================ */

/* The monogram: an "M" drawn as an aperture/chevron inside a hairline
   diamond-square. Geometry only — no photographic imagery. */
function markGlyph(stroke) {
  const w = stroke == null ? 1.4 : stroke;
  return `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" vector-effect="non-scaling-stroke">
    <rect x="1.6" y="1.6" width="36.8" height="36.8"/>
    <path d="M11 27.4V12.6l9 9.2 9-9.2v14.8" />
    <path d="M20 21.8v5.6" opacity=".45"/>
  </g>`;
}

function mark(opts) {
  const o = opts || {};
  const size = o.size || 34;
  const cls = o.cls ? ` class="${o.cls}"` : '';
  const title = o.title === false ? '' : '<title>MARKIPIE</title>';
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 40 40" role="img" aria-hidden="${o.title === false ? 'true' : 'false'}" focusable="false">${title}${markGlyph(o.stroke)}</svg>`;
}

/* Letterspaced wordmark set in the site serif. Rendered as <text> so it
   stays sharp, selectable-free and re-styleable in CSS. */
function wordmark(opts) {
  const o = opts || {};
  const h = o.height || 18;
  const w = h * 8.4;
  return `<svg class="lg-word${o.cls ? ' ' + o.cls : ''}" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 336 40" role="img" aria-hidden="true" focusable="false" preserveAspectRatio="xMinYMid meet">
    <text x="0" y="30" fill="currentColor" font-family="'Cormorant Garamond',Georgia,serif" font-size="38" font-weight="500" letter-spacing="9.5">MARKIPIE</text>
  </svg>`;
}

/* Horizontal lockup used in the navbar. */
function full(opts) {
  const o = opts || {};
  const size = o.size || 32;
  const desc = o.descriptor === false ? '' :
    `<span class="lg-desc">${o.descriptorText || 'Photography &amp; Films'}</span>`;
  return `<span class="lg lg-full${o.cls ? ' ' + o.cls : ''}">
  ${mark({ size, title: false })}
  <span class="lg-type">
    <span class="lg-name">MARKIPIE</span>
    ${desc}
  </span>
</span>`;
}

/* Centred lockup — intro animation, client gallery, admin login. */
function stacked(opts) {
  const o = opts || {};
  const size = o.size || 46;
  return `<span class="lg lg-stack${o.cls ? ' ' + o.cls : ''}">
  ${mark({ size, title: false })}
  <span class="lg-name">MARKIPIE</span>
  <span class="lg-rule" aria-hidden="true"></span>
  <span class="lg-desc">${o.descriptorText || 'Photography &amp; Films'}</span>
</span>`;
}

/* Standalone SVG file for /favicon.svg — needs its own colours because a
   favicon has no inheritable context. */
function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="64" height="64">
<rect width="40" height="40" fill="#141210"/>
<g fill="none" stroke="#C9A227" stroke-width="1.8" stroke-linecap="square">
  <rect x="4.5" y="4.5" width="31" height="31"/>
  <path d="M12.5 26.5V13.5l7.5 7.6 7.5-7.6v13"/>
</g>
</svg>`;
}

/* Monochrome social/OG card (1200x630) so link previews stop pointing at
   a raster logo that no longer exists. */
function ogCard(tagline) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#141210"/>
<g fill="none" stroke="#C9A227" stroke-width="2.2" stroke-linecap="square" transform="translate(524 150) scale(3.8)">
  <rect x="1.6" y="1.6" width="36.8" height="36.8"/>
  <path d="M11 27.4V12.6l9 9.2 9-9.2v14.8"/>
</g>
<text x="600" y="420" text-anchor="middle" fill="#F6F3EE" font-family="Georgia,serif" font-size="72" letter-spacing="18">MARKIPIE</text>
<text x="600" y="470" text-anchor="middle" fill="#9d968c" font-family="Helvetica,Arial,sans-serif" font-size="21" letter-spacing="7">${tagline || 'PHOTOGRAPHY &amp; FILMS'}</text>
<rect x="500" y="500" width="200" height="1" fill="#C9A227" opacity=".6"/>
</svg>`;
}

module.exports = { mark, full, wordmark, stacked, favicon, ogCard, markGlyph };

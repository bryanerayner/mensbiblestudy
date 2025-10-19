/* biblestudy-embed.js - One-file embeddable Bible Study slide explorer
   Usage: put your markdown in <pre id="biblestudy-md">…</pre> (or <pre data-biblestudy>…</pre>)
   Then include this script. It will replace the <pre> with an interactive, themed slide deck.
*/
(() => {
  // ---------- Utilities ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (s) => s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");

  // Very small markdown-to-HTML converter covering headings, lists, blockquotes, inline code, bold/italic, code fences, paragraphs.
  function simpleMarkdown(md) {
    // Normalize line endings
    md = md.replace(/\r\n?/g, "\n");

    // Handle fenced code blocks first: ```lang?\n...\n```
    const codeFences = [];
    md = md.replace(/```([\s\S]*?)```/g, (m, code) => {
      const token = `__CODEFENCE_${codeFences.length}__`;
      codeFences.push(`<pre class="codeblock"><code>${escapeHtml(code.trim())}</code></pre>`);
      return token;
    });

    // Protect custom widgets: [Bible: …] and [YouTube: …]
    const widgets = [];
    md = md.replace(/\[Bible:\s*([^\]]+)\]/g, (m, ref) => {
      const id = `__WIDGET_${widgets.length}__`;
      const gatewayRef = ref.trim().replace(/\s+/g, '+');
      const uid = 'passage-' + Math.random().toString(36).slice(2, 10);
      widgets.push(
        `<div class="bible-passage collapsed" data-reference="${ref.trim()}" data-gateway-ref="${gatewayRef}" data-id="${uid}">
          <div class="passage-header">
            <div class="passage-reference">${ref.trim()}</div>
            <button class="expand-btn" data-expand="${uid}">Read Passage</button>
          </div>
          <div class="passage-text preview" id="${uid}">Click "Read Passage" to view the full text</div>
        </div>`
      );
      return id;
    });
    md = md.replace(/\[YouTube:\s*([^\]]+)\]/g, (m, videoId) => {
      const id = `__WIDGET_${widgets.length}__`;
      widgets.push(
        `<div class="youtube-embed">
          <iframe src="https://www.youtube.com/embed/${videoId.trim()}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>`
      );
      return id;
    });

    // Convert blockquotes (group consecutive > lines)
    md = md.replace(/^(?:>.*\n?)+/gm, (block) => {
      const inner = block.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n');
      return `<blockquote>${inlineMarkdown(inner)}</blockquote>\n`;
    });

    // Convert headings
    md = md
      .replace(/^###\s+(.*)$/gm, (_m, t) => `<h3>${inlineMarkdown(t)}</h3>`)
      .replace(/^##\s+(.*)$/gm, (_m, t) => `<h2>${inlineMarkdown(t)}</h2>`)
      .replace(/^#\s+(.*)$/gm,  (_m, t) => `<h1>${inlineMarkdown(t)}</h1>`);

    // Convert ordered lists (grouped)
    md = md.replace(/^(?:\d+\.\s+.*\n?)+/gm, (block) => {
      const lines = block.trim().split('\n');
      const startMatch = lines[0].match(/^(\d+)\.\s+/);
      const start = startMatch ? Number(startMatch[1]) : 1;
      const items = lines.map(l => l.replace(/^\d+\.\s+/, '').trim());
      const startAttr = start > 1 ? ` start="${start}"` : '';
      return `<ol${startAttr}>${items.map(i=>`<li>${inlineMarkdown(i)}</li>`).join('')}</ol>\n`;
    });

    // Convert unordered lists (grouped)
    md = md.replace(/^(?:[-*]\s+.*\n?)+/gm, (block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^[-*]\s+/, '').trim());
      return `<ul>${items.map(i=>`<li>${inlineMarkdown(i)}</li>`).join('')}</ul>\n`;
    });

    // Paragraphs: two+ newlines -> paragraph split
    md = md.split(/\n{2,}/).map(chunk => {
      if (/^\s*<(h1|h2|h3|ul|ol|blockquote|pre|div|section)/.test(chunk)) return chunk;
      return `<p>${inlineMarkdown(chunk.trim())}</p>`;
    }).join('\n');

    // Restore code fences
    md = md.replace(/__CODEFENCE_(\d+)__/g, (_m, i) => codeFences[Number(i)]);
    // Restore widgets
    md = md.replace(/__WIDGET_(\d+)__/g, (_m, i) => widgets[Number(i)]);

    return md;
  }

  // Inline-level markdown: `code`, **bold**, *italic*
  function inlineMarkdown(text) {
    if (!text) return '';
    // Escape HTML first, then unescape where we inject tags
    text = escapeHtml(text);
    // Inline code
    text = text.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
    // Bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, (_m, c) => `<strong>${c}</strong>`);
    // Italic *text*
    text = text.replace(/(^|[^*])\*([^*]+)\*/g, (_m, lead, c) => `${lead}<em>${c}</em>`);
    return text;
  }

  // ---------- Styles (injected once) ----------
  const styles = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
 --bg-primary:#fff;--bg-secondary:#f8f9fa;--bg-tertiary:#e9ecef;
 --text-primary:#1a1a1a;--text-secondary:#4a5568;--text-muted:#718096;
 --accent-primary:#2c5f2d;--accent-secondary:#97c05c;
 --border-color:#e2e8f0;--passage-bg:#f7fafc;--shadow:rgba(0,0,0,.1)
}
[data-theme="dark"]{
 --bg-primary:#0f1419;--bg-secondary:#1a1f2e;--bg-tertiary:#252d3d;
 --text-primary:#e8eaed;--text-secondary:#b8bcc4;--text-muted:#8b92a0;
 --accent-primary:#5a9f5c;--accent-secondary:#7cb97f;
 --border-color:#2d3748;--passage-bg:#1a1f2e;--shadow:rgba(0,0,0,.3)
}
html,body{background:var(--bg-primary);color:var(--text-primary)}
body.bstudy-mounted{overflow-x:hidden}
.bstudy-controls{position:fixed;top:1rem;right:1rem;z-index:100000;display:flex;gap:.5rem;align-items:center}
.bstudy-btn,.bstudy-upload{background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);padding:.5rem 1rem;border-radius:.5rem;cursor:pointer;font-size:.875rem;transition:all .2s ease;display:flex;align-items:center;gap:.5rem}
.bstudy-btn:hover,.bstudy-upload:hover{background:var(--bg-tertiary);transform:translateY(-1px)}
.bstudy-counter{background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);padding:.5rem 1rem;border-radius:.5rem;font-size:.875rem;font-weight:500}
#bstudy-file{display:none}
.bstudy-container{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;scroll-behavior:smooth;background:var(--bg-primary)}
.bstudy-slide{min-height:100vh;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;padding:3rem 2rem}
.bstudy-slide .slide-content{max-width:800px;width:100%;padding-top:6rem}
.bstudy-slide h1{font-size:2.5rem;font-weight:700;color:var(--accent-primary);margin-bottom:2rem;line-height:1.2}
.bstudy-slide h2{font-size:1.875rem;font-weight:600;color:var(--text-primary);margin:2rem 0 1rem}
.bstudy-slide h3{font-size:1.5rem;font-weight:600;color:var(--text-primary);margin:1.5rem 0 .75rem}
.bstudy-slide p{font-size:1.125rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.8}
.bstudy-slide ul,.bstudy-slide ol{margin-left:1.5rem;margin-bottom:1rem}
.bstudy-slide li{font-size:1.125rem;color:var(--text-secondary);margin-bottom:.5rem;line-height:1.8}
.bstudy-slide blockquote{border-left:4px solid var(--accent-primary);padding-left:1.5rem;margin:1.5rem 0;font-style:italic;color:var(--text-secondary)}
.bstudy-slide code{background:var(--bg-secondary);padding:.2rem .4rem;border-radius:.25rem;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;font-size:.9em}
.bstudy-slide pre.codeblock{background:var(--bg-secondary);padding:1rem;border-radius:.5rem;overflow-x:auto;margin:1rem 0}
.bstudy-passage{background:var(--passage-bg);border:2px solid var(--accent-secondary);border-radius:.75rem;padding:1.5rem;margin:1.5rem 0;transition:all .3s ease}
.bible-passage.collapsed{cursor:pointer}
.bible-passage.collapsed:hover{border-color:var(--accent-primary);box-shadow:0 4px 12px var(--shadow)}
.passage-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.passage-reference{font-weight:700;color:var(--accent-primary);font-size:1.25rem}
.expand-btn{background:var(--accent-primary);color:#fff;border:none;padding:.5rem 1rem;border-radius:.375rem;cursor:pointer;font-size:.875rem;font-weight:600;transition:all .2s ease}
.expand-btn:hover{background:var(--accent-secondary);transform:translateY(-1px)}
.passage-text{color:var(--text-secondary);font-size:1.125rem;line-height:1.8}
.passage-text.preview{max-height:4.5rem;overflow:hidden;position:relative}
.passage-text.preview::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2rem;background:linear-gradient(to bottom,transparent,var(--passage-bg))}
.passage-fullscreen{position:fixed;inset:0;background:var(--bg-primary);z-index:200000;overflow-y:auto;padding:3rem 2rem;animation:bstudyFade .3s ease}
@keyframes bstudyFade{from{opacity:0}to{opacity:1}}
.passage-fullscreen-content{max-width:800px;margin:0 auto}
.bstudy-close{position:fixed;top:1rem;right:1rem;background:var(--accent-primary);color:#fff;border:none;padding:.75rem 1.5rem;border-radius:.5rem;cursor:pointer;font-size:1rem;font-weight:600;z-index:200001;transition:all .2s ease}
.bstudy-close:hover{background:var(--accent-secondary);transform:translateY(-1px)}
.youtube-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5rem 0;border-radius:.75rem;box-shadow:0 4px 12px var(--shadow)}
.youtube-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:.75rem}
@media (max-width:768px){
 .bstudy-slide h1{font-size:2rem}
 .bstudy-slide h2{font-size:1.5rem}
 .bstudy-slide p,.bstudy-slide li{font-size:1rem}
 .bstudy-controls{top:.5rem;right:.5rem;flex-wrap:wrap}
 .bstudy-slide{padding:2rem 1rem}
}
`;

  function injectStylesOnce() {
    if ($('#bstudy-style')) return;
    const style = document.createElement('style');
    style.id = 'bstudy-style';
    style.textContent = styles;
    document.head.appendChild(style);
  }

  // ---------- Core rendering ----------
  function splitSlides(md) {
    const sections = md.split(/^#\s+/gm).filter(s => s.trim() !== '');
    const slides = sections.map(section => `# ${section}`);
    const finalSlides = [];
    slides.forEach((slide) => {
      finalSlides.push(...splitSingleSlide(slide));
    });
    return finalSlides;
  }

  function splitSingleSlide(slideMd) {
    const trimmed = slideMd.trim();
    const headingMatch = trimmed.match(/^#\s+(.+?)(?:\n+|$)/);
    if (!headingMatch) return [slideMd];

    const heading = headingMatch[1].trim();
    const body = trimmed.slice(headingMatch[0].length).trim();
    if (!body) return [`# ${heading}`];

    const blocks = expandSlideBlocks(body);
    const isMobile = window.innerWidth <= 768;
    const charLimit = isMobile ? 700 : 1300;
    const blockLimit = isMobile ? 3 : 6;

    const slideParts = [];
    let chunk = [];
    let charCount = 0;
    let partIndex = 1;

    blocks.forEach((block) => {
      const blockLength = block.length;
      if (chunk.length && (charCount + blockLength > charLimit || chunk.length >= blockLimit)) {
        slideParts.push(buildSlideMarkdown(heading, chunk, partIndex));
        partIndex += 1;
        chunk = [];
        charCount = 0;
      }
      chunk.push(block);
      charCount += blockLength;
    });

    if (chunk.length) {
      slideParts.push(buildSlideMarkdown(heading, chunk, partIndex));
    }

    return slideParts;
  }

  function buildSlideMarkdown(heading, blocks, partIndex) {
    const suffix = partIndex > 1 ? ' (cont.)' : '';
    return `# ${heading}${suffix}\n\n${blocks.join('\n\n')}`;
  }

  function expandSlideBlocks(body) {
    const codeFences = [];
    let protectedBody = body.replace(/```[\s\S]*?```/g, (match) => {
      const token = `__SPLIT_CODE_${codeFences.length}__`;
      codeFences.push(match);
      return token;
    });

    const rawBlocks = protectedBody
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    const expanded = rawBlocks.flatMap((block) => {
      const restored = block.replace(/__SPLIT_CODE_(\d+)__/g, (_m, idx) => codeFences[Number(idx)]);
      return splitBlock(restored);
    });

    return expanded.length ? expanded : [body.trim()];
  }

  function splitBlock(block) {
    if (!block) return [];
    if (/^```/.test(block)) return [block];
    if (/^\s*>/.test(block)) return splitBlockquote(block);
    if (/^\s*[-*]\s+/.test(block) || /^\s*\d+\.\s+/.test(block)) return splitListBlock(block);
    return splitParagraphBlock(block);
  }

  function splitListBlock(block) {
    const isMobile = window.innerWidth <= 768;
    const maxItems = isMobile ? 4 : 8;
    const maxChars = isMobile ? 600 : 1200;
    const lines = block.split('\n');
    const items = [];
    let current = [];
    let baseIndent = null;

    lines.forEach((line) => {
      const match = line.match(/^(\s*)([-*]|\d+\.)\s+/);
      if (match) {
        const indent = match[1].length;
        if (baseIndent === null) baseIndent = indent;
        if (indent === baseIndent) {
          if (current.length) items.push(current.join('\n'));
          current = [line];
          return;
        }
      }
      current.push(line);
    });
    if (current.length) items.push(current.join('\n'));
    if (!items.length) return [block];

    const groups = [];
    let group = [];
    let charCount = 0;
    items.forEach((item) => {
      const itemLength = item.length;
      if (group.length && (group.length >= maxItems || charCount + itemLength > maxChars)) {
        groups.push(group.join('\n'));
        group = [];
        charCount = 0;
      }
      group.push(item);
      charCount += itemLength;
    });
    if (group.length) groups.push(group.join('\n'));
    return groups;
  }

  function splitBlockquote(block) {
    const inner = block.replace(/^>\s?/gm, '').trim();
    const segments = splitParagraphBlock(inner);
    return segments.map((segment) => segment
      .split('\n')
      .map((line) => (line.trim().length ? `> ${line}` : '>'))
      .join('\n'));
  }

  function splitParagraphBlock(block) {
    const isMobile = window.innerWidth <= 768;
    const charLimit = isMobile ? 400 : 800;
    if (block.length <= charLimit) return [block];

    const { text, tokens } = protectInline(block);
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    const segments = [];

    if (sentences.length > 1) {
      let current = '';
      sentences.forEach((sentence) => {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.length > charLimit && current) {
          segments.push(current);
          current = sentence;
        } else if (candidate.length > charLimit) {
          segments.push(candidate);
          current = '';
        } else {
          current = candidate;
        }
      });
      if (current) segments.push(current);
    }

    if (!segments.length) {
      let remaining = text.trim();
      while (remaining.length > charLimit) {
        const slice = remaining.slice(0, charLimit);
        const cut = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
        const pivot = cut > 50 ? cut : charLimit;
        segments.push(remaining.slice(0, pivot));
        remaining = remaining.slice(pivot).trimStart();
      }
      if (remaining) segments.push(remaining);
    }

    return segments.map((segment) => restoreInline(segment.trim(), tokens));
  }

  function protectInline(str) {
    const tokens = [];
    const protectedStr = str.replace(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g, (match) => {
      const token = `__INLINE_${tokens.length}__`;
      tokens.push(match);
      return token;
    });
    return { text: protectedStr, tokens };
  }

  function restoreInline(str, tokens) {
    return str.replace(/__INLINE_(\d+)__/g, (_m, idx) => tokens[Number(idx)]);
  }

  function renderSlides(md, mountAt) {
    injectStylesOnce();
    document.body.classList.add('bstudy-mounted');

    // Build shell
    const controls = document.createElement('div');
    controls.className = 'bstudy-controls';
    controls.innerHTML = `
      <div class="bstudy-counter" id="bstudy-counter">1 / 1</div>
      <button class="bstudy-btn" id="bstudy-theme"><span id="bstudy-theme-icon">🌙</span><span id="bstudy-theme-text">Dark</span></button>
      <label class="bstudy-upload" for="bstudy-file">📄 Load Markdown</label>
      <input type="file" id="bstudy-file" accept=".md,.txt">
    `;

    const container = document.createElement('div');
    container.className = 'bstudy-container';
    container.id = 'bstudy-container';

    // Replace mount target
    mountAt.replaceWith(controls, container);

    // State
    const htmlEl = document.documentElement;
    let theme = localStorage.getItem('bstudy-theme') || 'light';
    htmlEl.setAttribute('data-theme', theme);
    updateThemeButton(theme);

    let currentSlide = 0;

    // Build slides
    const slidesMd = splitSlides(md);
    container.innerHTML = '';
    slidesMd.forEach((s, i) => {
      const slide = document.createElement('div');
      slide.className = 'bstudy-slide';
      slide.dataset.slideIndex = String(i);

      const content = document.createElement('div');
      content.className = 'slide-content';
      content.innerHTML = simpleMarkdown(s);

      slide.appendChild(content);
      container.appendChild(slide);
    });

    // Init counters & listeners
    updateSlideCounter();
    container.addEventListener('scroll', updateSlideCounter);

    // Theme toggle
    $('#bstudy-theme').addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', theme);
      localStorage.setItem('bstudy-theme', theme);
      updateThemeButton(theme);
    });

    // File loader
    $('#bstudy-file').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      renderSlides(text, container); // re-render in place
    });

    // Click handlers for [Bible] expand buttons (event delegation)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.expand-btn');
      if (btn && btn.hasAttribute('data-expand')) {
        expandPassage(btn.getAttribute('data-expand'));
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const slides = $$('.bstudy-slide', container);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentSlide < slides.length - 1) {
          slides[currentSlide + 1].scrollIntoView({behavior:'smooth'});
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentSlide > 0) {
          slides[currentSlide - 1].scrollIntoView({behavior:'smooth'});
        }
      }
    });

    // Touch swipe (navigate between slides)
    let tx=0, ty=0, ex=0, ey=0;
    container.addEventListener('touchstart', (e) => {
      tx = e.changedTouches[0].screenX; ty = e.changedTouches[0].screenY;
    });
    container.addEventListener('touchend', (e) => {
      ex = e.changedTouches[0].screenX; ey = e.changedTouches[0].screenY;
      const dx = tx - ex, dy = ty - ey, thr = 50;
      const slides = $$('.bstudy-slide', container);
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > thr && currentSlide < slides.length - 1) slides[currentSlide + 1].scrollIntoView({behavior:'smooth'});
        else if (dy < -thr && currentSlide > 0) slides[currentSlide - 1].scrollIntoView({behavior:'smooth'});
      }
    });

    // Helpers
    function updateThemeButton(t) {
      const icon = $('#bstudy-theme-icon'), text = $('#bstudy-theme-text');
      if (t === 'dark') { icon.textContent='☀️'; text.textContent='Light'; }
      else { icon.textContent='🌙'; text.textContent='Dark'; }
    }

    function updateSlideCounter() {
      currentSlide = Math.round(container.scrollTop / window.innerHeight);
      const totalSlides = $$('.bstudy-slide', container).length;
      $('#bstudy-counter').textContent = `${Math.min(currentSlide+1,totalSlides)} / ${totalSlides}`;
    }

    function expandPassage(id) {
      const holder = document.querySelector(`[data-id="${id}"]`);
      if (!holder) return;
      const reference = holder.getAttribute('data-reference');
      const gatewayRef = holder.getAttribute('data-gateway-ref');
      const url = `https://www.biblegateway.com/passage/?search=${gatewayRef}&version=NIV`;

      const overlay = document.createElement('div');
      overlay.className = 'passage-fullscreen';

      const close = document.createElement('button');
      close.className = 'bstudy-close';
      close.textContent = '✕ Close';
      close.onclick = () => overlay.remove();

      const content = document.createElement('div');
      content.className = 'passage-fullscreen-content';
      content.innerHTML = `
        <h1 style="color: var(--accent-primary); margin-bottom: 2rem;">${reference}</h1>
        <iframe src="${url}" style="width: 100%; height: 70vh; border: 2px solid var(--border-color); border-radius: 0.75rem;" title="${reference}"></iframe>
        <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.875rem;">
          Passage loaded from Bible Gateway (NIV). If the iframe doesn't load, you can
          <a href="${url}" target="_blank" style="color: var(--accent-primary);">open it in a new tab</a>.
        </p>
      `;

      overlay.appendChild(close);
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    }
  }

  // ---------- Boot ----------
  function findMarkdownPre() {
    return $('#biblestudy-md') || $('[data-biblestudy]') || document.querySelector('pre');
  }

  function init() {
    const pre = findMarkdownPre();
    if (!pre) return;
    const md = pre.textContent || '';
    renderSlides(md, pre);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

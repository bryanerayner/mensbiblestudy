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
      const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s+/, '').trim());
      return `<ol>${items.map(i=>`<li>${inlineMarkdown(i)}</li>`).join('')}</ol>\n`;
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
body.bstudy-mounted{overflow-x:hidden}
.bstudy-controls{position:fixed;top:1rem;right:1rem;z-index:100000;display:flex;gap:.5rem;align-items:center}
.bstudy-btn,.bstudy-upload{background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);padding:.5rem 1rem;border-radius:.5rem;cursor:pointer;font-size:.875rem;transition:all .2s ease;display:flex;align-items:center;gap:.5rem}
.bstudy-btn:hover,.bstudy-upload:hover{background:var(--bg-tertiary);transform:translateY(-1px)}
.bstudy-counter{background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);padding:.5rem 1rem;border-radius:.5rem;font-size:.875rem;font-weight:500}
#bstudy-file{display:none}
.bstudy-container{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;scroll-behavior:smooth}
.bstudy-slide{min-height:100vh;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;padding:3rem 2rem}
.bstudy-slide .slide-content{max-width:800px;width:100%;padding-top:6rem}
.bstudy-slide h1{font-size:2.5rem;font-weight:700;color:var(--accent-primary);margin-bottom:2rem;line-height:1.2}
.bstudy-slide h2{font-size:1.875rem;font-weight:600;color:var(--text-primary);margin:2rem 0 1rem}
.bstudy-slide h3{font-size:1.5rem;font-weight:600;color:var(--text-primary);margin:1.5rem 0 .75rem}
.bstudy-slide p{font-size:1.125rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.8}
.bstudy-slide ul,.bstudy-slide ol{margin-left:1.5rem;margin-bottom:1rem}
.bstudy-slide li{font-size:1.125rem;color:var(--text-secondary);margin-bottom:.5rem;line-height:1.8;opacity:0;transform:translateX(-20px);transition:opacity .5s ease,transform .5s ease}
.bstudy-slide li.revealed{opacity:1;transform:translateX(0)}
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
.bstudy-hint{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:.875rem;display:flex;align-items:center;gap:.5rem}
.bstudy-bprogress{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);padding:.5rem 1rem;border-radius:.5rem;font-size:.875rem;font-weight:500;display:none}
.bstudy-bprogress.visible{display:block}
.bstudy-nextbullet{position:fixed;bottom:6rem;right:2rem;background:var(--accent-primary);color:#fff;border:none;padding:1rem;border-radius:50%;cursor:pointer;font-size:1.5rem;width:3.5rem;height:3.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px var(--shadow);transition:all .2s ease;z-index:100;visibility:hidden;opacity:0}
.bstudy-nextbullet:hover{background:var(--accent-secondary);transform:translateY(-2px);box-shadow:0 6px 16px var(--shadow)}
.bstudy-nextbullet.visible{visibility:visible;opacity:1}
@media (max-width:768px){
 .bstudy-slide h1{font-size:2rem}
 .bstudy-slide h2{font-size:1.5rem}
 .bstudy-slide p,.bstudy-slide li{font-size:1rem}
 .bstudy-controls{top:.5rem;right:.5rem;flex-wrap:wrap}
 .bstudy-slide{padding:2rem 1rem}
 .bstudy-nextbullet{bottom:5rem;right:1rem;width:3rem;height:3rem;font-size:1.25rem}
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
    // Split by H1 markers (# ) while keeping the first section if it doesn't start with #.
    const parts = md.split(/^#\s+/gm).filter(s => s.trim() !== '');
    // Add back the removed "# " to each slide (so headings render)
    return parts.map(p => `# ${p}`);
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
    `;

    const container = document.createElement('div');
    container.className = 'bstudy-container';
    container.id = 'bstudy-container';

    const bprog = document.createElement('div');
    bprog.className = 'bstudy-bprogress';
    bprog.id = 'bstudy-bprog';
    bprog.textContent = '1 / 1';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'bstudy-nextbullet';
    nextBtn.id = 'bstudy-next';
    nextBtn.title = 'Next point (→)';
    nextBtn.textContent = '→';

    const hint = document.createElement('div');
    hint.className = 'bstudy-hint';
    hint.innerHTML = `<span>↓</span><span>Scroll to navigate</span>`;

    // Replace mount target
    mountAt.replaceWith(controls, container, bprog, nextBtn, hint);

    // State
    const htmlEl = document.documentElement;
    let theme = localStorage.getItem('bstudy-theme') || 'light';
    htmlEl.setAttribute('data-theme', theme);
    updateThemeButton(theme);

    let currentSlide = 0;
    let currentBullet = 0;

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
    setTimeout(updateBulletVisibility, 50);
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

    // Bullet button
    $('#bstudy-next').addEventListener('click', () => { nextBullet(); });

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
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!nextBullet()) {} }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); previousBullet(); }
      else if (e.key === 'ArrowDown') {
        const [bc, prog] = [getBulletCount(), currentBullet];
        if (prog >= bc - 1 && currentSlide < slides.length - 1) {
          slides[currentSlide + 1].scrollIntoView({behavior:'smooth'});
        } else {
          nextBullet();
        }
      } else if (e.key === 'ArrowUp') {
        if (currentSlide > 0) slides[currentSlide - 1].scrollIntoView({behavior:'smooth'});
      }
    });

    // Touch swipe (bullets left/right, slides up/down)
    let tx=0, ty=0, ex=0, ey=0;
    container.addEventListener('touchstart', (e) => {
      tx = e.changedTouches[0].screenX; ty = e.changedTouches[0].screenY;
    });
    container.addEventListener('touchend', (e) => {
      ex = e.changedTouches[0].screenX; ey = e.changedTouches[0].screenY;
      const dx = tx - ex, dy = ty - ey, thr = 50;
      const slides = $$('.bstudy-slide', container);
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > thr) nextBullet(); else if (dx < -thr) previousBullet();
      } else {
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

    function getBulletCount() {
      const slide = $$('.bstudy-slide', container)[currentSlide];
      if (!slide) return 0;
      return $$('li', slide).length;
    }

    function updateBulletVisibility() {
      const slides = $$('.bstudy-slide', container);
      const slide = slides[currentSlide];
      if (!slide) return;
      const bullets = $$('li', slide);
      const total = bullets.length;
      bullets.forEach((li, idx) => li.classList.toggle('revealed', idx <= currentBullet));

      const hasMore = total > 0 && currentBullet < total - 1;
      const prog = $('#bstudy-bprog');
      const btn = $('#bstudy-next');

      if (total > 0) {
        prog.textContent = `${Math.min(currentBullet + 1, total)} / ${total}`;
        prog.classList.add('visible');
        if (hasMore) btn.classList.add('visible'); else btn.classList.remove('visible');
      } else {
        prog.classList.remove('visible');
        btn.classList.remove('visible');
      }
    }

    function updateSlideCounter() {
      currentSlide = Math.round(container.scrollTop / window.innerHeight);
      const totalSlides = $$('.bstudy-slide', container).length;
      $('#bstudy-counter').textContent = `${Math.min(currentSlide+1,totalSlides)} / ${totalSlides}`;
      updateBulletVisibility();
    }

    function nextBullet() {
      const count = getBulletCount();
      if (currentBullet < count - 1) { currentBullet++; updateBulletVisibility(); return true; }
      return false;
    }
    function previousBullet() {
      if (currentBullet > 0) { currentBullet--; updateBulletVisibility(); return true; }
      return false;
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

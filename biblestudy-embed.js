/* biblestudy-embed.js — FIXED: bullets never get pushed when swiping slides */
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  function simpleMarkdown(md) {
    md = md.replace(/\r\n?/g, "\n");
    const fences = [];
    md = md.replace(/```([\s\S]*?)```/g, (m, c) => {
      const t = `__F_${fences.length}__`;
      fences.push(`<pre class="codeblock"><code>${escapeHtml(c.trim())}</code></pre>`);
      return t;
    });

    const widgets = [];
    md = md.replace(/\[Bible:\s*([^\]]+)\]/g, (m, ref) => {
      const id = `__W_${widgets.length}__`;
      const g = ref.trim().replace(/\s+/g, '+');
      const uid = 'passage-' + Math.random().toString(36).slice(2, 10);
      widgets.push(
        `<div class="bible-passage collapsed" data-reference="${ref.trim()}" data-gateway-ref="${g}" data-id="${uid}">
          <div class="passage-header">
            <div class="passage-reference">${ref.trim()}</div>
            <button class="expand-btn" data-expand="${uid}">Read Passage</button>
          </div>
          <div class="passage-text preview" id="${uid}">Click "Read Passage" to view the full text</div>
        </div>`
      );
      return id;
    });
    md = md.replace(/\[YouTube:\s*([^\]]+)\]/g, (m, vid) => {
      const id = `__W_${widgets.length}__`;
      widgets.push(
        `<div class="youtube-embed">
          <iframe src="https://www.youtube.com/embed/${vid.trim()}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>`
      );
      return id;
    });

    md = md.replace(/^(?:>.*\n?)+/gm, (block) => {
      const inner = block.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n');
      return `<blockquote>${inlineMarkdown(inner)}</blockquote>\n`;
    });

    md = md
      .replace(/^###\s+(.*)$/gm, (_m, t) => `<h3>${inlineMarkdown(t)}</h3>`)
      .replace(/^##\s+(.*)$/gm,  (_m, t) => `<h2>${inlineMarkdown(t)}</h2>`)
      .replace(/^#\s+(.*)$/gm,   (_m, t) => `<h1>${inlineMarkdown(t)}</h1>`);

    md = md.replace(/^(?:\d+\.\s+.*\n?)+/gm, (block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s+/, '').trim());
      return `<ol>${items.map(i=>`<li>${inlineMarkdown(i)}</li>`).join('')}</ol>\n`;
    });

    md = md.replace(/^(?:[-*]\s+.*\n?)+/gm, (block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^[-*]\s+/, '').trim());
      return `<ul>${items.map(i=>`<li>${inlineMarkdown(i)}</li>`).join('')}</ul>\n`;
    });

    md = md.split(/\n{2,}/).map(chunk => {
      if (/^\s*<(h1|h2|h3|ul|ol|blockquote|pre|div|section)/.test(chunk)) return chunk;
      return `<p>${inlineMarkdown(chunk.trim())}</p>`;
    }).join('\n');

    md = md.replace(/__F_(\d+)__/g, (_m, i) => fences[+i]);
    md = md.replace(/__W_(\d+)__/g, (_m, i) => widgets[+i]);
    return md;
  }
  function inlineMarkdown(t) {
    if (!t) return '';
    t = escapeHtml(t);
    t = t.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
    t = t.replace(/\*\*([^*]+)\*\*/g, (_m, c) => `<strong>${c}</strong>`);
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, (_m, lead, c) => `${lead}<em>${c}</em>`);
    return t;
  }

  const styles = `/* (same CSS you already have) */`;
  function injectStylesOnce() {
    if ($('#bstudy-style')) return;
    const el = document.createElement('style');
    el.id = 'bstudy-style';
    el.textContent = styles;
    document.head.appendChild(el);
  }

  const splitSlides = (md) => md.split(/^#\s+/gm).filter(s => s.trim()).map(p => `# ${p}`);

  function renderSlides(md, mountAt) {
    injectStylesOnce();
    document.body.classList.add('bstudy-mounted');

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

    mountAt.replaceWith(controls, container, bprog, nextBtn, hint);

    const htmlEl = document.documentElement;
    let theme = localStorage.getItem('bstudy-theme') || 'light';
    htmlEl.setAttribute('data-theme', theme);
    updateThemeButton(theme);
    $('#bstudy-theme').addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', theme);
      localStorage.setItem('bstudy-theme', theme);
      updateThemeButton(theme);
    });

    // --- CHANGED: track bullet progress per slide; do NOT reset on scroll ---
    const slidesMd = splitSlides(md);
    const bulletState = new Array(slidesMd.length).fill(0); // per-slide progress
    let currentSlide = 0;

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

    function getBulletCount(idx = currentSlide) {
      const slide = $$('.bstudy-slide', container)[idx];
      return slide ? $$('li', slide).length : 0;
    }

    function updateThemeButton(t) {
      const icon = $('#bstudy-theme-icon'), text = $('#bstudy-theme-text');
      if (t === 'dark') { icon.textContent='☀️'; text.textContent='Light'; }
      else { icon.textContent='🌙'; text.textContent='Dark'; }
    }

    function updateBulletVisibility() {
      const slides = $$('.bstudy-slide', container);
      const slide = slides[currentSlide];
      if (!slide) return;

      const bullets = $$('li', slide);
      const total = bullets.length;
      const prog = bulletState[currentSlide] || 0;

      bullets.forEach((li, idx) => li.classList.toggle('revealed', idx <= prog));

      const hasMore = total > 0 && prog < total - 1;
      const progEl = $('#bstudy-bprog');
      const btn = $('#bstudy-next');

      if (total > 0) {
        progEl.textContent = `${Math.min(prog + 1, total)} / ${total}`;
        progEl.classList.add('visible');
        if (hasMore) btn.classList.add('visible'); else btn.classList.remove('visible');
      } else {
        progEl.classList.remove('visible');
        btn.classList.remove('visible');
      }
    }

    function updateSlideCounter() {
      // compute active slide without mutating bullet progress
      currentSlide = Math.round(container.scrollTop / window.innerHeight);
      const totalSlides = $$('.bstudy-slide', container).length;
      $('#bstudy-counter').textContent = `${Math.min(currentSlide+1,totalSlides)} / ${totalSlides}`;
      // CRUCIAL: do NOT reset bullets here (fix)
      updateBulletVisibility();
    }

    function nextBullet() {
      const max = getBulletCount();
      if (bulletState[currentSlide] < max - 1) {
        bulletState[currentSlide] += 1;
        updateBulletVisibility();
        return true;
      }
      return false;
    }
    function previousBullet() {
      if (bulletState[currentSlide] > 0) {
        bulletState[currentSlide] -= 1;
        updateBulletVisibility();
        return true;
      }
      return false;
    }

    // Init
    updateSlideCounter();
    setTimeout(updateBulletVisibility, 50);

    container.addEventListener('scroll', updateSlideCounter);
    $('#bstudy-file').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      renderSlides(text, container); // re-render in place
    });
    $('#bstudy-next').addEventListener('click', () => { nextBullet(); });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.expand-btn');
      if (btn && btn.hasAttribute('data-expand')) expandPassage(btn.getAttribute('data-expand'));
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const slides = $$('.bstudy-slide', container);
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!nextBullet()) {} }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); previousBullet(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const prog = bulletState[currentSlide] || 0;
        const max = getBulletCount();
        if (prog >= max - 1 && currentSlide < slides.length - 1) {
          slides[currentSlide + 1].scrollIntoView({behavior:'smooth'});
        } else {
          nextBullet();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentSlide > 0) {
          slides[currentSlide - 1].scrollIntoView({behavior:'smooth'});
        }
      }
    });

    // Touch swipe
    let sx=0, sy=0, ex=0, ey=0;
    container.addEventListener('touchstart', (e) => {
      sx = e.changedTouches[0].screenX; sy = e.changedTouches[0].screenY;
    });
    container.addEventListener('touchend', (e) => {
      ex = e.changedTouches[0].screenX; ey = e.changedTouches[0].screenY;
      const dx = sx - ex, dy = sy - ey, thr = 50;
      const slides = $$('.bstudy-slide', container);
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > thr) nextBullet(); else if (dx < -thr) previousBullet();
      } else {
        if (dy > thr && currentSlide < slides.length - 1) slides[currentSlide + 1].scrollIntoView({behavior:'smooth'});
        else if (dy < -thr && currentSlide > 0) slides[currentSlide - 1].scrollIntoView({behavior:'smooth'});
      }
    });

    function expandPassage(id) {
      const holder = document.querySelector(`[data-id="${id}"]`);
      if (!holder) return;
      const ref = holder.getAttribute('data-reference');
      const g = holder.getAttribute('data-gateway-ref');
      const url = `https://www.biblegateway.com/passage/?search=${g}&version=NIV`;

      const overlay = document.createElement('div');
      overlay.className = 'passage-fullscreen';

      const close = document.createElement('button');
      close.className = 'bstudy-close';
      close.textContent = '✕ Close';
      close.onclick = () => overlay.remove();

      const content = document.createElement('div');
      content.className = 'passage-fullscreen-content';
      content.innerHTML = `
        <h1 style="color: var(--accent-primary); margin-bottom: 2rem;">${ref}</h1>
        <iframe src="${url}" style="width: 100%; height: 70vh; border: 2px solid var(--border-color); border-radius: 0.75rem;" title="${ref}"></iframe>
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

  function findMarkdownPre() {
    return document.querySelector('#biblestudy-md') || document.querySelector('[data-biblestudy]') || document.querySelector('pre');
  }
  function init() {
    const pre = findMarkdownPre();
    if (!pre) return;
    const md = pre.textContent || '';
    renderSlides(md, pre);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

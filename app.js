/* ─── app.js — Blog Frontend Logic ─────────────────────────────────────────── */

let allPosts     = [];
let activeCategory = 'All';

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initThemeToggle();
  const page = detectPage();
  if (page === 'about') { renderAboutPage(); return; }
  loadPosts().then(posts => {
    allPosts = posts;
    if (page === 'post') renderPostPage(posts);
    else renderHomePage(posts);
  });
});

// ─── Theme Toggle ──────────────────────────────────────────────────────────────
function initThemeToggle() {
  const saved = localStorage.getItem('blog_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('blog_theme', next);
  });
}

// ─── Navigation ────────────────────────────────────────────────────────────────
function initNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href    = a.getAttribute('href') || '';
    const isHome  = href.includes('index') || href === './' || href === '' || href === '/';
    const isAbout = href.includes('about');
    if (isHome  && (path.includes('index') || path === '/' || path.endsWith('/'))) a.classList.add('active');
    if (isAbout && path.includes('about')) a.classList.add('active');
  });
  document.querySelectorAll('.nav-brand').forEach(el => {
    el.innerHTML = CONFIG.blogName + '<span style="color:var(--text-secondary)">_</span>';
  });
}

// ─── Detect current page ───────────────────────────────────────────────────────
function detectPage() {
  const path = window.location.pathname;
  if (path.includes('post.html'))  return 'post';
  if (path.includes('about.html')) return 'about';
  return 'home';
}

// ─── Load posts.json ───────────────────────────────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(getBase() + 'posts.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    return [];
  }
}

function getBase() {
  const path  = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && !parts[0].includes('.html')) return '/' + parts[0] + '/';
  return './';
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
function renderHomePage(posts) {
  document.title = CONFIG.blogName;

  const heading = document.querySelector('.page-header h1');
  const sub     = document.querySelector('.page-header p');
  if (heading) heading.textContent = CONFIG.blogName;
  if (sub)     sub.textContent     = CONFIG.blogTagline;

  buildCategoryTabs();

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', filterAndRender);

  if (posts.length > 0) {
    renderHeroPost(posts[0]);
    renderPostCards(posts.slice(1));
  } else {
    renderPostCards([]);
  }
}

// ─── Hero Post ─────────────────────────────────────────────────────────────────
function renderHeroPost(post) {
  const wrap = document.getElementById('hero-post');
  if (!wrap) return;

  const base    = getBase();
  const postUrl = base + 'post.html?id=' + encodeURIComponent(post.id);
  const isNew   = isRecentPost(post);

  wrap.innerHTML = `
    ${post.featuredImage
      ? `<img class="hero-image" src="${escAttr(post.featuredImage)}" alt="${escHtml(post.title)}" onerror="this.style.display='none'">`
      : `<div class="hero-image-placeholder">> ${escHtml(post.category || 'FEATURED')}</div>`
    }
    <div class="hero-body">
      <div class="hero-top">
        <span class="hero-label">LATEST</span>
        <span class="category-badge">${escHtml(post.category || '')}</span>
        <span class="post-date">${formatDate(post.date)}</span>
        <span class="read-time">${post.readTime || 1} min read</span>
        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
      </div>
      <h2 class="hero-title">${escHtml(post.title)}</h2>
      <p class="hero-excerpt">${escHtml(post.excerpt || '')}</p>
      <div class="hero-footer post-tags">
        ${(post.tags || []).map(t => `<span class="tag" data-tag="${escAttr(t)}">#${escHtml(t)}</span>`).join('')}
      </div>
    </div>
  `;

  wrap.addEventListener('click', e => {
    if (e.target.classList.contains('tag')) return;
    window.location.href = postUrl;
  });

  wrap.querySelectorAll('.tag').forEach(tagEl => {
    tagEl.addEventListener('click', e => {
      e.stopPropagation();
      const searchInput = document.getElementById('search-input');
      if (searchInput) { searchInput.value = tagEl.dataset.tag; filterAndRender(); }
    });
  });
}

// ─── Category Tabs ─────────────────────────────────────────────────────────────
function buildCategoryTabs() {
  const wrap = document.querySelector('.category-tabs');
  if (!wrap) return;
  wrap.innerHTML = '';
  ['All', ...CONFIG.categories].forEach(cat => {
    const btn = document.createElement('button');
    btn.className          = 'cat-tab' + (cat === 'All' ? ' active' : '');
    btn.dataset.category   = cat;
    btn.textContent        = cat;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = cat;
      filterAndRender();
    });
    wrap.appendChild(btn);
  });
}

// ─── Filter + Search ───────────────────────────────────────────────────────────
function filterAndRender() {
  const searchInput = document.getElementById('search-input');
  const term        = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const isFiltering = term || activeCategory !== 'All';

  const filtered = allPosts.filter(post => {
    const matchCat = activeCategory === 'All' || post.category === activeCategory;
    if (!matchCat) return false;
    if (!term) return true;
    const haystack = [post.title, post.excerpt, post.content?.blocks
      ? post.content.blocks.map(b => b.data?.text || '').join(' ')
      : (post.content || ''),
      post.category, (post.tags || []).join(' ')].join(' ').toLowerCase();
    return haystack.includes(term);
  });

  const hero = document.getElementById('hero-post');
  if (isFiltering) {
    if (hero) hero.setAttribute('hidden', '');
    renderPostCards(filtered);
  } else {
    if (hero) hero.removeAttribute('hidden');
    if (filtered.length > 0) {
      renderHeroPost(filtered[0]);
      renderPostCards(filtered.slice(1));
    } else {
      renderPostCards([]);
    }
  }
}

// ─── Post Cards ────────────────────────────────────────────────────────────────
function renderPostCards(posts) {
  const grid     = document.getElementById('posts-grid');
  const noResult = document.getElementById('no-results');
  if (!grid) return;
  grid.innerHTML = '';
  if (posts.length === 0) {
    if (noResult) noResult.removeAttribute('hidden');
    return;
  }
  if (noResult) noResult.setAttribute('hidden', '');
  posts.forEach(post => grid.appendChild(createPostCard(post)));
}

function createPostCard(post) {
  const base    = getBase();
  const postUrl = base + 'post.html?id=' + encodeURIComponent(post.id);
  const isNew   = isRecentPost(post);

  const card = document.createElement('article');
  card.className  = 'post-card';
  card.setAttribute('role', 'link');
  card.setAttribute('tabindex', '0');
  card.addEventListener('click',   e => { if (!e.target.classList.contains('tag')) window.location.href = postUrl; });
  card.addEventListener('keydown', e => { if (e.key === 'Enter') window.location.href = postUrl; });

  const tagsHtml = (post.tags || [])
    .map(t => `<span class="tag" data-tag="${escAttr(t)}">#${escHtml(t)}</span>`).join('');

  card.innerHTML = `
    ${post.featuredImage ? `<div class="card-image" style="background-image:url('${escAttr(post.featuredImage)}')"></div>` : ''}
    <div class="post-card-meta">
      <span class="category-badge">${escHtml(post.category || '')}</span>
      <span class="post-date">${formatDate(post.date)}</span>
      <span class="read-time">${post.readTime || 1} min read</span>
    </div>
    <h2 class="post-card-title">${escHtml(post.title)}${isNew ? ' <span class="new-badge">NEW</span>' : ''}</h2>
    <p class="post-card-excerpt">${escHtml(post.excerpt || '')}</p>
    ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
  `;

  card.querySelectorAll('.tag').forEach(tagEl => {
    tagEl.addEventListener('click', e => {
      e.stopPropagation();
      const si = document.getElementById('search-input');
      if (si) { si.value = tagEl.dataset.tag; filterAndRender(); si.focus(); }
    });
  });

  return card;
}

// ─── Single Post Page ──────────────────────────────────────────────────────────
function renderPostPage(posts) {
  const id       = new URLSearchParams(window.location.search).get('id');
  const post     = posts.find(p => p.id === id);
  const notFound = document.getElementById('post-not-found');
  const content  = document.getElementById('post-content');

  if (!post) {
    if (content)  content.setAttribute('hidden', '');
    if (notFound) notFound.removeAttribute('hidden');
    return;
  }
  if (notFound) notFound.setAttribute('hidden', '');

  document.title = post.title + ' — ' + CONFIG.blogName;
  setMeta('description',    post.excerpt || post.title);
  setMeta('og:title',       post.title);
  setMeta('og:description', post.excerpt || '');
  setMeta('og:url',         window.location.href);

  const backLink = content.querySelector('.back-link');
  if (backLink) backLink.href = getBase() + 'index.html';

  // Featured hero image
  const heroSlot = content.querySelector('.post-hero-slot');
  if (heroSlot) {
    if (post.featuredImage) {
      heroSlot.innerHTML = `<img class="post-hero-image" src="${escAttr(post.featuredImage)}" alt="${escHtml(post.title)}" onerror="this.style.display='none'">`;
    } else {
      heroSlot.innerHTML = '';
    }
  }

  // Meta
  const metaRow = content.querySelector('.post-meta-row');
  if (metaRow) {
    metaRow.innerHTML = `
      <span class="category-badge">${escHtml(post.category || '')}</span>
      <span class="post-date">${formatDate(post.date)}</span>
      <span class="read-time">${post.readTime || 1} min read</span>
    `;
  }

  const titleEl = content.querySelector('.post-title');
  if (titleEl) titleEl.textContent = post.title;

  const tagsRow = content.querySelector('.post-tags-row');
  if (tagsRow) {
    tagsRow.innerHTML = (post.tags || []).map(t => `<span class="tag">#${escHtml(t)}</span>`).join('');
  }

  const bodyEl = content.querySelector('.post-body');
  if (bodyEl) bodyEl.innerHTML = renderBlocks(post.content);

  buildShareButtons(content, post);
  renderRelatedPosts(post, posts);
  initReadingProgress();
}

// ─── Block Renderer ────────────────────────────────────────────────────────────
function renderBlocks(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    return hasHtml ? content : '<p>' + content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  }
  if (content.blocks) return content.blocks.map(renderBlock).join('');
  return '';
}

function renderBlock(block) {
  const d = block.data || {};
  switch (block.type) {
    case 'header':
      return `<h${d.level||2}>${d.text||''}</h${d.level||2}>`;
    case 'paragraph':
      return `<p>${d.text||''}</p>`;
    case 'image': {
      const url     = d.file?.url || d.url || '';
      const caption = d.caption  || '';
      return `<figure><img src="${escAttr(url)}" alt="${escHtml(caption)}" onerror="this.style.display='none'">${caption ? `<figcaption>${escHtml(caption)}</figcaption>` : ''}</figure>`;
    }
    case 'list': {
      const tag   = d.style === 'ordered' ? 'ol' : 'ul';
      const items = (d.items || []).map(i => `<li>${i}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'quote':
      return `<blockquote><p>${d.text||''}</p>${d.caption ? `<cite>— ${escHtml(d.caption)}</cite>` : ''}</blockquote>`;
    case 'code':
      return `<pre><code>${escHtml(d.code||'')}</code></pre>`;
    case 'delimiter':
      return `<hr class="post-delimiter">`;
    case 'callout':
      return `<div class="callout-block">${d.text||''}</div>`;
    case 'takeaway':
      return `<div class="takeaway-block"><h4>Key Takeaway</h4><p>${d.text||''}</p></div>`;
    default:
      return d.text ? `<p>${d.text}</p>` : '';
  }
}

// ─── Related Posts ─────────────────────────────────────────────────────────────
function renderRelatedPosts(currentPost, posts) {
  const grid = document.getElementById('related-posts-grid');
  if (!grid) return;

  const base    = getBase();
  const related = posts
    .filter(p => p.id !== currentPost.id && p.category === currentPost.category)
    .slice(0, 3);

  const fallback = posts
    .filter(p => p.id !== currentPost.id && !related.includes(p))
    .slice(0, 3 - related.length);

  const final = [...related, ...fallback].slice(0, 3);

  if (final.length === 0) {
    const section = document.querySelector('.related-posts');
    if (section) section.setAttribute('hidden', '');
    return;
  }

  grid.innerHTML = '';
  final.forEach(post => {
    const postUrl = base + 'post.html?id=' + encodeURIComponent(post.id);
    const card    = document.createElement('div');
    card.className = 'related-post-card';
    card.innerHTML = `
      ${post.featuredImage ? `<div class="related-card-image" style="background-image:url('${escAttr(post.featuredImage)}')"></div>` : ''}
      <span class="category-badge">${escHtml(post.category||'')}</span>
      <div class="related-card-title">${escHtml(post.title)}</div>
      <div class="related-card-meta">${formatDate(post.date)} · ${post.readTime||1} min</div>
    `;
    card.addEventListener('click', () => window.location.href = postUrl);
    grid.appendChild(card);
  });
}

// ─── Reading Progress Bar ──────────────────────────────────────────────────────
function initReadingProgress() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const el     = document.documentElement;
    const scrolled = el.scrollTop || document.body.scrollTop;
    const total    = el.scrollHeight - el.clientHeight;
    bar.style.width = total > 0 ? Math.min(100, (scrolled / total) * 100) + '%' : '0%';
  }, { passive: true });
}

// ─── Social Share ──────────────────────────────────────────────────────────────
function buildShareButtons(container, post) {
  const wrap = container.querySelector('.share-buttons');
  if (!wrap) return;

  const pageUrl   = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(post.title);

  const buttons = [
    {
      cls: 'twitter', label: 'Share on X',
      url: `https://twitter.com/intent/tweet?text=${pageTitle}&url=${pageUrl}`,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
    },
    {
      cls: 'linkedin', label: 'Share on LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
    },
    {
      cls: 'whatsapp', label: 'Share on WhatsApp',
      url: `https://wa.me/?text=${pageTitle}%20${pageUrl}`,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
    }
  ];

  wrap.innerHTML = '';
  buttons.forEach(btn => {
    const a = document.createElement('a');
    a.href      = btn.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = `share-btn ${btn.cls}`;
    a.innerHTML = btn.icon + btn.label;
    wrap.appendChild(a);
  });
}

// ─── About Page ────────────────────────────────────────────────────────────────
function renderAboutPage() {
  document.title = 'About — ' + CONFIG.blogName;

  const titleEl = document.querySelector('.about-intro h1');
  if (titleEl) titleEl.textContent = CONFIG.aboutTitle;

  const bodyEl = document.getElementById('about-body');
  if (bodyEl) bodyEl.innerHTML = CONFIG.aboutContent;

  const tagline = document.getElementById('about-tagline');
  if (tagline) tagline.textContent = CONFIG.blogTagline;

  const imgSlot = document.querySelector('.profile-photo-slot');
  if (imgSlot) {
    imgSlot.innerHTML = CONFIG.aboutProfileImage
      ? `<img src="${getBase()}${CONFIG.aboutProfileImage}" alt="${escHtml(CONFIG.authorName)}" class="profile-photo" onerror="this.parentElement.innerHTML='<div class=profile-photo-placeholder>${escHtml(CONFIG.authorName[0])}</div>'">`
      : `<div class="profile-photo-placeholder">${escHtml(CONFIG.authorName[0])}</div>`;
  }

  const socialWrap = document.getElementById('social-links');
  if (socialWrap) {
    socialWrap.innerHTML = '';
    if (CONFIG.twitterHandle) {
      socialWrap.innerHTML += `<a href="https://twitter.com/${CONFIG.twitterHandle.replace('@','')}" target="_blank" rel="noopener" class="social-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        ${CONFIG.twitterHandle}</a>`;
    }
    if (CONFIG.linkedinUrl) {
      socialWrap.innerHTML += `<a href="${CONFIG.linkedinUrl}" target="_blank" rel="noopener" class="social-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        LinkedIn</a>`;
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isRecentPost(post) {
  return post.timestamp && (Date.now() - post.timestamp) < 3 * 24 * 60 * 60 * 1000;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/* ─── app.js — Blog Frontend Logic ─────────────────────────────────────────── */

let allPosts = [];
let activeCategory = 'All';

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const page = detectPage();
  if (page === 'about') { renderAboutPage(); return; }
  loadPosts().then(posts => {
    allPosts = posts;
    if (page === 'post') renderPostPage(posts);
    else renderHomePage(posts);
  });
});

// ─── Navigation ────────────────────────────────────────────────────────────────
function initNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const isHome  = href.includes('index') || href === './' || href === '' || href === '/';
    const isAbout = href.includes('about');
    if (isHome  && (path.includes('index') || path === '/' || path.endsWith('/'))) a.classList.add('active');
    if (isAbout && path.includes('about')) a.classList.add('active');
  });
  // Inject blog name into nav brand
  const brand = document.querySelector('.nav-brand');
  if (brand) brand.innerHTML = CONFIG.blogName.replace(' ', '<span>_</span>');
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
    const base = getBase();
    const res  = await fetch(base + 'posts.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed to load posts');
    return await res.json();
  } catch (e) {
    console.error('Could not load posts.json:', e);
    return [];
  }
}

// Figure out the base path so links work both locally and on GitHub Pages
function getBase() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  // On GitHub Pages the path is /repo-name/page.html
  // Locally it might be /page.html or C:/.../page.html
  if (parts.length >= 2 && !parts[0].includes('.html')) {
    return '/' + parts[0] + '/';
  }
  return './';
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
function renderHomePage(posts) {
  // Page title & tagline
  const heading = document.querySelector('.page-header h1');
  const sub     = document.querySelector('.page-header p');
  if (heading) heading.textContent = CONFIG.blogName;
  if (sub)     sub.textContent     = CONFIG.blogTagline;

  buildCategoryTabs();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterAndRender);
  }

  renderPostCards(posts);
}

// ─── Category Tabs ─────────────────────────────────────────────────────────────
function buildCategoryTabs() {
  const wrap = document.querySelector('.category-tabs');
  if (!wrap) return;
  wrap.innerHTML = '';

  const all = ['All', ...CONFIG.categories];
  all.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (cat === 'All' ? ' active' : '');
    btn.dataset.category = cat;
    btn.textContent = cat;
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
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = allPosts.filter(post => {
    const matchCat = activeCategory === 'All' || post.category === activeCategory;
    if (!matchCat) return false;
    if (!term) return true;
    const haystack = [
      post.title,
      post.excerpt,
      post.content,
      post.category,
      (post.tags || []).join(' ')
    ].join(' ').toLowerCase();
    return haystack.includes(term);
  });

  renderPostCards(filtered);
}

// ─── Render Post Cards ─────────────────────────────────────────────────────────
function renderPostCards(posts) {
  const grid      = document.getElementById('posts-grid');
  const noResults = document.getElementById('no-results');
  if (!grid) return;

  grid.innerHTML = '';

  if (posts.length === 0) {
    if (noResults) noResults.removeAttribute('hidden');
    return;
  }
  if (noResults) noResults.setAttribute('hidden', '');

  posts.forEach(post => grid.appendChild(createPostCard(post)));
}

function createPostCard(post) {
  const base    = getBase();
  const postUrl = base + 'post.html?id=' + encodeURIComponent(post.id);

  const card = document.createElement('article');
  card.className = 'post-card';
  card.setAttribute('role', 'link');
  card.setAttribute('tabindex', '0');
  card.addEventListener('click',   () => window.location.href = postUrl);
  card.addEventListener('keydown', e => { if (e.key === 'Enter') window.location.href = postUrl; });

  const tagsHtml = (post.tags || []).map(t =>
    `<span class="tag" data-tag="${escHtml(t)}">#${escHtml(t)}</span>`
  ).join('');

  card.innerHTML = `
    <div class="post-card-meta">
      <span class="category-badge">${escHtml(post.category || '')}</span>
      <span class="post-date">${formatDate(post.date)}</span>
      <span class="read-time">${post.readTime || 1} min read</span>
    </div>
    <h2 class="post-card-title">${escHtml(post.title)}</h2>
    <p class="post-card-excerpt">${escHtml(post.excerpt || '')}</p>
    ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
  `;

  // Tag clicks: set search to that tag
  card.querySelectorAll('.tag').forEach(tagEl => {
    tagEl.addEventListener('click', e => {
      e.stopPropagation();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = tagEl.dataset.tag;
        filterAndRender();
        searchInput.focus();
      }
    });
  });

  return card;
}

// ─── Single Post Page ──────────────────────────────────────────────────────────
function renderPostPage(posts) {
  const params  = new URLSearchParams(window.location.search);
  const id      = params.get('id');
  const post    = posts.find(p => p.id === id);
  const notFound = document.getElementById('post-not-found');
  const content  = document.getElementById('post-content');

  if (!post) {
    if (content)  content.setAttribute('hidden', '');
    if (notFound) notFound.removeAttribute('hidden');
    return;
  }

  if (notFound) notFound.setAttribute('hidden', '');

  // Update page title & meta
  document.title = post.title + ' — ' + CONFIG.blogName;
  setMeta('description', post.excerpt || post.title);
  setMeta('og:title',       post.title);
  setMeta('og:description', post.excerpt || '');
  setMeta('og:url',         window.location.href);

  // Back link
  const backLink = content.querySelector('.back-link');
  if (backLink) backLink.href = getBase() + 'index.html';

  // Meta row
  const metaRow = content.querySelector('.post-meta-row');
  if (metaRow) {
    metaRow.innerHTML = `
      <span class="category-badge">${escHtml(post.category || '')}</span>
      <span class="post-date">${formatDate(post.date)}</span>
      <span class="read-time">${post.readTime || 1} min read</span>
    `;
  }

  // Title
  const titleEl = content.querySelector('.post-title');
  if (titleEl) titleEl.textContent = post.title;

  // Tags
  const tagsRow = content.querySelector('.post-tags-row');
  if (tagsRow) {
    tagsRow.innerHTML = (post.tags || []).map(t =>
      `<span class="tag">#${escHtml(t)}</span>`
    ).join('');
  }

  // Body — content is stored as HTML or plain text
  const bodyEl = content.querySelector('.post-body');
  if (bodyEl) {
    // If content looks like plain text (no HTML tags), convert newlines to <br>
    const hasHtml = /<[a-z][\s\S]*>/i.test(post.content);
    bodyEl.innerHTML = hasHtml
      ? post.content
      : post.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  // Social share
  buildShareButtons(content, post);
}

function buildShareButtons(container, post) {
  const shareWrap = container.querySelector('.share-buttons');
  if (!shareWrap) return;

  const pageUrl   = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(post.title);

  const buttons = [
    {
      cls:  'twitter',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
      label: 'Share on X',
      url:  `https://twitter.com/intent/tweet?text=${pageTitle}&url=${pageUrl}`
    },
    {
      cls:  'linkedin',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
      label: 'Share on LinkedIn',
      url:  `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`
    },
    {
      cls:  'whatsapp',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
      label: 'Share on WhatsApp',
      url:  `https://wa.me/?text=${pageTitle}%20${pageUrl}`
    }
  ];

  shareWrap.innerHTML = '';
  buttons.forEach(btn => {
    const a = document.createElement('a');
    a.href        = btn.url;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.className   = `share-btn ${btn.cls}`;
    a.innerHTML   = btn.icon + btn.label;
    shareWrap.appendChild(a);
  });
}

// ─── About Page ────────────────────────────────────────────────────────────────
function renderAboutPage() {
  document.title = 'About — ' + CONFIG.blogName;

  const titleEl = document.querySelector('.about-intro h1');
  if (titleEl) titleEl.textContent = CONFIG.aboutTitle;

  const bodyEl = document.querySelector('.about-body');
  if (bodyEl) bodyEl.innerHTML = CONFIG.aboutContent;

  // Profile photo
  const imgContainer = document.querySelector('.profile-photo-slot');
  if (imgContainer) {
    if (CONFIG.aboutProfileImage) {
      imgContainer.innerHTML = `<img src="${getBase()}${CONFIG.aboutProfileImage}" alt="${escHtml(CONFIG.authorName)}" class="profile-photo" onerror="this.parentElement.innerHTML='<div class=profile-photo-placeholder>${escHtml(CONFIG.authorName[0])}</div>'">`;
    } else {
      imgContainer.innerHTML = `<div class="profile-photo-placeholder">${escHtml(CONFIG.authorName[0])}</div>`;
    }
  }

  // Social links
  const socialWrap = document.querySelector('.social-links');
  if (socialWrap) {
    socialWrap.innerHTML = '';
    if (CONFIG.twitterHandle) {
      socialWrap.innerHTML += `<a href="https://twitter.com/${CONFIG.twitterHandle.replace('@','')}" target="_blank" rel="noopener" class="social-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        ${CONFIG.twitterHandle}
      </a>`;
    }
    if (CONFIG.linkedinUrl) {
      socialWrap.innerHTML += `<a href="${CONFIG.linkedinUrl}" target="_blank" rel="noopener" class="social-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        LinkedIn
      </a>`;
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return dateStr; }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

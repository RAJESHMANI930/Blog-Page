/* ─── admin.js — Admin Panel Logic ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', initAdmin);

function initAdmin() {
  populateCategoryDropdown();

  // Restore saved token
  const savedToken = localStorage.getItem('gh_token');
  if (savedToken) {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) tokenInput.value = savedToken;
  }

  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('admin-password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('post-form').addEventListener('submit', handlePublish);
}

// ─── Category Dropdown ─────────────────────────────────────────────────────────
function populateCategoryDropdown() {
  const sel = document.getElementById('post-category');
  if (!sel) return;
  sel.innerHTML = '';
  CONFIG.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function handleLogin() {
  const input = document.getElementById('admin-password-input');
  const error = document.getElementById('login-error');
  const val   = input ? input.value : '';

  if (val === CONFIG.adminPassword) {
    document.getElementById('login-screen').setAttribute('hidden', '');
    document.getElementById('admin-panel').removeAttribute('hidden');
    loadRecentPosts();
  } else {
    if (error) {
      error.textContent = '> ACCESS DENIED. Try again.';
      input.value = '';
      input.focus();
      // Brief shake
      input.style.animation = 'none';
      requestAnimationFrame(() => { input.style.animation = ''; });
    }
  }
}

// ─── Publish ───────────────────────────────────────────────────────────────────
async function handlePublish(e) {
  e.preventDefault();

  const title    = document.getElementById('post-title').value.trim();
  const category = document.getElementById('post-category').value;
  const tagsRaw  = document.getElementById('post-tags').value;
  const excerpt  = document.getElementById('post-excerpt').value.trim();
  const content  = document.getElementById('post-content').value.trim();
  const token    = document.getElementById('github-token').value.trim();

  if (!title)   { setStatus('error', '> ERROR: Title is required.'); return; }
  if (!content) { setStatus('error', '> ERROR: Content is required.'); return; }
  if (!token)   { setStatus('error', '> ERROR: GitHub token is required.'); return; }

  localStorage.setItem('gh_token', token);

  const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

  const slug      = slugify(title);
  const today     = todayStr();
  const id        = today + '-' + slug;
  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  const newPost = {
    id,
    title,
    slug,
    date:      today,
    timestamp: Date.now(),
    category,
    tags,
    excerpt:   excerpt || title,
    content,
    readTime
  };

  const publishBtn = document.getElementById('publish-btn');
  publishBtn.disabled = true;
  setStatus('loading', '> CONNECTING to GitHub...');

  try {
    const { content: currentPosts, sha } = await fetchPostsJson(token);
    setStatus('loading', '> WRITING post to repository...');

    const updated = [newPost, ...currentPosts];
    await writePostsJson(updated, sha, token, title);

    setStatus('success', `> SUCCESS! "${title}" is live. GitHub Pages rebuilds in ~30 seconds.`);
    document.getElementById('post-form').reset();
    populateCategoryDropdown();
    // Re-fill token (form reset clears it)
    document.getElementById('github-token').value = token;

    setTimeout(loadRecentPosts, 5000);
  } catch (err) {
    console.error(err);
    if (err.message.includes('409')) {
      setStatus('error', '> CONFLICT: posts.json changed mid-publish. Please try again.');
    } else if (err.message.includes('401') || err.message.includes('403')) {
      setStatus('error', '> AUTH ERROR: GitHub token is invalid or expired. Check your token.');
    } else if (err.message.includes('404')) {
      setStatus('error', '> NOT FOUND: Check githubUsername and githubRepo in config.js.');
    } else {
      setStatus('error', '> ERROR: ' + err.message);
    }
  } finally {
    publishBtn.disabled = false;
  }
}

// ─── GitHub API: Read posts.json ───────────────────────────────────────────────
async function fetchPostsJson(token) {
  const url = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.githubRepo}/contents/posts.json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'token ' + token,
      'Accept':        'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(res.status + ' ' + (body.message || res.statusText));
  }

  const data    = await res.json();
  const decoded = JSON.parse(atob(data.content.replace(/\n/g, '')));
  return { content: decoded, sha: data.sha };
}

// ─── GitHub API: Write posts.json ─────────────────────────────────────────────
async function writePostsJson(posts, sha, token, postTitle) {
  const url = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.githubRepo}/contents/posts.json`;

  const body = JSON.stringify({
    message: `New post: ${postTitle}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2)))),
    sha,
    branch: CONFIG.githubBranch
  });

  const res = await fetch(url, {
    method:  'PUT',
    headers: {
      'Authorization': 'token ' + token,
      'Content-Type':  'application/json',
      'Accept':        'application/vnd.github.v3+json'
    },
    body
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(res.status + ' ' + (errBody.message || res.statusText));
  }
}

// ─── Recent Posts Preview ──────────────────────────────────────────────────────
async function loadRecentPosts() {
  const token = localStorage.getItem('gh_token') || document.getElementById('github-token').value.trim();
  if (!token) return;

  try {
    const { content: posts } = await fetchPostsJson(token);
    const wrap = document.getElementById('recent-posts-list');
    if (!wrap) return;

    const recent = posts.slice(0, 5);
    if (recent.length === 0) {
      wrap.innerHTML = '<p style="color:var(--text-secondary);font-size:0.8rem">No posts yet. Be the first!</p>';
      return;
    }
    wrap.innerHTML = recent.map(p => `
      <div class="recent-post-item">
        <span class="recent-post-title">${escAdmin(p.title)}</span>
        <span class="recent-post-meta">${p.date} &middot; ${p.category}</span>
      </div>
    `).join('');
  } catch {
    // Non-critical — silently skip if token not yet set
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(type, message) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.className = 'status-bar ' + type;
  bar.textContent = message;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escAdmin(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

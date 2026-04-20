/* ─── admin.js — Full Admin Logic ───────────────────────────────────────────── */

/* ── Templates ────────────────────────────────────────────────────────────── */
const TEMPLATES = {
  ai: [
    { type: 'header',    data: { text: '🤖 [AI Tool/Company] Just [Did Something]', level: 2 } },
    { type: 'paragraph', data: { text: 'Quick context: what is this tool/company and why does it matter?' } },
    { type: 'callout',   data: { text: '📌 The key announcement: summarize in 1–2 sentences.' } },
    { type: 'header',    data: { text: 'What Actually Changed', level: 3 } },
    { type: 'list',      data: { style: 'unordered', items: ['Change 1', 'Change 2', 'Change 3'] } },
    { type: 'header',    data: { text: 'Why This Matters', level: 3 } },
    { type: 'paragraph', data: { text: 'Explain the impact for regular people / developers / businesses.' } },
    { type: 'takeaway',  data: { text: 'Your one-line verdict on this update.' } }
  ],
  tech: [
    { type: 'header',    data: { text: '[Company/Product]: [What Happened]', level: 2 } },
    { type: 'paragraph', data: { text: 'The news in one sentence.' } },
    { type: 'header',    data: { text: 'The Full Story', level: 3 } },
    { type: 'paragraph', data: { text: 'Background and details...' } },
    { type: 'quote',     data: { text: 'An interesting quote from the announcement.', caption: 'Source' } },
    { type: 'header',    data: { text: 'My Take', level: 3 } },
    { type: 'paragraph', data: { text: 'Your personal opinion on this news.' } },
    { type: 'takeaway',  data: { text: 'Watch this space: what to expect next.' } }
  ],
  opinion: [
    { type: 'header',    data: { text: 'A Bold Statement About [Topic]', level: 2 } },
    { type: 'paragraph', data: { text: 'Hook paragraph — a strong opening that makes the reader want to continue.' } },
    { type: 'header',    data: { text: "Here's Why", level: 3 } },
    { type: 'paragraph', data: { text: 'First argument...' } },
    { type: 'delimiter', data: {} },
    { type: 'paragraph', data: { text: 'Second argument...' } },
    { type: 'delimiter', data: {} },
    { type: 'paragraph', data: { text: 'Third argument...' } },
    { type: 'header',    data: { text: 'What I Think Should Happen', level: 3 } },
    { type: 'paragraph', data: { text: 'Your conclusion and call to action.' } },
    { type: 'takeaway',  data: { text: 'The one thing you want the reader to remember.' } }
  ],
  tutorial: [
    { type: 'header',    data: { text: 'How to [Do Something] in [Easy Way]', level: 2 } },
    { type: 'paragraph', data: { text: "What you'll learn and why it's useful." } },
    { type: 'callout',   data: { text: '⚡ Prerequisites: What the reader needs before starting.' } },
    { type: 'header',    data: { text: 'Step 1: [First Action]', level: 3 } },
    { type: 'paragraph', data: { text: 'Explain step 1...' } },
    { type: 'header',    data: { text: 'Step 2: [Second Action]', level: 3 } },
    { type: 'paragraph', data: { text: 'Explain step 2...' } },
    { type: 'header',    data: { text: 'Step 3: [Third Action]', level: 3 } },
    { type: 'paragraph', data: { text: 'Explain step 3...' } },
    { type: 'header',    data: { text: "You're Done!", level: 3 } },
    { type: 'paragraph', data: { text: 'What the reader has now achieved.' } },
    { type: 'takeaway',  data: { text: 'Summary of what was built/learned.' } }
  ],
  quick: [
    { type: 'header',    data: { text: '[Topic]: My Quick Take', level: 2 } },
    { type: 'paragraph', data: { text: 'The thing you want to talk about, in 2–3 sentences.' } },
    { type: 'callout',   data: { text: "💭 The interesting angle most people are missing." } },
    { type: 'paragraph', data: { text: 'Your brief thoughts. Keep it punchy.' } },
    { type: 'takeaway',  data: { text: "One line. That's your whole point." } }
  ]
};

/* ── State ────────────────────────────────────────────────────────────────── */
let editor        = null;
let editingPostId = null;   // null = new post, string = editing existing

/* ── Boot ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAdmin);

function initAdmin() {
  populateCategoryDropdown();

  // Restore saved token
  const savedToken = localStorage.getItem('gh_token');
  if (savedToken) document.getElementById('github-token').value = savedToken;

  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('admin-password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
}

/* ── Category Dropdown ────────────────────────────────────────────────────── */
function populateCategoryDropdown() {
  const sel = document.getElementById('post-category');
  sel.innerHTML = '';
  CONFIG.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = cat;
    sel.appendChild(opt);
  });
}

/* ── Login ────────────────────────────────────────────────────────────────── */
function handleLogin() {
  const input = document.getElementById('admin-password-input');
  const error = document.getElementById('login-error');
  if (input.value === CONFIG.adminPassword) {
    document.getElementById('login-screen').setAttribute('hidden', '');
    document.getElementById('admin-panel').removeAttribute('hidden');
    initAdminPanel();
  } else {
    error.textContent = '> ACCESS DENIED. Try again.';
    input.value = '';
    input.focus();
  }
}

/* ── Init Panel (after login) ─────────────────────────────────────────────── */
function initAdminPanel() {
  initEditor();
  initTabs();
  initTemplatePicker();
  initImagePreview();
  initDraftBanner();

  document.getElementById('preview-btn').addEventListener('click', handlePreview);
  document.getElementById('save-draft-btn').addEventListener('click', handleSaveDraft);
  document.getElementById('publish-btn').addEventListener('click', handlePublish);
  document.getElementById('preview-close-btn').addEventListener('click', () => {
    document.getElementById('preview-overlay').setAttribute('hidden', '');
  });
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
  document.getElementById('confirm-no-btn').addEventListener('click', () => {
    document.getElementById('confirm-overlay').setAttribute('hidden', '');
  });
  document.getElementById('refresh-posts-btn').addEventListener('click', loadMyPosts);
}

/* ── Editor.js Init ───────────────────────────────────────────────────────── */
function initEditor(initialBlocks) {
  if (editor) { editor.destroy(); editor = null; }

  editor = new EditorJS({
    holder: 'editorjs-container',
    placeholder: 'Click here and start writing, or pick a template above...',
    tools: {
      header:     { class: Header,     inlineToolbar: true,
                    config: { levels: [2, 3], defaultLevel: 2 } },
      list:       { class: List,       inlineToolbar: true },
      quote:      { class: Quote,      inlineToolbar: true },
      code:       { class: CodeTool },
      delimiter:  { class: Delimiter },
      inlineCode: { class: InlineCode },
      image: {
        class: ImageTool,
        config: {
          uploader: {
            uploadByUrl(url) {
              return Promise.resolve({ success: 1, file: { url } });
            },
            uploadByFile() {
              return Promise.resolve({
                success: 0,
                message: 'File upload not supported. Please use an image URL instead.'
              });
            }
          }
        }
      },
      callout:  { class: CalloutTool },
      takeaway: { class: TakeawayTool }
    },
    data: initialBlocks ? { blocks: initialBlocks } : undefined,
    onReady() {
      if (!initialBlocks) {
        loadTemplate('ai');
      }
    }
  });
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.setAttribute('hidden', ''));
      tab.classList.add('active');
      const panelId = 'tab-' + tab.dataset.tab;
      document.getElementById(panelId).removeAttribute('hidden');
      if (tab.dataset.tab === 'myposts') loadMyPosts();
    });
  });
}

/* ── Template Picker ──────────────────────────────────────────────────────── */
function initTemplatePicker() {
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loadTemplate(card.dataset.template);
    });
  });
}

function loadTemplate(name) {
  const blocks = TEMPLATES[name];
  if (!blocks || !editor) return;
  editor.blocks.render({ blocks });
}

/* ── Image Preview ────────────────────────────────────────────────────────── */
function initImagePreview() {
  const input   = document.getElementById('post-image');
  const wrap    = document.getElementById('image-preview');
  const img     = document.getElementById('image-preview-img');
  input.addEventListener('input', () => {
    const url = input.value.trim();
    if (url) { img.src = url; wrap.removeAttribute('hidden'); }
    else     { wrap.setAttribute('hidden', ''); }
  });
}

/* ── Draft Banner ─────────────────────────────────────────────────────────── */
function initDraftBanner() {
  const draft = loadDraft();
  if (!draft) return;

  const banner = document.getElementById('draft-banner');
  banner.removeAttribute('hidden');

  document.getElementById('resume-draft-btn').addEventListener('click', () => {
    banner.setAttribute('hidden', '');
    restoreDraft(draft);
  });
  document.getElementById('dismiss-draft-btn').addEventListener('click', () => {
    localStorage.removeItem('blog_draft');
    banner.setAttribute('hidden', '');
  });
}

/* ── Preview ──────────────────────────────────────────────────────────────── */
async function handlePreview() {
  if (!editor) return;
  let data;
  try { data = await editor.save(); } catch { return; }

  const title    = document.getElementById('post-title').value.trim() || '(No title)';
  const imageUrl = document.getElementById('post-image').value.trim();

  document.getElementById('preview-title').textContent = title;
  document.getElementById('preview-body').innerHTML    = renderBlocks({ blocks: data.blocks });

  const heroImg = document.getElementById('preview-hero-img');
  if (imageUrl) { heroImg.src = imageUrl; heroImg.style.display = 'block'; }
  else          { heroImg.style.display = 'none'; }

  document.getElementById('preview-overlay').removeAttribute('hidden');
}

/* ── Save Draft ───────────────────────────────────────────────────────────── */
async function handleSaveDraft() {
  if (!editor) return;
  let data;
  try { data = await editor.save(); } catch { setStatus('error', '> ERROR: Could not read editor.'); return; }

  const draft = {
    title:         document.getElementById('post-title').value,
    category:      document.getElementById('post-category').value,
    tags:          document.getElementById('post-tags').value,
    excerpt:       document.getElementById('post-excerpt').value,
    featuredImage: document.getElementById('post-image').value,
    content:       data,
    savedAt:       new Date().toISOString()
  };
  localStorage.setItem('blog_draft', JSON.stringify(draft));
  setStatus('success', '> DRAFT SAVED to browser. It will be here when you return.');
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem('blog_draft')); } catch { return null; }
}

function restoreDraft(draft) {
  document.getElementById('post-title').value    = draft.title    || '';
  document.getElementById('post-category').value = draft.category || CONFIG.categories[0];
  document.getElementById('post-tags').value     = draft.tags     || '';
  document.getElementById('post-excerpt').value  = draft.excerpt  || '';
  document.getElementById('post-image').value    = draft.featuredImage || '';
  if (draft.featuredImage) {
    document.getElementById('image-preview-img').src = draft.featuredImage;
    document.getElementById('image-preview').removeAttribute('hidden');
  }
  if (draft.content && draft.content.blocks) {
    editor.blocks.render({ blocks: draft.content.blocks });
  }
  setStatus('idle', '> Draft restored. Continue where you left off.');
}

/* ── Publish / Update ─────────────────────────────────────────────────────── */
async function handlePublish() {
  if (!editor) return;

  const title        = document.getElementById('post-title').value.trim();
  const category     = document.getElementById('post-category').value;
  const tagsRaw      = document.getElementById('post-tags').value;
  const excerpt      = document.getElementById('post-excerpt').value.trim();
  const featuredImage= document.getElementById('post-image').value.trim();
  const token        = document.getElementById('github-token').value.trim();

  if (!title)  { setStatus('error', '> ERROR: Title is required.'); return; }
  if (!token)  { setStatus('error', '> ERROR: GitHub token is required.'); return; }

  let editorData;
  try { editorData = await editor.save(); } catch { setStatus('error', '> ERROR: Could not save editor content.'); return; }

  if (!editorData.blocks || editorData.blocks.length === 0) {
    setStatus('error', '> ERROR: Content is empty. Add at least one block.'); return;
  }

  localStorage.setItem('gh_token', token);

  const tags      = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const wordCount = editorData.blocks
    .filter(b => b.type === 'paragraph' || b.type === 'header')
    .map(b => (b.data.text || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  const publishBtn = document.getElementById('publish-btn');
  publishBtn.disabled = true;

  if (editingPostId) {
    await updatePost({ title, category, tags, excerpt, featuredImage, content: editorData, readTime, token });
  } else {
    await createPost({ title, category, tags, excerpt, featuredImage, content: editorData, readTime, token });
  }

  publishBtn.disabled = false;
}

async function createPost({ title, category, tags, excerpt, featuredImage, content, readTime, token }) {
  const slug  = slugify(title);
  const today = todayStr();
  const id    = today + '-' + slug;

  const newPost = {
    id, title, slug,
    date:      today,
    timestamp: Date.now(),
    category, tags,
    excerpt:  excerpt || title,
    featuredImage: featuredImage || '',
    status:   'published',
    content,
    readTime
  };

  setStatus('loading', '> CONNECTING to GitHub...');
  try {
    const { content: currentPosts, sha } = await fetchPostsJson(token);
    setStatus('loading', '> WRITING post...');
    await writePostsJson([newPost, ...currentPosts], sha, token, `New post: ${title}`);
    setStatus('success', `> SUCCESS! "${title}" is live in ~30 seconds.`);
    resetForm();
    localStorage.removeItem('blog_draft');
  } catch (err) {
    handleGitHubError(err);
  }
}

async function updatePost({ title, category, tags, excerpt, featuredImage, content, readTime, token }) {
  setStatus('loading', '> CONNECTING to GitHub...');
  try {
    const { content: currentPosts, sha } = await fetchPostsJson(token);
    const idx = currentPosts.findIndex(p => p.id === editingPostId);
    if (idx === -1) { setStatus('error', '> ERROR: Post not found in posts.json.'); return; }

    const updated = { ...currentPosts[idx], title, category, tags, excerpt,
      featuredImage: featuredImage || '', content, readTime };
    currentPosts[idx] = updated;

    setStatus('loading', '> UPDATING post...');
    await writePostsJson(currentPosts, sha, token, `Update post: ${title}`);
    setStatus('success', `> UPDATED! "${title}" is live in ~30 seconds.`);
    cancelEdit();
    localStorage.removeItem('blog_draft');
  } catch (err) {
    handleGitHubError(err);
  }
}

/* ── My Posts Tab ─────────────────────────────────────────────────────────── */
async function loadMyPosts() {
  const token = localStorage.getItem('gh_token') || document.getElementById('github-token').value.trim();
  const list  = document.getElementById('my-posts-list');
  const count = document.getElementById('posts-count');

  list.innerHTML  = '<p style="color:var(--text-secondary);font-family:var(--font-mono);font-size:0.82rem">Loading...</p>';
  count.textContent = '> Loading...';

  if (!token) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-family:var(--font-mono);font-size:0.82rem">&gt; Enter your GitHub token in the Write tab first.</p>';
    return;
  }

  try {
    const { content: posts } = await fetchPostsJson(token);
    count.textContent = `> ${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    if (posts.length === 0) {
      list.innerHTML = '<p style="color:var(--text-secondary);font-family:var(--font-mono);font-size:0.82rem">&gt; No posts yet. Go to the Write tab to create your first post!</p>';
      return;
    }

    list.innerHTML = '';
    posts.forEach(post => {
      const row = document.createElement('div');
      row.className = 'my-post-row';
      row.innerHTML = `
        <div class="my-post-info">
          <div class="my-post-title">${escAdmin(post.title)}</div>
          <div class="my-post-meta">${post.date} &middot; ${escAdmin(post.category)}</div>
        </div>
        <div class="my-post-actions">
          <button class="post-action-btn edit-btn" data-id="${escAdmin(post.id)}">EDIT</button>
          <button class="post-action-btn delete delete-btn" data-id="${escAdmin(post.id)}" data-title="${escAdmin(post.title)}">DELETE</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', () => handleEdit(btn.dataset.id)));
    list.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', () => confirmDelete(btn.dataset.id, btn.dataset.title)));

  } catch (err) {
    list.innerHTML = `<p style="color:var(--danger);font-family:var(--font-mono);font-size:0.82rem">&gt; ${err.message}</p>`;
  }
}

/* ── Edit Post ────────────────────────────────────────────────────────────── */
async function handleEdit(postId) {
  const token = localStorage.getItem('gh_token') || document.getElementById('github-token').value.trim();
  if (!token) { alert('Enter your GitHub token in the Write tab first.'); return; }

  try {
    const { content: posts } = await fetchPostsJson(token);
    const post = posts.find(p => p.id === postId);
    if (!post) { alert('Post not found.'); return; }

    // Switch to Write tab
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.setAttribute('hidden', ''));
    document.querySelector('[data-tab="write"]').classList.add('active');
    document.getElementById('tab-write').removeAttribute('hidden');

    // Fill fields
    document.getElementById('post-title').value    = post.title    || '';
    document.getElementById('post-category').value = post.category || CONFIG.categories[0];
    document.getElementById('post-tags').value     = (post.tags || []).join(', ');
    document.getElementById('post-excerpt').value  = post.excerpt  || '';
    document.getElementById('post-image').value    = post.featuredImage || '';
    if (post.featuredImage) {
      document.getElementById('image-preview-img').src = post.featuredImage;
      document.getElementById('image-preview').removeAttribute('hidden');
    }

    // Load blocks into editor
    const blocks = typeof post.content === 'object' && post.content.blocks
      ? post.content.blocks
      : [{ type: 'paragraph', data: { text: typeof post.content === 'string' ? post.content : '' } }];

    await editor.blocks.render({ blocks });

    // Set edit state
    editingPostId = postId;
    document.getElementById('edit-mode-banner').removeAttribute('hidden');
    document.getElementById('edit-post-title-label').textContent = post.title;
    document.getElementById('publish-btn').textContent = '[ UPDATE POST ]';
    setStatus('idle', `> Editing: "${post.title}". Make your changes and click Update Post.`);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('Error loading post: ' + err.message);
  }
}

function cancelEdit() {
  editingPostId = null;
  document.getElementById('edit-mode-banner').setAttribute('hidden', '');
  document.getElementById('publish-btn').textContent = '[ PUBLISH POST ]';
  resetForm();
  setStatus('idle', '> Edit cancelled. Ready to write a new post.');
}

/* ── Delete Post ──────────────────────────────────────────────────────────── */
function confirmDelete(postId, postTitle) {
  document.getElementById('confirm-post-title').textContent = `"${postTitle}"`;
  document.getElementById('confirm-overlay').removeAttribute('hidden');

  const yesBtn = document.getElementById('confirm-yes-btn');
  const newYes = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYes, yesBtn);
  newYes.addEventListener('click', () => {
    document.getElementById('confirm-overlay').setAttribute('hidden', '');
    handleDelete(postId, postTitle);
  });
}

async function handleDelete(postId, postTitle) {
  const token = localStorage.getItem('gh_token') || document.getElementById('github-token').value.trim();
  if (!token) { alert('Enter your GitHub token in the Write tab first.'); return; }

  try {
    const { content: posts, sha } = await fetchPostsJson(token);
    const updated = posts.filter(p => p.id !== postId);
    await writePostsJson(updated, sha, token, `Delete post: ${postTitle}`);
    await loadMyPosts();
  } catch (err) {
    alert('Error deleting post: ' + err.message);
  }
}

/* ── GitHub API ───────────────────────────────────────────────────────────── */
async function fetchPostsJson(token) {
  const url = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.githubRepo}/contents/posts.json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(res.status + ' ' + (body.message || res.statusText));
  }
  const data = await res.json();
  const decoded = JSON.parse(atob(data.content.replace(/\n/g, '')));
  return { content: decoded, sha: data.sha };
}

async function writePostsJson(posts, sha, token, message) {
  const url = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.githubRepo}/contents/posts.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2)))),
      sha,
      branch: CONFIG.githubBranch
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(res.status + ' ' + (body.message || res.statusText));
  }
}

/* ── Block Renderer (shared with app.js concept, used for Preview) ─────────── */
function renderBlocks(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    return hasHtml ? content : content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }
  if (content.blocks) {
    return content.blocks.map(renderBlock).join('');
  }
  return '';
}

function renderBlock(block) {
  const d = block.data || {};
  switch (block.type) {
    case 'header':
      return `<h${d.level || 2}>${d.text || ''}</h${d.level || 2}>`;
    case 'paragraph':
      return `<p>${d.text || ''}</p>`;
    case 'image':
      return `<figure><img src="${escAttr(d.file?.url || d.url || '')}" alt="${escAttr(d.caption || '')}"><figcaption>${d.caption || ''}</figcaption></figure>`;
    case 'list':
      const tag  = d.style === 'ordered' ? 'ol' : 'ul';
      const items = (d.items || []).map(i => `<li>${i}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    case 'quote':
      return `<blockquote><p>${d.text || ''}</p>${d.caption ? `<cite>— ${d.caption}</cite>` : ''}</blockquote>`;
    case 'code':
      return `<pre><code>${escHtmlAdmin(d.code || '')}</code></pre>`;
    case 'delimiter':
      return `<hr class="post-delimiter">`;
    case 'callout':
      return `<div class="callout-block">${d.text || ''}</div>`;
    case 'takeaway':
      return `<div class="takeaway-block"><h4>Key Takeaway</h4><p>${d.text || ''}</p></div>`;
    default:
      return d.text ? `<p>${d.text}</p>` : '';
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function resetForm() {
  document.getElementById('post-title').value   = '';
  document.getElementById('post-tags').value    = '';
  document.getElementById('post-excerpt').value = '';
  document.getElementById('post-image').value   = '';
  document.getElementById('image-preview').setAttribute('hidden', '');
  populateCategoryDropdown();
  loadTemplate('ai');
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  const first = document.querySelector('.template-card[data-template="ai"]');
  if (first) first.classList.add('active');
}

function setStatus(type, message) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.className   = 'status-bar ' + type;
  bar.textContent = message;
}

function handleGitHubError(err) {
  const msg = err.message || '';
  if (msg.includes('409')) setStatus('error', '> CONFLICT: File changed mid-publish. Try again.');
  else if (msg.includes('401') || msg.includes('403')) setStatus('error', '> AUTH ERROR: GitHub token invalid or expired.');
  else if (msg.includes('404')) setStatus('error', '> NOT FOUND: Check githubUsername and githubRepo in config.js.');
  else setStatus('error', '> ERROR: ' + msg);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80);
}

function todayStr() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function escAdmin(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escHtmlAdmin(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escAttr(str) {
  return String(str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

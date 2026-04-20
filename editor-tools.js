/* ─── editor-tools.js — Custom Editor.js Block Tools ───────────────────────── */

/* ── Callout Block ────────────────────────────────────────────────────────────
   A highlighted info/warning box. Renders with a yellow-amber left border.     */

class CalloutTool {
  static get toolbox() {
    return {
      title: 'Callout Box',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`
    };
  }

  constructor({ data, api }) {
    this.api  = api;
    this.data = { text: data.text || '' };
    this._el  = null;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      border-left: 3px solid #ffd700;
      background: rgba(255,215,0,0.06);
      border-radius: 0 6px 6px 0;
      padding: 14px 18px;
      margin: 4px 0;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 0.7rem; font-family: var(--font-mono, monospace);
      color: #ffd700; letter-spacing: 0.08em;
      text-transform: uppercase; margin-bottom: 8px;
    `;
    label.textContent = '📌 CALLOUT';

    const input = document.createElement('div');
    input.contentEditable = 'true';
    input.style.cssText = `
      outline: none; color: #e6edf3;
      font-size: 0.95rem; line-height: 1.6;
      min-height: 24px;
    `;
    input.innerHTML = this.data.text;
    input.dataset.placeholder = 'Add a callout message...';

    input.addEventListener('focus', () => {
      if (!input.textContent.trim()) input.innerHTML = '';
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    this._el = input;
    return wrapper;
  }

  save() {
    return { text: this._el ? this._el.innerHTML : this.data.text };
  }

  static get sanitize() {
    return { text: { br: true, b: true, i: true, a: true, code: true } };
  }
}


/* ── Key Takeaway Block ───────────────────────────────────────────────────────
   A green "Key Takeaway" box — meant for the end of posts.                    */

class TakeawayTool {
  static get toolbox() {
    return {
      title: 'Key Takeaway',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`
    };
  }

  constructor({ data, api }) {
    this.api  = api;
    this.data = { text: data.text || '' };
    this._el  = null;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      border: 1px solid rgba(0,255,136,0.35);
      background: rgba(0,255,136,0.05);
      border-radius: 6px;
      padding: 16px 20px;
      margin: 4px 0;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 0.7rem; font-family: var(--font-mono, monospace);
      color: #00ff88; letter-spacing: 0.08em;
      text-transform: uppercase; font-weight: 700;
      margin-bottom: 10px;
    `;
    label.textContent = '✅ KEY TAKEAWAY';

    const input = document.createElement('div');
    input.contentEditable = 'true';
    input.style.cssText = `
      outline: none; color: #e6edf3;
      font-size: 0.95rem; line-height: 1.6;
      min-height: 24px;
    `;
    input.innerHTML = this.data.text;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    this._el = input;
    return wrapper;
  }

  save() {
    return { text: this._el ? this._el.innerHTML : this.data.text };
  }

  static get sanitize() {
    return { text: { br: true, b: true, i: true, a: true, code: true } };
  }
}

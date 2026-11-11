/* ============================================================
   FinTrack — Utils
   Formatting, dates, icons, toasts, sheets helpers
   ============================================================ */
window.U = (function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pad = (n) => String(n).padStart(2, '0');

  const uid = (prefix = 'id') => {
    if (window.crypto && crypto.randomUUID) return prefix + '_' + crypto.randomUUID().slice(0, 8);
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  const escapeHTML = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

  /* ---------------- Money ---------------- */
  const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

  const fmtNumber = (n) => nf.format(Math.round(num(n)));

  const fmtMoney = (n, opts = {}) => {
    const value = Math.round(num(n));
    const sign = opts.sign && value > 0 ? '+' : '';
    return sign + 'Rp ' + nf.format(Math.abs(value) === value ? value : value).replace('-', '');
  };

  const fmtMoneySigned = (n) => (num(n) < 0 ? '-Rp ' + nf.format(Math.abs(Math.round(num(n)))) : 'Rp ' + nf.format(Math.round(num(n))));

  const fmtCompact = (n) => {
    const v = Math.abs(num(n));
    const sign = num(n) < 0 ? '-' : '';
    if (v >= 1e9) return sign + 'Rp ' + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace('.', ',') + ' M';
    if (v >= 1e6) return sign + 'Rp ' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + ' jt';
    if (v >= 1e3) return sign + 'Rp ' + Math.round(v / 1e3) + ' rb';
    return sign + 'Rp ' + nf.format(v);
  };

  const parseMoney = (str) => {
    const digits = String(str || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  /* ---------------- Dates ---------------- */
  const toISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayISO = () => toISO(new Date());

  const parseISO = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const addDays = (iso, days) => {
    const d = parseISO(iso);
    d.setDate(d.getDate() + days);
    return toISO(d);
  };

  const addMonthsToKey = (key, delta) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };

  const currentMonthKey = () => todayISO().slice(0, 7);

  const monthKeyOf = (iso) => String(iso).slice(0, 7);

  const monthLabel = (key, style = 'long') => {
    const [y, m] = String(key).split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', {
      month: style === 'short' ? 'short' : 'long',
      year: 'numeric',
    });
  };

  const monthShort = (key) => {
    const [y, m] = String(key).split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
  };

  const dayNumber = (iso) => parseISO(iso).getDate();

  const weekdayShort = (iso) =>
    parseISO(iso).toLocaleDateString('id-ID', { weekday: 'short' });

  const fullDateLabel = (iso) =>
    parseISO(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const shortDateLabel = (iso) =>
    parseISO(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  const dayLabel = (iso) => {
    const today = todayISO();
    if (iso === today) return 'Hari ini';
    if (iso === addDays(today, -1)) return 'Kemarin';
    return parseISO(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

  const lastDayOfMonth = (key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const daysInMonth = (key) => lastDayOfMonth(key);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  /* ---------------- Icons ---------------- */
  const ICONS = {
    home: '<path d="M3 10.7 12 3l9 7.7"/><path d="M5.5 9.4V21h13V9.4"/><path d="M9.5 21v-6h5v6"/>',
    receipt: '<path d="M5 3.5h14v17l-2.6-1.8L14 20.5l-2-1.8-2 1.8-2.4-1.8L5 20.5z"/><path d="M9 8h6M9 11.5h6M9 15h3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrowUp: '<path d="M6 18 18 6M9 6h9v9"/>',
    arrowDown: '<path d="M18 6 6 18M15 18H6V9"/>',
    transfer: '<path d="M4 8h15"/><path d="m15 4 4 4-4 4"/><path d="M20 16H5"/><path d="m9 12-4 4 4 4"/>',
    wallet: '<path d="M20 8V6.8A2.8 2.8 0 0 0 17.2 4H5.8A2.8 2.8 0 0 0 3 6.8v10.4A2.8 2.8 0 0 0 5.8 20h11.4a2.8 2.8 0 0 0 2.8-2.8V16"/><path d="M16 8h5v8h-5a4 4 0 0 1 0-8z"/><path d="M17.5 12h.01"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.5 7.6A17.6 17.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4-1"/><path d="M10 10a3 3 0 0 0 4 4"/><path d="m3 3 18 18"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    chevronUp: '<path d="m5 15 7-7 7 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 21h16"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    sparkles: '<path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M19 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/><path d="M5 14.5l.6 1.7 1.7.6-1.7.6L5 19.4l-.6-1.9-1.7-.6 1.7-.6z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.5 4.5l1.5 1.5M18 18l1.5 1.5M2 12h2M20 12h2M4.5 19.5 6 18M18 6l1.5-1.5"/>',
    shield: '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    repeat: '<path d="M17 2l3 3-3 3"/><path d="M3 11V9a4 4 0 0 1 4-4h13"/><path d="M7 22l-3-3 3-3"/><path d="M21 13v2a4 4 0 0 1-4 4H4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    alert: '<path d="M10.3 4.2 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/><path d="M6.5 15h3"/>',
    banknote: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5h.01M18 14.5h.01"/>',
    piggy: '<path d="M19 8.5c1.3 1 2 2.4 2 4 0 2.8-2.5 5-6 5.4V20h-3v-1.7a8 8 0 0 1-3.5-1L5 19l-.5-3.2A5.5 5.5 0 0 1 3 12c0-3.3 3.1-6 7-6h4.5l3 2.5z"/><path d="M16 11h.01"/><path d="M7 6.5 8 4"/>',
    flag: '<path d="M5 22V3"/><path d="M5 4h11l-1.5 4L16 12H5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    coffee: '<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a3 3 0 0 1 0 6h-2"/><path d="M8 3v2M12 3v2"/>',
    plane: '<path d="M10.5 13.5 3 11l1.5-1.5 6.5.7L16 4l2-.5.5 2-5.8 5.8 1.8 6.2L13 19l-2.5-5.5z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9.5"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    arrowRight: '<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5.5-4-7.5-.5 2-1.5 3-2.5 3.5C12 8 10.5 4.5 8 3c.5 3-3 5.5-3 10 0 5 3 9 7 9z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  };

  const icon = (name, size = 20, extraClass = '') => {
    const path = ICONS[name] || ICONS.sparkles;
    return `<svg class="ico ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  };

  /* ---------------- Toasts ---------------- */
  let toastTimer = null;
  const toast = (message, type = 'success', sub = '') => {
    let host = $('#toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    host.innerHTML = `
      <div class="toast toast-${type}">
        <span class="toast-icon">${icon(type === 'error' ? 'xCircle' : type === 'info' ? 'info' : 'checkCircle', 20)}</span>
        <span class="toast-copy"><strong>${escapeHTML(message)}</strong>${sub ? `<small>${escapeHTML(sub)}</small>` : ''}</span>
      </div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      const t = host.firstElementChild;
      if (t) t.classList.add('is-leaving');
      setTimeout(() => (host.innerHTML = ''), 260);
    }, 2800);
  };

  const haptic = (ms = 12) => {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* noop */ }
  };

  /* ---------------- Misc ---------------- */
  const debounce = (fn, wait = 220) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const download = (filename, content, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const formatFileDate = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const animateNumber = (node, to, duration = 650, formatter = fmtMoney) => {
    if (!node) return;
    const from = Number(node.dataset.value || 0);
    const start = performance.now();
    node.dataset.value = to;
    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = formatter(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------------- Sheet manager ---------------- */
  let activeSheet = null;

  const closeSheet = () => {
    if (!activeSheet) {
      document.querySelectorAll('.sheet-overlay').forEach((o) => o.remove());
      document.body.classList.remove('sheet-open');
      return;
    }
    const { overlay, onClose } = activeSheet;
    overlay.classList.add('is-closing');
    document.body.classList.remove('sheet-open');
    const done = () => {
      overlay.remove();
      activeSheet = null;
      if (typeof onClose === 'function') onClose();
    };
    setTimeout(done, 240);
    // Fallback: ensure removal even if transition callback stalls
    setTimeout(() => {
      if (document.body.contains(overlay)) overlay.remove();
      activeSheet = null;
    }, 600);
  };

  /**
   * openSheet({ title, subtitle, content, footer, size, onMount, onClose })
   */
  const openSheet = (opts = {}) => {
    closeSheet();
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet-backdrop"></div>
      <section class="sheet ${opts.size === 'full' ? 'sheet-full' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHTML(opts.title || 'Form')}">
        <div class="sheet-grab"><span></span></div>
        <header class="sheet-head">
          <div>
            <h2 class="sheet-title">${escapeHTML(opts.title || '')}</h2>
            ${opts.subtitle ? `<p class="sheet-sub">${escapeHTML(opts.subtitle)}</p>` : ''}
          </div>
          <button class="icon-btn sheet-close" aria-label="Tutup">${icon('x', 20)}</button>
        </header>
        <div class="sheet-body">${opts.content || ''}</div>
        ${opts.footer ? `<footer class="sheet-foot">${opts.footer}</footer>` : ''}
      </section>`;
    document.body.appendChild(overlay);
    document.body.classList.add('sheet-open');
    activeSheet = { overlay, onClose: opts.onClose };
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    const backdrop = overlay.querySelector('.sheet-backdrop');
    const closeBtn = overlay.querySelector('.sheet-close');
    const doClose = (e) => { if (e) e.preventDefault(); closeSheet(); };
    backdrop.addEventListener('click', doClose);
    backdrop.addEventListener('touchend', doClose, { passive: false });
    closeBtn.addEventListener('click', doClose);
    closeBtn.addEventListener('touchend', doClose, { passive: false });

    // drag to dismiss
    const sheet = overlay.querySelector('.sheet');
    const grab = overlay.querySelector('.sheet-grab');
    let startY = 0;
    let delta = 0;
    let dragging = false;

    const start = (clientY) => {
      startY = clientY;
      delta = 0;
      dragging = true;
      sheet.style.transition = 'none';
    };
    const move = (clientY) => {
      if (!dragging) return;
      delta = Math.max(0, clientY - startY);
      sheet.style.transform = `translateY(${delta}px)`;
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (delta > 110) closeSheet();
    };
    grab.addEventListener('touchstart', (e) => start(e.touches[0].clientY), { passive: true });
    grab.addEventListener('touchmove', (e) => move(e.touches[0].clientY), { passive: true });
    grab.addEventListener('touchend', end);
    grab.addEventListener('mousedown', (e) => {
      start(e.clientY);
      const mm = (ev) => move(ev.clientY);
      const mu = () => {
        end();
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
      };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    });

    setTimeout(() => {
      const first = overlay.querySelector('.sheet-body input:not([type="hidden"])');
      if (first && window.innerWidth > 700) first.focus({ preventScroll: true });
    }, 300);

    // Defer so the caller's `const overlay = openSheet(...)` assignment completes
    // before form mount callbacks run and query the sheet.
    queueMicrotask(() => {
      if (typeof opts.onMount === 'function') opts.onMount(overlay);
    });
    return overlay;
  };

  /* ---------------- Confirm ---------------- */
  const confirmDialog = ({ title = 'Yakin?', message = '', confirmText = 'Hapus', danger = true } = {}) =>
    new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-card" role="alertdialog" aria-modal="true">
          <div class="modal-ico ${danger ? 'is-danger' : ''}">${icon(danger ? 'trash' : 'info', 24)}</div>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(message)}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" data-act="cancel">Batal</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHTML(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      const finish = (result) => {
        overlay.classList.remove('is-open');
        setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 200);
        setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 600);
        resolve(result);
      };
      const cancelBtn = overlay.querySelector('[data-act="cancel"]');
      const okBtn = overlay.querySelector('[data-act="ok"]');
      const modalBackdrop = overlay.querySelector('.modal-backdrop');
      const finishCancel = (e) => { if (e) e.preventDefault(); finish(false); };
      const finishOk = (e) => { if (e) e.preventDefault(); finish(true); };
      cancelBtn.addEventListener('click', finishCancel);
      cancelBtn.addEventListener('touchend', finishCancel, { passive: false });
      modalBackdrop.addEventListener('click', finishCancel);
      modalBackdrop.addEventListener('touchend', finishCancel, { passive: false });
      okBtn.addEventListener('click', finishOk);
      okBtn.addEventListener('touchend', finishOk, { passive: false });
      setTimeout(() => overlay.querySelector('[data-act="ok"]').focus(), 220);
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeSheet) closeSheet();
    }
  });

  return {
    $, $$, pad, uid, escapeHTML, clamp, num,
    fmtNumber, fmtMoney, fmtMoneySigned, fmtCompact, parseMoney,
    toISO, todayISO, parseISO, addDays, addMonthsToKey, currentMonthKey, monthKeyOf,
    monthLabel, monthShort, dayNumber, weekdayShort, fullDateLabel, shortDateLabel,
    dayLabel, daysBetween, lastDayOfMonth, daysInMonth, greeting,
    ICONS, icon,
    toast, haptic, debounce, download, formatFileDate, animateNumber,
    openSheet, closeSheet, confirmDialog,
  };
})();

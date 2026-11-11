/* ============================================================
   FinTrack — UI components & forms
   ============================================================ */
window.UI = (function () {
  'use strict';

  const U = window.U;
  const S = window.Store;

  const CAT_EMOJIS = ['🍜', '🛵', '🛍️', '🧾', '💊', '🎬', '📚', '🧩', '☕', '🍔', '🏠', '⚡', '💧', '📶', '🩺', '🎮', '✈️', '🐾', '👶', '💅', '🏋️', '🎵', '📱', '🚗', '🎓', '💡', '🛒', '🍕', '💼', '💻', '🎁', '📈', '💰', '✨'];
  const WALLET_EMOJIS = ['🏦', '💵', '📱', '💳', '🟢', '🟣', '🔵', '🟡', '⚫', '🪙', '💰', '🏧'];
  const GOAL_EMOJIS = ['🎯', '🛡️', '🏝️', '💻', '🏠', '🚗', '💍', '🎓', '✈️', '🏖️', '👶', '📱', '⌚', '🏍️', '🎁'];
  const BILL_EMOJIS = ['🏠', '⚡', '💧', '📶', '🩺', '🎬', '🏍️', '📱', '🛡️', '🎓', '🚗', '📦', '💡', '🔥', '🎵', '☁️', '🧾', '🏢', '👶', '🐾'];

  const isHidden = () => S.get().settings.hideBalance;

  const money = (n, opts = {}) => {
    if (isHidden() && !opts.force) return 'Rp ••••••';
    return U.fmtMoneySigned(n);
  };
  const moneyAbs = (n, opts = {}) => {
    if (isHidden() && !opts.force) return 'Rp ••••••';
    return U.fmtMoney(Math.abs(n));
  };

  const simple = (n) => {
    if (isHidden()) return '••••';
    return U.fmtCompact(n);
  };

  const initials = (name) =>
    (name || 'F')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

  /* ============================================================
     Small components
     ============================================================ */
  const txRow = (tx) => {
    const cat = S.categoryById(tx.categoryId);
    const wallet = S.walletById(tx.walletId);
    const dest = S.walletById(tx.toWalletId);
    const isTransfer = tx.type === 'transfer';
    const emoji = isTransfer ? '🔁' : (cat && cat.emoji) || '🧩';
    const title = isTransfer
      ? `${wallet ? wallet.name : 'Dompet'} → ${dest ? dest.name : 'Dompet'}`
      : tx.note || (cat ? cat.name : 'Transaksi');
    const metaCat = isTransfer ? 'Transfer' : (cat ? cat.name : 'Tanpa kategori');
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
    const cls = tx.type === 'income' ? 'income' : tx.type === 'transfer' ? 'transfer' : 'expense';
    const click = tx.billId
      ? `UI.openBillTxInfo('${tx.id}')`
      : `UI.openTransactionSheet('${tx.type}', '${tx.id}')`;
    return `
      <button class="tx-row" onclick="${click}" title="${U.escapeHTML(title)}">
        <span class="tx-emoji ${tx.type === 'income' ? 'is-income' : tx.type === 'transfer' ? 'is-transfer' : ''}">${emoji}</span>
        <span class="tx-main">
          <span class="tx-title">${U.escapeHTML(title)}</span>
          <span class="tx-meta">
            <span>${U.escapeHTML(metaCat)}</span>
            <i class="dotsep"></i>
            <span>${U.escapeHTML(wallet ? wallet.name : 'Tanpa dompet')}</span>
            ${tx.billId ? '<i class="dotsep"></i><span>Wajib</span>' : ''}
          </span>
        </span>
        <span class="tx-amount ${cls}">
          ${isHidden() ? 'Rp •••' : sign + U.fmtMoney(Math.abs(tx.amount)).replace('Rp ', 'Rp ')}
          <small>${isTransfer ? 'pindah dana' : tx.type === 'income' ? 'masuk' : 'keluar'}</small>
        </span>
      </button>`;
  };

  const billCard = (bill, month) => {
    const paid = (bill.paidMonths || []).includes(month);
    const wallet = S.walletById(bill.walletId);
    const today = U.todayISO();
    const todayDay = U.dayNumber(today);
    const currentDay = U.dayNumber(`${month}-01`);
    let sub = `Jatuh tempo tgl ${bill.dueDay}`;
    let tag = `<span class="bill-tag">Tgl ${bill.dueDay}</span>`;
    let overdue = false;

    if (paid) {
      tag = `<span class="bill-tag paid">✓ Lunas</span>`;
    } else if (month === U.currentMonthKey()) {
      const diff = bill.dueDay - todayDay;
      if (diff < 0) {
        overdue = true;
        tag = `<span class="bill-tag overdue">Terlambat ${Math.abs(diff)} hari</span>`;
      } else if (diff === 0) {
        tag = `<span class="bill-tag overdue">Jatuh tempo hari ini</span>`;
      } else if (diff <= 7) {
        tag = `<span class="bill-tag due-soon">${diff} hari lagi</span>`;
      }
    } else if (month < U.currentMonthKey()) {
      overdue = true;
      tag = `<span class="bill-tag overdue">Belum dibayar</span>`;
    }

    return `
      <div class="bill-card ${paid ? 'is-paid' : ''} ${overdue ? 'is-overdue' : ''}" data-bill="${bill.id}">
        <div class="bill-emoji">${bill.emoji || '🧾'}</div>
        <button class="bill-main" onclick="UI.openBillSheet('${bill.id}')" style="text-align:left">
          <div class="bill-name">${U.escapeHTML(bill.name)}</div>
          <div class="bill-sub">
            ${tag}
            <span>${U.escapeHTML(wallet ? wallet.name : 'Tanpa dompet')}</span>
          </div>
        </button>
        <div class="bill-amount-col">
          <div class="bill-amount">${moneyAbs(bill.amount)}</div>
          <button class="bill-pay-btn" onclick="UI.toggleBill('${bill.id}', '${month}')" aria-label="${paid ? 'Tandai belum dibayar' : 'Tandai lunas'}">
            ${U.icon('check', 14)}
          </button>
        </div>
      </div>`;
  };

  const goalCard = (goal) => {
    const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
    const rawPct = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
    const done = pct >= 100;
    const monthsLeft = goal.deadline ? Math.max(0, U.daysBetween(U.todayISO(), goal.deadline) / 30.44) : 0;
    const remaining = Math.max(0, goal.target - goal.saved);
    const perMonth = monthsLeft > 0 ? remaining / Math.ceil(monthsLeft) : remaining;
    const deadlineText = goal.deadline
      ? (done ? 'Target tercapai 🎉' : `${U.shortDateLabel(goal.deadline)} · ${Math.ceil(monthsLeft)} bln lagi`)
      : 'Tanpa tenggat';

    return `
      <div class="goal-card card reveal">
        <div class="goal-top">
          <div class="goal-emoji" style="background:${goal.color}1f;color:${goal.color}">${goal.emoji || '🎯'}</div>
          <div class="goal-main">
            <div class="goal-name">${U.escapeHTML(goal.name)}</div>
            <div class="goal-deadline">${U.icon('clock', 11)} ${deadlineText}</div>
          </div>
          <div class="goal-pct">
            ${Charts.ring(pct, goal.color)}
            <span>${Math.round(rawPct)}%</span>
          </div>
        </div>
        <div class="goal-amounts">
          <span class="goal-saved">${money(goal.saved)}</span>
          <span class="goal-target">dari ${money(goal.target)}</span>
        </div>
        <div class="bar ${done ? 'is-emerald' : ''}"><i style="width:${pct}%;background:${done ? '' : `linear-gradient(90deg, ${goal.color}bb, ${goal.color})`}"></i></div>
        <div class="goal-foot">
          <span class="goal-monthly">${done ? `${U.icon('sparkles', 11)} Hebat, target tercapai!` : `${U.icon('flag', 11)} Sisihkan ${U.fmtCompact(perMonth)}/bln`}</span>
          <div class="goal-actions">
            <button class="goal-action" onclick="UI.openGoalSheet('${goal.id}')" aria-label="Edit target">${U.icon('edit', 12)}</button>
            <button class="goal-action is-primary" onclick="UI.openFundSheet('${goal.id}')">${U.icon('plus', 12)} Dana</button>
          </div>
        </div>
      </div>`;
  };

  const budgetRow = (bp, withEdit = true) => {
    const pct = Math.min(100, bp.pct);
    const tone = bp.rawPct >= 100 ? 'coral' : bp.rawPct >= 80 ? 'amber' : 'emerald';
    const warn = bp.rawPct >= 100;
    return `
      <div class="budget-item">
        <div class="budget-item-top">
          <div class="budget-emoji">${bp.category.emoji}</div>
          <div class="budget-meta">
            <div class="budget-name">${U.escapeHTML(bp.category.name)} ${warn ? `<span class="warn">${U.icon('alert', 11)}</span>` : ''}</div>
            <div class="budget-amounts"><strong>${money(bp.spent)}</strong> dari ${money(bp.limit)}</div>
          </div>
          <span class="budget-pct ${tone === 'coral' ? 'is-coral' : tone === 'amber' ? 'is-amber' : ''}">${Math.round(bp.rawPct)}%</span>
        </div>
        <div class="bar is-${tone}"><i style="width:${pct}%"></i></div>
      </div>`;
  };

  const budgetRowFull = (bp) => `
    <div class="card budget-card" style="margin-bottom:9px">
      <div class="budget-item-top" style="margin-bottom:9px">
        <div class="budget-emoji">${bp.category.emoji}</div>
        <div class="budget-meta">
          <div class="budget-name">${U.escapeHTML(bp.category.name)} ${bp.rawPct >= 100 ? `<span class="warn">${U.icon('alert', 11)}</span>` : ''}</div>
          <div class="budget-amounts"><strong>${money(bp.spent)}</strong> dari ${money(bp.limit)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="budget-pct ${bp.rawPct >= 100 ? 'is-coral' : bp.rawPct >= 80 ? 'is-amber' : ''}">${Math.round(bp.rawPct)}%</span>
          <button class="icon-btn" style="width:28px;height:28px;border-radius:8px" onclick="UI.openBudgetSheet('${bp.categoryId}')" aria-label="Edit anggaran">${U.icon('edit', 13)}</button>
        </div>
      </div>
      <div class="bar is-${bp.rawPct >= 100 ? 'coral' : bp.rawPct >= 80 ? 'amber' : 'emerald'}"><i style="width:${Math.min(100, bp.pct)}%"></i></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="font-size:9px;color:var(--muted);font-weight:600">${bp.remaining >= 0 ? 'Sisa ' + money(bp.remaining) : 'Lewat ' + money(Math.abs(bp.remaining))}</span>
        <span style="font-size:9px;color:var(--muted);font-weight:600">${bp.rawPct >= 100 ? 'Anggaran terlampaui' : bp.rawPct >= 80 ? 'Hampir habis' : 'Aman'}</span>
      </div>
    </div>`;

  const emptyState = ({ icon = 'receipt', title = 'Belum ada data', text = '', cta = '', ctaAction = '', ctaLabel = '' }) => `
    <div class="empty">
      <div class="empty-ill">${U.icon(icon, 30)}</div>
      <h3>${U.escapeHTML(title)}</h3>
      <p>${U.escapeHTML(text)}</p>
      ${cta && ctaLabel ? `<button class="btn btn-primary btn-sm" onclick="${ctaAction}">${U.icon('plus', 15)} ${U.escapeHTML(ctaLabel)}</button>` : ''}
    </div>`;

  const emojiPicker = (emojis, selected, name = 'emoji') => `
    <div class="emoji-picker" data-emoji-picker="${name}">
      ${emojis.map((e) => `<button type="button" class="emoji-pick ${e === selected ? 'is-active' : ''}" data-emoji="${e}">${e}</button>`).join('')}
    </div>`;

  const colorPicker = (colors, selected) => `
    <div class="color-picker" data-color-picker>
      ${colors.map((c) => `<button type="button" class="color-dot ${c === selected ? 'is-active' : ''}" data-color="${c}" style="background:${c}" aria-label="Warna ${c}"></button>`).join('')}
    </div>`;

  /* ============================================================
     Transaction sheet
     ============================================================ */
  function openTransactionSheet(type = 'expense', txId = null) {
    const editing = txId ? S.transactionById(txId) : null;
    const state = S.get();
    const wallets = state.wallets;
    const firstWallet = wallets[0] ? wallets[0].id : '';

    const form = {
      type: editing ? editing.type : type,
      amount: editing ? U.num(editing.amount) : 0,
      categoryId: editing ? editing.categoryId : null,
      walletId: editing ? editing.walletId : firstWallet,
      toWalletId: editing && editing.toWalletId ? editing.toWalletId : (wallets[1] ? wallets[1].id : firstWallet),
      date: editing ? editing.date : U.todayISO(),
      note: editing ? editing.note || '' : '',
    };

    // Preselect first category for new entries
    if (!editing && form.type !== 'transfer') {
      const cats = state.categories[form.type];
      if (cats.length) form.categoryId = cats[0].id;
    }

    const typeLabel = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' };
    const amountFieldLabel = () => form.type === 'income' ? 'Jumlah pemasukan' : form.type === 'transfer' ? 'Jumlah transfer' : 'Jumlah pengeluaran';

    const content = `
      <div class="type-picker" id="typePicker">
        <button type="button" data-type="income" class="${form.type === 'income' ? 'is-active' : ''}">${U.icon('arrowDown', 15)} Pemasukan</button>
        <button type="button" data-type="expense" class="${form.type === 'expense' ? 'is-active' : ''}">${U.icon('arrowUp', 15)} Pengeluaran</button>
        <button type="button" data-type="transfer" class="${form.type === 'transfer' ? 'is-active' : ''}">${U.icon('transfer', 15)} Transfer</button>
      </div>

      <div class="amount-field ${form.type === 'income' ? 'is-income' : form.type === 'expense' ? 'is-expense' : ''}" id="amountField">
        <div class="amount-label">
          <span id="amountLabel">${amountFieldLabel()}</span>
          <span style="font-weight:600;color:var(--muted);text-transform:none;letter-spacing:0">${U.icon('lock', 10)} Tersimpan lokal</span>
        </div>
        <div class="amount-input-row">
          <span class="rp">Rp</span>
          <input id="txAmount" class="amount-input" inputmode="numeric" autocomplete="off" placeholder="0"
            value="${form.amount ? U.fmtNumber(form.amount) : ''}" aria-label="Jumlah transaksi" />
        </div>
        <div class="quick-amounts">
          ${[10000, 25000, 50000, 100000, 250000, 500000].map((a) => `<button type="button" class="quick-amount" data-quick="${a}">+${U.fmtNumber(a / 1000)}rb</button>`).join('')}
        </div>
      </div>

      <div class="field" id="categoryField">
        <div class="field-label">
          <span>Kategori</span>
          <button type="button" class="field-action" id="toggleNewCat">${U.icon('plus', 12)} Kategori baru</button>
        </div>
        <div class="chip-scroll" id="catChips"></div>
        <div class="inline-panel hidden" id="newCatPanel">
          <div class="inline-panel-title">Tambah kategori ${form.type === 'income' ? 'pemasukan' : 'pengeluaran'}</div>
          <div id="catEmojiRow"></div>
          <div class="inline-row">
            <input class="input" id="newCatName" placeholder="Nama kategori, mis. Kopi" maxlength="24" />
            <button type="button" class="btn btn-primary" id="saveNewCat">Tambah</button>
          </div>
        </div>
      </div>

      <div class="field" id="walletField">
        <div class="field-label">
          <span id="walletLabel">${form.type === 'transfer' ? 'Dari dompet' : 'Dompet / akun'}</span>
          <button type="button" class="field-action" id="toggleNewWallet">${U.icon('plus', 12)} Dompet baru</button>
        </div>
        <div class="chip-scroll" id="walletChips"></div>
        <div class="inline-panel hidden" id="newWalletPanel">
          <div class="inline-panel-title">Tambah dompet baru</div>
          <div id="walletEmojiRow"></div>
          <div class="inline-row">
            <input class="input" id="newWalletName" placeholder="Nama dompet, mis. Mandiri" maxlength="24" />
            <button type="button" class="btn btn-primary" id="saveNewWallet">Tambah</button>
          </div>
        </div>
      </div>

      <div class="field hidden" id="toWalletField">
        <div class="field-label">
          <span>Ke dompet</span>
          <button type="button" class="field-action" id="toggleNewToWallet">${U.icon('plus', 12)} Dompet baru</button>
        </div>
        <div class="chip-scroll" id="toWalletChips"></div>
        <div class="inline-panel hidden" id="newToWalletPanel">
          <div class="inline-panel-title">Tambah dompet tujuan</div>
          <div id="toWalletEmojiRow"></div>
          <div class="inline-row">
            <input class="input" id="newToWalletName" placeholder="Nama dompet" maxlength="24" />
            <button type="button" class="btn btn-primary" id="saveNewToWallet">Tambah</button>
          </div>
        </div>
      </div>

      <div class="field">
        <div class="field-label"><span>Tanggal</span><span class="opt" id="dateHuman">${U.fullDateLabel(form.date)}</span></div>
        <div class="date-quick">
          <button type="button" data-date="${U.todayISO()}" class="${form.date === U.todayISO() ? 'is-active' : ''}">${U.icon('sun', 12)} Hari ini</button>
          <button type="button" data-date="${U.addDays(U.todayISO(), -1)}" class="${form.date === U.addDays(U.todayISO(), -1) ? 'is-active' : ''}">Kemarin</button>
          <input type="date" id="txDate" value="${form.date}" max="2999-12-31" aria-label="Pilih tanggal" />
        </div>
      </div>

      <div class="field" style="margin-bottom:4px">
        <div class="field-label"><span>Catatan</span><span class="opt">opsional</span></div>
        <input class="input" id="txNote" maxlength="70" placeholder="Contoh: Makan siang, gaji November…" value="${U.escapeHTML(form.note)}" />
      </div>
    `;

    const footer = `
      <div style="display:flex;gap:8px">
        ${editing ? `<button class="btn btn-ghost" id="txDelete" style="width:52px;flex:none;padding:0" aria-label="Hapus transaksi">${U.icon('trash', 18)}</button>` : ''}
        <button class="btn ${form.type === 'income' ? 'btn-emerald' : form.type === 'transfer' ? 'btn-primary' : 'btn-coral'} btn-block" id="txSave">
          ${U.icon('check', 18)} ${editing ? 'Simpan Perubahan' : 'Simpan Transaksi'}
        </button>
      </div>`;

    const overlay = U.openSheet({
      title: editing ? 'Edit Transaksi' : 'Catat Transaksi',
      subtitle: editing ? 'Perbarui detail transaksi kamu' : 'Cepat, rapi, dan tanpa ketik ulang',
      content,
      footer,
      onMount: mount,
    });

    function q(sel) { return overlay.querySelector(sel); }

    function catChipHTML() {
      const cats = S.get().categories[form.type] || [];
      return cats.map((c) => `
        <button type="button" class="chip ${c.id === form.categoryId ? 'is-active' : ''} ${form.type === 'income' ? 'is-income' : 'is-expense'}" data-cat="${c.id}">
          <span class="chip-emoji">${c.emoji}</span>${U.escapeHTML(c.name)}
        </button>`).join('') + `
        <button type="button" class="chip is-add" id="chipAddCat">${U.icon('plus', 12)} Lainnya</button>`;
    }

    function walletChipHTML(selectedId, target = 'wallet') {
      const wallets = S.get().wallets;
      return wallets.map((w) => `
        <button type="button" class="chip ${w.id === selectedId ? 'is-active' : ''}" data-${target}="${w.id}">
          <span class="chip-emoji">${w.emoji || '💳'}</span>${U.escapeHTML(w.name)}
          <span class="chip-balance">${simple(S.walletBalance(w.id))}</span>
        </button>`).join('') + `
        <button type="button" class="chip is-add" data-add-target="${target}">${U.icon('plus', 12)} Baru</button>`;
    }

    function renderCats() {
      const wrap = q('#catChips');
      if (!wrap) return;
      wrap.innerHTML = catChipHTML();
      wrap.querySelectorAll('[data-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          form.categoryId = btn.dataset.cat;
          renderCats();
          U.haptic();
        });
      });
      const add = q('#chipAddCat');
      if (add) add.addEventListener('click', () => openNewCatPanel());
    }

    function renderWallets() {
      const source = q('#walletChips');
      if (!source) return;
      source.innerHTML = walletChipHTML(form.walletId, 'wallet');
      source.querySelectorAll('[data-wallet]').forEach((btn) => {
        btn.addEventListener('click', () => {
          form.walletId = btn.dataset.wallet;
          if (form.type === 'transfer' && form.toWalletId === form.walletId) {
            const alt = S.get().wallets.find((w) => w.id !== form.walletId);
            if (alt) form.toWalletId = alt.id;
          }
          renderWallets();
          U.haptic();
        });
      });
      const add = source.querySelector('[data-add-target]');
      if (add) add.addEventListener('click', () => openNewWalletPanel('wallet'));

      const dest = q('#toWalletChips');
      if (dest) {
        dest.innerHTML = walletChipHTML(form.toWalletId, 'toWallet');
        dest.querySelectorAll('[data-toWallet]').forEach((btn) => {
          btn.addEventListener('click', () => {
            form.toWalletId = btn.dataset.towallet;
            renderWallets();
            U.haptic();
          });
        });
        const addDest = dest.querySelector('[data-add-target]');
        if (addDest) addDest.addEventListener('click', () => openNewWalletPanel('toWallet'));
      }
    }

    function openNewCatPanel() {
      q('#newCatPanel').classList.remove('hidden');
      q('#newCatName').focus();
    }

    function openNewWalletPanel(target) {
      if (target === 'toWallet') {
        q('#newToWalletPanel').classList.remove('hidden');
        q('#newToWalletName').focus();
      } else {
        q('#newWalletPanel').classList.remove('hidden');
        q('#newWalletName').focus();
      }
    }

    function buildEmojiRow(container, emojis, selectedRef, onPick) {
      container.innerHTML = emojis.map((e) => `<button type="button" class="emoji-pick ${e === selectedRef.value ? 'is-active' : ''}" data-emoji="${e}">${e}</button>`).join('');
      container.querySelectorAll('[data-emoji]').forEach((b) => {
        b.addEventListener('click', () => {
          selectedRef.value = b.dataset.emoji;
          container.querySelectorAll('[data-emoji]').forEach((x) => x.classList.toggle('is-active', x === b));
        });
      });
    }

    function syncType() {
      q('#typePicker').querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.type === form.type));
      q('#amountField').classList.toggle('is-income', form.type === 'income');
      q('#amountField').classList.toggle('is-expense', form.type === 'expense');
      q('#amountLabel').textContent = amountFieldLabel();
      q('#categoryField').classList.toggle('hidden', form.type === 'transfer');
      q('#toWalletField').classList.toggle('hidden', form.type !== 'transfer');
      q('#walletLabel').textContent = form.type === 'transfer' ? 'Dari dompet' : 'Dompet / akun';
      const saveBtn = q('#txSave');
      saveBtn.className = `btn ${form.type === 'income' ? 'btn-emerald' : form.type === 'transfer' ? 'btn-primary' : 'btn-coral'} btn-block`;
      saveBtn.innerHTML = `${U.icon('check', 18)} ${editing ? 'Simpan Perubahan' : 'Simpan Transaksi'}`;
      if (form.type !== 'transfer') {
        const cats = S.get().categories[form.type];
        if (!cats.some((c) => c.id === form.categoryId)) form.categoryId = cats[0] ? cats[0].id : null;
        renderCats();
      }
      renderWallets();
    }

    function setDate(iso) {
      form.date = iso;
      q('#txDate').value = iso;
      q('#dateHuman').textContent = U.fullDateLabel(iso);
      q('.date-quick').querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.date === iso));
    }

    function mount(root) {
      const amountInput = q('#txAmount');
      amountInput.addEventListener('input', () => {
        const digits = amountInput.value.replace(/\D/g, '');
        form.amount = digits ? parseInt(digits, 10) : 0;
        amountInput.value = digits ? U.fmtNumber(form.amount) : '';
      });
      amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); q('#txSave').click(); }
      });
      setTimeout(() => amountInput.focus({ preventScroll: true }), 380);

      q('#typePicker').querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          if (form.type === b.dataset.type) return;
          form.type = b.dataset.type;
          U.haptic();
          syncType();
        });
      });

      overlay.querySelectorAll('.quick-amount').forEach((b) => {
        b.addEventListener('click', () => {
          form.amount = U.num(b.dataset.quick);
          amountInput.value = U.fmtNumber(form.amount);
          amountInput.focus();
        });
      });

      renderCats();
      renderWallets();
      syncType();

      q('#toggleNewCat').addEventListener('click', openNewCatPanel);
      q('#toggleNewWallet').addEventListener('click', () => openNewWalletPanel('wallet'));
      const toToggle = q('#toggleNewToWallet');
      if (toToggle) toToggle.addEventListener('click', () => openNewWalletPanel('toWallet'));

      const catEmoji = { value: '🍜' };
      buildEmojiRow(q('#catEmojiRow'), CAT_EMOJIS, catEmoji, () => {});
      q('#saveNewCat').addEventListener('click', () => {
        const name = q('#newCatName').value.trim();
        if (!name) { q('#newCatName').classList.add('is-error'); q('#newCatName').focus(); return; }
        const cat = S.addCategory(form.type, name, catEmoji.value);
        if (cat) {
          form.categoryId = cat.id;
          renderCats();
          q('#newCatPanel').classList.add('hidden');
          q('#newCatName').value = '';
          U.toast('Kategori ditambahkan', 'success', cat.name);
        }
      });
      q('#newCatName').addEventListener('keydown', (e) => { if (e.key === 'Enter') q('#saveNewCat').click(); });

      const walletEmoji = { value: '🏦' };
      buildEmojiRow(q('#walletEmojiRow'), WALLET_EMOJIS, walletEmoji, () => {});
      q('#saveNewWallet').addEventListener('click', () => {
        const name = q('#newWalletName').value.trim();
        if (!name) { q('#newWalletName').classList.add('is-error'); q('#newWalletName').focus(); return; }
        const wallet = S.addWallet({ name, emoji: walletEmoji.value });
        if (wallet) {
          form.walletId = wallet.id;
          if (form.type === 'transfer' && form.toWalletId === form.walletId && S.get().wallets.length > 1) {
            form.toWalletId = S.get().wallets[0].id === wallet.id ? S.get().wallets[1].id : S.get().wallets[0].id;
          }
          renderWallets();
          q('#newWalletPanel').classList.add('hidden');
          q('#newWalletName').value = '';
          U.toast('Dompet ditambahkan', 'success', wallet.name);
        }
      });
      q('#newWalletName').addEventListener('keydown', (e) => { if (e.key === 'Enter') q('#saveNewWallet').click(); });

      const toEmoji = { value: '💳' };
      buildEmojiRow(q('#toWalletEmojiRow'), WALLET_EMOJIS, toEmoji, () => {});
      q('#saveNewToWallet').addEventListener('click', () => {
        const name = q('#newToWalletName').value.trim();
        if (!name) { q('#newToWalletName').classList.add('is-error'); q('#newToWalletName').focus(); return; }
        const wallet = S.addWallet({ name, emoji: toEmoji.value });
        if (wallet) {
          form.toWalletId = wallet.id;
          renderWallets();
          q('#newToWalletPanel').classList.add('hidden');
          q('#newToWalletName').value = '';
          U.toast('Dompet ditambahkan', 'success', wallet.name);
        }
      });
      q('#newToWalletName').addEventListener('keydown', (e) => { if (e.key === 'Enter') q('#saveNewToWallet').click(); });

      q('.date-quick').querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => setDate(b.dataset.date));
      });
      q('#txDate').addEventListener('change', (e) => {
        if (e.target.value) setDate(e.target.value);
      });

      q('#txNote').addEventListener('input', (e) => { form.note = e.target.value; });
      q('#txNote').addEventListener('keydown', (e) => { if (e.key === 'Enter') q('#txSave').click(); });

      q('#txSave').addEventListener('click', () => {
        if (!form.amount || form.amount <= 0) {
          amountInput.classList.add('is-error');
          amountInput.focus();
          U.toast('Jumlah belum diisi', 'error');
          setTimeout(() => amountInput.classList.remove('is-error'), 1400);
          return;
        }
        if (form.type !== 'transfer' && !form.categoryId) {
          U.toast('Pilih kategori dulu', 'error');
          return;
        }
        if (!form.walletId) {
          U.toast('Pilih dompet dulu', 'error');
          return;
        }
        if (form.type === 'transfer') {
          if (!form.toWalletId) { U.toast('Pilih dompet tujuan', 'error'); return; }
          if (form.toWalletId === form.walletId) { U.toast('Dompet asal dan tujuan harus berbeda', 'error'); return; }
        }
        S.saveTransaction(form, editing ? editing.id : null);
        U.haptic(20);
        U.closeSheet();
        U.toast(editing ? 'Transaksi diperbarui' : 'Transaksi tersimpan', 'success', moneyAbs(form.amount) + ' · ' + typeLabel[form.type]);
        if (window.App) window.App.refresh();
      });

      const del = q('#txDelete');
      if (del) {
        del.addEventListener('click', async () => {
          const yes = await U.confirmDialog({
            title: 'Hapus transaksi?',
            message: 'Transaksi ini akan dihapus dari riwayat dan saldo dompet akan disesuaikan.',
            confirmText: 'Hapus',
          });
          if (!yes) return;
          S.deleteTransaction(editing.id);
          U.closeSheet();
          U.toast('Transaksi dihapus', 'info');
          if (window.App) window.App.refresh();
        });
      }
    }
  }

  /* ============================================================
     Bill sheet
     ============================================================ */
  function openBillSheet(billId = null) {
    const editing = billId ? S.get().bills.find((b) => b.id === billId) : null;
    const state = S.get();
    const form = {
      name: editing ? editing.name : '',
      amount: editing ? editing.amount : 0,
      dueDay: editing ? editing.dueDay : Math.min(10, U.daysInMonth(U.currentMonthKey())),
      categoryId: editing ? editing.categoryId : 'cat_tagihan',
      walletId: editing ? editing.walletId : (state.wallets[0] ? state.wallets[0].id : ''),
      emoji: editing ? editing.emoji : '🏠',
      color: editing ? editing.color : '#6366f1',
    };

    const content = `
      <div style="padding:12px;border-radius:15px;background:linear-gradient(120deg,var(--purple-soft),var(--blue-soft));display:flex;gap:10px;align-items:center;margin-bottom:16px">
        <div style="width:38px;height:38px;border-radius:11px;background:var(--surface);display:grid;place-items:center;font-size:19px">${form.emoji}</div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:800">Tagihan wajib bulanan</div>
          <div style="font-size:9.5px;color:var(--muted);margin-top:2px">Otomatis muncul setiap bulan hingga ditandai lunas.</div>
        </div>
      </div>

      <div class="field">
        <div class="field-label"><span>Nama tagihan</span></div>
        <input class="input" id="billName" maxlength="32" placeholder="Contoh: Listrik PLN" value="${U.escapeHTML(form.name)}" />
      </div>

      <div class="field">
        <div class="field-label"><span>Jumlah per bulan</span></div>
        <div class="input-group">
          <span class="prefix">Rp</span>
          <input class="input" id="billAmount" inputmode="numeric" placeholder="0" value="${form.amount ? U.fmtNumber(form.amount) : ''}" />
        </div>
      </div>

      <div class="field">
        <div class="field-label"><span>Jatuh tempo (tanggal)</span><span class="opt">1 – 31</span></div>
        <input class="input" id="billDue" type="number" min="1" max="31" value="${form.dueDay}" />
      </div>

      <div class="field">
        <div class="field-label"><span>Kategori</span></div>
        <select class="select" id="billCategory">
          ${state.categories.expense.map((c) => `<option value="${c.id}" ${c.id === form.categoryId ? 'selected' : ''}>${c.emoji} ${U.escapeHTML(c.name)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <div class="field-label"><span>Dompet pembayaran</span></div>
        <select class="select" id="billWallet">
          ${state.wallets.map((w) => `<option value="${w.id}" ${w.id === form.walletId ? 'selected' : ''}>${w.emoji || '💳'} ${U.escapeHTML(w.name)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <div class="field-label"><span>Ikon tagihan</span></div>
        ${emojiPicker(BILL_EMOJIS, form.emoji, 'bill')}
      </div>

      ${editing ? `<div class="input-hint" style="margin-top:-4px">${U.icon('info', 12)} Jika nominal diubah, pembayaran yang sudah tercatat bulan ini ikut disesuaikan.</div>` : ''}
    `;

    const footer = `
      <div style="display:flex;gap:8px">
        ${editing ? `<button class="btn btn-ghost" id="billDelete" style="width:52px;flex:none;padding:0" aria-label="Hapus tagihan">${U.icon('trash', 18)}</button>` : ''}
        <button class="btn btn-primary btn-block" id="billSave">${U.icon('check', 18)} ${editing ? 'Simpan Perubahan' : 'Tambah Tagihan'}</button>
      </div>`;

    const overlay = U.openSheet({
      title: editing ? 'Edit Tagihan Wajib' : 'Tambah Tagihan Wajib',
      subtitle: 'Pengeluaran rutin yang harus dibayar tiap bulan',
      content,
      footer,
      onMount(root) {
        const emojiState = { value: form.emoji };
        const heroEmoji = root.querySelector('.sheet-body > div:first-child > div:first-child');
        root.querySelectorAll('[data-emoji-picker="bill"] .emoji-pick').forEach((b) => {
          b.addEventListener('click', () => {
            emojiState.value = b.dataset.emoji;
            root.querySelectorAll('[data-emoji-picker="bill"] .emoji-pick').forEach((x) => x.classList.toggle('is-active', x === b));
            if (heroEmoji) heroEmoji.textContent = b.dataset.emoji;
          });
        });

        const amount = root.querySelector('#billAmount');
        amount.addEventListener('input', () => {
          const d = amount.value.replace(/\D/g, '');
          form.amount = d ? parseInt(d, 10) : 0;
          amount.value = d ? U.fmtNumber(form.amount) : '';
        });
        setTimeout(() => root.querySelector('#billName').focus({ preventScroll: true }), 350);

        root.querySelector('#billSave').addEventListener('click', () => {
          const name = root.querySelector('#billName').value.trim();
          const due = U.clamp(U.num(root.querySelector('#billDue').value), 1, 31);
          if (!name) { root.querySelector('#billName').classList.add('is-error'); U.toast('Nama tagihan belum diisi', 'error'); return; }
          if (!form.amount || form.amount <= 0) { amount.classList.add('is-error'); U.toast('Jumlah tagihan belum diisi', 'error'); return; }
          const payload = {
            name,
            amount: form.amount,
            dueDay: due,
            categoryId: root.querySelector('#billCategory').value,
            walletId: root.querySelector('#billWallet').value,
            emoji: emojiState.value,
            color: form.color,
          };
          if (editing) S.updateBill(editing.id, payload);
          else S.addBill(payload);
          U.closeSheet();
          U.haptic(18);
          U.toast(editing ? 'Tagihan diperbarui' : 'Tagihan wajib ditambahkan', 'success', name);
          if (window.App) window.App.refresh();
        });

        const del = root.querySelector('#billDelete');
        if (del) {
          del.addEventListener('click', async () => {
            const yes = await U.confirmDialog({
              title: 'Hapus tagihan wajib?',
              message: 'Tagihan tidak akan muncul lagi setiap bulan. Riwayat pembayaran yang sudah tercatat tetap tersimpan.',
              confirmText: 'Hapus',
            });
            if (!yes) return;
            S.deleteBill(editing.id);
            U.closeSheet();
            U.toast('Tagihan dihapus', 'info');
            if (window.App) window.App.refresh();
          });
        }
      },
    });
    return overlay;
  }

  function toggleBill(billId, month) {
    const bill = S.get().bills.find((b) => b.id === billId);
    const wasPaid = bill && (bill.paidMonths || []).includes(month);
    S.toggleBillPaid(billId, month);
    U.haptic(15);
    if (wasPaid) U.toast('Ditandai belum dibayar', 'info', bill ? bill.name : '');
    else U.toast('Tagihan lunas!', 'success', bill ? bill.name + ' · ' + moneyAbs(bill.amount) : '');
    if (window.App) window.App.refresh();
  }

  function openBillTxInfo(txId) {
    const tx = S.transactionById(txId);
    if (!tx) return;
    const bill = S.get().bills.find((b) => b.id === tx.billId);
    const wallet = S.walletById(tx.walletId);
    const month = tx.billMonth || U.monthKeyOf(tx.date);
    const content = `
      <div class="tx-preview">
        <div class="tp-emoji">${bill ? bill.emoji : '🧾'}</div>
        <div class="tp-main">
          <strong>${U.escapeHTML(tx.note || (bill ? bill.name : 'Tagihan'))}</strong>
          <span>Pembayaran tagihan otomatis</span>
        </div>
        <div class="tp-amount">${moneyAbs(tx.amount)}</div>
      </div>
      <div class="confirm-summary">
        <div class="confirm-row"><span>Bulan tagihan</span><strong>${U.monthLabel(month)}</strong></div>
        <div class="confirm-row"><span>Tanggal bayar</span><strong>${U.fullDateLabel(tx.date)}</strong></div>
        <div class="confirm-row"><span>Dompet</span><strong>${U.escapeHTML(wallet ? wallet.name : '-')}</strong></div>
        <div class="confirm-row"><span>Status</span><strong style="color:var(--emerald-deep)">Lunas</strong></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-block" onclick="U.closeSheet(); App.go('bills')">Buka Tagihan</button>
        <button class="btn btn-coral btn-block" id="unpayBill">Tandai Belum Lunas</button>
      </div>
      <p class="input-hint" style="margin-top:10px">Untuk mengubah nominal, buka tagihan wajibnya. Perubahan akan menyinkronkan pembayaran bulan ini.</p>
    `;
    U.openSheet({
      title: 'Pembayaran Tagihan',
      subtitle: 'Transaksi ini terhubung ke tagihan wajib bulanan',
      content,
      onMount(root) {
        root.querySelector('#unpayBill').addEventListener('click', async () => {
          const yes = await U.confirmDialog({
            title: 'Tandai belum lunas?',
            message: 'Transaksi pembayaran ini akan dihapus dan tagihan kembali ke status belum dibayar.',
            confirmText: 'Ya, batalkan',
          });
          if (!yes) return;
          S.toggleBillPaid(tx.billId, month);
          U.closeSheet();
          U.toast('Pembayaran dibatalkan', 'info');
          if (window.App) window.App.refresh();
        });
      },
    });
  }

  /* ============================================================
     Savings goal sheets
     ============================================================ */
  function openGoalSheet(goalId = null) {
    const editing = goalId ? S.get().goals.find((g) => g.id === goalId) : null;
    const form = {
      name: editing ? editing.name : '',
      target: editing ? editing.target : 0,
      saved: editing ? editing.saved : 0,
      deadline: editing ? editing.deadline || '' : '',
      emoji: editing ? editing.emoji : '🎯',
      color: editing ? editing.color : '#f59e0b',
    };
    const content = `
      <div class="field">
        <div class="field-label"><span>Nama target</span></div>
        <input class="input" id="goalName" maxlength="32" placeholder="Contoh: Dana Darurat" value="${U.escapeHTML(form.name)}" />
      </div>
      <div class="field">
        <div class="field-label"><span>Target dana</span></div>
        <div class="input-group">
          <span class="prefix">Rp</span>
          <input class="input" id="goalTarget" inputmode="numeric" placeholder="0" value="${form.target ? U.fmtNumber(form.target) : ''}" />
        </div>
      </div>
      ${!editing ? `
      <div class="field">
        <div class="field-label"><span>Dana terkumpul saat ini</span><span class="opt">opsional</span></div>
        <div class="input-group">
          <span class="prefix">Rp</span>
          <input class="input" id="goalSaved" inputmode="numeric" placeholder="0" value="${form.saved ? U.fmtNumber(form.saved) : ''}" />
        </div>
      </div>` : ''}
      <div class="field">
        <div class="field-label"><span>Target tanggal</span><span class="opt">opsional</span></div>
        <input class="input" id="goalDeadline" type="date" value="${form.deadline}" />
      </div>
      <div class="field">
        <div class="field-label"><span>Ikon target</span></div>
        ${emojiPicker(GOAL_EMOJIS, form.emoji, 'goal')}
      </div>
      <div class="field" style="margin-bottom:0">
        <div class="field-label"><span>Warna target</span></div>
        ${colorPicker(S.palettes.category.slice(0, 8), form.color)}
      </div>
    `;
    const footer = `
      <div style="display:flex;gap:8px">
        ${editing ? `<button class="btn btn-ghost" id="goalDelete" style="width:52px;flex:none;padding:0" aria-label="Hapus target">${U.icon('trash', 18)}</button>` : ''}
        <button class="btn btn-amber btn-block" id="goalSave">${U.icon('flag', 18)} ${editing ? 'Simpan Perubahan' : 'Buat Target'}</button>
      </div>`;

    U.openSheet({
      title: editing ? 'Edit Target Tabungan' : 'Target Tabungan Baru',
      subtitle: 'Tentukan tujuan finansial dan pantau progresnya',
      content,
      footer,
      onMount(root) {
        const stateEmoji = { value: form.emoji };
        const stateColor = { value: form.color };
        root.querySelectorAll('[data-emoji-picker="goal"] .emoji-pick').forEach((b) => {
          b.addEventListener('click', () => {
            stateEmoji.value = b.dataset.emoji;
            root.querySelectorAll('[data-emoji-picker="goal"] .emoji-pick').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        root.querySelectorAll('[data-color-picker] .color-dot').forEach((b) => {
          b.addEventListener('click', () => {
            stateColor.value = b.dataset.color;
            root.querySelectorAll('[data-color-picker] .color-dot').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        const target = root.querySelector('#goalTarget');
        const saved = root.querySelector('#goalSaved');
        [target, saved].forEach((inp) => {
          if (!inp) return;
          inp.addEventListener('input', () => {
            const d = inp.value.replace(/\D/g, '');
            inp.value = d ? U.fmtNumber(parseInt(d, 10)) : '';
          });
        });
        setTimeout(() => root.querySelector('#goalName').focus({ preventScroll: true }), 350);

        root.querySelector('#goalSave').addEventListener('click', () => {
          const name = root.querySelector('#goalName').value.trim();
          const targetVal = U.parseMoney(target.value);
          const savedVal = saved ? U.parseMoney(saved.value) : 0;
          if (!name) { root.querySelector('#goalName').classList.add('is-error'); U.toast('Nama target belum diisi', 'error'); return; }
          if (!targetVal) { target.classList.add('is-error'); U.toast('Target dana belum diisi', 'error'); return; }
          if (editing) {
            S.updateGoal(editing.id, {
              name, target: targetVal, emoji: stateEmoji.value, color: stateColor.value,
              deadline: root.querySelector('#goalDeadline').value,
            });
          } else {
            S.addGoal({
              name, target: targetVal, saved: savedVal, emoji: stateEmoji.value,
              color: stateColor.value, deadline: root.querySelector('#goalDeadline').value,
            });
          }
          U.closeSheet();
          U.haptic(18);
          U.toast(editing ? 'Target diperbarui' : 'Target tabungan dibuat', 'success', name);
          if (window.App) window.App.refresh();
        });

        const del = root.querySelector('#goalDelete');
        if (del) {
          del.addEventListener('click', async () => {
            const yes = await U.confirmDialog({
              title: 'Hapus target tabungan?',
              message: 'Seluruh riwayat setoran pada target ini ikut dihapus. Saldo dompet tidak berubah.',
              confirmText: 'Hapus',
            });
            if (!yes) return;
            S.deleteGoal(editing.id);
            U.closeSheet();
            U.toast('Target dihapus', 'info');
            if (window.App) window.App.refresh();
          });
        }
      },
    });
  }

  function openFundSheet(goalId) {
    const goal = S.get().goals.find((g) => g.id === goalId);
    if (!goal) return;
    let mode = 'add';
    let amount = 0;
    const remaining = Math.max(0, goal.target - goal.saved);
    const content = `
      <div class="tx-preview">
        <div class="tp-emoji">${goal.emoji}</div>
        <div class="tp-main">
          <strong>${U.escapeHTML(goal.name)}</strong>
          <span>${money(goal.saved)} dari ${money(goal.target)}</span>
        </div>
        <div class="tp-amount">${Math.round((goal.saved / goal.target) * 100)}%</div>
      </div>
      <div class="type-picker" style="grid-template-columns:1fr 1fr" id="fundMode">
        <button type="button" data-mode="add" class="is-active" style="grid-column:auto">${U.icon('plus', 15)} Tambah Dana</button>
        <button type="button" data-mode="withdraw">${U.icon('arrowUp', 15)} Tarik Dana</button>
      </div>
      <div class="amount-field" id="fundAmountField">
        <div class="amount-label"><span>Jumlah</span><span style="text-transform:none;letter-spacing:0;font-weight:600" id="fundHint">Sisa ${money(remaining)}</span></div>
        <div class="amount-input-row">
          <span class="rp">Rp</span>
          <input class="amount-input" id="fundAmount" inputmode="numeric" placeholder="0" />
        </div>
        <div class="quick-amounts">
          ${[100000, 250000, 500000, 1000000].map((a) => `<button type="button" class="quick-amount" data-fund="${a}">+${U.fmtNumber(a / 1000)}rb</button>`).join('')}
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <div class="field-label"><span>Catatan</span><span class="opt">opsional</span></div>
        <input class="input" id="fundNote" maxlength="50" placeholder="Contoh: Setoran bulanan" />
      </div>
    `;
    U.openSheet({
      title: 'Kelola Dana Target',
      subtitle: goal.name,
      content,
      footer: `<button class="btn btn-amber btn-block" id="fundSave">${U.icon('check', 18)} Simpan Setoran</button>`,
      onMount(root) {
        const input = root.querySelector('#fundAmount');
        const save = root.querySelector('#fundSave');
        root.querySelector('#fundMode').querySelectorAll('button').forEach((b) => {
          b.addEventListener('click', () => {
            mode = b.dataset.mode;
            root.querySelectorAll('#fundMode button').forEach((x) => x.classList.toggle('is-active', x === b));
            root.querySelector('#fundHint').textContent = mode === 'add' ? `Sisa ${money(remaining)}` : `Tersedia ${money(goal.saved)}`;
            root.querySelector('#fundAmountField').classList.toggle('is-income', mode === 'add');
            root.querySelector('#fundAmountField').classList.toggle('is-expense', mode === 'withdraw');
            save.className = `btn btn-block ${mode === 'add' ? 'btn-amber' : 'btn-coral'}`;
            save.innerHTML = `${U.icon('check', 18)} ${mode === 'add' ? 'Tambah ke Target' : 'Tarik dari Target'}`;
          });
        });
        input.addEventListener('input', () => {
          const d = input.value.replace(/\D/g, '');
          amount = d ? parseInt(d, 10) : 0;
          input.value = d ? U.fmtNumber(amount) : '';
        });
        root.querySelectorAll('[data-fund]').forEach((b) => {
          b.addEventListener('click', () => {
            amount = U.num(b.dataset.fund);
            input.value = U.fmtNumber(amount);
          });
        });
        setTimeout(() => input.focus({ preventScroll: true }), 380);

        save.addEventListener('click', () => {
          if (!amount) { input.classList.add('is-error'); U.toast('Jumlah belum diisi', 'error'); return; }
          if (mode === 'withdraw' && amount > goal.saved) { input.classList.add('is-error'); U.toast('Melebihi dana terkumpul', 'error'); return; }
          S.adjustGoal(goal.id, mode === 'add' ? amount : -amount, root.querySelector('#fundNote').value.trim());
          U.closeSheet();
          U.haptic(18);
          U.toast(mode === 'add' ? 'Dana ditambahkan' : 'Dana ditarik', 'success', moneyAbs(amount) + ' · ' + goal.name);
          if (window.App) window.App.refresh();
        });
      },
    });
  }

  /* ============================================================
     Budget sheet
     ============================================================ */
  function openBudgetSheet(categoryId = null) {
    const month = U.currentMonthKey();
    const categories = S.get().categories.expense;
    let catId = categoryId || (categories.find((c) => !S.get().budgets[c.id]) || categories[0] || {}).id;
    const existing = S.get().budgets[catId] || 0;

    const content = `
      <div class="field">
        <div class="field-label"><span>Kategori pengeluaran</span></div>
        <div class="chip-wrap" id="budgetCats">
          ${categories.map((c) => `<button type="button" class="chip ${c.id === catId ? 'is-active is-expense' : ''}" data-bcat="${c.id}"><span class="chip-emoji">${c.emoji}</span>${U.escapeHTML(c.name)}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="field-label"><span>Batas pengeluaran / bulan</span></div>
        <div class="input-group">
          <span class="prefix">Rp</span>
          <input class="input" id="budgetLimit" inputmode="numeric" placeholder="0" value="${existing ? U.fmtNumber(existing) : ''}" />
        </div>
        <div class="input-hint" id="budgetSpentHint"></div>
      </div>
      <div class="quick-amounts" style="margin-top:-4px">
        ${[500000, 1000000, 1500000, 2500000, 5000000].map((a) => `<button type="button" class="quick-amount" data-budget="${a}">${U.fmtCompact(a)}</button>`).join('')}
      </div>
    `;
    const footer = `
      <div style="display:flex;gap:8px">
        ${existing ? `<button class="btn btn-ghost" id="budgetDelete" style="width:52px;flex:none;padding:0" aria-label="Hapus anggaran">${U.icon('trash', 18)}</button>` : ''}
        <button class="btn btn-primary btn-block" id="budgetSave">${U.icon('check', 18)} Simpan Anggaran</button>
      </div>`;

    U.openSheet({
      title: 'Atur Anggaran',
      subtitle: 'Batas pengeluaran bulanan per kategori',
      content,
      footer,
      onMount(root) {
        const limit = root.querySelector('#budgetLimit');
        const hint = root.querySelector('#budgetSpentHint');
        const updateHint = () => {
          const cat = S.categoryById(catId);
          const spent = S.categorySpent(month, catId);
          const lim = U.parseMoney(limit.value);
          hint.innerHTML = `${cat ? cat.emoji + ' ' + U.escapeHTML(cat.name) : ''} sudah terpakai <strong>${money(spent)}</strong> bulan ini${lim ? ` · ${Math.round((spent / lim) * 100)}% dari batas` : ''}.`;
        };
        updateHint();
        limit.addEventListener('input', () => {
          const d = limit.value.replace(/\D/g, '');
          limit.value = d ? U.fmtNumber(parseInt(d, 10)) : '';
          updateHint();
        });
        root.querySelectorAll('[data-budget]').forEach((b) => {
          b.addEventListener('click', () => { limit.value = U.fmtNumber(U.num(b.dataset.budget)); updateHint(); });
        });
        root.querySelectorAll('[data-bcat]').forEach((b) => {
          b.addEventListener('click', () => {
            catId = b.dataset.bcat;
            root.querySelectorAll('[data-bcat]').forEach((x) => x.classList.toggle('is-active', x === b));
            root.querySelectorAll('[data-bcat]').forEach((x) => x.classList.toggle('is-expense', x === b));
            limit.value = S.get().budgets[catId] ? U.fmtNumber(S.get().budgets[catId]) : '';
            updateHint();
          });
        });
        setTimeout(() => limit.focus({ preventScroll: true }), 380);
        root.querySelector('#budgetSave').addEventListener('click', () => {
          const val = U.parseMoney(limit.value);
          if (!val) { limit.classList.add('is-error'); U.toast('Batas anggaran belum diisi', 'error'); return; }
          S.setBudget(catId, val);
          U.closeSheet();
          U.haptic(15);
          U.toast('Anggaran disimpan', 'success', U.fmtMoney(val) + ' / bulan');
          if (window.App) window.App.refresh();
        });
        const del = root.querySelector('#budgetDelete');
        if (del) {
          del.addEventListener('click', () => {
            S.setBudget(catId, 0);
            U.closeSheet();
            U.toast('Anggaran dihapus', 'info');
            if (window.App) window.App.refresh();
          });
        }
      },
    });
  }

  /* ============================================================
     History filter sheet
     ============================================================ */
  function openFilterSheet(filters, onApply) {
    const cats = [...S.get().categories.income, ...S.get().categories.expense];
    const wallets = S.get().wallets;
    const content = `
      <div class="field">
        <div class="field-label"><span>Kategori</span></div>
        <select class="select" id="fltCategory">
          <option value="all">Semua kategori</option>
          <optgroup label="Pemasukan">
            ${S.get().categories.income.map((c) => `<option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>${c.emoji} ${U.escapeHTML(c.name)}</option>`).join('')}
          </optgroup>
          <optgroup label="Pengeluaran">
            ${S.get().categories.expense.map((c) => `<option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>${c.emoji} ${U.escapeHTML(c.name)}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="field">
        <div class="field-label"><span>Dompet</span></div>
        <select class="select" id="fltWallet">
          <option value="all">Semua dompet</option>
          ${wallets.map((w) => `<option value="${w.id}" ${filters.walletId === w.id ? 'selected' : ''}>${w.emoji || '💳'} ${U.escapeHTML(w.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        <div class="field">
          <div class="field-label"><span>Dari tanggal</span></div>
          <input class="input" type="date" id="fltFrom" value="${filters.from || ''}" />
        </div>
        <div class="field">
          <div class="field-label"><span>Sampai tanggal</span></div>
          <input class="input" type="date" id="fltTo" value="${filters.to || ''}" />
        </div>
      </div>
      <div class="quick-amounts" style="margin-top:-6px">
        <button type="button" class="quick-amount" data-range="7">7 hari</button>
        <button type="button" class="quick-amount" data-range="30">30 hari</button>
        <button type="button" class="quick-amount" data-range="month">Bulan ini</button>
      </div>
    `;
    const footer = `
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" id="fltReset" style="flex:1">Reset</button>
        <button class="btn btn-primary" id="fltApply" style="flex:2">${U.icon('filter', 16)} Terapkan</button>
      </div>`;
    U.openSheet({
      title: 'Filter Transaksi',
      subtitle: 'Temukan transaksi berdasarkan kategori, dompet, atau tanggal',
      content,
      footer,
      onMount(root) {
        root.querySelectorAll('[data-range]').forEach((b) => {
          b.addEventListener('click', () => {
            const r = b.dataset.range;
            if (r === 'month') {
              const [y, m] = U.currentMonthKey().split('-').map(Number);
              root.querySelector('#fltFrom').value = `${y}-${U.pad(m)}-01`;
              root.querySelector('#fltTo').value = U.todayISO();
            } else {
              root.querySelector('#fltFrom').value = U.addDays(U.todayISO(), -Number(r) + 1);
              root.querySelector('#fltTo').value = U.todayISO();
            }
          });
        });
        root.querySelector('#fltReset').addEventListener('click', () => {
          U.closeSheet();
          onApply({ categoryId: 'all', walletId: 'all', from: '', to: '' });
        });
        root.querySelector('#fltApply').addEventListener('click', () => {
          const from = root.querySelector('#fltFrom').value;
          const to = root.querySelector('#fltTo').value;
          if (from && to && from > to) { U.toast('Rentang tanggal tidak valid', 'error'); return; }
          U.closeSheet();
          onApply({
            categoryId: root.querySelector('#fltCategory').value,
            walletId: root.querySelector('#fltWallet').value,
            from, to,
          });
        });
      },
    });
  }

  /* ============================================================
     Manage wallets & categories
     ============================================================ */
  function openManageWallets() {
    const wallets = S.get().wallets;
    const total = S.totalBalance();
    const content = `
      <div class="confirm-summary" style="display:flex;align-items:center;justify-content:space-between">
        <div><div style="font-size:9.5px;color:var(--muted);font-weight:600">Total saldo semua dompet</div>
        <div style="font-size:19px;font-weight:800;letter-spacing:-.03em;margin-top:2px">${money(total)}</div></div>
        <div style="width:38px;height:38px;border-radius:12px;background:var(--purple-soft);color:var(--indigo);display:grid;place-items:center">${U.icon('wallet', 20)}</div>
      </div>
      <div style="margin-top:6px">
        ${wallets.map((w) => `
          <div class="wallet-manage-row">
            <div class="wallet-tile" style="background:${w.color}1c">${w.emoji || '💳'}</div>
            <div class="wallet-manage-main">
              <div class="wallet-manage-name">${U.escapeHTML(w.name)}</div>
              <div class="wallet-manage-sub">Saldo awal ${moneyAbs(w.initial)}</div>
            </div>
            <div class="wallet-manage-balance">${money(S.walletBalance(w.id))}</div>
            <button class="wallet-manage-edit" onclick="UI.openWalletSheet('${w.id}')" aria-label="Edit ${U.escapeHTML(w.name)}">${U.icon('edit', 14)}</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:16px" onclick="UI.openWalletSheet()">${U.icon('plus', 16)} Tambah Dompet Baru</button>
      <p class="input-hint" style="text-align:center;margin-top:10px">Dompet yang masih dipakai transaksi tidak bisa dihapus.</p>
    `;
    U.openSheet({ title: 'Dompet & Akun', subtitle: 'Kelola sumber dana kamu', content });
  }

  function openWalletSheet(walletId = null) {
    const editing = walletId ? S.walletById(walletId) : null;
    const form = {
      name: editing ? editing.name : '',
      emoji: editing ? editing.emoji : '💳',
      color: editing ? editing.color : '#6366f1',
      initial: editing ? editing.initial : 0,
    };
    const content = `
      <div class="field">
        <div class="field-label"><span>Nama dompet</span></div>
        <input class="input" id="walletName" maxlength="24" placeholder="Contoh: Mandiri, GoPay, Cash" value="${U.escapeHTML(form.name)}" />
      </div>
      <div class="field">
        <div class="field-label"><span>Saldo awal</span><span class="opt">${editing ? 'menyesuaikan saldo' : 'opsional'}</span></div>
        <div class="input-group">
          <span class="prefix">Rp</span>
          <input class="input" id="walletInitial" inputmode="numeric" placeholder="0" value="${form.initial ? U.fmtNumber(form.initial) : ''}" />
        </div>
        <div class="input-hint">Saldo akhir = saldo awal + pemasukan − pengeluaran.</div>
      </div>
      <div class="field">
        <div class="field-label"><span>Ikon dompet</span></div>
        ${emojiPicker(WALLET_EMOJIS, form.emoji, 'wallet')}
      </div>
      <div class="field" style="margin-bottom:0">
        <div class="field-label"><span>Warna</span></div>
        ${colorPicker(S.palettes.wallet, form.color)}
      </div>
    `;
    const footer = `
      <div style="display:flex;gap:8px">
        ${editing ? `<button class="btn btn-ghost" id="walletDelete" style="width:52px;flex:none;padding:0" aria-label="Hapus dompet">${U.icon('trash', 18)}</button>` : ''}
        <button class="btn btn-primary btn-block" id="walletSave">${U.icon('check', 18)} ${editing ? 'Simpan' : 'Tambah Dompet'}</button>
      </div>`;
    U.openSheet({
      title: editing ? 'Edit Dompet' : 'Dompet Baru',
      subtitle: 'Data dompet disimpan lokal di perangkat',
      content,
      footer,
      onMount(root) {
        const emojiState = { value: form.emoji };
        const colorState = { value: form.color };
        root.querySelectorAll('[data-emoji-picker="wallet"] .emoji-pick').forEach((b) => {
          b.addEventListener('click', () => {
            emojiState.value = b.dataset.emoji;
            root.querySelectorAll('[data-emoji-picker="wallet"] .emoji-pick').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        root.querySelectorAll('[data-color-picker] .color-dot').forEach((b) => {
          b.addEventListener('click', () => {
            colorState.value = b.dataset.color;
            root.querySelectorAll('[data-color-picker] .color-dot').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        const initial = root.querySelector('#walletInitial');
        initial.addEventListener('input', () => {
          const d = initial.value.replace(/\D/g, '');
          initial.value = d ? U.fmtNumber(parseInt(d, 10)) : '';
        });
        setTimeout(() => root.querySelector('#walletName').focus({ preventScroll: true }), 350);

        root.querySelector('#walletSave').addEventListener('click', () => {
          const name = root.querySelector('#walletName').value.trim();
          if (!name) { root.querySelector('#walletName').classList.add('is-error'); U.toast('Nama dompet belum diisi', 'error'); return; }
          const payload = { name, emoji: emojiState.value, color: colorState.value, initial: U.parseMoney(initial.value) };
          if (editing) S.updateWallet(editing.id, payload);
          else S.addWallet(payload);
          U.closeSheet();
          U.haptic(15);
          U.toast(editing ? 'Dompet diperbarui' : 'Dompet ditambahkan', 'success', name);
          if (window.App) window.App.refresh();
        });

        const del = root.querySelector('#walletDelete');
        if (del) {
          del.addEventListener('click', async () => {
            const yes = await U.confirmDialog({
              title: 'Hapus dompet?',
              message: 'Dompet hanya bisa dihapus jika belum dipakai transaksi atau tagihan.',
              confirmText: 'Hapus',
            });
            if (!yes) return;
            const res = S.deleteWallet(editing.id);
            if (!res.ok) { U.toast(res.reason, 'error'); return; }
            U.closeSheet();
            U.toast('Dompet dihapus', 'info');
            if (window.App) window.App.refresh();
          });
        }
      },
    });
  }

  function openManageCategories(kind = 'expense') {
    let active = kind;
    const content = `
      <div class="segment" style="margin-bottom:14px" id="catKindSegment">
        <button data-kind="income" class="${active === 'income' ? 'is-active' : ''}">Pemasukan</button>
        <button data-kind="expense" class="${active === 'expense' ? 'is-active' : ''}">Pengeluaran</button>
      </div>
      <div id="catManageList"></div>
      <button class="btn btn-ghost btn-block" style="margin-top:14px" id="addCatBtn">${U.icon('plus', 16)} Tambah Kategori Baru</button>
    `;
    U.openSheet({
      title: 'Kategori',
      subtitle: 'Sesuaikan kategori dengan gaya hidup kamu',
      content,
      onMount(root) {
        const list = root.querySelector('#catManageList');
        const renderList = () => {
          const cats = S.get().categories[active];
          list.innerHTML = cats.map((c) => {
            const used = S.get().transactions.filter((t) => t.categoryId === c.id).length;
            return `
              <div class="category-manage-row">
                <div class="cat-manage-emoji" style="background:${c.color}18">${c.emoji}</div>
                <div class="cat-manage-name">${U.escapeHTML(c.name)}</div>
                <div class="cat-manage-count">${used} transaksi</div>
                <button class="cat-manage-del" onclick="UI.deleteCategoryConfirm('${c.id}')" aria-label="Hapus kategori ${U.escapeHTML(c.name)}">${U.icon('trash', 13)}</button>
              </div>`;
          }).join('') || '<p class="input-hint">Belum ada kategori.</p>';
        };
        renderList();
        root.querySelectorAll('#catKindSegment button').forEach((b) => {
          b.addEventListener('click', () => {
            active = b.dataset.kind;
            root.querySelectorAll('#catKindSegment button').forEach((x) => x.classList.toggle('is-active', x === b));
            renderList();
          });
        });
        root.querySelector('#addCatBtn').addEventListener('click', () => openCategorySheet(active));
      },
    });
  }

  function openCategorySheet(kind = 'expense', categoryId = null) {
    const editing = categoryId ? S.categoryById(categoryId) : null;
    const form = {
      kind: editing ? editing.kind : kind,
      name: editing ? editing.name : '',
      emoji: editing ? editing.emoji : kind === 'income' ? '💰' : '🏷️',
      color: editing ? editing.color : S.palettes.category[0],
    };
    const content = `
      <div class="field">
        <div class="field-label"><span>Nama kategori</span></div>
        <input class="input" id="catName" maxlength="24" placeholder="Contoh: Kopi, Laundry, Gaji" value="${U.escapeHTML(form.name)}" />
      </div>
      <div class="field">
        <div class="field-label"><span>Ikon</span></div>
        ${emojiPicker(CAT_EMOJIS, form.emoji, 'cat')}
      </div>
      <div class="field" style="margin-bottom:0">
        <div class="field-label"><span>Warna</span></div>
        ${colorPicker(S.palettes.category, form.color)}
      </div>
    `;
    U.openSheet({
      title: 'Kategori Baru',
      subtitle: `Untuk ${form.kind === 'income' ? 'pemasukan' : 'pengeluaran'} · buat kategori sesuai kebutuhanmu`,
      content,
      footer: `<button class="btn btn-primary btn-block" id="catSave">${U.icon('check', 18)} Simpan Kategori</button>`,
      onMount(root) {
        const emojiState = { value: form.emoji };
        const colorState = { value: form.color };
        root.querySelectorAll('[data-emoji-picker="cat"] .emoji-pick').forEach((b) => {
          b.addEventListener('click', () => {
            emojiState.value = b.dataset.emoji;
            root.querySelectorAll('[data-emoji-picker="cat"] .emoji-pick').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        root.querySelectorAll('[data-color-picker] .color-dot').forEach((b) => {
          b.addEventListener('click', () => {
            colorState.value = b.dataset.color;
            root.querySelectorAll('[data-color-picker] .color-dot').forEach((x) => x.classList.toggle('is-active', x === b));
          });
        });
        setTimeout(() => root.querySelector('#catName').focus({ preventScroll: true }), 350);
        root.querySelector('#catSave').addEventListener('click', () => {
          const name = root.querySelector('#catName').value.trim();
          if (!name) { root.querySelector('#catName').classList.add('is-error'); U.toast('Nama kategori belum diisi', 'error'); return; }
          const cat = S.addCategory(form.kind, name, emojiState.value, colorState.value);
          if (cat) {
            U.closeSheet();
            U.haptic(15);
            U.toast('Kategori ditambahkan', 'success', name);
            if (window.App) window.App.refresh();
          }
        });
      },
    });
  }

  function deleteCategoryConfirm(categoryId) {
    (async () => {
      const cat = S.categoryById(categoryId);
      if (!cat) return;
      const yes = await U.confirmDialog({
        title: 'Hapus kategori?',
        message: `Kategori "${cat.name}" hanya bisa dihapus jika belum dipakai transaksi.`,
        confirmText: 'Hapus',
      });
      if (!yes) return;
      const res = S.deleteCategory(categoryId);
      if (!res.ok) { U.toast(res.reason, 'error'); return; }
      U.closeSheet();
      U.toast('Kategori dihapus', 'info');
      if (window.App) window.App.refresh();
    })();
  }

  /* ============================================================
     Settings sheets
     ============================================================ */
  function openProfileSheet() {
    const s = S.get();
    U.openSheet({
      title: 'Profil Kamu',
      subtitle: 'Nama akan tampil di dashboard',
      content: `
        <div class="field">
          <div class="field-label"><span>Nama panggilan</span></div>
          <input class="input" id="profileName" maxlength="28" value="${U.escapeHTML(s.settings.name)}" placeholder="Nama kamu" />
        </div>
        <div class="inline-panel" style="margin-top:0">
          <div style="font-size:10px;font-weight:700;color:var(--text-2);display:flex;align-items:center;gap:5px">${U.icon('shield', 13)} Privasi terjamin</div>
          <p style="font-size:9.5px;color:var(--muted);margin-top:4px;line-height:1.55">Semua data tersimpan di perangkat kamu (localStorage). Tidak ada data yang dikirim ke server.</p>
        </div>
      `,
      footer: `<button class="btn btn-primary btn-block" id="profileSave">${U.icon('check', 18)} Simpan Profil</button>`,
      onMount(root) {
        setTimeout(() => root.querySelector('#profileName').focus({ preventScroll: true }), 350);
        root.querySelector('#profileSave').addEventListener('click', () => {
          const name = root.querySelector('#profileName').value.trim();
          if (!name) { U.toast('Nama belum diisi', 'error'); return; }
          S.setSettings({ name });
          U.closeSheet();
          U.toast('Profil diperbarui', 'success', name);
          if (window.App) window.App.refresh();
        });
      },
    });
  }

  function openAboutSheet() {
    U.openSheet({
      title: 'Tentang FinTrack',
      subtitle: 'Versi 1.0.0 · Offline-first',
      content: `
        <div class="tx-preview" style="background:linear-gradient(135deg,var(--purple-soft),var(--coral-soft))">
          <div class="tp-emoji">💜</div>
          <div class="tp-main">
            <strong>FinTrack Professional</strong>
            <span>Daily & fixed expense tracker</span>
          </div>
        </div>
        <div class="confirm-summary">
          <div class="confirm-row"><span>Tersimpan lokal</span><strong>${S.get().transactions.length} transaksi</strong></div>
          <div class="confirm-row"><span>Dompet aktif</span><strong>${S.get().wallets.length} dompet</strong></div>
          <div class="confirm-row"><span>Tagihan wajib</span><strong>${S.get().bills.length} tagihan</strong></div>
          <div class="confirm-row"><span>Mode</span><strong>100% offline</strong></div>
        </div>
        <div class="inline-panel" style="margin-top:0">
          <div class="inline-panel-title">${U.icon('shield', 12)} Data milikmu</div>
          <p style="font-size:9.5px;color:var(--muted);line-height:1.6">FinTrack tidak memiliki server dan tidak mengirim data ke mana pun. Ekspor data secara berkala sebagai cadangan jika ingin memasang ulang aplikasi.</p>
        </div>
        <p class="input-hint" style="text-align:center;margin-top:14px">Dibuat untuk mengatur uang dengan lebih tenang.</p>
      `,
      footer: `<button class="btn btn-primary btn-block" onclick="U.closeSheet()">Tutup</button>`,
    });
  }

  function openResetSheet() {
    U.openSheet({
      title: 'Reset Data',
      subtitle: 'Tindakan ini tidak bisa dibatalkan',
      content: `
        <div class="inline-panel" style="margin-top:0;border-color:rgba(244,63,94,.3);background:var(--coral-soft)">
          <div style="font-size:10.5px;font-weight:800;color:var(--coral-ink);display:flex;align-items:center;gap:5px">${U.icon('alert', 14)} Ekspor dulu jika perlu</div>
          <p style="font-size:9.5px;color:var(--muted);margin-top:4px;line-height:1.55">Semua transaksi, tagihan, target, dan dompet di perangkat ini akan dihapus.</p>
        </div>
        <button class="btn btn-ghost btn-block" style="margin-top:12px;justify-content:flex-start" id="resetDemo">${U.icon('sparkles', 17)} <span style="text-align:left">Muat ulang data contoh<span style="display:block;font-size:9px;color:var(--muted);font-weight:600">Cocok untuk menjelajahi fitur aplikasi</span></span></button>
        <button class="btn btn-danger btn-block" style="margin-top:8px" id="resetEmpty">${U.icon('trash', 17)} Kosongkan Semua Data</button>
      `,
      footer: `<button class="btn btn-ghost btn-block" onclick="U.closeSheet()">Tutup</button>`,
      onMount(root) {
        root.querySelector('#resetDemo').addEventListener('click', async () => {
          const yes = await U.confirmDialog({ title: 'Muat data contoh?', message: 'Data saat ini akan diganti dengan data demo.', confirmText: 'Muat', danger: false });
          if (!yes) return;
          try { S.resetData(true); } catch (e) { console.error(e); }
          U.closeSheet();
          U.toast('Data contoh dimuat', 'success');
          if (window.App) { window.App.go('home'); window.App.refresh(); }
        });
        root.querySelector('#resetEmpty').addEventListener('click', async () => {
          const yes = await U.confirmDialog({ title: 'Kosongkan semua data?', message: 'Seluruh data keuangan akan dihapus permanen dari perangkat.', confirmText: 'Hapus semua' });
          if (!yes) return;
          try { S.resetData(false); } catch (e) { console.error(e); }
          U.closeSheet();
          U.toast('Semua data dikosongkan', 'info');
          if (window.App) { window.App.go('home'); window.App.refresh(); }
        });
      },
    });
  }

  return {
    money, moneyAbs, simple, initials, isHidden,
    txRow, billCard, goalCard, budgetRow, budgetRowFull, emptyState,
    openTransactionSheet, openBillSheet, toggleBill, openBillTxInfo,
    openGoalSheet, openFundSheet, openBudgetSheet, openFilterSheet,
    openManageWallets, openWalletSheet, openManageCategories, openCategorySheet, deleteCategoryConfirm,
    openProfileSheet, openAboutSheet, openResetSheet,
    emojiLists: { CAT_EMOJIS, WALLET_EMOJIS, GOAL_EMOJIS, BILL_EMOJIS },
  };
})();

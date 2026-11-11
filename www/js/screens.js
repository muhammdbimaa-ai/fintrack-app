/* ============================================================
   FinTrack — Screens
   ============================================================ */
window.Screens = (function () {
  'use strict';

  const U = window.U;
  const S = window.Store;
  const UI = window.UI;

  let bindQueue = [];

  const queue = (fn) => { bindQueue.push(fn); };
  const runBinds = () => {
    const tasks = bindQueue;
    bindQueue = [];
    tasks.forEach((fn) => {
      try { fn(document); } catch (e) { console.error(e); }
    });
  };

  const appUi = () => (window.App && window.App.ui) || { donutMode: 'category', planTab: 'goals', billMonth: U.currentMonthKey(), billFilter: 'all', history: { q: '', type: 'all', categoryId: 'all', walletId: 'all', from: '', to: '' } };

  const firstName = (name) => (name || '').trim().split(' ')[0] || 'Kamu';

  const totalCashOut = (stats) => stats.dailyExpense + stats.billPaid;

  /* ============================================================
     HOME
     ============================================================ */
  function home() {
    const s = S.get();
    const month = U.currentMonthKey();
    const stats = S.getMonthStats(month);
    const ui = appUi();
    const hide = UI.isHidden();
    const budgets = S.budgetProgress(month);
    const totalBudget = S.totalBudget();
    const budgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const budgetLeft = totalBudget - budgetSpent;
    const recent = [...s.transactions]
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      .slice(0, 4);
    const unpaid = stats.unpaidBillCount;
    const upcoming = S.upcomingBills(3);
    const goals = s.goals;
    const totalSaved = goals.reduce((sum, g) => sum + U.num(g.saved), 0);
    const totalTarget = goals.reduce((sum, g) => sum + U.num(g.target), 0);
    const goalPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    const cashflowOk = stats.discretionary >= 0;
    const today = U.todayISO();

    /* ---- donut segments ---- */
    const catEntries = Object.entries(stats.catTotals)
      .map(([id, val]) => {
        const cat = S.categoryById(id) || { name: 'Lainnya', emoji: '🧩', color: '#94a3b8' };
        return { id, label: cat.name, value: val, color: cat.color, emoji: cat.emoji };
      })
      .sort((a, b) => b.value - a.value);
    let catSegments = catEntries.slice(0, 5);
    if (catEntries.length > 5) {
      const rest = catEntries.slice(5).reduce((sum, c) => sum + c.value, 0);
      catSegments.push({ label: 'Kategori lain', value: rest, color: '#cbd5e1', emoji: '…' });
    }
    if (!catSegments.length) catSegments = [{ label: 'Belum ada', value: 1, color: 'var(--line-strong)' }];

    const allocSegments = [
      { label: 'Wajib bulanan', value: stats.fixedTotal, color: '#4338ca' },
      { label: 'Harian', value: stats.dailyExpense, color: '#fb7185' },
      { label: 'Tabungan', value: stats.savings, color: '#f59e0b' },
      { label: 'Uang bebas', value: Math.max(0, stats.discretionary), color: '#10b981' },
    ];
    const mode = ui.donutMode || 'category';
    const isCat = mode === 'category';
    const segments = isCat ? catSegments : allocSegments;
    const totalSegments = segments.reduce((sum, x) => sum + x.value, 0);
    const donut = Charts.donut(segments, {
      centerLabel: isCat ? 'Pengeluaran harian' : 'Total pemasukan',
      centerValue: hide ? '•••' : U.fmtCompact(isCat ? stats.dailyExpense : stats.income),
      centerSub: isCat ? `${catEntries.length} kategori` : `Alokasi ${U.monthLabel(month, 'short')}`,
    });
    queue(donut.bind);

    const legendRows = segments.map((seg) => {
      const pct = totalSegments > 0 ? (seg.value / totalSegments) * 100 : 0;
      return `
        <div class="legend-row">
          <span class="legend-dot" style="background:${seg.color}"></span>
          <span class="legend-name">${U.escapeHTML(seg.label)}</span>
          <span class="legend-val">${hide ? '•••' : U.fmtCompact(seg.value)}</span>
          <span class="legend-pct">${Math.round(pct)}%</span>
        </div>`;
    }).join('');

    /* ---- trend line (last 14 days) ---- */
    const trendDays = [];
    for (let i = 13; i >= 0; i--) {
      const iso = U.addDays(today, -i);
      const dayStats = U.monthKeyOf(iso) === month
        ? stats.dailySeries[U.dayNumber(iso) - 1]
        : null;
      trendDays.push({
        label: String(U.dayNumber(iso)),
        fullLabel: `${U.dayNumber(iso)} ${U.monthShort(U.monthKeyOf(iso))}`,
        value: dayStats ? dayStats.total : 0,
        iso,
      });
    }
    const trendTotal = trendDays.reduce((sum, d) => sum + d.value, 0);
    const trendAvg = Math.round(trendTotal / trendDays.filter((d) => d.value > 0).length || 0);
    const lineChart = Charts.line(trendDays, { color: '#5b4bf5', height: 152, ariaLabel: 'Tren pengeluaran 14 hari terakhir' });
    queue(lineChart.bind);

    /* ---- bills due banner ---- */
    const billsSection = s.bills.length === 0
      ? `<div class="card" style="padding:16px">${UI.emptyState({ icon: 'calendar', title: 'Belum ada tagihan wajib', text: 'Daftarkan listrik, wifi, kos, atau cicilan agar tidak terlewat.', cta: '1', ctaLabel: 'Tambah Tagihan', ctaAction: "UI.openBillSheet()" })}</div>`
      : unpaid > 0
        ? `
          <div class="due-banner">
            <div class="db-ico">${U.icon('bell', 18)}</div>
            <div class="db-main">
              <strong>${unpaid} tagihan belum dibayar</strong>
              <p>Total ${UI.money(stats.fixedUnpaid)} perlu disisihkan bulan ini.</p>
            </div>
            <button class="db-arrow" onclick="App.go('bills')" aria-label="Buka tagihan">${U.icon('chevronRight', 20)}</button>
          </div>
          <div class="due-mini-list">
            ${upcoming.map((b) => {
              const late = b.daysLeft < 0;
              const label = late ? `Lewat ${Math.abs(b.daysLeft)}h` : b.daysLeft === 0 ? 'Hari ini' : `${b.daysLeft} hari`;
              return `<div class="due-mini">
                <span class="due-mini-emoji">${b.emoji || '🧾'}</span>
                <span class="due-mini-name">${U.escapeHTML(b.name)}</span>
                <span class="due-mini-amount">${UI.moneyAbs(b.amount)}</span>
                <span class="due-mini-days ${late ? 'is-late' : ''}">${label}</span>
              </div>`;
            }).join('')}
          </div>`
        : `
          <div class="due-banner" style="background:var(--emerald-soft);border-color:rgba(16,185,129,.16)">
            <div class="db-ico" style="color:var(--emerald-deep)">${U.icon('checkCircle', 19)}</div>
            <div class="db-main">
              <strong>Semua tagihan bulan ini lunas!</strong>
              <p>Total ${UI.money(stats.fixedTotal)} sudah dibayar. Mantap 🎉</p>
            </div>
          </div>`;

    /* ---- budget rows ---- */
    const budgetPreview = budgets.slice(0, 3).map((bp) => {
      const tone = bp.rawPct >= 100 ? 'coral' : bp.rawPct >= 80 ? 'amber' : 'emerald';
      return `
        <div class="budget-item">
          <div class="budget-item-top">
            <div class="budget-emoji">${bp.category.emoji}</div>
            <div class="budget-meta">
              <div class="budget-name">${U.escapeHTML(bp.category.name)} ${bp.rawPct >= 100 ? `<span class="warn">${U.icon('alert', 11)}</span>` : ''}</div>
              <div class="budget-amounts"><strong>${UI.money(bp.spent)}</strong> dari ${UI.money(bp.limit)}</div>
            </div>
            <span class="budget-pct ${tone === 'coral' ? 'is-coral' : tone === 'amber' ? 'is-amber' : ''}">${Math.round(bp.rawPct)}%</span>
          </div>
          <div class="bar is-${tone}"><i style="width:${Math.min(100, bp.pct)}%"></i></div>
        </div>`;
    }).join('');

    return `
      <header class="home-head">
        <div class="home-greet">
          <span class="hello">${U.greeting()},</span>
          <h1>${U.escapeHTML(firstName(s.settings.name))} <span class="wave">👋</span></h1>
          <span class="home-date">${U.fullDateLabel(today)}</span>
        </div>
        <div class="head-actions">
          <button class="icon-btn head-bell" onclick="App.go('bills')" aria-label="Tagihan belum dibayar${unpaid > 0 ? ': ' + unpaid : ''}">
            ${U.icon('bell', 19)}
            ${unpaid > 0 ? `<span class="badge-dot">${unpaid}</span>` : ''}
          </button>
          <button class="avatar" onclick="UI.openProfileSheet()" aria-label="Buka profil ${UI.initials(s.settings.name)}">${UI.initials(s.settings.name)}</button>
        </div>
      </header>

      <div class="dash-grid">
        <div class="dash-col">
          <div class="hero-wrap reveal">
            <section class="hero">
              <div class="hero-top">
                <div class="hero-label">
                  <span class="wallet-mini">${U.icon('wallet', 14)}</span>
                  Total saldo ${s.wallets.length} dompet
                </div>
                <button class="icon-btn is-glass" style="width:34px;height:34px;border-radius:11px" onclick="Screens.toggleBalance()" aria-label="${hide ? 'Tampilkan' : 'Sembunyikan'} saldo">
                  ${U.icon(hide ? 'eyeOff' : 'eye', 17)}
                </button>
              </div>
              <div class="hero-amount money-value">
                ${hide ? '<span class="cur">Rp</span> ••••••' : `<span class="cur">Rp</span> ${U.fmtNumber(S.totalBalance())}`}
              </div>
              <div class="hero-meta">
                <span class="pill pill-glass">${U.icon(cashflowOk ? 'sparkles' : 'alert', 11)} ${cashflowOk ? 'Arus kas sehat' : 'Perlu perhatian'}</span>
                <span class="hero-hint">Uang bebas ${UI.simple(stats.discretionary)} bulan ini</span>
              </div>
              <div class="hero-bottom">
                <div class="hero-stat">
                  <span class="hs-ico">${U.icon('arrowDown', 15)}</span>
                  <div><small>Pemasukan</small><strong>${UI.simple(stats.income)}</strong></div>
                </div>
                <div class="hero-stat">
                  <span class="hs-ico">${U.icon('arrowUp', 15)}</span>
                  <div><small>Pengeluaran</small><strong>${UI.simple(totalCashOut(stats))}</strong></div>
                </div>
              </div>
            </section>
          </div>

          <div class="quick-row reveal reveal-2">
            <button class="quick-btn" onclick="UI.openTransactionSheet('income')">
              <span class="quick-ico qi-emerald">${U.icon('arrowDown', 19)}</span>
              <span>Pemasukan</span>
            </button>
            <button class="quick-btn" onclick="UI.openTransactionSheet('expense')">
              <span class="quick-ico qi-coral">${U.icon('arrowUp', 19)}</span>
              <span>Pengeluaran</span>
            </button>
            <button class="quick-btn" onclick="UI.openTransactionSheet('transfer')">
              <span class="quick-ico qi-indigo">${U.icon('transfer', 19)}</span>
              <span>Transfer</span>
            </button>
            <button class="quick-btn" onclick="App.go('bills')">
              <span class="quick-ico qi-amber">${U.icon('receipt', 19)}</span>
              <span>Tagihan</span>
            </button>
          </div>

          <section class="section section-pad reveal reveal-3">
            <div class="section-head">
              <div>
                <h2 class="section-title">Ringkasan Bulan Ini</h2>
                <p class="section-sub">${U.monthLabel(month)} · ${stats.txCount} transaksi</p>
              </div>
            </div>
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-top">
                  <span class="stat-ico emerald">${U.icon('arrowDown', 17)}</span>
                  <span class="stat-label">Pemasukan</span>
                </div>
                <div class="stat-value income-text">${UI.money(stats.income)}</div>
                <div class="stat-note">${stats.incomeCount} transaksi masuk</div>
              </div>
              <div class="stat-card">
                <div class="stat-top">
                  <span class="stat-ico coral">${U.icon('arrowUp', 17)}</span>
                  <span class="stat-label">Harian</span>
                </div>
                <div class="stat-value expense-text">${UI.money(stats.dailyExpense)}</div>
                <div class="stat-note">Belanja harian</div>
              </div>
              <div class="stat-card">
                <div class="stat-top">
                  <span class="stat-ico indigo">${U.icon('repeat', 17)}</span>
                  <span class="stat-label">Wajib bulanan</span>
                </div>
                <div class="stat-value">${UI.money(stats.fixedTotal)}</div>
                <div class="stat-note">${unpaid > 0 ? `<strong>${unpaid} belum</strong> dibayar` : 'Semua lunas ✓'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-top">
                  <span class="stat-ico amber">${U.icon('sparkles', 17)}</span>
                  <span class="stat-label">Sisa uang bebas</span>
                </div>
                <div class="stat-value" style="color:${stats.discretionary >= 0 ? 'var(--amber-ink)' : 'var(--coral-deep)'}">${UI.money(stats.discretionary)}</div>
                <div class="stat-note">Setelah tabungan</div>
              </div>
            </div>
          </section>

          <section class="section section-pad reveal reveal-4">
            <div class="section-head">
              <div>
                <h2 class="section-title">Analisis Keuangan</h2>
                <p class="section-sub">${U.monthLabel(month)}</p>
              </div>
              <div class="mini-tabs">
                <button class="${isCat ? 'is-active' : ''}" onclick="Screens.setDonut('category')">Kategori</button>
                <button class="${!isCat ? 'is-active' : ''}" onclick="Screens.setDonut('allocation')">Alokasi</button>
              </div>
            </div>
            <div class="card chart-card">
              <div class="donut-layout">
                ${donut.html}
                <div class="donut-legend">${legendRows}</div>
              </div>
              <p class="input-hint" style="text-align:center;margin-top:12px">${U.icon('info', 11)} Ketuk bagian grafik untuk melihat detail</p>
            </div>
          </section>

          <section class="section section-pad reveal reveal-5">
            <div class="section-head">
              <div>
                <h2 class="section-title">Tren Pengeluaran</h2>
                <p class="section-sub">14 hari terakhir · tanpa tagihan wajib</p>
              </div>
              <span class="pill pill-purple">${U.icon('flame', 11)} ${trendAvg ? UI.simple(trendAvg) + '/hari' : 'Belum ada'}</span>
            </div>
            <div class="card chart-card">
              ${lineChart.html}
              <div class="chart-foot">
                <span class="chart-foot-label">${U.icon('calendar', 13)} Total 14 hari</span>
                <strong>${UI.money(trendTotal)}</strong>
              </div>
            </div>
          </section>
        </div>

        <div class="dash-col">
          <section class="section section-pad reveal reveal-2">
            <div class="section-head">
              <div>
                <h2 class="section-title">Anggaran Bulanan</h2>
                <p class="section-sub">${totalBudget > 0 ? `${budgets.length} kategori dianggarkan` : 'Belum ada anggaran'}</p>
              </div>
              <button class="section-link" onclick="Screens.goPlanBudgets()">Kelola ${U.icon('chevronRight', 13)}</button>
            </div>
            ${totalBudget > 0 ? `
              <div class="card budget-card">
                <div class="budget-summary">
                  <div>
                    <div class="bs-label">Sisa anggaran</div>
                    <div class="bs-value" style="color:${budgetLeft < 0 ? 'var(--coral-deep)' : 'var(--text)'}">${UI.money(budgetLeft)}</div>
                  </div>
                  <div class="bs-right">
                    <span>Terpakai</span>
                    <strong style="color:${budgetSpent > totalBudget ? 'var(--coral-deep)' : 'var(--emerald-deep)'}">${Math.round((budgetSpent / totalBudget) * 100)}%</strong>
                  </div>
                </div>
                <div class="bar thick is-${budgetSpent / totalBudget >= 1 ? 'coral' : budgetSpent / totalBudget >= 0.8 ? 'amber' : 'emerald'}" style="margin-bottom:4px"><i style="width:${Math.min(100, (budgetSpent / totalBudget) * 100)}%"></i></div>
                <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);font-weight:600;margin-bottom:2px">
                  <span>${UI.money(budgetSpent)} terpakai</span><span>dari ${UI.money(totalBudget)}</span>
                </div>
                ${budgetPreview}
              </div>` : `
              <div class="card" style="padding:16px">
                ${UI.emptyState({ icon: 'sliders', title: 'Atur batas belanjamu', text: 'Tetapkan anggaran per kategori agar pengeluaran tetap terkendali.', cta: '1', ctaLabel: 'Buat Anggaran', ctaAction: 'Screens.goPlanBudgets()' })}
              </div>`}
          </section>

          <section class="section section-pad reveal reveal-3">
            <div class="section-head">
              <div>
                <h2 class="section-title">Tagihan Wajib</h2>
                <p class="section-sub">${s.bills.length} tagihan rutin · ${unpaid} belum dibayar</p>
              </div>
              <button class="section-link" onclick="App.go('bills')">Lihat semua ${U.icon('chevronRight', 13)}</button>
            </div>
            ${billsSection}
          </section>

          <section class="section section-pad reveal reveal-4">
            <div class="section-head">
              <div>
                <h2 class="section-title">Target Tabungan</h2>
                <p class="section-sub">${goals.length} target aktif</p>
              </div>
              <button class="section-link" onclick="Screens.goPlanGoals()">Lihat ${U.icon('chevronRight', 13)}</button>
            </div>
            ${goals.length ? `
              <div class="card" style="padding:15px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                  <div>
                    <div class="bs-label" style="font-size:9.5px;color:var(--muted);font-weight:600">Total terkumpul</div>
                    <div style="font-size:17px;font-weight:800;letter-spacing:-.03em;margin-top:2px">${UI.money(totalSaved)}</div>
                  </div>
                  <span class="pill pill-amber">${Math.round(goalPct)}% dari target</span>
                </div>
                <div class="bar is-amber"><i style="width:${goalPct}%"></i></div>
                ${goals.slice(0, 2).map((g) => {
                  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
                  return `
                    <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
                      <div class="budget-emoji" style="background:${g.color}18">${g.emoji}</div>
                      <div style="flex:1;min-width:0">
                        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
                          <span style="font-size:10.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.escapeHTML(g.name)}</span>
                          <span style="font-size:9.5px;font-weight:800;color:var(--muted)">${Math.round(pct)}%</span>
                        </div>
                        <div class="bar thin" style="background:${g.color}22"><i style="width:${pct}%;background:${g.color}"></i></div>
                      </div>
                    </div>`;
                }).join('')}
                <button class="btn btn-ghost btn-sm btn-block" style="margin-top:13px" onclick="UI.openGoalSheet()">${U.icon('plus', 14)} Target Baru</button>
              </div>` : `
              <div class="card" style="padding:16px">
                ${UI.emptyState({ icon: 'target', title: 'Mulai menabung', text: 'Buat target seperti dana darurat atau liburan dan pantau progresnya.', cta: '1', ctaLabel: 'Buat Target', ctaAction: 'UI.openGoalSheet()' })}
              </div>`}
          </section>

          <section class="section section-pad reveal reveal-5">
            <div class="section-head">
              <div>
                <h2 class="section-title">Transaksi Terakhir</h2>
                <p class="section-sub">Aktivitas terbaru kamu</p>
              </div>
              <button class="section-link" onclick="App.go('history')">Riwayat ${U.icon('chevronRight', 13)}</button>
            </div>
            ${recent.length ? `<div class="day-list">${recent.map(UI.txRow).join('')}</div>` : UI.emptyState({ icon: 'receipt', title: 'Belum ada transaksi', text: 'Catat pengeluaran atau pemasukan pertamamu hari ini.', cta: '1', ctaLabel: 'Catat Sekarang', ctaAction: "UI.openTransactionSheet('expense')" })}
          </section>
        </div>
      </div>`;
  }

  /* ============================================================
     HISTORY
     ============================================================ */
  const getHistoryFilters = () => {
    const ui = appUi();
    return ui.history || { q: '', type: 'all', categoryId: 'all', walletId: 'all', from: '', to: '' };
  };

  const filterTransactions = () => {
    const f = getHistoryFilters();
    const q = f.q.trim().toLowerCase();
    return S.get().transactions
      .filter((t) => {
        if (f.type !== 'all' && t.type !== f.type) return false;
        if (f.categoryId !== 'all' && t.categoryId !== f.categoryId) return false;
        if (f.walletId !== 'all' && t.walletId !== f.walletId && t.toWalletId !== f.walletId) return false;
        if (f.from && t.date < f.from) return false;
        if (f.to && t.date > f.to) return false;
        if (q) {
          const cat = S.categoryById(t.categoryId);
          const wallet = S.walletById(t.walletId);
          const dest = S.walletById(t.toWalletId);
          const hay = [
            t.note, cat ? cat.name : '', wallet ? wallet.name : '', dest ? dest.name : '',
            U.fmtNumber(t.amount), t.date, t.type,
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  };

  const historyBody = () => {
    const f = getHistoryFilters();
    const txs = filterTransactions();
    const income = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const active = [];
    if (f.categoryId !== 'all') {
      const cat = S.categoryById(f.categoryId);
      active.push(`<span class="active-filter-chip">${cat ? cat.emoji + ' ' + U.escapeHTML(cat.name) : 'Kategori'} <button onclick="Screens.clearFilter('categoryId')" aria-label="Hapus filter">${U.icon('x', 10)}</button></span>`);
    }
    if (f.walletId !== 'all') {
      const w = S.walletById(f.walletId);
      active.push(`<span class="active-filter-chip">${U.icon('wallet', 10)} ${w ? U.escapeHTML(w.name) : 'Dompet'} <button onclick="Screens.clearFilter('walletId')" aria-label="Hapus filter">${U.icon('x', 10)}</button></span>`);
    }
    if (f.from || f.to) {
      active.push(`<span class="active-filter-chip">${U.icon('calendar', 10)} ${f.from ? U.shortDateLabel(f.from) : '…'} – ${f.to ? U.shortDateLabel(f.to) : '…'} <button onclick="Screens.clearFilter('date')" aria-label="Hapus filter">${U.icon('x', 10)}</button></span>`);
    }

    if (!txs.length) {
      return `
        ${active.length ? `<div class="active-filter-bar">${active.join('')}</div>` : ''}
        <div style="margin-top:16px">${UI.emptyState({
          icon: f.q || active.length ? 'search' : 'receipt',
          title: f.q || active.length ? 'Tidak ditemukan' : 'Belum ada transaksi',
          text: f.q || active.length ? 'Coba kata kunci lain atau reset filter kamu.' : 'Setiap catatan kecil membantumu memahami ke mana uang pergi.',
          cta: '1',
          ctaLabel: f.q || active.length ? 'Reset Filter' : 'Catat Transaksi',
          ctaAction: f.q || active.length ? 'Screens.resetHistory()' : "UI.openTransactionSheet('expense')",
        })}</div>`;
    }

    // group by date
    const groups = {};
    txs.forEach((t) => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    const groupHtml = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((date) => {
      const items = groups[date];
      const dayExpense = items.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const dayIncome = items.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalLabel = dayExpense > 0 ? `−${UI.moneyAbs(dayExpense)}` : dayIncome > 0 ? `+${UI.moneyAbs(dayIncome)}` : `${items.length} transfer`;
      return `
        <div class="day-group">
          <div class="day-head">
            <div class="dh-left">
              <strong>${U.dayLabel(date)}</strong>
              <span>${U.parseISO(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </div>
            <span class="dh-total" style="color:${dayExpense > 0 ? 'var(--coral-deep)' : dayIncome > 0 ? 'var(--emerald-deep)' : 'var(--muted)'}">${totalLabel}</span>
          </div>
          <div class="day-list">${items.map(UI.txRow).join('')}</div>
        </div>`;
    }).join('');

    return `
      <div class="tx-summary" style="margin-top:0">
        <div><span>Ditemukan</span><strong>${txs.length} transaksi</strong></div>
        <div><span>Masuk</span><strong class="income-text">${UI.money(income)}</strong></div>
        <div><span>Keluar</span><strong class="expense-text">${UI.money(expense)}</strong></div>
      </div>
      ${active.length ? `<div class="active-filter-bar">${active.join('')}</div>` : ''}
      ${groupHtml}`;
  };

  function history() {
    const ui = appUi();
    const f = getHistoryFilters();
    const all = S.get().transactions;
    const counts = {
      all: all.length,
      income: all.filter((t) => t.type === 'income').length,
      expense: all.filter((t) => t.type === 'expense').length,
      transfer: all.filter((t) => t.type === 'transfer').length,
    };
    const hasFilter = f.categoryId !== 'all' || f.walletId !== 'all' || f.from || f.to;
    return `
      <header class="screen-head">
        <div class="screen-head-copy">
          <span class="screen-kicker"><span class="dot"></span> Riwayat lengkap</span>
          <h1 class="screen-title">Transaksi</h1>
          <p class="screen-sub">${all.length} transaksi tersimpan lokal</p>
        </div>
        <div class="head-actions">
          <button class="icon-btn ${hasFilter ? 'is-filter-active' : ''}" style="${hasFilter ? 'background:var(--purple-soft);color:var(--indigo);border-color:transparent' : ''}" onclick="Screens.openFilters()" aria-label="Filter transaksi">${U.icon('filter', 19)}</button>
        </div>
      </header>

      <div class="history-toolbar">
        <div class="search-box">
          ${U.icon('search', 17)}
          <input id="historySearch" placeholder="Cari catatan, kategori, dompet…" value="${U.escapeHTML(f.q)}" oninput="Screens.historySearch(this.value)" />
          ${f.q ? `<button class="search-clear" onclick="Screens.clearSearch()" aria-label="Hapus pencarian">${U.icon('x', 16)}</button>` : ''}
        </div>
        <div class="filter-row-wrap">
          <div class="filter-row" style="flex:1">
            ${[
              ['all', 'Semua', counts.all],
              ['income', 'Masuk', counts.income],
              ['expense', 'Keluar', counts.expense],
              ['transfer', 'Transfer', counts.transfer],
            ].map(([key, label, count]) => `
              <button class="filter-chip ${f.type === key ? 'is-active' : ''}" onclick="Screens.setHistoryType('${key}')">
                ${label}<span class="count">${count}</span>
              </button>`).join('')}
          </div>
          <button class="filter-more ${hasFilter ? 'is-active' : ''}" onclick="Screens.openFilters()" aria-label="Filter lanjutan">${U.icon('sliders', 16)}</button>
        </div>
      </div>

      <div class="section-pad" id="historyBody" style="margin-top:12px">
        ${historyBody()}
      </div>`;
  }

  /* ============================================================
     BILLS
     ============================================================ */
  function bills() {
    const ui = appUi();
    const month = ui.billMonth || U.currentMonthKey();
    const stats = S.getMonthStats(month);
    const allBills = S.get().bills;
    const paid = allBills.filter((b) => (b.paidMonths || []).includes(month));
    const unpaidList = allBills.filter((b) => !(b.paidMonths || []).includes(month));
    const filter = ui.billFilter || 'all';
    const pct = stats.fixedTotal > 0 ? (stats.fixedPaid / stats.fixedTotal) * 100 : 0;
    const shown = filter === 'paid' ? paid : filter === 'unpaid' ? unpaidList : allBills;
    const isCurrent = month === U.currentMonthKey();

    return `
      <header class="screen-head">
        <div class="screen-head-copy">
          <span class="screen-kicker"><span class="dot"></span> Pengeluaran rutin</span>
          <h1 class="screen-title">Tagihan Wajib</h1>
          <p class="screen-sub">${allBills.length} tagihan bulanan · ${isCurrent ? 'bulan berjalan' : 'riwayat bulan'}</p>
        </div>
        <div class="head-actions">
          <button class="icon-btn" onclick="UI.openBillSheet()" aria-label="Tambah tagihan">${U.icon('plus', 20)}</button>
        </div>
      </header>

      <div class="section-pad reveal">
        <div class="bills-hero">
          <div class="bills-hero-top">
            <div>
              <div class="label">Total pengeluaran wajib</div>
              <div class="amount">${UI.money(stats.fixedTotal)}</div>
              <div class="sub">${U.monthLabel(month)} · ${allBills.length} tagihan</div>
            </div>
            <div class="hero-ill">${U.icon('receipt', 22)}</div>
          </div>
          <div class="progress-line"><i style="width:${pct}%"></i></div>
          <div class="bills-hero-foot">
            <span>${paid.length} dari ${allBills.length} lunas</span>
            <strong>${stats.fixedUnpaid > 0 ? `Sisa ${UI.money(stats.fixedUnpaid)}` : 'Semua beres! 🎉'}</strong>
          </div>
        </div>

        <div class="month-switch">
          <button onclick="Screens.shiftBillMonth(-1)" aria-label="Bulan sebelumnya">${U.icon('chevronLeft', 17)}</button>
          <span>${U.monthLabel(month)}<small>${isCurrent ? 'Bulan berjalan' : 'Riwayat tagihan'}</small></span>
          <button onclick="Screens.shiftBillMonth(1)" aria-label="Bulan berikutnya">${U.icon('chevronRight', 17)}</button>
        </div>

        ${isCurrent && unpaidList.length > 0 ? `
          <button class="btn btn-navy btn-block" style="margin-top:12px;height:44px;font-size:12px" onclick="Screens.payAllBills()">
            ${U.icon('checkCircle', 16)} Tandai Semua Lunas (${unpaidList.length})
          </button>` : ''}

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:20px;margin-bottom:10px">
          <div class="filter-row">
            <button class="filter-chip ${filter === 'all' ? 'is-active' : ''}" onclick="Screens.setBillFilter('all')">Semua <span class="count">${allBills.length}</span></button>
            <button class="filter-chip ${filter === 'unpaid' ? 'is-active' : ''}" onclick="Screens.setBillFilter('unpaid')">Belum bayar <span class="count">${unpaidList.length}</span></button>
            <button class="filter-chip ${filter === 'paid' ? 'is-active' : ''}" onclick="Screens.setBillFilter('paid')">Lunas <span class="count">${paid.length}</span></button>
          </div>
        </div>

        <div class="bill-list reveal reveal-2">
          ${shown.length
            ? shown.map((b) => UI.billCard(b, month)).join('')
            : UI.emptyState({
                icon: filter === 'paid' ? 'checkCircle' : 'calendar',
                title: filter === 'paid' ? 'Belum ada yang lunas' : filter === 'unpaid' ? 'Semua tagihan sudah lunas' : 'Belum ada tagihan',
                text: filter === 'paid' ? 'Tandai tagihan sebagai lunas untuk melihat riwayatnya.' : filter === 'unpaid' ? 'Kerja bagus! Tidak ada tagihan yang tertinggal bulan ini.' : 'Mulai dengan menambahkan listrik, air, wifi, kos, atau cicilan.',
                cta: filter === 'all' ? '1' : '',
                ctaLabel: filter === 'all' ? 'Tambah Tagihan' : '',
                ctaAction: 'UI.openBillSheet()',
              })}
        </div>

        <div class="card" style="padding:13px;margin-top:16px;display:flex;gap:10px;align-items:flex-start">
          <div style="width:32px;height:32px;border-radius:10px;background:var(--purple-soft);color:var(--indigo);display:grid;place-items:center;flex:none">${U.icon('repeat', 16)}</div>
          <div>
            <div style="font-size:10.5px;font-weight:800">Otomatis setiap bulan</div>
            <p style="font-size:9.5px;color:var(--muted);line-height:1.55;margin-top:3px">Daftar tagihan ini otomatis kembali berstatus <strong>belum dibayar</strong> saat bulan baru dimulai. Tidak ada tagihan yang terlewat.</p>
          </div>
        </div>
      </div>`;
  }

  /* ============================================================
     PLAN (goals + budgets)
     ============================================================ */
  function plan() {
    const ui = appUi();
    const month = U.currentMonthKey();
    const stats = S.getMonthStats(month);
    const tab = ui.planTab || 'goals';
    const goals = S.get().goals;
    const totalSaved = goals.reduce((sum, g) => sum + U.num(g.saved), 0);
    const totalTarget = goals.reduce((sum, g) => sum + U.num(g.target), 0);
    const pct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    const budgets = S.budgetProgress(month);
    const totalLimit = S.totalBudget();
    const spent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const left = totalLimit - spent;
    const budgetPct = totalLimit > 0 ? Math.min(100, (spent / totalLimit) * 100) : 0;
    const unbudgeted = S.get().categories.expense.filter((c) => !S.get().budgets[c.id]);

    const goalsView = `
      <div class="savings-hero reveal">
        <div class="spark">${U.icon('sparkles', 48)}</div>
        <div class="label">Total dana terkumpul</div>
        <div class="amount">${UI.money(totalSaved)}</div>
        <div class="sub">dari target ${UI.money(totalTarget)} · ${goals.length} target aktif</div>
        <div class="progress-line"><i style="width:${pct}%"></i></div>
        <div class="savings-hero-foot">
          <span>${Math.round(pct)}% tercapai</span>
          <span>Setoran bulan ini ${UI.simple(stats.savings)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:20px 2px 10px">
        <h2 class="section-title">Target Kamu</h2>
        <button class="section-link" onclick="UI.openGoalSheet()">${U.icon('plus', 13)} Target baru</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${goals.length ? goals.map(UI.goalCard).join('') : UI.emptyState({
          icon: 'target',
          title: 'Belum ada target tabungan',
          text: 'Mulai dari dana darurat, liburan, atau gadget baru. Sedikit demi sedikit tetap berarti.',
          cta: '1',
          ctaLabel: 'Buat Target Pertama',
          ctaAction: 'UI.openGoalSheet()',
        })}
      </div>
      ${goals.length ? `<button class="btn btn-ghost btn-block" style="margin-top:12px;border-style:dashed" onclick="UI.openGoalSheet()">${U.icon('plus', 16)} Tambah Target Tabungan</button>` : ''}
      <div class="card" style="padding:13px;margin-top:16px;display:flex;gap:10px;align-items:flex-start">
        <div style="width:32px;height:32px;border-radius:10px;background:var(--amber-soft);color:var(--amber);display:grid;place-items:center;flex:none">${U.icon('piggy', 16)}</div>
        <div>
          <div style="font-size:10.5px;font-weight:800">Tips menabung konsisten</div>
          <p style="font-size:9.5px;color:var(--muted);line-height:1.55;margin-top:3px">Sisihkan dana di awal bulan, bukan dari sisa pengeluaran. Bahkan 5–10% dari pemasukan sudah membuat perbedaan besar.</p>
        </div>
      </div>`;

    const budgetsView = `
      <div class="bills-hero reveal" style="background:linear-gradient(128deg,#4f46e5,#6d28d9 60%,#9333ea)">
        <div class="bills-hero-top">
          <div>
            <div class="label">Total anggaran bulan ini</div>
            <div class="amount">${UI.money(totalLimit)}</div>
            <div class="sub">${budgets.length} kategori · ${U.monthLabel(month)}</div>
          </div>
          <div class="hero-ill">${U.icon('sliders', 21)}</div>
        </div>
        <div class="progress-line"><i style="width:${budgetPct}%"></i></div>
        <div class="bills-hero-foot">
          <span>Terpakai ${UI.money(spent)}</span>
          <strong style="color:${left < 0 ? '#fecdd3' : '#a7f3d0'}">${left >= 0 ? 'Sisa ' + UI.simple(left) : 'Lewat ' + UI.simple(Math.abs(left))}</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:20px 2px 10px">
        <h2 class="section-title">Anggaran per Kategori</h2>
        <button class="section-link" onclick="UI.openBudgetSheet()">${U.icon('plus', 13)} Tambah</button>
      </div>
      <div>
        ${budgets.length ? budgets.map(UI.budgetRowFull).join('') : UI.emptyState({
          icon: 'sliders',
          title: 'Belum ada anggaran',
          text: 'Tentukan batas pengeluaran tiap kategori agar uangmu tidak habis tanpa jejak.',
          cta: '1',
          ctaLabel: 'Buat Anggaran',
          ctaAction: 'UI.openBudgetSheet()',
        })}
      </div>
      ${unbudgeted.length ? `
        <div class="card" style="padding:15px;margin-top:16px">
          <div style="font-size:11px;font-weight:800;margin-bottom:9px">Kategori belum dianggarkan</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${unbudgeted.map((c) => `<button class="chip" onclick="UI.openBudgetSheet('${c.id}')"><span class="chip-emoji">${c.emoji}</span>${U.escapeHTML(c.name)} ${U.icon('plus', 10)}</button>`).join('')}
          </div>
        </div>` : ''}
      <div class="card" style="padding:13px;margin-top:16px;display:flex;gap:10px;align-items:flex-start">
        <div style="width:32px;height:32px;border-radius:10px;background:var(--purple-soft);color:var(--indigo);display:grid;place-items:center;flex:none">${U.icon('shield', 16)}</div>
        <div>
          <div style="font-size:10.5px;font-weight:800">Indikator warna</div>
          <p style="font-size:9.5px;color:var(--muted);line-height:1.55;margin-top:3px"><span style="color:var(--emerald-deep);font-weight:700">Hijau</span> aman · <span style="color:var(--amber);font-weight:700">Kuning</span> hampir habis (80%) · <span style="color:var(--coral-deep);font-weight:700">Merah</span> melewati batas.</p>
        </div>
      </div>`;

    return `
      <header class="screen-head">
        <div class="screen-head-copy">
          <span class="screen-kicker"><span class="dot" style="background:var(--emerald)"></span> Rencana finansial</span>
          <h1 class="screen-title">Rencana</h1>
          <p class="screen-sub">Tabungan & anggaran kamu</p>
        </div>
        <div class="head-actions">
          <button class="icon-btn" onclick="${tab === 'goals' ? 'UI.openGoalSheet()' : 'UI.openBudgetSheet()'}" aria-label="${tab === 'goals' ? 'Tambah target' : 'Tambah anggaran'}">${U.icon('plus', 20)}</button>
        </div>
      </header>

      <div class="section-pad">
        <div class="segment reveal">
          <button class="${tab === 'goals' ? 'is-active' : ''}" onclick="Screens.setPlanTab('goals')">${U.icon('target', 15)} Tabungan <span class="count">${goals.length}</span></button>
          <button class="${tab === 'budgets' ? 'is-active' : ''}" onclick="Screens.setPlanTab('budgets')">${U.icon('sliders', 15)} Anggaran <span class="count">${budgets.length}</span></button>
        </div>
        <div style="margin-top:16px;padding-bottom:10px">
          ${tab === 'goals' ? goalsView : budgetsView}
        </div>
      </div>`;
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function settings() {
    const s = S.get();
    const total = S.totalBalance();
    const storageOk = S.storageOk();
    const theme = s.settings.theme || 'light';
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    return `
      <header class="screen-head">
        <div class="screen-head-copy">
          <span class="screen-kicker"><span class="dot" style="background:var(--indigo)"></span> Preferensi aplikasi</span>
          <h1 class="screen-title">Pengaturan</h1>
          <p class="screen-sub">Kelola data & tampilan FinTrack</p>
        </div>
        <div class="head-actions">
          <button class="icon-btn" onclick="Screens.toggleTheme()" aria-label="Ganti tema">${U.icon(theme === 'dark' ? 'sun' : 'moon', 19)}</button>
        </div>
      </header>

      <div class="section-pad">
        <div class="profile-card reveal">
          <div class="profile-avatar">${UI.initials(s.settings.name)}</div>
          <div class="profile-info">
            <h3>${U.escapeHTML(s.settings.name)} <span class="profile-badge">${U.icon('sparkles', 9)} PRO</span></h3>
            <p>${s.transactions.length} transaksi · ${s.wallets.length} dompet</p>
          </div>
          <button class="icon-btn" style="width:34px;height:34px;border-radius:10px" onclick="UI.openProfileSheet()" aria-label="Edit profil">${U.icon('edit', 15)}</button>
        </div>

        <div class="menu-label">Preferensi</div>
        <div class="menu-group">
          <button class="menu-row" onclick="Screens.toggleTheme()">
            <span class="menu-ico indigo">${U.icon(theme === 'dark' ? 'sun' : 'moon', 17)}</span>
            <span class="menu-main"><span class="menu-title">Mode gelap</span><span class="menu-sub">Nyaman untuk mata saat malam</span></span>
            <span class="switch ${theme === 'dark' ? 'is-on' : ''}"></span>
          </button>
          <button class="menu-row" onclick="Screens.toggleReminders()">
            <span class="menu-ico amber">${U.icon('bell', 17)}</span>
            <span class="menu-main"><span class="menu-title">Pengingat tagihan</span><span class="menu-sub">Sorot tagihan yang mendekati jatuh tempo</span></span>
            <span class="switch ${s.settings.reminders ? 'is-on' : ''}"></span>
          </button>
          <button class="menu-row" onclick="Screens.toggleHide()">
            <span class="menu-ico blue">${U.icon(s.settings.hideBalance ? 'eyeOff' : 'eye', 17)}</span>
            <span class="menu-main"><span class="menu-title">Sembunyikan saldo</span><span class="menu-sub">Sembunyikan nominal di dashboard</span></span>
            <span class="switch ${s.settings.hideBalance ? 'is-on' : ''}"></span>
          </button>
        </div>

        <div class="menu-label">Keuangan</div>
        <div class="menu-group">
          <button class="menu-row" onclick="UI.openManageWallets()">
            <span class="menu-ico indigo">${U.icon('wallet', 17)}</span>
            <span class="menu-main"><span class="menu-title">Dompet & akun</span><span class="menu-sub">${s.wallets.length} dompet · ${UI.money(total)}</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="UI.openManageCategories('expense')">
            <span class="menu-ico coral">${U.icon('sliders', 17)}</span>
            <span class="menu-main"><span class="menu-title">Kategori</span><span class="menu-sub">${s.categories.income.length} pemasukan · ${s.categories.expense.length} pengeluaran</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="Screens.goPlanBudgets()">
            <span class="menu-ico amber">${U.icon('shield', 17)}</span>
            <span class="menu-main"><span class="menu-title">Anggaran bulanan</span><span class="menu-sub">${Object.keys(s.budgets).length} kategori dianggarkan</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="Screens.goPlanGoals()">
            <span class="menu-ico emerald">${U.icon('target', 17)}</span>
            <span class="menu-main"><span class="menu-title">Target tabungan</span><span class="menu-sub">${s.goals.length} target aktif</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
        </div>

        <div class="menu-label">Data & cadangan</div>
        <div class="menu-group">
          <button class="menu-row" onclick="Screens.exportJSON()">
            <span class="menu-ico indigo">${U.icon('download', 17)}</span>
            <span class="menu-main"><span class="menu-title">Ekspor semua data (JSON)</span><span class="menu-sub">Backup lengkap, bisa diimpor kembali</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="Screens.exportCSV()">
            <span class="menu-ico emerald">${U.icon('receipt', 17)}</span>
            <span class="menu-main"><span class="menu-title">Ekspor transaksi (CSV)</span><span class="menu-sub">Buka di Excel atau Google Sheets</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="document.getElementById('importFile').click()">
            <span class="menu-ico blue">${U.icon('upload', 17)}</span>
            <span class="menu-main"><span class="menu-title">Impor data (JSON)</span><span class="menu-sub">Pulihkan dari file cadangan</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <input type="file" id="importFile" accept="application/json,.json" style="display:none" />
          <div class="menu-note">${U.icon('shield', 12)} Semua data disimpan di perangkat ini (localStorage). Tidak ada server, tidak ada pelacakan.${storageOk ? '' : ' <strong style="color:var(--coral-deep)">Penyimpanan browser tidak tersedia — data hanya bertahan selama tab terbuka.</strong>'}</div>
        </div>

        <div class="menu-label">Lainnya</div>
        <div class="menu-group">
          ${!standalone ? `<button class="menu-row" onclick="Screens.installApp()">
            <span class="menu-ico emerald">${U.icon('download', 17)}</span>
            <span class="menu-main"><span class="menu-title">Instal aplikasi</span><span class="menu-sub">Tambah FinTrack ke layar utama</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>` : ''}
          <button class="menu-row" onclick="UI.openAboutSheet()">
            <span class="menu-ico indigo">${U.icon('info', 17)}</span>
            <span class="menu-main"><span class="menu-title">Tentang FinTrack</span><span class="menu-sub">Versi 1.0.0 · Daily & fixed expense tracker</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
          <button class="menu-row" onclick="UI.openResetSheet()">
            <span class="menu-ico coral">${U.icon('refresh', 17)}</span>
            <span class="menu-main"><span class="menu-title" style="color:var(--coral-deep)">Reset data</span><span class="menu-sub">Mulai ulang atau muat data contoh</span></span>
            <span class="menu-chev">${U.icon('chevronRight', 16)}</span>
          </button>
        </div>

        <p style="text-align:center;font-size:9px;color:var(--muted-2);margin-top:22px;line-height:1.7">
          FinTrack v1.0.0 · dibuat untuk ketenangan finansialmu<br/>
          ${U.icon('lock', 9)} 100% offline · data milikmu sendiri
        </p>
      </div>`;
  }

  /* ============================================================
     Actions (called by inline handlers)
     ============================================================ */
  const actions = {
    toggleBalance() {
      S.toggleHideBalance();
      U.haptic(8);
      if (window.App) window.App.refresh();
    },
    setDonut(mode) {
      appUi().donutMode = mode;
      if (window.App) window.App.refresh();
    },
    setPlanTab(tab) {
      appUi().planTab = tab;
      if (window.App) window.App.refresh(true);
    },
    goPlanGoals() {
      appUi().planTab = 'goals';
      if (window.App) window.App.go('plan');
    },
    goPlanBudgets() {
      appUi().planTab = 'budgets';
      if (window.App) window.App.go('plan');
    },
    setHistoryType(type) {
      const f = getHistoryFilters();
      f.type = type;
      if (window.App) window.App.refresh(true);
    },
    historySearch(value) {
      const f = getHistoryFilters();
      f.q = value;
      const body = document.getElementById('historyBody');
      if (body) body.innerHTML = historyBody();
      const clear = document.querySelector('.search-clear');
      const box = document.querySelector('.search-box');
      if (box) {
        if (value && !clear) {
          const btn = document.createElement('button');
          btn.className = 'search-clear';
          btn.setAttribute('aria-label', 'Hapus pencarian');
          btn.innerHTML = U.icon('x', 16);
          btn.onclick = () => actions.clearSearch();
          box.appendChild(btn);
        } else if (!value && clear) {
          clear.remove();
        }
      }
    },
    clearSearch() {
      const f = getHistoryFilters();
      f.q = '';
      const input = document.getElementById('historySearch');
      if (input) { input.value = ''; }
      document.querySelector('.search-clear')?.remove();
      const body = document.getElementById('historyBody');
      if (body) body.innerHTML = historyBody();
    },
    openFilters() {
      UI.openFilterSheet(getHistoryFilters(), (next) => {
        const f = getHistoryFilters();
        Object.assign(f, next);
        if (window.App) window.App.refresh(true);
      });
    },
    clearFilter(key) {
      const f = getHistoryFilters();
      if (key === 'date') { f.from = ''; f.to = ''; }
      else f[key] = 'all';
      if (window.App) window.App.refresh(true);
    },
    resetHistory() {
      const f = getHistoryFilters();
      Object.assign(f, { q: '', type: 'all', categoryId: 'all', walletId: 'all', from: '', to: '' });
      if (window.App) window.App.refresh(true);
    },
    shiftBillMonth(delta) {
      const ui = appUi();
      ui.billMonth = U.addMonthsToKey(ui.billMonth || U.currentMonthKey(), delta);
      if (window.App) window.App.refresh(true);
    },
    setBillFilter(filter) {
      appUi().billFilter = filter;
      if (window.App) window.App.refresh(true);
    },
    async payAllBills() {
      const ui = appUi();
      const month = ui.billMonth || U.currentMonthKey();
      const count = S.get().bills.filter((b) => !(b.paidMonths || []).includes(month)).length;
      if (!count) { U.toast('Semua tagihan sudah lunas', 'info'); return; }
      const yes = await U.confirmDialog({
        title: 'Tandai semua lunas?',
        message: `${count} tagihan akan dicatat sebagai pengeluaran dan mengurangi saldo dompet terkait.`,
        confirmText: 'Ya, lunas semua',
        danger: false,
      });
      if (!yes) return;
      const n = S.payAllBills(month);
      U.haptic(20);
      U.toast(`${n} tagihan ditandai lunas`, 'success', U.monthLabel(month));
      if (window.App) window.App.refresh();
    },
    toggleTheme() {
      const s = S.get();
      const next = (s.settings.theme || 'light') === 'dark' ? 'light' : 'dark';
      S.setSettings({ theme: next });
      U.haptic(8);
      U.toast(next === 'dark' ? 'Mode gelap aktif' : 'Mode terang aktif', 'info');
      if (window.App) window.App.refresh(true);
    },
    toggleReminders() {
      const s = S.get();
      S.setSettings({ reminders: !s.settings.reminders });
      U.toast(!s.settings.reminders ? 'Pengingat tagihan aktif' : 'Pengingat dimatikan', 'info');
      if (window.App) window.App.refresh(true);
    },
    toggleHide() {
      S.toggleHideBalance();
      if (window.App) window.App.refresh(true);
    },
    exportJSON() {
      const payload = S.exportPayload();
      U.download(`fintrack-backup-${U.formatFileDate()}.json`, JSON.stringify(payload, null, 2), 'application/json');
      U.toast('Backup JSON diunduh', 'success', 'Simpan file di tempat aman');
    },
    exportCSV() {
      U.download(`fintrack-transaksi-${U.formatFileDate()}.csv`, S.toCSV(), 'text/csv;charset=utf-8');
      U.toast('Transaksi diekspor ke CSV', 'success', 'Bisa dibuka di Excel');
    },
    async importFile(file) {
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { U.toast('File terlalu besar', 'error', 'Maksimal 8 MB'); return; }
      try {
        const text = await file.text();
        const res = S.importData(text);
        if (!res.ok) { U.toast(res.reason || 'Impor gagal', 'error'); return; }
        U.toast('Data berhasil diimpor', 'success', file.name);
        if (window.App) window.App.go('home');
      } catch (e) {
        U.toast('Gagal membaca file', 'error');
      }
    },
    installApp() {
      if (window.App && window.App.promptInstall) {
        window.App.promptInstall();
      } else {
        U.toast('Gunakan menu browser', 'info', 'Pilih "Tambahkan ke layar utama"');
      }
    },
  };

  /* ============================================================
     Dispatch
     ============================================================ */
  const renderers = { home, history, bills, plan, settings };

  const render = (route) => {
    bindQueue = [];
    const fn = renderers[route] || home;
    return fn();
  };

  const hooks = {
    home: () => runBinds(),
    history: () => {
      const input = document.getElementById('historySearch');
      if (input && appUi().history.q) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    },
    settings: () => {
      const file = document.getElementById('importFile');
      if (file) {
        file.addEventListener('change', (e) => {
          const f = e.target.files && e.target.files[0];
          actions.importFile(f);
          e.target.value = '';
        });
      }
    },
  };

  return {
    render,
    afterRender: (route) => {
      if (hooks[route]) hooks[route]();
      if (route === 'home') runBinds();
    },
    historyBody,
    ...actions,
  };
})();

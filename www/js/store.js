/* ============================================================
   FinTrack — Store
   Single source of truth + localStorage persistence
   ============================================================ */
window.Store = (function () {
  'use strict';

  const KEY = 'fintrack.v1';
  const APP_VERSION = 1;

  const U = window.U;
  const listeners = new Set();
  let state = null;

  /* ============================================================
     Defaults & seed
     ============================================================ */
  const CATEGORY_PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#84cc16'];
  const WALLET_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

  const defaultCategories = () => ({
    income: [
      { id: 'cat_gaji', name: 'Gaji', emoji: '💼', color: '#10b981' },
      { id: 'cat_freelance', name: 'Freelance', emoji: '💻', color: '#6366f1' },
      { id: 'cat_bonus', name: 'Bonus', emoji: '🎁', color: '#f59e0b' },
      { id: 'cat_invest', name: 'Hasil Investasi', emoji: '📈', color: '#06b6d4' },
      { id: 'cat_income_other', name: 'Lainnya', emoji: '✨', color: '#94a3b8' },
    ],
    expense: [
      { id: 'cat_makan', name: 'Makanan', emoji: '🍜', color: '#fb7185' },
      { id: 'cat_transport', name: 'Transportasi', emoji: '🛵', color: '#f59e0b' },
      { id: 'cat_belanja', name: 'Belanja', emoji: '🛍️', color: '#8b5cf6' },
      { id: 'cat_tagihan', name: 'Tagihan', emoji: '🧾', color: '#3b82f6' },
      { id: 'cat_kesehatan', name: 'Kesehatan', emoji: '💊', color: '#10b981' },
      { id: 'cat_hiburan', name: 'Hiburan', emoji: '🎬', color: '#ec4899' },
      { id: 'cat_pendidikan', name: 'Pendidikan', emoji: '📚', color: '#06b6d4' },
      { id: 'cat_expense_other', name: 'Lainnya', emoji: '🧩', color: '#94a3b8' },
    ],
  });

  const defaultWallets = () => [
    { id: 'wlt_bca', name: 'BCA', emoji: '🏦', color: '#6366f1', initial: 12500000 },
    { id: 'wlt_cash', name: 'Cash', emoji: '💵', color: '#10b981', initial: 850000 },
    { id: 'wlt_gopay', name: 'GoPay', emoji: '🟢', color: '#0ea5e9', initial: 620000 },
    { id: 'wlt_ovo', name: 'OVO', emoji: '🟣', color: '#8b5cf6', initial: 340000 },
  ];

  const buildSeed = () => {
    const mk = U.currentMonthKey();
    const prev = U.addMonthsToKey(mk, -1);
    const prev2 = U.addMonthsToKey(mk, -2);
    const today = U.todayISO();
    const todayDay = U.dayNumber(today);
    const day = (n) => `${mk}-${U.pad(Math.min(n, U.daysInMonth(mk)))}`;
    const prevDay = (n) => `${prev}-${U.pad(Math.min(n, U.daysInMonth(prev)))}`;

    const categories = defaultCategories();
    const wallets = defaultWallets();

    const bills = [
      { id: 'bill_kos', name: 'Sewa Kos', amount: 1800000, dueDay: 1, emoji: '🏠', color: '#6366f1', categoryId: 'cat_tagihan', walletId: 'wlt_bca', paidMonths: [prev, mk], createdAt: prevDay(1) },
      { id: 'bill_listrik', name: 'Listrik PLN', amount: 385000, dueDay: 5, emoji: '⚡', color: '#f59e0b', categoryId: 'cat_tagihan', walletId: 'wlt_bca', paidMonths: [prev, mk], createdAt: prevDay(1) },
      { id: 'bill_air', name: 'Air PDAM', amount: 145000, dueDay: 8, emoji: '💧', color: '#0ea5e9', categoryId: 'cat_tagihan', walletId: 'wlt_bca', paidMonths: [prev, mk], createdAt: prevDay(1) },
      { id: 'bill_wifi', name: 'Internet IndiHome', amount: 329000, dueDay: 10, emoji: '📶', color: '#8b5cf6', categoryId: 'cat_tagihan', walletId: 'wlt_bca', paidMonths: [prev, mk], createdAt: prevDay(1) },
      { id: 'bill_bpjs', name: 'BPJS Kesehatan', amount: 150000, dueDay: 15, emoji: '🩺', color: '#10b981', categoryId: 'cat_kesehatan', walletId: 'wlt_bca', paidMonths: [prev], createdAt: prevDay(1) },
      { id: 'bill_netflix', name: 'Netflix Premium', amount: 186000, dueDay: 20, emoji: '🎬', color: '#ec4899', categoryId: 'cat_hiburan', walletId: 'wlt_ovo', paidMonths: [prev], createdAt: prevDay(1) },
      { id: 'bill_motor', name: 'Cicilan Motor', amount: 875000, dueDay: 25, emoji: '🏍️', color: '#f43f5e', categoryId: 'cat_tagihan', walletId: 'wlt_bca', paidMonths: [prev], createdAt: prevDay(1) },
    ];

    const transactions = [];

    const addTx = (t) => {
      transactions.push({
        id: U.uid('tx'),
        createdAt: Date.now() - transactions.length * 1000,
        note: '',
        ...t,
      });
    };

    // Bill payments for paid months
    bills.forEach((bill) => {
      bill.paidMonths.forEach((m) => {
        const isCurrent = m === mk;
        const date = isCurrent
          ? (todayDay >= bill.dueDay ? `${m}-${U.pad(bill.dueDay)}` : today)
          : `${m}-${U.pad(Math.min(bill.dueDay, U.daysInMonth(m)))}`;
        addTx({
          type: 'expense',
          amount: bill.amount,
          categoryId: bill.categoryId,
          walletId: bill.walletId,
          date,
          note: bill.name,
          billId: bill.id,
          billMonth: m,
        });
      });
    });

    // Income
    addTx({ type: 'income', amount: 8500000, categoryId: 'cat_gaji', walletId: 'wlt_bca', date: day(1), note: 'Gaji bulanan' });
    if (todayDay >= 6) addTx({ type: 'income', amount: 1500000, categoryId: 'cat_freelance', walletId: 'wlt_bca', date: day(6), note: 'Proyek desain — UI kit' });
    if (todayDay >= 9) addTx({ type: 'income', amount: 750000, categoryId: 'cat_freelance', walletId: 'wlt_bca', date: day(9), note: 'Revisi landing page' });
    if (todayDay >= 4) addTx({ type: 'income', amount: 500000, categoryId: 'cat_bonus', walletId: 'wlt_bca', date: day(4), note: 'Bonus performa tim' });

    // Daily expenses (only days that already happened)
    const dailyTemplates = [
      { off: 0, amount: 28000, categoryId: 'cat_makan', walletId: 'wlt_gopay', note: 'Kopi & croissant' },
      { off: 0, amount: 42000, categoryId: 'cat_transport', walletId: 'wlt_ovo', note: 'Gojek ke kantor' },
      { off: 1, amount: 62000, categoryId: 'cat_makan', walletId: 'wlt_gopay', note: 'GoFood — Nasi Padang' },
      { off: 1, amount: 185000, categoryId: 'cat_belanja', walletId: 'wlt_bca', note: 'Indomaret — stok mingguan' },
      { off: 2, amount: 35000, categoryId: 'cat_transport', walletId: 'wlt_cash', note: 'Bensin' },
      { off: 2, amount: 148000, categoryId: 'cat_makan', walletId: 'wlt_bca', note: 'Dinner bareng tim' },
      { off: 3, amount: 24000, categoryId: 'cat_makan', walletId: 'wlt_gopay', note: 'Kopi Kenangan' },
      { off: 3, amount: 210000, categoryId: 'cat_belanja', walletId: 'wlt_bca', note: 'Shopee — perlengkapan meja' },
      { off: 4, amount: 50000, categoryId: 'cat_hiburan', walletId: 'wlt_ovo', note: 'Bioskop XXI' },
      { off: 5, amount: 38000, categoryId: 'cat_makan', walletId: 'wlt_cash', note: 'Bakso Pak Kumis' },
      { off: 6, amount: 75000, categoryId: 'cat_kesehatan', walletId: 'wlt_bca', note: 'Vitamin & masker' },
      { off: 7, amount: 32000, categoryId: 'cat_makan', walletId: 'wlt_cash', note: 'Warteg' },
      { off: 8, amount: 275000, categoryId: 'cat_belanja', walletId: 'wlt_bca', note: 'Kemeja kerja' },
      { off: 9, amount: 45000, categoryId: 'cat_makan', walletId: 'wlt_gopay', note: 'Sate Taichan' },
      { off: 10, amount: 120000, categoryId: 'cat_transport', walletId: 'wlt_bca', note: 'Servis motor' },
      { off: 11, amount: 58000, categoryId: 'cat_makan', walletId: 'wlt_gopay', note: 'Bakmi GM' },
      { off: 12, amount: 96000, categoryId: 'cat_belanja', walletId: 'wlt_cash', note: 'Kebutuhan dapur' },
      { off: 13, amount: 42000, categoryId: 'cat_hiburan', walletId: 'wlt_ovo', note: 'Spotify Family' },
      { off: 14, amount: 68000, categoryId: 'cat_makan', walletId: 'wlt_bca', note: 'Buka bersama' },
    ];

    const seen = new Set();
    dailyTemplates.forEach((t) => {
      const date = U.addDays(today, -t.off);
      if (U.monthKeyOf(date) !== mk) return;
      const key = t.off + '|' + t.amount;
      if (seen.has(key)) return;
      seen.add(key);
      addTx({ type: 'expense', ...t, date });
    });

    // Previous month sample (for history & comparison)
    addTx({ type: 'income', amount: 8000000, categoryId: 'cat_gaji', walletId: 'wlt_bca', date: prevDay(1), note: 'Gaji bulan lalu' });
    addTx({ type: 'income', amount: 900000, categoryId: 'cat_freelance', walletId: 'wlt_bca', date: prevDay(12), note: 'Freelance — feed design' });
    addTx({ type: 'expense', amount: 235000, categoryId: 'cat_belanja', walletId: 'wlt_bca', date: prevDay(19), note: 'Belanja bulanan' });
    addTx({ type: 'expense', amount: 84000, categoryId: 'cat_makan', walletId: 'wlt_gopay', date: prevDay(20), note: 'Makan malam' });
    addTx({ type: 'expense', amount: 120000, categoryId: 'cat_hiburan', walletId: 'wlt_ovo', date: prevDay(22), note: 'Konser mini' });

    // Goals
    const goals = [
      {
        id: 'goal_darurat', name: 'Dana Darurat', target: 30000000, emoji: '🛡️', color: '#6366f1',
        deadline: `${U.addMonthsToKey(mk, 8)}-01`,
        contributions: [
          { amount: 5000000, date: `${prev2}-05` },
          { amount: 2500000, date: `${prev2}-20` },
          { amount: 3500000, date: prevDay(5) },
          { amount: 1500000, date: day(3) },
        ],
      },
      {
        id: 'goal_liburan', name: 'Liburan Bali', target: 8000000, emoji: '🏝️', color: '#f59e0b',
        deadline: `${U.addMonthsToKey(mk, 4)}-15`,
        contributions: [
          { amount: 1500000, date: `${prev2}-10` },
          { amount: 1200000, date: prevDay(14) },
          { amount: 500000, date: day(2) },
        ],
      },
      {
        id: 'goal_laptop', name: 'MacBook Baru', target: 15000000, emoji: '💻', color: '#ec4899',
        deadline: `${U.addMonthsToKey(mk, 6)}-01`,
        contributions: [
          { amount: 2000000, date: `${prev2}-18` },
          { amount: 1750000, date: prevDay(9) },
          { amount: 1000000, date: day(7) },
        ],
      },
    ];
    goals.forEach((g) => (g.saved = g.contributions.reduce((s, c) => s + c.amount, 0)));

    const budgets = {
      cat_makan: 2500000,
      cat_transport: 800000,
      cat_belanja: 1500000,
      cat_hiburan: 500000,
      cat_kesehatan: 400000,
    };

    return {
      version: APP_VERSION,
      createdAt: Date.now(),
      settings: {
        name: 'Raka Pratama',
        currency: 'Rp',
        theme: 'light',
        hideBalance: false,
        reminders: true,
      },
      categories,
      wallets,
      transactions,
      bills,
      goals,
      budgets,
    };
  };

  const emptyState = () => ({
    version: APP_VERSION,
    createdAt: Date.now(),
    settings: {
      name: 'Pengguna FinTrack',
      currency: 'Rp',
      theme: 'light',
      hideBalance: false,
      reminders: true,
    },
    categories: defaultCategories(),
    wallets: defaultWallets().map((w) => ({ ...w, initial: 0 })),
    transactions: [],
    bills: [],
    goals: [],
    budgets: {},
  });

  /* ============================================================
     Persistence
     ============================================================ */
  let storageOk = true;

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      storageOk = false;
    }
  };

  const emit = () => {
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  };

  const commit = (fn, options = {}) => {
    if (typeof fn === 'function') fn(state);
    persist();
    emit();
    if (options.toast && window.U) U.toast(options.toast, options.type || 'success');
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  /* ============================================================
     Init
     ============================================================ */
  const load = () => {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.transactions)) {
          state = migrate(parsed);
          return state;
        }
      } catch (e) { /* corrupt — reseed */ }
    }
    state = buildSeed();
    persist();
    return state;
  };

  const migrate = (data) => {
    const base = emptyState();
    const next = {
      ...base,
      ...data,
      settings: { ...base.settings, ...(data.settings || {}) },
      categories: {
        income: (data.categories && data.categories.income) || base.categories.income,
        expense: (data.categories && data.categories.expense) || base.categories.expense,
      },
      wallets: data.wallets || base.wallets,
      transactions: data.transactions || [],
      bills: (data.bills || []).map((b) => ({ ...b, paidMonths: b.paidMonths || [] })),
      goals: (data.goals || []).map((g) => ({
        ...g,
        contributions: g.contributions || [],
        saved: typeof g.saved === 'number' ? g.saved : (g.contributions || []).reduce((s, c) => s + c.amount, 0),
      })),
      budgets: data.budgets || {},
    };
    if (!next.version) next.version = APP_VERSION;
    return next;
  };

  /* ============================================================
     Selectors
     ============================================================ */
  const get = () => state;

  const categoryById = (id) => {
    if (!id) return null;
    for (const kind of ['income', 'expense']) {
      const cat = state.categories[kind].find((c) => c.id === id);
      if (cat) return { ...cat, kind };
    }
    return null;
  };

  const walletById = (id) => state.wallets.find((w) => w.id === id) || null;

  const categoryColor = (id) => (categoryById(id) || {}).color || '#94a3b8';

  const walletBalance = (walletId) => {
    const wallet = walletById(walletId);
    if (!wallet) return 0;
    let balance = U.num(wallet.initial);
    state.transactions.forEach((t) => {
      if (t.type === 'income' && t.walletId === walletId) balance += U.num(t.amount);
      else if (t.type === 'expense' && t.walletId === walletId) balance -= U.num(t.amount);
      else if (t.type === 'transfer') {
        if (t.walletId === walletId) balance -= U.num(t.amount);
        if (t.toWalletId === walletId) balance += U.num(t.amount);
      }
    });
    return balance;
  };

  const totalBalance = () => state.wallets.reduce((sum, w) => sum + walletBalance(w.id), 0);

  const getMonthStats = (month) => {
    const txs = state.transactions.filter((t) => U.monthKeyOf(t.date) === month);
    const sum = (arr) => arr.reduce((s, t) => s + U.num(t.amount), 0);
    const incomeTx = txs.filter((t) => t.type === 'income');
    const expenseTx = txs.filter((t) => t.type === 'expense');
    const billTx = expenseTx.filter((t) => t.billId && t.billMonth === month);
    const nonBillTx = expenseTx.filter((t) => !(t.billId && t.billMonth === month));

    const income = sum(incomeTx);
    const expenseTotal = sum(expenseTx);
    const billPaid = sum(billTx);
    const dailyExpense = sum(nonBillTx);
    const transferTotal = sum(txs.filter((t) => t.type === 'transfer'));

    const fixedTotal = state.bills.reduce((s, b) => s + U.num(b.amount), 0);
    const paidBills = state.bills.filter((b) => (b.paidMonths || []).includes(month));
    const fixedPaid = paidBills.reduce((s, b) => s + U.num(b.amount), 0);
    const fixedUnpaid = Math.max(0, fixedTotal - fixedPaid);

    const savings = state.goals.reduce(
      (s, g) => s + (g.contributions || []).filter((c) => U.monthKeyOf(c.date) === month).reduce((a, c) => a + U.num(c.amount), 0),
      0
    );

    const discretionary = income - dailyExpense - fixedTotal - savings;
    const dailySeries = [];
    const days = U.daysInMonth(month);
    for (let d = 1; d <= days; d++) {
      const iso = `${month}-${U.pad(d)}`;
      const total = nonBillTx.filter((t) => t.date === iso).reduce((s, t) => s + U.num(t.amount), 0);
      dailySeries.push({ day: d, date: iso, total });
    }

    const catTotals = {};
    nonBillTx.forEach((t) => {
      catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + U.num(t.amount);
    });

    return {
      month, income, expenseTotal, dailyExpense, billPaid, fixedTotal, fixedPaid, fixedUnpaid,
      discretionary, savings, transferTotal, incomeCount: incomeTx.length,
      expenseCount: expenseTx.length, txCount: txs.length, dailySeries, catTotals,
      paidBillCount: paidBills.length, unpaidBillCount: state.bills.length - paidBills.length,
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
    };
  };

  const categorySpent = (month, categoryId) =>
    state.transactions
      .filter((t) => t.type === 'expense' && t.categoryId === categoryId && U.monthKeyOf(t.date) === month)
      .reduce((s, t) => s + U.num(t.amount), 0);

  const budgetProgress = (month) =>
    Object.entries(state.budgets || {})
      .map(([categoryId, limit]) => {
        const cat = categoryById(categoryId);
        if (!cat || !U.num(limit)) return null;
        const spent = categorySpent(month, categoryId);
        return {
          categoryId, category: cat, limit: U.num(limit), spent,
          pct: Math.min(100, (spent / U.num(limit)) * 100),
          rawPct: (spent / U.num(limit)) * 100,
          remaining: U.num(limit) - spent,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rawPct - a.rawPct);

  const totalBudget = () => Object.values(state.budgets || {}).reduce((s, v) => s + U.num(v), 0);

  const upcomingBills = (limit = 3) => {
    const mk = U.currentMonthKey();
    const today = new Date().getDate();
    return state.bills
      .filter((b) => !(b.paidMonths || []).includes(mk))
      .map((b) => ({ ...b, daysLeft: b.dueDay - today }))
      .sort((a, b) => a.dueDay - b.dueDay)
      .slice(0, limit);
  };

  /* ============================================================
     Transactions
     ============================================================ */
  const saveTransaction = (data, id = null) => {
    const payload = {
      type: data.type,
      amount: U.num(data.amount),
      categoryId: data.categoryId || null,
      walletId: data.walletId,
      toWalletId: data.type === 'transfer' ? data.toWalletId : null,
      date: data.date || U.todayISO(),
      note: (data.note || '').trim(),
    };

    if (id) {
      const idx = state.transactions.findIndex((t) => t.id === id);
      if (idx >= 0) state.transactions[idx] = { ...state.transactions[idx], ...payload };
    } else {
      state.transactions.unshift({
        id: U.uid('tx'),
        createdAt: Date.now(),
        ...payload,
      });
    }
    commit();
  };

  const deleteTransaction = (id) => {
    state.transactions = state.transactions.filter((t) => t.id !== id);
    commit();
  };

  const transactionById = (id) => state.transactions.find((t) => t.id === id) || null;

  /* ============================================================
     Categories
     ============================================================ */
  const addCategory = (kind, name, emoji, color) => {
    const clean = (name || '').trim();
    if (!clean) return null;
    const exists = state.categories[kind].find((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (exists) return exists;
    const cat = {
      id: U.uid('cat'),
      name: clean,
      emoji: emoji || (kind === 'income' ? '💰' : '🏷️'),
      color: color || CATEGORY_PALETTE[state.categories[kind].length % CATEGORY_PALETTE.length],
    };
    state.categories[kind].push(cat);
    commit();
    return cat;
  };

  const deleteCategory = (id) => {
    const used = state.transactions.some((t) => t.categoryId === id);
    if (used) return { ok: false, reason: 'Kategori masih dipakai oleh transaksi.' };
    let removed = false;
    state.categories.income = state.categories.income.filter((c) => (c.id === id ? ((removed = true), false) : true));
    state.categories.expense = state.categories.expense.filter((c) => (c.id === id ? ((removed = true), false) : true));
    delete state.budgets[id];
    commit();
    return { ok: removed };
  };

  const updateCategory = (id, patch) => {
    for (const kind of ['income', 'expense']) {
      const cat = state.categories[kind].find((c) => c.id === id);
      if (cat) {
        Object.assign(cat, patch);
        commit();
        return true;
      }
    }
    return false;
  };

  /* ============================================================
     Wallets
     ============================================================ */
  const addWallet = (data) => {
    const name = (data.name || '').trim();
    if (!name) return null;
    const exists = state.wallets.find((w) => w.name.toLowerCase() === name.toLowerCase());
    if (exists) return exists;
    const wallet = {
      id: U.uid('wlt'),
      name,
      emoji: data.emoji || '💳',
      color: data.color || WALLET_PALETTE[state.wallets.length % WALLET_PALETTE.length],
      initial: U.num(data.initial),
    };
    state.wallets.push(wallet);
    commit();
    return wallet;
  };

  const updateWallet = (id, patch) => {
    const wallet = state.wallets.find((w) => w.id === id);
    if (!wallet) return false;
    Object.assign(wallet, patch);
    commit();
    return true;
  };

  const deleteWallet = (id) => {
    if (state.wallets.length <= 1) return { ok: false, reason: 'Minimal harus ada satu dompet.' };
    const used = state.transactions.some((t) => t.walletId === id || t.toWalletId === id);
    const usedBill = state.bills.some((b) => b.walletId === id);
    if (used || usedBill) return { ok: false, reason: 'Dompet masih dipakai transaksi atau tagihan.' };
    state.wallets = state.wallets.filter((w) => w.id !== id);
    commit();
    return { ok: true };
  };

  /* ============================================================
     Bills (fixed monthly expenses)
     ============================================================ */
  const addBill = (data) => {
    const bill = {
      id: U.uid('bill'),
      name: (data.name || '').trim(),
      amount: U.num(data.amount),
      dueDay: U.clamp(U.num(data.dueDay) || 1, 1, 31),
      emoji: data.emoji || '🧾',
      color: data.color || '#6366f1',
      categoryId: data.categoryId || 'cat_tagihan',
      walletId: data.walletId || state.wallets[0].id,
      paidMonths: [],
      createdAt: U.todayISO(),
    };
    if (!bill.name || !bill.amount) return null;
    state.bills.push(bill);
    commit();
    return bill;
  };

  const updateBill = (id, patch) => {
    const bill = state.bills.find((b) => b.id === id);
    if (!bill) return false;
    Object.assign(bill, patch);
    // sync already paid payments with new amount / wallet / category
    state.transactions.forEach((t) => {
      if (t.billId === id && t.billMonth && bill.paidMonths.includes(t.billMonth)) {
        t.amount = bill.amount;
        t.walletId = bill.walletId;
        t.categoryId = bill.categoryId;
        t.note = bill.name;
      }
    });
    commit();
    return true;
  };

  const deleteBill = (id) => {
    state.bills = state.bills.filter((b) => b.id !== id);
    commit();
  };

  const toggleBillPaid = (billId, month) => {
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return false;
    bill.paidMonths = bill.paidMonths || [];
    const idx = bill.paidMonths.indexOf(month);
    if (idx >= 0) {
      bill.paidMonths.splice(idx, 1);
      state.transactions = state.transactions.filter((t) => !(t.billId === billId && t.billMonth === month));
      commit();
      return false;
    }

    bill.paidMonths.push(month);
    const current = U.currentMonthKey();
    let date;
    if (month === current) date = U.todayISO();
    else date = `${month}-${U.pad(Math.min(bill.dueDay, U.daysInMonth(month)))}`;
    state.transactions.unshift({
      id: U.uid('tx'),
      createdAt: Date.now(),
      type: 'expense',
      amount: U.num(bill.amount),
      categoryId: bill.categoryId,
      walletId: bill.walletId,
      date,
      note: bill.name,
      billId: bill.id,
      billMonth: month,
    });
    commit();
    return true;
  };

  const payAllBills = (month) => {
    let count = 0;
    state.bills.forEach((b) => {
      if (!(b.paidMonths || []).includes(month)) {
        toggleBillPaidSilent(b, month);
        count++;
      }
    });
    commit();
    return count;
  };

  const toggleBillPaidSilent = (bill, month) => {
    bill.paidMonths = bill.paidMonths || [];
    bill.paidMonths.push(month);
    const current = U.currentMonthKey();
    const date = month === current
      ? U.todayISO()
      : `${month}-${U.pad(Math.min(bill.dueDay, U.daysInMonth(month)))}`;
    state.transactions.unshift({
      id: U.uid('tx'),
      createdAt: Date.now(),
      type: 'expense',
      amount: U.num(bill.amount),
      categoryId: bill.categoryId,
      walletId: bill.walletId,
      date,
      note: bill.name,
      billId: bill.id,
      billMonth: month,
    });
  };

  /* ============================================================
     Budgets
     ============================================================ */
  const setBudget = (categoryId, limit) => {
    if (U.num(limit) > 0) state.budgets[categoryId] = U.num(limit);
    else delete state.budgets[categoryId];
    commit();
  };

  /* ============================================================
     Savings goals
     ============================================================ */
  const addGoal = (data) => {
    const goal = {
      id: U.uid('goal'),
      name: (data.name || '').trim(),
      target: U.num(data.target),
      saved: U.num(data.saved),
      emoji: data.emoji || '🎯',
      color: data.color || '#f59e0b',
      deadline: data.deadline || '',
      contributions: U.num(data.saved) > 0 ? [{ amount: U.num(data.saved), date: U.todayISO() }] : [],
    };
    if (!goal.name || !goal.target) return null;
    state.goals.push(goal);
    commit();
    return goal;
  };

  const updateGoal = (id, patch) => {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return false;
    Object.assign(goal, patch);
    commit();
    return true;
  };

  const adjustGoal = (id, amount, note = '') => {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return false;
    const amt = U.num(amount);
    if (!amt) return false;
    goal.contributions = goal.contributions || [];
    goal.contributions.push({ amount: amt, date: U.todayISO(), note });
    goal.saved = goal.contributions.reduce((s, c) => s + U.num(c.amount), 0);
    commit();
    return true;
  };

  const deleteGoal = (id) => {
    state.goals = state.goals.filter((g) => g.id !== id);
    commit();
  };

  /* ============================================================
     Settings / app state
     ============================================================ */
  const setSettings = (patch) => {
    state.settings = { ...state.settings, ...patch };
    commit();
    applyTheme();
  };

  const toggleHideBalance = () => {
    state.settings.hideBalance = !state.settings.hideBalance;
    commit();
    return state.settings.hideBalance;
  };

  const applyTheme = () => {
    const theme = state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0b1a' : '#6366f1');
  };

  /* ============================================================
     Import / export
     ============================================================ */
  const exportPayload = () => ({
    app: 'FinTrack',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  });

  const importData = (raw) => {
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return { ok: false, reason: 'File bukan JSON yang valid.' };
    }
    const data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.wallets)) {
      return { ok: false, reason: 'Struktur data tidak dikenali.' };
    }
    state = migrate(data);
    persist();
    emit();
    applyTheme();
    return { ok: true };
  };

  const resetData = (withDemo = false) => {
    state = withDemo ? buildSeed() : emptyState();
    persist();
    emit();
    applyTheme();
  };

  const toCSV = () => {
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = [['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Dompet Tujuan', 'Jumlah', 'Catatan']];
    [...state.transactions]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .forEach((t) => {
        const cat = t.type === 'transfer' ? 'Transfer' : (categoryById(t.categoryId) || {}).name || '';
        const wallet = (walletById(t.walletId) || {}).name || '';
        const dest = (walletById(t.toWalletId) || {}).name || '';
        rows.push([t.date, t.type, cat, wallet, dest, t.amount, t.note || '']);
      });
    return '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  };

  load();

  return {
    APP_VERSION,
    get, subscribe, commit,
    // selectors
    categoryById, walletById, categoryColor, walletBalance, totalBalance,
    getMonthStats, categorySpent, budgetProgress, totalBudget, upcomingBills,
    transactionById,
    // mutations
    saveTransaction, deleteTransaction,
    addCategory, deleteCategory, updateCategory,
    addWallet, updateWallet, deleteWallet,
    addBill, updateBill, deleteBill, toggleBillPaid, payAllBills,
    setBudget, addGoal, updateGoal, adjustGoal, deleteGoal,
    setSettings, toggleHideBalance, applyTheme,
    exportPayload, importData, resetData, toCSV,
    storageOk: () => storageOk,
    palettes: { category: CATEGORY_PALETTE, wallet: WALLET_PALETTE },
  };
})();

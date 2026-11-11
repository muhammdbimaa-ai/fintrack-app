/* ============================================================
   FinTrack — App bootstrap & router
   ============================================================ */
window.App = (function () {
  'use strict';

  const U = window.U;
  const S = window.Store;

  const ROUTES = ['home', 'history', 'bills', 'plan', 'settings'];

  const ui = {
    donutMode: 'category',
    planTab: 'goals',
    billMonth: U.currentMonthKey(),
    billFilter: 'all',
    history: { q: '', type: 'all', categoryId: 'all', walletId: 'all', from: '', to: '' },
  };

  let current = 'home';
  let installEvent = null;
  let lastKnownDay = U.todayISO();

  const getRoute = () => {
    const hash = location.hash.replace(/^#\/?/, '').trim();
    const route = hash.split('?')[0];
    return ROUTES.includes(route) ? route : 'home';
  };

  const updateNav = () => {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      const active = btn.dataset.route === current;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const fab = document.getElementById('fab');
    if (fab) fab.classList.toggle('is-hidden', !['home', 'history'].includes(current));
  };

  const render = (preserveScroll = false) => {
    const view = document.getElementById('view');
    if (!view) return;
    const y = window.scrollY;
    view.innerHTML = window.Screens.render(current);
    updateNav();
    window.Screens.afterRender(current);
    if (preserveScroll) window.scrollTo({ top: y, behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const refresh = (preserveScroll = true) => {
    render(preserveScroll);
  };

  const go = (route) => {
    if (!ROUTES.includes(route)) route = 'home';
    if (location.hash === `#/${route}`) {
      current = route;
      render(false);
      return;
    }
    location.hash = `#/${route}`;
  };

  const promptInstall = async () => {
    if (!installEvent) {
      U.toast('Instal dari menu browser', 'info', 'Pilih "Tambahkan ke layar utama"');
      return;
    }
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice && choice.outcome === 'accepted') {
      U.toast('FinTrack dipasang!', 'success', 'Buka dari layar utama');
    }
    installEvent = null;
  };

  const init = () => {
    S.applyTheme();
    current = getRoute();
    render(false);

    // nav icons
    document.querySelectorAll('[data-nav-icon]').forEach((el) => {
      el.innerHTML = U.icon(el.dataset.navIcon, 19);
    });

    // nav interactions
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => go(btn.dataset.route));
    });

    const fab = document.getElementById('fab');
    if (fab) {
      fab.addEventListener('click', () => {
        U.haptic(12);
        window.UI.openTransactionSheet('expense');
      });
    }
    const sideCta = document.getElementById('sideCta');
    if (sideCta) {
      sideCta.addEventListener('click', () => window.UI.openTransactionSheet('expense'));
    }

    window.addEventListener('hashchange', () => {
      const next = getRoute();
      if (next === current) return;
      current = next;
      render(false);
    });

    // PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installEvent = e;
    });
    window.addEventListener('appinstalled', () => {
      installEvent = null;
      U.toast('Aplikasi berhasil dipasang', 'success');
    });

    // Native builds already ship the assets locally. Skip the service worker there so
    // an app update can never be masked by an old cache.
    const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    if (!isNative && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    // refresh when day changes (keep dashboard accurate)
    const checkDay = () => {
      const today = U.todayISO();
      if (today !== lastKnownDay) {
        lastKnownDay = today;
        ui.billMonth = U.currentMonthKey();
        refresh(true);
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkDay();
    });
    window.addEventListener('focus', checkDay);

    // prevent iOS double-tap zoom on controls
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300 && e.target.closest('button')) e.preventDefault();
      lastTouch = now;
    }, { passive: false });

    // keyboard shortcuts (desktop)
    document.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('sheet-open')) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.UI.openTransactionSheet('expense');
      }
      if (e.key === '1') go('home');
      if (e.key === '2') go('history');
      if (e.key === '3') go('bills');
      if (e.key === '4') go('plan');
      if (e.key === '5') go('settings');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    ui,
    go,
    refresh,
    render,
    promptInstall,
    get current() { return current; },
  };
})();

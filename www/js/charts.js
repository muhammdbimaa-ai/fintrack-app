/* ============================================================
   FinTrack — Charts
   Dependency-free SVG donut, line & ring charts
   ============================================================ */
window.Charts = (function () {
  'use strict';

  const U = window.U;

  const short = (n) => {
    const v = Math.abs(n);
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + 'M';
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + 'jt';
    if (v >= 1e3) return Math.round(v / 1e3) + 'rb';
    return String(Math.round(v));
  };

  /* ============================================================
     Donut chart
     ============================================================ */
  function donut(segments, opts = {}) {
    const total = segments.reduce((s, x) => s + Math.max(0, U.num(x.value)), 0);
    const size = 160;
    const r = 61;
    const stroke = 19;
    const c = 2 * Math.PI * r;
    const gap = segments.filter((s) => U.num(s.value) > 0).length > 1 ? 5 : 0;

    let offset = 0;
    const segs = segments
      .filter((s) => U.num(s.value) > 0)
      .map((s) => {
        const frac = total > 0 ? U.num(s.value) / total : 0;
        const len = Math.max(0, frac * c - gap);
        const el = `
          <circle class="donut-seg" cx="80" cy="80" r="${r}"
            fill="none" stroke="${s.color}" stroke-width="${stroke}"
            stroke-linecap="round"
            stroke-dasharray="0 ${c}"
            data-len="${len}" data-offset="${offset}"
            data-label="${U.escapeHTML(s.label)}" data-value="${U.num(s.value)}"
            data-pct="${(frac * 100).toFixed(1)}"
            style="transform:rotate(-90deg);transform-origin:80px 80px"
            tabindex="0" role="img"
            aria-label="${U.escapeHTML(s.label)} ${(frac * 100).toFixed(1)} persen"></circle>`;
        offset += frac * c;
        return el;
      })
      .join('');

    const centerSmall = opts.centerLabel || 'Total';
    const centerValue = opts.centerValue || U.fmtCompact(total);
    const centerSub = opts.centerSub || '';

    const html = `
      <div class="donut-box" data-donut>
        <svg viewBox="0 0 ${size} ${size}" aria-label="${U.escapeHTML(centerSmall)}">
          <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}" opacity=".65"></circle>
          ${segs}
        </svg>
        <div class="donut-center">
          <small data-center-label>${U.escapeHTML(centerSmall)}</small>
          <strong data-center-value>${U.escapeHTML(centerValue)}</strong>
          <span data-center-sub>${U.escapeHTML(centerSub)}</span>
        </div>
      </div>`;

    // animate after insertion using a microtask hook
    const animate = (root) => {
      const circles = root.querySelectorAll('.donut-seg');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          circles.forEach((circle) => {
            const len = Number(circle.dataset.len);
            circle.style.transition = 'stroke-dasharray 1s cubic-bezier(.22,1,.36,1)';
            circle.setAttribute('stroke-dasharray', `${len} ${c - len}`);
            circle.style.strokeDashoffset = `-${circle.dataset.offset * c / c}px`;
          });
        });
      });
      // dashoffset needs fractions of circumference converted to px
      circles.forEach((circle) => {
        const off = Number(circle.dataset.offset) / c * c; // offset stored in px already
        circle.style.strokeDashoffset = `${-off}px`;
      });
    };

    // attach interactions via event delegation after mount: use a marker
    const bind = (root) => {
      animate(root);
      const centerL = root.querySelector('[data-center-label]');
      const centerV = root.querySelector('[data-center-value]');
      const centerS = root.querySelector('[data-center-sub]');
      root.querySelectorAll('.donut-seg').forEach((seg) => {
        const show = () => {
          centerL.textContent = seg.dataset.label;
          centerV.textContent = U.fmtCompact(Number(seg.dataset.value));
          centerS.textContent = seg.dataset.pct.replace('.', ',') + '% dari total';
          root.querySelectorAll('.donut-seg').forEach((s) => (s.style.opacity = s === seg ? '1' : '.45'));
        };
        const reset = () => {
          centerL.textContent = centerSmall;
          centerV.textContent = centerValue;
          centerS.textContent = centerSub;
          root.querySelectorAll('.donut-seg').forEach((s) => (s.style.opacity = '1'));
        };
        seg.addEventListener('mouseenter', show);
        seg.addEventListener('focus', show);
        seg.addEventListener('click', show);
        seg.addEventListener('mouseleave', reset);
        seg.addEventListener('blur', reset);
      });
    };

    return { html, bind };
  }

  /* ============================================================
     Line chart
     ============================================================ */
  function smoothPath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const t = 0.18;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  function line(data, opts = {}) {
    const W = 340;
    const H = opts.height || 158;
    const pad = { l: 6, r: 8, t: 14, b: 22 };
    const values = data.map((d) => U.num(d.value));
    const max = Math.max(...values, 1);
    const niceMax = max <= 100000 ? 100000 : Math.ceil(max / 50000) * 50000;
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const n = data.length;

    const xAt = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v) => pad.t + innerH - (U.num(v) / niceMax) * innerH;

    const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));
    const path = smoothPath(pts);
    const area = `${path} L ${xAt(n - 1)} ${pad.t + innerH} L ${xAt(0)} ${pad.t + innerH} Z`;
    const gradId = 'lineGrad' + Math.random().toString(36).slice(2, 7);

    const gridCount = 3;
    let grid = '';
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.t + (innerH / gridCount) * i;
      const val = niceMax - (niceMax / gridCount) * i;
      grid += `<line class="chart-grid-line" x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}"></line>`;
      grid += `<text class="chart-axis-label" x="${W - pad.r}" y="${y - 3}" text-anchor="end">${short(val)}</text>`;
    }

    const step = n > 20 ? 5 : n > 12 ? 3 : 2;
    let xLabels = '';
    data.forEach((d, i) => {
      if (i % step === 0 || i === n - 1) {
        xLabels += `<text class="chart-axis-label" x="${xAt(i)}" y="${H - 5}" text-anchor="middle">${U.escapeHTML(d.label)}</text>`;
      }
    });

    const dots = pts
      .map((p, i) => {
        const v = values[i];
        return `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="${v > 0 ? 2.8 : 1.6}" fill="${v > 0 ? opts.color || '#5b4bf5' : 'var(--line-strong)'}"
          data-i="${i}" data-x="${p.x}" data-y="${p.y}" data-value="${U.num(v)}" data-label="${U.escapeHTML(data[i].fullLabel || data[i].label)}"></circle>`;
      })
      .join('');

    const html = `
      <div class="line-chart-wrap" data-line>
        <svg viewBox="0 0 ${W} ${H}" aria-label="${U.escapeHTML(opts.ariaLabel || 'Grafik tren')}">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${opts.color || '#5b4bf5'}" stop-opacity=".28"></stop>
              <stop offset="100%" stop-color="${opts.color || '#5b4bf5'}" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          ${grid}
          ${xLabels}
          <path d="${area}" fill="url(#${gradId})" class="chart-area"></path>
          <path d="${path}" stroke="${opts.color || '#5b4bf5'}" stroke-width="2.6" class="chart-line" data-line-path></path>
          ${dots}
        </svg>
        <div class="chart-tooltip" data-tooltip></div>
      </div>`;

    const bind = (root) => {
      const svg = root.querySelector('svg');
      const tooltip = root.querySelector('[data-tooltip]');
      const pathEl = root.querySelector('[data-line-path]');
      if (pathEl) {
        try {
          const len = pathEl.getTotalLength();
          pathEl.style.strokeDasharray = `${len}`;
          pathEl.style.strokeDashoffset = `${len}`;
          requestAnimationFrame(() => {
            pathEl.style.transition = 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)';
            pathEl.style.strokeDashoffset = '0';
          });
        } catch (e) { /* noop */ }
      }
      const show = (dot) => {
        const rect = svg.getBoundingClientRect();
        const x = (Number(dot.dataset.x) / W) * rect.width;
        const y = (Number(dot.dataset.y) / H) * rect.height;
        tooltip.innerHTML = `<small>${dot.dataset.label}</small>${U.fmtMoney(dot.dataset.value)}`;
        tooltip.style.left = `${U.clamp(x, 45, rect.width - 45)}px`;
        tooltip.style.top = `${y}px`;
        tooltip.classList.add('is-visible');
      };
      root.querySelectorAll('.chart-dot').forEach((dot) => {
        dot.addEventListener('mouseenter', () => show(dot));
        dot.addEventListener('click', () => show(dot));
        dot.addEventListener('touchstart', () => show(dot), { passive: true });
      });
      svg.addEventListener('mouseleave', () => tooltip.classList.remove('is-visible'));
    };

    return { html, bind };
  }

  /* ============================================================
     Progress ring
     ============================================================ */
  function ring(pct, color, size = 42) {
    const r = (size - 7) / 2;
    const c = 2 * Math.PI * r;
    const p = U.clamp(pct, 0, 100);
    const offset = c - (p / 100) * c;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="3.5"></circle>
        <circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="3.5"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
      </svg>`;
  }

  /* ============================================================
     Sparkline (mini trend)
     ============================================================ */
  function spark(values, color = '#5b4bf5', width = 68, height = 26) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1 || 1)) * (width - 3) + 1.5,
      y: height - 3 - ((v - min) / range) * (height - 6),
    }));
    const d = smoothPath(pts);
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" opacity=".85"></path>
    </svg>`;
  }

  return { donut, line, ring, spark, short };
})();

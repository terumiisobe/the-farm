/* @ds-bundle: {"format":4,"namespace":"Bombus","components":[{"name":"Button"},{"name":"StatusBadge"},{"name":"HiveMarker"},{"name":"HiveDetails"},{"name":"HiveMap"},{"name":"BotLink"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef,
      useMemo = React.useMemo, useCallback = React.useCallback, useLayoutEffect = React.useLayoutEffect;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }

  /* ---------- statuses ---------- */
  var STATUSES = {
    stable:     { key: "stable",     label: "Estável",      glyph: "check", description: "Colônia estabelecida e equilibrada." },
    developing: { key: "developing", label: "Desenvolvendo", glyph: "up",    description: "Colônia nova ou em crescimento." },
    recovering: { key: "recovering", label: "Recuperando",  glyph: "cycle", description: "Colônia se recuperando de fraqueza ou praga." },
    lost:       { key: "lost",       label: "Perdida",      glyph: "cross", description: "Colônia perdida." },
    sold:       { key: "sold",       label: "Vendida",      glyph: "out",   description: "Colônia vendida; a caixa saiu do meliponário." }
  };
  var STATUS_ORDER = ["stable", "developing", "recovering", "lost", "sold"];
  function statusOf(key, overrides) {
    var base = STATUSES[key] || STATUSES.stable;
    var o = overrides && overrides[base.key];
    return o ? Object.assign({}, base, o) : base;
  }

  var GLYPHS = {
    check: "M2.5 6.4 4.9 8.8 9.5 3.6",
    up: "M6 9.6V2.6M3 5.4 6 2.4l3 3",
    cycle: "M9.5 6.2A3.5 3.5 0 1 1 8.4 3.5M8.6 1.6v2.2H6.4",
    cross: "M3.2 3.2l5.6 5.6M8.8 3.2 3.2 8.8",
    out: "M3.2 8.8 8.6 3.4M4.6 3.2h4.2v4.2"
  };
  function Glyph(props) {
    return h("svg", { className: cx("bb-glyph", props.className), viewBox: "0 0 12 12", width: props.size || 12, height: props.size || 12, "aria-hidden": "true", focusable: "false" },
      h("path", { d: GLYPHS[props.name] || GLYPHS.check, fill: "none", stroke: "currentColor", strokeWidth: props.weight || 2, strokeLinecap: "round", strokeLinejoin: "round" }));
  }

  /* ---------- the hive box (traced from the brand's box icon, 512 grid) ---------- */
  var HIVE_LID = "M 80.2 64.9 C 72.2 66.8, 65.5 74.6, 64.4 83.3 C 64.1 86.2, 63.9 98.6, 64.1 111.0 C 64.5 136.1, 65.2 139.1, 72.2 144.3 C 78.7 149.1, 72.3 149, 256 149 C 439.6 149, 433.2 149.1, 439.7 144.3 C 446.8 139.0, 447.4 136.3, 447.8 109.2 C 448.2 81.7, 447.4 76.8, 441.8 71.1 C 434.7 63.8, 452.0 64.5, 258 64.3 C 162.0 64.2, 82.0 64.5, 80.2 64.9";
  var HIVE_BODY = "M 86.0 292.2 C 86.0 403.5, 85.7 398.7, 92.7 413 C 100.1 428.1, 117.7 441.9, 135 446.1 C 139.4 447.2, 162.7 447.5, 256.5 447.5 L 372.5 447.5 380 445.1 C 402.5 438.1, 419.3 420.6, 424.4 399 C 425.7 393.4, 425.9 378.6, 425.9 292.2 L 426 192 256 192 L 86 192 86.0 292.2 M 185.5 235.4 C 166.5 242.3, 165.0 266.0, 183 275.6 C 186.3 277.4, 190.0 277.5, 256 277.5 C 325.2 277.5, 325.5 277.4, 329.5 275.3 C 337.2 271.1, 341.3 264.4, 341.3 256 C 341.3 247.5, 337.2 240.8, 329.5 236.6 C 325.5 234.5, 324.9 234.4, 257.5 234.2 C 200.9 234.0, 188.8 234.2, 185.5 235.4";
  var HIVE_INK = "M 79 21.6 C 50.5 25.9, 29.3 44.4, 22.8 71 C 20.9 78.7, 20.9 134.2, 22.8 142 C 25.1 151.1, 31.5 163.3, 37.4 169.7 L 42.9 175.7 43.2 289.1 L 43.5 402.5 46.2 411.8 C 58.9 455.1, 94.1 485.0, 138.3 489.9 C 151.4 491.3, 360.5 491.3, 373.6 489.9 C 417.9 484.9, 452.9 455.1, 465.8 411.5 L 468.4 402.5 468.7 289.1 L 469.0 175.7 474.0 170.2 C 480.5 163.1, 484.3 156.5, 487.7 146.5 L 490.4 138.5 490.4 107.5 C 490.5 72.7, 490.2 70.5, 483.8 57.1 C 478.3 45.7, 466.8 33.9, 456 28.6 C 440.2 20.9, 458.1 21.5, 259.5 21.4 C 161.6 21.3, 80.3 21.4, 79 21.6 M 76.4 65.8 C 71.4 68.1, 66.4 73.7, 64.9 78.7 C 64.2 81.2, 63.9 91.6, 64.1 109.1 L 64.5 135.8 67.6 140.1 C 69.4 142.6, 72.8 145.5, 75.6 147 L 80.4 149.5 256 149.5 L 431.5 149.5 436.3 147 C 439.1 145.5, 442.5 142.6, 444.3 140.1 L 447.5 135.8 447.8 109.1 C 448.1 79.8, 447.7 77.1, 442.7 71.3 C 435.7 63.3, 452.9 64.0, 256 64.0 C 88.3 64.0, 80.3 64.1, 76.4 65.8 M 85 290.5 C 85 401.2, 84.7 397.6, 92.2 413 C 98.0 424.8, 108.2 435.0, 120.0 440.8 C 135.7 448.5, 126.8 448.0, 258.6 447.7 L 376.5 447.5 382.2 445.2 C 405.8 436.2, 420.6 419.5, 425.4 396.6 C 426.7 390.0, 427 376.0, 427 290.5 L 427 192 256 192 L 85 192 85 290.5 M 183.5 236.8 C 166.6 244.6, 167.1 268.3, 184.2 275.4 C 190.4 278.0, 322.8 277.7, 328.5 275.1 C 345.0 267.4, 345.0 244.5, 328.5 236.8 C 322.3 234.0, 189.6 234.0, 183.5 236.8";

  function HiveIcon(props) {
    var size = props.size || 28;
    return h("svg", { className: cx("bb-hive-icon", props.className), viewBox: "0 0 512 512", width: size, height: size, "aria-hidden": "true", focusable: "false" },
      h("path", { className: "bb-hive-lid", d: HIVE_LID, strokeWidth: 10 }),
      h("path", { className: "bb-hive-body", d: HIVE_BODY, strokeWidth: 10 }),
      h("path", { className: "bb-hive-ink", d: HIVE_INK, fillRule: "evenodd" }));
  }

  /* ---------- Button ---------- */
  function Button(props) {
    var variant = props.variant || "primary", size = props.size || "md";
    var rest = Object.assign({}, props);
    delete rest.variant; delete rest.size; delete rest.icon; delete rest.className; delete rest.children;
    return h("button", Object.assign({ type: "button" }, rest, {
      className: cx("bb-btn", "bb-btn--" + variant, "bb-btn--" + size, props.icon && !props.children ? "bb-btn--icon" : null, props.className)
    }), props.icon || null, props.children != null ? h("span", { className: "bb-btn__label" }, props.children) : null);
  }

  /* ---------- StatusBadge ---------- */
  function StatusBadge(props) {
    var s = statusOf(props.status, props.statuses);
    return h("span", { className: cx("bb-badge", "bb-status--" + s.key, props.size === "sm" ? "bb-badge--sm" : null, props.className) },
      h(Glyph, { name: s.glyph, size: props.size === "sm" ? 10 : 12 }),
      h("span", null, props.label || s.label));
  }

  /* ---------- HiveMarker ---------- */
  function HiveMarker(props) {
    var s = statusOf(props.status, props.statuses);
    var showLabel = props.showLabel !== false;
    var aria = props.ariaLabel || ("Colmeia " + props.code + ", " + s.label + (props.species ? ", " + props.species : ""));
    return h("button", {
      type: "button",
      className: cx("bb-marker", "bb-status--" + s.key, props.selected ? "is-selected" : null, props.className),
      style: props.style,
      "aria-label": aria,
      "aria-pressed": props.selected ? "true" : "false",
      onClick: props.onClick,
      onPointerDown: function (e) { e.stopPropagation(); }
    },
      h("span", { className: "bb-marker__icon" },
        h(HiveIcon, { size: props.size || 30 }),
        h("span", { className: "bb-marker__glyph" }, h(Glyph, { name: s.glyph, size: 11, weight: 2.2 }))),
      showLabel ? h("span", { className: "bb-marker__code" }, props.code) : null);
  }

  /* ---------- dates ---------- */
  function fmtDate(iso) {
    if (!iso) return "—";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return String(iso);
    return m[3] + "/" + m[2] + "/" + m[1];
  }
  function daysSince(iso, today) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return null;
    var t = today ? new Date(today) : new Date();
    var a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((b - a) / 86400000);
  }
  function relDays(n) {
    if (n == null) return "";
    if (n <= 0) return "hoje";
    if (n === 1) return "ontem";
    return "há " + n + " dias";
  }

  /* ---------- HiveDetails ---------- */
  function HiveDetails(props) {
    var hive = props.hive;
    if (!hive) return null;
    var s = statusOf(hive.status, props.statuses);
    var since = daysSince(hive.lastInspection, props.today);
    var added = hive.addedAt || hive.installed;
    function row(label, value) {
      return h("div", { className: "bb-details__row" }, h("dt", null, label), h("dd", null, value));
    }
    return h("section", { className: cx("bb-details", props.className), "aria-label": "Detalhes da colmeia " + String(hive.code), style: props.style },
      h("header", { className: "bb-details__head" },
        h("div", { className: "bb-details__title" },
          h(HiveIcon, { size: 36 }),
          h("div", null,
            h("div", { className: "bb-details__eyebrow" }, props.codeLabel || "Colmeia"),
            h("div", { className: "bb-details__code" }, String(hive.code)))),
        props.onClose ? h(Button, { variant: "ghost", size: "sm", className: "bb-details__close", "aria-label": "Fechar detalhes", onClick: props.onClose, icon: h(Glyph, { name: "cross", size: 14 }) }) : null),
      h("div", { className: "bb-details__status" },
        h(StatusBadge, { status: s.key, statuses: props.statuses })),
      h("dl", { className: "bb-details__list" },
        row("Adicionada em", added ? fmtDate(added) : "—"),
        row("Última revisão em", hive.lastInspection ? fmtDate(hive.lastInspection) + (since != null ? " · " + relDays(since) : "") : "—")),
      h("div", { className: "bb-details__notes-block" },
        h("div", { className: "bb-details__notes-label" }, "Notas"),
        h("p", { className: cx("bb-details__notes", hive.notes ? null : "is-empty") }, hive.notes || "Sem notas.")));
  }

  /* ---------- Web Mercator ---------- */
  var TILE = 256;
  function project(lat, lng) { // world units at zoom 0 (0..256)
    var s = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180);
    return { x: TILE * (lng + 180) / 360, y: TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
  }
  function unproject(x, y) {
    var n = Math.PI - 2 * Math.PI * y / TILE;
    return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng: x / TILE * 360 - 180 };
  }
  function boundsOfPoints(pts) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    pts.forEach(function (p) { b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x); b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y); });
    return b;
  }
  function fitView(b, w, hgt, pad, maxZ) {
    var bw = Math.max(b.maxX - b.minX, 1e-9), bh = Math.max(b.maxY - b.minY, 1e-9);
    var z = Math.log2(Math.min((w - pad * 2) / bw, (hgt - pad * 2) / bh));
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z: Math.min(z, maxZ) };
  }
  function niceMeters(m) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
    for (var i = steps.length - 1; i >= 0; i--) if (steps[i] <= m) return steps[i];
    return 1;
  }

  var ICONS = {
    plus: h("svg", { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true" }, h("path", { d: "M8 3v10M3 8h10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", fill: "none" })),
    minus: h("svg", { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true" }, h("path", { d: "M3 8h10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", fill: "none" })),
    fit: h("svg", { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true" }, h("path", { d: "M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }))
  };

  /* ---------- HiveMap ---------- */
  function HiveMap(props) {
    var hives = props.hives || [];
    var sections = props.sections || [];
    var basemap = props.basemap || null;
    var maxZoom = props.maxZoom != null ? props.maxZoom : 21;
    var height = props.height || 520;
    var statuses = props.statuses;

    var rootRef = useRef(null);
    var sizeState = useState({ w: 0, h: 0 }); var size = sizeState[0], setSize = sizeState[1];
    var viewState = useState(null); var view = viewState[0], setView = viewState[1];
    var selState = useState(props.initialSelected != null ? String(props.initialSelected) : null); var selected = selState[0], setSelected = selState[1];
    var hiddenState = useState({}); var hidden = hiddenState[0], setHidden = hiddenState[1];
    var legendState = useState(null); var legendOpen = legendState[0], setLegendOpen = legendState[1];
    var viewRef = useRef(null); viewRef.current = view;
    var animRef = useRef(0);

    var projHives = useMemo(function () {
      return hives.map(function (hv) { var p = project(hv.lat, hv.lng); return { hive: hv, x: p.x, y: p.y }; });
    }, [hives]);
    var projSections = useMemo(function () {
      return sections.map(function (s) { return { section: s, pts: (s.polygon || []).map(function (ll) { return project(ll[0], ll[1]); }) }; });
    }, [sections]);
    var baseBox = useMemo(function () {
      if (!basemap || !basemap.bounds) return null;
      var nw = project(basemap.bounds[1][0], basemap.bounds[0][1]);
      var se = project(basemap.bounds[0][0], basemap.bounds[1][1]);
      return { minX: nw.x, minY: nw.y, maxX: se.x, maxY: se.y };
    }, [basemap]);
    var dataBox = useMemo(function () {
      var pts = projHives.map(function (p) { return p; });
      projSections.forEach(function (s) { pts = pts.concat(s.pts); });
      if (!pts.length && baseBox) return baseBox;
      if (!pts.length) return null;
      return boundsOfPoints(pts);
    }, [projHives, projSections, baseBox]);

    var fitPad = props.fitPadding != null ? props.fitPadding : 48;
    var computeFit = useCallback(function (w, hh) {
      if (props.center && props.zoom != null) { var c = project(props.center[0], props.center[1]); return { x: c.x, y: c.y, z: props.zoom }; }
      if (!dataBox) return { x: 128, y: 128, z: 2 };
      return fitView(dataBox, w, hh, fitPad, maxZoom - 1);
    }, [dataBox, fitPad, maxZoom, props.center, props.zoom]);

    var minZoom = useMemo(function () {
      if (props.minZoom != null) return props.minZoom;
      if (!size.w) return 0;
      var box = baseBox || dataBox; if (!box) return 0;
      // Still/sample: floor at exact image fit so zoom-out cannot letterbox past the picture.
      return fitView(box, size.w, size.h, 0, maxZoom).z;
    }, [props.minZoom, baseBox, dataBox, size.w, size.h, maxZoom]);

    // measure
    useLayoutEffect(function () {
      var el = rootRef.current; if (!el) return;
      function measure() { var r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }); }
      measure();
      if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", measure); return function () { window.removeEventListener("resize", measure); }; }
      var ro = new ResizeObserver(measure); ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    useEffect(function () {
      if (size.w && !viewRef.current) setView(clampView(computeFit(size.w, size.h)));
    }, [size.w, size.h, computeFit]);

    function clampView(v) {
      var z = Math.max(minZoom, Math.min(maxZoom, v.z));
      var x = v.x, y = v.y, sc = Math.pow(2, z);
      if (baseBox && size.w) {
        // keep the viewport on the imagery; centre it once the imagery is smaller than the viewport
        var hw = size.w / 2 / sc, hh = size.h / 2 / sc;
        x = (baseBox.maxX - baseBox.minX) > hw * 2 ? Math.max(baseBox.minX + hw, Math.min(baseBox.maxX - hw, x)) : (baseBox.minX + baseBox.maxX) / 2;
        y = (baseBox.maxY - baseBox.minY) > hh * 2 ? Math.max(baseBox.minY + hh, Math.min(baseBox.maxY - hh, y)) : (baseBox.minY + baseBox.maxY) / 2;
      } else if (dataBox) {
        var mx = (dataBox.maxX - dataBox.minX) * 0.25 + 1e-6, my = (dataBox.maxY - dataBox.minY) * 0.25 + 1e-6;
        x = Math.max(dataBox.minX - mx, Math.min(dataBox.maxX + mx, x));
        y = Math.max(dataBox.minY - my, Math.min(dataBox.maxY + my, y));
      }
      return { x: x, y: y, z: z };
    }
    function zoomAround(v, dz, px, py) {
      var s = Math.pow(2, v.z);
      var nz = Math.max(minZoom, Math.min(maxZoom, v.z + dz));
      var ns = Math.pow(2, nz);
      var ox = px - size.w / 2, oy = py - size.h / 2;
      var wx = v.x + ox / s, wy = v.y + oy / s;
      return clampView({ x: wx - ox / ns, y: wy - oy / ns, z: nz });
    }
    function animateTo(target) {
      cancelAnimationFrame(animRef.current);
      var from = viewRef.current; if (!from) { setView(target); return; }
      var t0 = performance.now(), dur = 240;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { setView(target); return; }
      function step(t) {
        var k = Math.min(1, (t - t0) / dur); var e = 1 - Math.pow(1 - k, 3);
        setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, z: from.z + (target.z - from.z) * e });
        if (k < 1) animRef.current = requestAnimationFrame(step);
      }
      animRef.current = requestAnimationFrame(step);
    }
    function zoomBy(dz) { var v = viewRef.current; if (v) animateTo(zoomAround(v, dz, size.w / 2, size.h / 2)); }
    function fit() { animateTo(clampView(computeFit(size.w, size.h))); }

    // wheel (non-passive)
    useEffect(function () {
      var el = rootRef.current; if (!el) return;
      function onWheel(e) {
        var v = viewRef.current; if (!v) return;
        e.preventDefault();
        var r = el.getBoundingClientRect();
        var dz = -e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025);
        dz = Math.max(-0.75, Math.min(0.75, dz));
        cancelAnimationFrame(animRef.current);
        setView(zoomAround(v, dz, e.clientX - r.left, e.clientY - r.top));
      }
      el.addEventListener("wheel", onWheel, { passive: false });
      return function () { el.removeEventListener("wheel", onWheel); };
    });

    // drag + pinch
    var pointers = useRef({});
    var gesture = useRef(null);
    function onPointerDown(e) {
      if (e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
      var el = rootRef.current; var r = el.getBoundingClientRect();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pointers.current[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
      cancelAnimationFrame(animRef.current);
      startGesture();
    }
    function startGesture() {
      var ids = Object.keys(pointers.current); var v = viewRef.current; if (!v) return;
      if (ids.length === 1) { var p = pointers.current[ids[0]]; gesture.current = { kind: "pan", x: p.x, y: p.y, v: v, moved: false }; }
      else if (ids.length >= 2) {
        var a = pointers.current[ids[0]], b = pointers.current[ids[1]];
        gesture.current = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v: v, moved: true };
      }
    }
    function onPointerMove(e) {
      if (!pointers.current[e.pointerId] || !gesture.current) return;
      var r = rootRef.current.getBoundingClientRect();
      pointers.current[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
      var g = gesture.current, s = Math.pow(2, g.v.z);
      if (g.kind === "pan") {
        var p = pointers.current[e.pointerId];
        var dx = p.x - g.x, dy = p.y - g.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
        setView(clampView({ x: g.v.x - dx / s, y: g.v.y - dy / s, z: g.v.z }));
      } else {
        var ids = Object.keys(pointers.current); if (ids.length < 2) return;
        var a = pointers.current[ids[0]], b = pointers.current[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var dz = Math.log2(d / g.d);
        var v2 = zoomAround(g.v, dz, g.mx, g.my);
        var ns = Math.pow(2, v2.z);
        setView(clampView({ x: v2.x - (mx - g.mx) / ns, y: v2.y - (my - g.my) / ns, z: v2.z }));
      }
    }
    function onPointerUp(e) {
      delete pointers.current[e.pointerId];
      var g = gesture.current;
      if (Object.keys(pointers.current).length) { startGesture(); return; }
      gesture.current = null;
    }
    function onDoubleClick(e) {
      var v = viewRef.current; if (!v) return;
      var r = rootRef.current.getBoundingClientRect();
      animateTo(zoomAround(v, e.shiftKey ? -1 : 1, e.clientX - r.left, e.clientY - r.top));
    }
    function onKeyDown(e) {
      var v = viewRef.current; if (!v) return;
      var s = Math.pow(2, v.z), step = 80 / s;
      if (e.key === "+" || e.key === "=") { zoomBy(1); e.preventDefault(); }
      else if (e.key === "-" || e.key === "_") { zoomBy(-1); e.preventDefault(); }
      else if (e.key === "0") { fit(); e.preventDefault(); }
      else if (e.key === "Escape") { setSelected(null); }
      else if (e.target === rootRef.current) {
        var d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (d) { animateTo(clampView({ x: v.x + d[0], y: v.y + d[1], z: v.z })); e.preventDefault(); }
      }
    }

    var selectedHive = null;
    hives.forEach(function (hv) { if (String(hv.code) === selected) selectedHive = hv; });
    var selectHive = function (hv) {
      var next = selected === String(hv.code) ? null : String(hv.code);
      setSelected(next);
      if (props.onSelect) props.onSelect(next ? hv : null);
    };

    // counts
    var counts = {};
    hives.forEach(function (hv) { var k = statusOf(hv.status).key; counts[k] = (counts[k] || 0) + 1; });

    var content = null;
    if (view && size.w) {
      var s = Math.pow(2, view.z);
      var toScreen = function (p) { return { x: (p.x - view.x) * s + size.w / 2, y: (p.y - view.y) * s + size.h / 2 }; };
      var layers = [];

      // tiles
      if (basemap && basemap.tiles) {
        var tz = Math.max(basemap.minZoom || 0, Math.min(basemap.maxZoom || 19, Math.round(view.z)));
        var ts = Math.pow(2, view.z - tz) * TILE;
        var n = Math.pow(2, tz);
        var cxT = view.x * n / TILE, cyT = view.y * n / TILE;
        var x0 = Math.floor(cxT - size.w / 2 / ts), x1 = Math.floor(cxT + size.w / 2 / ts);
        var y0 = Math.max(0, Math.floor(cyT - size.h / 2 / ts)), y1 = Math.min(n - 1, Math.floor(cyT + size.h / 2 / ts));
        var tiles = [];
        for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
          var wx = ((tx % n) + n) % n;
          var url = basemap.tiles.replace("{z}", tz).replace("{x}", wx).replace("{y}", ty).replace("{s}", "abc"[(tx + ty) % 3 < 0 ? 0 : (tx + ty) % 3]);
          tiles.push(h("img", { key: tz + "/" + tx + "/" + ty, src: url, alt: "", draggable: false, className: "bb-map__tile",
            ref: function (el) { if (el && el.complete && el.naturalWidth > 0) el.classList.add("is-loaded"); },
            onLoad: function (e) { e.currentTarget.classList.add("is-loaded"); },
            style: { left: Math.round((tx - cxT) * ts + size.w / 2) + "px", top: Math.round((ty - cyT) * ts + size.h / 2) + "px", width: Math.ceil(ts) + 1 + "px", height: Math.ceil(ts) + 1 + "px" } }));
        }
        layers.push(h("div", { key: "tiles", className: "bb-map__tiles" }, tiles));
      }
      // image overlay
      if (basemap && basemap.image && baseBox) {
        var a = toScreen({ x: baseBox.minX, y: baseBox.minY }), b = toScreen({ x: baseBox.maxX, y: baseBox.maxY });
        layers.push(h("img", { key: "img", src: basemap.image, alt: basemap.alt || "", draggable: false, className: "bb-map__image",
          style: { left: a.x + "px", top: a.y + "px", width: (b.x - a.x) + "px", height: (b.y - a.y) + "px" } }));
      }
      // sections
      var secLabels = [];
      var polys = projSections.map(function (ps) {
        var pts = ps.pts.map(toScreen);
        if (!pts.length) return null;
        var top = pts.reduce(function (m, p) { return (p.y < m.y || (p.y === m.y && p.x < m.x)) ? p : m; }, pts[0]);
        var hidden0 = ps.section.id && hives.every(function (hv) { return hv.section !== ps.section.id || hidden[statusOf(hv.status).key]; }) && hives.some(function (hv) { return hv.section === ps.section.id; });
        secLabels.push(h("span", { key: "l" + ps.section.id, className: cx("bb-map__section-label", hidden0 ? "is-dim" : null), style: { left: top.x + "px", top: top.y + "px" } }, ps.section.name || ("Setor " + ps.section.id)));
        return h("polygon", { key: ps.section.id, className: cx("bb-map__section", hidden0 ? "is-dim" : null), points: pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") });
      });
      layers.push(h("svg", { key: "sections", className: "bb-map__sections", width: size.w, height: size.h, "aria-hidden": "true" }, polys));
      layers.push(h("div", { key: "seclabels", className: "bb-map__labels", "aria-hidden": "true" }, secLabels));

      // markers
      var labelMin = props.labelMinZoom != null ? props.labelMinZoom : -Infinity;
      var showLabels = view.z >= labelMin;
      var gap = props.labelMinGap != null ? props.labelMinGap : 40;
      var visible = projHives.filter(function (ph) { return !hidden[statusOf(ph.hive.status).key]; })
        .map(function (ph) { return { ph: ph, p: toScreen(ph) }; });
      // a code pill shows only when its nearest neighbour is at least `gap` px away
      visible.forEach(function (m) {
        var best = Infinity;
        visible.forEach(function (o) { if (o !== m) { var d = Math.hypot(o.p.x - m.p.x, o.p.y - m.p.y); if (d < best) best = d; } });
        m.roomy = best >= gap;
      });
      var markers = visible
        .sort(function (m, n2) { return m.p.y - n2.p.y; })
        .map(function (m) {
          var ph = m.ph, p = m.p;
          if (p.x < -60 || p.y < -60 || p.x > size.w + 60 || p.y > size.h + 60) return null;
          var hv = ph.hive;
          var key = String(hv.code), isSel = selected === key;
          return h(HiveMarker, { key: key, code: key, status: hv.status, species: hv.species, statuses: statuses,
            selected: isSel, showLabel: (showLabels && m.roomy) || isSel,
            style: { left: p.x + "px", top: p.y + "px", zIndex: isSel ? 5 : 2 },
            onClick: function () { selectHive(hv); } });
        });
      layers.push(h("div", { key: "markers", className: "bb-map__markers" }, markers));

      // scale bar — when the basemap has SW/NE bounds (still/sample), metres-per-pixel
      // comes from that ground span so the bar matches the painted corners; otherwise
      // fall back to Web Mercator at the view centre (tile path).
      var mpp;
      if (basemap && basemap.bounds && baseBox) {
        var midLatRad = (basemap.bounds[0][0] + basemap.bounds[1][0]) / 2 * Math.PI / 180;
        var groundW = Math.abs(basemap.bounds[1][1] - basemap.bounds[0][1]) * 111320 * Math.cos(midLatRad);
        var screenW = Math.max((baseBox.maxX - baseBox.minX) * s, 1e-9);
        mpp = groundW / screenW;
      } else {
        var latC = unproject(view.x, view.y).lat;
        mpp = 156543.03392 * Math.cos(latC * Math.PI / 180) / s;
      }
      var meters = niceMeters(mpp * 100);
      var px = meters / mpp;
      content = { layers: layers, scale: { px: px, label: meters >= 1000 ? (meters / 1000) + " km" : meters + " m" } };
    }

    var narrow = size.w && size.w < 640;
    var showLegend = legendOpen == null ? !narrow : legendOpen;
    var title = props.title;

    return h("div", { className: cx("bb-map", narrow ? "is-narrow" : null, props.className), style: Object.assign({ height: typeof height === "number" ? height + "px" : height }, props.style) },
      h("div", {
        ref: rootRef, className: "bb-map__surface", tabIndex: 0, role: "application",
        "aria-label": (props.ariaLabel || "Mapa das colmeias") + ". Arraste para mover, role ou use + e − para zoom, setas para mover, 0 para enquadrar.",
        onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp,
        onDoubleClick: onDoubleClick, onKeyDown: onKeyDown
      }, content ? content.layers : null),

      h("div", { className: "bb-map__panel bb-map__legend" },
        h("button", { type: "button", className: "bb-map__legend-head", "aria-expanded": showLegend ? "true" : "false", onClick: function () { setLegendOpen(!showLegend); } },
          h("span", null,
            title ? h("span", { className: "bb-map__title" }, title) : null,
            h("span", { className: "bb-map__count" }, hives.length + (hives.length === 1 ? " colmeia" : " colmeias"))),
          h("svg", { className: "bb-map__chev", viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true" }, h("path", { d: showLegend ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }))),
        !showLegend ? null : h("ul", { className: "bb-map__legend-list" },
          STATUS_ORDER.filter(function (k) { return counts[k] || props.showEmptyStatuses; }).map(function (k) {
            var st = statusOf(k, statuses); var off = !!hidden[k];
            return h("li", { key: k },
              h("button", { type: "button", className: cx("bb-legend-chip", off ? "is-off" : null), "aria-pressed": off ? "false" : "true",
                title: off ? "Mostrar " + st.label : "Ocultar " + st.label,
                onClick: function () {
                  var n = Object.assign({}, hidden); n[k] = !off; setHidden(n);
                  if (!off && selectedHive && statusOf(selectedHive.status).key === k) { setSelected(null); if (props.onSelect) props.onSelect(null); }
                } },
                h("span", { className: cx("bb-legend-chip__dot", "bb-status--" + k) }, h(Glyph, { name: st.glyph, size: 9, weight: 2.4 })),
                h("span", { className: "bb-legend-chip__label" }, st.label),
                h("span", { className: "bb-legend-chip__n" }, counts[k] || 0)));
          }))),

      h("div", { className: "bb-map__panel bb-map__controls", role: "group", "aria-label": "Zoom" },
        h("button", { type: "button", className: "bb-map__ctl", onClick: function () { zoomBy(1); }, "aria-label": "Aproximar", disabled: view && view.z >= maxZoom - 0.01 }, ICONS.plus),
        h("button", { type: "button", className: "bb-map__ctl", onClick: function () { zoomBy(-1); }, "aria-label": "Afastar", disabled: view && view.z <= minZoom + 0.01 }, ICONS.minus),
        h("button", { type: "button", className: "bb-map__ctl", onClick: fit, "aria-label": "Enquadrar todas as colmeias" }, ICONS.fit)),

      content ? h("div", { className: "bb-map__foot" },
        h("div", { className: "bb-map__scale", "aria-hidden": "true" },
          h("span", { className: "bb-map__scale-bar", style: { width: content.scale.px + "px" } }),
          h("span", null, content.scale.label)),
        basemap && basemap.attribution ? h("span", { className: "bb-map__attr" }, basemap.attribution) : null) : null,

      selectedHive ? h("div", { className: "bb-map__details" },
        h(HiveDetails, { hive: selectedHive, statuses: statuses, today: props.today, onClose: function () { setSelected(null); if (props.onSelect) props.onSelect(null); } })) : null);
  }

  /* ---------- BotLink ---------- */
  // One quiet link out to the WhatsApp bot: the whole strip is the link (one tab stop, one target).
  function BotLink(props) {
    var title = props.title || "Gerencie suas colmeias pelo WhatsApp";
    return h("a", {
      className: cx("bb-botlink", props.className), href: props.href || "#", target: "_blank", rel: "noopener noreferrer",
      "aria-label": title + " (abre o WhatsApp em uma nova aba)"
    },
      h("span", { className: "bb-botlink__icon", "aria-hidden": "true" },
        // the speech bubble from the bot's avatar: rounded bubble, tail, three dots
        h("svg", { viewBox: "0 0 24 24", width: 22, height: 22 },
          h("path", { d: "M6.5 4.5h11a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4.2l-3.3 3.3v-3.3H6.5a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
          h("circle", { cx: 8.5, cy: 10.5, r: 1.1, fill: "currentColor" }),
          h("circle", { cx: 12, cy: 10.5, r: 1.1, fill: "currentColor" }),
          h("circle", { cx: 15.5, cy: 10.5, r: 1.1, fill: "currentColor" }))),
      h("span", { className: "bb-botlink__title" }, title),
      h("span", { className: "bb-botlink__go", "aria-hidden": "true" },
        h("svg", { viewBox: "0 0 16 16", width: 16, height: 16 }, h("path", { d: "M5 3h8v8M13 3 3.5 12.5", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }))));
  }

  function Code(props) { return h("span", { className: "bb-code" }, props.children); }

  var api = {
    Button: Button, StatusBadge: StatusBadge, HiveMarker: HiveMarker, HiveDetails: HiveDetails,
    HiveMap: HiveMap, BotLink: BotLink, HiveIcon: HiveIcon, Glyph: Glyph, Code: Code,
    STATUSES: STATUSES, STATUS_ORDER: STATUS_ORDER, project: project, unproject: unproject
  };
  window.Bombus = Object.assign(window.Bombus || {}, api);
})();

/* ============================================================
   EMMA — Límite de videos reproduciéndose a la vez
   - Escritorio: máx. 4 · Móvil (≤768px): máx. 2
   - Solo cuentan los videos a la vista (≥50% visibles)
   - Si hay más a la vista que el máximo, se reproducen los
     primeros en orden de lectura (arriba→abajo, izq→der)
   - Funciona con cualquier <video data-autoplay> agregado al
     DOM, aunque se renderice después (MutationObserver)
   ============================================================ */
(function () {
  const mqMobile = window.matchMedia("(max-width: 768px)");
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const maxPlaying = () => (mqMobile.matches ? 2 : 4);
  const visible = new Set();
  let queued = false;

  function play(v) {
    if (!v.paused) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {}); // autoplay bloqueado (ahorro de batería, etc.)
  }
  function pause(v) {
    if (!v.paused) v.pause();
  }

  function rebalance() {
    queued = false;
    const list = [...visible].filter((v) => v.isConnected);
    visible.clear();
    list.forEach((v) => visible.add(v));

    const pos = new Map(list.map((v) => [v, v.getBoundingClientRect()]));
    list.sort((a, b) => {
      const ra = pos.get(a), rb = pos.get(b);
      return Math.round(ra.top / 10) - Math.round(rb.top / 10) || ra.left - rb.left;
    });

    const allowed = new Set(document.hidden ? [] : list.slice(0, maxPlaying()));
    list.forEach((v) => (allowed.has(v) ? play(v) : pause(v)));
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(rebalance);
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const halfViewport = e.intersectionRect.height >= window.innerHeight * 0.5;
        if (e.intersectionRatio >= 0.5 || halfViewport) {
          visible.add(e.target);
        } else {
          visible.delete(e.target);
          pause(e.target);
        }
      });
      schedule();
    },
    { threshold: [0, 0.5, 1] },
  );

  function track(v) {
    if (v.__vl) return;
    v.__vl = true;
    v.muted = true;
    v.addEventListener("playing", () => v.classList.add("is-playing"));
    v.addEventListener("error", () => v.classList.remove("is-playing"));
    if (mqReduce.matches) return; // movimiento reducido: sin autoplay (la imagen queda como fallback)
    io.observe(v);
  }

  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches("video[data-autoplay]")) track(root);
    root.querySelectorAll("video[data-autoplay]").forEach(track);
  }

  new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach(scan));
    schedule(); // por si se quitaron videos del DOM
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("resize", schedule);
  (mqMobile.addEventListener ? mqMobile.addEventListener.bind(mqMobile, "change") : mqMobile.addListener.bind(mqMobile))(schedule);

  scan(document.documentElement);
})();

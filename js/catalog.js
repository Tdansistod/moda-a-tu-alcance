/* ============================================================
   EMMA — Catálogo estático
   Los productos viven en data/products.json (lo edita el panel
   local: node admin/server.js) y se publican con git push.
   ============================================================ */

/* ── Cache global de productos ─────────────────────────────
   Se llena con loadProductos() y se usa en todo el sitio.
   ──────────────────────────────────────────────────────── */
let PRODUCTOS = [];

async function loadProductos() {
  try {
    // no-cache: revalida con el servidor (ETag) para ver cambios al toque
    const res = await fetch("/data/products.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    PRODUCTOS = (Array.isArray(data) ? data : []).map((p) => ({
      ...p,
      imagenes: p.imagenes || [],
      videos: p.videos || [],
      talles: p.talles || [],
      colores: p.colores || [],
    }));
  } catch (err) {
    console.error("Error cargando productos:", err);
    PRODUCTOS = [];
  }
}

/* ── Helpers de catálogo (sincrónicos, usan el cache) ───── */

function getProductos({ categoria, genero, sale, destacado } = {}) {
  let lista = [...PRODUCTOS];
  if (categoria) lista = lista.filter((p) => p.categoria === categoria);
  if (genero) lista = lista.filter((p) => p.genero === genero);
  if (sale) lista = lista.filter((p) => p.sale);
  if (destacado) lista = lista.filter((p) => p.destacado);
  return lista;
}

function getProductoById(id) {
  return PRODUCTOS.find((p) => p.id === Number(id)) || null;
}

/* ── Media de las cartas ───────────────────────────────────
   Imagen siempre (es el fallback si el navegador no soporta
   WebM) + video encima si el producto tiene. El video queda
   invisible hasta que realmente empieza a reproducirse.
   La reproducción la controla js/video-limiter.js.
   ──────────────────────────────────────────────────────── */
function escAttr(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function cardMedia(p, { eager = false } = {}) {
  const img = (p.imagenes || [])[0] || "";
  const vid = (p.videos || [])[0];
  return (
    `<img src="${escAttr(img)}" alt="${escAttr(p.nombre)}" ${eager ? "" : 'loading="lazy"'} decoding="async"/>` +
    (vid
      ? `<video class="card-video" data-autoplay src="${escAttr(vid)}" muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"></video>`
      : "")
  );
}

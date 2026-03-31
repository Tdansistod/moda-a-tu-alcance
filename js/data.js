/* ============================================================
   EMMA — Utilidades de carrito y auth de admin
   (Productos y pedidos ahora viven en Supabase → js/supabase.js)
   ============================================================ */

function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}

/* ── Carrito (localStorage) ──────────────────────────────── */

const CART_KEY = 'emma_cart';

function getCarrito() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function guardarCarrito(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  actualizarBadge();
}

function agregarAlCarrito({ id, nombre, precio, imagen, talle, color, qty = 1 }) {
  const cart = getCarrito();
  const key  = `${id}-${talle}-${color}`;
  const idx  = cart.findIndex(i => i.key === key);
  if (idx > -1) {
    cart[idx].qty += qty;
  } else {
    cart.push({ key, id, nombre, precio, imagen, talle, color, qty });
  }
  guardarCarrito(cart);
}

function cambiarCantidad(key, delta) {
  const cart = getCarrito();
  const idx  = cart.findIndex(i => i.key === key);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  guardarCarrito(cart);
}

function eliminarDelCarrito(key) {
  guardarCarrito(getCarrito().filter(i => i.key !== key));
}

function vaciarCarrito() {
  guardarCarrito([]);
}

function totalCarrito() {
  return getCarrito().reduce((s, i) => s + i.precio * i.qty, 0);
}

function cantidadCarrito() {
  return getCarrito().reduce((s, i) => s + i.qty, 0);
}

function actualizarBadge() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cantidadCarrito();
}

/* ── Admin auth (Supabase Auth) ──────────────────────────── */
// La sesión la maneja Supabase internamente (localStorage).
// Usar db.auth.getSession() para verificar, db.auth.signOut() para cerrar.

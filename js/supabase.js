/* ============================================================
   EMMA — Supabase client + helpers de base de datos
   ============================================================ */

const SUPABASE_URL = 'https://pztftznwvrsoipiuhwof.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dGZ0em53dnJzb2lwaXVod29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTA3NzUsImV4cCI6MjA5MDQ4Njc3NX0.lfQS7GldfgAvQuXXBnOG_Rj6idNGsPVrOnho9uY4ZAI';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Cache global de productos ─────────────────────────────
   Se llena con loadProductos() y se usa en todo el sitio.
   ──────────────────────────────────────────────────────── */
let PRODUCTOS = [];

async function loadProductos() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando productos:', error.message);
    return;
  }
  PRODUCTOS = data || [];
}

/* ── Helpers de catálogo (sincrónicos, usan el cache) ───── */

function getProductos({ categoria, genero, sale, destacado } = {}) {
  let lista = [...PRODUCTOS];
  if (categoria) lista = lista.filter(p => p.categoria === categoria);
  if (genero)    lista = lista.filter(p => p.genero    === genero);
  if (sale)      lista = lista.filter(p => p.sale);
  if (destacado) lista = lista.filter(p => p.destacado);
  return lista;
}

function getProductoById(id) {
  return PRODUCTOS.find(p => p.id === Number(id)) || null;
}

/* ── Productos CRUD ────────────────────────────────────── */

async function db_insertProduct(prod) {
  const { id, ...rest } = prod; // dejar que Supabase genere el id
  const { data, error } = await db
    .from('products')
    .insert([rest])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function db_updateProduct(id, prod) {
  const { id: _id, created_at, ...rest } = prod;
  const { data, error } = await db
    .from('products')
    .update(rest)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function db_deleteProduct(id) {
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) throw error;
}

/* ── Pedidos CRUD ──────────────────────────────────────── */

async function db_getPedidos() {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error cargando pedidos:', error.message);
    return [];
  }
  return data || [];
}

async function db_guardarPedido(pedido) {
  const row = {
    nombre:    pedido.nombre,
    whatsapp:  pedido.whatsapp,
    direccion: pedido.direccion,
    localidad: pedido.localidad,
    provincia: pedido.provincia || '',
    nota:      pedido.nota     || '',
    items:     pedido.items,
    total:     pedido.total,
    estado:    'pendiente'
  };
  const { data, error } = await db
    .from('orders')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function db_actualizarEstadoPedido(id, estado) {
  const { error } = await db
    .from('orders')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

/* ── Storage ────────────────────────────────────────────── */

async function storage_uploadProductImage(file) {
  const ext      = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path     = `product-images/${fileName}`;

  const { error } = await db.storage
    .from('assets')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
}

async function storage_deleteImage(url) {
  const marker = '/object/public/assets/';
  const idx    = url.indexOf(marker);
  if (idx === -1) return; // not a storage URL, skip
  const path = url.slice(idx + marker.length);
  const { error } = await db.storage.from('assets').remove([path]);
  if (error) console.warn('No se pudo eliminar imagen del storage:', error.message);
}

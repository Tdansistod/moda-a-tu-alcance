#!/usr/bin/env node
/* ============================================================
   EMMA — Panel de admin LOCAL (cero dependencias, solo Node 18+)

   Uso:   node admin/server.js
   Abre:  http://localhost:3000/admin/

   - Sirve el sitio completo para previsualizar (como Vercel).
   - Edita data/products.json y guarda medios en assets/products/.
   - "Publicar" hace git add + commit + push → Vercel redeploya.

   Seguridad: escucha SOLO en 127.0.0.1, valida el header Host
   (anti DNS-rebinding) y exige el header X-Emma-Admin en la API
   (una web ajena no puede mandarlo sin permiso CORS, que acá
   nunca se concede). Esta carpeta NO se despliega en Vercel.
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";
const DATA_FILE = path.join(ROOT, "data", "products.json");
const MEDIA_DIR = path.join(ROOT, "assets", "products");
const MEDIA_URL = "/assets/products/";

const LIMITS = { image: 8 * 1024 * 1024, video: 20 * 1024 * 1024 };
const EXTS = { image: [".webp", ".jpg", ".jpeg", ".png"], video: [".webm"] };
const GENEROS = ["mujer", "hombre", "unisex"];

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".webm": "video/webm", ".mp4": "video/mp4",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

/* ── Utilidades ─────────────────────────────────────────── */

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, `El archivo supera el máximo de ${Math.round(limit / 1048576)} MB`)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function run(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: ROOT, timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout: String(stdout || ""), stderr: String(stderr || "") }));
  });
}

/* ── Validación de productos ────────────────────────────── */

function isMediaPath(p, kind) {
  return typeof p === "string" && p.startsWith("/assets/") && !p.includes("..") && !p.includes("\\")
    && (kind !== "video" || p.toLowerCase().endsWith(".webm"));
}
const strArr = (a) => (Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : []);

function normalizeProducts(list) {
  if (!Array.isArray(list)) throw new HttpError(400, "Se esperaba una lista de productos");
  const ids = new Set();
  return list.map((p, i) => {
    const where = `Producto #${i + 1}`;
    if (!Number.isInteger(p.id) || p.id < 1 || ids.has(p.id)) throw new HttpError(400, `${where}: id inválido o repetido`);
    ids.add(p.id);
    if (typeof p.nombre !== "string" || !p.nombre.trim()) throw new HttpError(400, `${where}: falta el nombre`);
    if (typeof p.precio !== "number" || !(p.precio >= 0)) throw new HttpError(400, `${where}: precio inválido`);
    if (!GENEROS.includes(p.genero)) throw new HttpError(400, `${where}: género inválido`);
    const imagenes = strArr(p.imagenes), videos = strArr(p.videos);
    if (!imagenes.length) throw new HttpError(400, `${where}: necesita al menos una imagen`);
    if (!imagenes.every((m) => isMediaPath(m, "image"))) throw new HttpError(400, `${where}: ruta de imagen inválida`);
    if (!videos.every((m) => isMediaPath(m, "video"))) throw new HttpError(400, `${where}: ruta de video inválida (solo .webm)`);
    return {
      id: p.id,
      nombre: p.nombre.trim(),
      descripcion: String(p.descripcion || "").trim(),
      precio: p.precio,
      precioAntes: typeof p.precioAntes === "number" && p.precioAntes > 0 ? p.precioAntes : null,
      categoria: String(p.categoria || "").trim(),
      genero: p.genero,
      talles: strArr(p.talles),
      colores: strArr(p.colores),
      imagenes,
      videos,
      destacado: !!p.destacado,
      nuevo: !!p.nuevo,
      sale: !!p.sale,
      created_at: typeof p.created_at === "string" ? p.created_at : new Date().toISOString(),
    };
  });
}

async function readProducts() {
  try { return JSON.parse(await fsp.readFile(DATA_FILE, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return []; throw e; }
}

async function writeProducts(list) {
  await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(list, null, 2) + "\n");
  await fsp.rename(tmp, DATA_FILE);
}

// Borra de assets/products/ lo que ningún producto referencia
async function removeOrphans(list) {
  const used = new Set(list.flatMap((p) => [...p.imagenes, ...p.videos]).filter((m) => m.startsWith(MEDIA_URL)).map((m) => path.basename(m)));
  let removed = 0;
  let files = [];
  try { files = await fsp.readdir(MEDIA_DIR); } catch { return 0; }
  for (const f of files) {
    if (f.startsWith(".") || used.has(f)) continue;
    await fsp.unlink(path.join(MEDIA_DIR, f)).catch(() => {});
    removed++;
  }
  return removed;
}

/* ── Subida de medios ───────────────────────────────────── */

function magicOk(buf, ext) {
  const hex = (n) => buf.subarray(0, n).toString("hex");
  if (ext === ".webm") return hex(4) === "1a45dfa3";
  if (ext === ".png") return hex(4) === "89504e47";
  if (ext === ".jpg" || ext === ".jpeg") return hex(3) === "ffd8ff";
  if (ext === ".webp") return buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
  return false;
}

async function handleUpload(req, res, url) {
  const kind = url.searchParams.get("kind");
  if (!EXTS[kind]) throw new HttpError(400, "kind debe ser image o video");
  const orig = path.basename(url.searchParams.get("name") || "archivo");
  const ext = path.extname(orig).toLowerCase();
  if (!EXTS[kind].includes(ext)) throw new HttpError(400, `Formato no permitido (${EXTS[kind].join(", ")})`);
  const buf = await readBody(req, LIMITS[kind]);
  if (!buf.length) throw new HttpError(400, "Archivo vacío");
  if (!magicOk(buf, ext)) throw new HttpError(400, `El archivo no es un ${ext} válido`);

  const base = path.basename(orig, ext).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || kind;
  const name = `${base}-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}${ext}`;
  await fsp.mkdir(MEDIA_DIR, { recursive: true });
  await fsp.writeFile(path.join(MEDIA_DIR, name), buf);
  sendJson(res, 200, { path: MEDIA_URL + name, bytes: buf.length });
}

/* ── Git ────────────────────────────────────────────────── */

const GIT_PATHS = ["data", "assets/products"];

async function gitStatus() {
  const st = await run("git", ["status", "--porcelain", "--", ...GIT_PATHS]);
  const br = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (st.code !== 0) return { ok: false, error: st.stderr.trim() || "git no disponible", changes: [] };
  const changes = st.stdout.split("\n").filter(Boolean).map((l) => l.trim());
  return { ok: true, branch: br.stdout.trim(), changes };
}

async function handlePublish(req, res) {
  const body = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
  const message = String(body.message || "").replace(/[\r\n]+/g, " ").trim().slice(0, 200) || "Actualizar catálogo";
  const log = [];
  const step = async (args, timeout) => {
    const r = await run("git", args, timeout);
    log.push(`$ git ${args.join(" ")}\n${(r.stdout + r.stderr).trim()}`);
    return r;
  };

  const add = await step(["add", "-A", "--", ...GIT_PATHS]);
  if (add.code !== 0) return sendJson(res, 500, { ok: false, error: "Falló git add", log });

  const staged = await run("git", ["diff", "--cached", "--quiet", "--", ...GIT_PATHS]);
  if (staged.code === 1) {
    const commit = await step(["commit", "-m", message, "--only", "--", ...GIT_PATHS]);
    if (commit.code !== 0) return sendJson(res, 500, { ok: false, error: "Falló el commit", log });
  } else {
    log.push("(no hay cambios nuevos para commitear)");
  }

  const push = await step(["push"], 120000);
  if (push.code !== 0) {
    return sendJson(res, 500, { ok: false, error: "El commit se hizo pero el push falló. Revisá tus credenciales/remoto y reintentá.", log });
  }
  sendJson(res, 200, { ok: true, log });
}

/* ── API ────────────────────────────────────────────────── */

async function handleApi(req, res, url) {
  if (req.headers["x-emma-admin"] !== "1") throw new HttpError(403, "Falta el header X-Emma-Admin");
  const route = `${req.method} ${url.pathname}`;

  if (route === "GET /api/products") return sendJson(res, 200, await readProducts());

  if (route === "PUT /api/products") {
    const raw = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString() || "null");
    const list = normalizeProducts(raw);
    await writeProducts(list);
    const removed = await removeOrphans(list);
    return sendJson(res, 200, { ok: true, count: list.length, removedFiles: removed });
  }

  if (route === "POST /api/upload") return handleUpload(req, res, url);
  if (route === "GET /api/git") return sendJson(res, 200, await gitStatus());
  if (route === "POST /api/publish") return handlePublish(req, res);

  throw new HttpError(404, "Ruta de API inexistente");
}

/* ── Estáticos (con Range para que el video ande en Safari) ─ */

async function handleStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Método no permitido");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/dashboard.html";
  if (rel.endsWith("/")) rel += "index.html";
  const segs = rel.split("/").filter(Boolean);
  if (segs.some((s) => s.startsWith(".") || s === "node_modules")) throw new HttpError(404, "No encontrado");
  if (rel === "/admin/server.js") throw new HttpError(404, "No encontrado");

  let file = path.join(ROOT, ...segs);
  if (!file.startsWith(ROOT + path.sep)) throw new HttpError(404, "No encontrado");
  let st = await fsp.stat(file).catch(() => null);
  if (!st && !path.extname(file)) { file += ".html"; st = await fsp.stat(file).catch(() => null); } // cleanUrls
  if (!st || !st.isFile()) throw new HttpError(404, "No encontrado");

  const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const headers = { "Content-Type": type, "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    start = Math.max(0, start); end = Math.min(end, st.size - 1);
    if (start > end) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
    return req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, "Content-Length": st.size });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

/* ── Server ─────────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  try {
    if (!ALLOWED_HOSTS.has(String(req.headers.host || "").toLowerCase())) throw new HttpError(403, "Host no permitido");
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : err instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error(err);
    if (res.headersSent) return res.end();
    sendJson(res, status, { error: status === 500 ? "Error interno" : err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Panel de admin:  http://localhost:${PORT}/admin/`);
  console.log(`  Sitio (preview): http://localhost:${PORT}/\n`);
});

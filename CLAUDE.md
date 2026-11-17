# Emma — Moda a tu Alcance

Tienda de indumentaria online para mujeres y hombres. Static site (HTML/CSS/JS vanilla) sin framework de build. Deploy en **Vercel**, base de datos y storage en **Supabase**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla (sin framework, sin build step) |
| Datos | `data/products.json` (versionado en git) |
| Medios | Archivos estáticos en `/assets` (imágenes `.webp`, videos `.webm`) |
| Deploy | Vercel (static hosting, redeploy automático en cada push a `main`) |
| Admin | Servidor Node local (`admin/server.js`, sin dependencias) — **no se despliega** |

Ya no hay Supabase, base de datos ni backend en producción.

---

## Estructura de archivos

```
/
├── index.html              # Página principal
├── catalogo.html           # Catálogo con filtros
├── producto.html           # Detalle (?id=N): galería con videos primero y luego imágenes
├── carrito.html            # Carrito (localStorage)
├── checkout.html           # Datos de entrega → arma el pedido en el navegador
├── pedido-confirmado.html  # Botón "Coordinar por WhatsApp" con el pedido armado
├── data/products.json      # CATÁLOGO (lo edita el panel local)
├── assets/
│   ├── logo/ hero/ instagram/ category-images/   # estáticos del sitio
│   └── products/           # medios de productos (los gestiona el panel; no editar a mano)
├── admin/
│   ├── server.js           # Servidor local: preview + API + git publish
│   └── dashboard.html      # Panel de productos (solo local)
├── css/styles.css
└── js/
    ├── catalog.js          # loadProductos() (fetch del JSON), getProductos(), cardMedia()
    ├── video-limiter.js    # Máx. 4 videos a la vez en escritorio, 2 en móvil (a la vista)
    ├── categories.js       # Categorías (slug, nombre, imagen)
    ├── data.js             # Carrito (localStorage) y formatPrecio
    └── theme.js            # dark/light
```

---

## Catálogo (`data/products.json`)

Array de productos, el más nuevo primero. **No editar a mano**: usar el panel (valida y limpia archivos huérfanos).
```
id          int (único, correlativo)
nombre, descripcion
precio, precioAntes (null si no hay oferta)
categoria   slug de js/categories.js
genero      'mujer' | 'hombre' | 'unisex'
talles[], colores[]
imagenes[]  rutas '/assets/products/xxx.webp' (la 1ra es la principal y el fallback del video)
videos[]    rutas '/assets/products/xxx.webm' (opcional)
destacado, nuevo, sale  booleanos
created_at  ISO
```

## Panel de admin (solo local)

```
node admin/server.js        # → http://localhost:3000/admin/
```
- Crear/editar/eliminar productos: escribe `data/products.json` y guarda los medios en `assets/products/`.
- Imágenes: se redimensionan a 1600 px y se convierten a WebP en el navegador antes de subir.
- Videos: solo `.webm`, máx. 20 MB, idealmente 3:4 y sin audio.
- **Publicar cambios** = `git add` (solo `data/` y `assets/products/`) + commit + push → Vercel redeploya.
- Seguridad: escucha solo en 127.0.0.1, valida `Host` y exige el header `X-Emma-Admin`. `/admin/*` redirige a `/` en Vercel y está en `.vercelignore`.

## Videos

- Carta: `<img>` + `<video data-autoplay muted loop playsinline preload="none">` encima, invisible hasta que arranca. Si el navegador no soporta WebM queda la imagen.
- Detalle: los videos van primero en la galería, después las imágenes.
- `video-limiter.js` (IntersectionObserver): cuenta solo videos con ≥50% visible; si hay más que el máximo (4 escritorio / 2 móvil ≤768px) reproduce los primeros en orden de lectura. Respeta `prefers-reduced-motion`. Los videos agregados dinámicamente se detectan solos.

## Sistema de temas (dark/light)

- CSS variables en `:root` para modo claro
- Bloque `[data-theme="dark"]` al final de `styles.css` que sobreescribe las variables
- `--black` / `--white` se invierten en dark mode (el sitio usa `var(--black)` para textos y `var(--white)` para fondos)
- Footer y announcement bar se mantienen oscuros siempre (hardcoded `#0d0d0d`)
- Logos: dos `<img>` con clases `.logo-img-dark` / `.logo-img-light`; CSS controla cuál se muestra
- `localStorage` key: `emma_theme`
- Prevención de FOUC: script inline antes del `<link rel="stylesheet">` en todos los HTML públicos

---

## Carrito

- Stored en `localStorage` bajo key `emma_cart`
- Ítem: `{ key, id, nombre, precio, imagen, talle, color, qty }`
- `key` = `${id}-${talle}-${color}` (identifica variante única)

---

## Flujo de pedido

1. Usuario agrega al carrito → `localStorage`
2. Checkout → formulario de datos personales
3. Submit → se arma el pedido en el navegador (id local, **no se guarda en ningún servidor**) y va a `pedido-confirmado.html` vía `sessionStorage` (`emma_pedido_confirmado`)
4. El pedido recién existe cuando el cliente toca "Coordinar por WhatsApp" (mensaje prefabricado al `5492944486963`)

---

## Convenciones CSS

- Sin clases de utilidad tipo Tailwind; todo semántico
- Variables: `--black`, `--white`, `--gray-50/100/300/500/700`, `--font-sans`, `--font-serif`
- Componentes: `.btn`, `.btn-dark`, `.btn-outline`, `.product-card`, `.toast`, `.header`, `.footer`, etc.
- Breakpoints: `768px` (tablet), `480px` (móvil)

---

## Historial de cambios relevantes

### Migración fuera de Supabase
- Productos → `data/products.json`; medios → `/assets`; pedidos → solo WhatsApp; admin → local con git push.
- Se eliminó `js/supabase.js`, `admin/login.html` y el workflow `keep-supabase-alive`.
- `og:image` usa URL absoluta (`https://moda-a-tu-alcance.vercel.app/assets/logo/logo-light.jpg`); si cambia el dominio, actualizarla en index/catálogo/producto.
- Videos `.webm` en cartas y detalle con límite de reproducción simultánea.

### Dark mode — negro puro
- `--white` en dark mode cambiado a `#000000`; footer, announcement bar y hero gradient también.
- Los grays intermedios se ajustaron para mantener contraste.

### Favicon
- `/favicon.svg` (anteojos de sol minimalistas) en todas las páginas públicas.

### Open Graph
- `og:image` / `twitter:image` en `index.html`, `catalogo.html`, `producto.html`.

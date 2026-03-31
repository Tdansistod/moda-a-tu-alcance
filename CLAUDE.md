# Emma — Moda a tu Alcance

Tienda de indumentaria online para mujeres y hombres. Static site (HTML/CSS/JS vanilla) sin framework de build. Deploy en **Vercel**, base de datos y storage en **Supabase**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla (sin framework, sin build step) |
| Base de datos | Supabase (PostgreSQL) |
| Storage | Supabase Storage (bucket `assets`, carpeta `logo/`, imágenes de productos) |
| Deploy | Vercel (static hosting) |
| Autenticación admin | Supabase Auth (`db.auth.signInWithPassword`) + RLS en todas las tablas |

---

## Estructura de archivos

```
/
├── index.html              # Página principal (hero, productos destacados, categorías)
├── catalogo.html           # Catálogo con filtros (categoría, género, talle, sale)
├── producto.html           # Detalle de producto (?id=N)
├── carrito.html            # Carrito (localStorage)
├── checkout.html           # Formulario de datos de entrega + guardar pedido en Supabase
├── pedido-confirmado.html  # Confirmación con botón "Coordinar por WhatsApp"
├── admin/
│   ├── login.html          # Login admin (Supabase Auth — email + contraseña)
│   └── dashboard.html      # CRUD de productos + visualización de pedidos
├── css/
│   └── styles.css          # Único archivo CSS — variables, componentes, dark mode
└── js/
    ├── supabase.js         # Cliente Supabase + helpers de DB (productos, pedidos)
    ├── data.js             # Carrito (localStorage), formatPrecio, auth admin
    └── theme.js            # toggleTheme() — dark/light
```

---

## Supabase

**Proyecto:** `pztftznwvrsoipiuhwof`
**URL:** `https://pztftznwvrsoipiuhwof.supabase.co`
**Anon key:** hardcodeada en `js/supabase.js` (es pública por diseño — no hay secretos aquí)

### Tablas

**`products`**
```
id          serial PK
nombre      text
descripcion text
precio      numeric
precioAntes numeric (nullable, precio tachado)
categoria   text  — 'mujer' | 'hombre' | 'maquillaje'
genero      text  — 'mujer' | 'hombre' | 'unisex'
talles      text[]
colores     text[]
imagenes    text[]  (URLs de Supabase Storage)
destacado   boolean
nuevo       boolean
sale        boolean
created_at  timestamptz
```

**`orders`**
```
id          serial PK
nombre      text
whatsapp    text
direccion   text
localidad   text
provincia   text
nota        text
items       jsonb  (array de { key, id, nombre, precio, imagen, talle, color, qty })
total       numeric
estado      text — 'pendiente' | 'confirmado' | 'enviado' | 'cancelado'
created_at  timestamptz
```

### Storage

- Bucket: `assets` (público)
- Logos: `assets/logo/logo-dark.jpg` y `assets/logo/logo-light.jpg`
- Imágenes de productos: `assets/product-images/...`
- URLs permanentes (no expiran): `https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/[path]`

---

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
3. Submit → `db_guardarPedido()` → guarda en tabla `orders` con `estado: 'pendiente'`
4. Redirige a `pedido-confirmado.html` con datos en `sessionStorage` (`emma_pedido_confirmado`)
5. Confirmación muestra botón "Coordinar por WhatsApp" con mensaje prefabricado al número `5492944486963`

---

## Admin

- URL: `/admin/login.html`
- Autenticación via Supabase Auth (`db.auth.signInWithPassword`); usuario creado en el dashboard de Supabase
- Dashboard: CRUD de productos (crear, editar, eliminar) + listar pedidos + cambiar estado
- Sin tema toggle (admin excluido del sistema dark/light)
- Imágenes de productos: upload directo a Supabase Storage bucket `assets/product-images/`

---

## Convenciones CSS

- Sin clases de utilidad tipo Tailwind; todo semántico
- Variables: `--black`, `--white`, `--gray-50/100/300/500/700`, `--font-sans`, `--font-serif`
- Componentes: `.btn`, `.btn-dark`, `.btn-outline`, `.product-card`, `.toast`, `.header`, `.footer`, etc.
- Breakpoints: `768px` (tablet), `480px` (móvil)

---

## Lo que queda pendiente (backlog conocido)

- [ ] Upload de imágenes de productos desde el dashboard admin (en vez de pegar URL)
- [ ] Variables de entorno en Vercel (no crítico — el anon key es público y el sitio es 100% estático sin build step)
- [ ] Posible migración a build tool (Vite) si se necesitan env vars reales o módulos ES

/**
 * categories.js — Configuración centralizada de categorías
 *
 * Para agregar, editar o quitar una categoría, solo modificá este archivo.
 * El resto del sitio (index, catálogo, admin) lee de aquí automáticamente.
 *
 * Estructura de cada ítem:
 *   slug       → valor usado en ?cat= y en la DB (campo `categoria`)
 *   nombre     → label visible en toda la UI
 *   imagen     → URL de la imagen de portada (Supabase Storage)
 *   cta        → texto del botón/link en la card de home
 */

const CATEGORIES = [
  {
    slug:   'buzos',
    nombre: 'Buzos y Suéteres',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/sueter.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'remeras',
    nombre: 'Remeras',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/remeras.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'bodies',
    nombre: 'Bodies',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/body.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'pantalones',
    nombre: 'Pantalones y Jeans',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/jeans.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'camperas',
    nombre: 'Camperas y Chalecos',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/camperas.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'maquillaje',
    nombre: 'Maquillaje y Belleza',
    imagen: 'https://pztftznwvrsoipiuhwof.supabase.co/storage/v1/object/public/assets/category-images/maquillaje.jpeg',
    cta:    'Ver tendencias'
  }
];

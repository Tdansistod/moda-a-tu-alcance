/**
 * categories.js — Configuración centralizada de categorías
 *
 * Para agregar, editar o quitar una categoría, solo modificá este archivo.
 * El resto del sitio (index, catálogo, admin) lee de aquí automáticamente.
 *
 * Estructura de cada ítem:
 *   slug       → valor usado en ?cat= y en la DB (campo `categoria`)
 *   nombre     → label visible en toda la UI
 *   imagen     → URL de la imagen de portada (/assets/category-images/)
 *   cta        → texto del botón/link en la card de home
 */

const CATEGORIES = [
  {
    slug:   'buzos',
    nombre: 'Buzos y Suéteres',
    imagen: '/assets/category-images/sueter.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'remeras',
    nombre: 'Remeras',
    imagen: '/assets/category-images/remeras.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'bodies',
    nombre: 'Bodies',
    imagen: '/assets/category-images/body.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'pantalones',
    nombre: 'Pantalones y Jeans',
    imagen: '/assets/category-images/jeans.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'camperas',
    nombre: 'Camperas y Chalecos',
    imagen: '/assets/category-images/camperas.jpeg',
    cta:    'Ver colección'
  },
  {
    slug:   'maquillaje',
    nombre: 'Maquillaje y Belleza',
    imagen: '/assets/category-images/maquillaje.jpeg',
    cta:    'Ver tendencias'
  }
];

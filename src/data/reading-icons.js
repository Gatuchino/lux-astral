// Banco de íconos/ornamentos que la IA puede elegir para acompañar una
// lectura (ver Reading.jsx: resolveReadingIcon / ReadingIconBadge). Son
// piezas PEQUEÑAS y prediseñadas -- la IA nunca genera imágenes, solo
// elige una de esta lista según la energía general de la lectura, así no
// hay costo ni espera extra.
//
// Cómo agregar íconos nuevos (no hace falta tocar ningún otro archivo):
//   1) Poné el archivo (PNG con fondo transparente, ideal ~256×256px, se
//      muestra chico en pantalla) dentro de assets/reading-icons/.
//   2) Sumá una entrada acá abajo:
//        { id: 'un-id-corto-unico', file: 'assets/reading-icons/archivo.png', tags: 'palabras clave en español separadas por coma' }
//      - id: lo que la IA va a citar -- corto, sin espacios (usar guiones).
//      - file: ruta del archivo tal cual arriba.
//      - tags: las palabras que la IA lee para decidir cuándo usarlo
//        (energía, elemento, emoción, palo del tarot si aplica). Cuantas
//        más y más específicas, mejor elige.
//
// Con la lista vacía (como está ahora) el sistema simplemente no muestra
// ningún ícono -- no rompe nada mientras no haya archivos reales todavía.
window.READING_ICONS = [
  // Ejemplos de referencia (comentados hasta tener los archivos reales):
  // { id: 'luna-menguante', file: 'assets/reading-icons/luna-menguante.png', tags: 'luna menguante, cierre, soltar, introspección, final de ciclo' },
  // { id: 'calice-dorado', file: 'assets/reading-icons/calice-dorado.png', tags: 'copas, amor, conexión emocional, vínculos, intuición' },
  // { id: 'llama-encendida', file: 'assets/reading-icons/llama-encendida.png', tags: 'bastos, pasión, impulso, energía creativa, acción' },
];

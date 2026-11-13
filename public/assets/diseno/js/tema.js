// Sin defer: ajustes antes de pintar, sin parpadeo. interfaz.js la llama al cambiar un ajuste
// <html data-tema data-densidad data-atajos data-movimiento data-subrayar data-paleta data-inspector>: lo leen CSS y scripts
const AJUSTES = { tema: 'sistema', densidad: 'comoda', atajos: 'si', movimiento: 'no', subrayar: 'no', paleta: 'si', inspector: 'visible' };
function aplicarPreferencias() {
  const raiz = document.documentElement;
  Object.entries(AJUSTES).forEach(([clave, porDefecto]) => {
    let valor = null;
    try { valor = localStorage.getItem(clave); } catch { /* sin localStorage */ }
    // Movimiento era sistema o reducido, ahora sí o no. Se guarda convertido
    if (clave === 'movimiento' && (valor === 'reducido' || valor === 'sistema')) {
      valor = valor === 'reducido' ? 'si' : 'no';
      try { localStorage.setItem(clave, valor); } catch { /* sin localStorage */ }
    }
    raiz.dataset[clave] = valor || porDefecto;
  });
  const sistema = raiz.dataset.tema === 'sistema';
  if (sistema) raiz.dataset.tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  // theme-color sigue al tema elegido, no solo al del sistema: la del otro tema se apaga
  // La condición de ancho se conserva: (prefers-color-scheme: light) and (width < …) → all and (width < …)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.dataset.media ??= m.media;
    const original = m.dataset.media;
    if (sistema) m.media = original;
    else m.media = original.includes(raiz.dataset.tema) ? original.replace(/\(prefers-color-scheme:\s*\w+\)/, 'all') : 'not all';
  });
  // <meta name="color-scheme">: el lienzo toma el tema antes que el CSS, sin destello blanco en oscuro
  const esquema = document.querySelector('meta[name="color-scheme"]');
  if (esquema) esquema.content = sistema ? 'light dark' : raiz.dataset.tema;
}
aplicarPreferencias();
// Hay JS: el CSS puede esperar a lo que dibujan los módulos (los gráficos) sin mostrar la tabla un instante
document.documentElement.dataset.js = '';

// Tablet de 600 a 1023 px: rail. El CSS lee data-medio
const medio = matchMedia('(37.5rem <= width < 64rem)');
const marcarMedio = () => document.documentElement.toggleAttribute('data-medio', medio.matches);
marcarMedio();
medio.addEventListener('change', marcarMedio);

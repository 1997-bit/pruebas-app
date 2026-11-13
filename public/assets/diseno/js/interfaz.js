// Sidebar, menús, diálogos, tooltips, tablas editables, totales y tema. Módulo ES: diferido y estricto
const raiz = document.documentElement;
const sidebar = document.getElementById('sidebar');
const alternar = document.getElementById('sidebar-alternar');
const fondo = document.getElementById('sidebar-fondo');
const escritorio = window.matchMedia('(width >= 64rem)');

if (sidebar && alternar) {
  const colapsado = () => raiz.dataset.sidebar === 'colapsado';
  const movilAbierto = () => raiz.dataset.sidebarMovil === 'abierto';

  const sincronizarAria = () => {
    alternar.setAttribute('aria-expanded', String(escritorio.matches ? !colapsado() : movilAbierto()));
  };

  const fijarColapsado = (valor) => {
    raiz.dataset.sidebar = valor ? 'colapsado' : 'expandido';
    // Cookie: el servidor puede pintar el estado en la próxima página
    document.cookie = `sidebar=${raiz.dataset.sidebar}; path=/; max-age=31536000; SameSite=Lax`;
    sincronizarAria();
  };

  const abrirMovil = () => {
    raiz.dataset.sidebarMovil = 'abierto';
    fondo.hidden = false;
    sincronizarAria();
    sidebar.querySelector('a, summary')?.focus();
  };

  const cerrarMovil = (devolverFoco = true) => {
    delete raiz.dataset.sidebarMovil;
    fondo.hidden = true;
    sincronizarAria();
    if (devolverFoco) alternar.focus();
  };

  const conmutar = () => {
    if (escritorio.matches) fijarColapsado(!colapsado());
    else if (movilAbierto()) cerrarMovil();
    else abrirMovil();
  };

  alternar.addEventListener('click', conmutar);
  fondo.addEventListener('click', () => cerrarMovil());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && movilAbierto()) cerrarMovil();
  });

  // Colapsado: abrir un grupo lo expande
  sidebar.querySelectorAll('.sidebar-desplegable > summary').forEach((summary) => {
    summary.addEventListener('click', (e) => {
      if (escritorio.matches && colapsado()) {
        e.preventDefault();
        fijarColapsado(false);
        summary.parentElement.open = true;
      } else if ('medio' in raiz.dataset && !movilAbierto()) {
        // Tablet en rail: menú completo con el grupo abierto
        e.preventDefault();
        summary.parentElement.open = true;
        abrirMovil();
      }
    });
  });

  // Radio del menú lateral en Ajustes
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="sidebar"][data-ajuste]')) fijarColapsado(e.target.value === 'colapsado');
  });

  escritorio.addEventListener('change', () => {
    if (escritorio.matches && movilAbierto()) cerrarMovil(false);
    sincronizarAria();
  });
  sincronizarAria();
}

// Popover sin anchor positioning: junto a su botón. data-lado: abajo o arriba
if (!CSS.supports('anchor-name: --a')) {
  document.querySelectorAll('[popover][data-lado]').forEach((menu) => {
    menu.addEventListener('toggle', (e) => {
      if (e.newState !== 'open') return;
      const r = document.querySelector(`[popovertarget="${menu.id}"]`).getBoundingClientRect();
      // Rail: escritorio colapsado o tablet. Se mide, no repite el CSS
      const colapsado = (sidebar?.offsetWidth ?? 0) < 100;
      Object.assign(menu.style, colapsado
        ? { left: `${r.right + 8}px`, top: menu.dataset.lado === 'abajo' ? `${r.top}px` : 'auto', bottom: menu.dataset.lado === 'arriba' ? `${innerHeight - r.bottom}px` : 'auto', width: 'auto' }
        : { left: `${r.left}px`, width: `${r.width}px`, top: menu.dataset.lado === 'abajo' ? `${r.bottom + 4}px` : 'auto', bottom: menu.dataset.lado === 'arriba' ? `${innerHeight - r.top + 4}px` : 'auto' });
    });
  });
}

// Respaldo de command="show-modal" para navegadores sin command
if (!('command' in HTMLButtonElement.prototype)) {
  document.querySelectorAll('[command="show-modal"]').forEach((boton) => {
    boton.addEventListener('click', () => document.getElementById(boton.getAttribute('commandfor'))?.showModal());
  });
}
// Respaldo de closedby="any": clic en el velo cierra
document.addEventListener('click', (e) => {
  if (!(e.target instanceof HTMLDialogElement) || 'closedBy' in HTMLDialogElement.prototype) return;
  const r = e.target.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
});

// Aviso flotante: cierra a los 5 s. ✕ cierra sin JS, command="close". Espera con mouse o foco encima
const aviso = document.querySelector('.aviso-flotante');
if (aviso) {
  const cerrar = () => (aviso.matches(':hover, :focus-within') ? setTimeout(cerrar, 1000) : aviso.close());
  // Con acción no cierra solo, WCAG 2.2.1
  if (!aviso.querySelector('[data-aviso-accion]')) setTimeout(cerrar, 5000);
}

// Aviso: deslizar lo cierra. Celular hacia arriba, escritorio hacia la derecha, como las notificaciones de Apple
document.addEventListener('pointerdown', (e) => {
  const el = e.target instanceof Element ? e.target.closest('.aviso-flotante') : null;
  if (!el || e.button || e.target.closest('a, button')) return;
  const vertical = matchMedia('(width < 37.5rem)').matches;
  const inicio = vertical ? e.clientY : e.clientX;
  let d = 0;
  el.setPointerCapture(e.pointerId);
  el.dataset.arrastrando = '';
  const mover = (ev) => {
    const delta = (vertical ? ev.clientY : ev.clientX) - inicio;
    // Hacia donde se cierra sigue al dedo; al revés resiste
    d = vertical ? (delta < 0 ? delta : delta / 4) : (delta > 0 ? delta : delta / 4);
    el.style.translate = vertical ? `0 ${d}px` : `${d}px 0`;
  };
  const soltar = () => {
    el.removeEventListener('pointermove', mover);
    el.removeEventListener('pointerup', soltar);
    el.removeEventListener('pointercancel', soltar);
    delete el.dataset.arrastrando;
    if (vertical ? d < -30 : d > 60) {
      el.style.transition = 'translate var(--dur-corta) var(--curva-salir), opacity var(--dur-corta) var(--curva-salir)';
      el.style.translate = vertical ? '0 -150%' : '120% 0';
      el.style.opacity = '0';
      // Sin transición (movimiento reducido) no llega transitionend
      setTimeout(() => el.close(), 250);
    } else {
      el.style.transition = 'translate var(--dur-resorte) var(--resorte)';
      el.style.translate = '';
    }
  };
  el.addEventListener('pointermove', mover);
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
});

// Resumen de errores, GOV.UK: un enlace por campo, foco al resumen. Sin JS: título y error por campo
// data-sin-resumen: alerta de error que no junta los campos, como un ejemplo
const resumen = document.querySelector('.alerta-error:not([data-sin-resumen])');
if (resumen) {
  const lista = document.createElement('ul');
  for (const error of document.querySelectorAll('.campo-error[id$="-error"]')) {
    const id = error.id.slice(0, -'-error'.length);
    const grupo = error.closest('fieldset');
    const control = document.getElementById(id) ?? grupo?.querySelector('input, select, textarea');
    if (!control) continue;
    const etiqueta = document.querySelector(`label[for="${id}"]`) ?? grupo?.querySelector('legend');
    const nombre = (etiqueta?.textContent ?? control.getAttribute('aria-label') ?? '').replace('*', '').trim();
    const enlace = document.createElement('a');
    enlace.href = `#${control.id}`;
    enlace.textContent = nombre ? `${nombre}: ${error.textContent.trim()}` : error.textContent.trim();
    enlace.addEventListener('click', (e) => {
      e.preventDefault();
      control.focus();
      control.scrollIntoView({ block: 'center' });
    });
    const item = document.createElement('li');
    item.append(enlace);
    lista.append(item);
  }
  if (lista.children.length) {
    const descripcion = document.createElement('div');
    descripcion.className = 'alerta-descripcion';
    descripcion.append(lista);
    resumen.append(descripcion);
  }
  resumen.tabIndex = -1;
  resumen.focus();
}

// Un envío por form. Atrás lo libera
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.method === 'dialog' || e.submitter?.formMethod === 'dialog') return;
  if ('enviando' in form.dataset) { e.preventDefault(); return; }
  form.dataset.enviando = '';
  e.submitter?.setAttribute('aria-disabled', 'true');
  // data-texto-enviando="Guardando…": el botón dice qué pasa, como Apple. Atrás lo devuelve
  const texto = e.submitter?.dataset.textoEnviando && textoDe(e.submitter);
  if (texto) {
    e.submitter.dataset.textoOriginal = texto.nodeValue;
    texto.nodeValue = ` ${e.submitter.dataset.textoEnviando}`;
  }
});
// Último texto visible del botón: el ícono queda
function textoDe(boton) {
  return [...boton.childNodes].reverse().find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
}
// Esqueleto si la página tarda más de 150 ms. Atrás lo quita
const principal = document.getElementById('principal');
let esqueleto;
// forma: data-esqueleto del enlace o del form, "tabla" o "tarjetas". Sin forma: el genérico
const esperar = (forma) => {
  esqueleto = setTimeout(() => {
    if (!principal) return;
    if (forma) principal.dataset.esqueleto = forma;
    else delete principal.dataset.esqueleto;
    principal.setAttribute('aria-busy', 'true');
  }, 150);
};
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (!a || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  // Cambios sin guardar: el navegador pregunta. Si se queda, sin esqueleto
  if (sinGuardar || a.target || a.hasAttribute('download') || a.origin !== location.origin || (a.hash && a.pathname === location.pathname)) return;
  esperar(a.dataset.esqueleto);
});
document.addEventListener('submit', (e) => { if (!e.defaultPrevented && e.target.method !== 'dialog') esperar(e.target.dataset.esqueleto); });
window.addEventListener('pageshow', () => {
  clearTimeout(esqueleto);
  principal?.removeAttribute('aria-busy');
  document.querySelectorAll('form[data-enviando]').forEach((f) => {
    delete f.dataset.enviando;
    f.querySelectorAll('[aria-disabled]').forEach((b) => b.removeAttribute('aria-disabled'));
    f.querySelectorAll('[data-texto-original]').forEach((b) => {
      const texto = textoDe(b);
      if (texto) texto.nodeValue = b.dataset.textoOriginal;
      delete b.dataset.textoOriginal;
    });
  });
});

// Form POST sin guardar: pregunta antes de salir
let sinGuardar = false;
document.addEventListener('input', (e) => { if (e.target.form?.method === 'post') sinGuardar = true; });
document.addEventListener('submit', () => { sinGuardar = false; });
window.addEventListener('beforeunload', (e) => { if (sinGuardar) e.preventDefault(); });

// iOS Safari solo aplica :active si la página escucha toques. Sin esto, apretar no encoge nada
document.addEventListener('touchstart', () => {}, { passive: true });

// Globos "calientes": el primero espera --espera-globo; mientras se pasa de uno a otro, los demás salen al instante
// Fuera de todo globo un rato, se enfrían y el próximo vuelve a esperar
const esperaGlobo = parseFloat(getComputedStyle(raiz).getPropertyValue('--espera-globo')) || 500;
let calentar;
let enfriar;
const tieneGlobo = (el) => el.closest('[data-tooltip]') || (el.closest('[data-etiqueta]') && (sidebar?.offsetWidth ?? 999) < 100);
document.addEventListener('pointerover', (e) => {
  if (!(e.target instanceof Element) || e.pointerType === 'touch') return;
  const caliente = 'globosCalientes' in raiz.dataset;
  if (tieneGlobo(e.target)) {
    clearTimeout(enfriar);
    if (!caliente) {
      clearTimeout(calentar);
      calentar = setTimeout(() => { raiz.dataset.globosCalientes = ''; }, esperaGlobo);
    }
  } else {
    clearTimeout(calentar);
    clearTimeout(enfriar);
    if (caliente) enfriar = setTimeout(() => { delete raiz.dataset.globosCalientes; }, 700);
  }
});

// Escape esconde tooltips hasta mover el mouse o el foco
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') raiz.setAttribute('data-tooltips-ocultos', '');
});
const mostrarTooltips = () => raiz.removeAttribute('data-tooltips-ocultos');
document.addEventListener('pointermove', mostrarTooltips);
document.addEventListener('focusin', mostrarTooltips);

// data-agregar-fila="tbody" copia <template id="tbody-fila">. data-quitar-fila borra. Mínimo 1
document.addEventListener('click', (e) => {
  const agregar = e.target.closest('[data-agregar-fila]');
  if (agregar) {
    const cuerpo = document.getElementById(agregar.dataset.agregarFila);
    const plantilla = document.getElementById(`${agregar.dataset.agregarFila}-fila`);
    if (!cuerpo || !plantilla) return;
    cuerpo.append(plantilla.content.cloneNode(true));
    cuerpo.lastElementChild.querySelector('input, select, textarea')?.focus();
    return;
  }
  const quitar = e.target.closest('[data-quitar-fila]');
  if (quitar) {
    const cuerpo = quitar.closest('tbody');
    quitar.closest('tr').remove();
    const botonAgregar = document.querySelector(`[data-agregar-fila="${cuerpo.id}"]`);
    if (cuerpo.rows.length === 0) botonAgregar?.click();
    else botonAgregar?.focus();
    calcular();
  }
});

// Totales en vivo, solo visuales: el servidor recalcula
function calcular() {
  document.querySelectorAll('output[data-suma], output[data-promedio]').forEach((salida) => {
    const grupo = salida.dataset.suma ?? salida.dataset.promedio;
    const valores = [...document.querySelectorAll(`[data-grupo="${grupo}"]`)]
      .filter((c) => (c.type === 'radio' ? c.checked : c.value !== ''))
      .map((c) => Number(c.value));
    const total = valores.reduce((a, b) => a + b, 0);
    if (salida.dataset.suma !== undefined) salida.textContent = String(total);
    else salida.textContent = valores.length ? (total / valores.length).toFixed(1) : '—';
  });
  document.querySelectorAll('output[data-porcentaje]').forEach((salida) => {
    const fila = salida.closest('tr');
    const total = fila.querySelector('[data-parte="total"]')?.value ?? '';
    const cubiertos = fila.querySelector('[data-parte="cubiertos"]')?.value ?? '';
    // Multiplicar antes de dividir: mismo redondeo que el servidor
    const valido = /^\d+$/.test(total) && /^\d+$/.test(cubiertos) && Number(total) > 0 && Number(cubiertos) <= Number(total);
    const porcentaje = valido ? Math.round((Number(cubiertos) * 100) / Number(total)) : 0;
    salida.textContent = valido ? `${porcentaje} %` : '—';
    const medidor = fila.querySelector('meter');
    if (medidor) medidor.value = porcentaje;
  });
}
document.addEventListener('input', calcular);
calcular();

// Tablero: soltar en otra columna pulsa "Mover a"
let arrastrada = null;
const columnaDe = (e) => (e.target instanceof Element ? e.target.closest('[data-columna-estado]') : null);
document.addEventListener('dragstart', (e) => {
  arrastrada = e.target instanceof Element ? e.target.closest('[data-arrastrable]') : null;
  if (arrastrada) e.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragover', (e) => {
  const columna = columnaDe(e);
  if (!arrastrada || !columna) return;
  e.preventDefault();
  document.querySelectorAll('.soltar').forEach((c) => c !== columna && c.classList.remove('soltar'));
  columna.classList.add('soltar');
});
document.addEventListener('drop', (e) => {
  const columna = columnaDe(e);
  if (!arrastrada || !columna) return;
  e.preventDefault();
  const boton = [...arrastrada.querySelectorAll('button[name="destino"]')].find((b) => b.value.endsWith(`-${columna.dataset.columnaEstado}`));
  if (!boton) return;
  // moveBefore mueve sin sacar del DOM: no pierde foco ni animaciones. Sin él, append
  const destino = columna.querySelector('ul');
  if ('moveBefore' in Element.prototype) destino.moveBefore(arrastrada, null);
  else destino.append(arrastrada);
  boton.form.requestSubmit(boton);
});
document.addEventListener('dragend', () => {
  arrastrada = null;
  document.querySelectorAll('.soltar').forEach((c) => c.classList.remove('soltar'));
});

// Recientes: página con data-reciente="código" y data-reciente-texto, máximo 5. Lista [data-recientes] y paleta
const marca = document.querySelector('[data-reciente]');
let recientes = [];
try { recientes = JSON.parse(localStorage.getItem('recientes')) || []; } catch { /* sin localStorage: modo privado o bloqueado */ }
if (marca) {
  const actual = { url: location.pathname + location.search, codigo: marca.dataset.reciente, texto: marca.dataset.recienteTexto };
  recientes = [actual, ...recientes.filter((r) => r.url !== actual.url)].slice(0, 5);
  try { localStorage.setItem('recientes', JSON.stringify(recientes)); } catch { /* sin localStorage: modo privado o bloqueado */ }
}
const panelRecientes = document.querySelector('[data-recientes]');
if (panelRecientes && recientes.length) {
  panelRecientes.querySelector('ul').replaceChildren(...recientes.map((r) => {
    const a = Object.assign(document.createElement('a'), { href: r.url });
    a.append(Object.assign(document.createElement('span'), { className: 'codigo', textContent: r.codigo }), ' ',
      Object.assign(document.createElement('span'), { textContent: r.texto }));
    const li = document.createElement('li');
    li.append(a);
    return li;
  }));
  panelRecientes.hidden = false;
}

document.querySelectorAll('[data-imprimir]').forEach((boton) => {
  boton.addEventListener('click', () => window.print());
});

// data-desde="id-inicio": final no anterior al inicio
document.querySelectorAll('input[data-desde]').forEach((fin) => {
  const inicio = document.getElementById(fin.dataset.desde);
  if (!inicio) return;
  const ajustar = () => { fin.min = inicio.value; };
  inicio.addEventListener('input', ajustar);
  ajustar();
});

// data-cuando="nombre=valor": visible y enviado solo con esa opción
const mostrarSegunMarcado = () => {
  document.querySelectorAll('[data-cuando]').forEach((bloque) => {
    const [nombre, valor] = bloque.dataset.cuando.split('=');
    bloque.hidden = !bloque.closest('form')?.querySelector(`input[name="${nombre}"][value="${valor}"]:checked`);
    bloque.querySelectorAll('input, select, textarea').forEach((c) => { c.disabled = bloque.hidden; });
  });
};
document.addEventListener('change', mostrarSegunMarcado);
mostrarSegunMarcado();

// data-autoenviar: los select filtran al cambiar. El botón queda sin JS
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-autoenviar] select')) e.target.form.requestSubmit();
});

// data-vista-previa="id-img"
document.querySelectorAll('input[data-vista-previa]').forEach((entrada) => {
  const img = document.getElementById(entrada.dataset.vistaPrevia);
  entrada.addEventListener('change', () => {
    const archivo = entrada.files[0];
    img.hidden = !archivo;
    if (archivo) img.src = URL.createObjectURL(archivo);
  });
});

// Segmentado: una pastilla que se desliza con resorte a la opción marcada. CSS: .segmentado[data-deslizar]
// Sin JS: la etiqueta marcada lleva su propio fondo
const deslizar = (grupo) => {
  const marcada = grupo.querySelector('label:has(input:checked)');
  const medidas = marcada
    ? { x: marcada.offsetLeft, y: marcada.offsetTop, w: marcada.offsetWidth, h: marcada.offsetHeight }
    : { x: 0, y: 0, w: 0, h: 0 };
  Object.entries(medidas).forEach(([nombre, valor]) => grupo.style.setProperty(`--${nombre}`, `${valor}px`));
};
document.querySelectorAll('.segmentado').forEach((grupo) => {
  // Primera medida sin animar: la pastilla no viaja desde la esquina
  grupo.dataset.deslizar = 'quieto';
  deslizar(grupo);
  requestAnimationFrame(() => requestAnimationFrame(() => { grupo.dataset.deslizar = ''; }));
  // Letra cargada, zoom, ancho: se vuelve a medir
  new ResizeObserver(() => deslizar(grupo)).observe(grupo);
});
document.addEventListener('change', (e) => {
  const grupo = e.target instanceof Element ? e.target.closest('.segmentado') : null;
  if (grupo) deslizar(grupo);
});
// reset cambia los radios sin change
document.addEventListener('reset', (e) => {
  setTimeout(() => e.target.querySelectorAll('.segmentado').forEach(deslizar));
});

// Hoja del celular: arrastrar hacia abajo la cierra, como iOS. Desde la agarradera o el título
const enCelular = matchMedia('(width < 37.5rem)');
document.querySelectorAll('dialog.dialogo:not(.paleta)').forEach((dialogo) => {
  const agarre = document.createElement('div');
  agarre.className = 'dialogo-agarre';
  agarre.setAttribute('aria-hidden', 'true');
  dialogo.prepend(agarre);
});
document.addEventListener('pointerdown', (e) => {
  if (!enCelular.matches || e.button || !(e.target instanceof Element)) return;
  if (!e.target.closest('.dialogo-agarre, h2')) return;
  const dialogo = e.target.closest('dialog.dialogo[open]:not(.paleta)');
  if (!dialogo) return;
  const inicio = e.clientY;
  let dy = 0;
  let ultimo = { y: e.clientY, t: e.timeStamp };
  let velocidad = 0;
  dialogo.setPointerCapture(e.pointerId);
  dialogo.dataset.arrastrando = '';
  const mover = (ev) => {
    // Hacia arriba resiste, como el rebote de iOS
    const d = ev.clientY - inicio;
    dy = d > 0 ? d : d / 4;
    dialogo.style.translate = `0 ${dy}px`;
    velocidad = (ev.clientY - ultimo.y) / Math.max(1, ev.timeStamp - ultimo.t);
    ultimo = { y: ev.clientY, t: ev.timeStamp };
  };
  const soltar = () => {
    dialogo.removeEventListener('pointermove', mover);
    dialogo.removeEventListener('pointerup', soltar);
    dialogo.removeEventListener('pointercancel', soltar);
    delete dialogo.dataset.arrastrando;
    // Sin el estilo en línea vuelve con resorte o baja con la transición de cierre
    dialogo.style.translate = '';
    // Un tercio del alto o un tirón rápido: cierra. px/ms
    if (dy > dialogo.offsetHeight / 3 || (velocidad > 0.5 && dy > 24)) dialogo.close();
  };
  dialogo.addEventListener('pointermove', mover);
  dialogo.addEventListener('pointerup', soltar);
  dialogo.addEventListener('pointercancel', soltar);
});

// Menú "…": flechas, Inicio y Fin entre opciones; elegir cierra. Abre con el foco en la primera, como macOS
const itemsDe = (menu) => [...menu.querySelectorAll('.menu-item:not(:disabled)')];
document.addEventListener('keydown', (e) => {
  const menu = e.target instanceof Element ? e.target.closest('.menu') : null;
  if (!menu) return;
  const items = itemsDe(menu);
  const i = items.indexOf(document.activeElement);
  const destino = { ArrowDown: items[(i + 1) % items.length], ArrowUp: items.at(i - 1), Home: items[0], End: items.at(-1) }[e.key];
  if (destino) { e.preventDefault(); destino.focus(); }
});
document.addEventListener('toggle', (e) => {
  if (e.target instanceof Element && e.target.matches('.menu') && e.newState === 'open') itemsDe(e.target)[0]?.focus();
}, true);
document.addEventListener('click', (e) => {
  const item = e.target instanceof Element ? e.target.closest('.menu .menu-item') : null;
  // Abre un diálogo: el menú ya se fue. Si no, se cierra aquí
  if (item) item.closest('.menu').matches(':popover-open') && item.closest('.menu').hidePopover();
});
// Sin anchor positioning: bajo su botón, alineado a la derecha
if (!CSS.supports('position-area: block-end')) {
  document.querySelectorAll('.menu[id]').forEach((menu) => {
    menu.addEventListener('toggle', (e) => {
      const boton = document.querySelector(`[popovertarget="${menu.id}"]`);
      if (e.newState !== 'open' || !boton) return;
      const r = boton.getBoundingClientRect();
      Object.assign(menu.style, { top: `${r.bottom + 4}px`, left: `${Math.max(8, r.right - menu.offsetWidth)}px` });
    });
  });
}

// Menú contextual: clic derecho, tecla de menú o mantener presionado en filas y tarjetas con acciones
// Copia las acciones que la fila ya tiene: un solo lugar para mantenerlas. Enlaces y campos: el menú del sistema
const FILAS_MENU = '.tabla tbody tr, .tarjeta-caso, .archivo';
const ACCIONES_FILA = '.celda-acciones :is(a, button), .mover button, .archivo > .acciones :is(a, button)';
const menuContextual = document.createElement('div');
menuContextual.className = 'menu menu-contextual';
menuContextual.popover = 'auto';
menuContextual.setAttribute('role', 'menu');
document.body.append(menuContextual);
const abrirContextual = (fila, x, y) => {
  const acciones = [...fila.querySelectorAll(ACCIONES_FILA)].filter((a) => !a.disabled && !a.closest('[hidden]'));
  if (!acciones.length) return false;
  menuContextual.replaceChildren(...acciones.map((original) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    item.setAttribute('role', 'menuitem');
    const icono = original.querySelector('svg')?.cloneNode(true);
    if (icono) item.append(icono);
    item.append((original.getAttribute('aria-label') || original.textContent).trim());
    // data-peligro: acción destructiva aunque el botón sea fantasma
    if (original.matches('.btn-peligro, [data-quitar-fila], [data-peligro]')) item.classList.add('menu-item-peligro');
    item.addEventListener('click', () => original.click());
    return item;
  }));
  menuContextual.showPopover();
  // Dentro de la ventana
  const { width, height } = menuContextual.getBoundingClientRect();
  menuContextual.style.left = `${Math.max(8, Math.min(x, innerWidth - width - 8))}px`;
  menuContextual.style.top = `${Math.max(8, Math.min(y, innerHeight - height - 8))}px`;
  return true;
};
const filaDe = (e) => (e.target instanceof Element && !e.target.closest('a[href], input, textarea, select') ? e.target.closest(FILAS_MENU) : null);
document.addEventListener('contextmenu', (e) => {
  const fila = filaDe(e);
  if (!fila || menuContextual.matches(':popover-open')) return;
  // Teclado (Shift+F10): sin puntero, junto a la fila
  const r = fila.getBoundingClientRect();
  const [x, y] = e.clientX || e.clientY ? [e.clientX, e.clientY] : [r.left + 16, r.bottom];
  if (abrirContextual(fila, x, y)) e.preventDefault();
});
// Táctil: iOS no lanza contextmenu. Medio segundo quieto abre el menú
let presion;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const fila = filaDe(e);
  if (!fila) return;
  const { clientX: x, clientY: y } = e;
  presion = setTimeout(() => {
    if (menuContextual.matches(':popover-open') || !abrirContextual(fila, x, y)) return;
    // El toque que abrió el menú no cuenta como clic. Si no llega clic, se suelta al levantar el dedo
    const tragar = (c) => { c.preventDefault(); c.stopPropagation(); };
    document.addEventListener('click', tragar, { capture: true, once: true });
    document.addEventListener('pointerup', () => setTimeout(() => document.removeEventListener('click', tragar, { capture: true })), { once: true });
  }, 500);
});
['pointerup', 'pointercancel', 'pointermove'].forEach((tipo) => document.addEventListener(tipo, (e) => {
  if (tipo !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 4) clearTimeout(presion);
}));

// Stepper: − y + junto al número. Mantener presionado repite. Sin JS: el campo solo
document.querySelectorAll('.stepper > input[type="number"]').forEach((campo) => {
  const botones = document.createElement('span');
  botones.className = 'stepper-botones';
  const crear = (signo, etiqueta, paso) => {
    const b = document.createElement('button');
    b.type = 'button';
    // Fuera del Tab: las flechas del campo hacen lo mismo
    b.tabIndex = -1;
    b.setAttribute('aria-label', etiqueta);
    b.innerHTML = `<svg class="icono" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/>${signo === '+' ? '<path d="M12 5v14"/>' : ''}</svg>`;
    let repetir;
    const dar = () => {
      paso > 0 ? campo.stepUp() : campo.stepDown();
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
      revisar();
    };
    b.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      dar();
      repetir = setTimeout(function seguir() { dar(); repetir = setTimeout(seguir, 80); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, () => clearTimeout(repetir)));
    // Teclado o lector que lo active sin puntero
    b.addEventListener('click', (e) => { if (e.detail === 0) dar(); });
    return b;
  };
  const menos = crear('-', 'Restar', -1);
  const mas = crear('+', 'Sumar', 1);
  // En el mínimo o el máximo el botón se apaga
  const revisar = () => {
    const v = campo.valueAsNumber;
    menos.disabled = campo.min !== '' && v <= Number(campo.min);
    mas.disabled = campo.max !== '' && v >= Number(campo.max);
  };
  campo.addEventListener('input', revisar);
  botones.append(menos, mas);
  campo.after(botones);
  revisar();
});

// Validación al salir del campo, como Apple: avisa antes de enviar con el mensaje del navegador
// Solo después de tocarlo (:user-invalid). Los errores del servidor no se tocan
const validarCampo = (control, alEscribir) => {
  if (!(control instanceof HTMLElement) || !control.matches('.campo .control') || !control.willValidate || !control.id) return;
  const campo = control.closest('.campo');
  let error = campo.querySelector('.campo-error[data-en-vivo]');
  let tocado = true;
  try { tocado = control.matches(':user-invalid'); } catch { /* sin :user-invalid: siempre */ }
  const describe = (control.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== `${control.id}-vivo`);
  if (control.validity.valid) {
    if (error) {
      error.remove();
      control.removeAttribute('aria-invalid');
      describe.length ? control.setAttribute('aria-describedby', describe.join(' ')) : control.removeAttribute('aria-describedby');
    }
    return;
  }
  if (alEscribir || !tocado || campo.querySelector('.campo-error:not([data-en-vivo])')) return;
  if (!error) {
    error = Object.assign(document.createElement('p'), { className: 'campo-error', id: `${control.id}-vivo` });
    error.dataset.enVivo = '';
    campo.append(error);
  }
  error.textContent = control.validationMessage;
  control.setAttribute('aria-invalid', 'true');
  control.setAttribute('aria-describedby', [...describe, error.id].join(' '));
};
document.addEventListener('focusout', (e) => validarCampo(e.target, false));
// Al escribir solo se quita: no regaña mientras corrige
document.addEventListener('input', (e) => validarCampo(e.target, true));

// Selección en tablas: casilla por fila, "todas" en el thead (mixta si son algunas), barra con la cuenta
const revisarSeleccion = (tabla) => {
  const casillas = [...tabla.querySelectorAll('tbody [data-seleccionar]')];
  const marcadas = casillas.filter((c) => c.checked).length;
  const todas = tabla.querySelector('[data-seleccionar-todo]');
  if (todas) {
    todas.checked = marcadas > 0 && marcadas === casillas.length;
    todas.indeterminate = marcadas > 0 && marcadas < casillas.length;
  }
  const barra = document.querySelector(`.barra-seleccion[data-barra-de="${tabla.id}"]`);
  if (!barra) return;
  barra.hidden = marcadas === 0;
  const cuenta = barra.querySelector('.barra-seleccion-cuenta');
  if (cuenta) cuenta.textContent = marcadas === 1 ? '1 seleccionado' : `${marcadas} seleccionados`;
};
document.addEventListener('change', (e) => {
  if (!(e.target instanceof Element)) return;
  const tabla = e.target.closest('table[data-seleccion]');
  if (!tabla) return;
  if (e.target.matches('[data-seleccionar-todo]')) tabla.querySelectorAll('tbody [data-seleccionar]').forEach((c) => { c.checked = e.target.checked; });
  revisarSeleccion(tabla);
});
// Quitar la selección: botón [data-deseleccionar] de la barra
document.addEventListener('click', (e) => {
  const boton = e.target instanceof Element ? e.target.closest('.barra-seleccion [data-deseleccionar]') : null;
  if (!boton) return;
  const tabla = document.getElementById(boton.closest('.barra-seleccion').dataset.barraDe);
  tabla?.querySelectorAll('[data-seleccionar], [data-seleccionar-todo]').forEach((c) => { c.checked = false; });
  if (tabla) revisarSeleccion(tabla);
});
// Atrás devuelve casillas marcadas: la barra las cuenta
document.querySelectorAll('table[data-seleccion]').forEach(revisarSeleccion);

// Deslizador: tramo recorrido en color y su <output for>
const pintarRango = (r) => {
  const pct = ((r.valueAsNumber - (Number(r.min) || 0)) / ((Number(r.max) || 100) - (Number(r.min) || 0))) * 100;
  r.style.setProperty('--pct', `${pct}%`);
  const salida = document.querySelector(`output[for~="${r.id}"]`);
  if (salida) salida.textContent = r.value;
};
document.querySelectorAll('.deslizador').forEach(pintarRango);
document.addEventListener('input', (e) => { if (e.target instanceof Element && e.target.matches('.deslizador')) pintarRango(e.target); });

// Zona de archivos: marca al arrastrar encima y lista los nombres elegidos
document.querySelectorAll('.zona-archivos').forEach((zona) => {
  const entrada = zona.querySelector('input[type="file"]');
  const lista = zona.querySelector('.zona-archivos-lista');
  ['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, () => { zona.dataset.encima = ''; }));
  ['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, () => { delete zona.dataset.encima; }));
  entrada?.addEventListener('change', () => {
    lista?.replaceChildren(...[...entrada.files].map((archivo) => {
      const li = document.createElement('li');
      li.className = 'chip';
      li.textContent = archivo.name;
      return li;
    }));
  });
});

// Banner con data-banner="id": ✕ lo esconde y no vuelve
document.querySelectorAll('.banner[data-banner]').forEach((banner) => {
  const clave = `banner-${banner.dataset.banner}`;
  if (leerAjuste(clave)) { banner.remove(); return; }
  banner.querySelector('[data-cerrar-banner]')?.addEventListener('click', () => {
    try { localStorage.setItem(clave, 'cerrado'); } catch { /* sin localStorage: solo por ahora */ }
    banner.remove();
  });
});
function leerAjuste(clave) { try { return localStorage.getItem(clave); } catch { return null; } }

// Copiar: el texto del <pre> o de data-copiar="texto". El botón confirma y vuelve
document.addEventListener('click', async (e) => {
  const boton = e.target instanceof Element ? e.target.closest('[data-copiar]') : null;
  if (!boton) return;
  const texto = boton.dataset.copiar || boton.closest('.codigo-bloque')?.querySelector('pre')?.textContent || '';
  try {
    await navigator.clipboard.writeText(texto);
    // Con ícono: pasa a ✓ y lo dice al lector. Con texto: dice "Copiado"
    if (boton.querySelector('.icono')) {
      const etiqueta = boton.getAttribute('aria-label');
      boton.dataset.copiado = '';
      boton.setAttribute('aria-label', 'Copiado');
      setTimeout(() => { delete boton.dataset.copiado; boton.setAttribute('aria-label', etiqueta); }, 1500);
    } else {
      const antes = boton.textContent;
      boton.textContent = 'Copiado';
      setTimeout(() => { boton.textContent = antes; }, 1500);
    }
  } catch { /* sin permiso de portapapeles: el texto sigue ahí para copiarlo a mano */ }
});

// time[data-relativo]: "hace 5 minutos", "ayer". La fecha exacta en title. Más de una semana o sin JS: la del servidor
const relativa = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const ponerRelativas = () => {
  document.querySelectorAll('time[data-relativo]').forEach((t) => {
    const fecha = new Date(t.dateTime);
    if (Number.isNaN(fecha.getTime())) return;
    t.dataset.original ??= t.textContent;
    t.title ||= fecha.toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' });
    const s = (fecha - Date.now()) / 1000;
    const a = Math.abs(s);
    if (a > 7 * 86400) { t.textContent = t.dataset.original; return; }
    const [valor, unidad] = a < 60 ? [0, 'second'] : a < 3600 ? [s / 60, 'minute'] : a < 86400 ? [s / 3600, 'hour'] : [s / 86400, 'day'];
    t.textContent = relativa.format(Math.round(valor), unidad);
  });
};
ponerRelativas();
setInterval(ponerRelativas, 60000);

// Tema y atajos en localStorage, iguales en todas las pestañas. tema.js los aplica antes de pintar
const botonTema = document.getElementById('tema');
const leer = (clave) => { try { return localStorage.getItem(clave); } catch { return null; } };
const guardar = (clave, valor) => {
  try { valor === null ? localStorage.removeItem(clave) : localStorage.setItem(clave, valor); } catch { /* sin localStorage */ }
};
// Por defecto no se guarda. AJUSTES en tema.js. Menú lateral en su cookie
const valorAjuste = (nombre) => (nombre === 'sidebar' ? raiz.dataset.sidebar : leer(nombre) || AJUSTES[nombre]);
const aplicarAjustes = () => {
  aplicarPreferencias();
  // Radio: marcado si es lo guardado. Switch value="si": marcado con 'si'
  document.querySelectorAll('input[data-ajuste]').forEach((r) => {
    r.checked = r.value === valorAjuste(r.name);
  });
  // checked desde JS no lanza change
  document.querySelectorAll('.segmentado').forEach(deslizar);
  document.querySelectorAll('[data-inspector-alternar]').forEach((b) => b.setAttribute('aria-pressed', String(raiz.dataset.inspector !== 'oculto')));
};
// Inspector: muestra u oculta el aside de .vista-detalle. Se guarda como los ajustes
document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element) || !e.target.closest('[data-inspector-alternar]')) return;
  guardar('inspector', raiz.dataset.inspector === 'oculto' ? null : 'oculto');
  aplicarAjustes();
});
botonTema?.addEventListener('click', () => {
  guardar('tema', raiz.dataset.tema === 'dark' ? 'light' : 'dark');
  aplicarAjustes();
});
// Cada opción se guarda al marcarla
document.addEventListener('change', (e) => {
  if (!e.target.matches('input[data-ajuste]')) return;
  const { name, type, checked } = e.target;
  const value = type === 'checkbox' ? (checked ? 'si' : 'no') : e.target.value;
  if (name !== 'sidebar') guardar(name, value === AJUSTES[name] ? null : value);
  aplicarAjustes();
  const estado = document.getElementById('ajuste-estado');
  if (estado) estado.textContent = 'Guardado.';
});
window.addEventListener('storage', aplicarAjustes);
// Tema "Sistema": sigue al SO sin recargar
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarAjustes);
aplicarAjustes();

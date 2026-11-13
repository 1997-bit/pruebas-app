// Gráficos desde una tabla. La tabla es el dato y su versión accesible: sin JS se ve la tabla. Módulo ES: diferido
//
// <figure class="grafico" data-tipo="columnas">
//   <figcaption><strong>Título</strong> Nota opcional</figcaption>
//   <table> primera columna: categorías en <th>; cada columna siguiente: una serie, nombre en el <thead>
// </figure>
//
// data-tipo: columnas · barras (horizontal) · linea · parte (de un todo) · calor (mapa de calor) · dispersion · rangos
// Estadística, calculada aquí desde los datos crudos. Una serie en color (--grafico-acento), el contexto en gris:
//   linea  data-movil="20"            media móvil con banda de ±2σ (data-sigmas) y atípicos con |z| > 3 (data-umbral)
//   linea  data-suavizado="kalman"    observaciones como puntos, estimación de Kalman y su banda (data-kalman-q, data-kalman-r)
//   dispersion data-ajuste="lineal"   recta de mínimos cuadrados con R². data-ajuste-pasos="4": cómo aprende con más datos
//   dispersion data-componentes        componentes principales: flechas desde el centro, cuánto explica cada una
//   dispersion data-cuadrantes="0,0"   acierto de dirección: sombrea donde x e y tienen el mismo signo y cuenta aciertos
//   rangos: tramos desde–hasta por fila (ventanas, cronogramas). Dos filas de thead: la serie con colspan="2", luego Desde y Hasta
// Opciones en el <figure>:
//   data-apilado          columnas y barras apiladas
//   data-area             línea con área suave
//   data-curva="suave"    linea: curva por los puntos en vez de rectas. Monótona: no se pasa de largo y una meseta sigue plana
//   data-destacar="Ana"   esa serie en color, las demás en gris
//   data-referencia="80" data-referencia-texto="Meta"   línea de meta o umbral
//   data-unidad=" %"      sufijo de los valores
//   data-formato="moneda" data-moneda="USD" · "porcentaje" (0,25 → 25 %) · por defecto número
//   data-divergente       calor: negativo y positivo con dos colores y gris en el cero
//   data-alto="16rem"     alto del área del gráfico
//   data-sin-datos        sin "Ver datos" en pantalla: la tabla queda solo para el lector de pantalla
// <th data-color="3"> fija el color de una serie: el color sigue a la serie, no a su posición. data-color="texto": neutra, del color del texto
// <tr data-marca="peligro"> en linea: raya vertical en ese punto, para un evento (una falla, un despliegue). peligro · exito · aviso
// <td data-valor="1234.5"> el número exacto; sin él se lee el texto (1.234,5 · 25 % · $ 3.000)
// Cambiar la tabla redibuja. <figure aria-busy="true"> atenúa el gráfico mientras llegan datos nuevos

const idioma = document.documentElement.lang || 'es';
const COLORES = 8;

// ---------- Datos ----------

// 1.234,5 · 1,234.5 · 25 % · $ 3.000 · — (sin dato)
export function numero(celda) {
  if (!celda) return null;
  if (celda.dataset.valor !== undefined) return celda.dataset.valor === '' ? null : Number(celda.dataset.valor);
  let t = celda.textContent.replace(/[\s ]/g, '').replace(/[^\d.,\-−]/g, '').replace('−', '-');
  if (!/\d/.test(t)) return null;
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (t.includes(',')) t = /^-?\d{1,3}(,\d{3})+$/.test(t) && idioma.startsWith('en') ? t.replace(/,/g, '') : t.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t) && !idioma.startsWith('en')) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function leer(tabla) {
  const cabecera = tabla.tHead?.rows[0];
  const series = cabecera ? [...cabecera.cells].slice(1).map((th, i) => ({
    nombre: th.textContent.trim(),
    color: th.dataset.color === 'texto' ? 'texto' : Math.min(Number(th.dataset.color) || i + 1, COLORES),
    i,
  })) : [];
  const filas = [...tabla.tBodies].flatMap((cuerpo) => [...cuerpo.rows]).map((tr) => ({
    etiqueta: tr.cells[0]?.textContent.trim() ?? '',
    valores: [...tr.cells].slice(1).map(numero),
    serie: tr.dataset.serie,
    marca: tr.dataset.marca,
  }));
  return { series, filas };
}

// ---------- Escalas y formato ----------

function pasoBonito(rango) {
  const crudo = rango / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const f = crudo / potencia;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * potencia;
}
// Marcas redondas: 0, 250, 500… El dominio las incluye
function escala(min, max, conCero = true) {
  if (conCero) { min = Math.min(0, min); max = Math.max(0, max); }
  if (min === max) max = min + 1;
  const paso = pasoBonito(max - min);
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil(max / paso) * paso;
  const marcas = [];
  for (let v = lo; v <= hi + paso / 2; v += paso) marcas.push(Number(v.toPrecision(12)));
  const pos = (v) => ((v - lo) / (hi - lo)) * 100;
  return { lo, hi, marcas, pos };
}

function escalaExacta(lo, hi, partes = 4) {
  if (lo === hi) hi = lo + 1;
  const marcas = Array.from({ length: partes + 1 }, (_, k) => lo + ((hi - lo) * k) / partes);
  return { lo, hi, marcas, pos: (v) => ((v - lo) / (hi - lo)) * 100 };
}

function formateadores(fig) {
  const unidad = fig.dataset.unidad ?? '';
  const tipo = fig.dataset.formato;
  // Símbolo corto: $ y no US$
  const opciones = tipo === 'moneda' ? { style: 'currency', currency: fig.dataset.moneda || 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }
    : tipo === 'porcentaje' ? { style: 'percent', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 2 };
  // Separador de miles siempre: 9.310 junto a 12.840, no 9310
  opciones.useGrouping = 'always';
  const completo = new Intl.NumberFormat(idioma, opciones);
  const corto = new Intl.NumberFormat(idioma, { ...opciones, notation: 'compact', maximumFractionDigits: 1 });
  return {
    valor: (n) => (n === null ? '—' : completo.format(n) + unidad),
    marca: (n) => corto.format(n) + unidad,
  };
}

// ---------- Estadística ----------

const promedio = (a) => a.reduce((t, v) => t + v, 0) / a.length;
const desvio = (a, m = promedio(a)) => Math.sqrt(a.reduce((t, v) => t + (v - m) ** 2, 0) / Math.max(1, a.length - 1));

// Ventana móvil hacia atrás: media y desvío de los últimos w valores. z del punto contra la ventana anterior
function movil(valores, w) {
  return valores.map((v, i) => {
    const ventana = valores.slice(Math.max(0, i - w + 1), i + 1).filter((x) => x !== null);
    const previa = valores.slice(Math.max(0, i - w), i).filter((x) => x !== null);
    if (ventana.length < Math.min(w, 3)) return null;
    const m = promedio(ventana);
    const mp = previa.length >= 3 ? promedio(previa) : m;
    const sp = previa.length >= 3 ? desvio(previa, mp) : desvio(ventana, m);
    // z solo con media ventana o más: al inicio todo parecería atípico
    return { m, s: desvio(ventana, m), z: v === null || !sp || previa.length < Math.max(3, w / 2) ? null : (v - mp) / sp };
  });
}

// Filtro de Kalman de nivel local: x = x anterior + ruido q; observación = x + ruido r
// Sin q y r: r desde la varianza de las diferencias, q chico para suavizar
function kalman(valores, q, r) {
  const datos = valores.filter((v) => v !== null);
  const difs = datos.slice(1).map((v, i) => v - datos[i]);
  r ??= Math.max(1e-9, (desvio(difs) ** 2) / 2);
  q ??= r * 0.05;
  let x = datos[0];
  let p = r;
  return valores.map((z) => {
    p += q;
    if (z !== null) {
      const k = p / (p + r);
      x += k * (z - x);
      p *= 1 - k;
    }
    return { x, s: Math.sqrt(p) };
  });
}

// Mínimos cuadrados: y = a + b·x, con R²
function mco(xs, ys) {
  const mx = promedio(xs);
  const my = promedio(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  const b = sxx ? sxy / sxx : 0;
  return { a: my - b * mx, b, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0 };
}

// Componentes principales en 2D: la covarianza tiene solución cerrada
function pca(xs, ys) {
  const mx = promedio(xs);
  const my = promedio(ys);
  const n = Math.max(1, xs.length - 1);
  let a = 0;
  let b = 0;
  let c = 0;
  xs.forEach((x, i) => { a += (x - mx) ** 2; b += (x - mx) * (ys[i] - my); c += (ys[i] - my) ** 2; });
  [a, b, c] = [a / n, b / n, c / n];
  const traza = a + c;
  const raiz = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = traza / 2 + raiz;
  const l2 = traza / 2 - raiz;
  const vector = (l) => {
    const [vx, vy] = b !== 0 ? [l - c, b] : a >= c ? (l === l1 ? [1, 0] : [0, 1]) : (l === l1 ? [0, 1] : [1, 0]);
    const largo = Math.hypot(vx, vy) || 1;
    return { dx: vx / largo, dy: vy / largo, l: Math.max(0, l) };
  };
  return { mx, my, componentes: [vector(l1), vector(l2)], total: traza || 1 };
}

// ---------- DOM ----------

const crear = (etiqueta, clase, texto) => {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  // Nombres y etiquetas vienen de datos: solo textContent
  if (texto !== undefined) el.textContent = texto;
  return el;
};
// Destacar: la elegida en acento, las demás en gris
const colorDe = (serie, fig) => {
  const destacada = fig.dataset.destacar;
  if (serie.color === 'texto') return 'var(--texto)';
  if (!destacada) return `var(--serie-${serie.color})`;
  return serie.nombre === destacada ? 'var(--grafico-acento)' : 'var(--serie-otro)';
};

// Globo: el valor fuerte, el nombre después. Raya del color de la serie, no caja
function llenarGlobo(globo, titulo, filas) {
  globo.replaceChildren(crear('p', 'grafico-globo-titulo', titulo));
  for (const f of filas) {
    const fila = crear('p', 'grafico-globo-fila');
    if (f.color) {
      const clave = crear('span', `grafico-clave grafico-clave-${f.forma || 'linea'}`);
      clave.style.setProperty('--c', f.color);
      fila.append(clave);
    }
    fila.append(crear('strong', '', f.valor));
    if (f.nombre) fila.append(crear('span', '', f.nombre));
    globo.append(fila);
  }
  globo.hidden = false;
}
// Dentro del área, sin salirse por los lados
function ubicarGlobo(globo, area, x, y) {
  const ancho = area.clientWidth;
  const g = globo.getBoundingClientRect();
  // A la derecha del punto; si no cabe, a la izquierda
  const izquierda = x + 12 + g.width > ancho ? x - g.width - 12 : x + 12;
  globo.style.left = `${Math.max(0, izquierda)}px`;
  globo.style.top = `${Math.max(0, y - g.height - 8)}px`;
}

// Rejilla horizontal con sus números a la izquierda
function rejillaY(area, esc, f) {
  const capa = crear('div', 'grafico-rejilla');
  for (const v of esc.marcas) {
    const linea = crear('div', v === 0 ? 'grafico-linea-rejilla grafico-base' : 'grafico-linea-rejilla');
    linea.style.bottom = `${esc.pos(v)}%`;
    linea.append(crear('span', 'grafico-marca-y', f.marca(v)));
    capa.append(linea);
  }
  area.append(capa);
  // Ancho del canal de números: el texto más largo
  return Math.max(...esc.marcas.map((v) => f.marca(v).length));
}
// Rejilla vertical para barras horizontales y dispersión
function rejillaX(area, esc, f, eje) {
  const capa = crear('div', 'grafico-rejilla');
  for (const v of esc.marcas) {
    const linea = crear('div', v === 0 && eje ? 'grafico-linea-rejilla-v grafico-base' : 'grafico-linea-rejilla-v');
    linea.style.left = `${esc.pos(v)}%`;
    linea.append(crear('span', 'grafico-marca-x', f.marca(v)));
    capa.append(linea);
  }
  area.append(capa);
}

function referencia(area, fig, esc, f, horizontal) {
  const valor = Number(fig.dataset.referencia);
  if (fig.dataset.referencia === undefined || !Number.isFinite(valor)) return;
  const linea = crear('div', horizontal ? 'grafico-referencia grafico-referencia-v' : 'grafico-referencia');
  linea.style[horizontal ? 'left' : 'bottom'] = `${esc.pos(valor)}%`;
  linea.append(crear('span', '', `${fig.dataset.referenciaTexto || ''} ${f.valor(valor)}`.trim()));
  area.append(linea);
}

// Etiquetas del eje X. Muchas: una de cada tantas, sin encimarse
function etiquetasX(lienzo, filas, banda, ancho) {
  const eje = crear('div', banda ? 'grafico-x' : 'grafico-x grafico-x-puntos');
  eje.style.setProperty('--n', filas.length);
  const caben = Math.max(2, Math.floor(ancho / 64));
  const salto = Math.ceil(filas.length / caben);
  filas.forEach((fila, i) => {
    const e = crear('span', '', fila.etiqueta);
    if (!banda) e.style.left = `${filas.length > 1 ? (i / (filas.length - 1)) * 100 : 50}%`;
    if (i % salto && i !== filas.length - 1) e.style.visibility = 'hidden';
    if (!banda && i === filas.length - 1 && i % salto) e.style.visibility = '';
    eje.append(e);
  });
  lienzo.append(eje);
}

// ---------- Tipos ----------

function columnas(ctx) {
  const { fig, datos, visibles, f, area, lienzo } = ctx;
  const apilado = fig.hasAttribute('data-apilado');
  const totales = datos.filas.map((fila) => visibles.reduce(([pos, neg], s) => {
    const v = fila.valores[s.i] ?? 0;
    return v >= 0 ? [pos + v, neg] : [pos, neg + v];
  }, [0, 0]));
  const todos = apilado ? totales.flat() : datos.filas.flatMap((fila) => visibles.map((s) => fila.valores[s.i] ?? 0));
  const esc = escala(Math.min(...todos), Math.max(...todos));
  ctx.canal = rejillaY(area, esc, f);
  const marcas = crear('div', 'grafico-marcas');
  const base = esc.pos(0);
  datos.filas.forEach((fila, i) => {
    const grupo = crear('div', 'grafico-grupo');
    grupo.dataset.i = i;
    const ranuras = apilado ? [visibles] : visibles.map((s) => [s]);
    grupo.style.setProperty('--k', ranuras.length);
    for (const series of ranuras) {
      const ranura = crear('div', 'grafico-ranura');
      let arriba = 0;
      let abajo = 0;
      series.forEach((s) => {
        const v = fila.valores[s.i];
        if (v === null || v === 0) return;
        const alto = (Math.abs(v) / (esc.hi - esc.lo)) * 100;
        const barra = crear('span', v < 0 ? 'grafico-barra grafico-negativa' : 'grafico-barra');
        const desde = v >= 0 ? base + arriba : base - abajo - alto;
        if (v >= 0) arriba += alto; else abajo += alto;
        barra.style.bottom = `${desde}%`;
        barra.style.height = `${alto}%`;
        barra.style.setProperty('--c', colorDe(s, fig));
        ranura.append(barra);
      });
      // Solo el extremo de la pila se redondea
      const extremos = [...ranura.children];
      extremos.filter((b) => !b.classList.contains('grafico-negativa')).at(-1)?.classList.add('grafico-punta');
      extremos.filter((b) => b.classList.contains('grafico-negativa')).at(-1)?.classList.add('grafico-punta');
      grupo.append(ranura);
    }
    marcas.append(grupo);
  });
  area.append(marcas);
  referencia(area, fig, esc, f, false);
  // Una serie: el valor más alto rotulado. Las demás, en el globo y la tabla
  if (visibles.length === 1 && !apilado) {
    const s = visibles[0];
    const valores = datos.filas.map((fila) => fila.valores[s.i] ?? -Infinity);
    const iMax = valores.indexOf(Math.max(...valores));
    const barra = marcas.children[iMax]?.querySelector('.grafico-barra');
    // En las orillas se alinea hacia adentro: no se sale de la tarjeta
    const lado = iMax >= datos.filas.length - 2 ? ' grafico-rotulo-der' : iMax <= 1 ? ' grafico-rotulo-izq' : '';
    if (barra) barra.append(crear('span', `grafico-rotulo${lado}`, f.valor(valores[iMax])));
  }
  etiquetasX(lienzo, datos.filas, true, area.clientWidth || fig.clientWidth);
  ctx.cantidad = datos.filas.length;
  ctx.mostrar = (i) => {
    marcas.querySelectorAll('.grafico-grupo').forEach((g) => g.classList.toggle('grafico-activo', Number(g.dataset.i) === i));
    const fila = datos.filas[i];
    const filas = visibles.map((s) => ({ color: colorDe(s, fig), forma: 'caja', valor: f.valor(fila.valores[s.i]), nombre: visibles.length > 1 ? s.nombre : '' }));
    if (apilado && visibles.length > 1) filas.push({ valor: f.valor(totales[i][0] + totales[i][1]), nombre: 'Total' });
    const g = marcas.children[i].getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return { titulo: fila.etiqueta, filas: visibles.length > 1 ? filas.reverse() : filas, x: g.left - a.left + g.width / 2, y: 24 };
  };
  ctx.indiceEn = (x) => indiceBanda(x, area, datos.filas.length);
}

function barras(ctx) {
  const { fig, datos, visibles, f, area } = ctx;
  const apilado = fig.hasAttribute('data-apilado');
  const totales = datos.filas.map((fila) => visibles.reduce((t, s) => t + Math.max(0, fila.valores[s.i] ?? 0), 0));
  const todos = apilado ? totales : datos.filas.flatMap((fila) => visibles.map((s) => fila.valores[s.i] ?? 0));
  const esc = escala(Math.min(...todos), Math.max(...todos));
  area.classList.add('grafico-plano-h');
  rejillaX(area, esc, f, true);
  const marcas = crear('div', 'grafico-marcas-h');
  const base = esc.pos(0);
  datos.filas.forEach((fila, i) => {
    const grupo = crear('div', 'grafico-grupo-h');
    grupo.dataset.i = i;
    grupo.append(crear('span', 'grafico-categoria', fila.etiqueta));
    const pista = crear('div', 'grafico-pista');
    const ranuras = apilado ? [visibles] : visibles.map((s) => [s]);
    for (const series of ranuras) {
      const ranura = crear('div', 'grafico-ranura-h');
      let avance = 0;
      let fin = base;
      series.forEach((s) => {
        const v = fila.valores[s.i];
        if (v === null || v === 0) return;
        const largo = (Math.abs(v) / (esc.hi - esc.lo)) * 100;
        const barra = crear('span', v < 0 ? 'grafico-barra-h grafico-negativa' : 'grafico-barra-h');
        const desde = v >= 0 ? base + avance : base - largo;
        if (v >= 0) avance += largo;
        barra.style.left = `${desde}%`;
        barra.style.width = `${largo}%`;
        barra.style.setProperty('--c', colorDe(s, fig));
        ranura.append(barra);
        fin = Math.max(fin, desde + largo);
      });
      [...ranura.children].at(-1)?.classList.add('grafico-punta');
      // Valor en la punta, afuera de la barra: dentro no siempre cabe
      if (!apilado || series === ranuras.at(-1)) {
        const total = apilado ? totales[i] : fila.valores[series[0].i];
        const rotulo = crear('span', 'grafico-rotulo-h', f.valor(total));
        rotulo.style.left = `${fin}%`;
        ranura.append(rotulo);
      }
      pista.append(ranura);
    }
    grupo.append(pista);
    marcas.append(grupo);
  });
  area.append(marcas);
  referencia(area, fig, esc, f, true);
  ctx.cantidad = datos.filas.length;
  ctx.vertical = true;
  ctx.mostrar = (i) => {
    marcas.querySelectorAll('.grafico-grupo-h').forEach((g) => g.classList.toggle('grafico-activo', Number(g.dataset.i) === i));
    const fila = datos.filas[i];
    const g = marcas.children[i].getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return {
      titulo: fila.etiqueta,
      filas: visibles.map((s) => ({ color: colorDe(s, fig), forma: 'caja', valor: f.valor(fila.valores[s.i]), nombre: visibles.length > 1 ? s.nombre : '' })),
      x: a.width / 2,
      y: g.top - a.top,
    };
  };
  ctx.indiceEn = (x, y) => {
    const hijos = [...marcas.children];
    const a = area.getBoundingClientRect();
    const i = hijos.findIndex((h) => { const r = h.getBoundingClientRect(); return y + a.top <= r.bottom; });
    return i === -1 ? hijos.length - 1 : i;
  };
}

const indiceBanda = (x, area, n) => Math.max(0, Math.min(n - 1, Math.floor((x / area.clientWidth) * n)));

// Curva monótona (Fritsch–Carlson, como curveMonotoneX de d3): pasa por cada punto, no inventa picos ni valles
// Tangente en cada punto: 0 si la serie da la vuelta; si no, la menor de las pendientes vecinas, para no pasarse
function curvaMonotona(p) {
  if (p.length < 3) return `M${p.map((q) => q.join(',')).join('L')}`;
  const s = p.slice(1).map((q, i) => (q[1] - p[i][1]) / (q[0] - p[i][0]));
  const h = p.slice(1).map((q, i) => q[0] - p[i][0]);
  const m = p.map((_, i) => {
    if (i === 0) return s[0];
    if (i === p.length - 1) return s.at(-1);
    const [s0, s1, h0, h1] = [s[i - 1], s[i], h[i - 1], h[i]];
    const media = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(media));
  });
  return p.reduce((d, q, i) => {
    if (i === 0) return `M${q[0]},${q[1]}`;
    const a = p[i - 1];
    const t = (q[0] - a[0]) / 3;
    return `${d}C${a[0] + t},${a[1] + t * m[i - 1]} ${q[0] - t},${q[1] - t * m[i]} ${q[0]},${q[1]}`;
  }, '');
}

function linea(ctx) {
  if (ctx.fig.dataset.movil || ctx.fig.dataset.suavizado === 'kalman') return lineaEstadistica(ctx);
  const { fig, datos, visibles, f, area, lienzo } = ctx;
  const n = datos.filas.length;
  const valores = datos.filas.flatMap((fila) => visibles.map((s) => fila.valores[s.i])).filter((v) => v !== null);
  const esc = escala(Math.min(...valores), Math.max(...valores), fig.hasAttribute('data-area') || Math.min(...valores) >= 0);
  ctx.canal = rejillaY(area, esc, f);
  const x = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'grafico-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  // La destacada al final: queda encima
  const orden = [...visibles].sort((a, b) => (a.nombre === fig.dataset.destacar) - (b.nombre === fig.dataset.destacar));
  for (const s of orden) {
    // Sin dato: la línea se corta
    const tramos = [[]];
    datos.filas.forEach((fila, i) => {
      const v = fila.valores[s.i];
      if (v === null) { if (tramos.at(-1).length) tramos.push([]); return; }
      tramos.at(-1).push([x(i), 100 - esc.pos(v)]);
    });
    for (const tramo of tramos.filter((t) => t.length)) {
      // Rectas o curva: el mismo camino para el trazo y el borde del área
      const camino = fig.dataset.curva === 'suave' ? curvaMonotona(tramo) : `M${tramo.map((p) => p.join(',')).join('L')}`;
      if (fig.hasAttribute('data-area')) {
        const area0 = 100 - esc.pos(Math.max(esc.lo, 0));
        const relleno = document.createElementNS(NS, 'path');
        relleno.setAttribute('d', `${camino}L${tramo.at(-1)[0]},${area0}L${tramo[0][0]},${area0}Z`);
        relleno.setAttribute('class', 'grafico-relleno');
        relleno.style.setProperty('--c', colorDe(s, fig));
        svg.append(relleno);
      }
      const pl = document.createElementNS(NS, 'path');
      pl.setAttribute('d', camino);
      pl.setAttribute('class', 'grafico-trazo');
      pl.style.setProperty('--c', colorDe(s, fig));
      svg.append(pl);
    }
  }
  area.append(svg);
  referencia(area, fig, esc, f, false);
  // Eventos: una raya por fila con data-marca, detrás de los puntos
  datos.filas.forEach((fila, i) => {
    if (!fila.marca) return;
    const marca = crear('div', `grafico-marca grafico-marca-${fila.marca}`);
    marca.style.left = `${x(i)}%`;
    area.append(marca);
  });
  // Punto final y su valor. Varias series: rótulos solo si no se enciman
  const puntas = crear('div', 'grafico-puntos');
  const finales = visibles.map((s) => {
    let i = n - 1;
    while (i >= 0 && datos.filas[i].valores[s.i] === null) i -= 1;
    return { s, i, v: i >= 0 ? datos.filas[i].valores[s.i] : null };
  }).filter((p) => p.v !== null);
  const alturas = finales.map((p) => esc.pos(p.v)).sort((a, b) => a - b);
  const separadas = alturas.every((h, k) => !k || (h - alturas[k - 1]) * (area.clientHeight || 160) / 100 > 16);
  for (const p of finales) {
    const punto = crear('span', 'grafico-punto');
    punto.style.left = `${x(p.i)}%`;
    punto.style.bottom = `${esc.pos(p.v)}%`;
    punto.style.setProperty('--c', colorDe(p.s, fig));
    if (finales.length <= 4 && separadas) punto.append(crear('span', 'grafico-rotulo-fin', f.valor(p.v)));
    puntas.append(punto);
  }
  area.append(puntas);
  // Cruz: línea vertical y un punto por serie en la X más cercana
  const cruz = crear('div', 'grafico-cruz');
  cruz.hidden = true;
  area.append(cruz);
  etiquetasX(lienzo, datos.filas, false, area.clientWidth || fig.clientWidth);
  ctx.cantidad = n;
  ctx.mostrar = (i) => {
    cruz.hidden = false;
    cruz.style.left = `${x(i)}%`;
    cruz.replaceChildren(...visibles.filter((s) => datos.filas[i].valores[s.i] !== null).map((s) => {
      const p = crear('span', 'grafico-punto');
      p.style.bottom = `${esc.pos(datos.filas[i].valores[s.i])}%`;
      p.style.setProperty('--c', colorDe(s, fig));
      return p;
    }));
    const filas = visibles.map((s) => ({ color: colorDe(s, fig), valor: f.valor(datos.filas[i].valores[s.i]), nombre: visibles.length > 1 ? s.nombre : '', v: datos.filas[i].valores[s.i] ?? -Infinity }))
      .sort((a, b) => b.v - a.v);
    return { titulo: datos.filas[i].etiqueta, filas, x: (x(i) / 100) * area.clientWidth, y: 24 };
  };
  ctx.ocultar = () => { cruz.hidden = true; };
  ctx.indiceEn = (px) => Math.max(0, Math.min(n - 1, Math.round((px / area.clientWidth) * (n - 1))));
}

// Una serie cruda en gris y lo calculado en color: media móvil con banda y atípicos, o Kalman con banda
function lineaEstadistica(ctx) {
  const { fig, datos, visibles, f, area, lienzo } = ctx;
  const n = datos.filas.length;
  const s = visibles[0];
  const crudos = datos.filas.map((fila) => fila.valores[s.i]);
  const esKalman = fig.dataset.suavizado === 'kalman';
  const k = Number(fig.dataset.sigmas) || 2;
  const umbral = Number(fig.dataset.umbral) || 3;
  const calculo = esKalman
    ? kalman(crudos, fig.dataset.kalmanQ ? Number(fig.dataset.kalmanQ) : undefined, fig.dataset.kalmanR ? Number(fig.dataset.kalmanR) : undefined).map((e) => ({ m: e.x, s: e.s }))
    : movil(crudos, Number(fig.dataset.movil) || 20);
  const atipico = (i) => !esKalman && calculo[i]?.z !== null && calculo[i] && Math.abs(calculo[i].z) > umbral;
  const todos = [...crudos, ...calculo.flatMap((c) => (c ? [c.m - k * c.s, c.m + k * c.s] : []))].filter((v) => v !== null && Number.isFinite(v));
  const esc = escala(Math.min(...todos), Math.max(...todos), false);
  ctx.canal = rejillaY(area, esc, f);
  const x = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v) => 100 - esc.pos(v);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'grafico-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const trazo = (puntos, clase) => {
    const pl = document.createElementNS(NS, 'polyline');
    pl.setAttribute('points', puntos.map((p) => p.join(',')).join(' '));
    pl.setAttribute('class', clase);
    svg.append(pl);
    return pl;
  };
  // Banda: arriba de ida, abajo de vuelta. Bordes punteados: marcan un límite
  const conCalculo = calculo.map((c, i) => [c, i]).filter(([c]) => c);
  const arriba = conCalculo.map(([c, i]) => [x(i), y(c.m + k * c.s)]);
  const abajo = conCalculo.map(([c, i]) => [x(i), y(c.m - k * c.s)]);
  const banda = document.createElementNS(NS, 'polygon');
  banda.setAttribute('points', [...arriba, ...abajo.reverse()].map((p) => p.join(',')).join(' '));
  banda.setAttribute('class', 'grafico-banda');
  svg.append(banda);
  trazo(arriba, 'grafico-banda-borde');
  trazo(abajo.reverse(), 'grafico-banda-borde');
  // Crudo: línea fina gris; con Kalman, puntos sueltos
  if (!esKalman) trazo(crudos.map((v, i) => [i, v]).filter(([, v]) => v !== null).map(([i, v]) => [x(i), y(v)]), 'grafico-trazo grafico-trazo-contexto');
  trazo(conCalculo.map(([c, i]) => [x(i), y(c.m)]), 'grafico-trazo grafico-trazo-acento');
  area.append(svg);
  const capa = crear('div', 'grafico-puntos');
  crudos.forEach((v, i) => {
    if (v === null || (!esKalman && !atipico(i))) return;
    const p = crear('span', atipico(i) ? 'grafico-punto grafico-punto-acento' : 'grafico-punto grafico-punto-contexto');
    p.style.left = `${x(i)}%`;
    p.style.bottom = `${esc.pos(v)}%`;
    capa.append(p);
  });
  area.append(capa);
  referencia(area, fig, esc, f, false);
  const cruz = crear('div', 'grafico-cruz');
  cruz.hidden = true;
  area.append(cruz);
  etiquetasX(lienzo, datos.filas, false, area.clientWidth || fig.clientWidth);
  // Qué se ve: la leyenda dice crudo, calculado y banda
  const nombre = esKalman ? 'Estimación' : `Media móvil (${Number(fig.dataset.movil) || 20})`;
  const leyenda = crear('ul', 'grafico-leyenda grafico-leyenda-fija');
  [[s.nombre, esKalman ? 'punto' : 'linea', 'var(--grafico-contexto)'], [nombre, 'linea', 'var(--grafico-acento)'], [`Banda ±${k}σ`, 'caja grafico-clave-banda', 'var(--grafico-acento)']]
    .concat(esKalman ? [] : [[`Atípico, |z| > ${umbral}`, 'punto', 'var(--grafico-acento)']])
    .forEach(([texto, forma, color]) => {
      const li = crear('li');
      const clave = crear('span', `grafico-clave grafico-clave-${forma}`);
      clave.style.setProperty('--c', color);
      li.append(clave, crear('span', '', texto));
      leyenda.append(li);
    });
  ctx.encabezado = leyenda;
  ctx.sinLeyenda = true;
  const atipicos = crudos.filter((_, i) => atipico(i)).length;
  if (!esKalman) ctx.extra = crear('p', 'grafico-resumen', atipicos === 1 ? '1 valor atípico' : `${atipicos} valores atípicos`);
  ctx.cantidad = n;
  ctx.mostrar = (i) => {
    const c = calculo[i];
    cruz.hidden = false;
    cruz.style.left = `${x(i)}%`;
    cruz.replaceChildren(...(c ? [Object.assign(crear('span', 'grafico-punto grafico-punto-acento'), { style: `bottom:${esc.pos(c.m)}%` })] : []));
    const filas = [{ color: 'var(--grafico-contexto)', valor: f.valor(crudos[i]), nombre: s.nombre }];
    if (c) {
      filas.push({ color: 'var(--grafico-acento)', valor: f.valor(c.m), nombre });
      filas.push({ valor: `${f.valor(c.m - k * c.s)} – ${f.valor(c.m + k * c.s)}`, nombre: `±${k}σ` });
      if (c.z !== null && c.z !== undefined) filas.push({ valor: new Intl.NumberFormat(idioma, { maximumFractionDigits: 1, signDisplay: 'always' }).format(c.z), nombre: atipico(i) ? 'z · atípico' : 'z' });
    }
    return { titulo: datos.filas[i].etiqueta, filas, x: (x(i) / 100) * area.clientWidth, y: 24 };
  };
  ctx.ocultar = () => { cruz.hidden = true; };
  ctx.indiceEn = (px) => Math.max(0, Math.min(n - 1, Math.round((px / area.clientWidth) * (n - 1))));
}

// Rangos: tramos desde–hasta por fila. Ventanas de entrenamiento y prueba, cronogramas
// thead: fila 1 la serie con colspan="2"; fila 2 Desde y Hasta. Números o fechas (AAAA-MM-DD)
function rangos(ctx) {
  const { fig, f, area, lienzo } = ctx;
  const tabla = fig.querySelector('table');
  const cabeza = tabla.tHead.rows[0];
  const series = [...cabeza.cells].slice(1).map((th, i) => ({ nombre: th.textContent.trim(), color: Math.min(Number(th.dataset.color) || i + 1, COLORES), i }));
  const esFecha = (t) => /^\d{4}-\d{2}-\d{2}/.test(t);
  const leerValor = (td) => {
    const t = td?.dataset.valor ?? td?.querySelector('time')?.dateTime ?? td?.textContent.trim() ?? '';
    // Fecha sola: hora local. Date.parse("2025-01-06") la toma en UTC y corre un día
    return esFecha(t) ? Date.parse(t.length === 10 ? `${t}T00:00` : t) : numero(td);
  };
  const fechas = [...tabla.tBodies[0].rows].some((tr) => esFecha(tr.cells[1]?.dataset.valor ?? tr.cells[1]?.querySelector('time')?.dateTime ?? tr.cells[1]?.textContent.trim() ?? ''));
  const filas = [...tabla.tBodies].flatMap((b) => [...b.rows]).map((tr) => ({
    etiqueta: tr.cells[0]?.textContent.trim() ?? '',
    tramos: series.map((s) => [leerValor(tr.cells[1 + s.i * 2]), leerValor(tr.cells[2 + s.i * 2])]),
  }));
  const todos = filas.flatMap((fila) => fila.tramos.flat()).filter((v) => v !== null && Number.isFinite(v));
  // Fechas: del primer al último dato, cuatro marcas parejas. Números: marcas redondas
  const esc = fechas ? escalaExacta(Math.min(...todos), Math.max(...todos)) : escala(Math.min(...todos), Math.max(...todos), false);
  const corta = new Intl.DateTimeFormat(idioma, { day: 'numeric', month: 'short' });
  const larga = new Intl.DateTimeFormat(idioma, { dateStyle: 'medium' });
  const fe = fechas ? { marca: (v) => corta.format(v), valor: (v) => larga.format(v) } : f;
  area.classList.add('grafico-plano-h');
  rejillaX(area, esc, fe, false);
  const marcas = crear('div', 'grafico-marcas-h');
  filas.forEach((fila, i) => {
    const grupo = crear('div', 'grafico-grupo-h');
    grupo.dataset.i = i;
    grupo.append(crear('span', 'grafico-categoria', fila.etiqueta));
    const pista = crear('div', 'grafico-ranura-h grafico-ranura-rango');
    fila.tramos.forEach(([desde, hasta], k) => {
      if (desde === null || hasta === null) return;
      const barra = crear('span', 'grafico-tramo');
      barra.style.left = `${esc.pos(desde)}%`;
      barra.style.width = `${Math.max(0.5, esc.pos(hasta) - esc.pos(desde))}%`;
      barra.style.setProperty('--c', colorDe(series[k], fig));
      pista.append(barra);
    });
    grupo.append(pista);
    marcas.append(grupo);
  });
  area.append(marcas);
  ctx.series = series;
  ctx.cantidad = filas.length;
  ctx.vertical = true;
  ctx.mostrar = (i) => {
    marcas.querySelectorAll('.grafico-grupo-h').forEach((g) => g.classList.toggle('grafico-activo', Number(g.dataset.i) === i));
    const g = marcas.children[i].getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return {
      titulo: filas[i].etiqueta,
      filas: series.map((s, k) => ({ color: colorDe(s, fig), forma: 'caja', valor: filas[i].tramos[k].includes(null) ? '—' : `${fe.valor(filas[i].tramos[k][0])} – ${fe.valor(filas[i].tramos[k][1])}`, nombre: s.nombre })),
      x: a.width / 2,
      y: g.top - a.top,
    };
  };
  ctx.indiceEn = (x, y) => {
    const hijos = [...marcas.children];
    const a = area.getBoundingClientRect();
    const i = hijos.findIndex((h) => y + a.top <= h.getBoundingClientRect().bottom);
    return i === -1 ? hijos.length - 1 : i;
  };
  lienzo.classList.add('grafico-lienzo-rangos');
}

// Parte de un todo: una barra dividida. Cada fila es una parte. Más de 8: el resto en "Otros"
function parte(ctx) {
  const { fig, datos, f, area } = ctx;
  let partes = datos.filas.map((fila, i) => ({ nombre: fila.etiqueta, v: Math.max(0, fila.valores[0] ?? 0), color: `var(--serie-${Number(fig.querySelector(`tbody tr:nth-child(${i + 1})`)?.dataset.color) || i + 1})` }));
  if (partes.length > COLORES) {
    const resto = partes.slice(COLORES - 1).reduce((t, p) => t + p.v, 0);
    partes = [...partes.slice(0, COLORES - 1), { nombre: 'Otros', v: resto, color: 'var(--serie-otro)' }];
  }
  const total = partes.reduce((t, p) => t + p.v, 0) || 1;
  area.classList.add('grafico-plano-parte');
  const barra = crear('div', 'grafico-partes');
  partes.forEach((p, i) => {
    if (!p.v) return;
    const seg = crear('span', 'grafico-segmento');
    seg.style.flexGrow = p.v;
    seg.style.setProperty('--c', p.color);
    seg.dataset.i = i;
    barra.append(seg);
  });
  area.append(barra);
  // Leyenda con valor y porcentaje: aquí es el rótulo
  const lista = crear('ul', 'grafico-partes-lista');
  const pct = new Intl.NumberFormat(idioma, { style: 'percent', maximumFractionDigits: 1 });
  for (const p of partes) {
    const li = crear('li');
    const clave = crear('span', 'grafico-clave grafico-clave-caja');
    clave.style.setProperty('--c', p.color);
    li.append(clave, crear('span', 'grafico-partes-nombre', p.nombre), crear('strong', '', f.valor(p.v)), crear('span', 'grafico-partes-pct', pct.format(p.v / total)));
    lista.append(li);
  }
  ctx.extra = lista;
  ctx.sinLeyenda = true;
  ctx.cantidad = partes.length;
  ctx.mostrar = (i) => {
    barra.querySelectorAll('.grafico-segmento').forEach((s) => s.classList.toggle('grafico-activo', Number(s.dataset.i) === i));
    const seg = barra.querySelector(`[data-i="${i}"]`);
    const r = seg?.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return { titulo: partes[i].nombre, filas: [{ color: partes[i].color, forma: 'caja', valor: f.valor(partes[i].v), nombre: pct.format(partes[i].v / total) }], x: r ? r.left - a.left + r.width / 2 : 0, y: 0 };
  };
  ctx.indiceEn = (x) => {
    const segs = [...barra.children];
    const a = area.getBoundingClientRect();
    const s = segs.find((el) => x + a.left <= el.getBoundingClientRect().right) ?? segs.at(-1);
    return Number(s?.dataset.i ?? 0);
  };
}

// Mapa de calor: filas × columnas. Un tono de claro a oscuro; con data-divergente, dos tonos y gris en el cero
function calor(ctx) {
  const { fig, datos, f, area } = ctx;
  const valores = datos.filas.flatMap((fila) => fila.valores).filter((v) => v !== null);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const divergente = fig.hasAttribute('data-divergente');
  const limite = Math.max(Math.abs(min), Math.abs(max)) || 1;
  const t = (v) => (divergente ? v / limite : (v - Math.min(0, min)) / ((max - Math.min(0, min)) || 1));
  area.classList.add('grafico-plano-calor');
  const cols = datos.series.length;
  const rejilla = crear('div', 'grafico-calor');
  rejilla.style.setProperty('--columnas', cols);
  rejilla.append(crear('span'));
  datos.series.forEach((s) => rejilla.append(crear('span', 'grafico-calor-col', s.nombre)));
  const conValor = cols <= 12;
  datos.filas.forEach((fila, r) => {
    rejilla.append(crear('span', 'grafico-categoria', fila.etiqueta));
    fila.valores.forEach((v, c) => {
      const celda = crear('span', 'grafico-celda');
      celda.dataset.i = r * cols + c;
      if (v === null) celda.classList.add('grafico-celda-vacia');
      else {
        const k = t(v);
        celda.style.setProperty('--t', `${Math.round(Math.abs(k) * 100)}%`);
        celda.style.setProperty('--c', divergente && k < 0 ? 'var(--serie-8)' : 'var(--serie-1)');
        if (divergente) celda.classList.add('grafico-celda-divergente');
        // Texto claro u oscuro según el fondo
        if (Math.abs(k) > 0.55) celda.classList.add('grafico-celda-oscura');
        if (conValor) celda.textContent = f.marca(v);
      }
      rejilla.append(celda);
    });
  });
  area.append(rejilla);
  // Escala: qué significa cada tono
  const leyenda = crear('div', divergente ? 'grafico-escala grafico-escala-divergente' : 'grafico-escala');
  leyenda.append(crear('span', '', f.marca(divergente ? -limite : Math.min(0, min))), crear('span', 'grafico-escala-barra'), crear('span', '', f.marca(divergente ? limite : max)));
  ctx.extra = leyenda;
  ctx.sinLeyenda = true;
  ctx.cantidad = datos.filas.length * cols;
  ctx.columnas = cols;
  ctx.mostrar = (i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    rejilla.querySelectorAll('.grafico-celda').forEach((el) => el.classList.toggle('grafico-activo', Number(el.dataset.i) === i));
    const celda = rejilla.querySelector(`.grafico-celda[data-i="${i}"]`).getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return { titulo: `${datos.filas[r].etiqueta} · ${datos.series[c].nombre}`, filas: [{ valor: f.valor(datos.filas[r].valores[c]) }], x: celda.left - a.left + celda.width / 2, y: celda.top - a.top };
  };
  ctx.indiceEn = null;
}

// Dispersión: <th> etiqueta, x, y. tr[data-serie] agrupa. Hasta 3 series; más, en gris
function dispersion(ctx) {
  const { fig, datos, f, area, lienzo } = ctx;
  const nombres = [...new Set(datos.filas.map((fila) => fila.serie).filter(Boolean))];
  const colorSerie = (nombre) => {
    const k = nombres.indexOf(nombre);
    return k === -1 ? 'var(--serie-1)' : k < 3 ? `var(--serie-${k + 1})` : 'var(--serie-otro)';
  };
  if (nombres.length > 3) console.warn('graficos.js: dispersión con más de 3 series; desde la 4.ª van en gris');
  const xs = datos.filas.map((fila) => fila.valores[0]).filter((v) => v !== null);
  const ys = datos.filas.map((fila) => fila.valores[1]).filter((v) => v !== null);
  const ex = escala(Math.min(...xs), Math.max(...xs), false);
  const ey = escala(Math.min(...ys), Math.max(...ys), false);
  ctx.canal = rejillaY(area, ey, f);
  rejillaX(area, ex, f, false);
  const capa = crear('div', 'grafico-puntos');
  datos.filas.forEach((fila, i) => {
    const [vx, vy] = fila.valores;
    if (vx === null || vy === null) return;
    const p = crear('span', 'grafico-punto grafico-punto-suelto');
    p.style.left = `${ex.pos(vx)}%`;
    p.style.bottom = `${ey.pos(vy)}%`;
    p.style.setProperty('--c', colorSerie(fila.serie));
    p.dataset.i = i;
    capa.append(p);
  });
  area.append(capa);
  const ejes = crear('p', 'grafico-ejes', `${datos.series[0]?.nombre ?? 'x'} →  ·  ↑ ${datos.series[1]?.nombre ?? 'y'}`);
  lienzo.append(ejes);
  capasDispersion(ctx, ex, ey, capa);
  ctx.series = nombres.map((nombre, k) => ({ nombre, color: k < 3 ? k + 1 : null, i: k, gris: k >= 3 }));
  ctx.cantidad = datos.filas.length;
  ctx.mostrar = (i) => {
    capa.querySelectorAll('.grafico-punto').forEach((el) => el.classList.toggle('grafico-activo', Number(el.dataset.i) === i));
    const fila = datos.filas[i];
    const el = capa.querySelector(`[data-i="${i}"]`);
    const r = el?.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return {
      titulo: fila.serie ? `${fila.etiqueta} · ${fila.serie}` : fila.etiqueta,
      filas: [{ valor: f.valor(fila.valores[0]), nombre: datos.series[0]?.nombre }, { valor: f.valor(fila.valores[1]), nombre: datos.series[1]?.nombre }]
        .concat(ctx.etiquetaPunto ? [{ valor: ctx.etiquetaPunto(i) }] : []),
      x: r ? r.left - a.left + r.width / 2 : 0,
      y: r ? r.top - a.top : 0,
    };
  };
  // El más cercano al puntero, no hace falta acertarle
  ctx.indiceEn = (x, y) => {
    let mejor = 0;
    let distancia = Infinity;
    const a = area.getBoundingClientRect();
    capa.querySelectorAll('.grafico-punto').forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left - a.left + r.width / 2 - x, r.top - a.top + r.height / 2 - y);
      if (d < distancia) { distancia = d; mejor = Number(el.dataset.i); }
    });
    return distancia < 40 ? mejor : -1;
  };
}

// Sobre la dispersión: recta que aprende, componentes principales, cuadrantes de acierto
// SVG en pixeles: las flechas no se deforman. Se redibuja si cambia el ancho
function capasDispersion(ctx, ex, ey, capa) {
  const { fig, datos, f, area } = ctx;
  const { ajuste, componentes, cuadrantes } = fig.dataset;
  if (ajuste === undefined && componentes === undefined && cuadrantes === undefined) return;
  const puntos = datos.filas.map((fila, i) => [fila.valores[0], fila.valores[1], i]).filter(([x, y]) => x !== null && y !== null);
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const W = area.clientWidth || 300;
  const H = area.clientHeight || 192;
  const px = (v) => (ex.pos(v) / 100) * W;
  const py = (v) => H - (ey.pos(v) / 100) * H;
  const NS = 'http://www.w3.org/2000/svg';
  // Fondo bajo los puntos (cuadrantes, ejes); frente sobre ellos (rectas, flechas)
  const lamina = () => {
    const l = document.createElementNS(NS, 'svg');
    l.setAttribute('class', 'grafico-svg grafico-svg-px');
    l.setAttribute('viewBox', `0 0 ${W} ${H}`);
    l.setAttribute('aria-hidden', 'true');
    return l;
  };
  const fondo = lamina();
  let svg = lamina();
  const frente = svg;
  const linea = (x1, y1, x2, y2, clase, en = svg) => {
    const l = document.createElementNS(NS, 'line');
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
    l.setAttribute('class', clase);
    en.append(l);
    return l;
  };
  const resumen = [];
  // Puntos en gris: lo calculado es lo que importa. Los aciertos, en color
  if (!datos.filas.some((fila) => fila.serie)) capa.querySelectorAll('.grafico-punto').forEach((p) => p.style.setProperty('--c', 'var(--grafico-contexto)'));

  if (cuadrantes !== undefined) {
    svg = fondo;
    const [cx, cy] = (cuadrantes || '0,0').split(',').map(Number);
    const x0 = px(Math.min(Math.max(cx, ex.lo), ex.hi));
    const y0 = py(Math.min(Math.max(cy, ey.lo), ey.hi));
    [[x0, 0, W - x0, y0], [0, y0, x0, H - y0]].forEach(([x, y, w, h]) => {
      const rect = document.createElementNS(NS, 'rect');
      Object.entries({ x, y, width: Math.max(0, w), height: Math.max(0, h) }).forEach(([k, v]) => rect.setAttribute(k, v));
      rect.setAttribute('class', 'grafico-cuadrante');
      svg.append(rect);
    });
    linea(x0, 0, x0, H, 'grafico-eje-cero');
    linea(0, y0, W, y0, 'grafico-eje-cero');
    let aciertos = 0;
    puntos.forEach(([x, y, i]) => {
      if (Math.sign(x - cx) === Math.sign(y - cy) && x !== cx) {
        aciertos += 1;
        capa.querySelector(`[data-i="${i}"]`)?.style.setProperty('--c', 'var(--grafico-acento)');
      }
    });
    svg = frente;
    resumen.push(`Acierto de dirección: ${new Intl.NumberFormat(idioma, { style: 'percent', maximumFractionDigits: 0 }).format(aciertos / (puntos.length || 1))} (${aciertos} de ${puntos.length})`);
    ctx.etiquetaPunto = (i) => {
      const [x, y] = datos.filas[i].valores;
      return Math.sign(x - cx) === Math.sign(y - cy) && x !== cx ? 'Acierta la dirección' : 'Falla la dirección';
    };
  }

  if (ajuste !== undefined && puntos.length > 1) {
    // Cómo aprende: rectas con el primer cuarto, la mitad… en gris, cada vez más firme. La final en color
    const pasos = Math.max(1, Number(fig.dataset.ajustePasos) || 1);
    for (let k = 1; k < pasos; k += 1) {
      const parte = puntos.slice(0, Math.max(2, Math.round((puntos.length * k) / pasos)));
      const m = mco(parte.map((p) => p[0]), parte.map((p) => p[1]));
      linea(px(ex.lo), py(m.a + m.b * ex.lo), px(ex.hi), py(m.a + m.b * ex.hi), 'grafico-ajuste-previo').style.opacity = 0.3 + (0.5 * k) / pasos;
    }
    const m = mco(xs, ys);
    linea(px(ex.lo), py(m.a + m.b * ex.lo), px(ex.hi), py(m.a + m.b * ex.hi), 'grafico-ajuste');
    const n2 = new Intl.NumberFormat(idioma, { maximumFractionDigits: 2 });
    resumen.push(`y = ${n2.format(m.b)}·x ${m.a < 0 ? '−' : '+'} ${n2.format(Math.abs(m.a))}  ·  R² = ${n2.format(m.r2)}`);
  }

  if (componentes !== undefined && puntos.length > 2) {
    // Flechas desde el centro: largo = 2 desvíos en esa dirección
    const c = pca(xs, ys);
    const marcador = (id, clase) => {
      const m = document.createElementNS(NS, 'marker');
      Object.entries({ id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' }).forEach(([k, v]) => m.setAttribute(k, v));
      const punta = document.createElementNS(NS, 'path');
      punta.setAttribute('d', 'M1 1 9 5 1 9');
      punta.setAttribute('class', clase);
      m.append(punta);
      return m;
    };
    const uid = Math.random().toString(36).slice(2, 8);
    const defs = document.createElementNS(NS, 'defs');
    defs.append(marcador(`pc1-${uid}`, 'grafico-flecha-punta grafico-flecha-acento'), marcador(`pc2-${uid}`, 'grafico-flecha-punta'));
    svg.append(defs);
    c.componentes.forEach((v, k) => {
      const largo = 2 * Math.sqrt(v.l);
      const l = linea(px(c.mx), py(c.my), px(c.mx + v.dx * largo), py(c.my + v.dy * largo), k === 0 ? 'grafico-flecha grafico-flecha-acento' : 'grafico-flecha');
      l.setAttribute('marker-end', `url(#pc${k + 1}-${uid})`);
    });
    const pct = new Intl.NumberFormat(idioma, { style: 'percent', maximumFractionDigits: 0 });
    resumen.push(`Componente 1 explica ${pct.format(c.componentes[0].l / c.total)} · componente 2, ${pct.format(c.componentes[1].l / c.total)}`);
  }

  area.insertBefore(fondo, capa);
  area.append(frente);
  if (resumen.length) {
    const p = crear('p', 'grafico-resumen');
    resumen.forEach((t, k) => { if (k) p.append(crear('br')); p.append(t); });
    ctx.extra = p;
  }
}

const TIPOS = { columnas, barras, linea, parte, calor, dispersion, rangos };
const FORMA_LEYENDA = { columnas: 'caja', barras: 'caja', linea: 'linea', dispersion: 'punto', rangos: 'caja' };

// ---------- Componente ----------

const ocultas = new WeakMap();

function dibujar(fig) {
  const tabla = fig.querySelector('table');
  const tipo = fig.dataset.tipo;
  if (!tabla || !TIPOS[tipo]) return;
  const datos = leer(tabla);
  const f = formateadores(fig);
  const fuera = ocultas.get(fig) ?? new Set();
  ocultas.set(fig, fuera);

  // La tabla pasa a "Ver datos". Queda en el DOM: lector, impresión y copia
  let datosVista = fig.querySelector(':scope > .grafico-datos');
  if (!datosVista) {
    datosVista = crear('details', 'grafico-datos');
    datosVista.append(crear('summary', '', 'Ver datos'));
    const contenedor = crear('div', 'tabla-contenedor');
    tabla.classList.add('tabla');
    tabla.replaceWith(datosVista);
    contenedor.append(tabla);
    datosVista.append(contenedor);
  }
  // Columnas de números a la derecha, con dígitos tabulares (.tabla .num): se comparan de un vistazo
  const filasTabla = [...tabla.tBodies].flatMap((b) => [...b.rows]);
  const ultimaCabecera = tabla.tHead?.rows[tabla.tHead.rows.length - 1];
  for (let c = 1; filasTabla.length && c < filasTabla[0].cells.length; c += 1) {
    const celdas = filasTabla.map((tr) => tr.cells[c]).filter(Boolean);
    const numerica = celdas.every((td) => !td.textContent.trim() || td.querySelector('time') || numero(td) !== null);
    celdas.forEach((td) => td.classList.toggle('num', numerica));
    const th = ultimaCabecera?.cells[tabla.tHead.rows.length > 1 ? c - 1 : c];
    th?.classList.toggle('num', numerica);
  }
  fig.querySelector(':scope > .grafico-lienzo')?.remove();
  fig.querySelector(':scope > .grafico-leyenda')?.remove();
  fig.querySelector(':scope > .grafico-extra')?.remove();

  const lienzo = crear('div', 'grafico-lienzo');
  const area = crear('div', 'grafico-plano');
  area.tabIndex = 0;
  area.setAttribute('role', 'img');
  const titulo = fig.querySelector('figcaption')?.textContent.trim().replace(/\s+/g, ' ');
  area.setAttribute('aria-label', `${titulo || 'Gráfico'}. Los valores están en ${fig.hasAttribute('data-sin-datos') ? 'la tabla' : 'Ver datos'}.`);
  if (fig.dataset.alto) area.style.height = fig.dataset.alto;
  lienzo.append(area);
  fig.insertBefore(lienzo, datosVista);

  // Rangos lee fechas a su modo: basta con que haya filas
  const hayDatos = tipo === 'rangos' ? datos.filas.length > 0 : datos.filas.some((fila) => fila.valores.some((v) => v !== null));
  if (!hayDatos) {
    area.removeAttribute('tabindex');
    area.classList.add('grafico-vacio');
    area.textContent = fig.dataset.vacio || 'Sin datos para este periodo.';
    return;
  }

  const visibles = datos.series.filter((s) => !fuera.has(s.nombre));
  const ctx = { fig, datos, visibles: visibles.length ? visibles : datos.series, f, area, lienzo };
  TIPOS[tipo](ctx);
  if (ctx.canal) lienzo.style.setProperty('--canal', `${ctx.canal + 1}ch`);
  if (ctx.extra) {
    const extra = crear('div', 'grafico-extra');
    extra.append(ctx.extra);
    fig.insertBefore(extra, datosVista);
  }
  // Leyenda fija: dice qué es cada capa calculada
  if (ctx.encabezado) {
    ctx.encabezado.classList.add('grafico-leyenda');
    fig.insertBefore(ctx.encabezado, lienzo);
  }

  // Leyenda: con 2 o más series. Clic aísla o vuelve a mostrar; el color no cambia
  const series = ctx.series ?? datos.series;
  if (!ctx.sinLeyenda && series.length > 1) {
    const leyenda = crear('ul', 'grafico-leyenda');
    for (const s of series) {
      const li = crear('li');
      const boton = crear('button', '');
      boton.type = 'button';
      const clave = crear('span', `grafico-clave grafico-clave-${FORMA_LEYENDA[tipo] || 'caja'}`);
      clave.style.setProperty('--c', s.gris ? 'var(--serie-otro)' : colorDe(s, fig));
      boton.append(clave, crear('span', '', s.nombre));
      if (tipo === 'dispersion' || tipo === 'rangos') { li.append(boton); boton.disabled = true; } else {
        boton.setAttribute('aria-pressed', String(!fuera.has(s.nombre)));
        boton.addEventListener('click', () => {
          if (fuera.has(s.nombre)) fuera.delete(s.nombre);
          // La última visible no se apaga
          else if (datos.series.length - fuera.size > 1) fuera.add(s.nombre);
          dibujar(fig);
          fig.querySelector(`.grafico-leyenda li:nth-child(${s.i + 1}) button`)?.focus();
        });
        li.append(boton);
      }
      leyenda.append(li);
    }
    fig.insertBefore(leyenda, lienzo);
  }

  // Globo con puntero y teclado: flechas recorren, Esc lo esconde
  const globo = crear('div', 'grafico-globo');
  globo.hidden = true;
  globo.setAttribute('aria-hidden', 'true');
  area.append(globo);
  let activo = -1;
  const ver = (i) => {
    if (i < 0 || i >= ctx.cantidad) { esconder(); return; }
    activo = i;
    const info = ctx.mostrar(i);
    llenarGlobo(globo, info.titulo, info.filas);
    ubicarGlobo(globo, area, info.x, info.y);
  };
  const esconder = () => {
    globo.hidden = true;
    ctx.ocultar?.();
    area.querySelectorAll('.grafico-activo').forEach((el) => el.classList.remove('grafico-activo'));
  };
  area.addEventListener('pointermove', (e) => {
    const a = area.getBoundingClientRect();
    const x = e.clientX - a.left;
    const y = e.clientY - a.top;
    if (ctx.indiceEn) ver(ctx.indiceEn(x, y));
    else {
      const celda = e.target.closest?.('[data-i]');
      if (celda) ver(Number(celda.dataset.i)); else esconder();
    }
  });
  area.addEventListener('pointerleave', () => { if (document.activeElement !== area) esconder(); });
  area.addEventListener('focus', () => ver(activo < 0 ? 0 : activo));
  area.addEventListener('blur', esconder);
  area.addEventListener('keydown', (e) => {
    const columnasCalor = ctx.columnas || 0;
    const paso = {
      ArrowRight: ctx.vertical ? 0 : 1,
      ArrowLeft: ctx.vertical ? 0 : -1,
      ArrowDown: ctx.vertical ? 1 : columnasCalor,
      ArrowUp: ctx.vertical ? -1 : -columnasCalor,
    }[e.key];
    if (e.key === 'Escape') { esconder(); return; }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); ver(e.key === 'Home' ? 0 : ctx.cantidad - 1); return; }
    if (!paso) return;
    e.preventDefault();
    ver(Math.max(0, Math.min(ctx.cantidad - 1, (activo < 0 ? 0 : activo) + paso)));
  });
}

// Sparkline: <span class="sparkline" data-valores="3,5,4,8"> Línea gris, el último punto en color
function sparkline(el) {
  // Separados por coma o espacio; decimales con punto
  const valores = el.dataset.valores.split(/[\s,;]+/).map(Number).filter(Number.isFinite);
  if (valores.length < 2) return;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const y = (v) => 100 - ((v - min) / ((max - min) || 1)) * 100;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const pl = document.createElementNS(NS, 'polyline');
  pl.setAttribute('points', valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${y(v)}`).join(' '));
  svg.append(pl);
  const punto = crear('span', 'sparkline-punto');
  punto.style.bottom = `${100 - y(valores.at(-1))}%`;
  el.replaceChildren(svg, punto);
}

// ---------- Arranque ----------

const pendientes = new Set();
let cuadro = 0;
const programar = (fig) => {
  pendientes.add(fig);
  cancelAnimationFrame(cuadro);
  cuadro = requestAnimationFrame(() => {
    pendientes.forEach(dibujar);
    pendientes.clear();
  });
};

export function iniciar(raiz = document) {
  raiz.querySelectorAll('figure.grafico[data-tipo]').forEach((fig) => {
    if (fig.dataset.listo) return;
    fig.dataset.listo = '';
    dibujar(fig);
    // Tabla nueva o cambiada: se redibuja. Así se actualiza con fetch sin llamar a nada
    new MutationObserver(() => programar(fig)).observe(fig.querySelector('.grafico-datos') ?? fig, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-valor', 'data-color'] });
    // Ancho nuevo: etiquetas del eje y rótulos se acomodan
    let ancho = fig.clientWidth;
    new ResizeObserver(() => {
      if (Math.abs(fig.clientWidth - ancho) < 8) return;
      ancho = fig.clientWidth;
      programar(fig);
    }).observe(fig);
  });
  raiz.querySelectorAll('.sparkline[data-valores]').forEach(sparkline);
}

iniciar();
// Para el app: graficos.iniciar(contenedor) tras insertar HTML nuevo
window.graficos = { iniciar, dibujar };

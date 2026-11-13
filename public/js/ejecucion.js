// Pruebas en vivo. PHPUnit corre en segundo plano y escribe cada evento con su hora en public/ejecucion/eventos.txt
// La página lee ese archivo estático cada 100 ms, sin pasar por Laravel, y analiza solo lo nuevo
// Laravel se consulta una vez: al ver el fin, o si el registro deja de avanzar. Sin JS, el form hace POST y espera
const form = document.querySelector('form[data-en-vivo]');
const tarjeta = document.getElementById('ejecucion');
const raiz = getComputedStyle(document.documentElement);
const reducido = () => document.documentElement.dataset.movimiento === 'si' || matchMedia('(prefers-reduced-motion: reduce)').matches;

const INTERVALO = 0.05;   // puntos del gráfico, en segundos
const SIN_AVANCE = 3000;  // ms sin bytes nuevos: se pregunta a Laravel si sigue viva

// Una línea de --log-events-verbose-text: [hh:mm:ss.nnnnnnnnn / …] [n bytes] Evento
const RE_LINEA = /^\[(\d+):(\d+):([\d.]+) \/ [^\]]+\] \[\d+ bytes\] (.+)$/;
const RE_TERMINADA = /^Test (Passed|Failed|Errored) \((.+)::(\w+)/;
const RE_TOTAL = /^Test Suite Started \(.+phpunit\.xml, (\d+) tests?\)/;
const RE_FIN = /^PHPUnit Finished/;
const ENTRE = 70;         // ms mínimos entre una prueba y la siguiente en pantalla

const segundos = (s) => `${s.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const insignia = (tono, texto) => Object.assign(document.createElement('span'), { className: `insignia insignia-${tono}`, textContent: texto });

let total = Number(tarjeta?.dataset.total || 0);
let vistos = [];          // pruebas ya en pantalla
let cola = [];            // llegaron del servidor y esperan su turno
let servidor = { t: 0, en: 0, estado: tarjeta?.dataset.estado, titulo: '' };
// Clases de cada estado de prueba, de App\Enums\EstadoPrueba
const BARRAS = JSON.parse(tarjeta?.dataset.barras || '{}');
let ultimaVista = 0;
// Lectura del registro: hasta dónde se leyó, la línea a medias y cuándo se preparó la prueba en curso
let registro = { leido: 0, resto: '', preparada: null, fin: false };

// ---------- Pintar ----------

const pintarReloj = (ahora) => {
  // Hora de PHPUnit, más lo que pasó desde la última respuesta. No se adelanta más de 300 ms
  const t = servidor.estado !== 'corriendo' && !cola.length ? servidor.t : servidor.t + Math.min((ahora - servidor.en) / 1000, 0.3);
  tarjeta.querySelector('[data-duracion]').textContent = segundos(Math.max(t, vistos.at(-1)?.t ?? 0));
};

const pintarConteos = () => {
  const mal = vistos.filter((e) => !e.paso).length;
  tarjeta.querySelector('[data-aprobadas]').textContent = `${vistos.length - mal} aprobadas`;
  // Las dos insignias están siempre: solo cambian texto y color, así la tarjeta no crece ni baja
  const corriendo = servidor.estado === 'corriendo' || cola.length > 0;
  const fallaron = tarjeta.querySelector('[data-fallaron]');
  fallaron.className = `insignia insignia-${mal ? 'peligro' : corriendo || !vistos.length ? 'secundaria' : 'exito'}`;
  fallaron.textContent = mal ? plural(mal, 'falló', 'fallaron') : 'Sin fallos';
  tarjeta.querySelector('[data-cola]').textContent = corriendo ? `${total - vistos.length} en cola` : `${total} pruebas`;
};

// Pruebas corridas hasta cada momento, con data-marca donde hubo una falla. graficos.js redibuja solo al cambiar la tabla
const pintarGrafico = () => {
  const fin = Math.max(vistos.at(-1)?.t ?? 0, INTERVALO);
  const filas = Array.from({ length: Math.ceil(fin / INTERVALO) + 1 }, (_, i) => {
    const corridas = vistos.filter((e) => e.t <= i * INTERVALO).length;
    const tr = document.createElement('tr');
    // Una falla en este tramo: raya roja en el gráfico
    if (vistos.some((e) => !e.paso && e.t > (i - 1) * INTERVALO && e.t <= i * INTERVALO)) tr.dataset.marca = 'peligro';
    const th = Object.assign(document.createElement('th'), { scope: 'row', textContent: (i * INTERVALO).toFixed(2) });
    const td = Object.assign(document.createElement('td'), { textContent: corridas });
    td.dataset.valor = corridas;
    tr.append(th, td);
    return tr;
  });
  tarjeta.querySelector('figure.grafico tbody').replaceChildren(...filas);
};

const pintarArchivo = (fila) => {
  const segmentos = [...fila.querySelectorAll('[data-prueba]')];
  const hechos = segmentos.filter((s) => !s.classList.contains(BARRAS.pendiente));
  const mal = segmentos.filter((s) => s.classList.contains(BARRAS.fallo)).length;
  const celda = fila.querySelector('[data-resultado]');
  if (mal) celda.replaceChildren(insignia('peligro', plural(mal, 'falló', 'fallaron')));
  else if (hechos.length < segmentos.length) celda.replaceChildren(insignia('secundaria', `${hechos.length} de ${segmentos.length}`));
  else {
    const ms = vistos.filter((e) => e.clase === fila.dataset.archivo).reduce((suma, e) => suma + e.ms, 0);
    celda.replaceChildren(insignia('borde', `${ms} ms`));
  }
};

// Una prueba entra: su segmento cambia de color con el resorte de los tokens
const mostrar = (e) => {
  vistos.push(e);
  const segmento = tarjeta.querySelector(`[data-prueba="${CSS.escape(`${e.clase}::${e.metodo}`)}"]`);
  if (segmento) {
    segmento.className = e.paso ? BARRAS.aprobada : BARRAS.fallo;
    if (!reducido()) {
      segmento.animate([{ opacity: 0.3, transform: 'scaleY(0.5)' }, { opacity: 1, transform: 'none' }], {
        duration: parseFloat(raiz.getPropertyValue('--dur-resorte')) || 550,
        easing: raiz.getPropertyValue('--resorte').trim() || 'ease-out',
      });
    }
    const fila = segmento.closest('[data-archivo]');
    // Lo que está mal, con su nombre debajo de la barra. Solo cambia si cambió el resultado de esa prueba:
    // si vuelve a fallar, su línea se queda; si ahora pasa, se quita
    const fallas = fila.querySelector('[data-fallas]');
    const linea = fallas.querySelector(`[data-metodo="${CSS.escape(e.metodo)}"]`);
    if (!e.paso && !linea) {
      const error = Object.assign(document.createElement('p'), { className: 'campo-error' });
      error.dataset.metodo = e.metodo;
      // Enlace a su fila en la tabla de abajo, donde está el mensaje
      const enlace = Object.assign(document.createElement('a'), { href: `#prueba-${e.clase}-${e.metodo}`, textContent: e.metodo });
      error.append(document.getElementById('icono-fallo').content.cloneNode(true), enlace);
      fallas.append(error);
    } else if (e.paso && linea) linea.remove();
    pintarArchivo(fila);
  }
  pintarConteos();
  pintarGrafico();
};

// ---------- Ejecutar ----------
// Estados: los de App\Enums\EstadoEjecucion. La página solo consulta mientras es 'corriendo'

const reiniciar = () => {
  vistos = [];
  cola = [];
  registro = { leido: 0, resto: '', preparada: null, fin: false };
  servidor = { t: 0, en: performance.now(), estado: 'corriendo', titulo: 'Ejecutando pruebas' };
  tarjeta.setAttribute('aria-busy', 'true');
  tarjeta.dataset.estado = 'corriendo';
  tarjeta.querySelector('.tarjeta-titulo').textContent = servidor.titulo;
  tarjeta.querySelectorAll('[data-prueba]').forEach((s) => { s.className = BARRAS.pendiente; });
  tarjeta.querySelectorAll('[data-archivo]').forEach(pintarArchivo);
  tarjeta.querySelector('.log-detalle')?.remove();
  pintarConteos();
  pintarGrafico();
};

const cuadro = (ahora) => {
  if (cola.length && ahora - ultimaVista >= ENTRE) {
    mostrar(cola.shift());
    ultimaVista = ahora;
  }
  pintarReloj(ahora);
  if (servidor.estado !== 'corriendo' && !cola.length) terminar();
  else requestAnimationFrame(cuadro);
};

// Al terminar no se recarga: llegan la tabla de abajo y el aviso, y se cambian en su lugar
const terminar = async () => {
  tarjeta.removeAttribute('aria-busy');
  tarjeta.dataset.estado = servidor.estado;
  tarjeta.querySelector('.tarjeta-titulo').textContent = servidor.titulo;
  pintarConteos();
  if (servidor.estado === 'desconectada') return;

  const pagina = new DOMParser().parseFromString(await (await fetch(location.pathname + location.search)).text(), 'text/html');
  const cambiar = () => document.querySelector('[data-detalle]').replaceWith(pagina.querySelector('[data-detalle]'));
  if (document.startViewTransition && !reducido()) document.startViewTransition(cambiar);
  else cambiar();

  const aviso = pagina.getElementById('aviso');
  if (aviso) {
    document.getElementById('aviso')?.remove();
    document.body.append(aviso);
    aviso.querySelector('[command="close"]')?.addEventListener('click', () => aviso.close());
    const cerrar = () => (aviso.matches(':hover, :focus-within') ? setTimeout(cerrar, 1000) : aviso.close());
    setTimeout(cerrar, 5000);
  }
};

// Analiza solo el texto nuevo del registro. Una línea a medias espera a la próxima lectura
const leerRegistro = (texto) => {
  const lineas = (registro.resto + texto).split('\n');
  registro.resto = lineas.pop();
  for (const linea of lineas) {
    const m = RE_LINEA.exec(linea);
    if (!m) continue;
    const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    const evento = m[4];
    servidor.t = t;
    servidor.en = performance.now();
    let e;
    if (evento.startsWith('Test Prepared (')) registro.preparada = t;
    else if ((e = RE_TERMINADA.exec(evento))) {
      cola.push({ t, ms: Math.round((t - (registro.preparada ?? t)) * 1000), clase: e[2].split('\\').pop(), metodo: e[3], paso: e[1] === 'Passed' });
    } else if ((e = RE_TOTAL.exec(evento))) total = Math.max(total, Number(e[1]));
    else if (RE_FIN.test(evento)) registro.fin = true;
  }
};

// Lo nuevo del archivo estático. Con Range trae solo los bytes nuevos; sin Range, todo y se corta
const leerNuevo = async () => {
  const respuesta = await fetch(form.dataset.eventos, { cache: 'no-store', headers: { Range: `bytes=${registro.leido}-` } });
  if (respuesta.status === 416) return 0;
  if (!respuesta.ok) throw new Error(respuesta.status);
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  const nuevos = respuesta.status === 206 ? bytes : bytes.subarray(registro.leido);
  registro.leido += nuevos.length;
  leerRegistro(new TextDecoder().decode(nuevos));
  return nuevos.length;
};

// Laravel: estado final, lo guarda y deja el aviso. También responde si una ejecución quieta murió
const preguntarALaravel = async () => {
  const respuesta = await fetch(form.dataset.estado, { headers: { Accept: 'application/json' } });
  if (!respuesta.ok) throw new Error(respuesta.status);
  const estado = await respuesta.json();
  // Lo que el registro no alcanzó a mostrar
  cola.push(...estado.eventos.slice(vistos.length + cola.length));
  total = Math.max(total, estado.total);
  servidor = { t: estado.duracion, en: performance.now(), estado: estado.estado, titulo: estado.titulo };
};

// Lee el registro hasta el fin. Si el servidor no responde 3 veces seguidas, se rinde y lo dice
const REINTENTOS = 3;
const vigilar = async () => {
  const boton = form.querySelector('button');
  boton.setAttribute('aria-disabled', 'true');
  requestAnimationFrame(cuadro);
  let fallos = 0;
  let ultimoAvance = performance.now();
  try {
    while (servidor.estado === 'corriendo') {
      await new Promise((listo) => setTimeout(listo, 100 * (fallos + 1)));
      try {
        if (await leerNuevo()) ultimoAvance = performance.now();
        if (registro.fin || performance.now() - ultimoAvance > SIN_AVANCE) {
          await preguntarALaravel();
          ultimoAvance = performance.now();
        }
        fallos = 0;
      } catch {
        if (++fallos >= REINTENTOS) servidor = { ...servidor, estado: 'desconectada', titulo: 'Se perdió la conexión' };
      }
    }
  } finally {
    boton.removeAttribute('aria-disabled');
  }
};

const correr = async () => {
  if (form.querySelector('button').getAttribute('aria-disabled') === 'true') return;
  tarjeta.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
  reiniciar();

  const inicio = await fetch(form.dataset.iniciar, {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': form.elements._token.value, Accept: 'application/json' },
  }).catch(() => null);
  // 409: ya hay una corriendo (otra pestaña). La página se une a esa en vez de empezar otra
  if (!inicio || (!inicio.ok && inicio.status !== 409)) { form.submit(); return; }
  vigilar();
};

if (form && tarjeta) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    correr();
  });
  // Recargó a mitad de una ejecución: se retoma desde el primer evento
  if (tarjeta.dataset.estado === 'corriendo') {
    history.replaceState(null, '', location.pathname);
    reiniciar();
    vigilar();
  }
}

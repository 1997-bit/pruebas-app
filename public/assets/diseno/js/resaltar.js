// Resaltado de código sin dependencias: HTML, CSS y JS/TS. Módulo ES
// <figure class="codigo-bloque" data-lenguaje="js"> … <pre><code>texto</code></pre></figure>
// Cada línea va en un <span class="linea">; el número sale de un contador CSS y no se copia
// Los textos van con textContent: el código nunca se interpreta como HTML

// Reglas por lenguaje, en orden: la primera que calza en la posición gana
const PALABRAS_JS = 'const|let|var|function|return|if|else|for|of|in|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|interface|type|enum|implements|public|private|readonly|as|this|null|undefined|true|false|void|yield|delete';
const REGLAS = {
  js: [
    ['comentario', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ['texto', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/y],
    ['palabra', new RegExp(`\\b(?:${PALABRAS_JS})\\b`, 'y')],
    ['numero', /\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b/y],
    ['funcion', /[A-Za-z_$][\w$]*(?=\s*\()/y],
    ['tipo', /\b[A-Z][\w$]*\b/y],
    ['palabra', /=>|[=+\-*/%<>!&|?]+/y],
    ['nada', /[A-Za-z_$][\w$]*|\s+|./y],
  ],
  html: [
    ['comentario', /<!--[\s\S]*?-->/y],
    ['palabra', /<\/?[a-zA-Z][\w-]*|\/?>/y],
    ['variable', /[\w:-]+(?==)/y],
    ['texto', /"[^"]*"|'[^']*'/y],
    ['numero', /&[#\w]+;/y],
    ['nada', /[^<"'&\w]+|[\w:-]+|./y],
  ],
  css: [
    ['comentario', /\/\*[\s\S]*?\*\//y],
    ['texto', /"[^"\n]*"|'[^'\n]*'/y],
    ['palabra', /@[\w-]+|!important/y],
    ['variable', /--[\w-]+/y],
    ['funcion', /[\w-]+(?=\()/y],
    ['variable', /(?<=(?:^|[{;])\s*)[a-z-]+(?=\s*:)/my],
    ['numero', /-?(?:\d*\.)?\d+(?:px|rem|em|%|ms|s|deg|vh|vw|dvh|dvw|ch|fr|x)?\b/y],
    ['tipo', /[.#][\w-]+/y],
    ['nada', /[\w-]+|\s+|./y],
  ],
};
const ALIAS = { javascript: 'js', ts: 'js', typescript: 'js', json: 'js', mjs: 'js', xml: 'html', svg: 'html' };

export function fichas(texto, lenguaje) {
  const reglas = REGLAS[ALIAS[lenguaje] ?? lenguaje];
  if (!reglas) return [['nada', texto]];
  const salida = [];
  let i = 0;
  while (i < texto.length) {
    for (const [clase, regla] of reglas) {
      regla.lastIndex = i;
      const m = regla.exec(texto);
      if (!m || !m[0]) continue;
      // Pegar las "nada" seguidas: menos nodos
      if (clase === 'nada' && salida.at(-1)?.[0] === 'nada') salida.at(-1)[1] += m[0];
      else salida.push([clase, m[0]]);
      i += m[0].length;
      break;
    }
  }
  return salida;
}

// Una ficha puede cruzar líneas (comentarios largos): se parte en cada salto
export function resaltar(codigo, lenguaje) {
  const texto = codigo.textContent.replace(/\n$/, '');
  const lineas = [document.createElement('span')];
  for (const [clase, trozo] of fichas(texto, lenguaje)) {
    trozo.split('\n').forEach((parte, k) => {
      if (k) lineas.push(document.createElement('span'));
      if (!parte) return;
      lineas.at(-1).append(clase === 'nada' ? parte : Object.assign(document.createElement('span'), { className: `tk-${clase}`, textContent: parte }));
    });
  }
  // El salto queda dentro de cada línea: copiar a mano trae el texto tal cual
  lineas.forEach((l, k) => { l.className = 'linea'; if (k < lineas.length - 1) l.append('\n'); });
  codigo.replaceChildren(...lineas);
  codigo.dataset.resaltado = '';
}

export function resaltarBloques(raiz = document) {
  raiz.querySelectorAll('.codigo-bloque[data-lenguaje] code:not([data-resaltado])').forEach((codigo) => {
    resaltar(codigo, codigo.closest('.codigo-bloque').dataset.lenguaje);
  });
}
resaltarBloques();

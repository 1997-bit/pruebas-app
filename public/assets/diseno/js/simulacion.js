// Datos de prueba realistas y reproducibles para mockups. Sin dependencias. Misma semilla → mismos datos
// Ingresos, visitas, ventas, latencia → lognormal. Puntuaciones → normal acotada. "El 20 % hace el 80 %" → pareto

// mulberry32: PRNG de 32 bits con semilla. Math.random() no se puede sembrar
export function mulberry32(semilla) {
  return function () {
    semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Normal por Box–Muller. 1 - rng(): nunca log(0)
export function normal(rng, media = 0, desviacion = 1) {
  const u = 1 - rng();
  const v = rng();
  return media + desviacion * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Log-normal: asimétrica, con cola larga. Muchos valores bajos y unos pocos enormes
export const lognormal = (rng, mu = 0, sigma = 1) => Math.exp(normal(rng, mu, sigma));

// Pareto: pocos concentran casi todo
export const pareto = (rng, alfa = 1.16, xm = 1) => xm / Math.pow(1 - rng(), 1 / alfa);

// Normal dentro de un rango, para puntuaciones: 1 a 5, 0 a 100
export const acotada = (rng, media, desviacion, min, max) => Math.min(max, Math.max(min, normal(rng, media, desviacion)));

// Caso bueno, regular o malo según pesos. factor: cuánto mueve el valor
export function conCasos(rng, { bueno = 0.6, regular = 0.3, malo = 0.1 } = {}) {
  const r = rng();
  if (r < bueno) return { caso: 'bueno', factor: 1.0 + rng() * 0.3 };
  if (r < bueno + regular) return { caso: 'regular', factor: 0.85 + rng() * 0.1 };
  return { caso: 'malo', factor: 0.2 + rng() * 0.5 };
}

// Serie con tendencia suave, ruido y casos. El caso afecta a la observación, no al nivel:
// un mes malo es un desplome y el siguiente se recupera, no hunde la serie para siempre
export function serieRealista(rng, n = 12, base = 1000, pesos = { bueno: 0.55, regular: 0.3, malo: 0.15 }) {
  let nivel = base;
  return Array.from({ length: n }, () => {
    nivel *= 1 + normal(rng, 0.01, 0.02);
    return Math.max(0, Math.round(nivel * conCasos(rng, pesos).factor));
  });
}

// Variación de un periodo. En costes o latencia subir es malo: subirEsBueno = false
export function delta(rng, { subirEsBueno = true, desviacion = 6 } = {}) {
  const d = normal(rng, 0, desviacion);
  const sube = d >= 0;
  return {
    porcentaje: d,
    direccion: Math.abs(d) < 0.05 ? 'igual' : sube ? 'sube' : 'baja',
    sentido: sube === subirEsBueno ? 'bueno' : 'malo',
  };
}

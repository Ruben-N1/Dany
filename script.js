/* ==========================================================
   SCRIPT.JS
   Dibuja, sobre un <canvas>, un corazón formado por muchas
   copias de una palabra repartidas en capas concéntricas
   (de afuera hacia el centro), alternando "Te amo" y "perdón".
   Cada palabra aparece con un fade-in suave y con brillo estilo
   neón; ese brillo (glow) sube y baja de forma continua, dando
   una sensación de pulso sin cambiar el tamaño del corazón.

   Basado en la misma idea de referencia: puntos fijos sobre la
   curva del corazón (ecuación paramétrica clásica) + varias
   capas a distinta escala, todas centradas en el mismo punto.

   El archivo está dividido en bloques independientes:
     1. CONFIG           -> todo lo que normalmente querrías tocar
     2. SETUP DEL CANVAS -> tamaño, resolución, resize
     3. GEOMETRÍA DEL CORAZÓN -> la matemática de la forma y los puntos
     4. DIBUJO           -> cómo se pinta cada frame
     5. ANIMACIÓN        -> fade-in inicial + pulso continuo de glow
   Cada bloque se puede modificar sin romper los demás.
   ========================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------
     1. CONFIG
     Ajusta aquí el texto, colores, tamaños y velocidad.
     ------------------------------------------------------ */
  const CONFIG = {
    // Palabras que se alternan capa por capa, de afuera hacia el centro.
    words: {
      outer: 'Te amo',
      inner: 'perdón',
    },

    // Colores en formato "r,g,b" (sin alpha) para poder combinarlos
    // fácilmente con la opacidad de cada punto al dibujar.
    // Antes "perdón" tenía un tono distinto; ahora usa el mismo
    // color que "Te amo" para que todo el corazón se vea uniforme.
    colors: {
      outer: '255,45,120', // rosa intenso -> "Te amo"
      inner: '255,45,120', // mismo tono -> "perdón"
    },

    // Igual que en el proyecto de referencia, pero con dos capas
    // extra hacia afuera (1.3 y 1.15) para que el corazón se vea
    // más lleno/grande en el borde exterior. De ahí hacia adentro
    // sigue igual: una capa "base" (escala 1) y los anillos internos.
    layerScales: [1.3, 1.15, 1, 0.8, 0.6, 0.4, 0.2],

    // Separación angular entre cada copia de la palabra. Las capas
    // "exteriores" (escala >= 1, ver isOuterLayer más abajo) son más
    // densas (paso chico); las internas usan un paso más grande
    // porque su circunferencia es menor.
    outerAngleStep: 0.05,
    innerAngleStep: 0.1,

    fontSizeRatio: 0.026,             // tamaño de fuente relativo al canvas
    fontFamily: "'Fira Code', monospace", // fuente monoespaciada, como en la referencia

    // Brillo/halo detrás de cada palabra (efecto neón). Oscila con
    // el tiempo (ver CONFIG.glowPulse más abajo) para dar la
    // sensación de que el corazón "respira" solo con el brillo,
    // sin cambiar de tamaño.
    glow: {
      min: 6,
      max: 16,
    },

    // Animación de aparición ("fade-in"): cada palabra va apareciendo
    // de forma gradual y con un pequeño retraso aleatorio, para que
    // el corazón se sienta "armado" en vivo en lugar de aparecer de golpe.
    fadeInSpeed: 0.01,       // qué tan rápido sube el alpha una vez que empieza
    maxDelayOuter: 1500,     // retraso máximo (ms) para las capas exteriores
    maxDelayInner: 3000,     // retraso máximo (ms) para las capas internas

    // Pulso del glow: en vez de escalar el corazón (efecto de
    // "latido" que se quitó por pedido explícito), solo el brillo
    // rosa sube y baja con el tiempo. Usa la misma velocidad que
    // tenía antes el efecto de respiración, para conservar el ritmo.
    glowPulse: {
      speed: 0.0007,
    },

    // Qué tan "llena" queda la silueta del corazón dentro del canvas
    // (1 = tocaría justo el borde). Se calcula junto con la capa más
    // grande de "layerScales" para que, sin importar cuántas capas
    // hacia afuera se agreguen, el corazón SIEMPRE quepa completo
    // dentro del canvas sin recortarse.
    marginRatio: 0.9,
  };

  // Respeta la preferencia del usuario de reducir animaciones
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ------------------------------------------------------
     2. SETUP DEL CANVAS
     Ajusta el canvas a su tamaño real en pantalla y a la
     densidad de píxeles del dispositivo, para que el texto
     se vea nítido también en pantallas retina/móviles.
     ------------------------------------------------------ */
  const canvas = document.getElementById('heart-canvas');
  const ctx = canvas.getContext('2d');

  let canvasSize = 0; // lado del canvas en píxeles CSS (es cuadrado)

  function resizeCanvas() {
    // El tamaño visible lo define el CSS (#heart-canvas en style.css);
    // aquí solo leemos ese tamaño y ajustamos la resolución interna.
    const rect = canvas.getBoundingClientRect();
    canvasSize = Math.min(rect.width, rect.height);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;

    // Reseteamos la transformación antes de volver a escalar,
    // para que resize múltiples no acumulen escalas.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  /* ------------------------------------------------------
     3. GEOMETRÍA DEL CORAZÓN
     Usamos la clásica ecuación paramétrica del corazón:
       x(t) = 16 sin³(t)
       y(t) = -(13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t))
     con t entre 0 y 2π. A diferencia de un stroke continuo,
     aquí generamos una LISTA DE PUNTOS fija (uno por cada
     copia de la palabra) y esa lista no se reconstruye en
     cada frame: solo su opacidad (alpha) cambia con el tiempo
     para lograr el efecto de aparición gradual.
     ------------------------------------------------------ */

  // Punto "crudo" de la curva del corazón (sin escalar ni centrar).
  function heartRawPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );
    return { x, y };
  }

  // Construye la lista completa de puntos: recorre cada capa de
  // CONFIG.layerScales (de afuera hacia adentro) y, para cada una,
  // reparte copias de la palabra a lo largo de todo el contorno.
  function buildPoints(size) {
    const points = [];
    const centerX = size / 2;
    const centerY = size / 2;

    // La curva "cruda" del corazón mide como máximo 17 unidades
    // desde el centro (en x y en y). Para que la capa MÁS GRANDE
    // de "layerScales" quepa completa dentro del canvas (sin
    // recortarse), calculamos el factor de escala en función de
    // esa capa máxima y del margen deseado (CONFIG.marginRatio).
    const HEART_RAW_EXTENT = 17;
    const largestLayerScale = Math.max(...CONFIG.layerScales);
    const scaleUnit =
      (size / 2) * CONFIG.marginRatio / (HEART_RAW_EXTENT * largestLayerScale);

    CONFIG.layerScales.forEach((layerScale, layerIndex) => {
      // Antes solo la capa 0 (índice) se consideraba "exterior".
      // Ahora, como agregamos capas más grandes que la base, el
      // criterio es por escala: cualquier capa con escala >= 1 se
      // trata como "exterior" (más densa, aparece más rápido).
      const isOuterLayer = layerScale >= 1;
      const angleStep = isOuterLayer
        ? CONFIG.outerAngleStep
        : CONFIG.innerAngleStep;
      const maxDelay = isOuterLayer
        ? CONFIG.maxDelayOuter
        : CONFIG.maxDelayInner;

      // Alterna palabra y color según el índice de capa:
      // 0 = outer ("Te amo"), 1 = inner ("perdón"), 2 = outer...
      const isOuterWord = layerIndex % 2 === 0;
      const word = isOuterWord ? CONFIG.words.outer : CONFIG.words.inner;
      const rgb = isOuterWord ? CONFIG.colors.outer : CONFIG.colors.inner;

      // Las capas más internas se ven un poco más tenues incluso
      // en su brillo máximo, para dar sensación de profundidad.
      const maxAlpha = Math.max(0.35, 0.95 - layerIndex * 0.14);
      const minAlpha = Math.max(0.25, maxAlpha - 0.25);

      for (let t = 0; t < Math.PI * 2; t += angleStep) {
        const raw = heartRawPoint(t);

        points.push({
          x: centerX + raw.x * scaleUnit * layerScale,
          y: centerY + raw.y * scaleUnit * layerScale,
          word,
          rgb,
          alpha: 0, // arranca invisible; el fade-in lo va subiendo
          targetAlpha: minAlpha + Math.random() * (maxAlpha - minAlpha),
          delay: Math.random() * maxDelay,
        });
      }
    });

    return points;
  }

  /* ------------------------------------------------------
     4. DIBUJO
     En cada frame:
       a) se actualiza el alpha de los puntos que ya deberían
          empezar a aparecer (según su "delay")
       b) se dibuja todo el conjunto con la intensidad de glow
          que le toque a ese frame (ver sección 5)
     No se vuelve a calcular la geometría del corazón en cada
     frame: eso ya quedó fijo en "points" (ver buildPoints).
     ------------------------------------------------------ */

  let points = [];
  let animationStart = null;

  function updateAlphas(elapsed) {
    points.forEach((p) => {
      if (elapsed > p.delay) {
        p.alpha += (p.targetAlpha - p.alpha) * CONFIG.fadeInSpeed;
      }
    });
  }

  function render(glowBlur) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.font = `${canvasSize * CONFIG.fontSizeRatio}px ${CONFIG.fontFamily}`;

    points.forEach((p) => {
      if (p.alpha <= 0.01) return; // nada que dibujar todavía

      const textWidth = ctx.measureText(p.word).width;

      ctx.fillStyle = `rgba(${p.rgb}, ${p.alpha})`;
      ctx.shadowColor = `rgba(${p.rgb}, ${Math.min(1, p.alpha + 0.2)})`;
      ctx.shadowBlur = glowBlur;

      // Centramos el texto horizontalmente sobre el punto (x, y),
      // igual que el diseño de referencia.
      ctx.fillText(p.word, p.x - textWidth / 2, p.y);
    });
  }

  /* ------------------------------------------------------
     5. ANIMACIÓN
     Dos cosas ocurren en paralelo, cada una a su propio ritmo:
       - Fade-in: cada punto va subiendo su opacidad una vez
         que pasa su "delay" (ver buildPoints). Es un efecto
         de una sola vez, al cargar la página.
       - Pulso de glow: una oscilación continua e infinita que
         sube y baja SOLO el brillo rosa (shadowBlur), sin tocar
         el tamaño del corazón (el efecto de "latido"/escala se
         quitó por pedido explícito).
     Si el usuario prefiere menos movimiento, se muestran los
     puntos ya con su opacidad final y con el glow fijo.
     ------------------------------------------------------ */
  function startAnimation() {
    if (prefersReducedMotion) {
      // Sin animación: todas las palabras visibles de una vez,
      // en su opacidad final, y con el glow en su punto medio
      // (ni el mínimo ni el máximo).
      points.forEach((p) => {
        p.alpha = p.targetAlpha;
      });
      const restingGlow = (CONFIG.glow.min + CONFIG.glow.max) / 2;
      render(restingGlow);
      return;
    }

    function loop(timestamp) {
      if (animationStart === null) animationStart = timestamp;
      const elapsed = timestamp - animationStart;

      updateAlphas(elapsed);

      // Pulso de glow: misma velocidad que tenía antes el efecto
      // de respiración, pero ahora solo mueve el brillo, no la escala.
      const glowT = timestamp * CONFIG.glowPulse.speed;
      const glowWave = (Math.sin(glowT) + 1) / 2; // normaliza a [0, 1]
      const glowBlur =
        CONFIG.glow.min + glowWave * (CONFIG.glow.max - CONFIG.glow.min);

      render(glowBlur);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------
     INICIALIZACIÓN
     Se ejecuta al cargar la página y cada vez que la ventana
     cambia de tamaño (con un pequeño debounce para no
     recalcular en cada píxel mientras se arrastra el borde).
     Al cambiar el tamaño, los puntos se regeneran desde cero
     (igual que el proyecto de referencia), así que el fade-in
     se reinicia de forma natural.
     ------------------------------------------------------ */
  let resizeTimeout = null;

  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      points = buildPoints(canvasSize);
      animationStart = null;

      if (prefersReducedMotion) {
        points.forEach((p) => {
          p.alpha = p.targetAlpha;
        });
        const restingGlow = (CONFIG.glow.min + CONFIG.glow.max) / 2;
        render(restingGlow);
      }
      // Si la animación está corriendo, el propio loop ya usa
      // los "points" actualizados en el siguiente frame.
    }, 120);
  }

  window.addEventListener('resize', handleResize);

  // Esperamos a que la fuente esté lista (si el navegador lo
  // soporta) para que el primer frame ya tenga el texto bien
  // medido; si no, dibujamos igual tras un breve margen.
  function init() {
    resizeCanvas();
    points = buildPoints(canvasSize);
    startAnimation();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init).catch(init);
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }
})();

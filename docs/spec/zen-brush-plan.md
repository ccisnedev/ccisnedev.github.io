# Plan: Pincel Zen para el Ensō — TDD por Etapas

**Basado en:** `docs/research/zen-brush-stroke.md` (Enfoque D — Híbrido 3 Capas)  
**Método:** Red → Green → Refactor por etapa  
**Tests existentes:** 124 (no romper ninguno)  
**Arquitectura objetivo:** Capa 1 (Masa) + Capa 2 (Fibras) + Capa 3 (Detalles)

---

## Resumen de Etapas

| # | Módulo | Descripción | Tests nuevos est. |
|---|--------|-------------|-------------------|
| 1 | `fiber-geometry.js` | Distribución y posición de fibras sobre el path | ~12 |
| 2 | `fiber-ink.js` | Modelo de tinta individual por fibra | ~10 |
| 3 | `perlin.js` | Perlin noise 1D determinista para jitter | ~8 |
| 4 | `fiber-renderer.js` | Generación de polylines renderizables por fibra | ~14 |
| 5 | `mass-layer.js` | Stamps Gaussianos para capa base de masa | ~10 |
| 6 | `paper-texture.js` | Noise 2D estático para textura de papel | ~6 |
| 7 | `organic-splatter.js` | Reemplazo de splatter circular por formas orgánicas | ~8 |
| 8 | `stroke-compositor.js` | Orquestador de 3 capas (reemplaza `index.js`) | ~12 |
| 9 | Integración `void.js` | Nuevo `_renderFrame` con las 3 capas | ~6 |
| 10 | Polish visual | Ajuste de constantes, timing de animación | ~4 |

**Total estimado:** ~90 tests nuevos + 124 existentes = ~214 tests

---

## Etapa 1: Fiber Geometry

**Archivo:** `js/themes/void/fiber-geometry.js`  
**Test:** `test/void/fiber-geometry.test.js`

### Concepto
Define la distribución espacial de N fibras a lo largo del ancho del pincel.
Cada fibra tiene un `offset` perpendicular al centro (∈ [-0.5, 0.5]) con distribución
no uniforme: más densas al centro, más espaciadas en bordes.

### API

```javascript
/**
 * @param {number} fiberCount - Número de fibras (20-40)
 * @param {{ seed?: number }} [opts]
 * @returns {Array<{ id: number, offset: number, retention: number, phase: number }>}
 */
export function generateFiberLayout(fiberCount, opts = {})

/**
 * Calcula la posición de una fibra en un punto t del path.
 * @param {{ offset: number }} fiber
 * @param {{ x, y, nx, ny, angle }} sample - Punto muestreado del path
 * @param {number} width - Ancho del trazo en ese punto
 * @param {number} jitter - Desplazamiento perpendicular extra
 * @returns {{ x: number, y: number }}
 */
export function fiberPosition(fiber, sample, width, jitter)
```

### Tests (RED primero)

```
1.  generateFiberLayout retorna array de longitud fiberCount
2.  Cada fibra tiene id, offset, retention, phase
3.  offsets están en rango [-0.5, 0.5]
4.  Distribución: más fibras con |offset| < 0.25 que con |offset| > 0.25
5.  retention ∈ [0.6, 1.0] para cada fibra
6.  Resultado es determinista con mismo seed
7.  Diferente seed → diferente layout
8.  fiberPosition con offset=0 retorna la posición del sample exacta
9.  fiberPosition con offset=0.5 retorna punto desplazado width/2 en dirección normal
10. fiberPosition con offset=-0.5 retorna punto desplazado -width/2 en dirección normal
11. jitter > 0 desplaza adicionalmente en dirección normal
12. fiberPosition con width=0 retorna posición del sample independiente del offset
```

### Fórmulas

Distribución de offset (no-lineal, densa al centro):
$$
d_i = \text{sign}\left(i - \frac{N}{2}\right) \cdot \left(\frac{|i - N/2|}{N/2}\right)^{1.3} \cdot 0.5
$$

Posición de fibra:
$$
\mathbf{F}(t) = \mathbf{P}(t) + \mathbf{N}(t) \cdot (d_i \cdot W + J)
$$

---

## Etapa 2: Fiber Ink Model

**Archivo:** `js/themes/void/fiber-ink.js`  
**Test:** `test/void/fiber-ink.test.js`

### Concepto
Modelo de tinta individual por fibra. Las fibras externas se agotan más rápido
que las internas (factor `1 + |offset| * 2`). Cada fibra tiene su propia
curva de deplección basada en su `retention`.

### API

```javascript
/**
 * Calcula la opacidad de una fibra individual en un punto t.
 * @param {number} t - Progreso [0, 1]
 * @param {{ offset: number, retention: number }} fiber
 * @param {{ decayRate?: number }} [opts]
 * @returns {number} Alpha ∈ [0, 1]
 */
export function fiberAlpha(t, fiber, opts = {})

/**
 * Calcula el grosor relativo de una fibra en un punto t.
 * Las fibras se adelgazan cuando se secan.
 * @param {number} t - Progreso [0, 1]
 * @param {{ offset: number, retention: number }} fiber
 * @returns {number} Grosor relativo ∈ [0.3, 1.0]
 */
export function fiberWidth(t, fiber)
```

### Tests (RED primero)

```
1.  fiberAlpha(0, fiber) ≈ 1.0 para cualquier fibra (inicio = lleno de tinta)
2.  fiberAlpha es monótonamente no-creciente (nunca sube)
3.  Fibra central (offset≈0) retiene más alpha a t=0.8 que fibra externa (offset≈0.5)
4.  Fibra con retention=1.0 retiene más alpha que con retention=0.6 al mismo t
5.  fiberAlpha(1, fibra_externa) < fiberAlpha(1, fibra_central) (kasure)
6.  fiberAlpha nunca es negativo
7.  fiberWidth(0, fiber) ≈ 1.0 (grosor completo al inicio)
8.  fiberWidth decrece cuando fiberAlpha decrece
9.  fiberWidth nunca baja de 0.3 (las fibras no desaparecen totalmente en grosor)
10. decayRate mayor → alpha decae más rápido
```

### Fórmula

$$
\alpha_i(t) = \text{clamp}\left(\rho_i \cdot e^{-k \cdot (1 + |d_i| \cdot 2) \cdot t}, 0, 1\right)
$$

$$
w_i(t) = 0.3 + 0.7 \cdot \alpha_i(t)
$$

---

## Etapa 3: Perlin Noise 1D

**Archivo:** `js/themes/void/perlin.js`  
**Test:** `test/void/perlin.test.js`

### Concepto
Implementación mínima de Perlin noise 1D determinista (seeded).
Se usa para el jitter orgánico de cada fibra: desplazamiento perpendicular
de baja frecuencia que da la irregularidad natural al borde del trazo.

### API

```javascript
/**
 * @param {number} seed
 * @returns {(x: number) => number} Función noise que retorna valores ∈ [-1, 1]
 */
export function createPerlin1D(seed)
```

### Tests (RED primero)

```
1.  Retorna una función
2.  La función retorna valores en rango [-1, 1]
3.  Resultado es determinista (mismo seed, mismo input → mismo output)
4.  Diferente seed → diferente output para mismo x
5.  Es continuo: |noise(x) - noise(x + ε)| < δ para ε pequeño
6.  noise(0), noise(1), noise(2) no son todos iguales (tiene variación)
7.  Frecuencia: cambia de signo al menos una vez en [0, 4]
8.  No tiene discontinuidades bruscas entre integers
```

### Implementación
Interpolación lineal entre gradientes aleatorios en puntos integer:
$$
\text{noise}(x) = \text{lerp}(\text{grad}[\lfloor x \rfloor] \cdot f, \text{grad}[\lceil x \rceil] \cdot (f-1), \text{smooth}(f))
$$
donde $f = x - \lfloor x \rfloor$ y smooth es un fade cúbico $6t^5 - 15t^4 + 10t^3$.

---

## Etapa 4: Fiber Renderer

**Archivo:** `js/themes/void/fiber-renderer.js`  
**Test:** `test/void/fiber-renderer.test.js`

### Concepto
Toma los path samples, el fiber layout, y los modelos de tinta/noise para generar
polylines renderizables. Cada polyline es un array de puntos con alpha y grosor variable.
Este es el módulo central que convierte la simulación en datos visuales.

### API

```javascript
/**
 * @param {Array<{ x, y, t, angle, nx, ny }>} samples - Del path-sampling
 * @param {Array<{ id, offset, retention, phase }>} fibers - Del fiber-geometry
 * @param {{
 *   baseWidth?: number,
 *   progress?: number,
 *   seed?: number,
 *   jitterAmplitude?: number,
 *   jitterFrequency?: number,
 * }} [opts]
 * @returns {Array<{
 *   fiberId: number,
 *   points: Array<{ x: number, y: number, alpha: number, width: number }>
 * }>}
 */
export function renderFibers(samples, fibers, opts = {})
```

### Tests (RED primero)

```
1.  Retorna array de longitud igual a fibers.length
2.  Cada entrada tiene fiberId y points
3.  points.length === samples.length (o ≤ si progress < 1)
4.  Con progress=0.5 → points se cortan a la mitad del path
5.  Cada point tiene x, y, alpha, width
6.  alpha de fibras centrales > alpha de fibras externas en t=0.8
7.  width es proporcional a baseWidth * pressureCurve
8.  Con jitterAmplitude=0 → fibras son exactamente paralelas
9.  Con jitterAmplitude>0 → fibras tienen desplazamiento perpendicular
10. Resultado determinista con mismo seed
11. Fibras externas (|offset|>0.4) tienen alpha=0 antes que las centrales (kasure)
12. Todos los alpha son ∈ [0, 1]
13. Todos los width son ≥ 0
14. progress=0 → todos los points tienen alpha=0 (nada dibujado)
```

### Dependencias
- `fiber-geometry.js` → `fiberPosition()`
- `fiber-ink.js` → `fiberAlpha()`, `fiberWidth()`
- `perlin.js` → `createPerlin1D()`
- `ink-model.js` → `pressureCurve()` (existente)

---

## Etapa 5: Mass Layer

**Archivo:** `js/themes/void/mass-layer.js`  
**Test:** `test/void/mass-layer.test.js`

### Concepto
Genera los stamps de la capa base — manchas Gaussianas difusas con alto overlap.
Proporciona la "masa" de tinta (densidad opaca) en las zonas húmedas. Es la
capa que está DEBAJO de las fibras y da cuerpo al trazo.

### API

```javascript
/**
 * @param {Array<{ x, y, t, angle, nx, ny }>} samples
 * @param {{
 *   baseWidth?: number,
 *   progress?: number,
 * }} [opts]
 * @returns {Array<{
 *   x: number, y: number,
 *   radius: number,
 *   alpha: number,
 *   softness: number,  // 0=hard edge, 1=full gaussian
 * }>}
 */
export function generateMassStamps(samples, opts = {})
```

### Tests (RED primero)

```
1.  Retorna array de stamps
2.  Stamps.length >= samples.length (puede haber extras para overlap)
3.  Cada stamp tiene x, y, radius, alpha, softness
4.  radius es proporcional a baseWidth * pressure
5.  alpha es alto (>0.6) para t<0.5 (zona húmeda)
6.  alpha decrece para t>0.7 (zona seca)
7.  softness ∈ [0.5, 1.0] (siempre suave)
8.  Con progress<1 → stamps más allá del progreso tienen alpha=0
9.  Stamps en zona de ataque (t<0.05) tienen radius ligeramente mayor (micro-pool)
10. Overlap: distancia entre stamps consecutivos < radius * 0.6
```

### Fórmulas

El alpha de cada stamp de masa:
$$
\alpha_{mass}(t) = I(t) \cdot 0.6 \cdot P(t)^{0.5}
$$

El radio:
$$
R(t) = W_{base} \cdot P(t) \cdot (1 + 0.1 \cdot \mathbb{1}_{t < 0.05})
$$

---

## Etapa 6: Paper Texture

**Archivo:** `js/themes/void/paper-texture.js`  
**Test:** `test/void/paper-texture.test.js`

### Concepto
Genera un pattern de textura estática que simula la superficie del papel washi.
Se usa como multiplicador final sobre el trazo: microperforaciones donde
la textura del papel "resiste" la tinta.

### API

```javascript
/**
 * Genera un valor de textura de papel para un punto dado.
 * @param {number} x - Coordenada pixel
 * @param {number} y - Coordenada pixel
 * @param {{ seed?: number, scale?: number, grain?: number }} [opts]
 * @returns {number} Valor ∈ [0.7, 1.0] — factor multiplicativo sobre alpha
 */
export function paperGrain(x, y, opts = {})
```

### Tests (RED primero)

```
1.  Retorna valor en [0.7, 1.0]
2.  Es determinista (mismo x, y, seed → mismo resultado)
3.  Diferente seed → diferente resultado
4.  Resultado varía con x (no es constante horizontal)
5.  Resultado varía con y (no es constante vertical)
6.  Variación es suave (vecinos difieren < 0.1 típicamente)
```

### Nota
Esta textura es SUTIL — no debe dominar visualmente. Solo introduce
micro-irregularidades que hacen que el trazo "respire" sobre el papel.

---

## Etapa 7: Organic Splatter

**Archivo:** `js/themes/void/organic-splatter.js`  
**Test:** `test/void/organic-splatter.test.js`

### Concepto
Reemplazo del splatter circular actual. Las gotas reales no son círculos perfectos:
tienen contornos irregulares (2-4 arcos con radio variable). Además, se concentran
en la dirección del movimiento del pincel.

### API

```javascript
/**
 * @param {{ x, y, size, alpha, angle }} stamp - Stamp fuente
 * @param {{ seed?: number, count?: number }} [opts]
 * @returns {Array<{
 *   x: number, y: number,
 *   radii: number[],      // 4 radii para forma orgánica (N, E, S, W)
 *   rotation: number,
 *   alpha: number,
 * }>}
 */
export function generateOrganicSplatter(stamp, opts = {})
```

### Tests (RED primero)

```
1.  Retorna array de droplets
2.  Cada droplet tiene x, y, radii (array de 4), rotation, alpha
3.  radii son todos > 0
4.  Los 4 radii NO son todos iguales (forma irregular)
5.  La variación entre radii es < 50% del promedio (no demasiado deformado)
6.  alpha ∈ (0, 1]
7.  Las gotas se concentran más en la dirección de stamp.angle (60% hacia adelante)
8.  Es determinista con mismo seed
```

---

## Etapa 8: Stroke Compositor

**Archivo:** `js/themes/void/stroke-compositor.js`  
**Test:** `test/void/stroke-compositor.test.js`

### Concepto
Orquestador de las 3 capas. Reemplaza la función `buildEnsoFrame()` de `index.js`.
Coordina: path sampling → mass layer → fibers → splatter + nijimi.
Retorna una estructura de datos de frame completa lista para render.

### API

```javascript
/**
 * @param {{ start: {x,y}, curves: Array, r: number }} ensoPath
 * @param {{
 *   progress?: number,
 *   seed?: number,
 *   numSamples?: number,
 *   baseWidth?: number,
 *   fiberCount?: number,
 * }} [opts]
 * @returns {{
 *   mass: Array<{ x, y, radius, alpha, softness }>,
 *   fibers: Array<{ fiberId, points: Array<{ x, y, alpha, width }> }>,
 *   splatter: Array<{ x, y, radii, rotation, alpha }>,
 *   halo: Array<{ x, y, radius, alpha }>,
 * }}
 */
export function composeStroke(ensoPath, opts = {})
```

### Tests (RED primero)

```
1.  Retorna objeto con mass, fibers, splatter, halo
2.  mass es array no vacío cuando progress > 0
3.  fibers es array de longitud fiberCount
4.  splatter es array (puede estar vacío)
5.  halo es array no vacío cuando progress > 0
6.  Con progress=0 → mass y fibers tienen alpha=0 en todos los puntos
7.  Con progress=1 → tiene datos completos
8.  baseWidth afecta el tamaño de mass.radius y fibers.width
9.  seed diferente → posiciones de splatter diferentes
10. Las fibras centrales tienen alpha > 0 en t=0.9 (aún visibles en zona seca)
11. Las fibras externas tienen alpha ≈ 0 en t=0.9 (kasure)
12. mass.alpha > 0.5 para zona húmeda (t < 0.4)
```

### Dependencias
- `path-sampling.js` → `samplePath()`
- `mass-layer.js` → `generateMassStamps()`
- `fiber-geometry.js` → `generateFiberLayout()`
- `fiber-renderer.js` → `renderFibers()`
- `organic-splatter.js` → `generateOrganicSplatter()`
- `nijimi.js` → `nijimiHalo()`
- `ink-model.js` → `inkDepletion()`

---

## Etapa 9: Integración void.js

**Archivo:** `js/themes/void.js` (modificación)  
**Test:** `test/void-theme.test.js` (ampliación)

### Concepto
Nuevo método `_renderFrame` que consume la estructura de `composeStroke()` y
la dibuja en Canvas 2D usando las 3 capas en orden correcto.

### Rendering Order

```
1. Clear / background noise
2. CAPA 1 — Mass stamps (radialGradient fills, compositeOp='lighter')
3. Paper texture multiplication (globalCompositeOperation='multiply')
4. CAPA 2 — Fiber polylines (ctx.lineTo chains con lineWidth variable)
5. CAPA 3 — Halo (arc fills con alpha bajo)
6. CAPA 3 — Splatter orgánico (multi-arc paths)
```

### Tests (RED primero)

```
1.  _renderFrame no lanza error con frame válido de composeStroke
2.  Llama a composeStroke en lugar de buildEnsoFrame
3.  El frame cacheado (this._cachedFrame) usa nueva estructura
4.  resize regenera el frame correctamente
5.  reducedMotion dibuja el ensō completo (progress=1)
6.  Performance: renderFrame completa en < 10ms (con frame cacheado)
```

### Estrategia de migración

1. **No borrar** `buildEnsoFrame()` ni `index.js` inmediatamente
2. Crear `_renderFrameV2()` con la nueva lógica
3. Switchear `frame()` para usar V2
4. Una vez validado visualmente, eliminar código legacy (V1)
5. Los tests existentes de `orchestrator.test.js` se mantienen hasta borrar V1

---

## Etapa 10: Polish Visual

**Archivo:** Ajustes de constantes en múltiples módulos  
**Test:** Tests visuales de regresión (snapshot opcional)

### Tareas

1. **Ajustar constantes de presión** — comparar con referencia visual
2. **Calibrar decay rate** — la zona de kasure debe empezar ~70% del trazo
3. **Fiber count** — probar 20, 25, 30 fibras y elegir la más natural
4. **Jitter amplitude** — demasiado = caótico, poco = mecánico
5. **Mass alpha** — balancear que la masa no aplaste las fibras visualmente
6. **Paper grain intensity** — debe ser apenas perceptible
7. **Timing de animación** — las fibras externas se dibujan con delay sutil (~50ms)
8. **Color** — probar tonos ligeramente cálidos vs blanco puro

### Tests

```
1.  El ensō completo tiene al menos 3 niveles de alpha distintos (tonalidad)
2.  En t=0.9, al menos 30% de fibras tienen alpha < 0.1 (kasure visible)
3.  El ancho máximo del trazo está entre 3-5% del menor lado del canvas
4.  La presión en t=0.5 genera un ancho ≥ 85% del máximo
```

---

## Reglas Generales del Proceso

### Para cada etapa:

1. **RED:** Escribir TODOS los tests de la etapa. Ejecutar. Todos fallan.
2. **GREEN:** Implementar el módulo mínimo que hace pasar todos los tests.
3. **REFACTOR:** Limpiar, optimizar, documentar.
4. **GATE:** `npx vitest run` — TODOS los tests (nuevos + 124 existentes) pasan.

### Convenciones:

- Módulos nuevos: funciones puras, sin DOM, sin side effects
- PRNG: siempre `mulberry32` con seed explícito
- Exportar funciones individuales (no clases)
- No modificar módulos existentes hasta Etapa 9 (coexistencia)
- Cada módulo ≤ 100 líneas (si es más → splitear)

### Orden de dependencias:

```
Etapa 1 (fiber-geometry) ─┐
Etapa 2 (fiber-ink)      ─┤
Etapa 3 (perlin)         ─┼──→ Etapa 4 (fiber-renderer) ──┐
                           │                                │
Etapa 5 (mass-layer) ─────┼────────────────────────────────┼──→ Etapa 8 (compositor) → Etapa 9
Etapa 6 (paper-texture) ──┤                                │
Etapa 7 (organic-splatter)┘────────────────────────────────┘
```

Las etapas 1, 2, 3, 5, 6, 7 son **independientes** y pueden desarrollarse en paralelo.  
La etapa 4 depende de 1+2+3.  
La etapa 8 depende de todas las anteriores.  
Las etapas 9 y 10 son secuenciales al final.

---

## Criterio de Éxito

El ensō final debe cumplir:

- [ ] Se ven fibras paralelas individuales en el cuerpo del trazo
- [ ] La zona final muestra kasure (fibras separadas con gaps)
- [ ] La transición húmedo→seco es gradual (no abrupta)
- [ ] Los bordes del trazo son irregulares (no geométricos)
- [ ] Hay variación tonal (mínimo 3 niveles de opacidad)
- [ ] El ataque es denso y ligeramente expandido
- [ ] La textura general sugiere "hecho a mano" no "generado por computadora"
- [ ] Performance: ≤ 5ms por frame durante animación
- [ ] Todos los tests (214+) pasan en verde

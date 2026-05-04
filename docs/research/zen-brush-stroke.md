# Investigación: Trazo Natural de Pincel Zen (Ensō)

**Fecha:** 2025-01  
**Objetivo:** Análisis matemático, algorítmico y artístico para lograr un trazo de pincel Zen (ensō) natural y realista en Canvas 2D.  
**Estado:** Documento de investigación — no programar, solo análisis.

---

## 1. Diagnóstico del Problema Actual

### 1.1 Qué produce nuestra implementación

La implementación actual (`void/brush-stroke.js` → `void.js._renderFrame`) renderiza stamps (sellos) como **elipses sólidas uniformes** colocadas a lo largo del path:

```javascript
ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(240, 240, 240, 1)';
ctx.fill();
```

**Problemas identificados:**

| # | Defecto | Causa técnica |
|---|---------|---------------|
| 1 | Aspecto de "collar de perlas" | Stamps discretos sin overlap suficiente, bordes geométricos visibles |
| 2 | Sin textura de fibra | `createBrushTip()` se genera pero **jamás se usa** en el rendering |
| 3 | Bordes perfectamente lisos | Elipses matemáticas sin irregularidad orgánica |
| 4 | Kasure solo modula alpha global | No hay separación visual de fibras individuales across the width |
| 5 | Sin gradiente intra-stamp | Color uniforme (240,240,240) sin variación interna |
| 6 | Sin interacción con "papel" | El fondo es negro puro sin textura |
| 7 | Splatter genérico | Círculos perfectos sin forma orgánica |
| 8 | Sin acumulación de tinta | Los stamps no acumulan densidad donde se superponen |

### 1.2 Referencia visual del resultado deseado

Un ensō real presenta:
- **Ataque denso**: donde el pincel toca el papel, la tinta es espesa y ligeramente "pooled"
- **Cuerpo texturado**: fibras individuales visibles como estrías paralelas a la dirección del trazo
- **Bordes irregulares**: el contorno externo no es geométrico, tiene micro-variaciones
- **Kasure (掠れ)**: en la zona final, las fibras se separan dejando bandas sin tinta
- **Transición gradual**: del trazo húmedo al seco es continua, no abrupta
- **Nijimi (滲み)**: ligero bleeding/halo donde la tinta se absorbe lateralmente
- **Variación de presión**: el ancho varía orgánicamente (no linealmente)

---

## 2. Fundamentos Físicos del Sumi-e

### 2.1 El pincel real

Un pincel de caligrafía japonés consta de:
- **Cuerpo central** (芯 *shin*): fibras duras (lobo/caballo) que dan estructura
- **Envolvente** (上毛 *uwage*): fibras suaves (cabra) que transportan tinta
- Típicamente 50-200 fibras visibles en la punta

Cuando el pincel se carga de tinta y toca el papel:
1. Las fibras se abren por presión → ancho del trazo
2. Cada fibra deposita tinta independientemente
3. La tinta fluye por capilaridad entre fibras → continuidad
4. Al avanzar, la reserva de tinta disminuye → fibras se secan de fuera hacia dentro
5. El papel Xuan (宣纸) absorbe la tinta por capas — no es instantáneo

### 2.2 Modelo matemático de la física

#### Variables del sistema:

$$
\begin{aligned}
P(t) &= \text{presión del pincel en } t \in [0, 1] \\
V(t) &= \text{velocidad del pincel} \\
I(t) &= \text{reserva de tinta restante} \\
W(t) &= P(t) \cdot W_{max} \quad \text{(ancho del trazo)} \\
\sigma(t) &= f(I(t), V(t)) \quad \text{(cohesión de fibras)}
\end{aligned}
$$

#### Modelo de depletación de tinta:

$$
I(t) = I_0 \cdot e^{-k \int_0^t W(\tau) \cdot V(\tau) \, d\tau}
$$

Donde $k$ es la constante de absorción del papel. Esto significa: **cuanto más ancho el trazo y más rápido el movimiento, más rápido se agota la tinta.**

#### Modelo de separación de fibras (kasure):

Cuando $I(t) < I_{threshold}$, las fibras pierden cohesión. Cada fibra $f_i$ tiene un umbral de retención $\rho_i \sim U(0, 1)$. La fibra muestra un gap cuando:

$$
\text{gap}_i(t) = \begin{cases} 0 & \text{si } I(t) \geq \rho_i \\ 1 - \frac{I(t)}{\rho_i} & \text{si } I(t) < \rho_i \end{cases}
$$

---

## 3. Software Existente y sus Técnicas

### 3.1 libmypaint / MyPaint

**Arquitectura:** Motor basado en "dabs" (manchas circulares/elípticas).

**Algoritmo central** (de `brushmodes.c`):
```
Para cada dab:
  mask[pixel] = forma del dab (generalmente Gaussiana)
  opa_a = mask * opacity     // alpha superior
  opa_b = 1 - opa_a          // alpha inferior
  result = opa_a * color + opa_b * canvas_color  // Porter-Duff "over"
```

**Parámetros clave para simular sumi-e:**
- `radius_logarithmic` — tamaño base del dab
- `hardness` — sharpness del borde (0=suave Gaussiana, 1=disco duro)
- `elliptical_dab_ratio` — elongación del dab
- `elliptical_dab_angle` — rotación alineada al trazo
- `dabs_per_actual_radius` — densidad de colocación (tipicamente 2-6)
- `opaque` — opacidad por dab
- `opaque_multiply` — acumulación (permite buildup)
- `smudge` — mezcla con color del canvas (para bleeding)
- `stroke_duration` — permite variar parámetros en función del progreso

**Lo que MyPaint hace BIEN:**
- Acumulación gradual de dabs superpuestos
- Variación dinámica de todos los parámetros por pressure/speed/random
- El "blending mode Paint" usa **mezcla espectral** (Weighted Geometric Mean) para simular pigmentos reales

**Lo que NO resuelve para nuestro caso:**
- No simula fibras individuales — los dabs son fundamentalmente circulares/elípticos
- No tiene modelo de absorción de papel
- No produce kasure naturalmente (habría que usar muchos micro-dabs)

### 3.2 Krita — Motor de Pinceles

Krita ofrece múltiples motores:
1. **Pixel Brush** — dab-based como MyPaint pero con texturas de bitmap
2. **Bristle Brush (Hairy Brush)** — simula fibras individuales
3. **Dyna Brush** — usa física (masa + fricción) para suavizar trazos

**Bristle Brush de Krita:**
- Cada cerda es un punto con offset del centro
- Al mover el pincel, cada cerda deja su propia "traza"
- Resultado: textura paralela natural de fibras
- Es costoso computacionalmente (N cerdas × M puntos de muestreo)

### 3.3 Corel Painter — "RealBristle"

- Simula **cada cerda como una entidad física** con posición, velocidad y rigidez
- Modelo de "pincel mojado": las cerdas se pegan cuando tienen tinta
- Cuando la tinta se agota, las cerdas se separan → kasure automático
- Usa **texturas de papel** que modulan la deposición de tinta

### 3.4 Strassmann (1986) — "Hairy Brushes"

Paper fundacional (459 citaciones). Modelo:

$$
\text{Bristle}_i = \text{polyline con puntos de control}
$$

Cada cerda es una polilínea que responde a:
- Presión (abre/cierra el abanico de cerdas)
- Velocidad (lag de las cerdas — siguen al centro con delay)
- Curvatura del trazo (cerdas exteriores se estiran)

**Rendering**: cada cerda deposita un trazo fino (1-3px). La acumulación de N trazos finos produce la textura global del pincel.

### 3.5 Procreate — Brushes

- Usa un **dual-texture system**: "Shape" (forma del stamp) × "Grain" (textura del papel)
- Los stamps se compositan con alta densidad (overlap ~80%)
- La textura grain se mueve con el trazo o es estática (papel)
- Variación de scatter, rotation, y squeeze por presión

---

## 4. Análisis Algorítmico: Enfoques Viables en Canvas 2D

### 4.1 Enfoque A — "Polyline Bristle" (Strassmann adaptado)

**Concepto:** Simular N fibras (20-40) como polylines paralelas al stroke path.

```
Para cada fibra i ∈ [0, N):
  offset_i = posición perpendicular al centro del stroke
  Para cada punto t del path:
    pos = pathPoint(t) + normal(t) * offset_i * width(t)
    depositar línea desde pos_anterior a pos con:
      - grosor: 1-2px
      - alpha: ink(t) * retention_i
      - jitter: ±noise en la dirección normal
```

**Ventajas:**
- Produce fibras paralelas naturales automáticamente
- Kasure emerge naturalmente (fibras externas pierden tinta primero)
- Bajo costo en Canvas 2D (N × `ctx.lineTo()` calls)
- Cada fibra puede tener su propio seed de noise → irregularidad

**Desventajas:**
- No produce el efecto de "masa" de tinta en zonas húmedas
- Requiere post-procesado para el halo (nijimi)

**Complejidad:** $O(N \cdot M)$ donde $N$ = fibras, $M$ = muestras del path.  
Con N=30 y M=200 → 6,000 segmentos de línea. Viable en 60fps.

### 4.2 Enfoque B — "Textured Stamp" (MyPaint mejorado)

**Concepto:** Mantener el enfoque de stamps pero con textura de fibra direccional.

```
Para cada stamp i:
  Crear offscreen canvas del tamaño del stamp
  Para cada pixel (x, y) del stamp:
    r = distancia al centro normalizada
    θ = ángulo respecto a la dirección del trazo
    fiber_band = sin(offset_perpendicular * π * fiberCount)
    noise = perlin(x * freq, y * freq)
    alpha = radial_falloff(r) * fiber_mask(fiber_band, dryness) * noise
  Compositar stamp rotado en el canvas principal
```

**Ventajas:**
- Más cercano a la arquitectura actual (evolución, no revolución)
- Permite texturas ricas por stamp
- El overlap de stamps crea acumulación natural

**Desventajas:**
- Per-pixel computation por stamp es costoso
- Los stamps individuales pueden ser visibles en zonas de bajo overlap
- Requiere alta densidad de stamps para continuidad

**Optimización:** Pre-calcular 4-8 texturas de stamp en diferentes "niveles de sequedad" y seleccionar/interpolar según $I(t)$.

### 4.3 Enfoque C — "Skeleton + Fill" (Contorno variable)

**Concepto:** Calcular el contorno exterior del trazo como path cerrado, luego rellenarlo con textura.

```
1. Calcular path superior e inferior:
   top(t) = center(t) + normal(t) * width(t)/2 * (1 + noise_top(t))
   bot(t) = center(t) - normal(t) * width(t)/2 * (1 + noise_bot(t))

2. Crear path cerrado: top → reverse(bot) → close

3. Fill con:
   - Gradiente perpendicular (más oscuro al centro)
   - Textura de fibras (líneas paralelas a la dirección)
   - Modulación por inkLevel para kasure
```

**Ventajas:**
- Bordes irregulares naturales (noise en el contorno)
- Una sola operación de fill (muy eficiente)
- Control total sobre la forma exterior

**Desventajas:**
- Difícil hacer kasure (gaps internos) con un solo fill
- No produce la acumulación natural de tinta
- La textura interna requiere patterns o clip paths complejos

### 4.4 Enfoque D — **HÍBRIDO RECOMENDADO** 🎯

**Concepto:** Combinar Enfoque A (fibras) + elementos del B (textura) + C (contorno).

**Arquitectura en 3 capas:**

```
CAPA 1 — Masa base (Enfoque B simplificado):
  - Stamps elípticos grandes con blur Gaussiano
  - Alta opacidad en zona húmeda, baja en zona seca
  - Proporciona el "body" y la densidad del trazo
  - Color: ligeramente más bajo alpha que el final

CAPA 2 — Fibras (Enfoque A):
  - 20-30 polylines paralelas al path
  - Cada fibra tiene: offset perpendicular, retención, jitter
  - Las fibras EXTERNAS se agotan primero → kasure emerge
  - Grosor variable: 1-3px
  - Composición: "lighter" o "source-over" con alpha

CAPA 3 — Detalles (splatter + nijimi):
  - Micro-splatters orgánicos (no circulares — usar 3-4 arcs aleatorios)
  - Halo difuso en zona de ataque (nijimi)
  - Modulación por textura de "papel" (noise estático de fondo)
```

**¿Por qué este enfoque es superior?**

1. La CAPA 1 proporciona la opacidad densa donde el pincel está cargado
2. La CAPA 2 añade la textura direccional de fibras que es la **signature visual** del sumi-e
3. Las fibras generan kasure **orgánicamente** sin necesidad de un sistema separado
4. Es computacionalmente viable (30 polylines + ~50 stamps gaussianos)

---

## 5. Modelo Matemático Propuesto

### 5.1 Geometría de Fibras

Dado el path del ensō parametrizado como $\mathbf{C}(t)$ con normal $\mathbf{N}(t)$:

$$
\mathbf{F}_i(t) = \mathbf{C}(t) + \mathbf{N}(t) \cdot d_i \cdot W(t) + \mathbf{J}_i(t)
$$

Donde:
- $d_i \in [-0.5, 0.5]$ — distribución de la fibra $i$ en el ancho (no uniforme, más densa al centro)
- $W(t) = P(t) \cdot W_{max}$ — ancho del trazo en $t$
- $\mathbf{J}_i(t)$ — jitter perpendicular (Perlin noise de baja frecuencia)

**Distribución de fibras** (más densas al centro):

$$
d_i = \text{sign}(i - N/2) \cdot \left(\frac{|i - N/2|}{N/2}\right)^{1.3} \cdot 0.5
$$

Esto produce fibras más apretadas al centro y más espaciadas en los bordes.

### 5.2 Modelo de Tinta por Fibra

Cada fibra $i$ tiene una reserva individual:

$$
I_i(t) = I_0 \cdot \rho_i \cdot e^{-k \cdot (1 + |d_i| \cdot 2) \cdot t}
$$

Donde:
- $\rho_i \sim U(0.6, 1.0)$ — retención intrínseca de la fibra
- El factor $(1 + |d_i| \cdot 2)$ hace que **fibras externas se sequen el doble de rápido**

La alpha de cada fibra en un punto:

$$
\alpha_i(t) = \text{clamp}\left(\frac{I_i(t)}{I_{visible}}, 0, 1\right) \cdot \alpha_{base}
$$

### 5.3 Presión y Ancho

La presión sigue un perfil inspirado en la cinemática del gesto de ensō:

$$
P(t) = \begin{cases}
0.3 + 0.7 \cdot \text{easeOut}(t / 0.05) & t < 0.05 \quad \text{(ataque rápido)} \\
0.85 + 0.15 \cdot \sin\left(\frac{t - 0.05}{0.80} \cdot \pi\right) & 0.05 \leq t \leq 0.85 \quad \text{(cuerpo)} \\
0.9 \cdot (1 - \text{easeIn}(\frac{t - 0.85}{0.15}))^2 + 0.05 & t > 0.85 \quad \text{(levantamiento)}
\end{cases}
$$

### 5.4 Jitter y Ruido

El jitter de cada fibra usa **Perlin noise 1D** con frecuencia adaptativa:

$$
\mathbf{J}_i(t) = \mathbf{N}(t) \cdot A_i \cdot \text{perlin}(t \cdot f_i + \phi_i)
$$

Donde:
- $A_i = 0.5 + |d_i| \cdot 1.5$ px — amplitud mayor en bordes
- $f_i = 3 + \text{rand}_i \cdot 2$ — frecuencia espacial  
- $\phi_i$ — fase aleatoria por fibra

### 5.5 Grosor de Fibra Individual

$$
w_i(t) = w_{base} \cdot (0.5 + 0.5 \cdot I_i(t)) \cdot (0.8 + 0.4 \cdot \text{noise}_i(t))
$$

Las fibras se adelgazan cuando se secan, con variación micro.

---

## 6. Análisis Artístico: Los 7 Principios del Ensō

Para que un ensō digital sea convincente, debe cumplir estos principios estéticos:

### 6.1 一筆 (Ippitsu) — Un solo trazo

El ensō se pinta de una sola pincelada continua. Algorítmicamente:
- **No debe haber discontinuidades** en las fibras
- La textura debe fluir coherentemente de inicio a fin
- No "reiniciar" ruidos o semillas mid-stroke

### 6.2 気韻生動 (Ki'in Seidō) — Resonancia vital

El trazo debe tener "vida". Se logra mediante:
- **Variación micro-constante** — nunca dos segmentos iguales
- **Aceleración/desaceleración visible** — stamps más juntos en curva, más separados en recta
- El noise debe ser de **baja frecuencia** (orgánico) no de alta frecuencia (digital)

### 6.3 墨の五色 (Sumi no Goshiki) — Los cinco tonos de la tinta

La tradición identifica 5 tonalidades: 焦 (quemado/saturado), 濃 (denso), 重 (medio), 淡 (claro), 清 (diluido).

En nuestro caso (tinta clara sobre negro):
- El "quemado" es blanco puro opaco (alpha=1.0) donde el pincel está más cargado
- Debe haber **al menos 3 niveles de tonalidad** visibles en un solo ensō

### 6.4 入り (Iri) — La entrada

El punto donde el pincel toca el papel es crucial:
- Hay una **micro-piscina** de tinta (ligero engrosamiento)
- Las fibras están compactas (sin separación)
- El borde es denso y afilado
- Puede haber un minúsculo splash

### 6.5 走り (Hashiri) — El recorrido

El cuerpo del trazo:
- Ancho relativamente constante con variación orgánica (±5-10%)
- Fibras visibles pero cohesivas
- Las fibras "externas" empiezan a mostrar ligera separación
- Velocidad percibida: stamps que sugieren movimiento

### 6.6 抜き (Nuki) — La salida

Donde el pincel se levanta:
- **Adelgazamiento progresivo** del trazo
- Las fibras se separan completamente (kasure máximo)
- Posible "cola" de 2-3 fibras que se extienden más allá
- La opacidad cae dramáticamente

### 6.7 余白 (Yohaku) — El espacio vacío

El espacio alrededor del ensō es tan importante como el trazo:
- El gap del ensō (donde no se cierra el círculo) es **intencional**
- El fondo "respira" — no debe ser negro muerto (mínimo noise de textura)

---

## 7. Comparativa: Enfoque Actual vs. Propuesto

| Aspecto | Actual | Propuesto |
|---------|--------|-----------|
| Forma del stamp | Elipse sólida uniforme | 3 capas: masa + fibras + detalles |
| Textura interna | Ninguna | Fibras paralelas individuales |
| Bordes | Geométricamente perfectos | Irregulares con noise de baja freq |
| Kasure | Alpha global por stamp | Emergente de fibras individuales |
| Acumulación | Sin overlap visible | Composición aditiva con overlap |
| Nijimi | Circles separados | Halo Gaussiano integrado a la masa |
| Splatter | Círculos perfectos | Formas orgánicas (multi-arc) |
| Paper texture | Ninguna | Noise estático de grano fino |
| Variación tonal | 2 niveles (on/off) | 5+ niveles continuos |
| Performance | Rápido (120 ellipses) | Moderado (~30 polylines + 50 stamps) |

---

## 8. Plan de Implementación Técnica

### Fase 1: Refactoring del Rendering (Capa Base)

1. Reemplazar elipses sólidas por stamps con **gradiente radial suave**
2. Aumentar density de stamps (overlap ≥ 60%)
3. Usar `globalCompositeOperation = 'lighter'` para acumulación natural
4. Añadir squash ratio variable por presión (no fijo 0.6)

### Fase 2: Sistema de Fibras (Capa Principal)

1. Generar N=25 polylines como "fibras" sobre el path del ensō
2. Cada fibra: offset, retención, fase de noise propios
3. Renderizar fibras como `ctx.lineTo()` con `lineWidth` variable
4. Las fibras externas se desvanecen primero → kasure orgánico

### Fase 3: Textura de Papel y Detalles

1. Generar textura estática de "papel" (Perlin noise 2D en offscreen canvas)
2. Usar la textura como máscara de modulación (`globalCompositeOperation = 'multiply'`)
3. Splatter con formas orgánicas (bezier curves, no arcs perfectos)
4. Nijimi como blur gaussiano en zona de ataque

### Fase 4: Animación y Polish

1. Las fibras se dibujan secuencialmente (animación de progreso)
2. Ligero "drag" — las fibras más externas tienen delay sutil
3. Paper texture aparece primero (antes del trazo)
4. Breathing animation post-completado (variación micro de alpha)

---

## 9. Estimación de Performance

### Canvas 2D budget (60fps @ 1080p):

| Operación | Cantidad | Costo estimado |
|-----------|----------|----------------|
| Stamps Gaussianos (Capa 1) | ~50 | 0.5ms |
| Polylines fibras (Capa 2) | 25 × 200pts | 1.2ms |
| Splatter orgánico | ~15 | 0.1ms |
| Paper texture (una vez) | 1 composit | 0.3ms |
| **Total por frame** | | **~2.1ms** ✓ |

Budget disponible: 16.6ms (60fps). Margen amplio.

**Nota:** El frame se cachea una vez completada la animación, así que el costo solo importa durante los 2 segundos de dibujo.

---

## 10. Referencias

### Papers Académicos
1. **Strassmann, S.** (1986). "Hairy Brushes" — SIGGRAPH. Modelo fundacional de simulación de pincel con cerdas individuales como polylines. 459 citaciones.
2. **Kang, H. et al.** — Hardware-accelerated sumi-e rendering.
3. **Ning, J. et al.** — Contour-driven brush stroke rendering.
4. **Lu, J. & Huang, Z.** — GPU-based East Asian painting simulation.
5. **Baxter, W. et al.** (2004) — "DAB: Interactive Haptic Painting with 3D Virtual Brushes" — modelo físico de pincel 3D.
6. **Lee, J.** (1999) — "Simulating Oriental Black-Ink Painting" — modelo de difusión de tinta en papel.

### Software Analizado
- **libmypaint** (ISC License) — Motor de dabs con composición premultiplied alpha. [github.com/mypaint/libmypaint](https://github.com/mypaint/libmypaint)
- **Krita** — Bristle brush engine con simulación individual de cerdas.
- **Corel Painter** — RealBristle technology (propietario).
- **Procreate** — Dual-texture (Shape × Grain) stamp system.
- **Adobe Fresco** — "Live Brushes" con simulación de fluidos (propietario).

### Modelo Matemático de libmypaint (brushmodes.c)

Composición Normal ("over"):
```
opa_a = mask[pixel] * opacity    // alpha del dab
opa_b = 1 - opa_a                // alpha del fondo
result_alpha = opa_a + opa_b * bottom_alpha
result_color = (opa_a * dab_color + opa_b * bottom_color)
```

Composición Paint (mezcla espectral — Weighted Geometric Mean):
```
fac_a = opa_a / (opa_a + opa_b * bottom_alpha)
fac_b = 1 - fac_a
spectral_result[i] = pow(spectral_top[i], fac_a) * pow(spectral_bottom[i], fac_b)
```

---

## 11. Conclusión

El problema principal no es de parámetros — es de **arquitectura de rendering**. Pasar de "elipses sólidas uniformes" a "fibras individuales con comportamiento propio" es el cambio que transformará el resultado de "digital" a "natural".

El **Enfoque D (Híbrido de 3 capas)** es la recomendación:
1. Es viable en Canvas 2D sin WebGL
2. Produce kasure orgánico sin sistema separado
3. Captura los 7 principios artísticos del ensō
4. Cabe en el budget de performance (< 3ms/frame)
5. Es evolutivo sobre la arquitectura actual (no requiere rewrite total)

**Próximo paso:** Implementar un prototipo del Enfoque D, comenzando por la Capa 2 (fibras) ya que es el cambio con mayor impacto visual.

# Nexar Crucigrama

Juego de crucigramas en español sobre Argentina.

## Objetivo

- Tres niveles: Fácil, Medio y Pro.
- Crucigramas compactos y generados dinámicamente.
- Preguntas y respuestas variables en cada nueva partida.
- Fuente de preguntas desacoplada del motor.
- Puntaje e historial local para reducir repeticiones.
- Fallback local si la nube no está disponible.

## Arquitectura

- `index.html`: interfaz principal.
- `css/styles.css`: estilos.
- `js/app.js`: estado y eventos del juego.
- `js/crossword.js`: generación y validación de la cuadrícula.
- `js/questions.js`: acceso a preguntas remotas y fallback local.
- `api/questions.js`: Vercel Function activa, basada en Wikipedia en español y sin costo de IA.
- `api/questions-openai.js`: implementación OpenAI preservada para una fase futura; no la usa el juego actual.
- `api/health.js`: informa la fuente activa de preguntas.

## Fuente gratuita actual

La API activa consulta categorías públicas de Wikipedia en español relacionadas con Argentina, obtiene artículos y usa sus introducciones para construir pistas. Las respuestas se normalizan para crucigrama y se filtran por longitud, duplicados e historial reciente.

No se necesita tarjeta, saldo de OpenAI ni clave API para el flujo principal.

## OpenAI para más adelante

La integración anterior quedó guardada en `api/questions-openai.js`. Puede reactivarse en una fase futura si se quiere mejorar la redacción o agregar verificación/generación asistida por IA.

Las variables de entorno de OpenAI son opcionales y no intervienen en el MVP actual:

```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-5.6
```

Nunca subir `.env` ni `.env.local` al repositorio.

## Despliegue en Vercel

El proyecto funciona en Vercel sin framework y no necesita `vercel.json` para este MVP.

1. Importar `NexarSistemas/nexar-crucigrama` desde GitHub.
2. Mantener el framework como **Other** y la raíz en `./`.
3. No configurar Build Command ni Output Directory.
4. Probar primero la rama `feature/cloud-questions-api-v3` como Preview.

## Pruebas

Health check:

```text
/api/health
```

Debe informar `questionSource: "wikipedia-es"`.

Generación gratuita:

```text
/api/questions?level=facil
```

Debe devolver JSON con `source: "wikipedia-es"`, `level` y `questions`.

Después abrir la página principal y pulsar **Nuevo** varias veces. El frontend guarda respuestas recientes en `localStorage` y las envía como exclusiones para reducir repeticiones.

## Costos y robustez

- El flujo principal no consume OpenAI.
- Wikipedia es una fuente pública externa; puede aplicar límites o tener interrupciones puntuales.
- El fallback local permite seguir jugando si Wikipedia no responde o no produce suficientes preguntas válidas.
- El endpoint usa `no-store` para favorecer variedad entre partidas.

## Estado

MVP gratuito preparado para Preview en Vercel. La integración OpenAI queda preservada para una fase futura.

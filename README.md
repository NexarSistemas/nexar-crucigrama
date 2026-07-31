# Nexar Crucigrama

Juego de crucigramas en español sobre Argentina.

## Objetivo

- Tres niveles: Fácil, Medio y Pro.
- Crucigramas compactos y generados dinámicamente.
- Preguntas y respuestas variables en cada nueva partida.
- Fuente de preguntas desacoplada del motor.
- Claves privadas solo en backend.
- Puntaje e historial local para reducir repeticiones.
- Fallback local si la nube no está disponible.

## Arquitectura

- `index.html`: interfaz principal.
- `css/styles.css`: estilos.
- `js/app.js`: estado y eventos del juego.
- `js/crossword.js`: generación y validación de la cuadrícula.
- `js/questions.js`: acceso a preguntas remotas y fallback local.
- `api/questions.js`: Vercel Function que genera preguntas con OpenAI y búsqueda web.
- `api/health.js`: health check sin consumo de OpenAI.

## Variables de entorno

Copiar `.env.example` a `.env.local` solo para desarrollo local.

```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-5.6
```

Nunca subir `.env` ni `.env.local` al repositorio.

## Despliegue en Vercel

El proyecto está preparado para Vercel sin framework y no necesita `vercel.json` para este MVP.

1. En Vercel, elegir **Add New > Project**.
2. Importar `NexarSistemas/nexar-crucigrama` desde GitHub.
3. Mantener el framework como **Other** y la raíz del proyecto en `./`.
4. No configurar Build Command ni Output Directory.
5. En **Environment Variables**, agregar:
   - `OPENAI_API_KEY`: clave privada de OpenAI.
   - `OPENAI_MODEL`: opcional; si se omite se usa `gpt-5.6`.
6. Para probar esta rama antes de producción, desplegar la rama `feature/cloud-questions-api-v3` como Preview.

## Pruebas después del deploy

Primero comprobar el backend sin gastar una llamada a OpenAI:

```text
/api/health
```

Debe responder con `ok: true`. `openaiConfigured` debe ser `true` cuando la variable `OPENAI_API_KEY` esté configurada.

Después probar:

```text
/api/questions?level=facil
```

Debe devolver JSON con `source`, `level` y `questions`.

Finalmente abrir la página principal y pulsar **Nuevo** varias veces. El frontend guarda respuestas recientes en `localStorage` y las envía como exclusiones para reducir repeticiones.

## Seguridad y costos

- `OPENAI_API_KEY` nunca se expone al navegador.
- El endpoint no tiene caché porque cada partida busca variedad.
- El fallback local permite seguir jugando si OpenAI o la función fallan.
- Antes de hacer público el sitio a gran escala conviene agregar protección adicional contra abuso/rate limiting, porque cada llamada válida a `/api/questions` puede consumir API de OpenAI.

## Estado

MVP preparado para Preview en Vercel. La integración dinámica está en una Draft PR hasta validar el endpoint desplegado y el consumo real.

<!-- preview-trigger: 2026-07-31 -->

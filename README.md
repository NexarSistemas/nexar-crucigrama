# Nexar Crucigrama

Juego de crucigramas en español sobre Argentina.

## Objetivo

- Tres niveles: Fácil, Medio y Pro.
- Crucigramas compactos y generados dinámicamente.
- Preguntas y respuestas variables en cada nueva partida.
- Fuente de preguntas desacoplada del motor para poder consumir una API/backend sin exponer claves en el navegador.
- Puntaje e historial local para reducir repeticiones.

## Arquitectura

- `index.html`: interfaz principal.
- `css/styles.css`: estilos.
- `js/app.js`: estado y eventos del juego.
- `js/crossword.js`: generación y validación de la cuadrícula.
- `js/questions.js`: acceso a la fuente de preguntas.
- `api/`: backend/serverless para obtener, generar y validar preguntas (siguiente fase).

## Estado

Base inicial del proyecto. La siguiente fase es conectar una fuente dinámica de preguntas sobre Argentina y mantener un fallback local para que el juego siga funcionando si la API no está disponible.

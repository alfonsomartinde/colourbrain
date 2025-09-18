# ColourBrain Twitch — Monorepo (backend + 3 apps Angular)

Repositorio con 4 proyectos:
- backend-app: API en PHP 8.2 (Slim 4) + MySQL + SSE
- presenter-app: interfaz del presentador (Angular 20)
- player-app: interfaz de los jugadores (Angular 20)
- board-app: marcador/escena para OBS 1920x1080 (Angular 20)

Documentación funcional/técnica: ver `docs/colourbrain-spec.md`
SQL de ejemplo: ver `docs/SQL Dump.sql`

## Requisitos
- Node.js 20+ y npm 10+
- Angular CLI 20+ (opcional si usas los scripts npm): `npm i -g @angular/cli`
- PHP 8.2+
- Composer 2+
- MySQL 8+
- Git

## Estructura del repositorio
```
backend-app/        # API PHP (Slim 4) + SSE + control de estado
board-app/          # OBS/Marcador (Angular)
player-app/         # Jugadores (Angular)
presenter-app/      # Presentador (Angular)
docs/               # Especificación y SQL
```

## Instalación
1) Clonar e instalar dependencias
```
# En la raíz del repo
cd backend-app && composer install && cd ..
cd board-app && npm ci && cd ..
cd player-app && npm ci && cd ..
cd presenter-app && npm ci && cd ..
```

2) Configurar base de datos y variables de entorno (backend)
- Crea una BBDD MySQL (por ejemplo `colourbrain`)
- Crea el archivo `backend-app/.env` con este contenido base:
```
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=colourbrain
DB_USERNAME=root
DB_PASSWORD=
# Duración de turno (segundos)
TURN_DURATION_SECONDS=90
```

3) Importar datos de ejemplo
```
# Desde MySQL CLI o interfaz gráfica
# Usa el archivo: docs/SQL Dump.sql
```

## Ejecución en desarrollo
1) Backend (PHP built-in server)
```
cd backend-app
composer start  # levanta en http://localhost:8080
```
Páginas de prueba:
- `http://localhost:8080/test-sse.html` (SSE simple)
- `http://localhost:8080/test-sse.php` (script SSE)

Endpoints principales (ver rutas completas en `backend-app/src/routes/Routes.php`):
- `GET /api/colors`
- `GET /api/players`
- `GET /api/state`
- `GET /api/answers/current`
- `GET /api/reveal/current`
- `GET /api/history`
- `GET /api/events/stream` (SSE)
- `PATCH /api/players/{id}`
- `POST /api/player/answer`
- `POST /api/presenter/start-game`
- `POST /api/presenter/start-turn`
- `POST /api/presenter/show-correct`

2) Frontends (tres servidores de desarrollo Angular)
En tres terminales separadas:
```
cd presenter-app && npm start
cd player-app     && npm start
cd board-app      && npm start
```
URLs por defecto:
- Presentador: `http://localhost:4200`
- Jugador: `http://localhost:4201`
- Marcador/OBS: `http://localhost:4202`

Nota: Si tus apps necesitan apuntar al backend en una URL distinta a `http://localhost:8080`, ajusta las llamadas HTTP donde corresponda (ver `src/app/shared/` de cada app).

## Build producción
```
# Backend: no requiere build (PHP). Despliega el directorio backend-app/ (document root = backend-app/public)
# Angular (cada app):
cd presenter-app && npm run build
cd player-app && npm run build
cd board-app && npm run build
```
Los artefactos quedan en `presenter-app/dist/`, `player-app/dist/`, `board-app/dist/`. Puedes servirlos con cualquier servidor estático (Nginx/Apache) o hostearlos aparte del backend.

## Configuración y variables
Backend (`backend-app/.env`):
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `TURN_DURATION_SECONDS` (por defecto 90)

## Solución de problemas
- Error de conexión a MySQL: revisa `backend-app/.env` y que la BBDD exista; importa `docs/SQL Dump.sql`
- CORS desde frontends: ejecutando todo en localhost (puertos distintos) suele funcionar; si necesitas cabeceras CORS, añade middleware en backend
- Varios dev servers Angular: usa puertos distintos con `--port`

## Licencia
Ver `LICENSE` en la raíz.

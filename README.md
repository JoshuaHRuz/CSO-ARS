# CSO ARS — Automatic Reception System (Angular 20 Standalone)

This repository implements a dark-themed executive dashboard for platform delivery tracking based on the original CSO ARS requirements. It is adapted to the current environment and dependencies (Angular 20 standalone + Angular Material for date pickers; custom CSS charts — no chart libs).

Important adaptation vs original prompt:
- Uses Angular 20 standalone APIs (no NgModules).
- Angular Material is used selectively for interactive date range picker and form-field; charts remain custom (CSS/SVG), no ng2-charts or chart.js.
- Assets are served from `public/` (Angular 20 app builder). A palette-compliant SVG logo is provided at `public/assets/CSO_Secure_logo.svg`. 

## Features
- Mock authentication (any non-empty user/pass)
- Auth guard protecting the dashboard
- Shell layout with header, sidenav, and content
- Dashboard with:
  - KPI cards: Entregadas, En proceso y en tiempo, En proceso y fuera de tiempo
  - Filters: multi-select areas (checkboxes) and optional date range
  - Grouped bars chart (custom HTML/CSS) for “En tiempo vs Fuera de tiempo por Área”
  - Donut chart (SVG) for distribution by delivery type
- Global dark theme and utility classes
- In-memory data service producing 30–60 varied records and computing SLA-based deadlines
- Basic unit tests for DeliveryService

## Run locally
1. Install dependencies
```
npm i
```
2. Start dev server
```
ng serve
```
3. Open http://localhost:4200

Credentials: any non-empty user/password.

## Project structure (key parts)
- src/app/core/auth/
  - auth.service.ts — localStorage-based login/logout/isAuthenticated
  - auth.guard.ts — standalone CanActivateFn, redirects to /login if not authenticated
- src/app/layout/
  - shell.component.ts — header (logo + title + logout), sidenav and router-outlet
- src/app/features/login/
  - login.component.ts — centered login card
- src/app/features/dashboard/
  - dashboard.component.ts — KPIs, filters, custom charts
- src/app/services/
  - delivery.service.ts — mock data, KPIs, area aggregation, type distribution
  - delivery.service.spec.ts — basic tests
- src/app/models/
  - platform-delivery.model.ts — domain types
- src/app/
  - app.routes.ts — routes (login, dashboard guarded, root redirect by auth)
  - app.config.ts — provideRouter(routes)
  - app.ts — root component with inline <router-outlet>
- public/assets/CSO_Secure_logo.svg — branding logo
- src/styles.css — global dark theme tokens and utilities

## Theming and utilities
Global styles (src/styles.css) define CSS variables, cards, buttons, and simple layout/grid helpers to ensure a non-generic, branded dark UI:
- Tokens: --cso-bg, --cso-surface, --cso-primary, --cso-orange-a/b, --cso-text, etc.
- Utilities: .cso-card, .kpi-card, .cso-btn, .cso-gradient, .text-muted-contrast, .grid, .cso-toolbar, .cso-sidenav, .chart-panel

## Business logic
- SLA days: Manual=90, Semi-digital=21, Full-digital=3 (applied to fechaSolicitud when fechaCompromiso missing)
- KPIs:
  - Entregadas: status === 'Entregada'
  - En proceso y en tiempo: status === 'En proceso' && now <= fechaCompromiso
  - En proceso y fuera de tiempo: status === 'En proceso' && now > fechaCompromiso

## Notes
- Icons are presented using simple shapes/SVG placeholders to avoid adding external dependencies. You can replace them with Material Icons when using Angular Material.
- If you want Bootstrap/Material/ng2-charts, install them and integrate with the same UI structure and styles.


## Backend (opcional) — cómo montarlo y contratos de respuesta
Aunque la app funciona con datos mock en memoria, puedes montar un backend real con los siguientes endpoints. Ejemplo con Node.js + Express.

### Pasos rápidos (Express)
1) Crear proyecto
```
mkdir cso-ars-api && cd cso-ars-api
npm init -y
npm i express cors
```
2) server.js (ejemplo mínimo)
```
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// Tipos
// Area: [
//  'Arquitectura','Ciberseguridad','Gobierno, riesgo y cumplimiento (GRC)',
//  'Gestión de accesos','Seguridad de aplicaciones','Seguridad en la nube','Seguridad e infraestructura'
// ]
// DeliveryType: 'Manual' | 'Semi-digital' | 'Full-digital'
// DeliveryStatus: 'Entregada' | 'En proceso'

// Endpoints
app.get('/api/deliveries', (req, res) => {
  // Retornar lista de entregas (PlatformDelivery[])
  // { id, nombrePlataforma, area, tipo, fechaSolicitud(YYYY-MM-DD), fechaCompromiso?, fechaEntrega?, status, observaciones? }
  res.json([]);
});

app.get('/api/kpis', (req, res) => {
  // { entregadas: number; procesoEnTiempo: number; procesoFueraTiempo: number }
  res.json({ entregadas: 0, procesoEnTiempo: 0, procesoFueraTiempo: 0 });
});

app.get('/api/area-agg', (req, res) => {
  // Opcional: filtrar por áreas ?areas=A&areas=B (repetible)
  // [{ area, enTiempo, fueraTiempo }]
  res.json([]);
});

app.get('/api/type-distribution', (req, res) => {
  // [{ tipo: 'Manual'|'Semi-digital'|'Full-digital', total }]
  res.json([]);
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));
```
3) Ejecutar
```
node server.js
```

### Contratos esperados por el frontend
- GET /api/deliveries → PlatformDelivery[]
```
[
  {
    "id": "1",
    "nombrePlataforma": "Plataforma 1",
    "area": "Arquitectura",
    "tipo": "Manual",
    "fechaSolicitud": "2025-01-10",
    "fechaCompromiso": "2025-04-10", // si falta, el frontend calcula según SLA
    "fechaEntrega": "2025-02-15",     // opcional (solo si Entregada)
    "status": "Entregada",
    "observaciones": "Texto opcional"
  }
]
```
- GET /api/kpis →
```
{ "entregadas": 12, "procesoEnTiempo": 8, "procesoFueraTiempo": 5 }
```
- GET /api/area-agg?areas=Arquitectura&areas=Ciberseguridad →
```
[
  { "area": "Arquitectura", "enTiempo": 3, "fueraTiempo": 1 },
  { "area": "Ciberseguridad", "enTiempo": 2, "fueraTiempo": 4 }
]
```
- GET /api/type-distribution →
```
[
  { "tipo": "Manual", "total": 10 },
  { "tipo": "Semi-digital", "total": 7 },
  { "tipo": "Full-digital", "total": 8 }
]
```

Notas de negocio y SLA (como en el servicio mock):
- SLA: Manual +90 días, Semi-digital +21 días, Full-digital +3 días.
- KPIs: Entregadas (status==='Entregada'), En proceso y en tiempo (status==='En proceso' && now<=fechaCompromiso), En proceso y fuera de tiempo (status==='En proceso' && now>fechaCompromiso).
- Si el backend no envía fechaCompromiso, el frontend la calcula desde fechaSolicitud + SLA.


## Registration and secure passwords
- You can create a new account from the Login screen via "Crear cuenta".
- Password policy enforced:
  - At least 8 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one symbol (non-alphanumeric)
- Security & behavior:
  - Credentials are stored only in the browser (localStorage) with per-user random salt and SHA-256 password hashing (base64).
  - When no users are registered, the app runs in demo mode and accepts any non-empty credentials.
  - After you register the first user, login requires the exact username and password.

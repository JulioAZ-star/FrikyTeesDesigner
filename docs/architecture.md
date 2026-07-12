# Arquitectura objetivo de FrikyTeesDesigner

## 1. Objetivo

FrikyTeesDesigner debe evolucionar desde el prototipo actual a una aplicación de producción para personalización de productos de Friky+Tees, preparada para crecer en catálogo, complejidad del editor e integraciones externas.

La plataforma debe permitir:

- soportar múltiples productos: camisetas, sudaderas, tazas, posters, lienzos, gorras, pegatinas y futuros productos;
- trabajar con varias caras por producto: frontal, trasera, mangas, laterales, interior, etc.;
- definir varias zonas imprimibles por cara;
- editar imágenes, texto y capas;
- bloquear, duplicar, agrupar y ordenar objetos;
- deshacer y rehacer;
- zoom, reglas y guías;
- exportación PNG;
- exportación técnica para impresión;
- integración futura con Wix sin rehacer la arquitectura.

---

## 2. Principios de arquitectura

1. **Separación clara entre dominio, editor e infraestructura.**
2. **Modelo basado en configuración**, para añadir productos sin reescribir lógica.
3. **Editor desacoplado del canal de venta**, para reutilizarlo dentro de Wix, web propia o backoffice.
4. **Monorepo modular**, para compartir modelos, UI y lógica de exportación.
5. **Escalabilidad horizontal**, para soportar más productos, más reglas y más exportaciones.
6. **Preparación para producción**, con tipado fuerte, validación, observabilidad y testing.

---

## 3. Arquitectura general propuesta

Se recomienda migrar a una arquitectura por capas dentro de un **monorepo TypeScript**:

```text
FrikyTeesDesigner/
├── apps/
│   ├── editor-web/                 # Editor principal embebible
│   ├── admin-studio/               # Gestión interna de productos, plantillas y activos
│   └── api/                        # Backend HTTP / jobs / exportación
├── packages/
│   ├── domain/                     # Modelos y reglas de negocio
│   ├── editor-engine/              # Estado, comandos, historial, reglas del editor
│   ├── renderer-konva/             # Adaptador de renderizado canvas
│   ├── ui-kit/                     # Componentes visuales reutilizables
│   ├── product-catalog/            # Carga y validación de productos
│   ├── export-engine/              # Exportación PNG y paquetes de impresión
│   ├── integrations-wix/           # SDK/adaptadores para Wix
│   ├── shared/                     # Utilidades transversales
│   └── schemas/                    # JSON schemas / validaciones
├── docs/
│   ├── architecture.md
│   ├── product-model.md
│   └── integration-wix.md
├── infra/
│   ├── docker/
│   ├── ci/
│   └── observability/
└── tests/
    ├── e2e/
    ├── integration/
    └── fixtures/
```

### Decisión tecnológica recomendada

- **Frontend editor**: React + TypeScript + Vite.
- **Estado**: store central con acciones/comandos y soporte de undo/redo.
- **Canvas**: Konva como adaptador de renderizado inicial.
- **Backend**: Node.js + TypeScript.
- **Persistencia**: PostgreSQL para catálogo, plantillas, sesiones y exports.
- **Almacenamiento de activos**: S3 o equivalente.
- **Colas de trabajo**: para exportaciones pesadas y preparación de impresión.

El punto clave no es la herramienta exacta sino mantener la separación entre:

- **modelo del producto**,
- **modelo del documento de diseño**,
- **motor del editor**,
- **adaptadores de renderizado/exportación**.

---

## 4. Estructura de carpetas detallada

### 4.1 `apps/editor-web`

Aplicación web principal que renderiza el editor y podrá incrustarse más adelante en Wix.

```text
apps/editor-web/src/
├── app/
│   ├── bootstrap/
│   ├── router/
│   ├── providers/
│   └── store/
├── features/
│   ├── catalog/
│   ├── product-selection/
│   ├── editor-shell/
│   ├── layers-panel/
│   ├── toolbar/
│   ├── inspector/
│   ├── history/
│   ├── guides/
│   ├── export/
│   └── pricing/
├── modules/
│   ├── canvas/
│   ├── surfaces/
│   ├── print-areas/
│   ├── text/
│   ├── images/
│   ├── transforms/
│   └── snapping/
├── services/
│   ├── api-client/
│   ├── asset-upload/
│   ├── export-client/
│   └── wix-bridge/
├── components/
├── hooks/
├── styles/
└── main.tsx
```

### 4.2 `apps/api`

Backend para catálogo, sesiones, assets, plantillas y exportación.

```text
apps/api/src/
├── modules/
│   ├── auth/
│   ├── products/
│   ├── design-sessions/
│   ├── assets/
│   ├── exports/
│   ├── templates/
│   └── integrations/
├── jobs/
│   ├── export-png/
│   ├── export-print/
│   └── asset-processing/
├── domain/
├── infra/
└── main.ts
```

### 4.3 `packages/domain`

Contendrá las entidades puras del negocio:

- `ProductDefinition`
- `SurfaceDefinition`
- `PrintAreaDefinition`
- `DesignDocument`
- `LayerNode`
- `TextLayer`
- `ImageLayer`
- `ExportProfile`

Sin dependencias de UI o Konva.

### 4.4 `packages/editor-engine`

Motor del editor:

- store del documento activo;
- comandos (`addLayer`, `moveLayer`, `lockLayer`, `duplicateLayer`, etc.);
- historial undo/redo;
- selección;
- snapping a guías;
- validaciones de zonas imprimibles;
- serialización.

### 4.5 `packages/renderer-konva`

Adaptador de renderizado:

- traduce el documento del editor a nodos Konva;
- maneja selección visual;
- overlays de reglas, guías y bounding boxes;
- no contiene reglas de negocio.

### 4.6 `packages/product-catalog`

Responsable de:

- cargar definiciones de productos;
- validarlas con schemas;
- resolver variantes y caras;
- exponer una API uniforme al editor.

### 4.7 `packages/export-engine`

Responsable de:

- exportar PNG de preview;
- generar arte final por cara y zona imprimible;
- empaquetar metadatos para impresión;
- aplicar perfiles de exportación por producto.

### 4.8 `packages/integrations-wix`

Responsable de:

- recibir contexto del host;
- enviar eventos al contenedor Wix;
- exponer API de inicialización embebida;
- adaptar autenticación, producto seleccionado y callbacks.

---

## 5. Módulos funcionales del producto

### 5.1 Catálogo de productos

Funciones:

- listar productos disponibles;
- cargar definición completa de un producto;
- resolver variantes (color, talla, material);
- exponer caras y zonas imprimibles.

Debe funcionar sobre definiciones configurables, no hardcodeadas.

### 5.2 Editor de documento

Funciones:

- crear documento de diseño a partir de un producto;
- mantener el estado por cara;
- gestionar selección, edición y orden de capas;
- aplicar límites y reglas del producto.

### 5.3 Capas y objetos

Tipos previstos:

- imagen;
- texto;
- grupo;
- shape técnico o máscara si en el futuro hiciera falta.

Capacidades:

- mover;
- redimensionar;
- rotar;
- bloquear;
- ocultar;
- duplicar;
- reordenar;
- agrupar.

### 5.4 Tipografía

Funciones:

- insertar texto;
- editar contenido, fuente, tamaño, color, alineación, interlineado;
- curvado o estilos avanzados en una fase futura.

### 5.5 Imágenes y activos

Funciones:

- subida;
- validación de formato y resolución;
- recorte básico;
- reescalado;
- reemplazo;
- persistencia de activos.

### 5.6 Guías, reglas y snapping

Funciones:

- reglas horizontales y verticales;
- guías manuales;
- guías automáticas por centros, bordes y print areas;
- imanes configurables.

### 5.7 Historial

Basado en patrón comando:

- cada acción del usuario genera un comando;
- el historial guarda `undo` y `redo`;
- permite trazabilidad y futuras analíticas de uso.

### 5.8 Exportación

Dos salidas principales:

1. **Preview comercial**
   - PNG/JPEG para mostrar en tienda o carrito.

2. **Salida de producción**
   - archivos por cara y por zona;
   - resolución adecuada;
   - metadatos técnicos;
   - nombre interno, referencias y posicionamiento.

---

## 6. Comunicación entre módulos

Se propone una comunicación basada en contratos explícitos:

```text
UI -> Editor Engine -> Domain Model
                -> Renderer Adapter
                -> Export Engine
                -> API Client
```

### Reglas de comunicación

1. **La UI no modifica Konva directamente.**
   - La UI dispara acciones o comandos.

2. **El motor del editor es la única fuente de verdad del documento.**
   - Estado, selección e historial viven aquí.

3. **El renderer solo representa estado.**
   - No decide reglas de negocio.

4. **El catálogo entrega definiciones de producto inmutables.**
   - El editor las consume, no las muta.

5. **Las exportaciones usan el documento serializado.**
   - No dependen del árbol visual de la UI.

### Patrones recomendados

- **Command Pattern** para acciones del editor.
- **Adapter Pattern** para renderers e integraciones.
- **Schema Validation** para productos y documentos.
- **Event Bus interno** para eventos del editor si fuese necesario.

---

## 7. Flujo de la aplicación

### 7.1 Flujo principal de edición

```text
1. El usuario abre el editor
2. Se carga el catálogo o el producto seleccionado
3. Se resuelve la definición del producto
4. Se crea un DesignDocument vacío o se recupera uno guardado
5. El editor muestra caras, zonas y herramientas
6. El usuario añade imágenes/texto/capas
7. Cada acción se guarda como comando
8. El renderer actualiza la vista
9. El usuario exporta preview o arte final
10. El sistema genera archivos y metadatos
```

### 7.2 Flujo de carga de producto

```text
Product ID / SKU
  -> Product Catalog
  -> ProductDefinition
  -> Superficies
  -> Print Areas
  -> Reglas del producto
  -> Inicialización del DesignDocument
```

### 7.3 Flujo de exportación

```text
DesignDocument
  -> Validación
  -> Resolución por cara y zona
  -> Render final
  -> Empaquetado
  -> Descarga / envío al backend / almacenamiento
```

### 7.4 Flujo de integración futura con Wix

```text
Wix page/app
  -> iframe o componente embebido
  -> wix-bridge
  -> editor-web
  -> api
  -> retorno de eventos: producto, preview, estado, export
```

---

## 8. Modelo de datos

### 8.1 Producto

```ts
ProductDefinition
- id
- slug
- name
- category
- description
- variants[]
- surfaces[]
- exportProfiles[]
- constraints
```

#### `variants[]`

- color
- talla
- material
- acabado
- SKU
- precio base

#### `surfaces[]`

Cada producto puede tener varias caras:

- frontal
- trasera
- manga izquierda
- manga derecha
- lateral
- interior

```ts
SurfaceDefinition
- id
- name
- mockupAsset
- width
- height
- printAreas[]
- guides[]
```

#### `printAreas[]`

```ts
PrintAreaDefinition
- id
- name
- shape
- x
- y
- width
- height
- rotation
- bleed
- safeArea
- allowedLayerTypes[]
- constraints
```

Esto permite modelar fácilmente camisetas, tazas, gorras o posters sin cambiar el motor.

### 8.2 Documento de diseño

```ts
DesignDocument
- id
- productId
- variantId
- status
- surfaces[]
- metadata
- version
- createdAt
- updatedAt
```

#### `surfaces[]` del documento

```ts
DesignSurfaceState
- surfaceId
- layers[]
- guides[]
- viewport
```

### 8.3 Capas

```ts
LayerNode
- id
- type            // image | text | group
- name
- locked
- visible
- opacity
- rotation
- position
- dimensions
- transform
- zIndex
- printAreaId
```

#### Capa de imagen

```ts
ImageLayer
- assetId
- src
- originalWidth
- originalHeight
- crop
- filters
```

#### Capa de texto

```ts
TextLayer
- text
- fontFamily
- fontSize
- fontWeight
- lineHeight
- letterSpacing
- textAlign
- fill
- stroke
```

### 8.4 Historial

```ts
EditorHistory
- undoStack[]
- redoStack[]
```

Cada item guarda:

- comando;
- payload mínimo;
- timestamps;
- contexto de superficie.

### 8.5 Exportación

```ts
ExportJob
- id
- designId
- type              // png-preview | print-ready
- status
- surfaces[]
- outputFiles[]
- errors[]
```

---

## 9. Cómo añadir nuevos productos en el futuro

La arquitectura debe permitir dar de alta nuevos productos mediante configuración y activos, no mediante cambios profundos en el editor.

### Proceso esperado

1. Crear definición del producto.
2. Definir variantes.
3. Definir superficies.
4. Definir print areas.
5. Asociar mockups y perfiles de exportación.
6. Validar schema.
7. Publicar en catálogo.

### Ejemplos

- **Camiseta**: frontal, trasera, mangas.
- **Sudadera**: frontal, trasera, capucha, mangas.
- **Taza**: superficie continua o izquierda/derecha según impresión.
- **Poster**: una cara, una o varias zonas.
- **Lienzo**: frontal y opcionalmente borde extendido.
- **Gorra**: frontal curvo con limitaciones de área.
- **Pegatina**: una cara con troquel futuro como capacidad adicional.

El motor no debe saber “qué es una camiseta”; solo debe saber interpretar superficies, zonas y reglas.

---

## 10. Escalabilidad futura

### 10.1 Escalabilidad funcional

La arquitectura permite añadir:

- nuevos productos;
- nuevas herramientas del editor;
- nuevas integraciones;
- nuevas salidas de exportación;
- precios dinámicos y reglas comerciales.

### 10.2 Escalabilidad técnica

Separando frontend, motor, catálogo y exportación se podrá:

- cachear catálogos;
- procesar exportaciones en background;
- almacenar activos en infraestructura externa;
- medir rendimiento de operaciones pesadas;
- evolucionar el renderer en el futuro si Konva dejara de ser suficiente.

### 10.3 Escalabilidad organizativa

Los equipos podrán trabajar por áreas:

- equipo editor;
- equipo catálogo/producto;
- equipo backend/exportación;
- equipo integraciones.

---

## 11. Fases recomendadas de evolución

### Fase 1: Base sólida del editor

- TypeScript;
- estructura modular;
- catálogo configurable;
- imágenes, texto y capas;
- undo/redo;
- varias caras;
- varias zonas imprimibles.

### Fase 2: Herramientas profesionales

- bloqueo;
- duplicado;
- reglas;
- guías;
- snapping;
- panel de capas;
- zoom avanzado.

### Fase 3: Producción e integración

- exportación técnica;
- guardado de sesiones;
- plantillas;
- API;
- integración Wix.

### Fase 4: Escala de negocio

- backoffice de productos;
- pricing engine;
- analítica;
- multiidioma;
- multi-tenant o multi-marca si Friky+Tees lo necesitara.

---

## 12. Recomendaciones clave antes de escribir código

1. **Definir el modelo de producto y documento antes que la UI.**
2. **Elegir un store central con historial desde el inicio.**
3. **No acoplar la lógica al renderer Konva.**
4. **Diseñar la exportación como módulo independiente.**
5. **Tratar la integración con Wix como un adaptador externo.**
6. **Construir el catálogo de productos desde schemas versionados.**

---

## 13. Resultado esperado

Si se sigue esta arquitectura, FrikyTeesDesigner pasará de ser un prototipo estático a una plataforma de personalización:

- robusta;
- extensible;
- preparada para producción;
- lista para soportar nuevos productos sin rehacer el editor;
- preparada para integrarse después en Wix.

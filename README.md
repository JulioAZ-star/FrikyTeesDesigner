# FrikyTeesDesigner

Personalizador de productos para Friky+Tees.

## Documentación

- [Arquitectura objetivo del editor](docs/architecture.md)

## Integracion Wix

El editor emite dos mensajes al pulsar "Añadir al carrito":

- `frikytees:add-to-cart`
- `wix:addToCart`

Ambos incluyen el mismo `payload` con `productId`, `faceId`, `color`, `size` y `design`.

Opciones de integracion:

- Desde el host, escuchar `postMessage` y ejecutar la logica de carrito de Wix.
- Definir `window.frikyteesAddToCart = async (payload) => { ... }` antes de inicializar el editor.

Configuracion por query params:

- `mode=client` o `clientMode=true`: activa modo cliente.
- `wixTargetOrigin=https://tu-dominio`: restringe el `postMessage` de salida.

Mensajes de entrada soportados:

- `frikytees:wix-context` con `payload.targetOrigin`
- `frikytees:set-client-mode` con `payload.enabled`

## Atajos y navegacion de canvas

- `Ctrl+0`: reset de zoom/pan.
- `Rueda del raton`: zoom centrado en puntero.
- `Barra espaciadora (mantener) + arrastrar`: pan temporal del canvas.

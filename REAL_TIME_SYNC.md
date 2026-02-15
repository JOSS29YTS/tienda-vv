# Sistema de Sincronización en Tiempo Real - Ventas

## Problema Resuelto

Anteriormente, las ventas se guardaban solo en el `localStorage` del navegador de cada usuario. Esto causaba que:
- El vendedor veía solo sus propias ventas en su navegador
- El administrador NO podía ver lo que el vendedor estaba haciendo
- Solo cuando se hacía "Cerrar Venta del Día" se enviaban al servidor

**Esto era crítico** porque el administrador necesita ver en tiempo real lo que el vendedor está haciendo para poder cerrar la venta.

## Solución Implementada

### 1. Nueva Tabla en la Base de Datos

Se creó la tabla `venta_borrador` para almacenar las ventas en progreso:

```sql
CREATE TABLE venta_borrador (
    id_venta_borrador INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    datos_venta JSON NOT NULL,
    tasa_dia DECIMAL(10, 2) NOT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);
```

### 2. Nuevos Endpoints en el Backend

**POST /api/sales/draft** - Guardar borrador de ventas
- Guarda las ventas en progreso del usuario actual
- Elimina el borrador anterior del mismo día antes de guardar el nuevo

**GET /api/sales/draft** - Obtener todos los borradores del día
- Retorna todos los borradores de ventas del día actual
- Incluye información del usuario que creó cada borrador

### 3. Sincronización Automática en el Frontend

#### Para el Vendedor:
- Cada vez que agrega/modifica una fila, se guarda automáticamente en el servidor (con debounce de 1 segundo)
- Cada 3 segundos, consulta el servidor para obtener sus propias ventas
- Solo ve y edita sus propias filas

#### Para el Administrador:
- Ve TODAS las filas de TODOS los vendedores en tiempo real
- Cada 3 segundos, consulta el servidor para obtener todas las ventas
- Puede identificar qué vendedor agregó cada fila (columna "VENDEDOR" con indicador de color)
- Las filas de otros usuarios son de solo lectura
- Puede cerrar la venta de todos los vendedores

### 4. Flujo de Trabajo

1. **Vendedor agrega productos:**
   - Escanea código de barras o selecciona producto
   - La fila se guarda automáticamente en el servidor después de 1 segundo

2. **Administrador ve en tiempo real:**
   - Cada 3 segundos, la página se actualiza con las ventas de todos
   - Ve claramente qué vendedor agregó cada producto
   - Puede monitorear el progreso de las ventas

3. **Administrador cierra la venta:**
   - Hace clic en "Cerrar Venta del Día"
   - Se procesan TODAS las ventas de TODOS los vendedores
   - Se limpian automáticamente todos los borradores del día
   - Todos los usuarios ven la hoja limpia

### 5. Características Técnicas

- **Debounce**: Las ventas se guardan 1 segundo después del último cambio para evitar sobrecarga del servidor
- **Polling**: Se consulta el servidor cada 3 segundos para obtener actualizaciones
- **Prevención de conflictos**: Solo se actualiza si el contenido es diferente, evitando sobrescribir mientras el usuario escribe
- **Filtrado inteligente**: Solo se muestran filas con productos válidos (no filas vacías)
- **Limpieza automática**: Los borradores se eliminan automáticamente al cerrar la venta

## Ventajas

✅ **Tiempo Real**: El administrador ve inmediatamente lo que hace el vendedor
✅ **Sin Pérdida de Datos**: Todo se guarda en el servidor, no solo en el navegador
✅ **Multi-Usuario**: Múltiples vendedores pueden trabajar simultáneamente
✅ **Transparencia**: El administrador sabe exactamente quién agregó cada producto
✅ **Eficiencia**: El administrador puede cerrar la venta de todos desde un solo lugar

## Uso

### Como Vendedor:
1. Inicia sesión con tu cuenta de vendedor
2. Agrega productos normalmente (escaneando o seleccionando)
3. Tus ventas se guardan automáticamente
4. Continúa trabajando hasta que el administrador cierre la venta

### Como Administrador:
1. Inicia sesión con tu cuenta de administrador
2. Verás todas las ventas de todos los vendedores en tiempo real
3. La columna "VENDEDOR" muestra quién agregó cada producto
4. Cuando estés listo, haz clic en "Cerrar Venta del Día"
5. Todas las ventas se procesarán y la hoja se limpiará para todos

## Notas Técnicas

- El sistema usa **polling** (consultas periódicas) en lugar de WebSockets por simplicidad
- El intervalo de 3 segundos es un balance entre tiempo real y carga del servidor
- El debounce de 1 segundo evita guardar en cada tecla presionada
- Los borradores se eliminan automáticamente al cerrar la venta para mantener la BD limpia

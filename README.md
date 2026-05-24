# 🏪 Todas las Tiendas - Sistema Multi-Tienda y Multi-Rol (Bodega App)

Un sistema de gestión comercial moderno, multi-tienda y multi-rol diseñado para automatizar el inventario, control de compras, facturación, comisiones de vendedores y balances financieros (P&L) en tiempo real. 

El sistema está diseñado de forma híbrida para operar localmente con **MySQL** y escalar en producción utilizando **PostgreSQL** (Supabase).

---

## 🚀 Credenciales de Demostración (Demo Accounts)

Para probar la plataforma en tu despliegue de demostración o entorno local, puedes utilizar los siguientes usuarios autogenerados:

### 👤 1. Perfil: Administrador Global (Dueño)
* **Correo Electrónico:** `admin@admin.com`
* **Contraseña:** `admin123`
* **Permisos:** Acceso completo a todas las sucursales, balances financieros globales, comisiones de todas las tiendas, gestión de inventario global y configuración de tasa cambiaria.

### 👤 2. Perfil: Vendedor (Asignado a Tienda A)
* **Correo Electrónico:** `vendedor@vendedor.com`
* **Contraseña:** `vendedor123`
* **Permisos:** Registro de ventas de la Tienda A, consulta de inventario local, caja diaria del vendedor y visualización de comisiones ganadas de forma individual.

---

## ✨ Características Principales

* **🏢 Arquitectura Multi-Tienda:** Gestiona múltiples sucursales de forma aislada o consolidada.
* **🔑 Control de Acceso por Roles (RBAC):** Roles definidos para Administradores, Gerentes y Vendedores.
* **📈 Dashboard Financiero (P&L):** Gráficos dinámicos de ingresos, costos, comisiones, traspasos y ganancias netas.
* **📦 Control de Inventario & Ajustes:** Catálogo con códigos de barra, categorías y logs de ajuste de inventario.
* **🛡️ Seguridad & Estabilidad:**
  * **Rate Limiting:** Middleware personalizado en memoria que protege de ataques de fuerza bruta y abusos de email (Resend) en el login.
  * **Manejo Centralizado de Errores:** Middleware global de captura de excepciones en Express.
  * **Validación Robusta:** Integración de `express-validator` para tipado y formato seguro de datos.
  * **Pruebas Unitarias:** Blindaje con **Jest** para validaciones financieras de balances y fondos.
  * **CORS & Caché:** Control estricto de CORS y deshabilitador de caché en la API para garantizar datos en tiempo real.
* **🔌 Tiempo Real:** Notificaciones y sincronizaciones automáticas mediante **Socket.io**.

---

## 🛠️ Stack Tecnológico

### Backend (`/backend`)
* **Core:** Node.js, Express, Socket.io
* **Base de Datos:** PostgreSQL (Postgres/Supabase) y MySQL (Desarrollo local).
* **Seguridad & Calidad:** `express-validator`, `bcrypt`, `jsonwebtoken`, **Jest** para testing.
* **Servicios externos:** Resend (Correos transaccionales), WhatsApp Web API (Notificaciones).

### Frontend (`/frontend`)
* **Core:** React, Vite
* **Estilos:** CSS / TailwindCSS
* **Estructura:** Gestión de rutas responsiva y layouts fluidos.

---

## 💻 Instalación y Configuración Local

### 1. Requisitos Previos
* Node.js (v16 o superior) instalado.
* MySQL corriendo localmente.

### 2. Configurar el Backend
1. Ve al directorio del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno en un archivo `.env` en la raíz de `backend/`:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_contrasena_mysql
   DB_NAME=toda_las_tiendas_db
   JWT_SECRET=secreto_super_seguro
   ```
4. Inicializa la estructura de la base de datos:
   ```bash
   npm run init-db
   ```
5. **Alimenta el sistema con los datos demo (Usuarios, productos y ventas de prueba):**
   ```bash
   npm run seed
   ```
6. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### 3. Configurar el Frontend
1. Ve al directorio del frontend:
   ```bash
   cd ../frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el cliente de desarrollo:
   ```bash
   npm run dev
   ```

---

## 🧪 Pruebas Unitarias
Para correr la suite de pruebas automáticas de la lógica de balance financiero:
```bash
cd backend
npm test
```

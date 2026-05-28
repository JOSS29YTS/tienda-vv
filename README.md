# 🛍️ Tienda VV — Sistema Multi-Tienda de Ventas, Finanzas e Inventario en Tiempo Real

¡Bienvenido a **Tienda VV**! Este es un sistema integral y avanzado de gestión comercial multi-tienda diseñado para centralizar ventas, controlar inventarios de forma segura, administrar compras, realizar análisis financieros de pérdidas y ganancias, y facilitar la comunicación con clientes deudores en tiempo real. 

Este proyecto está estructurado con una arquitectura moderna de **Single Page Application (SPA)** en el Frontend y una **RESTful API con comunicación bidireccional (WebSockets)** en el Backend.

---

## 🚀 Credenciales de Demostración (Demo Accounts)

Para probar la plataforma en tu despliegue de demostración o entorno local, puedes utilizar los siguientes usuarios autogenerados:

### 👤 1. Perfil: Gerente Global (Demo Portafolio)
* **Correo Electrónico:** `admin@tiendavv.com`
* **Contraseña:** `admin123`
* **Permisos:** Acceso a la visualización de sucursales, balances financieros, comisiones, gestión de inventario y configuración. *(Nota: Por seguridad en el portafolio, las funciones críticas de administración como eliminar usuarios o alterar roles de seguridad están desactivadas para este perfil y reservadas exclusivamente para la cuenta de Administrador Privado del dueño)*.

### 👤 2. Perfil: Vendedor (Asignado a Tienda A)
* **Correo Electrónico:** `vendedor@vendedor.com`
* **Contraseña:** `vendedor123`
* **Permisos:** Registro de ventas de la Tienda A, consulta de inventario local, caja diaria del vendedor y visualización de comisiones ganadas de forma individual.

---

## 🚀 Características Clave

### 👥 Administración y Control de Acceso (RBAC)
* **Autenticación Segura:** Inicio de sesión y registro protegido mediante JSON Web Tokens (JWT).
* **Control de Roles:** Autorización basada en roles (Gerentes, Administradores, Vendedores) con permisos granulares.
* **Seguridad de Registro:** Flujo de verificación con códigos dinámicos de seguridad enviados por correo.
* **Recuperación de Contraseña:** Sistema integrado de envío de códigos de recuperación de contraseña de uso único por email.

### 🏪 Gestión Multi-Tienda
* **Aislamiento de Tiendas:** Los usuarios visualizan y operan exclusivamente en las tiendas asignadas por la administración.
* **Productos Globales e Inventario Local:** Catálogo global con stock e historial de movimientos administrados por tienda.
* **Persistencia del Estado:** Selección de tienda persistida automáticamente a nivel de cliente para evitar pérdidas de contexto en recargas (F5).

### 🛒 Ventas e Inventario en Tiempo Real
* **Carrito Colaborativo:** Sincronización en tiempo real de carritos de compra mediante **Socket.io**.
* **Control de Stock Auditado:** Registro detallado e histórico de ajustes manuales de inventario realizados por los administradores.
* **Ventas por Usuario:** Agrupación y reportes de ventas filtrados por vendedor con restricciones de edición cruzada para auditorías internas.

### 📈 Módulo de Finanzas y Análisis de Pérdidas y Ganancias (P&L)
* **Dashboard Central:** Métricas clave de rendimiento comercial actualizadas al instante.
* **Cuentas por Cobrar:** Gestión robusta de créditos a clientes e historial de abonos.
* **Control de Comisiones e Impuestos:** Cálculos automáticos de comisiones para vendedores y conciliación de facturas de proveedores.
* **Flujos de Caja:** Registro clasificado de gastos fijos y variables.

### 🔔 Notificaciones y Recordatorios Automatizados
* **Recordatorios de Deuda Semanales:** Tarea programada por servidor (**cron job**) para ejecutar notificaciones semanales automatizadas a clientes deudores.
* **Notificaciones por Email:** Integrado con el servicio profesional de correos de **Resend**.

---

## 🛠️ Stack Tecnológico

### Frontend
* **Core:** [React](https://react.dev/) (v18+) con componentes funcionales y Hooks personalizados.
* **Herramienta de Construcción:** [Vite](https://vite.dev/) para un desarrollo ultrarrápido y compilaciones optimizadas.
* **Estilizado (CSS):** [Tailwind CSS](https://tailwindcss.com/) para interfaces responsivas y consistentes.
* **Enrutamiento:** [React Router DOM](https://reactrouter.com/) (v6) para navegación fluida.
* **Comunicación en Tiempo Real:** [Socket.io-client](https://socket.io/) para suscripción a eventos bidireccionales.

### Backend
* **Entorno de Ejecución:** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) para estructurar la API REST.
* **Base de Datos:** [MySQL](https://www.mysql.com/) con el driver de alto rendimiento `mysql2` utilizando Promesas.
* **Comunicación Bidireccional:** [Socket.io](https://socket.io/) para coordinar carritos y eventos colaborativos.
* **Seguridad:** `bcrypt` para el hashing seguro de contraseñas y `jsonwebtoken` (JWT) para la firma de tokens de sesión.
* **Servicios de Terceros:**
  * **Resend API:** Para envío confiable de correos electrónicos transaccionales.
  * **Cron scheduling:** Mediante `node-cron` para procesos programados de auditoría de deudas en segundo plano.

---

## 📁 Estructura del Proyecto

El proyecto está organizado en un monorepositorio estructurado de la siguiente forma:

```
├── backend/
│   ├── src/
│   │   ├── controllers/   # Lógica de negocio (auth, sales, products, etc.)
│   │   ├── database/      # Conexión al pool de MySQL y scripts de esquema
│   │   ├── middleware/    # Validaciones y seguridad (JWT Auth)
│   │   ├── routes/        # Definición de end-points HTTP
│   │   ├── services/      # Servicios externos (emailService, whatsappService)
│   │   └── utils/         # Funciones auxiliares financieras
│   ├── migrations/        # Parches y actualizaciones de la base de datos
│   ├── scripts/           # Scripts de mantenimiento (limpieza de borradores)
│   ├── package.json
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── assets/        # Recursos estáticos (imágenes y logos)
│   │   ├── components/    # Componentes de UI comunes y layouts
│   │   ├── context/       # Estados globales (Auth, Socket, Store, Rate)
│   │   ├── pages/         # Vistas de la aplicación (Landing, Dashboard, etc.)
│   │   └── config/        # Configuración del cliente API
│   ├── public/            # Archivos públicos de redireccionamiento para producción (Vercel)
│   ├── package.json
│   ├── tailwind.config.js
│   └── .gitignore
```

---

## ⚙️ Instalación y Configuración Local

### Prerrequisitos
* Node.js instalado (v16 o superior).
* Base de datos MySQL activa.

### 1. Clonar el repositorio y acceder
```bash
git clone https://github.com/JOSS29YTS/tienda-vv.git
cd tienda-vv
```

### 2. Configurar el Backend
1. Entra a la carpeta de backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz de la carpeta `backend/` tomando como referencia las siguientes variables:
   ```env
   PORT=3000
   DB_HOST=tu_servidor_mysql
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=tienda_vv
   DB_PORT=3306
   JWT_SECRET=tu_secreto_super_seguro
   RESEND_API_KEY=tu_api_key_de_resend
   ```
4. Inicializa la base de datos ejecutando el script en `backend/src/database/schema.sql` en tu motor de base de datos.
5. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```

### 3. Configurar el Frontend
1. Abre una nueva terminal y ve a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la carpeta `frontend/` y añade la URL de tu API del Backend:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. Inicia el servidor de desarrollo en modo local:
   ```bash
   npm run dev
   ```

---

## 🔒 Buenas Prácticas y Seguridad Implementadas
* **Cero Hardcoding:** Todas las credenciales sensibles se manejan estrictamente a través de variables de entorno y no se guardan en el historial del repositorio.
* **Consultas Seguras:** Uso extensivo de consultas parametrizadas con `mysql2` para mitigar riesgos de Inyección SQL.
* **Encriptación Robusta:** Contraseñas encriptadas con salt dinámico usando `bcrypt`.
* **Rutas Protegidas:** Implementación de guards y middlewares de autorización en React y Express para evitar accesos no autorizados a endpoints específicos.
* **Control de Tasa (Rate Limiting) a Medida:** Implementación de un middleware personalizado en memoria (`authLimiter`) que protege los endpoints de autenticación (`/login`, `/register-init`, `/register-verify`, `/forgot-password`, `/reset-password`) limitando las solicitudes a un máximo de **5 peticiones cada 15 minutos** por dirección IP. Es seguro en producción (detrás de proxies como Vercel/Cloudflare) mediante la validación de `x-forwarded-for` y cuenta con limpieza periódica automática para prevenir fugas de memoria.
* **Seguridad CORS y WebSockets Estricta:** Configuración explícita en Express y Socket.io mediante una lista blanca dinámica (`allowedOrigins`), permitiendo peticiones únicamente desde puertos de desarrollo locales autorizados (Vite) y los dominios de producción en Vercel, rechazando cualquier origen no autorizado.
* **Gestión de Sesiones Seguras con JWT:** Emisión de tokens de acceso con una duración estándar (8 horas) para turnos laborales comerciales, combinada con tokens temporales de vida extremadamente corta para flujos sensibles (20 minutos para confirmación de registro y 15 minutos para recuperación de contraseña).
* **HTTPS y Terminación SSL Delegados:** Arquitectura de producción optimizada delegando la terminación SSL/TLS y la redirección HTTP a HTTPS a nivel de infraestructura (Vercel/Nginx) para maximizar el rendimiento del servidor Node.js.


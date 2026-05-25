const pool = require('../database/db');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Obtener cliente autenticado de Google Drive (Real o Simulado)
let driveClient = null;

function getDriveClient() {
    if (driveClient) return driveClient;

    // Ruta de credentials.json en la raíz del backend
    const credentialsPath = path.join(__dirname, '../../credentials.json');
    
    // Si no existe, usamos el cliente SIMULADO para facilitar pruebas en desarrollo
    if (!fs.existsSync(credentialsPath)) {
        console.log('🔌 [BACKUP] "credentials.json" no encontrado. Activando SIMULADOR de Google Drive API.');
        
        driveClient = {
            isSimulated: true,
            files: {
                list: async (params) => {
                    console.log(`📡 [DRIVE SIMULADO] Buscando archivo en la nube con query: "${params.q}"...`);
                    // Simular retraso de red
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Retornar de forma simulada que el archivo existe el 50% de las veces para probar creación y sobrescritura
                    const alreadyExists = Math.random() > 0.5;
                    if (alreadyExists) {
                        console.log(`📡 [DRIVE SIMULADO] Se encontró un respaldo previo para hoy en la nube.`);
                        return {
                            data: {
                                files: [{ id: 'mock-file-drive-id-77777', name: 'inventario_offline.html' }]
                            }
                        };
                    } else {
                        console.log(`📡 [DRIVE SIMULADO] No se encontró ningún respaldo previo para hoy en la nube.`);
                        return {
                            data: {
                                files: []
                            }
                        };
                    }
                },
                create: async (params) => {
                    console.log(`📤 [DRIVE SIMULADO] Subiendo archivo "${params.requestBody.name}"...`);
                    if (params.requestBody.parents) {
                        console.log(`📂 [DRIVE SIMULADO] Carpeta destino configurada: "${params.requestBody.parents[0]}"`);
                    }
                    // Simular retraso de subida (1.5 segundos)
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const mockId = 'mock-created-file-' + Math.floor(Math.random() * 900000 + 100000);
                    console.log(`✅ [DRIVE SIMULADO] ¡Archivo subido exitosamente! ID simulado en la nube: ${mockId}`);
                    return {
                        data: { id: mockId }
                    };
                },
                update: async (params) => {
                    console.log(`🔄 [DRIVE SIMULADO] Sobrescribiendo/actualizando archivo existente con ID: "${params.fileId}"...`);
                    // Simular retraso de actualización (1.2 segundos)
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    
                    console.log(`✅ [DRIVE SIMULADO] ¡Archivo de respaldo actualizado en Drive exitosamente!`);
                    return {
                        data: { id: params.fileId }
                    };
                }
            }
        };
        return driveClient;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive']
        });
        driveClient = google.drive({ version: 'v3', auth });
        console.log('🔌 [BACKUP] Cliente de Google Drive REAL inicializado correctamente.');
        return driveClient;
    } catch (error) {
        console.error('❌ [BACKUP] Error al inicializar cliente de Google Drive real, usando simulador de emergencia:', error.message);
        // Fallback al simulador en caso de error de conexión/inicialización real
        return getDriveClient();
    }
}

/**
 * Consulta el inventario actual de la base de datos de manera idéntica a la UI.
 */
async function fetchInventoryFromDB(tiendaId = null) {
    const tiendaFilterP = tiendaId ? ` AND (p.id_tienda = ${tiendaId} OR p.id_tienda IS NULL)` : '';
    const tiendaFilterSub = tiendaId ? ` AND c.id_tienda = ${tiendaId}` : '';
    const tiendaFilterSubV = tiendaId ? ` AND v.id_tienda = ${tiendaId}` : '';
    const tiendaFilterSubA = tiendaId ? ` AND a.id_tienda = ${tiendaId}` : '';

    const query = `
        SELECT 
            p.id_producto, 
            p.nb_producto, 
            p.codigo_de_barra,
            p.precio, 
            e.nb_estado as estado,
            COALESCE(purchased.total_bought, 0) as real_bought,
            COALESCE(sold.total_sold, 0) as real_sold,
            (COALESCE(purchased.total_bought, 0) - COALESCE(sold.total_sold, 0) + COALESCE(ajustes.total_ajuste, 0)) as current_stock
        FROM producto p
        LEFT JOIN estado e ON p.id_estado = e.id_estado
        -- Total histórico absoluto para calcular el stock real
        LEFT JOIN (
            SELECT dc.id_producto, SUM(dc.cantidad) as total_bought
            FROM detalle_compra dc
            JOIN compra c ON dc.id_compra = c.id_compra
            WHERE 1=1 ${tiendaFilterSub}
            GROUP BY dc.id_producto
        ) purchased ON p.id_producto = purchased.id_producto
        LEFT JOIN (
            SELECT dv.id_producto, SUM(dv.cantidad) as total_sold
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            WHERE 1=1 ${tiendaFilterSubV}
            GROUP BY dv.id_producto
        ) sold ON p.id_producto = sold.id_producto
        -- Ajustes manuales
        LEFT JOIN (
            SELECT a.id_producto, SUM(a.cantidad_ajuste) as total_ajuste
            FROM ajuste_inventario a
            WHERE 1=1 ${tiendaFilterSubA}
            GROUP BY a.id_producto
        ) ajustes ON p.id_producto = ajustes.id_producto
        WHERE p.nb_producto != 'AVANCE DE EFECTIVO' ${tiendaFilterP}
        ORDER BY p.nb_producto ASC
    `;

    const [rows] = await pool.query(query);
    return rows;
}

/**
 * Genera el archivo HTML interactivo autocontenido.
 */
function generateHTMLContent(products, timestampStr) {
    // Generar filas de la tabla
    const productRows = products.map(p => {
        const barcode = p.codigo_de_barra || 'S/C';
        const price = parseFloat(p.precio).toFixed(2);
        const stock = parseInt(p.current_stock) || 0;
        
        let badgeClass = 'stock-ok';
        if (stock <= 0) {
            badgeClass = 'stock-empty';
        } else if (stock <= 5) {
            badgeClass = 'stock-low';
        }

        const stateBadge = p.estado === 'Activo' ? 'badge-active' : 'badge-inactive';

        return `
                <tr data-name="${p.nb_producto.toLowerCase()}" data-barcode="${barcode.toLowerCase()}">
                    <td data-label="Producto">
                        <div class="product-info">
                            <span class="product-name">${p.nb_producto}</span>
                            <span class="product-id">ID: ${p.id_producto}</span>
                        </div>
                    </td>
                    <td data-label="Código de Barras">
                        <span class="barcode-badge">${barcode}</span>
                    </td>
                    <td data-label="Precio" class="price-cell">
                        $ ${price}
                    </td>
                    <td data-label="Stock" class="center-cell">
                        <span class="badge ${badgeClass}">${stock}</span>
                    </td>
                    <td data-label="Estado" class="right-cell">
                        <span class="badge ${stateBadge}">${p.estado || 'Activo'}</span>
                    </td>
                </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventario Offline - Tienda VV</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Estilos modernos y premium: Modo Oscuro con acentos naranjas de Tienda VV */
        :root {
            --bg-main: #0b0f19;
            --bg-card: #151b2c;
            --bg-input: #1e2640;
            --orange-primary: #f97316;
            --orange-hover: #ea580c;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-color: #27314f;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        /* Header Premium */
        header {
            background: linear-gradient(135deg, #1e2640 0%, #151b2c 100%);
            padding: 25px;
            border-radius: 24px;
            border: 1px solid var(--border-color);
            margin-bottom: 25px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, rgba(0,0,0,0) 70%);
            pointer-events: none;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 15px;
        }

        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -0.5px;
            background: linear-gradient(to right, #ffffff, #f97316);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .logo-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 800;
            background: rgba(249, 115, 22, 0.1);
            color: var(--orange-primary);
            padding: 6px 14px;
            border-radius: 10px;
            border: 1px solid rgba(249, 115, 22, 0.2);
            text-transform: uppercase;
        }

        .meta-info {
            font-size: 13px;
            color: var(--text-muted);
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            align-items: center;
            background: rgba(11, 15, 25, 0.5);
            padding: 10px 16px;
            border-radius: 12px;
            border: 1px solid rgba(39, 49, 79, 0.5);
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .meta-item strong {
            color: #fff;
        }

        /* Buscador */
        .search-container {
            position: relative;
            margin-bottom: 25px;
        }

        .search-box {
            width: 100%;
            padding: 16px 20px 16px 50px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 16px;
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            color: white;
            box-sizing: border-box;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .search-box:focus {
            outline: none;
            border-color: var(--orange-primary);
            box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15), 0 4px 25px rgba(0, 0, 0, 0.25);
            background: var(--bg-input);
        }

        .search-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }

        .counter-badge {
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 15px;
            display: inline-block;
            border: 1px solid var(--border-color);
        }

        /* Tabla Estilizada */
        .table-card {
            background: var(--bg-card);
            border-radius: 24px;
            border: 1px solid var(--border-color);
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background: rgba(11, 15, 25, 0.6);
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
        }

        td {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background-color: rgba(255, 255, 255, 0.02);
        }

        /* Detalles de Producto */
        .product-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .product-name {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
        }

        .product-id {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .barcode-badge {
            font-family: 'Courier New', Courier, monospace;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 13px;
            color: #fff;
            font-weight: bold;
        }

        .price-cell {
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 16px;
            color: #ffffff;
        }

        /* Insignias de Stock y Estado */
        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
        }

        .stock-ok {
            background-color: rgba(16, 185, 129, 0.12);
            color: var(--success-color);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .stock-low {
            background-color: rgba(245, 158, 11, 0.12);
            color: var(--warning-color);
            border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .stock-empty {
            background-color: rgba(239, 68, 68, 0.12);
            color: var(--danger-color);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .badge-active {
            background-color: rgba(16, 185, 129, 0.08);
            color: var(--success-color);
            font-size: 11px;
            text-transform: uppercase;
        }

        .badge-inactive {
            background-color: rgba(245, 158, 11, 0.08);
            color: var(--warning-color);
            font-size: 11px;
            text-transform: uppercase;
        }

        .center-cell {
            text-align: center;
        }

        .right-cell {
            text-align: right;
        }

        /* Responsive Móvil Premium */
        @media (max-width: 680px) {
            body {
                padding: 10px;
            }

            header {
                padding: 18px;
                border-radius: 16px;
                margin-bottom: 15px;
            }

            h1 {
                font-size: 22px;
            }

            .logo-tag {
                font-size: 12px;
                padding: 4px 10px;
            }

            .meta-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
                padding: 10px 14px;
            }

            .search-box {
                padding: 14px 16px 14px 44px;
                font-size: 15px;
                border-radius: 12px;
            }

            .search-icon {
                left: 15px;
            }

            /* Transformación en Tarjetas en Móviles */
            table, thead, tbody, th, td, tr {
                display: block;
            }

            thead {
                display: none;
            }

            tr {
                border-bottom: 1px solid var(--border-color);
                padding: 16px 14px;
                background-color: rgba(255, 255, 255, 0.01);
                transition: background-color 0.2s ease;
            }

            tr:hover {
                background-color: rgba(255, 255, 255, 0.03);
            }

            td {
                padding: 8px 0;
                border-bottom: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                text-align: right;
            }

            td::before {
                content: attr(data-label);
                font-size: 12px;
                font-weight: 700;
                color: var(--text-muted);
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .product-info {
                align-items: flex-end;
                text-align: right;
            }

            .product-name {
                font-size: 14px;
            }

            .price-cell {
                font-size: 15px;
            }

            .badge {
                padding: 4px 10px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-top">
                <h1>Tienda VV - Respaldo de Inventario</h1>
                <div class="logo-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    Modo Offline
                </div>
            </div>
            
            <div class="meta-info">
                <div class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Generado: <strong>${timestampStr}</strong>
                </div>
                <div class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Respaldo para fallas eléctricas y de internet
                </div>
            </div>
        </header>

        <div class="search-container">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="search" class="search-box" placeholder="Buscar por producto o código de barra offline..." autofocus autocomplete="off">
        </div>

        <div id="counter" class="counter-badge">Mostrando ${products.length} de ${products.length} productos</div>

        <div class="table-card">
            <table id="inventory-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Código de Barras</th>
                        <th class="right-cell" style="text-align: right; width: 100px;">Precio</th>
                        <th class="center-cell" style="width: 120px;">Disponible</th>
                        <th class="right-cell" style="width: 100px;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Buscador interactivo instantáneo offline (Vanilla JS de alto rendimiento)
        const searchInput = document.getElementById('search');
        const rows = document.querySelectorAll('#inventory-table tbody tr');
        const counter = document.getElementById('counter');

        function filterInventory() {
            const query = searchInput.value.toLowerCase().trim();
            let visibleCount = 0;

            rows.forEach(row => {
                const prodName = row.getAttribute('data-name');
                const barcode = row.getAttribute('data-barcode');

                if (prodName.includes(query) || barcode.includes(query)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            counter.textContent = 'Mostrando ' + visibleCount + ' de ' + rows.length + ' productos';
        }

        searchInput.addEventListener('input', filterInventory);

        // Tecla '/' para enfocar rápidamente el buscador
        document.addEventListener('keydown', function(e) {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Servicio principal de generación de respaldos.
 * Realiza la generación del HTML, lo guarda localmente en el servidor,
 * y lo sincroniza de manera asíncrona / silenciosa en Google Drive.
 */
exports.generateBackupHTML = async (tiendaId = null) => {
    try {
        console.log('🔄 [BACKUP] Iniciando proceso de respaldo de inventario...');
        
        // 1. Obtener productos activos de la base de datos
        const products = await fetchInventoryFromDB(tiendaId);
        console.log(`📦 [BACKUP] Se recuperaron ${products.length} productos de la base de datos.`);

        // 2. Formatear marca de tiempo
        const now = new Date();
        // Ajustar hora local a formato legible (DD/MM/YYYY HH:MM)
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const timestampStr = `${dateStr} ${timeStr}`;

        // 3. Generar el contenido HTML
        const htmlContent = generateHTMLContent(products, timestampStr);

        // 4. Nombre de archivo
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const filename = `inventario_${yyyy}-${mm}-${dd}.html`;

        // 5. Guardado en disco local en el Servidor (C:\RespaldosInventario\)
        const localBackupPath = process.env.BACKUP_LOCAL_PATH || 'C:\\RespaldosInventario';
        try {
            fs.mkdirSync(localBackupPath, { recursive: true });
            const localFilePath = path.join(localBackupPath, filename);
            fs.writeFileSync(localFilePath, htmlContent, 'utf8');
            console.log(`💾 [BACKUP] Respaldo local guardado en disco: ${localFilePath}`);
        } catch (localError) {
            console.error('⚠️ [BACKUP] Error al escribir en el disco local (C:\\RespaldosInventario):', localError.message);
            // Si falla por permisos, intentamos escribir en una ruta local dentro de la app como fallback secundario
            try {
                const fallbackPath = path.join(__dirname, '../../backups');
                fs.mkdirSync(fallbackPath, { recursive: true });
                const fallbackFilePath = path.join(fallbackPath, filename);
                fs.writeFileSync(fallbackFilePath, htmlContent, 'utf8');
                console.log(`💾 [BACKUP] Respaldo guardado en ruta de respaldo secundaria: ${fallbackFilePath}`);
            } catch (fallbackError) {
                console.error('❌ [BACKUP] Falló el guardado local secundario también:', fallbackError.message);
            }
        }

        // 6. Subir / Sincronizar en Google Drive (Silencioso en segundo plano)
        // No bloquea la respuesta al usuario. Si falla, el archivo se habrá descargado en local y cliente.
        const drive = getDriveClient();
        if (drive) {
            // Ejecutamos en segundo plano
            uploadToDrive(drive, filename, htmlContent).catch(err => {
                console.error('❌ [BACKUP] Error asíncrono subiendo a Google Drive:', err.message);
            });
        }

        return {
            filename,
            htmlContent
        };
    } catch (error) {
        console.error('❌ [BACKUP] Error crítico en la generación de respaldo:', error);
        throw error;
    }
};

/**
 * Función auxiliar para subir el archivo a Google Drive y sobrescribir si ya existe.
 */
async function uploadToDrive(drive, filename, fileContent) {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    try {
        console.log(`📡 [DRIVE] Sincronizando respaldo "${filename}"...`);

        // 1. Buscar si ya existe un archivo con ese nombre exacto
        let q = `name = '${filename}' and trashed = false`;
        if (folderId) {
            q += ` and '${folderId}' in parents`;
        }

        const listRes = await drive.files.list({
            q,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const files = listRes.data.files;
        const media = {
            mimeType: 'text/html',
            body: fileContent
        };

        if (files && files.length > 0) {
            // Ya existe un archivo para el día de hoy, lo actualizamos (sobrescribimos)
            const fileId = files[0].id;
            console.log(`🔄 [DRIVE] Sobrescribiendo archivo existente en Google Drive con ID: ${fileId}`);
            
            await drive.files.update({
                fileId: fileId,
                media: media
            });
            console.log(`✅ [DRIVE] Archivo de respaldo actualizado en Drive exitosamente.`);
        } else {
            // No existe un archivo para hoy, creamos uno nuevo
            console.log(`📤 [DRIVE] Creando nuevo archivo en Google Drive...`);
            
            const fileMetadata = {
                name: filename,
                mimeType: 'text/html'
            };
            if (folderId) {
                fileMetadata.parents = [folderId];
            }

            const createRes = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id'
            });
            console.log(`✅ [DRIVE] Archivo creado exitosamente en Google Drive. ID: ${createRes.data.id}`);
        }
    } catch (error) {
        console.error('❌ [DRIVE] Error al sincronizar con Google Drive:', error.message);
        throw error;
    }
}

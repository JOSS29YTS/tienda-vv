const backupService = require('../services/backupService');

/**
 * Endpoint para generar y descargar el backup HTML offline.
 */
exports.generateHTMLBackup = async (req, res) => {
    try {
        const { tienda } = req.query;
        const tiendaId = tienda && tienda !== 'global' ? parseInt(tienda) : null;

        const { filename, htmlContent } = await backupService.generateBackupHTML(tiendaId);

        // Configurar cabeceras de respuesta HTTP para forzar la descarga del archivo en el navegador
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        
        // Enviar contenido HTML directamente
        return res.send(htmlContent);
    } catch (error) {
        console.error('❌ [BACKUP CONTROLLER] Error al generar backup:', error);
        return res.status(500).json({ 
            message: 'Error interno al generar el respaldo de inventario offline.', 
            error: error.message 
        });
    }
};

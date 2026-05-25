import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBox, FaSearch, FaFileDownload, FaCalendarAlt, FaEdit, FaTimes } from 'react-icons/fa';
import API_URL from '../../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Report states
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [generatingReport, setGeneratingReport] = useState(false);
    const [downloadingHTML, setDownloadingHTML] = useState(false);

    const { user } = useAuth();
    const { effectiveTiendaId, tiendas } = useStore();

    // Adjust Inventory States
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, [effectiveTiendaId]);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/inventory${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(data);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error al cargar inventario');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        setGeneratingReport(true);
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '&tienda=global';
            const response = await fetch(`${API_URL}/api/inventory/report?month=${reportMonth}&year=${reportYear}${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al obtener reporte');
            const data = await response.json();

            const doc = new jsPDF();
            const monthNames = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];

            // Header
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.rect(0, 0, 210, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            const currentStore = tiendas.find(t => t.id_tienda == effectiveTiendaId);
            const storeTitle = currentStore ? currentStore.nb_tienda.toUpperCase() : "TODAS LAS TIENDAS";

            doc.text(storeTitle, 105, 15, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(`Reporte de Inventario - ${monthNames[parseInt(reportMonth) - 1]} ${reportYear}`, 105, 25, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

            const totalInvInicial = data.reduce((sum, item) => sum + (parseInt(item.inv_inicial) || 0), 0);
            const totalCompras = data.reduce((sum, item) => sum + (parseInt(item.compras_periodo) || 0), 0);
            const totalVentas = data.reduce((sum, item) => sum + (parseInt(item.ventas_periodo) || 0), 0);
            const totalInvFinal = data.reduce((sum, item) => sum + (parseInt(item.inv_final) || 0), 0);

            const tableData = data.map(item => [
                item.nb_producto,
                `$${parseFloat(item.precio).toFixed(2)}`,
                item.inv_inicial,
                item.compras_periodo,
                item.ventas_periodo,
                item.inv_final
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Producto', 'Precio', 'Inv. Inicial', 'Compras', 'Ventas', 'Inv. Final']],
                body: tableData,
                foot: [['TOTALES', '', totalInvInicial, totalCompras, totalVentas, totalInvFinal]],
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] }, // Slate 900
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center', fontStyle: 'bold' }
                },
                showFoot: 'lastPage', // Solo mostrar totales al final del reporte
                showHead: 'firstPage', // Solo mostrar encabezado en la primera página
            });

            doc.save(`Reporte_Inventario_${monthNames[parseInt(reportMonth) - 1]}_${reportYear}.pdf`);
            toast.success('Reporte generado correctamente');

        } catch (error) {
            console.error('Error report:', error);
            toast.error('Error al generar reporte');
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleDownloadHTMLBackup = async () => {
        setDownloadingHTML(true);
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/backup/generate-html${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al obtener respaldo HTML');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const filename = `inventario_offline_${yyyy}-${mm}-${dd}.html`;

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Registrar fecha para que no se auto-descargue hoy si ya se hizo manual
            localStorage.setItem('backup_fecha_descarga', `${yyyy}-${mm}-${dd}`);

            toast.success('Respaldo HTML offline descargado y sincronizado con Drive.');
        } catch (error) {
            console.error('Error backup HTML:', error);
            toast.error('Error al generar respaldo HTML offline');
        } finally {
            setDownloadingHTML(false);
        }
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        if (newStock === '' || isNaN(newStock)) return;

        setAdjusting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/inventory/adjust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_producto: productToAdjust.id_producto,
                    currentStock: productToAdjust.current_stock,
                    newStock: parseInt(newStock),
                    id_tienda: effectiveTiendaId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al ajustar inventario');
            }

            toast.success('Inventario ajustado correctamente');
            setAdjustModalOpen(false);
            setProductToAdjust(null);
            setNewStock('');
            fetchInventory(); // Reload data
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.message);
        } finally {
            setAdjusting(false);
        }
    };

    const filteredProducts = products.filter(product =>
        product.nb_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.codigo_de_barra && product.codigo_de_barra.includes(searchTerm))
    );

    const totalDisponible = products.reduce((sum, product) => {
        return sum + (parseInt(product.current_stock) || 0);
    }, 0);

    const formattedTotalDisponible = totalDisponible.toLocaleString('de-DE');

    const months = [
        { val: 1, name: "Enero" }, { val: 2, name: "Febrero" }, { val: 3, name: "Marzo" },
        { val: 4, name: "Abril" }, { val: 5, name: "Mayo" }, { val: 6, name: "Junio" },
        { val: 7, name: "Julio" }, { val: 8, name: "Agosto" }, { val: 9, name: "Septiembre" },
        { val: 10, name: "Octubre" }, { val: 11, name: "Noviembre" }, { val: 12, name: "Diciembre" }
    ];

    return (
        <div className="pb-10">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 font-heading">Inventario</h1>
                    <p className="text-slate-500 mt-1">Gestión y control de existencia de productos.</p>
                </div>

                <div className="bg-emerald-50 rounded-2xl px-6 py-3 border border-emerald-100 flex items-center gap-4 shadow-sm">
                    <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
                        <FaBox size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-0.5">TOTAL DISPONIBLE</div>
                        <div className="text-2xl font-black text-emerald-600 leading-none">{formattedTotalDisponible}</div>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Search Bar */}
                <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 h-fit">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Report Controls */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <FaCalendarAlt className="text-emerald-500" /> REPORTE MENSUAL
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-sm font-medium text-slate-700"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                        >
                            {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                        </select>
                        <input
                            type="number"
                            className="w-20 bg-slate-50 border-none rounded-xl px-3 py-2 text-sm font-medium text-slate-700"
                            value={reportYear}
                            onChange={(e) => setReportYear(e.target.value)}
                        />
                        <button
                            onClick={handleDownloadReport}
                            disabled={generatingReport}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                            title="Descargar Reporte Mensual (PDF)"
                        >
                            {generatingReport ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FaFileDownload size={18} />
                            )}
                        </button>
                        <button
                            onClick={handleDownloadHTMLBackup}
                            disabled={downloadingHTML}
                            className="bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                            title="Descargar Respaldo Offline (HTML)"
                        >
                            {downloadingHTML ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FaFileDownload size={18} className="rotate-180" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total Comprado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total Vendido</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Disponible</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredProducts.map((product) => {
                                    const isOutOfStock = parseInt(product.current_stock) <= 0;

                                    return (
                                        <motion.tr
                                            key={product.id_producto}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`transition-colors ${isOutOfStock
                                                ? 'bg-red-50 hover:bg-red-100' // Red background if out of stock
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${isOutOfStock ? 'bg-red-200 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        <FaBox />
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold ${isOutOfStock ? 'text-red-800' : 'text-slate-700'}`}>
                                                            {product.nb_producto}
                                                        </div>
                                                        <div className="text-xs text-slate-400">ID: {product.id_producto}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-600">
                                                $ {parseFloat(product.precio).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                                {product.total_bought}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500 font-medium">
                                                {product.total_sold}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`px-4 py-2 rounded-lg font-bold text-sm ${isOutOfStock
                                                        ? 'bg-red-200 text-red-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {product.current_stock}
                                                    </span>
                                                    {user && user.rol === 'Administrador' && (
                                                        <button 
                                                            onClick={() => {
                                                                setProductToAdjust(product);
                                                                setNewStock(product.current_stock);
                                                                setAdjustModalOpen(true);
                                                            }}
                                                            className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                                                            title="Ajustar Inventario"
                                                        >
                                                            <FaEdit size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${product.estado === 'Activo'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {product.estado}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        {loading ? 'Cargando...' : 'No se encontraron productos.'}
                    </div>
                )}
            </div>

            {/* Adjust Inventory Modal */}
            <AnimatePresence>
                {adjustModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-xl font-bold text-slate-800">Ajuste Manual de Inventario</h3>
                                <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                {productToAdjust && (
                                    <div className="mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <p className="text-sm text-emerald-800 font-bold mb-1">{productToAdjust.nb_producto}</p>
                                        <p className="text-xs text-emerald-600">Stock Actual del Sistema: <span className="font-black text-lg">{productToAdjust.current_stock}</span></p>
                                    </div>
                                )}
                                <form onSubmit={handleAdjustSubmit}>
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Nuevo Stock Físico (Real)</label>
                                        <input
                                            type="number"
                                            value={newStock}
                                            onChange={(e) => setNewStock(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-xl text-center"
                                            required
                                        />
                                        <p className="text-xs text-slate-500 mt-2 text-center">El sistema creará un registro de ajuste para cuadrar la diferencia.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustModalOpen(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={adjusting}
                                            className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                        >
                                            {adjusting ? 'Guardando...' : 'Aplicar Ajuste'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InventoryPage;

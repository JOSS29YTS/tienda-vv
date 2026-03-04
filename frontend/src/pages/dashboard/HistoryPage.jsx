import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCalendarAlt, FaMoneyBillWave, FaExchangeAlt,
    FaChevronDown, FaChevronUp, FaFilePdf,
    FaSearch, FaTimes, FaBoxOpen, FaTag,
    FaShoppingCart, FaChartPie, FaListAlt
} from 'react-icons/fa';
import API_URL from '../../config/api';
import { useStore } from '../../context/StoreContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// DayDetailModal: muestra los productos del día seleccionado
// ─────────────────────────────────────────────────────────────
const DayDetailModal = ({ detail, onClose, formatDate }) => {
    if (!detail) return null;

    const { date, summary, products, payments } = detail;

    // Agrupar productos por categoría
    const byCategory = products.reduce((acc, p) => {
        const cat = p.categoria || 'Sin categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    const categoryColors = [
        'bg-orange-50 border-orange-200 text-orange-700',
        'bg-blue-50 border-blue-200 text-blue-700',
        'bg-purple-50 border-purple-200 text-purple-700',
        'bg-green-50 border-green-200 text-green-700',
        'bg-pink-50 border-pink-200 text-pink-700',
        'bg-amber-50 border-amber-200 text-amber-700',
    ];

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const slateColor = [15, 23, 42];
        const orangeColor = [249, 115, 22];
        const greenColor = [16, 185, 129];
        const now = new Date();

        // Header
        doc.setFillColor(...slateColor);
        doc.rect(0, 0, 210, 42, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(17);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE VENTAS DEL DÍA', 15, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${formatDate(date)}`, 15, 28);
        doc.text(`Generado: ${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString('es-VE')}`, 15, 35);

        // Summary cards
        doc.setFillColor(...greenColor);
        doc.roundedRect(15, 48, 55, 20, 2, 2, 'F');
        doc.setFillColor(...orangeColor);
        doc.roundedRect(75, 48, 55, 20, 2, 2, 'F');
        doc.setFillColor(100, 116, 139);
        doc.roundedRect(135, 48, 55, 20, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('INGRESO TOTAL', 17, 54);
        doc.text('TOTAL PIEZAS', 77, 54);
        doc.text('Nº TRANSACCIONES', 137, 54);

        doc.setFontSize(11);
        doc.text(`$ ${summary.ingresoUSD.toFixed(2)}`, 17, 63);
        doc.text(`${summary.totalPiezas} uds`, 77, 63);
        doc.text(`${summary.totalVentas}`, 137, 63);

        // Products table
        doc.setTextColor(...slateColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Productos Vendidos', 15, 80);
        doc.setDrawColor(...orangeColor);
        doc.setLineWidth(0.5);
        doc.line(15, 83, 195, 83);

        autoTable(doc, {
            startY: 86,
            head: [['Producto', 'Categoría', 'Cantidad', 'Precio $', 'Total $']],
            body: products.map(p => [
                p.producto,
                p.categoria,
                p.cantidad.toString(),
                `$ ${p.precioUnitario.toFixed(2)}`,
                `$ ${p.totalUSD.toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: slateColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                2: { halign: 'center' },
                4: { fontStyle: 'bold', textColor: [...greenColor] }
            }
        });

        let nextY = doc.lastAutoTable.finalY + 12;

        // Payments table
        doc.setTextColor(...slateColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen por Método de Pago', 15, nextY);
        doc.line(15, nextY + 3, 195, nextY + 3);

        autoTable(doc, {
            startY: nextY + 6,
            head: [['Método de Pago', 'Total $', 'Total Bs']],
            body: payments.map(pay => [
                pay.metodo,
                `$ ${pay.totalUSD.toFixed(2)}`,
                `Bs ${(pay.totalUSD * (summary.tasaDia || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2.5 },
        });

        // Footer
        const total = summary.ingresoUSD;
        const totalBs = summary.ingresoBs;
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Tasa del día: ${summary.tasaDia.toFixed(2)} Bs/$  |  Total Bs: ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
            105, doc.internal.pageSize.height - 6, { align: 'center' }
        );

        doc.save(`Detalle_Ventas_${date}.pdf`);
        toast.success('Reporte exportado');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="bg-slate-900 px-7 py-5 flex justify-between items-start flex-shrink-0">
                        <div>
                            <div className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">
                                Detalle del Día
                            </div>
                            <h2 className="text-white text-xl font-bold font-heading capitalize">
                                {formatDate(date)}
                            </h2>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Tasa: {summary.tasaDia.toFixed(2)} Bs/$
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <FaFilePdf />
                                PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    {/* Summary Chips */}
                    <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl">
                            <FaMoneyBillWave className="text-emerald-600" />
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Ingreso Total</div>
                                <div className="font-black text-base">$ {summary.ingresoUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-xl">
                            <FaBoxOpen className="text-blue-600" />
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Piezas Vendidas</div>
                                <div className="font-black text-base">{summary.totalPiezas} uds</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-xl">
                            <FaShoppingCart className="text-orange-600" />
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Transacciones</div>
                                <div className="font-black text-base">{summary.totalVentas}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-xl">
                            <FaExchangeAlt className="text-purple-600" />
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Total en Bs</div>
                                <div className="font-black text-base">Bs {summary.ingresoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="overflow-y-auto flex-1 px-7 py-5 space-y-6">
                        {/* Products by Category */}
                        {products.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <FaBoxOpen className="text-5xl mx-auto mb-3 text-slate-200" />
                                <p>No se registraron productos en este día.</p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <FaListAlt className="text-orange-500" />
                                        <h3 className="font-bold text-slate-800 text-base">Productos Vendidos</h3>
                                        <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                                            {products.length} artículo{products.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {Object.entries(byCategory).map(([cat, items], catIdx) => (
                                        <div key={cat} className="mb-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-2 ${categoryColors[catIdx % categoryColors.length]}`}>
                                                <FaTag className="text-[10px]" />
                                                {cat}
                                            </div>
                                            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100">
                                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Producto</th>
                                                            <th className="text-center px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Cant.</th>
                                                            <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">P. Unit. $</th>
                                                            <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Total $</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((p, i) => (
                                                            <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-slate-800">{p.producto}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="bg-orange-100 text-orange-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                                                        {p.cantidad}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                                                                    $ {p.precioUnitario.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono text-sm">
                                                                    $ {p.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Payment methods */}
                                {payments.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <FaChartPie className="text-blue-500" />
                                            <h3 className="font-bold text-slate-800 text-base">Métodos de Pago</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {payments.map((pay, i) => (
                                                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                                                    <span className="text-sm font-semibold text-slate-700">{pay.metodo}</span>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-slate-900">
                                                            $ {pay.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            Bs {(pay.totalUSD * summary.tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─────────────────────────────────────────────────────────────
// DateSearchPanel: busca el detalle de un día específico
// ─────────────────────────────────────────────────────────────
const DateSearchPanel = ({ effectiveTiendaId, formatDate }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const handleSearch = async () => {
        if (!selectedDate) {
            toast.error('Selecciona una fecha');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '&tienda=global';
            const res = await fetch(`${API_URL}/api/history/day-detail?date=${selectedDate}${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            setDetail(data);
            setShowModal(true);
        } catch (err) {
            toast.error(err.message || 'Error al buscar el día');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-orange-500/20 p-3 rounded-xl">
                            <FaSearch className="text-orange-400 text-lg" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Consultar Día Específico</h2>
                            <p className="text-slate-400 text-xs mt-0.5">Ver qué productos se vendieron en una fecha</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
                        <input
                            type="date"
                            value={selectedDate}
                            max={today}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="flex-1 sm:w-48 px-4 py-2.5 bg-slate-950 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading || !selectedDate}
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-orange-900/30 whitespace-nowrap"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            ) : <FaSearch />}
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {showModal && detail && (
                <DayDetailModal
                    detail={detail}
                    onClose={() => setShowModal(false)}
                    formatDate={formatDate}
                />
            )}
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// HistoryCard: tarjeta de historial diario
// ─────────────────────────────────────────────────────────────
const HistoryCard = ({ day, formatDate, onViewDetail }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
        >
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 capitalize mb-1">{formatDate(day.date)}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-200/50 px-2 py-1 rounded-lg inline-flex">
                        <FaExchangeAlt />
                        Tasa: {parseFloat(day.tasa).toFixed(2)} Bs
                    </div>
                </div>
                <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
                    <FaCalendarAlt />
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 font-bold uppercase">Venta Bs</span>
                            <span className="text-sm font-bold text-slate-700">{day.totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 font-bold uppercase">Venta $</span>
                            <span className="text-sm font-bold text-slate-700">$ {day.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="text-xs text-blue-600 font-bold uppercase">Total (Bs)</span>
                            <span className="text-sm font-black text-blue-700">
                                {(day.totalBS + (day.totalUSD * parseFloat(day.tasa))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-xs text-emerald-600 font-bold uppercase">Total ($)</span>
                            <span className="text-sm font-black text-emerald-700">
                                $ {(day.totalUSD + (day.totalBS / (parseFloat(day.tasa) || 1))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ver productos button */}
                <button
                    onClick={() => onViewDetail(day.date)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-sm font-bold transition-all active:scale-95 mb-3"
                >
                    <FaBoxOpen />
                    Ver Productos Vendidos
                </button>

                <div className="border-t border-slate-100 pt-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center justify-between w-full text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                        <span>Desglose por Método</span>
                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </button>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-3 space-y-2"
                            >
                                {day.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                                        <span className="text-slate-500">{item.method}</span>
                                        <span className="font-bold text-slate-700">
                                            {item.currency === 'USD' ? '$ ' : ''}
                                            {item.amount.toLocaleString(item.currency === 'USD' ? 'en-US' : 'es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            {item.currency === 'BS' ? ' Bs' : ''}

                                            {item.currency === 'BS' && day.tasa > 0 && (
                                                <span className="text-slate-400 font-normal ml-1">
                                                    ($ {(item.amount / day.tasa).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────
// HistoryPage principal
// ─────────────────────────────────────────────────────────────
const HistoryPage = () => {
    const { effectiveTiendaId, selectedTienda, tiendas } = useStore();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dayDetail, setDayDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const currentStoreName = selectedTienda
        ? selectedTienda.nb_tienda.toUpperCase()
        : (tiendas.find(t => t.id_tienda === effectiveTiendaId)?.nb_tienda?.toUpperCase() || 'GLOBAL');

    useEffect(() => {
        fetchHistory();
    }, [effectiveTiendaId]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/history${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDayDetail = async (date) => {
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '&tienda=global';
            const res = await fetch(`${API_URL}/api/history/day-detail?date=${date}${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            setDayDetail(data);
            setShowDetailModal(true);
        } catch (err) {
            toast.error(err.message || 'Error al cargar detalle');
        } finally {
            setDetailLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    };

    const handleGenerateReport = () => {
        if (!history || history.length === 0) {
            toast.error('No hay datos de historial para exportar');
            return;
        }

        const doc = new jsPDF();
        const slateColor = [15, 23, 42];
        const primaryColor = [249, 115, 22];
        const greenColor = [16, 185, 129];
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');

        doc.setFillColor(...slateColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${currentStoreName} — HISTORIAL DE VENTAS`, 15, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${date} ${time}`, 15, 30);
        doc.text(`Total de días: ${history.length}`, 150, 30);

        const totalUSDGlobal = history.reduce((sum, d) => sum + d.totalUSD + (d.totalBS / (parseFloat(d.tasa) || 1)), 0);
        doc.setFillColor(...greenColor);
        doc.roundedRect(15, 47, 180, 16, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL GENERAL: $ ${totalUSDGlobal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, 57);

        doc.setTextColor(...slateColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen por Día', 15, 72);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(15, 75, 195, 75);

        const tableBody = history.map(day => {
            const tasa = parseFloat(day.tasa) || 1;
            const totalUsdEquiv = day.totalUSD + (day.totalBS / tasa);
            return [
                formatDate(day.date),
                `${tasa.toFixed(2)} Bs/$`,
                `Bs ${day.totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
                `$ ${day.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                `$ ${totalUsdEquiv.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            ];
        });

        autoTable(doc, {
            startY: 78,
            head: [['Fecha', 'Tasa', 'Venta (Bs)', 'Venta ($)', 'Total ($)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: slateColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 4: { fontStyle: 'bold', textColor: [...greenColor] } }
        });

        let nextY = doc.lastAutoTable.finalY + 12;

        history.forEach((day) => {
            if (!day.breakdown || day.breakdown.length === 0) return;
            if (nextY > 240) { doc.addPage(); nextY = 20; }
            doc.setTextColor(...slateColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(formatDate(day.date), 15, nextY);

            autoTable(doc, {
                startY: nextY + 3,
                head: [['Método de Pago', 'Monto']],
                body: day.breakdown.map(item => [
                    item.method,
                    item.currency === 'USD'
                        ? `$ ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : `Bs ${item.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 7, fontStyle: 'bold' },
                styles: { fontSize: 7, cellPadding: 2 },
                margin: { left: 15, right: 15 },
            });

            nextY = doc.lastAutoTable.finalY + 8;
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(
                `Reporte generado automáticamente por ${currentStoreName} System — Pág. ${i} de ${pageCount}`,
                105, doc.internal.pageSize.height - 6, { align: 'center' }
            );
        }

        doc.save(`Historial_${currentStoreName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
        toast.success('Historial exportado exitosamente');
    };

    return (
        <div>
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 font-heading">Historial de Ventas</h1>
                    <p className="text-slate-500 mt-1">Resumen diario de ingresos por método de pago.</p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={loading || history.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FaFilePdf />
                    Reporte
                </button>
            </div>

            {/* Buscador de día específico */}
            <DateSearchPanel effectiveTiendaId={effectiveTiendaId} formatDate={formatDate} />

            {loading ? (
                <div className="text-center py-10 text-slate-400">Cargando historial...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <FaCalendarAlt className="text-6xl text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">No hay historial de movimientos registrado aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {history.map((day, index) => (
                        <HistoryCard
                            key={index}
                            day={day}
                            formatDate={formatDate}
                            onViewDetail={fetchDayDetail}
                        />
                    ))}
                </div>
            )}

            {/* Modal de detalle */}
            {detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.6)' }}>
                    <div className="bg-white rounded-2xl p-8 flex items-center gap-4 shadow-2xl">
                        <svg className="animate-spin h-7 w-7 text-orange-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span className="text-slate-700 font-semibold">Cargando detalle...</span>
                    </div>
                </div>
            )}

            {showDetailModal && dayDetail && (
                <DayDetailModal
                    detail={dayDetail}
                    onClose={() => { setShowDetailModal(false); setDayDetail(null); }}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

export default HistoryPage;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaMoneyBillWave, FaExchangeAlt, FaChevronDown, FaChevronUp, FaFilePdf } from 'react-icons/fa';
import API_URL from '../../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setHistory(data);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
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

        // ── Header ──
        doc.setFillColor(...slateColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('ROPA MANIA — HISTORIAL DE VENTAS', 15, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${date} ${time}`, 15, 30);
        doc.text(`Total de días: ${history.length}`, 150, 30);

        // ── Resumen general ──
        const totalUSDGlobal = history.reduce((sum, d) => sum + d.totalUSD + (d.totalBS / (parseFloat(d.tasa) || 1)), 0);
        doc.setFillColor(...greenColor);
        doc.roundedRect(15, 47, 180, 16, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL GENERAL: $ ${totalUSDGlobal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, 57);

        // ── Tabla principal ──
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
            columnStyles: {
                4: { fontStyle: 'bold', textColor: [...greenColor] }
            }
        });

        // ── Desglose por método (página nueva si hace falta) ──
        let nextY = doc.lastAutoTable.finalY + 12;

        history.forEach((day) => {
            if (!day.breakdown || day.breakdown.length === 0) return;

            // Check if we need a new page
            if (nextY > 240) {
                doc.addPage();
                nextY = 20;
            }

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

        // ── Footer ──
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(
                `Reporte generado automáticamente por Ropa Mania System — Pág. ${i} de ${pageCount}`,
                105, doc.internal.pageSize.height - 6, { align: 'center' }
            );
        }

        doc.save(`Historial_RopaMania_${date.replace(/\//g, '-')}.pdf`);
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

            {loading ? (
                <div className="text-center py-10 text-slate-400">Cargando historial...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <FaCalendarAlt className="text-6xl text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">No hay historial de movimientos registrado aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map((day, index) => (
                        <HistoryCard
                            key={index}
                            day={day}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const HistoryCard = ({ day, formatDate }) => {
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Raw Sales */}
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 font-bold uppercase">Venta Bs</span>
                            <span className="text-sm font-bold text-slate-700">{day.totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 font-bold uppercase">Venta $</span>
                            <span className="text-sm font-bold text-slate-700">$ {day.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Global Totals */}
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

export default HistoryPage;

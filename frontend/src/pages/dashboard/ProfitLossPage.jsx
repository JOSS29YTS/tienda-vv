import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaChartLine, FaArrowUp, FaArrowDown, FaEquals,
    FaMoneyBillWave, FaShoppingCart, FaFileInvoiceDollar,
    FaCogs, FaHandHoldingUsd, FaCalendarAlt, FaSpinner, FaFilePdf
} from 'react-icons/fa';
import { useRate } from '../../context/RateContext';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import API_URL from '../../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// ─── Mini Bar Chart ───────────────────────────────────────────────
const MiniBarChart = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Sin datos suficientes
        </div>
    );

    const maxVal = Math.max(...data.flatMap(d => [d.ingresos, d.egresos])) || 1;

    return (
        <div className="flex items-end gap-2 h-40 w-full px-2">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex gap-0.5 items-end h-32">
                        {/* Ingresos */}
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(d.ingresos / maxVal) * 100}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 }}
                            className="flex-1 bg-emerald-500 rounded-t-md opacity-90"
                            title={`Ingresos: $${d.ingresos.toFixed(2)}`}
                        />
                        {/* Egresos */}
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(d.egresos / maxVal) * 100}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 + 0.1 }}
                            className="flex-1 bg-red-400 rounded-t-md opacity-90"
                            title={`Egresos: $${d.egresos.toFixed(2)}`}
                        />
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold text-center leading-tight">{d.mes}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Summary Card ─────────────────────────────────────────────────
const SummaryCard = ({ title, value, valueBs, icon: Icon, color, bg, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={`${bg} rounded-2xl p-6 flex items-center gap-4 shadow-sm border border-white/60`}
    >
        <div className={`p-4 rounded-xl ${color} text-white shadow-lg`}>
            <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-black text-slate-800 font-mono truncate">
                $ {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 font-mono">
                Bs {valueBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
        </div>
    </motion.div>
);

// ─── Period Selector ──────────────────────────────────────────────
const periods = [
    { value: 'month', label: 'Este Mes' },
    { value: 'prev_month', label: 'Mes Anterior' },
    { value: 'year', label: 'Este Año' },
    { value: 'custom', label: 'Personalizado' },
];

// ─── Main Component ───────────────────────────────────────────────
const periodLabel = (period, startDate, endDate) => {
    const today = new Date();
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    if (period === 'month') {
        return capitalize(today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
    }
    if (period === 'prev_month') {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return capitalize(prev.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
    }
    if (period === 'year') return `Año ${today.getFullYear()}`;
    if (period === 'custom' && startDate && endDate) {
        return `${startDate} al ${endDate}`;
    }
    return 'Período';
};

const ProfitLossPage = () => {
    const { rate } = useRate();
    const { user } = useAuth();
    const { effectiveTiendaId, selectedTienda } = useStore();
    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '&tienda=global';
            let url = `${API_URL}/api/profit-loss?period=${period}${tiendaParam}`;
            if (period === 'custom' && startDate && endDate) {
                url += `&startDate=${startDate}&endDate=${endDate}`;
            }
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar datos');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (period !== 'custom') fetchData();
    }, [period, effectiveTiendaId]);

    const handleGenerateReport = () => {
        if (!data || !resumen) {
            toast.error('No hay datos para generar el reporte');
            return;
        }

        const doc = new jsPDF();
        const r = Math.round((parseFloat(rate) || 1) * 100) / 100;
        const slateColor = [15, 23, 42];
        const primaryColor = [249, 115, 22];
        const greenColor = [16, 185, 129];
        const redColor = [239, 68, 68];
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        const label = periodLabel(period, startDate, endDate);

        // ── Header ──
        doc.setFillColor(...slateColor);
        doc.rect(0, 0, 210, 42, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const tiendaName = selectedTienda ? selectedTienda.nb_tienda.toUpperCase() : 'ROPA MANIA';
        doc.text(`${tiendaName} — BALANCE FINANCIERO`, 15, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${label}`, 15, 28);
        doc.text(`Generado: ${date} ${time}`, 15, 35);
        doc.setFontSize(9);
        doc.text(`Por: ${user ? user.nombre + ' ' + user.apellido : 'Usuario'}`, 150, 28);

        // ── Balance Neto ──
        const isProfit = resumen.balanceNeto >= 0;
        doc.setFillColor(...(isProfit ? greenColor : redColor));
        doc.roundedRect(15, 50, 180, 28, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(isProfit ? 'RESULTADO: GANANCIA' : 'RESULTADO: PÉRDIDA', 25, 61);
        doc.setFontSize(18);
        const balSign = isProfit ? '+' : '-';
        doc.text(`${balSign}$ ${Math.abs(resumen.balanceNeto).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, 73);
        doc.setFontSize(10);
        const margen = resumen.totalIngresos > 0
            ? `Margen: ${((resumen.balanceNeto / resumen.totalIngresos) * 100).toFixed(1)}%`
            : 'Margen: —';
        doc.text(margen, 155, 73);

        // ── Resumen General ──
        doc.setTextColor(...slateColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen General', 15, 90);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(15, 93, 195, 93);

        autoTable(doc, {
            startY: 96,
            head: [['Concepto', 'Monto (USD)', 'Monto (Bs)']],
            body: [
                ['Total Ingresos', `$ ${resumen.totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `Bs ${(Math.round(resumen.totalIngresos * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['  · Compras de Mercancía', `$ ${resumen.desglose.compras.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `Bs ${(Math.round(resumen.desglose.compras * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['  · Gastos Operativos', `$ ${resumen.desglose.gastosOperativos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `Bs ${(Math.round(resumen.desglose.gastosOperativos * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['  · Pagos de Préstamos', `$ ${resumen.desglose.pagosPrestamos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `Bs ${(Math.round(resumen.desglose.pagosPrestamos * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Total Egresos', `$ ${resumen.totalEgresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `Bs ${(Math.round(resumen.totalEgresos * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: slateColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (hookData) => {
                if (hookData.row.index === 0) hookData.cell.styles.textColor = [...greenColor];
                if (hookData.row.index === 4) hookData.cell.styles.textColor = [...redColor];
            }
        });

        let nextY = doc.lastAutoTable.finalY + 10;

        // ── Ingresos por Método ──
        if (data.ingresosDetalle?.length > 0) {
            doc.setTextColor(...slateColor);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Ingresos por Método de Pago', 15, nextY);
            doc.line(15, nextY + 3, 195, nextY + 3);

            autoTable(doc, {
                startY: nextY + 6,
                head: [['Método de Pago', 'Monto (USD)', 'Monto (Bs)', '% del Total']],
                body: data.ingresosDetalle.map(item => [
                    item.metodo,
                    `$ ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    `Bs ${(Math.round(item.total * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    resumen.totalIngresos > 0 ? `${((item.total / resumen.totalIngresos) * 100).toFixed(1)}%` : '0%'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [240, 253, 244] },
            });
            nextY = doc.lastAutoTable.finalY + 10;
        }

        // ── Gastos Operativos ──
        if (data.gastosOperativosDetalle?.length > 0) {
            doc.setTextColor(...slateColor);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Detalle de Gastos Operativos', 15, nextY);
            doc.line(15, nextY + 3, 195, nextY + 3);

            autoTable(doc, {
                startY: nextY + 6,
                head: [['Tipo de Gasto', 'Monto (USD)', 'Monto (Bs)']],
                body: data.gastosOperativosDetalle.map(item => [
                    item.tipo,
                    `$ ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    `Bs ${(Math.round(item.total * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                ]),
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [255, 251, 235] },
            });
        }

        // ── Footer ──
        const pageH = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Reporte generado automáticamente por Ropa Mania System.', 105, pageH - 8, { align: 'center' });

        doc.save(`Balance_RopaMania_${label.replace(/\s/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
        toast.success('Reporte PDF descargado exitosamente');
    };

    const handleCustomSearch = () => {
        if (startDate && endDate) fetchData();
    };

    const r = Math.round((parseFloat(rate) || 1) * 100) / 100;
    const resumen = data?.resumen;
    const balance = resumen?.balanceNeto ?? 0;
    const isProfit = balance >= 0;

    return (
        <div className="space-y-8">
            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 font-heading flex items-center gap-3">
                        <span className={`p-2.5 rounded-xl text-white shadow-lg ${isProfit ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            <FaChartLine size={20} />
                        </span>
                        Balance de Ganancias y Pérdidas
                    </h2>
                    <p className="text-slate-500 mt-1 ml-14">Estado financiero detallado del negocio</p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-3">
                    {/* PDF Button */}
                    <button
                        onClick={handleGenerateReport}
                        disabled={!data || loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf />
                        Reporte
                    </button>

                    {/* Period Selector */}
                    <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        {periods.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === p.value
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Date Range */}
            <AnimatePresence>
                {period === 'custom' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                    >
                        <FaCalendarAlt className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                        <span className="text-sm font-bold text-slate-600">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                        <button
                            onClick={handleCustomSearch}
                            disabled={!startDate || !endDate}
                            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Buscar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading / Error */}
            {loading && (
                <div className="flex items-center justify-center py-24 text-slate-400">
                    <FaSpinner className="animate-spin text-3xl mr-3" />
                    <span className="font-medium">Calculando balance...</span>
                </div>
            )}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6 text-center font-medium">
                    {error}
                </div>
            )}

            {!loading && !error && resumen && (
                <>
                    {/* ─── Balance Hero ─── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative rounded-3xl p-8 overflow-hidden shadow-xl ${isProfit
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-br from-red-500 to-rose-600'
                            }`}
                    >
                        {/* Decoration */}
                        <div className="absolute -right-10 -top-10 opacity-10">
                            {isProfit ? <FaArrowUp className="text-[12rem]" /> : <FaArrowDown className="text-[12rem]" />}
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <p className="text-white/70 font-bold text-sm uppercase tracking-widest mb-2">
                                    {isProfit ? '🟢 RESULTADO: GANANCIA' : '🔴 RESULTADO: PÉRDIDA'}
                                </p>
                                <div className="text-6xl font-black text-white tracking-tight font-mono">
                                    {isProfit ? '+' : '-'}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-white/60 font-mono text-lg mt-1">
                                    Bs {(Math.abs(balance) * r).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20 text-white">
                                    <p className="text-white/60 text-xs font-bold uppercase">Margen</p>
                                    <p className="text-2xl font-black">
                                        {resumen.totalIngresos > 0
                                            ? `${((balance / resumen.totalIngresos) * 100).toFixed(1)}%`
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ─── Summary Cards ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SummaryCard
                            title="Total Ingresos"
                            value={resumen.totalIngresos}
                            valueBs={resumen.totalIngresos * r}
                            icon={FaArrowUp}
                            color="bg-emerald-500"
                            bg="bg-emerald-50"
                            delay={0.05}
                        />
                        <SummaryCard
                            title="Total Egresos"
                            value={resumen.totalEgresos}
                            valueBs={resumen.totalEgresos * r}
                            icon={FaArrowDown}
                            color="bg-red-500"
                            bg="bg-red-50"
                            delay={0.1}
                        />
                    </div>

                    {/* ─── Detailed Breakdown ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* INGRESOS DETALLE */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
                                    <FaMoneyBillWave size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">Ingresos por Método de Pago</h3>
                                    <p className="text-xs text-slate-400">Ventas cobradas del período</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                {data.ingresosDetalle.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-6">Sin ingresos en este período</p>
                                ) : data.ingresosDetalle.map((item, i) => {
                                    const pct = resumen.totalIngresos > 0 ? (item.total / resumen.totalIngresos) * 100 : 0;
                                    return (
                                        <div key={i} className="group">
                                            <div className="flex justify-between items-center mb-1 px-1">
                                                <span className="text-sm font-bold text-slate-700">{item.metodo}</span>
                                                <span className="text-sm font-mono font-black text-emerald-700">
                                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.7, delay: i * 0.05 }}
                                                    className="h-full bg-emerald-500 rounded-full"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 text-right mt-0.5 px-1">
                                                Bs {(item.montoOriginalBs ?? (Math.round(item.total * r * 100) / 100)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {pct.toFixed(1)}%
                                            </p>
                                        </div>
                                    );
                                })}
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center px-1">
                                    <span className="text-sm font-black text-slate-600 uppercase">Total</span>
                                    <span className="font-mono font-black text-emerald-700 text-base">
                                        ${resumen.totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* EGRESOS DETALLE */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2.5 bg-red-100 rounded-xl text-red-500">
                                    <FaShoppingCart size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">Desglose de Egresos</h3>
                                    <p className="text-xs text-slate-400">Todos los gastos del período</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Compras */}
                                <EgresoRow
                                    icon={FaShoppingCart}
                                    label="Compras de Mercancía"
                                    value={resumen.desglose.compras}
                                    total={resumen.totalEgresos}
                                    rate={r}
                                    color="bg-blue-500"
                                    barColor="bg-blue-500"
                                    delay={0}
                                />
                                {/* Gastos Operativos */}
                                <EgresoRow
                                    icon={FaCogs}
                                    label="Gastos Operativos"
                                    value={resumen.desglose.gastosOperativos}
                                    total={resumen.totalEgresos}
                                    rate={r}
                                    color="bg-amber-500"
                                    barColor="bg-amber-500"
                                    delay={0.05}
                                />
                                {/* Pagos Préstamos */}
                                <EgresoRow
                                    icon={FaHandHoldingUsd}
                                    label="Pagos de Préstamos"
                                    value={resumen.desglose.pagosPrestamos}
                                    total={resumen.totalEgresos}
                                    rate={r}
                                    color="bg-purple-500"
                                    barColor="bg-purple-500"
                                    delay={0.1}
                                />

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center px-1">
                                    <span className="text-sm font-black text-slate-600 uppercase">Total</span>
                                    <span className="font-mono font-black text-red-600 text-base">
                                        ${resumen.totalEgresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ─── Gastos Operativos Detalle ─── */}
                    {data.gastosOperativosDetalle?.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                                    <FaCogs size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">Detalle de Gastos Operativos</h3>
                                    <p className="text-xs text-slate-400">Pagos fijos por categoría</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipo de Gasto</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Monto (USD)</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Monto (Bs)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.gastosOperativosDetalle.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 text-sm font-bold text-slate-700">{item.tipo}</td>
                                                <td className="px-6 py-3 text-right font-mono font-black text-red-600 text-sm">
                                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-slate-500 text-sm">
                                                    Bs {(Math.round(item.total * r * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── Chart ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-black text-slate-800">Tendencia Mensual</h3>
                                <p className="text-xs text-slate-400">Año {new Date().getFullYear()} — Ingresos vs Egresos</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Ingresos</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Egresos</span>
                            </div>
                        </div>
                        <MiniBarChart data={data.monthlyChart} />
                    </motion.div>
                </>
            )}
        </div>
    );
};

// ─── Egreso Row Helper ────────────────────────────────────────────
const EgresoRow = ({ icon: Icon, label, value, total, rate, color, barColor, delay }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <span className={`p-1 rounded-md text-white text-xs ${color}`}><Icon /></span>
                    {label}
                </span>
                <span className="text-sm font-mono font-black text-red-600">
                    ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay }}
                    className={`h-full ${barColor} rounded-full`}
                />
            </div>
            <p className="text-xs text-slate-400 text-right mt-0.5 px-1">
                Bs {(Math.round(value * rate * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {pct.toFixed(1)}%
            </p>
        </div>
    );
};

export default ProfitLossPage;

import React from 'react';
import { motion } from 'framer-motion';
import { FaBox, FaMoneyBillWave, FaShoppingCart, FaUserFriends, FaArrowUp, FaArrowDown, FaReceipt, FaChartLine, FaCalendarDay } from 'react-icons/fa';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, gradient, footerText }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-6 rounded-3xl shadow-lg border-0 overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${gradient}`}
        >
            {/* Background Decoration */}
            <div className="absolute -right-6 -top-6 text-white opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-110 rotate-12">
                <Icon className="text-[10rem]" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/10">
                        <Icon className="text-2xl" />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/10">
                            {trend === 'up' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-white/80 font-bold text-xs mb-1 uppercase tracking-wider">{title}</h3>
                    <div className="text-4xl font-black text-white tracking-tight">{value}</div>
                    <p className="text-white/60 text-xs mt-2 font-medium flex items-center gap-1">
                        <FaChartLine /> {footerText || 'vs mes anterior'}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API_URL from '../../config/api';

const DashboardHome = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                const data = await response.json();

                if (response.ok) {
                    setStats(data.stats);
                    setChartData(data.chart || []);
                    setTopProducts(data.topProducts || []);
                }
            } catch (error) {
                console.error("Error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleGenerateReport = () => {
        if (!stats) return;

        const doc = new jsPDF();
        const secondaryColor = [15, 23, 42]; // Slate 900
        const primaryColor = [249, 115, 22]; // Orange 500

        // Header
        doc.setFillColor(...secondaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ROPA MANIA SYSTEM', 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE EJECUTIVO DE ROPA MANIA', 20, 30);

        // Metadata
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        doc.setFontSize(10);
        doc.text(`Fecha: ${date} ${time}`, 140, 20);
        doc.text(`Generado por: ${user ? user.nombre + ' ' + user.apellido : 'Usuario'}`, 140, 28);

        // Section: Resumen General
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long' });
        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        doc.text(`Resumen General de ${capitalize(currentMonth)}`, 20, 55);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(20, 58, 190, 58);

        // Stats Boxes Helper
        const drawStatBox = (x, y, title, value, color) => {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, y, 38, 30, 2, 2, 'FD');
            doc.setDrawColor(...color);
            doc.setLineWidth(1);
            doc.line(x, y, x + 38, y);
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(title.toUpperCase(), x + 19, y + 10, { align: 'center' });
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.text(String(value), x + 19, y + 22, { align: 'center' });
        };

        const salesVal = `$ ${stats.sales?.value?.toLocaleString() || '0'}`;
        drawStatBox(20, 65, 'Ventas Totales', salesVal, primaryColor);

        const todaySalesVal = `$ ${stats.todaySales?.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;
        drawStatBox(65, 65, 'Ventas de Hoy', todaySalesVal, [245, 158, 11]); // Amber

        drawStatBox(110, 65, 'Productos Vendidos', stats.totalSold?.value || 0, [239, 68, 68]); // Red
        drawStatBox(155, 65, 'Productos Activos', stats.products?.value || 0, [59, 130, 246]); // Blue


        // Section: Top Products
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(14);
        doc.text('Productos Más Vendidos', 20, 110);
        doc.setDrawColor(...primaryColor);
        doc.line(20, 113, 190, 113);

        const tableData = topProducts.map((p, i) => [
            i + 1,
            p.name,
            p.category || 'General',
            p.sold
        ]);

        autoTable(doc, {
            startY: 120,
            head: [['#', 'Producto', 'Categoría', 'Unidades Vendidas']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 120 }
        });

        const footerY = doc.internal.pageSize.height - 10;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Este documento es un reporte generado automáticamente por Ropa Mania System.', 105, footerY, { align: 'center' });

        doc.save(`Reporte_RopaMania_${date.replace(/\//g, '-')}.pdf`);
        toast.success('Reporte PDF descargado exitosamente');
    };

    if (loading) return <div className="p-8 text-slate-500">Cargando tablero...</div>;

    return (
        <div>
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 font-heading tracking-tight">
                        Hola, <span className="text-orange-600">{user ? user.nombre : 'Usuario'}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Aquí tienes el resumen de tu tienda hoy.</p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all hover:shadow-xl active:scale-95 flex items-center gap-2"
                >
                    <FaChartLine />
                    Generar Reporte
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Ventas del Mes"
                    value={`$ ${stats?.sales?.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    icon={FaMoneyBillWave}
                    trend={stats?.sales?.trend >= 0 ? 'up' : 'down'}
                    trendValue={`${Math.abs(stats?.sales?.trend || 0).toFixed(1)}%`}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
                <StatCard
                    title="Ventas de Hoy"
                    value={`$ ${stats?.todaySales?.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    icon={FaCalendarDay}
                    trend="up"
                    trendValue="hoy"
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    footerText="ventas del día actual"
                />
                <StatCard
                    title="Productos Vendidos"
                    value={stats?.totalSold?.value || 0}
                    icon={FaShoppingCart}
                    trend="up"
                    trendValue={`total`}
                    gradient="bg-gradient-to-br from-red-500 to-rose-600"
                    footerText="unidades vendidas"
                />
                <StatCard
                    title="Productos Activos"
                    value={stats?.products?.value || 0}
                    icon={FaBox}
                    trend="up" // Static for now
                    trendValue="0%"
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                />

            </div>

            {/* Charts & Lists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart Area */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">Resumen de Ingresos</h3>
                            <p className="text-slate-400 text-sm">Comportamiento de ventas anual</p>
                        </div>
                        <select className="text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold px-4 py-2 cursor-pointer outline-none hover:bg-slate-100 transition-colors">
                            <option>Últimos 12 meses</option>
                            <option>Últimos 30 días</option>
                            <option>Últimos 7 días</option>
                        </select>
                    </div>

                    <div className="flex-1 flex flex-col justify-end relative min-h-[250px]">
                        {(!chartData || chartData.length === 0) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <FaChartLine className="text-5xl opacity-20 mb-3" />
                                <p className="font-medium text-sm">No hay datos de ingresos registrados aún</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-end justify-between gap-3 h-full px-2 pb-2 border-b border-slate-100">
                                    {chartData.map((data, i) => {
                                        // Normalize height for visualization relative to max value
                                        const maxVal = Math.max(...chartData.map(d => parseFloat(d.total)));
                                        const heightPercent = maxVal > 0 ? (parseFloat(data.total) / maxVal) * 100 : 0;

                                        return (
                                            <div key={i} className="w-full bg-slate-50 rounded-t-xl relative group transition-all hover:bg-slate-100 h-full flex items-end tooltip" data-tip={`$${parseFloat(data.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${heightPercent}%` }}
                                                    transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                                                    className="w-full bg-orange-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all shadow-lg shadow-orange-200"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-4 text-xs text-slate-400 font-bold uppercase tracking-wider px-2">
                                    {chartData.map((d, i) => (
                                        <span key={i}>{d.month_name}</span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <h3 className="font-bold text-xl text-slate-800 mb-2">Más Vendidos</h3>
                    <p className="text-slate-400 text-sm mb-6">Productos estrella del mes</p>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">
                        {topProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                                <FaBox className="text-4xl mb-2 opacity-20" />
                                <p className="text-sm">No hay datos de ventas aún.</p>
                            </div>
                        ) : (
                            topProducts.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100">
                                    <div className={`p-4 rounded-xl text-white shadow-lg ${index === 0 ? 'bg-amber-400 shadow-amber-200' :
                                        index === 1 ? 'bg-slate-300 shadow-slate-200' :
                                            index === 2 ? 'bg-orange-300 shadow-orange-200' : 'bg-slate-100 text-slate-400 shadow-none'
                                        }`}>
                                        <FaBox className="text-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-700 text-sm group-hover:text-orange-600 transition-colors">{item.name}</h4>
                                        <p className="text-xs text-slate-400 font-medium">{item.category || 'General'}</p>
                                    </div>
                                    <div className="text-slate-800 font-black text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                        {item.sold}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/inventory')}
                        className="w-full mt-6 py-4 border-2 border-slate-100 rounded-2xl text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-200 transition-all uppercase tracking-wide"
                    >
                        Ver Inventario Completo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;

import React from 'react';
import { motion } from 'framer-motion';
import { FaBox, FaMoneyBillWave, FaShoppingCart, FaUserFriends, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, bgClass, iconColorClass }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group"
        >
            <div className={`absolute -right-4 -top-4 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none`}>
                <Icon className={`text-9xl text-slate-800`} />
            </div>

            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${bgClass} ${iconColorClass}`}>
                    <Icon className="text-xl" />
                </div>
                <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
            </div>

            <div className="relative z-10">
                <div className="text-3xl font-bold text-slate-800 mb-2">{value}</div>
                <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend === 'up' ? <FaArrowUp /> : <FaArrowDown />}
                    <span>{trendValue}</span>
                    <span className="text-slate-400 font-normal ml-1">vs mes anterior</span>
                </div>
            </div>
        </motion.div>
    );
};

import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

const DashboardHome = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:3000/api/dashboard/stats', {
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

    if (loading) return <div className="p-8 text-slate-500">Cargando tablero...</div>;

    return (
        <div>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 font-heading">Bienvenido, {user ? user.nombre : 'Usuario'}</h1>
                    <p className="text-slate-500 mt-1">Aquí tienes un resumen de lo que está pasando en tu bodega hoy.</p>
                </div>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow hover:bg-emerald-700 transition">
                    Generar Reporte
                </button>
            </div>

            {/* Content area is now clean for future implementation */}
            {/* Stats Grid */}
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Ventas del Mes"
                    value={`$ ${stats?.sales?.value?.toLocaleString() || '0'}`} // Assuming backend sends USD total, or adjust label if BS.
                    icon={FaMoneyBillWave}
                    trend={stats?.sales?.trend >= 0 ? 'up' : 'down'}
                    trendValue={`${Math.abs(stats?.sales?.trend || 0).toFixed(1)}%`}
                    bgClass="bg-emerald-100"
                    iconColorClass="text-emerald-600"
                />
                <StatCard
                    title="Pedidos Nuevos"
                    value={stats?.orders?.value || 0}
                    icon={FaShoppingCart}
                    trend={stats?.orders?.trend >= 0 ? 'up' : 'down'}
                    trendValue={`${Math.abs(stats?.orders?.trend || 0).toFixed(1)}%`}
                    bgClass="bg-blue-100"
                    iconColorClass="text-blue-600"
                />
                <StatCard
                    title="Productos"
                    value={stats?.products?.value || 0}
                    icon={FaBox}
                    trend="up" // Static for now
                    trendValue="0%"
                    bgClass="bg-orange-100"
                    iconColorClass="text-orange-600"
                />
                <StatCard
                    title="Clientes"
                    value={stats?.clients?.value || 0}
                    icon={FaUserFriends}
                    trend="up" // Static for now
                    trendValue="0%"
                    bgClass="bg-purple-100"
                    iconColorClass="text-purple-600"
                />
            </div>

            {/* Charts & Lists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart Area */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Resumen de Ventas</h3>
                        <select className="text-xs bg-slate-50 border-none rounded-lg text-slate-500 font-bold p-2 cursor-pointer outline-none">
                            <option>Últimos 12 meses</option>
                            <option>Últimos 30 días</option>
                            <option>Últimos 7 días</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-4 pb-4 border-b border-slate-50">
                        {/* Fake Chart Bars for visual placeholder */}
                        {[35, 45, 30, 60, 75, 50, 65, 80, 55, 70, 45, 90].map((h, i) => (
                            <div key={i} className="w-full bg-emerald-50 rounded-t-lg relative group transition-all hover:bg-emerald-100">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 1, delay: i * 0.05 }}
                                    className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all mx-1"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-slate-400 font-bold uppercase">
                        <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                        <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6">Productos Más Vendidos</h3>
                    <div className="space-y-4">
                        <div className="space-y-4">
                            {topProducts.length === 0 ? (
                                <p className="text-sm text-slate-400">No hay datos de ventas aún.</p>
                            ) : (
                                topProducts.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                                        <div className="p-3 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <FaBox />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-700 text-sm">{item.name}</h4>
                                            <p className="text-xs text-slate-400">{item.category || 'Sin Categoría'}</p>
                                        </div>
                                        <div className="text-emerald-600 font-black text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                                            {item.sold} un
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <button className="w-full mt-6 py-3 border border-slate-100 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors">
                        Ver Todos los Productos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;

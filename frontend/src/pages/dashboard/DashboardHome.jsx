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

const DashboardHome = () => {
    const { user } = useAuth();

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
            <div className="min-h-[400px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                <p>Selecciona una opción del menú para comenzar</p>
            </div>
        </div>
    );
};

export default DashboardHome;

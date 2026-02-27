import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMoneyBillWave, FaUserTie, FaUserTag } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';

const StatCard = ({ title, bgClass, textClass, icon: Icon, stats }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative p-6 rounded-3xl shadow-lg border-0 overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${bgClass}`}
    >
        <div className="absolute -right-6 -top-6 text-white opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-110 rotate-12">
            <Icon className="text-[10rem]" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/10`}>
                    <Icon className="text-3xl" />
                </div>
                <h3 className="text-white font-black text-2xl tracking-wider uppercase">{title}</h3>
            </div>

            <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="text-white/80 font-bold text-sm mb-1 uppercase tracking-wider">Comisión Ganada</div>
                    <div className="text-3xl font-black text-white tracking-tight">
                        ${stats.comision.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="text-white/80 font-bold text-sm mb-1 uppercase tracking-wider">Bonificación Fija</div>
                    <div className="text-3xl font-black text-white tracking-tight">
                        ${stats.bonificacion.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white/20 p-4 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg mt-4">
                    <div className="text-white/90 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2">
                        <FaMoneyBillWave />
                        Total A Pagar
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter">
                        ${stats.total.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);


const CommissionsPage = () => {
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        gerente: { comision: 0, bonificacion: 0, total: 0 },
        vendedor: { comision: 0, bonificacion: 0, total: 0 },
        totalSales: 0
    });

    useEffect(() => {
        fetchCommissions();
    }, []);

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/commissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }

            if (res.ok) {
                const info = await res.json();
                setData(info);
            } else {
                toast.error('Error al cargar datos de comisiones');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative">
            <Toaster position="top-right" />
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Comisiones</h2>
                    <p className="text-slate-500 mt-1">
                        Cálculo de comisiones por ventas basado en la recaudación del mes actual.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 mt-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg">
                        <span>Ventas Base del Mes:</span>
                        <span className="text-emerald-400 text-lg">${data.totalSales.toFixed(2)}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StatCard
                    title="Gerente"
                    bgClass="bg-gradient-to-br from-indigo-500 to-blue-700"
                    textClass="text-blue-100"
                    icon={FaUserTie}
                    stats={data.gerente}
                />

                <StatCard
                    title="Vendedor"
                    bgClass="bg-gradient-to-br from-emerald-500 to-teal-700"
                    textClass="text-emerald-100"
                    icon={FaUserTag}
                    stats={data.vendedor}
                />
            </div>
        </div>
    );
};

export default CommissionsPage;

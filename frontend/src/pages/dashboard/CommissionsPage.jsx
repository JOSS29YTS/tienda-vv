import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMoneyBillWave, FaUserTie, FaUserTag } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import API_URL from '../../config/api';
import { useRate } from '../../context/RateContext';

const StatCard = ({ title, bgClass, textClass, icon: Icon, stats, onPay }) => {
    const { rate } = useRate();
    const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
    const cleanTotal = Math.round((stats.total || 0) * 100) / 100;
    const totalBs = (cleanTotal * cleanRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
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
                        <div className="flex flex-col">
                            <div className="text-5xl font-black text-white tracking-tighter">
                                ${stats.total.toFixed(2)}
                            </div>
                            <div className="text-white/80 font-bold text-lg mt-1 tracking-tight">
                                ≈ {totalBs} Bs.
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onPay(title, stats.total)}
                        className="w-full mt-4 py-3 bg-white text-slate-800 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        Pagar {title}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};


const CommissionsPage = () => {
    const { rate } = useRate();
    const { logout } = useAuth();
    const { effectiveTiendaId } = useStore();
    const roundedRate = parseFloat(parseFloat(rate || 0).toFixed(2));
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [methods, setMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState('');

    const [loading, setLoading] = useState(true);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payInfo, setPayInfo] = useState({ recipient: '', amount: 0 });
    const [isPaying, setIsPaying] = useState(false);
    const [data, setData] = useState({
        gerente: { comision: 0, bonificacion: 0, total: 0 },
        vendedor: { comision: 0, bonificacion: 0, total: 0 },
        totalSales: 0
    });

    const months = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);


    useEffect(() => {
        fetchCommissions();
        fetchMethods();
    }, [selectedMonth, selectedYear, effectiveTiendaId]);

    const fetchMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/payment-methods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const methodsData = await res.json();
                setMethods(methodsData.filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO', 'BANCO (POS)'].includes(m.nb_metodo_pago.toUpperCase())));
                if (methodsData.length > 0) setSelectedMethod(methodsData[0].id_metodo_pago);
            }
        } catch (error) {
            console.error('Error fetching methods:', error);
        }
    };


    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '&tienda=global';
            const res = await fetch(`${API_URL}/api/finances/commissions?month=${selectedMonth}&year=${selectedYear}${tiendaParam}`, {
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
                toast.error('Error al cargar datos de comisiones', {
                    style: {
                        background: '#EF4444',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#EF4444',
                    },
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión', {
                style: {
                    background: '#EF4444',
                    color: '#fff',
                    zIndex: 9999
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePayClick = (recipient, amount) => {
        setPayInfo({ recipient, amount });
        setIsPayModalOpen(true);
    };

    const handlePaySubmit = async () => {
        if (!selectedMethod) {
            toast.error('Por favor selecciona un método de pago');
            return;
        }

        try {
            setIsPaying(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/commissions/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nb_beneficiario: payInfo.recipient,
                    id_metodo_pago: selectedMethod,
                    monto_usd: Math.round(payInfo.amount * 100) / 100,
                    tasa_dia: Math.round((parseFloat(rate) || 0) * 100) / 100,
                    id_tienda: effectiveTiendaId || 1,
                    month: selectedMonth,
                    year: selectedYear
                })
            });

            const result = await res.json();
            if (res.ok) {
                toast.success(`Comisión de ${payInfo.recipient} pagada exitosamente`, {
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#10B981',
                    },
                });
                setIsPayModalOpen(false);
                fetchCommissions();
            } else {
                toast.error(result.message || 'Error al procesar el pago', {
                    style: {
                        background: '#EF4444',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#EF4444',
                    },
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión al procesar el pago');
        } finally {
            setIsPaying(false);
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
                    <p className="text-slate-500 mt-1">Selecciona el periodo para ver y pagar comisiones pendientes.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg">
                        <span>Ventas Base:</span>
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
                    onPay={handlePayClick}
                />

                <StatCard
                    title="Vendedor"
                    bgClass="bg-gradient-to-br from-emerald-500 to-teal-700"
                    textClass="text-emerald-100"
                    icon={FaUserTag}
                    stats={data.vendedor}
                    onPay={handlePayClick}
                />
            </div>

            {/* Modal de Pago */}
            {isPayModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-slate-900 text-white p-6 relative">
                            <h3 className="text-2xl font-black">Confirmar Pago</h3>
                            <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Procesar Comisión</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-tighter">Beneficiario</span>
                                    <span className="text-xl font-black text-slate-800 uppercase tracking-tight">{payInfo.recipient}</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-500 font-bold text-xs uppercase ml-1">Método de Pago</label>
                                    <select
                                        value={selectedMethod}
                                        onChange={(e) => setSelectedMethod(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                    >
                                        <option value="">Selecciona Método</option>
                                        {methods.map(m => (
                                            <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                                                {m.nb_metodo_pago}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-slate-500 font-bold text-sm">Monto en Divisas</span>
                                    <span className="text-lg font-black text-slate-800">${payInfo.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-slate-500 font-bold text-sm">Tasa Aplicada</span>
                                    <span className="font-mono font-bold text-slate-700 text-sm">{roundedRate.toFixed(2)} Bs/$</span>
                                </div>
                                <div className="flex justify-between items-center py-4 bg-emerald-50 px-4 rounded-xl border border-emerald-100">
                                    <span className="text-emerald-700 font-black uppercase text-xs">Total Bolívares</span>
                                    <span className="text-xl font-black text-emerald-600">
                                        {(Math.round(payInfo.amount * 100) / 100 * (Math.round((parseFloat(rate) || 0) * 100) / 100)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setIsPayModalOpen(false)}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handlePaySubmit}
                                    disabled={isPaying || !selectedMethod}
                                    className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isPaying ? 'Procesando...' : 'Confirmar'}
                                    <FaMoneyBillWave />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

        </div>
    );
};

export default CommissionsPage;

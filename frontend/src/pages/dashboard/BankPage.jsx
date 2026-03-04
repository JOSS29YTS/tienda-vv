import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUniversity, FaExchangeAlt, FaArrowDown, FaArrowUp, FaMinus, FaCreditCard } from 'react-icons/fa';
import { useRate } from '../../context/RateContext';
import { useAuth } from '../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import API_URL from '../../config/api';

// Store accent colors by id_tienda
const STORE_STYLES = {
    1: { gradient: 'from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
    2: { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    3: { gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};
const DEFAULT_STYLE = { gradient: 'from-slate-500 to-slate-700', light: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' };

const BankPage = () => {
    const { rate } = useRate();
    const { logout } = useAuth();
    const roundedRate = parseFloat(parseFloat(rate || 0).toFixed(2));

    const [stores, setStores] = useState([]);
    const [posMethodId, setPosMethodId] = useState(3);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    // Traspaso modal
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [transferForm, setTransferForm] = useState({
        id_metodo_destino: '',
        monto: '',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
    });
    const [submitting, setSubmitting] = useState(false);

    // ── Fetch data ─────────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [summaryRes, methodsRes] = await Promise.all([
                fetch(`${API_URL}/api/finances/bank/pos-summary`, { headers }),
                fetch(`${API_URL}/api/finances/payment-methods`, { headers }),
            ]);

            if (summaryRes.status === 401) { logout(); return; }

            if (summaryRes.ok) {
                const data = await summaryRes.json();
                setStores(data.stores || []);
                setPosMethodId(data.posMethodId || 3);
            }
            if (methodsRes.ok) {
                const methods = await methodsRes.json();
                // Exclude MIXTO and the POS method itself as destination
                setPaymentMethods(methods.filter(m =>
                    !m.nb_metodo_pago.toUpperCase().includes('MIXTO') &&
                    !m.nb_metodo_pago.toUpperCase().includes('PUNTO')
                ));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setTransferForm(prev => ({ ...prev, tasa_dia: rate ? parseFloat(rate).toFixed(2) : '' }));
    }, [rate]);

    // ── Open traspaso modal ────────────────────────────────────────────────────
    const openTransfer = (store) => {
        setSelectedStore(store);
        setTransferForm({ id_metodo_destino: '', monto: store.neto_bs > 0 ? store.neto_bs.toFixed(2) : '', tasa_dia: parseFloat(rate).toFixed(2) });
        setIsTransferOpen(true);
    };

    // ── Submit traspaso ────────────────────────────────────────────────────────
    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        if (!transferForm.id_metodo_destino || !transferForm.monto) {
            toast.error('Completa todos los campos');
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/transfers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    id_metodo_origen: posMethodId,
                    id_metodo_destino: parseInt(transferForm.id_metodo_destino),
                    monto: parseFloat(transferForm.monto),
                    tasa_dia: parseFloat(transferForm.tasa_dia),
                    id_tienda: selectedStore.id_tienda,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Traspaso registrado');
                setIsTransferOpen(false);
                fetchData();
            } else {
                toast.error(data.message || 'Error al registrar traspaso');
            }
        } catch (err) {
            toast.error('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const formatBs = (n) => `Bs ${parseFloat(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    const formatUSD = (n) => `$ ${parseFloat(n || 0).toFixed(2)}`;

    const totalPos = stores.reduce((s, t) => s + t.total_pos_bs, 0);
    const totalTrspasado = stores.reduce((s, t) => s + t.total_traspasado_bs, 0);
    const totalNeto = stores.reduce((s, t) => s + t.neto_bs, 0);

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />

            {/* Header */}
            <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading flex items-center gap-3">
                        <FaUniversity className="text-slate-600" /> Banco — Punto de Venta
                    </h2>
                    <p className="text-slate-500 mt-1">Recaudación por punto de venta por tienda y traspasos realizados.</p>
                </div>
            </motion.header>

            {/* Global summary bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total POS Acumulado', value: totalPos, icon: FaArrowDown, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    { label: 'Total Traspasado', value: totalTrspasado, icon: FaExchangeAlt, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                    { label: 'Neto en Cuentas', value: totalNeto, icon: FaCreditCard, color: 'text-amber-700 bg-amber-50 border-amber-100' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`flex items-center gap-4 rounded-2xl border p-4 ${color}`}>
                        <div className="p-3 rounded-xl bg-white shadow-sm">
                            <Icon className={color.split(' ')[0]} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
                            <p className="font-black text-lg">{formatBs(value)}</p>
                            <p className="text-xs opacity-60">{formatUSD(value / (roundedRate || 1))}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Store cards */}
            {loading ? (
                <div className="text-center text-slate-400 py-16 font-bold">Cargando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map((store, idx) => {
                        const style = STORE_STYLES[store.id_tienda] || DEFAULT_STYLE;
                        return (
                            <motion.div key={store.id_tienda}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className={`rounded-3xl border-2 ${style.border} overflow-hidden shadow-sm`}>

                                {/* Store header */}
                                <div className={`bg-gradient-to-r ${style.gradient} p-5`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <FaUniversity className="text-white text-lg" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-lg">{store.nb_tienda}</h3>
                                            <p className="text-white/70 text-xs">Punto de Venta</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Balances */}
                                <div className={`${style.light} p-5 space-y-3`}>
                                    <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50 shadow-sm">
                                        {[
                                            { label: 'POS Recaudado', value: store.total_pos_bs, icon: FaArrowDown, color: 'text-emerald-500' },
                                            { label: 'Traspasado', value: store.total_traspasado_bs, icon: FaArrowUp, color: 'text-blue-500' },
                                            { label: 'Neto', value: store.neto_bs, icon: FaMinus, color: store.neto_bs >= 0 ? 'text-amber-600' : 'text-red-500', bold: true },
                                        ].map(({ label, value, icon: Icon, color, bold }) => (
                                            <div key={label} className="flex justify-between items-center px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`text-xs ${color}`} />
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-mono ${bold ? 'font-black text-base' : 'font-bold text-sm'} ${color}`}>
                                                        {formatBs(value)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {formatUSD(value / (roundedRate || 1))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Transfer button */}
                                    <button
                                        onClick={() => openTransfer(store)}
                                        disabled={store.neto_bs <= 0}
                                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${store.neto_bs > 0
                                                ? `bg-gradient-to-r ${style.gradient} text-white shadow-md hover:shadow-lg hover:-translate-y-0.5`
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <FaExchangeAlt /> Traspasar a Cuenta
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Traspaso Modal */}
            {isTransferOpen && selectedStore && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-slate-900 text-white p-6 rounded-t-2xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">Traspasar POS</h3>
                                <p className="text-slate-400 text-sm">{selectedStore.nb_tienda} → Cuenta destino</p>
                            </div>
                            <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>
                        <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                            {/* Info */}
                            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Disponible en POS:</span>
                                    <span className="font-black text-amber-700">{formatBs(selectedStore.neto_bs)}</span>
                                </div>
                            </div>

                            {/* Destination */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Cuenta Destino
                                </label>
                                <select
                                    value={transferForm.id_metodo_destino}
                                    onChange={e => setTransferForm(prev => ({ ...prev, id_metodo_destino: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccionar cuenta...</option>
                                    {paymentMethods.map(m => (
                                        <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Monto (Bs)
                                </label>
                                <input
                                    type="number" step="0.01" min="0.01"
                                    value={transferForm.monto}
                                    onChange={e => setTransferForm(prev => ({ ...prev, monto: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                    placeholder="Bs 0.00"
                                    required
                                />
                            </div>

                            {/* Rate */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Tasa del Día
                                </label>
                                <input
                                    type="number" step="0.01"
                                    value={transferForm.tasa_dia}
                                    onChange={e => setTransferForm(prev => ({ ...prev, tasa_dia: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>

                            <button type="submit" disabled={submitting}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-60">
                                <FaExchangeAlt />
                                {submitting ? 'Procesando...' : 'Confirmar Traspaso'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default BankPage;

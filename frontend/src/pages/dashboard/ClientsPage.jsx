import React, { useState, useEffect } from 'react';
import { useRate } from '../../context/RateContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaSearch, FaMoneyBillWave, FaHandHoldingUsd, FaFileInvoiceDollar, FaTimes, FaCheckCircle, FaExclamationCircle, FaHistory, FaShoppingBag } from 'react-icons/fa';
import API_URL from '../../config/api';

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    // Persisted Search & Rate
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('clientSearchTerm') || '');
    const [filterDate, setFilterDate] = useState('');
    const { rate, setRate } = useRate();

    // Payment Modal State (Persisted)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(() => localStorage.getItem('clientIsPaymentModalOpen') === 'true');
    const [selectedClient, setSelectedClient] = useState(() => {
        const saved = localStorage.getItem('clientSelectedClient');
        return saved ? JSON.parse(saved) : null;
    });
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);

    // Purchase History Modal State
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState([]);

    // Payment Logic State (Mixed) - Persisted
    const [payments, setPayments] = useState(() => {
        const saved = localStorage.getItem('clientPayments');
        return saved ? JSON.parse(saved) : [{ method: 'DIVISAS', amount: '', amountInUSD: 0, currency: 'USD' }];
    });

    // Notifications
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const fetchDebtors = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `${API_URL}/api/clients/debtors${filterDate ? `?date=${filterDate}` : ''}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar deudores');
            const data = await response.json();
            setClients(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sales/payment-methods`);
            const data = await response.json();
            setPaymentMethods(data.filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO', 'BANCO (POS)'].includes(m.nb_metodo_pago.toUpperCase())));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDebtors();
        fetchPaymentMethods();
    }, [filterDate]);

    // Persist State
    useEffect(() => {
        localStorage.setItem('clientSearchTerm', searchTerm);
        localStorage.setItem('clientIsPaymentModalOpen', isPaymentModalOpen);
        localStorage.setItem('clientSelectedClient', JSON.stringify(selectedClient));
        localStorage.setItem('clientPayments', JSON.stringify(payments));
    }, [searchTerm, isPaymentModalOpen, selectedClient, payments]);

    const handleOpenPaymentModal = (client) => {
        setSelectedClient(client);
        setPaymentAmount(client.deuda_actual);
        setPayments([{ method: 'DIVISAS', amount: '', amountInUSD: 0, currency: 'USD' }]);
        setIsPaymentModalOpen(true);
    };

    const handleOpenHistoryModal = async (client) => {
        setSelectedClient(client);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/clients/${client.id_cliente}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar historial');
            const data = await response.json();
            setPaymentHistory(data);
            setIsHistoryModalOpen(true);
        } catch (err) {
            setErrorMessage('Error al cargar historial: ' + err.message);
        }
    };

    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;

        // Auto convert if amount changes
        if (field === 'amount' || field === 'currency') {
            const amt = parseFloat(newPayments[index].amount) || 0;
            const cur = field === 'currency' ? value : newPayments[index].currency;

            if (cur === 'BS') {
                newPayments[index].amountInUSD = amt / rate;
            } else {
                newPayments[index].amountInUSD = amt;
            }
        }
        setPayments(newPayments);
    };
    const handleOpenPurchaseModal = async (client) => {
        setSelectedClient(client);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/clients/${client.id_cliente}/purchases`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar historial de compras');
            const data = await response.json();

            // Group by Date + Product
            const aggregated = data.reduce((acc, curr) => {
                const dateObj = new Date(curr.fecha_venta);
                const dateStr = dateObj.toLocaleDateString();
                const key = `${dateStr}-${curr.nb_producto}`;

                if (!acc[key]) {
                    acc[key] = {
                        ...curr,
                        fecha_venta: curr.fecha_venta,
                        cantidad: parseFloat(curr.cantidad),
                        total: parseFloat(curr.total)
                    };
                } else {
                    acc[key].cantidad += parseFloat(curr.cantidad);
                    acc[key].total += parseFloat(curr.total);
                }
                return acc;
            }, {});

            setPurchaseHistory(Object.values(aggregated));
            setIsPurchaseModalOpen(true);
        } catch (err) {
            setErrorMessage('Error al cargar historial: ' + err.message);
        }
    };



    const addPaymentMethod = () => {
        setPayments([...payments, { method: 'DIVISAS', amount: '', amountInUSD: 0, currency: 'USD' }]);
    };

    const removePaymentMethod = (index) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const calculateTotalPaymentUSD = () => {
        return payments.reduce((acc, curr) => acc + (curr.amountInUSD || 0), 0);
    };

    const handleConfirmPayment = async () => {
        const totalPay = calculateTotalPaymentUSD();
        if (totalPay <= 0) {
            setErrorMessage('El monto a pagar debe ser mayor a 0');
            return;
        }

        // Validación: no se puede pagar más de lo que se debe
        const deuda = parseFloat(selectedClient.deuda_actual);
        const exceso = totalPay - deuda;
        if (exceso > 0.01) {
            const excesoBs = exceso * parseFloat(rate);
            const totalBs = totalPay * parseFloat(rate);
            const deudaBs = deuda * parseFloat(rate);
            setErrorMessage(
                `El monto a pagar ($${totalPay.toFixed(2)} / Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) ` +
                `excede la deuda del cliente ($${deuda.toFixed(2)} / Bs ${deudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}). ` +
                `Exceso: $${exceso.toFixed(2)} / Bs ${excesoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
            );
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/clients/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientId: selectedClient.id_cliente,
                    amount: totalPay,
                    rate: rate,
                    paymentDetails: payments.map(p => ({
                        method: p.method,
                        amountInUSD: p.amountInUSD,
                        remainingAmount: p.amountInUSD // Initial state for backend logic
                    }))
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setSuccessMessage('Pago registrado exitosamente');

            // Clear payment state & storage
            setIsPaymentModalOpen(false);
            setSelectedClient(null);
            setPayments([{ method: 'DIVISAS', amount: '', amountInUSD: 0, currency: 'USD' }]);

            // Explicitly clear storage now to avoid race conditions with effect? 
            // The effect depends on state. Setting state above will trigger effect to save "false/null". 
            // So we don't need manual localStorage.removeItem here if the effect handles it sync/async.
            // But to be safe vs "stale" reloads, we let the effect do it.

            fetchDebtors(); // Refresh list

        } catch (err) {
            setErrorMessage('Error al registrar pago: ' + err.message);
        }
    };

    const filteredClients = clients.filter(c =>
        c.nb_cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 relative">
            {/* Toast Notifications */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 z-[300] bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-emerald-400"
                    >
                        <div className="bg-white/20 p-2 rounded-full">
                            <FaCheckCircle size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">¡Éxito!</h4>
                            <p className="font-medium text-emerald-50 opacity-90">{successMessage}</p>
                        </div>
                        <button onClick={() => setSuccessMessage('')} className="ml-4 text-white/50 hover:text-white">
                            <FaTimes />
                        </button>
                    </motion.div>
                )}
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 z-[300] bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-red-400"
                    >
                        <div className="bg-white/20 p-2 rounded-full">
                            <FaExclamationCircle size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Error</h4>
                            <p className="font-medium text-red-50 opacity-90">{errorMessage}</p>
                        </div>
                        <button onClick={() => setErrorMessage('')} className="ml-4 text-white/50 hover:text-white">
                            <FaTimes />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 font-heading">Cuentas por Cobrar</h2>
                    <p className="text-slate-500 mt-1">Gestiona las deudas de tus clientes.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Total Debt Display */}
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-500 uppercase">Total por Cobrar:</span>
                        <span className="font-mono font-black text-red-600 text-lg">
                            $ {clients.reduce((acc, client) => acc + (parseFloat(client.deuda_actual) || 0), 0).toFixed(2)}
                        </span>
                    </div>

                    {/* Global Rate Input for Reference */}
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-500 uppercase">Tasa del Día:</span>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-slate-700"
                        />
                        <span className="text-slate-400 font-bold">Bs/$</span>
                    </div>
                </div>
            </header>

            {/* Search and Date Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 text-slate-600 placeholder:text-slate-400 transition-all font-medium"
                    />
                </div>
                <div>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 text-slate-600 font-medium cursor-pointer"
                        title="Filtrar por fecha de pago"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Comprado</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pagado</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Deuda Actual ($)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Deuda Actual (Bs)</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredClients.map(client => (
                            <tr key={client.id_cliente} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {client.nb_cliente.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-700">{client.nb_cliente}</div>
                                            {client.telefono && <div className="text-xs text-emerald-600 font-mono font-bold">{client.telefono}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-500 font-black">
                                    $ {parseFloat(client.total_comprado).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-emerald-600 font-black">
                                    $ {parseFloat(client.total_pagado).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-red-600 font-black text-lg">
                                    $ {parseFloat(client.deuda_actual).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-600 font-black">
                                    Bs {(parseFloat(client.deuda_actual) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleOpenPaymentModal(client)}
                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Registrar Abono"
                                        >
                                            <FaHandHoldingUsd size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenHistoryModal(client)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver Historial"
                                        >
                                            <FaHistory size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenPurchaseModal(client)}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Ver Mercancía"
                                        >
                                            <FaShoppingBag size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                    No hay clientes con deuda pendiente.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && selectedClient && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsPaymentModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-emerald-400" />
                                    Abonar a Deuda
                                </h3>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-500 font-bold uppercase text-xs">Cliente</span>
                                        <span className="font-bold text-slate-800 text-lg">{selectedClient.nb_cliente}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-bold uppercase text-xs">Deuda Total Pendiente</span>
                                        <span className="font-mono font-black text-red-600 text-2xl">$ {parseFloat(selectedClient.deuda_actual).toFixed(2)}</span>
                                    </div>
                                </div>

                                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <FaMoneyBillWave className="text-emerald-600" /> Métodos de Pago
                                </h4>

                                <div className="space-y-3 mb-6">
                                    {payments.map((payment, index) => (
                                        <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                            <select
                                                value={payment.method}
                                                onChange={(e) => {
                                                    handlePaymentChange(index, 'method', e.target.value);
                                                    // Auto-set currency logic
                                                    if (e.target.value === 'DIVISAS') {
                                                        handlePaymentChange(index, 'currency', 'USD');
                                                    } else {
                                                        handlePaymentChange(index, 'currency', 'BS');
                                                    }
                                                }}
                                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-1/3 p-2.5 font-bold"
                                            >
                                                {paymentMethods.filter(m => m.nb_metodo_pago !== 'MIXTO' && m.nb_metodo_pago !== 'PENDIENTE POR COBRAR' && m.nb_metodo_pago !== 'BANCO (POS)').map(m => (
                                                    <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>{m.nb_metodo_pago}</option>
                                                ))}
                                            </select>

                                            <div className="relative w-1/3">
                                                <input
                                                    type="number"
                                                    value={payment.amount}
                                                    onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                                                    placeholder="Monto"
                                                    className="pl-8 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-mono font-bold"
                                                />
                                                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">
                                                    {payment.currency === 'USD' ? '$' : 'Bs'}
                                                </span>
                                            </div>

                                            <select
                                                value={payment.currency}
                                                onChange={(e) => handlePaymentChange(index, 'currency', e.target.value)}
                                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-24 p-2.5 font-bold"
                                            >
                                                <option value="USD">USD</option>
                                                <option value="BS">BS</option>
                                            </select>

                                            <button
                                                onClick={() => removePaymentMethod(index)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                disabled={payments.length === 1}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addPaymentMethod}
                                        className="text-sm text-emerald-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        + Agregar otro método
                                    </button>
                                </div>

                                <div className="flex justify-between items-center py-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Total a Abonar</p>
                                        <p className="text-2xl font-black text-emerald-600 font-mono">
                                            $ {calculateTotalPaymentUSD().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 font-bold uppercase">Restante por Pagar</p>
                                        <div className="flex flex-col items-end">
                                            <p className={`text-xl font-bold font-mono ${parseFloat(selectedClient.deuda_actual) - calculateTotalPaymentUSD() > 0.009 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                $ {Math.max(0, parseFloat(selectedClient.deuda_actual) - calculateTotalPaymentUSD()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-sm font-bold text-slate-400 font-mono">
                                                Bs {(Math.max(0, parseFloat(selectedClient.deuda_actual) - calculateTotalPaymentUSD()) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 z-20">
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="px-6 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 transform active:scale-95"
                                >
                                    Confirmar Abono
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* History Modal */}
            <AnimatePresence>
                {isHistoryModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsHistoryModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <FaHistory className="text-blue-500" />
                                        Historial de Pagos
                                    </h3>
                                    <p className="text-slate-500 font-bold">{selectedClient?.nb_cliente}</p>
                                </div>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto max-h-[60vh]">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Monto ($)</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paymentHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                                    No hay pagos registrados.
                                                </td>
                                            </tr>
                                        ) : (
                                            paymentHistory.map((pay) => (
                                                <tr key={pay.id_pago} className="hover:bg-slate-50">
                                                    <td className="px-6 py-3 text-sm text-slate-600 font-medium">
                                                        {new Date(pay.fecha_pago).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-sm font-black text-emerald-600 font-mono">
                                                        $ {parseFloat(pay.total_abono).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-slate-600 font-bold">
                                                        {pay.detalles_pago}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Purchase History Modal */}
            <AnimatePresence>
                {isPurchaseModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsPurchaseModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <FaShoppingBag className="text-purple-500" />
                                        Historial de Compras
                                    </h3>
                                    <p className="text-slate-500 font-bold">{selectedClient?.nb_cliente}</p>
                                </div>
                                <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto max-h-[60vh]">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Producto</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Cant.</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {purchaseHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                                    No hay compras registradas.
                                                </td>
                                            </tr>
                                        ) : (
                                            purchaseHistory.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-3 text-sm text-slate-600 font-medium">
                                                        {new Date(item.fecha_venta).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-slate-700 font-bold">
                                                        {item.nb_producto}
                                                    </td>
                                                    <td className="px-6 py-3 text-center text-sm text-slate-600 font-medium">
                                                        {item.cantidad}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-sm font-black text-slate-700 font-mono">
                                                        $ {parseFloat(item.total).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientsPage;

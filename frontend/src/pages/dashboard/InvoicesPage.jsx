import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMoneyBillWave, FaSearch, FaTimes, FaPlus, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useRate } from '../../context/RateContext';

const InvoicesPage = () => {
    const { rate } = useRate();
    const [invoices, setInvoices] = useState([]);
    const [pendingLoans, setPendingLoans] = useState([]); // New state
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethods, setPaymentMethods] = useState([]);

    // Payment Modal State
    const [selectedItem, setSelectedItem] = useState(null); // Renamed from selectedInvoice
    const [paymentType, setPaymentType] = useState('invoice'); // 'invoice' or 'loan'
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Payment Form (Multi-method support logic in UI, but simplified to single for backend loop if needed or just single selection if simpler first)
    // User requested multi-method.
    const [payments, setPayments] = useState([{ methodId: '', amount: '' }]);

    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchInvoices();
        fetchPendingLoans(); // Fetch loans
        fetchPaymentMethods();
    }, []);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/finances/invoices/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPendingLoans = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/finances/loans/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingLoans(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/finances/payment-methods', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out Mixto as requested
                setPaymentMethods(data.filter(m =>
                    !m.nb_metodo_pago.toLowerCase().includes('mixto') &&
                    !m.nb_metodo_pago.toUpperCase().includes('PENDIENTE') &&
                    !m.nb_metodo_pago.toUpperCase().includes('BIOPAGO')
                ));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const filteredInvoices = invoices.filter(inv =>
        inv.nb_proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLoans = pendingLoans.filter(loan =>
        (loan.nb_metodo_pago || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Modal Logic
    const openPaymentModal = (item, type = 'invoice') => {
        setSelectedItem(item);
        setPaymentType(type);
        // Default payment amount to remaining debt?
        // Logic: Suggest paying full remaining.
        // User can split.
        setPayments([{ methodId: '', amount: '' }]);
        setIsPaymentModalOpen(true);
    };

    const addPaymentRow = () => {
        setPayments([...payments, { methodId: '', amount: '' }]);
    };

    const removePaymentRow = (index) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const updatePaymentRow = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
    };

    const handlePaymentSubmit = async () => {
        if (!selectedItem) return;

        try {
            const token = localStorage.getItem('token');

            if (paymentType === 'loan') {
                // LOAN PAYMENT LOGIC (Native Amounts, Bulk)
                const payload = {
                    loanId: selectedItem.id_prestamo,
                    payments: payments.filter(p => p.methodId && p.amount).map(p => ({
                        methodId: p.methodId,
                        amount: parseFloat(p.amount) // Native amount
                    })),
                    rate: parseFloat(rate)
                };

                const res = await fetch('http://localhost:3000/api/finances/loans/pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Error al procesar pago de préstamo');
                }

            } else {
                // INVOICE PAYMENT LOGIC (USD Normalized, One-by-One)
                for (const p of payments) {
                    if (!p.methodId || !p.amount) continue;

                    const method = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
                    const isUsd = method && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => method.nb_metodo_pago.toUpperCase().includes(k));

                    let finalAmount = parseFloat(p.amount);
                    if (!isUsd) {
                        finalAmount = finalAmount / parseFloat(rate);
                    }

                    const payload = {
                        id_factura_proveedor: selectedItem.id_factura_proveedor,
                        id_metodo_pago: p.methodId,
                        monto: finalAmount, // All stored payments normalized to USD for debt checking
                        tasa_dia: parseFloat(rate),
                        fecha_pago: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    };

                    const res = await fetch('http://localhost:3000/api/finances/invoices/pay', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.message || 'Error al procesar pago');
                    }
                }
            }

            setSuccess('Pago(s) registrado(s) exitosamente');
            setIsPaymentModalOpen(false);
            fetchInvoices(); // Refresh list
            fetchPendingLoans(); // Refresh loans
            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    // Calculate totals for rendering (Bs conversion for non-USD methods just for display?)
    // User requirement: "si es divisas sea USD y los otros metodos Bs".
    // This input is explicitly what we send.

    return (
        <div className="p-6 space-y-6">
            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 z-[300] bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
                        <FaCheckCircle size={24} /> <div><h4 className="font-bold">¡Éxito!</h4><p>{success}</p></div>
                    </motion.div>
                )}
                {error && (
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 z-[300] bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
                        <FaExclamationCircle size={24} /> <div><h4 className="font-bold">Error</h4><p>{error}</p></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loans Section */}
            {pendingLoans.length > 0 && (
                <section className="space-y-4">
                    <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 font-heading">Préstamos Pendientes</h2>
                            <p className="text-slate-500 font-bold">Amortización de préstamos recibidos.</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingLoans.filter(l => l.nb_metodo_pago.toLowerCase().includes(searchTerm.toLowerCase()) || 'préstamo'.includes(searchTerm.toLowerCase())).map(loan => (
                            <motion.div
                                key={loan.id_prestamo}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800">Préstamo {loan.nb_metodo_pago}</h3>
                                            <span className="text-xs font-bold text-slate-400 uppercase">ID #{loan.id_prestamo}</span>
                                        </div>
                                        <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black uppercase">
                                            Pendiente
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-bold text-sm">Fecha:</span>
                                            <span className="font-mono font-bold text-slate-700">
                                                {new Date(loan.fecha_prestamo).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-slate-500 font-bold text-sm mt-1">Monto Original:</span>
                                            <div className="text-right">
                                                <div className="font-mono font-black text-slate-800">
                                                    {loan.is_usd ? '$' : 'Bs'} {parseFloat(loan.monto_prestamo).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </div>
                                                {!loan.is_usd ? (
                                                    <div className="text-xs font-bold text-slate-400">
                                                        $ {(parseFloat(loan.monto_prestamo) / rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-bold text-slate-400">
                                                        Bs {(parseFloat(loan.monto_prestamo) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-slate-500 font-bold text-sm mt-1">Pagado:</span>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-emerald-600">
                                                    {loan.is_usd ? '$' : 'Bs'} {parseFloat(loan.total_pagado).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </div>
                                                {!loan.is_usd ? (
                                                    <div className="text-xs font-bold text-emerald-600/60">
                                                        $ {(parseFloat(loan.total_pagado) / rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-bold text-emerald-600/60">
                                                        Bs {(parseFloat(loan.total_pagado) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-start">
                                            <span className="text-slate-500 font-bold text-sm mt-2">Restante:</span>
                                            <div className="text-right">
                                                <div className="font-mono font-black text-2xl text-red-500">
                                                    {loan.is_usd ? '$' : 'Bs'} {parseFloat(loan.monto_pendiente).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </div>
                                                {!loan.is_usd ? (
                                                    <div className="text-sm font-bold text-red-400">
                                                        $ {(parseFloat(loan.monto_pendiente) / rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-bold text-red-400">
                                                        Bs {(parseFloat(loan.monto_pendiente) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => openPaymentModal(loan, 'loan')}
                                    className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <FaMoneyBillWave /> Pagar Préstamo
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 font-heading">Facturas Proveedores</h2>
                    <p className="text-slate-500 font-bold">Gestiona y paga las deudas a proveedores.</p>
                </div>
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 w-64 focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvoices.map(inv => (
                    <motion.div
                        key={inv.id_factura_proveedor}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">{inv.nb_proveedor}</h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase">ID #{inv.id_factura_proveedor}</span>
                                </div>
                                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black uppercase">
                                    Pendiente
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold text-sm">Vence:</span>
                                    <span className="font-mono font-bold text-slate-700">
                                        {new Date(inv.fecha_finalizacion).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-slate-500 font-bold text-sm mt-1">Deuda Total:</span>
                                    <div className="text-right">
                                        <div className="font-mono font-black text-slate-800">$ {parseFloat(inv.monto_deuda).toFixed(2)}</div>
                                        <div className="text-xs font-bold text-slate-400">Bs {(parseFloat(inv.monto_deuda) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-slate-500 font-bold text-sm mt-1">Pagado:</span>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-emerald-600">$ {parseFloat(inv.monto_pagado).toFixed(2)}</div>
                                        <div className="text-xs font-bold text-emerald-700/60">Bs {(parseFloat(inv.monto_pagado) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-start">
                                    <span className="text-slate-500 font-bold text-sm mt-2">Restante:</span>
                                    <div className="text-right">
                                        <div className="font-mono font-black text-2xl text-red-500">$ {parseFloat(inv.monto_restante).toFixed(2)}</div>
                                        <div className="text-sm font-bold text-red-400">Bs {(parseFloat(inv.monto_restante) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => openPaymentModal(inv)}
                            className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <FaMoneyBillWave /> Pagar Factura
                        </button>
                    </motion.div>
                ))}

                {filteredInvoices.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                        No hay facturas pendientes.
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
                        >
                            <div className="bg-slate-900 text-white p-6 flex justify-between items-center rounded-t-2xl">
                                <div>
                                    <h3 className="font-bold text-xl">{paymentType === 'loan' ? 'Registrar Pago de Préstamo' : 'Registrar Pago de Factura'}</h3>
                                    <p className="text-slate-400 text-sm">
                                        {paymentType === 'loan' ? `Préstamo: ${selectedItem.nb_metodo_pago}` : `Proveedor: ${selectedItem.nb_proveedor}`}
                                    </p>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white"><FaTimes /></button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto min-h-[450px]">
                                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-500">Deuda Restante</span>
                                        <div className="text-right">
                                            {paymentType === 'loan' ? (
                                                <span className="block font-mono font-black text-xl text-slate-800">
                                                    {selectedItem.is_usd ? '$' : 'Bs'} {parseFloat(selectedItem.monto_pendiente).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="block font-mono font-black text-xl text-slate-800">$ {parseFloat(selectedItem.monto_restante).toFixed(2)}</span>
                                                    <span className="block text-xs font-bold text-slate-400">≈ Bs {(parseFloat(selectedItem.monto_restante) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {payments.map((p, idx) => {
                                        const selectedMethod = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
                                        const isUsd = selectedMethod && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => selectedMethod.nb_metodo_pago.toUpperCase().includes(k));

                                        return (
                                            <div key={idx} className="flex gap-3 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
                                                    <select
                                                        value={p.methodId}
                                                        onChange={e => updatePaymentRow(idx, 'methodId', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-black text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {paymentMethods.map(m => (
                                                            <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-40">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                        Monto ({isUsd ? '$ USD' : 'Bs'})
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={p.amount}
                                                            onChange={e => updatePaymentRow(idx, 'amount', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-black text-sm text-right text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">
                                                            {isUsd ? '$' : 'Bs'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {idx > 0 && (
                                                    <button onClick={() => removePaymentRow(idx)} className="p-2.5 mb-[1px] text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                                                        <FaTimes />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button onClick={addPaymentRow} className="mt-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                                        <FaPlus size={12} /> Agregar otro método
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                <button onClick={handlePaymentSubmit} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-200">
                                    Procesar Pago
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InvoicesPage;

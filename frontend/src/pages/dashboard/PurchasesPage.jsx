import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaSave, FaPlus, FaTrash, FaCheckCircle, FaExclamationCircle, FaTimes, FaCalendarAlt } from 'react-icons/fa';

import { useRate } from '../../context/RateContext';

const PurchasesPage = () => {
    // Load initial state from localStorage if available
    const { rate, setRate } = useRate();
    const [date, setDate] = useState(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const [rows, setRows] = useState(() => {
        const savedRows = localStorage.getItem('purchaseRows');
        return savedRows ? JSON.parse(savedRows) : [
            { id: 1, productId: '', profitPercent: 30, quantity: 1, currency: 'USD', costBultoBs: '', costBultoUsd: '', pvp: '' }
        ];
    });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payments, setPayments] = useState([{ methodId: '', amount: '' }]);

    // Restore missing state
    const [providers, setProviders] = useState([]);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        providerId: '',
        providerName: '',
        isNew: false,
        dueDate: ''
    });
    const [products, setProducts] = useState([]);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Buy Currency State
    const [isBuyCurrencyModalOpen, setIsBuyCurrencyModalOpen] = useState(false);
    const [buyCurrencyData, setBuyCurrencyData] = useState({ amountUSD: '', amountBs: '', methodId: '' });

    const handleBuyCurrencySubmit = async () => {
        if (!buyCurrencyData.amountUSD || !buyCurrencyData.amountBs || !buyCurrencyData.methodId) {
            setError('Complete todos los campos para la compra de divisas');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const amountBs = parseFloat(buyCurrencyData.amountBs) || 0;
        const amountUSD = parseFloat(buyCurrencyData.amountUSD) || 0;
        const effectiveRate = amountUSD > 0 ? (amountBs / amountUSD) : rate;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/finances/buy-currency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amountUSD: buyCurrencyData.amountUSD,
                    methodId: buyCurrencyData.methodId,
                    rate: effectiveRate, // Use calculated rate
                    date: date
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess(data.message);
            setIsBuyCurrencyModalOpen(false);
            setBuyCurrencyData({ amountUSD: '', amountBs: '', methodId: '' });
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchPaymentMethods();
    }, []);

    // Save state to localStorage
    useEffect(() => {
        localStorage.setItem('purchaseRows', JSON.stringify(rows));
    }, [rows]);

    useEffect(() => {
        localStorage.setItem('purchaseDate', date);
    }, [date]);

    useEffect(() => {
        if (rate) localStorage.setItem('purchaseRate', rate);
    }, [rate]);


    const fetchPaymentMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/finances/payment-methods', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPaymentMethods(data.filter(m => {
                    const name = m.nb_metodo_pago.toUpperCase();
                    return !name.includes('PENDIENTE') && !name.includes('MIXTO') && !name.includes('BIOPAGO');
                }));
            }
        } catch (err) {
            console.error("Error fetching payment methods:", err);
        }
    };

    const fetchProviders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/suppliers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProviders(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addRow = () => {
        setRows([...rows, {
            id: Date.now(),
            productId: '',
            profitPercent: 30,
            quantity: 1,
            currency: 'USD',
            costBultoBs: '',
            costBultoUsd: '',
            pvp: ''
        }]);
    };

    const removeRow = (id) => {
        if (rows.length === 1) return;
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        const newRows = rows.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };

                // Conversiones automáticas según tasa
                if (rate > 0) {
                    if (field === 'costBultoBs' && updated.currency === 'BS') {
                        updated.costBultoUsd = (parseFloat(value || 0) / parseFloat(rate)).toFixed(2);
                    }
                    if (field === 'costBultoUsd' && updated.currency === 'USD') {
                        updated.costBultoBs = (parseFloat(value || 0) * parseFloat(rate)).toFixed(2);
                    }
                }
                return updated;
            }
            return row;
        });
        setRows(newRows);
    };

    const totalCompasUsd = rows.reduce((acc, row) => {
        return acc + parseFloat(row.costBultoUsd || 0);
    }, 0);

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

    const handleSave = async (invoiceData = null, paymentsList = null) => {
        try {
            // Validation: Immediate purchase must have payments
            if (!invoiceData && (!paymentsList || paymentsList.length === 0)) {
                setError('Debe registrar el pago para finalizar la compra instantánea.');
                setTimeout(() => setError(''), 3000);
                return;
            }

            const token = localStorage.getItem('token');
            const dataToSave = {
                date,
                rate: parseFloat(rate),
                rows: rows.filter(r => r.productId && r.quantity && r.pvp).map(r => ({
                    productId: r.productId,
                    profitPercent: r.profitPercent,
                    quantity: r.quantity,
                    currency: r.currency,
                    costBultoBs: r.costBultoBs,
                    costBultoUsd: r.currency === 'BS' ? (parseFloat(r.costBultoBs) / rate) : r.costBultoUsd,
                    pvp: r.pvp
                })),
                invoiceData,
                payments: paymentsList
            };

            const response = await fetch('http://localhost:3000/api/purchases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSave)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error saving purchase');

            setSuccess('Compra registrada exitosamente');
            if (invoiceData) setSuccess('Compra y Factura registradas exitosamente');

            // Clear localStorage and reset state
            localStorage.removeItem('purchaseDate');
            localStorage.removeItem('purchaseRate');
            localStorage.removeItem('purchaseRows');

            setRows([{ id: Date.now(), productId: '', profitPercent: 30, quantity: 1, currency: 'USD', costBultoBs: '', costBultoUsd: '', pvp: '' }]);
            setInvoiceForm({ providerId: '', providerName: '', isNew: false, dueDate: '' });
            setIsInvoiceModalOpen(false);
            setIsPaymentModalOpen(false);
            setPayments([{ methodId: '', amount: '' }]);

            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleInvoiceClick = async () => {
        await fetchProviders();
        setIsInvoiceModalOpen(true);
    };

    const handleFinalizeClick = async () => {
        await fetchPaymentMethods();
        // Initialize with one row covering total? Or empty?
        // Let's initialize with empty amount so user enters it.
        setPayments([{ methodId: '', amount: '' }]);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = () => {
        // Calculate Total Paid in USD
        let totalPaidUsd = 0;
        const finalPayments = [];

        for (const p of payments) {
            if (!p.methodId || !p.amount) continue;

            const method = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
            const isUsd = method && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => method.nb_metodo_pago.toUpperCase().includes(k));

            let amountUsd = parseFloat(p.amount);
            if (!isUsd) {
                amountUsd = amountUsd / parseFloat(rate);
            }

            totalPaidUsd += amountUsd;
            finalPayments.push({ methodId: p.methodId, amount: amountUsd });
        }

        // Validate Total
        // Allow small tolerance
        if (Math.abs(totalPaidUsd - totalCompasUsd) > 0.1) {
            setError(`El monto total pagado ($${totalPaidUsd.toFixed(2)}) no coincide con el total de la compra ($${totalCompasUsd.toFixed(2)}). Diferencia: $${(totalPaidUsd - totalCompasUsd).toFixed(2)}`);
            setTimeout(() => setError(''), 5000);
            return;
        }

        handleSave(null, finalPayments);
    };

    const handleInvoiceSubmit = () => {
        if (invoiceForm.isNew && !invoiceForm.providerName) {
            setError('Ingrese el nombre del nuevo proveedor');
            setTimeout(() => setError(''), 3000);
            return;
        }
        if (!invoiceForm.isNew && !invoiceForm.providerId) {
            setError('Seleccione un proveedor');
            setTimeout(() => setError(''), 3000);
            return;
        }
        if (!invoiceForm.dueDate) {
            setError('Seleccione la fecha de vencimiento');
            setTimeout(() => setError(''), 3000);
            return;
        }

        handleSave(invoiceForm, null); // Invoice purchase doesn't need immediate payment method usually
    };

    return (
        <div className="p-6 space-y-6 relative">
            {/* Notifications */}
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

            {/* Top Summary Section - Styled Dark Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-xl overflow-hidden shadow-lg border border-slate-200">
                {/* Left Side: Date & Rate */}
                <div className="bg-[#0f172a] text-white p-6 md:border-r border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-300 font-bold tracking-wider">FECHA</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                            <FaCalendarAlt />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer p-0"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-300 font-bold tracking-wider">TASA DEL DÍA</span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Bs.</span>
                            <input
                                type="number"
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right w-32 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Totals */}
                <div className="bg-[#1e293b] text-white p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-300 font-bold tracking-wider">TOTAL COMPRA $</span>
                        <div className="flex items-center gap-2 text-3xl font-bold text-emerald-400 font-mono">
                            $ {totalCompasUsd.toFixed(2)}
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-300 font-bold tracking-wider">TOTAL COMPRA BS</span>
                        <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 font-mono">
                            Bs {(totalCompasUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4 min-w-[200px]">Producto</th>
                            <th className="p-4 w-20 text-center">% Gan.</th>
                            <th className="p-4 w-20 text-center">Cant.</th>
                            <th className="p-4 w-24">Moneda</th>
                            <th className="p-4 w-32">Costo Bulto ($)</th>
                            <th className="p-4 w-32">Costo Bulto (Bs)</th>
                            <th className="p-4 w-32">Costo $ Unid.</th>
                            <th className="p-4 w-32">Precio $ Unid.</th>
                            <th className="p-4 w-32 text-center">PVP</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row, index) => {
                            const quantity = parseFloat(row.quantity) || 1;
                            const costBulto = parseFloat(row.costBultoUsd || 0);
                            const profitPercent = parseFloat(row.profitPercent || 0);

                            // Costo $ Unid. = Costo Bulto ($) / Cant.
                            const costUnitUsd = costBulto / quantity;

                            // Precio $ Unid. = (Costo $ Unid. * % Gan.) + Costo $ Unid.
                            // Ejemplo: 30% -> 0.30
                            const priceUnitUsd = (costUnitUsd * (profitPercent / 100)) + costUnitUsd;

                            return (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                                    <td className="p-4">
                                        <select
                                            value={row.productId}
                                            onChange={e => updateRow(row.id, 'productId', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-sm"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {products.map(p => (
                                                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={row.profitPercent}
                                            onChange={e => updateRow(row.id, 'profitPercent', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-center"
                                            placeholder="30"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={row.quantity}
                                            onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-center"
                                            placeholder="1"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={row.currency}
                                            onChange={e => updateRow(row.id, 'currency', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-sm"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="BS">Bs</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={row.costBultoUsd}
                                            readOnly={row.currency === 'BS'}
                                            onChange={e => updateRow(row.id, 'costBultoUsd', e.target.value)}
                                            className={`w-full border border-slate-200 rounded-lg p-2 font-mono font-black text-right ${row.currency === 'BS' ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-slate-50 text-slate-900'}`}
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={row.currency === 'USD' ? parseFloat(row.costBultoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : row.costBultoBs}
                                            readOnly={row.currency === 'USD'}
                                            onChange={e => updateRow(row.id, 'costBultoBs', e.target.value)}
                                            className={`w-full border border-slate-200 rounded-lg p-2 font-mono font-black text-right ${row.currency === 'USD' ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-slate-50 text-slate-900'}`}
                                            placeholder="0,00"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono font-black text-slate-700 text-right">
                                            {costUnitUsd.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono font-black text-slate-700 text-right">
                                            {priceUnitUsd.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={row.pvp}
                                            onChange={e => updateRow(row.id, 'pvp', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-black text-blue-600 text-center"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => removeRow(row.id)} className="text-rose-400 hover:text-rose-600">
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
                <button onClick={addRow} className="flex items-center gap-2 text-slate-600 font-bold hover:text-emerald-600">
                    <FaPlus /> Agregar Producto
                </button>

                <div className="flex gap-4">
                    <button onClick={() => setIsBuyCurrencyModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-200 flex items-center gap-2">
                        <span className="font-mono">$</span> Compra de Divisas
                    </button>
                    <button onClick={handleInvoiceClick} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-200 flex items-center gap-2">
                        <FaExclamationCircle /> Se debe factura
                    </button>
                    <button onClick={handleFinalizeClick} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2">
                        <FaSave /> Finalizar Compra
                    </button>
                </div>
            </div>

            {/* Invoice Modal */}
            <AnimatePresence>
                {isInvoiceModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Registrar Factura Pendiente</h3>
                                <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setInvoiceForm(prev => ({ ...prev, isNew: false }))}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${!invoiceForm.isNew ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Existente
                                    </button>
                                    <button
                                        onClick={() => setInvoiceForm(prev => ({ ...prev, isNew: true }))}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${invoiceForm.isNew ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Nuevo
                                    </button>
                                </div>

                                {invoiceForm.isNew ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Proveedor</label>
                                        <input
                                            type="text"
                                            value={invoiceForm.providerName}
                                            onChange={e => setInvoiceForm(prev => ({ ...prev, providerName: e.target.value.toUpperCase() }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold"
                                            placeholder="Ej. Distribuidora Polar"
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seleccionar Proveedor</label>
                                        <select
                                            value={invoiceForm.providerId}
                                            onChange={e => setInvoiceForm(prev => ({ ...prev, providerId: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold"
                                        >
                                            <option value="">-- Seleccione --</option>
                                            {providers.map(p => (
                                                <option key={p.id_proveedor} value={p.id_proveedor}>{p.nb_proveedor}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Vencimiento</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.dueDate}
                                        onChange={e => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                    <button onClick={handleInvoiceSubmit} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                                        Guardar Factura
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Method Modal (Updated for Multiple Methods) */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Métodos de Pago</h3>
                                    <p className="text-white text-lg font-black">Total a Pagar: $ {totalCompasUsd.toFixed(2)} <span className="text-base font-bold opacity-90">(Bs {(totalCompasUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })})</span></p>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-200 hover:text-white"><FaTimes /></button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                                {payments.map((p, idx) => {
                                    const selectedMethod = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
                                    const isUsd = selectedMethod && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => selectedMethod.nb_metodo_pago.toUpperCase().includes(k));

                                    return (
                                        <div key={idx} className="flex gap-3 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                                                <select
                                                    value={p.methodId}
                                                    onChange={e => updatePaymentRow(idx, 'methodId', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {paymentMethods.map(m => (
                                                        <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-40">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto ({isUsd ? '$ USD' : 'Bs'})</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={p.amount}
                                                        onChange={e => updatePaymentRow(idx, 'amount', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-sm text-right outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
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

                                <button onClick={addPaymentRow} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                                    <FaPlus size={12} /> Agregar otro método
                                </button>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex gap-4">
                                <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                <button onClick={handlePaymentSubmit} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                                    Confirmar Pago Total
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Buy Currency Modal */}
            <AnimatePresence>
                {isBuyCurrencyModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="bg-cyan-600 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Compra de Divisas</h3>
                                <button onClick={() => setIsBuyCurrencyModalOpen(false)} className="text-cyan-100 hover:text-white"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a Comprar ($ USD)</label>
                                    <input
                                        type="number"
                                        value={buyCurrencyData.amountUSD}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const bsVal = val ? (parseFloat(val) * parseFloat(rate)).toFixed(2) : '';
                                            setBuyCurrencyData({ ...buyCurrencyData, amountUSD: val, amountBs: bsVal });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-2xl text-center text-cyan-600"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago (Origen Bs)</label>
                                    <select
                                        value={buyCurrencyData.methodId}
                                        onChange={e => setBuyCurrencyData({ ...buyCurrencyData, methodId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {paymentMethods
                                            .filter(m => {
                                                const name = m.nb_metodo_pago.toUpperCase();
                                                return !name.includes('MIXTO') && !name.includes('PENDIENTE') && !name.includes('DIVISA') && !name.includes('USD') && !name.includes('ZELLE') && !name.includes('BINANCE');
                                            })
                                            .map(m => (
                                                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">Fecha:</span>
                                        <span className="font-mono font-bold">{date.split('-').reverse().join('/')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">Tasa Referencia:</span>
                                        <span className="font-mono font-bold">Bs. {rate}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 items-center">
                                        <span className="text-slate-500 font-bold text-base">Total a Pagar (Bs):</span>
                                        <input
                                            type="number"
                                            value={buyCurrencyData.amountBs}
                                            onChange={e => setBuyCurrencyData({ ...buyCurrencyData, amountBs: e.target.value })}
                                            className="w-40 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-black text-right text-lg text-cyan-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleBuyCurrencySubmit}
                                    disabled={!buyCurrencyData.amountUSD || !buyCurrencyData.methodId || !buyCurrencyData.amountBs}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Compra
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PurchasesPage;

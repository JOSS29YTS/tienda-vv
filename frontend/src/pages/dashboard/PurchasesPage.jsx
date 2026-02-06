import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaSave, FaPlus, FaTrash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const PurchasesPage = () => {
    // Load initial state from localStorage if available
    const [date, setDate] = useState(() => localStorage.getItem('purchaseDate') || new Date().toISOString().split('T')[0]);
    const [rate, setRate] = useState(() => localStorage.getItem('purchaseRate') || 329.02);
    const [rows, setRows] = useState(() => {
        const savedRows = localStorage.getItem('purchaseRows');
        return savedRows ? JSON.parse(savedRows) : [
            { id: 1, productId: '', profitPercent: 30, quantity: 1, currency: 'BS', costBultoBs: '', costBultoUsd: '', pvp: '' }
        ];
    });
    const [products, setProducts] = useState([]);

    // Notifications
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, []);

    // Persist state changes
    useEffect(() => {
        localStorage.setItem('purchaseDate', date);
        localStorage.setItem('purchaseRate', rate);
        localStorage.setItem('purchaseRows', JSON.stringify(rows));
    }, [date, rate, rows]);

    const fetchProducts = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/products');
            const data = await res.json();
            setProducts(data);
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
            currency: 'BS',
            costBultoBs: '',
            costBultoUsd: '',
            pvp: ''
        }]);
    };

    const removeRow = (id) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        }
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };

                // Auto-calc logic
                // If ID matches, we work on 'updated'.
                // If currency changes, we might reset some fields? user didn't ask, let's keep it simple.

                // Calculate Cost Bulto USD
                let finalCostBultoUsd = 0;
                if (updated.currency === 'BS') {
                    // Update calculated USD if BS or Rate changes
                    const bsVal = field === 'costBultoBs' ? value : updated.costBultoBs;
                    const r = field === 'rate' ? value : rate; // Rate is global, passed separately?
                    finalCostBultoUsd = parseFloat(bsVal || 0) / parseFloat(rate || 1);
                    updated.costBultoUsd = finalCostBultoUsd > 0 ? finalCostBultoUsd.toFixed(2) : '';
                } else {
                    // If currency is USD, user inputs costBultoUsd directly
                    // So we don't overwrite it unless they typed it
                    if (field === 'currency' && value === 'USD') updated.costBultoBs = '';
                    finalCostBultoUsd = parseFloat(updated.costBultoUsd || 0);
                }

                return updated;
            }
            return row;
        }));
    };

    // Global Rate Change Handler (updates all BS rows)
    const handleRateChange = (newRate) => {
        setRate(newRate);
        setRows(rows.map(row => {
            if (row.currency === 'BS') {
                const finalCostBultoUsd = parseFloat(row.costBultoBs || 0) / parseFloat(newRate || 1);
                return { ...row, costBultoUsd: finalCostBultoUsd > 0 ? finalCostBultoUsd.toFixed(2) : '' };
            }
            return row;
        }));
    };

    const calculateDerived = (row) => {
        const qty = parseFloat(row.quantity) || 1;
        const bultoUsd = row.currency === 'BS' ? (parseFloat(row.costBultoBs || 0) / parseFloat(rate || 1)) : parseFloat(row.costBultoUsd || 0);

        const costUnitUsd = bultoUsd / qty;
        const profit = parseFloat(row.profitPercent) || 0;
        const priceUnitUsd = costUnitUsd * (1 + (profit / 100));

        return {
            costUnitUsd: isFinite(costUnitUsd) ? costUnitUsd : 0,
            priceUnitUsd: isFinite(priceUnitUsd) ? priceUnitUsd : 0,
            bultoUsdDisplay: isFinite(bultoUsd) ? bultoUsd : 0
        };
    };

    const totalCompasUsd = rows.reduce((acc, row) => {
        const { bultoUsdDisplay } = calculateDerived(row);
        return acc + bultoUsdDisplay;
    }, 0);

    const handleSave = async () => {
        try {
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
                }))
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

            // Clear localStorage and reset state
            localStorage.removeItem('purchaseDate');
            localStorage.removeItem('purchaseRate');
            localStorage.removeItem('purchaseRows');

            setRows([{ id: Date.now(), productId: '', profitPercent: 30, quantity: 1, currency: 'BS', costBultoBs: '', costBultoUsd: '', pvp: '' }]);
            // Optional: Keep current date/rate or reset to defaults? User likely wants to keep rate/date for next entry or reset. 
            // Let's keep date/rate as is in state but clear storage so a fresh reload would get defaults? 
            // Actually, if we clear storage but keep state, the next effect run will re-save the state to storage. 
            // So we should probably NOT clear storage if we want to keep working, OR reset state fully.
            // Usually "finalize" implies starting fresh.

            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div className="p-6 space-y-6 relative">
            {/* Toasts */}
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

            {/* Header */}
            <header className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black font-heading">Compras</h2>
                    <p className="text-slate-400">Registra entrada de mercancía.</p>
                </div>

                <div className="flex gap-6 items-center flex-wrap">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Fecha</span>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-800 border-slate-700 rounded text-white font-bold" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Tasa del Día</span>
                        <input type="number" value={rate} onChange={e => handleRateChange(e.target.value)} className="w-24 bg-slate-800 border-slate-700 rounded text-right font-mono font-bold text-emerald-400" />
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase">Total Compras $</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">$ {totalCompasUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase">Total Compras Bs</span>
                        <span className="text-xl font-bold text-slate-300 font-mono">Bs {(totalCompasUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </header>

            {/* Content Array */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-[#0f172a] text-white">
                        <tr>
                            <th className="p-3 text-left w-64">Producto</th>
                            <th className="p-3 text-center w-20">% Gan</th>
                            <th className="p-3 text-center w-20">Cant.</th>
                            <th className="p-3 text-center w-24">Moneda</th>
                            <th className="p-3 text-right">Costo Bulto Bs</th>
                            <th className="p-3 text-right">Costo Bulto $</th>
                            <th className="p-3 text-right">Costo $ Unid</th>
                            <th className="p-3 text-right">Precio $ Unid</th>
                            <th className="p-3 text-right w-32">PVP (Fijar)</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => {
                            const derived = calculateDerived(row);
                            return (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    <td className="p-2">
                                        <select
                                            value={row.productId}
                                            onChange={e => updateRow(row.id, 'productId', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold"
                                        >
                                            <option value="">Buscar...</option>
                                            {products.map(p => (
                                                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={row.profitPercent} onChange={e => updateRow(row.id, 'profitPercent', e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded p-1 font-bold" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded p-1 font-bold" />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.currency}
                                            onChange={e => updateRow(row.id, 'currency', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-bold"
                                        >
                                            <option value="BS">Bs</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.costBultoBs}
                                            onChange={e => updateRow(row.id, 'costBultoBs', e.target.value)}
                                            disabled={row.currency === 'USD'}
                                            className={`w-full text-right bg-white border border-slate-200 rounded p-1 font-mono font-black ${row.currency === 'USD' ? 'bg-slate-100 text-slate-300' : ''}`}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.currency === 'BS' ? derived.bultoUsdDisplay.toFixed(2) : row.costBultoUsd}
                                            onChange={e => updateRow(row.id, 'costBultoUsd', e.target.value)}
                                            disabled={row.currency === 'BS'}
                                            className={`w-full text-right bg-white border border-slate-200 rounded p-1 font-mono font-black ${row.currency === 'BS' ? 'bg-slate-100 text-slate-500' : ''}`}
                                        />
                                    </td>
                                    <td className="p-2 text-right font-mono text-lg font-black text-slate-700">
                                        {derived.costUnitUsd.toFixed(2)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-lg font-black text-orange-600">
                                        {derived.priceUnitUsd.toFixed(2)}
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={row.pvp} onChange={e => updateRow(row.id, 'pvp', e.target.value)} className="w-full text-right bg-indigo-50 border border-indigo-200 text-indigo-700 rounded p-1 font-black text-lg" placeholder="PVP" />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500"><FaTrash /></button>
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
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2">
                    <FaSave /> Finalizar Compra
                </button>
            </div>
        </div>
    );
};

export default PurchasesPage;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaDollarSign, FaMoneyBillWave, FaTrash, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

import { useRate } from '../../context/RateContext';

const SalesPage = () => {
    const { user } = useAuth();
    const { rate, setRate } = useRate();
    // Current Date
    const today = new Date().toLocaleDateString('es-VE');

    const handleRateChange = (e) => {
        const newRate = e.target.value;
        setRate(newRate);
    };

    // Data State
    const [products, setProducts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [clients, setClients] = useState([]);

    // Rows State (The Sheet)
    const [rows, setRows] = useState(() => {
        const savedRows = localStorage.getItem('bodega_sales_rows');
        if (savedRows) {
            return JSON.parse(savedRows);
        }
        return [{ id: 1, productId: '', quantity: 1, unitPrice: 0, paymentMethod: '', client: '', isNewClient: false }];
    });
    const [selectedRows, setSelectedRows] = useState([]);

    // Mixed Payment Modal State
    const [mixedModalOpen, setMixedModalOpen] = useState(false);
    const [mixedModalData, setMixedModalData] = useState({
        totalToPayUSD: 0,
        rowsToUpdate: []
    });

    // Notification State
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

    // Auto-clear notifications
    useEffect(() => {
        if (error || successMessage) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccessMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, successMessage]);

    useEffect(() => {
        fetchProducts();
        fetchPaymentMethods();
        fetchClients();
    }, []);

    // Save rows to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('bodega_sales_rows', JSON.stringify(rows));
    }, [rows]);

    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const data = await response.json();
            // Filter only active products
            const activeProducts = data.filter(p => p.estado === 'activo');
            setProducts(activeProducts);
            console.log("Productos activos cargados:", activeProducts);
        } catch (err) {
            console.error(err);
            setError('Error al cargar productos');
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/sales/payment-methods');
            const data = await response.json();
            setPaymentMethods(data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar métodos de pago');
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/clients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setClients(data);
        } catch (err) {
            console.error(err);
            // Don't block UI if clients fail loading, just log
        }
    };

    // Row Operations
    const addRow = () => {
        const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
        setRows([...rows, { id: newId, productId: '', quantity: 1, unitPrice: 0, paymentMethod: '', client: '', isNewClient: false }]);
    };

    const removeRow = (id) => {
        if (rows.length === 1) return; // Keep at least one row
        setRows(rows.filter(r => r.id !== id));
        setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    };

    const updateRow = (id, field, value) => {
        // Special Handling for Mixed Payment
        if (field === 'paymentMethod' && value === 'MIXTO') {
            const row = rows.find(r => r.id === id);
            let rowsToUpdateIds = [id];
            let amountUSD = (row.quantity || 0) * (row.unitPrice || 0);

            // If the row is selected, assume we are paying for ALL selected rows
            if (selectedRows.includes(id)) {
                rowsToUpdateIds = selectedRows;
                const selectedData = rows.filter(r => selectedRows.includes(r.id));
                amountUSD = selectedData.reduce((acc, r) => acc + ((r.quantity || 0) * (r.unitPrice || 0)), 0);
            }

            setMixedModalData({
                totalToPayUSD: amountUSD,
                rowsToUpdate: rowsToUpdateIds
            });
            setMixedModalOpen(true);
            return; // Don't update state yet, wait for modal confirmation
        }

        setRows(rows.map(row => {
            if (row.id === id) {
                // New Client Logic
                if (field === 'startNewClient') {
                    return { ...row, isNewClient: true, client: '' };
                }
                if (field === 'cancelNewClient') {
                    return { ...row, isNewClient: false, client: '' };
                }

                let updates = { [field]: value };

                // If product changes, update unit price
                if (field === 'productId') {
                    const product = products.find(p => p.id_producto === parseInt(value));
                    updates.unitPrice = product ? parseFloat(product.precio) : 0;
                }

                return { ...row, ...updates };
            }
            return row;
        }));
    };

    const viewMixedDetails = (row) => {
        let amountUSD = (row.quantity || 0) * (row.unitPrice || 0);

        setMixedModalData({
            totalToPayUSD: amountUSD,
            rowsToUpdate: [row.id],
            initialPayments: row.paymentDetails || []
        });
        setMixedModalOpen(true);
    };

    // Selection Operations
    const toggleSelectRow = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === rows.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(rows.map(r => r.id));
        }
    };

    // Calculations
    const calculateTotals = () => {
        let totalUSD = 0;
        let totalBS = 0;

        rows.forEach(row => {
            const rowTotalUSD = (row.quantity || 0) * (row.unitPrice || 0);
            totalUSD += rowTotalUSD;
        });

        totalBS = totalUSD * (parseFloat(rate) || 0);

        return { totalUSD, totalBS };
    };

    const { totalUSD, totalBS } = calculateTotals();

    // Selection Totals
    const calculateSelectedTotals = () => {
        let selTotalUSD = 0;
        let selTotalBS = 0;

        const selectedData = rows.filter(r => selectedRows.includes(r.id));

        selectedData.forEach(row => {
            const rowTotalUSD = (row.quantity || 0) * (row.unitPrice || 0);
            selTotalUSD += rowTotalUSD;
        });

        selTotalBS = selTotalUSD * (parseFloat(rate) || 0);

        return { selTotalUSD, selTotalBS };
    };

    const { selTotalUSD, selTotalBS } = calculateSelectedTotals();

    const handleCloseSales = () => {
        // Validation
        const validRows = rows.filter(r => r.productId && r.quantity > 0 && r.paymentMethod);
        if (validRows.length === 0) {
            setError('No hay ventas válidas para registrar. Verifique productos y métodos de pago.');
            return;
        }
        setShowConfirmationModal(true);
    };

    const confirmCloseSales = async () => {
        const validRows = rows.filter(r => r.productId && r.quantity > 0 && r.paymentMethod);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/sales/close', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rows: validRows,
                    rate: parseFloat(rate)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cerrar venta');
            }

            // Success
            setSuccessMessage('¡Venta cerrada exitosamente! Se han guardado los registros.');
            setRows([{ id: 1, productId: '', quantity: 1, unitPrice: 0, paymentMethod: '', client: '' }]);
            setSelectedRows([]);
            localStorage.removeItem('bodega_sales_rows');
            setShowConfirmationModal(false);

        } catch (err) {
            console.error(err);
            setError(err.message);
            setShowConfirmationModal(false);
        }
    };




    return (
        <div className="space-y-6 relative">
            {/* Error Notification Toast */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 font-bold border border-red-600 backdrop-blur-sm bg-opacity-90"
                    >
                        <FaExclamationCircle className="text-2xl" />
                        <span>{error}</span>
                    </motion.div>
                )}
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="fixed top-6 right-6 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 font-bold border border-emerald-600 backdrop-blur-sm bg-opacity-90"
                    >
                        <FaCheckCircle className="text-2xl" />
                        <span>{successMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmationModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowConfirmationModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 overflow-hidden border border-slate-100"
                        >
                            <div className="text-center mb-8">
                                <div className="mx-auto bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50/50">
                                    <FaMoneyBillWave className="text-4xl text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 font-heading tracking-tight">¿Cerrar Venta del Día?</h3>
                                <p className="text-slate-500 text-lg leading-relaxed">
                                    Esta acción registrará todas las ventas actuales y limpiará la hoja de cálculo.
                                    <br />
                                    <span className="text-amber-600 font-bold block mt-2 text-sm bg-amber-50 py-1 px-3 rounded-full inline-block">⚠️ No podrás deshacer esta acción</span>
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowConfirmationModal(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wide"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmCloseSales}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 text-sm uppercase tracking-wide transform active:scale-95"
                                >
                                    Sí, Cerrar Venta
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Ventas</h2>
                    <p className="text-slate-500">Registro diario de ventas tipo hoja de cálculo.</p>
                </div>
                {user && user.rol === 'Administrador' && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCloseSales}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                    >
                        <FaCheckCircle className="text-xl" />
                        Cerrar Venta del Día
                    </motion.button>
                )}
            </header>

            {/* Top Summary Section - Styled like the dark blue headers in the requested image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-xl overflow-hidden shadow-lg border border-slate-200">
                {/* Left Side: Date & Rate */}
                <div className="bg-[#0f172a] text-white p-6 md:border-r border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-300 font-bold tracking-wider">FECHA</span>
                        <div className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                            <FaCalendarAlt />
                            {today}
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-300 font-bold tracking-wider">TASA DEL DÍA</span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Bs.</span>
                            <input
                                type="number"
                                value={rate}
                                onChange={handleRateChange}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right w-32 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Totals */}
                <div className="bg-[#1e293b] text-white p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-300 font-bold tracking-wider">TOTAL VENTA BS.</span>
                        <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 font-mono">
                            Bs. {totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-300 font-bold tracking-wider">TOTAL VENTA $</span>
                        <div className="flex items-center gap-2 text-3xl font-bold text-emerald-400 font-mono">
                            $ {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* The Sheet */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f172a] text-white">
                                <th className="p-3 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={rows.length > 0 && selectedRows.length === rows.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                </th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-10 text-center">#</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider min-w-[250px]">PRODUCTOS</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-20 text-center">CANT</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-24 text-right">$ UNID</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-24 text-right bg-[#1e293b]">TOTAL $</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-28 text-right">PRECIO BS</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider w-32 text-right bg-[#1e293b]">TOTAL BS</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider min-w-[180px]">MÉTODO DE PAGO</th>
                                <th className="p-3 font-bold text-xs uppercase tracking-wider min-w-[200px]">CLIENTE</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row, index) => {
                                const rowTotalUSD = (row.quantity || 0) * (row.unitPrice || 0);
                                const unitBS = (row.unitPrice || 0) * (parseFloat(rate) || 0);
                                const rowTotalBS = rowTotalUSD * (parseFloat(rate) || 0);

                                const isSelected = selectedRows.includes(row.id);

                                return (
                                    <tr
                                        key={row.id}
                                        className={`transition-colors group hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="p-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(row.id)}
                                                onChange={() => toggleSelectRow(row.id)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-2 text-center text-slate-400 font-mono text-xs">{index + 1}</td>

                                        {/* Product Select */}
                                        <td className="p-1">
                                            {row.isAdvance ? (
                                                <div className="w-full bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-sm font-black text-purple-700 uppercase tracking-wide flex items-center justify-between">
                                                    <span>AVANCE EFECTIVO</span>
                                                    <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">20%</span>
                                                </div>
                                            ) : (
                                                <select
                                                    value={row.productId}
                                                    onChange={(e) => updateRow(row.id, 'productId', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all font-medium text-slate-700"
                                                >
                                                    <option value="">Seleccionar Producto...</option>
                                                    {products.map(p => (
                                                        <option key={p.id_producto} value={p.id_producto}>
                                                            {p.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>

                                        {/* Quantity */}
                                        <td className="p-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.quantity}
                                                onChange={(e) => updateRow(row.id, 'quantity', parseFloat(e.target.value))}
                                                className={`w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm font-bold focus:border-emerald-500 outline-none show-spinner ${row.isAdvance ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900'}`}
                                                readOnly={row.isAdvance}
                                            />
                                        </td>

                                        {/* Unit Price USD */}
                                        <td className="p-2 text-right font-mono text-sm font-bold text-slate-900">
                                            {row.unitPrice > 0 ? `$ ${row.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </td>

                                        {/* Total USD */}
                                        <td className="p-2 text-right font-mono text-sm font-black text-slate-900 bg-slate-50/50">
                                            {rowTotalUSD > 0 ? `$ ${rowTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </td>

                                        {/* Unit Price BS */}
                                        <td className="p-2 text-right font-mono text-sm font-bold text-slate-900">
                                            {unitBS > 0 ? `Bs ${unitBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </td>

                                        {/* Total BS */}
                                        <td className="p-2 text-right font-mono text-sm font-black text-slate-900 bg-slate-50/50">
                                            {rowTotalBS > 0 ? `Bs ${rowTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </td>

                                        {/* Payment Method */}
                                        <td className="p-1">
                                            <div className="flex items-center">
                                                <select
                                                    value={row.paymentMethod}
                                                    onChange={(e) => updateRow(row.id, 'paymentMethod', e.target.value)}
                                                    className={`w-full border rounded px-2 py-1.5 text-sm focus:border-emerald-500 outline-none transition-colors ${row.paymentMethod === 'PENDIENTE POR COBRAR' ? 'bg-yellow-100 text-yellow-800 font-bold border-yellow-300' :
                                                        row.paymentMethod === 'MIXTO' ? 'bg-blue-100 text-blue-800 font-bold border-blue-300' :
                                                            row.paymentMethod && row.paymentMethod !== '' ? 'bg-green-100 text-green-800 font-bold border-green-300' :
                                                                'bg-white text-slate-700 border-slate-200'
                                                        }`}
                                                >
                                                    <option value="">- Seleccionar -</option>
                                                    {paymentMethods.map(m => (
                                                        <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>
                                                            {m.nb_metodo_pago}
                                                        </option>
                                                    ))}
                                                </select>
                                                {row.paymentMethod === 'MIXTO' && (
                                                    <button
                                                        onClick={() => viewMixedDetails(row)}
                                                        className="ml-2 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                        title="Ver Detalles de Pago"
                                                    >
                                                        <FaDollarSign size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* Client */}
                                        <td className="p-1">
                                            {row.isNewClient ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={row.client}
                                                        onChange={(e) => updateRow(row.id, 'client', e.target.value.toUpperCase())}
                                                        placeholder="Nombre Nuevo..."
                                                        className="w-full bg-white border border-blue-300 rounded px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 outline-none placeholder:text-slate-300"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => updateRow(row.id, 'cancelNewClient')}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                        title="Cancelar nuevo cliente"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <select
                                                    value={row.client}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'NEW_CLIENT') {
                                                            updateRow(row.id, 'startNewClient');
                                                        } else {
                                                            updateRow(row.id, 'client', e.target.value);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all font-medium text-slate-700"
                                                >
                                                    <option value="">- Cliente -</option>
                                                    <option value="NEW_CLIENT" className="font-bold text-emerald-600 bg-emerald-50">+ Nuevo Cliente</option>
                                                    <option value="CLIENTE" className="font-bold text-slate-800">CLIENTE</option>
                                                    {clients
                                                        .filter(c => c.nb_cliente !== 'CLIENTE')
                                                        .map(c => (
                                                            <option key={c.id_cliente} value={c.nb_cliente}>
                                                                {c.nb_cliente}
                                                            </option>
                                                        ))}
                                                </select>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-1 text-center">
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Eliminar fila"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex gap-4">
                        <button
                            onClick={addRow}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-emerald-600 font-bold transition-all shadow-sm text-sm flex items-center gap-2"
                        >
                            <span className="text-xl leading-none">+</span> Agregar Fila
                        </button>
                        <button
                            onClick={() => setIsAdvanceModalOpen(true)}
                            className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 font-bold transition-all shadow-sm text-sm flex items-center gap-2"
                        >
                            <FaMoneyBillWave /> Agregar Avance
                        </button>
                    </div>

                </div>
            </motion.div>

            {/* Advance Modal */}
            <AnimatePresence>
                {isAdvanceModalOpen && (
                    <AdvanceModal
                        rate={rate}
                        paymentMethods={paymentMethods}
                        onClose={() => setIsAdvanceModalOpen(false)}
                        onConfirm={(data) => {
                            const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
                            const totalBs = parseFloat(data.amount) * 1.20; // 20% commission
                            const priceUsd = totalBs / parseFloat(rate);

                            setRows([...rows, {
                                id: newId,
                                isAdvance: true,
                                productId: 'AVANCE', // Placeholder
                                quantity: 1,
                                unitPrice: priceUsd,
                                paymentMethod: data.method,
                                client: data.client || 'CLIENTE',
                                isNewClient: false,
                                advanceAmountBs: parseFloat(data.amount), // Cost to deduct from Cash
                                advanceCommissionBs: parseFloat(data.amount) * 0.20
                            }]);
                            setIsAdvanceModalOpen(false);
                            setSuccessMessage('Avance registrado correctamente');
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Floating Selection Summary */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: selectedRows.length > 0 ? 0 : 100, opacity: selectedRows.length > 0 ? 1 : 0 }}
                className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 z-50 flex items-center gap-6"
            >
                <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filas Seleccionadas</span>
                    <span className="font-bold text-xl">{selectedRows.length}</span>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Seleccionado BS</span>
                    <span className="font-mono text-lg font-bold">Bs {selTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Seleccionado $</span>
                    <span className="font-mono text-xl font-bold">$ {selTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </motion.div>

            {/* Mixed Payment Modal */}
            <AnimatePresence>
                {mixedModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-[#0f172a] p-6 flex justify-between items-center text-white">
                                <div>
                                    <h3 className="text-xl font-bold">Pago Mixto</h3>
                                    <p className="text-slate-400 text-sm">Registre los pagos parciales</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Total a Pagar</div>
                                    <div className="font-mono font-bold text-2xl text-emerald-400">
                                        $ {mixedModalData.totalToPayUSD.toFixed(2)}
                                    </div>
                                    <div className="font-mono text-sm text-slate-300">
                                        Bs. {(mixedModalData.totalToPayUSD * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            <MixedPaymentContent
                                totalUSD={mixedModalData.totalToPayUSD}
                                rate={rate}
                                paymentMethods={paymentMethods}
                                initialPayments={mixedModalData.initialPayments}
                                onClose={() => setMixedModalOpen(false)}
                                onConfirm={(payments) => {
                                    // Update Rows
                                    setRows(rows.map(r => {
                                        if (mixedModalData.rowsToUpdate.includes(r.id)) {
                                            return { ...r, paymentMethod: 'MIXTO', paymentDetails: payments };
                                        }
                                        return r;
                                    }));
                                    setMixedModalOpen(false);
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

// Internal Component for Mixed Payment Logic
const MixedPaymentContent = ({ totalUSD, rate, paymentMethods, onClose, onConfirm, initialPayments = [] }) => {
    const [payments, setPayments] = useState(initialPayments);
    const [currentMethod, setCurrentMethod] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD'); // USD or BS

    // Calculate totals
    const totalPaidUSD = payments.reduce((acc, p) => acc + p.amountInUSD, 0);
    const remainingUSD = totalUSD - totalPaidUSD;
    const remainingBS = remainingUSD * rate;

    const addPayment = () => {
        if (!currentMethod || !amount || parseFloat(amount) <= 0) return;

        const val = parseFloat(amount);
        const valInUSD = currency === 'BS' ? val / rate : val;

        setPayments([...payments, {
            id: Date.now(),
            method: currentMethod,
            amount: val, // Original amount entered
            currency: currency,
            amountInUSD: valInUSD
        }]);

        setAmount('');
        setCurrentMethod('');
    };

    const removePayment = (id) => {
        setPayments(payments.filter(p => p.id !== id));
    };

    const isComplete = Math.abs(remainingUSD) < 0.01; // Tolerance for float errors

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

                {/* Add Payment Form */}
                <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                        <select
                            value={currentMethod}
                            onChange={(e) => {
                                const method = e.target.value;
                                setCurrentMethod(method);
                                // Auto-set currency based on method
                                if (method === 'DIVISAS') {
                                    setCurrency('USD');
                                } else if (method !== '') {
                                    setCurrency('BS');
                                }
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="">Seleccionar...</option>
                            {paymentMethods
                                .filter(m => m.nb_metodo_pago !== 'MIXTO' && m.nb_metodo_pago !== 'PENDIENTE POR COBRAR')
                                .map(m => (
                                    <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>{m.nb_metodo_pago}</option>
                                ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-right font-mono font-bold"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moneda</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold"
                        >
                            <option value="USD">$</option>
                            <option value="BS">Bs.</option>
                        </select>
                    </div>
                    <button
                        onClick={addPayment}
                        disabled={!currentMethod || !amount}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Agregar
                    </button>
                </div>

                {/* Payments List */}
                <div className="space-y-2">
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Pagos Registrados</h4>
                    {payments.length === 0 && (
                        <p className="text-slate-400 italic text-sm text-center py-4">No hay pagos registrados aún.</p>
                    )}
                    {payments.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-slate-700">{p.method}</div>
                                {p.method !== 'PENDIENTE POR COBRAR' && (
                                    <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{p.currency}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="font-mono font-bold text-slate-800">
                                        {p.currency === 'USD' ? '$' : 'Bs.'} {p.currency === 'USD' ? p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : p.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </div>
                                    {p.currency === 'BS' && (
                                        <div className="text-xs text-slate-400 font-mono">
                                            $ {p.amountInUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                    {p.currency === 'USD' && (
                                        <div className="text-xs text-slate-400 font-mono">
                                            Bs. {(p.amount * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removePayment(p.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* Footer Info */}
            <div className="bg-slate-50 p-6 border-t border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-slate-600 font-bold">
                        {remainingUSD > 0.01 ? 'Restante (Se registrará como Deuda):' : 'Completado:'}
                    </div>
                    <div className={`text-right ${remainingUSD > 0.01 ? 'text-orange-500' : 'text-emerald-600'}`}>
                        <div className="font-mono text-2xl font-bold">
                            $ {Math.max(0, remainingUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        Bs. {Math.max(0, remainingBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            let finalPayments = [...payments];
                            // Automatically register debt if there is a remaining amount
                            if (remainingUSD > 0.01) {
                                finalPayments.push({
                                    id: Date.now(),
                                    method: 'PENDIENTE POR COBRAR',
                                    amount: parseFloat(remainingUSD.toFixed(3)), // Ensure precision
                                    currency: 'USD',
                                    amountInUSD: parseFloat(remainingUSD.toFixed(3))
                                });
                            }
                            onConfirm(finalPayments);
                        }}
                        className="px-6 py-3 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Confirmar Pagos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesPage;
const AdvanceModal = ({ rate, paymentMethods, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [client, setClient] = useState('');

    const commission = (parseFloat(amount) || 0) * 0.20;
    const totalToCharge = (parseFloat(amount) || 0) + commission;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
                <div className="bg-purple-600 text-white p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <FaMoneyBillWave /> Nuevo Avance
                    </h3>
                    <p className="text-purple-200 text-sm">Entrega de efectivo con comisión</p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a Entregar (Bs)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full text-2xl font-black text-slate-800 border-b-2 border-purple-200 hover:border-purple-500 focus:border-purple-600 outline-none py-2 bg-transparent transition-colors"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold">Comisión (20%)</span>
                            <span className="font-bold text-slate-600">Bs {commission.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                            <span className="text-purple-700 font-bold uppercase text-xs">Total a Cobrar</span>
                            <span className="font-black text-xl text-purple-700">Bs {totalToCharge.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right text-xs text-slate-400 font-bold">
                            $ {(totalToCharge / rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Cobro</label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">Seleccionar...</option>
                            {paymentMethods
                                .filter(m => m.nb_metodo_pago !== 'EFECTIVO' && m.nb_metodo_pago !== 'MIXTO')
                                .map(m => (
                                    <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>{m.nb_metodo_pago}</option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (Opcional)</label>
                        <input
                            type="text"
                            value={client}
                            onChange={(e) => setClient(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none placeholder:font-normal"
                            placeholder="Nombre del cliente..."
                        />
                    </div>

                    <button
                        onClick={() => onConfirm({ amount, method, client })}
                        disabled={!amount || !method || parseFloat(amount) <= 0}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        Procesar Avance
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


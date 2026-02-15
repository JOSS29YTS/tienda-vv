import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaDollarSign, FaMoneyBillWave, FaTrash, FaExclamationCircle, FaCheckCircle, FaFilePdf, FaFileInvoice, FaPlus, FaEdit, FaCheck, FaTimes, FaBarcode } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useRate } from '../../context/RateContext';
import API_URL from '../../config/api';

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
        return [{ id: 1, productId: '', quantity: 0, unitPrice: 0, paymentMethod: '', client: '', clientPhone: '', isNewClient: false }];
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
    const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false); // Shared Modal State
    const [targetRowForClient, setTargetRowForClient] = useState(null); // Track which row triggered the modal
    const [scanCode, setScanCode] = useState('');




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

    // Global Key Listener for Barcode Scanner in Main Sales Page
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = 0;

        const handleGlobalKeyDown = (e) => {
            // Ignore if modal is open (let modal handle it)
            if (isNewInvoiceModalOpen || isAdvanceModalOpen || showConfirmationModal) return;

            // Ignore if typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                // Unless it's OUR scanner input, but that has its own onKeyDown
                return;
            }

            const now = Date.now();
            if (now - lastKeyTime > 100) {
                buffer = '';
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (buffer.trim()) {
                    setScanCode(buffer.trim()); // Update UI
                    // Trigger scan logic directly
                    const product = products.find(p => p.codigo_de_barra === buffer.trim());
                    if (product) {
                        setRows(prevRows => {
                            let newRows = [...prevRows];
                            let targetRowIndex = newRows.findIndex(r => !r.productId && !r.isAdvance);
                            if (targetRowIndex === -1) {
                                newRows.push({ id: newRows.length > 0 ? Math.max(...newRows.map(r => r.id)) + 1 : 1, productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio), paymentMethod: '', client: '', isNewClient: false });
                            } else {
                                newRows[targetRowIndex] = { ...newRows[targetRowIndex], productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio) };
                            }
                            return newRows;
                        });
                        setSuccessMessage(`Producto agregado: ${product.nombre}`);
                    } else {
                        setError('Producto no encontrado');
                    }
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isNewInvoiceModalOpen, isAdvanceModalOpen, showConfirmationModal, products]);

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
            const response = await fetch(`${API_URL}/api/products');
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
            const response = await fetch(`${API_URL}/api/sales/payment-methods');
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
            const response = await fetch(`${API_URL}/api/clients`, {
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
        setRows([...rows, { id: newId, productId: '', quantity: 0, unitPrice: 0, paymentMethod: '', client: '', clientPhone: '', isNewClient: false }]);
    };

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!scanCode.trim()) return;

            const product = products.find(p => p.codigo_de_barra === scanCode.trim());

            if (product) {
                // Find empty row or add new
                let newRows = [...rows];
                let targetRowIndex = newRows.findIndex(r => !r.productId && !r.isAdvance);

                if (targetRowIndex === -1) {
                    // No empty row, add new
                    const newId = newRows.length > 0 ? Math.max(...newRows.map(r => r.id)) + 1 : 1;
                    newRows.push({ id: newId, productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio), paymentMethod: '', client: '', isNewClient: false });
                } else {
                    // Use empty row
                    newRows[targetRowIndex] = {
                        ...newRows[targetRowIndex],
                        productId: product.id_producto,
                        quantity: 1,
                        unitPrice: parseFloat(product.precio)
                    };
                }
                setRows(newRows);
                setSuccessMessage(`Producto agregado: ${product.nombre}`);
                setScanCode('');
            } else {
                setError('Producto no encontrado con ese código');
                setScanCode('');
            }
        }
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
                    // Trigger Modal instead of inline
                    setTargetRowForClient(id);
                    setIsAddClientModalOpen(true);
                    return row; // Don't change row yet
                }
                if (field === 'cancelNewClient') {
                    return { ...row, isNewClient: false, client: '', clientPhone: '' };
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

        // --- PREPARE ROWS ---
        // Ensure all MIXTO rows have a mixedBatchId.
        const processedRows = validRows.map((row, index) => {
            if (row.paymentMethod === 'MIXTO') {
                if (row.mixedBatchId) {
                    return row; // Use existing batch ID (New Invoice or Manual Modal)
                }

                // Fallback for unexpected legacy state: Group by signature
                const signature = row.paymentDetails
                    ? row.paymentDetails.map(pd => `${pd.method}-${pd.amount}-${pd.currency}`).sort().join('|')
                    : `empty-${index}`; // Add index to avoid colliding empty payments

                // Simple hash replacement to avoid btoa issues with special chars
                let hash = 0;
                for (let i = 0; i < signature.length; i++) {
                    const char = signature.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32bit integer
                }
                const batchId = `auto-patch-${Math.abs(hash)}`;
                return { ...row, mixedBatchId: batchId };
            }
            return row;
        });
        // -----------------------------

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/sales/close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rows: processedRows,
                    rate: parseFloat(rate)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cerrar venta');
            }

            // Success
            setSuccessMessage('¡Venta cerrada exitosamente! Se han guardado los registros.');
            setRows([{ id: 1, productId: '', quantity: 0, unitPrice: 0, paymentMethod: '', client: '' }]);
            setSelectedRows([]);
            localStorage.removeItem('bodega_sales_rows');
            setShowConfirmationModal(false);

        } catch (err) {
            console.error(err);
            setError(err.message);
            setShowConfirmationModal(false);
        }
    };





    const handleGenerateReport = () => {
        const doc = new jsPDF();
        const secondaryColor = [15, 23, 42]; // Slate 900
        const primaryColor = [16, 185, 129]; // Emerald 500

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('VENALTA SYSTEM', 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE DE VENTAS (HOJA DE CÁLCULO)', 20, 30);

        // Metadata
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        doc.setFontSize(10);
        doc.text(`Fecha: ${date} ${time}`, 140, 20);
        doc.text(`Generado por: ${user ? user.nombre + ' ' + user.apellido : 'Usuario'}`, 140, 28);
        doc.text(`Tasa: Bs. ${rate}`, 140, 36);

        // Table
        const validRows = rows.filter(r => (r.productId && r.productId !== '') || r.isAdvance);

        const tableBody = validRows.map(row => {
            const productName = row.isAdvance ?
                'AVANCE DE EFECTIVO' :
                (products.find(p => p.id_producto == row.productId)?.nombre || 'Producto Desconocido');

            const rowTotalUSD = (row.quantity || 0) * (row.unitPrice || 0);
            const rowTotalBS = rowTotalUSD * parseFloat(rate);

            return [
                productName,
                row.quantity,
                `$ ${(row.unitPrice || 0).toFixed(2)}`,
                `$ ${rowTotalUSD.toFixed(2)}`,
                `Bs. ${rowTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                row.paymentMethod,
                row.client || '-'
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['Producto', 'Cant', '$ Unit', 'Total $', 'Total Bs', 'Método', 'Cliente']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' },
                4: { halign: 'right' }
            }
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN TOTAL:', 130, finalY);

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(`$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 130, finalY + 8);
        doc.text(`Bs. ${totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 130, finalY + 16);

        doc.save(`Ventas_${date.replace(/\//g, '-')}.pdf`);
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
            {/* Confirmation Modal */}
            {createPortal(
                <AnimatePresence>
                    {showConfirmationModal && (
                        <motion.div
                            key="confirmation-modal"
                            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                onClick={() => setShowConfirmationModal(false)}
                            />

                            {/* Modal Content */}
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
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
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Ventas</h2>
                    <p className="text-slate-500">Registro diario de ventas tipo hoja de cálculo.</p>
                </div>
                {user && user.rol === 'Administrador' && (
                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateReport}
                            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-400/50 flex items-center gap-2 hover:bg-slate-700 transition-colors"
                        >
                            <FaFilePdf className="text-xl" />
                            Generar Reporte
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCloseSales}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                        >
                            <FaCheckCircle className="text-xl" />
                            Cerrar Venta del Día
                        </motion.button>
                    </div>
                )}
            </header>

            {/* Add Client Modal */}
            {isAddClientModalOpen && (
                <AddClientModal
                    onClose={() => {
                        setIsAddClientModalOpen(false);
                        setTargetRowForClient(null);
                    }}
                    onSave={(data) => {
                        if (targetRowForClient) {
                            // Update specific row
                            setRows(prev => prev.map(r => r.id === targetRowForClient ? { ...r, client: data.name, clientPhone: data.phone, isNewClient: true } : r));
                        }
                        setIsAddClientModalOpen(false);
                        setTargetRowForClient(null);
                    }}
                />
            )}

            {/* Add Client Modal */}
            {isAddClientModalOpen && (
                <AddClientModal
                    onClose={() => {
                        setIsAddClientModalOpen(false);
                        setTargetRowForClient(null);
                    }}
                    onSave={(data) => {
                        if (targetRowForClient) {
                            // Update specific row
                            setRows(prev => prev.map(r => r.id === targetRowForClient ? { ...r, client: data.name, clientPhone: data.phone, isNewClient: true } : r));
                        }
                        setIsAddClientModalOpen(false);
                        setTargetRowForClient(null);
                    }}
                />
            )}

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

            {/* Barcode Scanner Input */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-lg text-slate-500">
                    <FaBarcode size={24} />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Escáner de Código de Barra</label>
                    <input
                        type="text"
                        value={scanCode}
                        onChange={(e) => setScanCode(e.target.value)}
                        onKeyDown={handleScan}
                        className="w-full bg-transparent text-xl font-mono font-bold text-slate-800 outline-none placeholder:text-slate-300"
                        placeholder="Escanea o escribe el código y presiona Enter..."
                        autoFocus
                    />
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
                                                min="0"
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
                                                <div className="flex flex-col gap-1 w-full">
                                                    <div className="flex items-center gap-1">
                                                        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 text-xs">
                                                            <div className="font-bold text-emerald-800 break-all">{row.client}</div>
                                                            {row.clientPhone && <div className="text-emerald-600 font-mono">{row.clientPhone}</div>}
                                                        </div>
                                                        <button
                                                            onClick={() => updateRow(row.id, 'cancelNewClient')}
                                                            className="text-red-400 hover:text-red-600 p-1 shrink-0"
                                                            title="Cancelar nuevo cliente"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
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
                                            )
                                            }
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
                        <button
                            onClick={() => setIsNewInvoiceModalOpen(true)}
                            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 font-bold transition-all shadow-sm text-sm flex items-center gap-2"
                        >
                            <FaFileInvoice /> Nueva Factura
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

            {/* New Invoice Modal */}
            <AnimatePresence>
                {isNewInvoiceModalOpen && (
                    <NewInvoiceModal
                        products={products}
                        clients={clients}
                        paymentMethods={paymentMethods}
                        rate={rate}
                        onClose={() => setIsNewInvoiceModalOpen(false)}
                        onConfirm={(invoiceData) => {
                            // Process Invoice Data
                            const { items, client, payment } = invoiceData;
                            const newRows = [];
                            let startId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;

                            // Deep copy of payments for waterfall distribution
                            // Correctly generate batch ID ONCE per invoice
                            const batchId = payment.type === 'MIXED' ? `batch-${Date.now()}` : null;

                            items.forEach((item, index) => {
                                let rowCostUSD = item.quantity * item.unitPrice;
                                let rowPaymentMethod = '';
                                let rowPaymentDetails = null;

                                if (payment.type === 'SINGLE') {
                                    rowPaymentMethod = payment.method;
                                } else {
                                    rowPaymentMethod = 'MIXTO';

                                    // CLONE: Copy full payment details to every row but with new IDs just in case
                                    rowPaymentDetails = payment.details.map(p => ({
                                        ...p,
                                        id: `${p.id}-${index}`,
                                    }));
                                }

                                newRows.push({
                                    id: startId + index,
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    paymentMethod: rowPaymentMethod,
                                    mixedBatchId: batchId,
                                    paymentDetails: rowPaymentDetails,
                                    client: client || 'CLIENTE',
                                    isNewClient: client && !clients.some(c => c.nb_cliente === client) ? true : false,
                                    clientPhone: invoiceData.clientPhone
                                });
                            });

                            // Determine if we append or replace based on if the current table is empty/clean
                            // We typically append
                            // But if the first row is empty dummy row, replace it
                            if (rows.length === 1 && !rows[0].productId) {
                                setRows(newRows);
                            } else {
                                setRows([...rows, ...newRows]);
                            }

                            setIsNewInvoiceModalOpen(false);
                            setSuccessMessage('Factura agregada a la lista de ventas');
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
                                    // Generate ONE unique batch ID for this manual transaction
                                    const batchId = `manual-batch-${Date.now()}`;

                                    setRows(prevRows => prevRows.map(r => {
                                        if (mixedModalData.rowsToUpdate.includes(r.id)) {
                                            return {
                                                ...r,
                                                paymentMethod: 'MIXTO',
                                                paymentDetails: payments, // All rows in this batch share the same payment details
                                                mixedBatchId: batchId     // And the same Batch ID
                                            };
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
                {/* Add Payment Form */}
                <div className="flex gap-4 items-end bg-slate-50 p-4 pb-6 rounded-xl border border-slate-200">
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
                    <div className="w-32 relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-right font-mono font-bold"
                            placeholder="0.00"
                        />
                        {currency === 'BS' && amount && !isNaN(parseFloat(amount)) && (
                            <div className="absolute top-full right-0 mt-1 text-xs text-slate-500 font-bold whitespace-nowrap">
                                $ {(parseFloat(amount) / parseFloat(rate)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        )}
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
                                        <div className="text-xs text-slate-500 font-bold font-mono">
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
const NewInvoiceModal = ({ products, clients, paymentMethods, rate, onClose, onConfirm }) => {
    const [client, setClient] = useState('');
    const [invoiceClientPhone, setInvoiceClientPhone] = useState('');
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
    const [items, setItems] = useState([]);

    // Item Input State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Payment State
    const [paymentType, setPaymentType] = useState('SINGLE'); // SINGLE, MIXED
    const [singleMethod, setSingleMethod] = useState('');

    // Mixed Payment State (Simplified version of MixedPaymentContent logic)
    const [mixedPayments, setMixedPayments] = useState([]);
    const [mixedMethodInput, setMixedMethodInput] = useState('');
    const [mixedAmountInput, setMixedAmountInput] = useState('');
    const [mixedCurrencyInput, setMixedCurrencyInput] = useState('USD');

    // Barcode Scan
    const [scanCode, setScanCode] = useState('');

    // Global Scan Listener for Modal
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = 0;

        const handleModalGlobalKeyDown = (e) => {
            // Check if we are typing in ANY input (including our scanner input if focused)
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                return;
            }

            const now = Date.now();
            if (now - lastKeyTime > 100) {
                buffer = '';
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                // If buffer is valid, use it.
                if (buffer.trim()) {
                    e.preventDefault();
                    setScanCode(buffer.trim());
                    handleScanLogic(buffer.trim());
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleModalGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleModalGlobalKeyDown);
    }, [products]); // Remove 'items' dependency to avoid re-binding on every add

    const handleScanLogic = (code) => {
        const product = products.find(p => p.codigo_de_barra === code);

        if (product) {
            // Add new item or update existing
            setItems(prevItems => {
                const existingItemIndex = prevItems.findIndex(item => item.productId === product.id_producto);
                if (existingItemIndex > -1) {
                    const newItems = [...prevItems];
                    // IMPORTANT: Ensure we are only adding 1
                    newItems[existingItemIndex] = {
                        ...newItems[existingItemIndex],
                        quantity: newItems[existingItemIndex].quantity + 1
                    };
                    return newItems;
                } else {
                    return [...prevItems, {
                        id: Date.now(),
                        productId: product.id_producto,
                        name: product.nombre,
                        quantity: 1,
                        unitPrice: parseFloat(product.precio)
                    }];
                }
            });
            setScanCode('');
        } else {
            alert('Producto no encontrado');
            setScanCode('');
        }
    };

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation(); // Stop global listener form seeing this
            if (!scanCode.trim()) return;
            handleScanLogic(scanCode.trim());
        }
    };

    // Editing State
    const [editingItemId, setEditingItemId] = useState(null);
    const [editQuantity, setEditQuantity] = useState('');

    const handleEditItem = (item) => {
        setEditingItemId(item.id);
        setEditQuantity(item.quantity);
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditQuantity('');
    };

    const handleSaveEdit = (id) => {
        if (!editQuantity || parseFloat(editQuantity) <= 0) return;

        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, quantity: parseFloat(editQuantity) };
            }
            return item;
        }));
        setEditingItemId(null);
        setEditQuantity('');
    };

    // Derived
    const currentProduct = products.find(p => p.id_producto == selectedProductId);
    const invoiceTotalUSD = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const invoiceTotalBS = invoiceTotalUSD * rate;

    const addItem = () => {
        if (!currentProduct || quantity <= 0) return;

        const existingItemIndex = items.findIndex(item => item.productId === currentProduct.id_producto);

        if (existingItemIndex > -1) {
            // Update existing item quantity
            const newItems = [...items];
            newItems[existingItemIndex].quantity += parseFloat(quantity);
            setItems(newItems);
        } else {
            // Add new item
            setItems([...items, {
                id: Date.now(),
                productId: currentProduct.id_producto,
                name: currentProduct.nombre,
                quantity: parseFloat(quantity),
                unitPrice: parseFloat(currentProduct.precio)
            }]);
        }
        setSelectedProductId('');
        setQuantity(1);
    };

    const removeItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const addMixedPayment = () => {
        if (!mixedMethodInput || !mixedAmountInput || parseFloat(mixedAmountInput) <= 0) return;
        const val = parseFloat(mixedAmountInput);
        const valInUSD = mixedCurrencyInput === 'BS' ? val / rate : val;

        setMixedPayments([...mixedPayments, {
            id: Date.now(),
            method: mixedMethodInput,
            amount: val,
            currency: mixedCurrencyInput,
            amountInUSD: valInUSD
        }]);
        setMixedMethodInput('');
        setMixedAmountInput('');
    };

    const removeMixedPayment = (id) => {
        setMixedPayments(mixedPayments.filter(p => p.id !== id));
    };

    const totalPaidUSD = mixedPayments.reduce((acc, p) => acc + p.amountInUSD, 0);
    const remainingUSD = invoiceTotalUSD - totalPaidUSD;

    const handleConfirm = () => {
        // Validation
        if (items.length === 0) return;

        let finalPaymentData = {};

        if (paymentType === 'SINGLE') {
            if (!singleMethod) return;
            finalPaymentData = { type: 'SINGLE', method: singleMethod };
        } else {
            // Mixed Logic
            let details = [...mixedPayments];
            // If there is a remaining balance, add it as debt
            if (remainingUSD > 0.01) {
                details.push({
                    id: 'debt-' + Date.now() + Math.random(),
                    method: 'PENDIENTE POR COBRAR',
                    amount: parseFloat(remainingUSD.toFixed(3)),
                    currency: 'USD',
                    amountInUSD: parseFloat(remainingUSD.toFixed(3))
                });
            } else if (remainingUSD < -0.05) {
                return; // Still block overpayments
            }
            finalPaymentData = { type: 'MIXED', details: details };
        }

        onConfirm({
            items,
            client,
            clientPhone: invoiceClientPhone,
            payment: finalPaymentData
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] min-h-[500px]"
            >
                <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FaFileInvoice /> Nueva Factura
                        </h3>
                        <p className="text-slate-400 text-sm">Creación rápida de múltiples items</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Total Factura</div>
                        <div className="font-mono font-bold text-2xl text-emerald-400">
                            $ {invoiceTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="font-mono text-sm text-slate-300">
                            Bs. {invoiceTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left: Items & Client */}
                    <div className="flex-1 p-6 flex flex-col overflow-hidden border-r border-slate-200">
                        {/* Barcode Scanner Input */}
                        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mb-4 flex items-center gap-3 shadow-sm">
                            <div className="bg-white p-2 rounded-lg text-emerald-500 shadow-sm">
                                <FaBarcode size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Escáner Rápido</label>
                                <input
                                    type="text"
                                    value={scanCode}
                                    onChange={(e) => setScanCode(e.target.value)}
                                    onKeyDown={handleScan}
                                    className="w-full bg-transparent font-mono font-bold text-slate-700 outline-none text-sm placeholder:text-slate-400/70"
                                    placeholder="Escanea aquí para agregar..."
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Client Selector */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                            <div className="flex gap-2">
                                <select
                                    value={client}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW_CLIENT') {
                                            setIsAddClientModalOpen(true);
                                        } else {
                                            setClient(e.target.value);
                                        }
                                    }}
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700"
                                >
                                    <option value="">- Cliente General -</option>
                                    <option value="CLIENTE">CLIENTE</option>
                                    <option value="NEW_CLIENT" className="text-emerald-600 font-bold">+ Nuevo Cliente</option>
                                    {clients
                                        .filter(c => c.nb_cliente !== 'CLIENTE')
                                        .map(c => <option key={c.id_cliente} value={c.nb_cliente}>{c.nb_cliente}</option>)
                                    }
                                </select>
                            </div>
                            {/* Show selected new client info */}
                            {client && !clients.some(c => c.nb_cliente === client) && client !== 'CLIENTE' && (
                                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-xs flex justify-between items-center">
                                    <span className="font-bold text-emerald-800">{client} {invoiceClientPhone && <span className="font-mono opacity-75">({invoiceClientPhone})</span>}</span>
                                    <button onClick={() => setIsAddClientModalOpen(true)} className="text-emerald-600 hover:text-emerald-800 text-xs underline">Editar</button>
                                </div>
                            )}
                        </div>

                        {isAddClientModalOpen && (
                            <AddClientModal
                                onClose={() => setIsAddClientModalOpen(false)}
                                onSave={(data) => {
                                    setClient(data.name);
                                    setInvoiceClientPhone(data.phone);
                                    setIsAddClientModalOpen(false);
                                }}
                                initialData={{ name: client, phone: invoiceClientPhone }}
                            />
                        )}

                        {/* Add Item Form */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 shrink-0">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Buscar producto...</option>
                                        {products.map(p => (
                                            <option key={p.id_producto} value={p.id_producto}>{p.nombre} - ${parseFloat(p.precio).toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cant.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center font-bold show-spinner"
                                    />
                                </div>
                                <button
                                    onClick={addItem}
                                    disabled={!selectedProductId}
                                    className="bg-emerald-600 text-white p-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <FaPlus />
                                </button>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-2">
                            {items.length === 0 && (
                                <div className="text-center text-slate-400 py-8 italic text-sm">
                                    Agregue productos a la factura
                                </div>
                            )}
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                                    {editingItemId === item.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="font-bold text-slate-700 text-sm flex-1">{item.name}</div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                className="w-20 border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-700 outline-none show-spinner"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(item.id);
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                            <div className="text-xs text-slate-400">
                                                {item.quantity} x ${item.unitPrice.toFixed(2)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 ml-4">
                                        {editingItemId === item.id ? (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleSaveEdit(item.id)} className="text-emerald-500 hover:text-emerald-600 p-1 bg-emerald-50 rounded transition-colors" title="Guardar">
                                                    <FaCheck />
                                                </button>
                                                <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-500 p-1 bg-red-50 rounded transition-colors" title="Cancelar">
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-mono font-bold text-emerald-600">
                                                    $ {(item.quantity * item.unitPrice).toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditItem(item)} className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Cantidad">
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Payment */}
                    <div className="w-full md:w-1/3 bg-slate-50 p-6 flex flex-col border-l border-slate-200">
                        <h4 className="font-bold text-slate-700 uppercase text-xs mb-4">Método de Pago</h4>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setPaymentType('SINGLE')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentType === 'SINGLE' ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm' : 'bg-transparent border-slate-300 text-slate-500'}`}
                            >
                                Único
                            </button>
                            <button
                                onClick={() => setPaymentType('MIXED')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${paymentType === 'MIXED' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-transparent border-slate-300 text-slate-500'}`}
                            >
                                Mixto / Múltiple
                            </button>
                        </div>

                        {paymentType === 'SINGLE' ? (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seleccionar Método</label>
                                <select
                                    value={singleMethod}
                                    onChange={(e) => setSingleMethod(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold"
                                >
                                    <option value="">- Seleccionar -</option>
                                    {paymentMethods.filter(m => m.nb_metodo_pago !== 'MIXTO').map(m => (
                                        <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>{m.nb_metodo_pago}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col mb-4 overflow-hidden">
                                <div className="space-y-2 mb-4 flex-1 overflow-y-auto pr-1">
                                    {/* Mixed Payment Form */}
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex gap-2 mb-2">
                                            <select
                                                value={mixedMethodInput}
                                                onChange={(e) => {
                                                    setMixedMethodInput(e.target.value);
                                                    if (e.target.value === 'DIVISAS') setMixedCurrencyInput('USD');
                                                    else if (e.target.value) setMixedCurrencyInput('BS');
                                                }}
                                                className="flex-1 text-xs border rounded p-1"
                                            >
                                                <option value="">Método...</option>
                                                {paymentMethods.filter(m => m.nb_metodo_pago !== 'MIXTO' && m.nb_metodo_pago !== 'PENDIENTE POR COBRAR').map(m => (
                                                    <option key={m.id_metodo_pago} value={m.nb_metodo_pago}>{m.nb_metodo_pago}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={mixedCurrencyInput}
                                                onChange={(e) => setMixedCurrencyInput(e.target.value)}
                                                className="w-16 text-xs border rounded p-1"
                                            >
                                                <option value="USD">$</option>
                                                <option value="BS">Bs</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    value={mixedAmountInput}
                                                    onChange={(e) => setMixedAmountInput(e.target.value)}
                                                    placeholder="Monto"
                                                    className="w-full text-xs border rounded p-1"
                                                />
                                                {mixedCurrencyInput === 'BS' && mixedAmountInput > 0 && (
                                                    <div className="text-xs font-bold text-slate-700 text-right mt-1 font-mono">
                                                        $ {(parseFloat(mixedAmountInput) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={addMixedPayment}
                                                disabled={!mixedMethodInput || !mixedAmountInput}
                                                className="bg-blue-500 text-white px-3 text-xs rounded font-bold disabled:opacity-50"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* List */}
                                    {mixedPayments.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2 rounded">
                                            <span>{p.method}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <div className="font-mono font-bold">
                                                        {p.currency === 'USD' ? '$' : 'Bs'} {p.amount.toLocaleString(p.currency === 'USD' ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {p.currency === 'BS' && (
                                                        <div className="text-[10px] font-bold text-slate-600 font-mono">
                                                            $ {p.amountInUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => removeMixedPayment(p.id)} className="text-red-400"><FaTrash size={10} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right text-xs">
                                    <div className="flex justify-between font-bold text-slate-500">
                                        <span>Pagado:</span>
                                        <span>${totalPaidUSD.toFixed(2)}</span>
                                    </div>
                                    <div className={`flex justify-between font-bold items-center ${remainingUSD > 0.05 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        <span>Restante:</span>
                                        <div className="text-right">
                                            <div>${remainingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            {(Math.abs(remainingUSD) > 0.01) && (
                                                <div className="text-xs opacity-75 font-mono">
                                                    Bs. {(remainingUSD * parseFloat(rate)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto border-t border-slate-200 -mx-6 -mb-6 p-6 flex gap-2 bg-slate-50">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={items.length === 0 || (paymentType === 'SINGLE' && !singleMethod) || (paymentType === 'MIXED' && remainingUSD < -0.05)}
                                className="flex-1 py-3 bg-[#0f172a] text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Confirmar Orden
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

const AdvanceModal = ({ rate, paymentMethods, onClose, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [client, setClient] = useState('');

    const commission = (parseFloat(amount) || 0) * 0.20;
    const totalToCharge = (parseFloat(amount) || 0) + commission;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden min-h-[500px]"
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
        </div>,
        document.body
    );
};

// Add Client Modal Component
const AddClientModal = ({ onClose, onSave, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }
        // Phone validation if provided
        if (phone.trim()) {
            // Regex for 11 digits starting with 0 (e.g., 04242526986)
            const phoneRegex = /^0\d{10}$/;
            if (!phoneRegex.test(phone.trim())) {
                setError('El teléfono debe tener 11 dígitos y comenzar con 0 (Ej: 04242526986)');
                return;
            }
        }

        onSave({ name: name.toUpperCase(), phone: phone.trim() });
    };

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative z-10"
            >
                <h3 className="text-xl font-bold text-slate-800 mb-4">Nuevo Cliente</h3>
                {error && <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 uppercase focus:border-emerald-500 outline-none"
                            placeholder="NOMBRE DEL CLIENTE"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono (WhatsApp)</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); // Only numbers
                                if (val.length <= 11) setPhone(val);
                            }}
                            className="w-full border border-slate-300 rounded p-2 focus:border-emerald-500 outline-none font-mono"
                            placeholder="04141234567"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Formato: 11 dígitos, ej: 04241234567</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Guardar</button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

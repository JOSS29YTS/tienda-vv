import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaDollarSign, FaMoneyBillWave, FaTrash, FaExclamationCircle, FaCheckCircle, FaFilePdf, FaFileInvoice, FaPlus, FaEdit, FaCheck, FaTimes, FaBarcode } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useRate } from '../../context/RateContext';
import API_URL from '../../config/api';
import { useStore } from '../../context/StoreContext';

const SalesPage = () => {
    const { user } = useAuth();
    const { rate, setRate } = useRate();
    const { effectiveTiendaId } = useStore();
    // Current Date
    const today = new Date().toLocaleDateString('es-VE');

    const handleRateChange = (e) => {
        const newRate = e.target.value;
        setRate(newRate);
    };

    // Data State
    const [products, setProducts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);


    // Rows State (The Sheet)
    const getInitialRows = () => {
        const savedRows = localStorage.getItem(`bodega_sales_rows_${effectiveTiendaId || 'global'}`);
        if (savedRows) return JSON.parse(savedRows);
        return [{ id: Date.now(), productId: '', quantity: 0, unitPrice: 0, paymentMethod: '' }];
    };

    const [rows, setRows] = useState(getInitialRows());
    const [selectedRows, setSelectedRows] = useState([]);

    // Mixed Payment Modal State
    const [mixedModalOpen, setMixedModalOpen] = useState(false);
    const [mixedModalData, setMixedModalData] = useState({
        totalToPayUSD: 0,
        rowsToUpdate: []
    });


    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

    const [scanCode, setScanCode] = useState('');
    const isProcessingScanRef = useRef(false);
    const lastInteractionRef = useRef(Date.now()); // Start with current time to trust LocalStorage on mount

    const touchInteraction = () => {
        lastInteractionRef.current = Date.now();
    };




    // Global Key Listener for Barcode Scanner in Main Sales Page
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = 0;

        const handleGlobalKeyDown = (e) => {
            // Ignore if modal is open (let modal handle it)
            if (isNewInvoiceModalOpen || showConfirmationModal) return;

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
                const codeToScan = buffer.trim();
                if (codeToScan) {
                    if (isProcessingScanRef.current) return;
                    isProcessingScanRef.current = true;

                    setScanCode(codeToScan); // Update UI

                    // Trigger scan logic directly
                    const product = products.find(p => p.codigo_de_barra === codeToScan);
                    if (product) {
                        setRows(prevRows => {
                            let newRows = [...prevRows];
                            let targetRowIndex = newRows.findIndex(r => !r.productId && !r.isAdvance);
                            if (targetRowIndex === -1) {
                                newRows.push({ id: Date.now(), productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio), paymentMethod: '' });
                            } else {
                                newRows[targetRowIndex] = { ...newRows[targetRowIndex], productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio) };
                            }
                            return newRows;
                        });
                        toast.success(`Producto agregado: ${product.nombre}`);
                    } else {
                        toast.error('Producto no encontrado');
                        // console.log('Producto no encontrado');
                    }
                    touchInteraction();

                    // Clear buffer and state
                    buffer = '';
                    setScanCode('');
                    setTimeout(() => { isProcessingScanRef.current = false; }, 500); // 500ms safety lock
                }
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isNewInvoiceModalOpen, showConfirmationModal, products]);

    useEffect(() => {
        setRows(getInitialRows()); // Instantly switch local state
        fetchProducts();
        fetchPaymentMethods();

        fetchDraftSales(); // Load initial drafts

        // Poll for updates every 15 seconds to avoid saturation
        const interval = setInterval(() => {
            fetchDraftSales();
        }, 15000);

        return () => clearInterval(interval);
    }, [effectiveTiendaId]);

    // Save rows to server AND localStorage whenever they change (with debounce)
    useEffect(() => {
        localStorage.setItem(`bodega_sales_rows_${effectiveTiendaId || 'global'}`, JSON.stringify(rows));

        // Debounce server save to avoid too many requests
        const timeoutId = setTimeout(() => {
            saveDraftToServer();
        }, 1000); // Wait 1 second after last change (reduced from 5s)

        return () => clearTimeout(timeoutId);
    }, [rows, rate]);

    const saveDraftToServer = async () => {
        try {
            const token = localStorage.getItem('token');
            // CRITICAL: Only save rows that belong to the current user
            // Rows from other users (fetched via sync) have _userId and _isReadOnly: true
            const myRowsToSave = rows.filter(r => (!r._userId || String(r._userId) === String(user.id)) && r.productId && r.quantity > 0);

            // If I have no rows locally, but I previously had some (or just want to be sure), 
            // we SHOULD send the empty list to the server to clear it.
            // But we don't want to spam empty saves if the server is already empty.
            // For now, let's just remove the early return to allow synchronization of the "Empty" state.

            // Remove metadata before saving to keep DB clean
            const cleanRows = myRowsToSave.map(({ _userId, _userName, _userRole, _isReadOnly, ...rest }) => rest);

            await fetch(`${API_URL}/api/sales/draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rows: cleanRows,
                    rate: Math.round((parseFloat(rate) || 0) * 100) / 100,
                    id_tienda: effectiveTiendaId || null
                })
            });
        } catch (err) {
            console.error('Error saving draft:', err);
            // Don't show error to user, this is background sync
        }
    };

    const fetchDraftSales = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/sales/draft${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const drafts = await response.json();

            if (!user) return;

            // Merge logic inside setRows to ensure we use the LATEST state (prevRows)
            setRows(prevRows => {
                const serverResults = [];

                // 1. Process all drafts from the server
                drafts.forEach(draft => {
                    const isMe = String(draft.id_usuario) === String(user.id);
                    draft.datos_venta.forEach(row => {
                        if (row.productId && row.quantity > 0) {
                            serverResults.push({
                                ...row,
                                _userId: draft.id_usuario,
                                _userName: `${draft.nombre} ${draft.apellido}`,
                                _userRole: draft.rol,
                                _isReadOnly: !isMe
                            });
                        }
                    });
                });

                // 2. Resolve conflict with MY current local rows
                const isWithinLockWindow = (Date.now() - lastInteractionRef.current) < 7000;
                let finalMerged = [];

                if (isWithinLockWindow) {
                    // TRUST local state: 
                    // a. Include everything that's NOT mine from the server
                    const notMineFromServer = serverResults.filter(sr => String(sr._userId) !== String(user.id));

                    // b. Include MY local state (includes existing, new, and excludes deleted)
                    const myLocalRows = prevRows.filter(r => (!r._userId || String(r._userId) === String(user.id)));

                    finalMerged = [...notMineFromServer, ...myLocalRows];
                } else {
                    // TRUST server state:
                    finalMerged = [...serverResults];

                    // Keep my local rows that haven't synced yet:
                    // - Rows with a product not yet on server
                    // - Empty placeholder rows (no productId) that I added intentionally
                    const myLocalRows = prevRows.filter(r => !r._userId || String(r._userId) === String(user.id));
                    myLocalRows.forEach(localRow => {
                        if (!finalMerged.some(sr => sr.id === localRow.id)) {
                            finalMerged.push({ ...localRow, _isReadOnly: false });
                        }
                    });
                }

                // 3. Sort correctly: Products first, by ID
                finalMerged.sort((a, b) => {
                    const aHasP = a.productId && a.quantity > 0;
                    const bHasP = b.productId && b.quantity > 0;
                    if (aHasP && !bHasP) return -1;
                    if (!aHasP && bHasP) return 1;
                    return a.id - b.id;
                });

                // 4. Fallback if empty
                if (finalMerged.length === 0) {
                    return [{ id: Date.now(), productId: '', quantity: 0, unitPrice: 0, paymentMethod: '' }];
                }

                // Optimization: Only update if strings actually changed
                if (JSON.stringify(prevRows) === JSON.stringify(finalMerged)) {
                    return prevRows;
                }

                return finalMerged;
            });
        } catch (err) {
            console.error('Error fetching drafts:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/products${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cargar productos');
            }

            // Filter only active products
            const activeProducts = data.filter(p => p.estado === 'activo');
            setProducts(activeProducts);
            console.log("Productos activos cargados:", activeProducts);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar productos');
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sales/payment-methods`);
            const data = await response.json();

            // Filter out BANCO (POS)
            const filteredData = data.filter(m => !['BANCO (POS)'].includes(m.nb_metodo_pago.toUpperCase()));

            // Reorder: Put ZELLE before MIXTO if both exist
            const sortedData = [...filteredData].sort((a, b) => {
                const nameA = a.nb_metodo_pago.toUpperCase();
                const nameB = b.nb_metodo_pago.toUpperCase();

                if (nameA === 'ZELLE' && nameB === 'MIXTO') return -1;
                if (nameA === 'MIXTO' && nameB === 'ZELLE') return 1;

                return 0; // Maintain original database order for others
            });

            setPaymentMethods(sortedData);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar métodos de pago');
        }
    };



    // Row Operations
    const addRow = () => {
        touchInteraction();
        setRows([...rows, { id: Date.now(), productId: '', quantity: 0, unitPrice: 0, paymentMethod: '' }]);
    };

    const handleScan = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Stop form submission
            e.stopPropagation(); // Stop event bubbling

            if (isProcessingScanRef.current) return;
            isProcessingScanRef.current = true;

            const codigo = scanCode.trim();
            if (!codigo) return;

            try {
                const product = products.find(p => p.codigo_de_barra === codigo);

                if (product) {
                    // Clear input immediately to avoid double scan
                    setScanCode('');

                    // Find empty row or add new
                    let newRows = [...rows];
                    let targetRowIndex = newRows.findIndex(r => !r.productId && !r.isAdvance);

                    if (targetRowIndex === -1) {
                        newRows.push({ id: Date.now(), productId: product.id_producto, quantity: 1, unitPrice: parseFloat(product.precio), paymentMethod: '' });
                    } else {
                        newRows[targetRowIndex] = {
                            ...newRows[targetRowIndex],
                            productId: product.id_producto,
                            quantity: 1,
                            unitPrice: parseFloat(product.precio)
                        };
                    }
                    setRows(newRows);
                    touchInteraction();
                    toast.success(`Producto agregado: ${product.nombre}`);
                } else {
                    setScanCode('');
                    toast.error('Producto no encontrado con ese código');
                    // console.log('Producto no encontrado con ese código');
                }
            } finally {
                setTimeout(() => { isProcessingScanRef.current = false; }, 500); // 500ms safety lock
            }
        }
    };

    const removeRow = (id) => {
        if (rows.length === 1) return; // Keep at least one row
        touchInteraction();
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
        touchInteraction();
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

        // Force 2 decimal precision on rate and result
        const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
        totalBS = Math.round((totalUSD * cleanRate) * 100) / 100;

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

        // Force 2 decimal precision on rate and result
        const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
        selTotalBS = Math.round((selTotalUSD * cleanRate) * 100) / 100;

        return { selTotalUSD, selTotalBS };
    };

    const { selTotalUSD, selTotalBS } = calculateSelectedTotals();

    const handleCloseSales = () => {
        // Validation
        const validRows = rows.filter(r => r.productId && r.quantity > 0 && r.paymentMethod);
        if (validRows.length === 0) {
            toast.error('No hay ventas válidas para registrar. Verifique productos y métodos de pago.');
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
                    rate: Math.round((parseFloat(rate) || 0) * 100) / 100
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cerrar venta');
            }

            // Success
            toast.success('¡Venta cerrada exitosamente! Se han guardado los registros.');
            setRows([{ id: Date.now(), productId: '', quantity: 0, unitPrice: 0, paymentMethod: '', client: '', clientPhone: '', isNewClient: false }]);
            setSelectedRows([]);
            localStorage.removeItem(`bodega_sales_rows_${effectiveTiendaId || 'global'}`);
            setShowConfirmationModal(false);

        } catch (err) {
            console.error(err);
            toast.error(err.message);
            setShowConfirmationModal(false);
        }
    };





    const handleGenerateReport = () => {
        const doc = new jsPDF();
        const secondaryColor = [15, 23, 42]; // Slate 900
        const primaryColor = [15, 23, 42];   // Changed from emerald to slate

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(user?.nb_tienda ? `${user.nb_tienda.toUpperCase()} SYSTEM` : 'TODAS LAS TIENDAS SYSTEM', 20, 20);
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
            const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
            const rowTotalBS = Math.round((rowTotalUSD * cleanRate) * 100) / 100;

            return [
                productName,
                row.quantity,
                `$ ${(row.unitPrice || 0).toFixed(2)}`,
                `$ ${rowTotalUSD.toFixed(2)}`,
                `Bs. ${rowTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                row.paymentMethod
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['Producto', 'Cant', '$ Unit', 'Total $', 'Total Bs', 'Método']],
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
                <div className="flex gap-3">
                    {user && (user.rol === 'Administrador' || user.rol === 'Gerente') && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateReport}
                            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-400/50 flex items-center gap-2 hover:bg-slate-700 transition-colors"
                        >
                            <FaFilePdf className="text-xl" />
                            Generar Reporte
                        </motion.button>
                    )}
                    {user && (user.rol === 'Administrador' || user.rol === 'Gerente' || user.rol === 'Vendedor') && (
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
                </div>
            </header>

            {/* Add Client Modal */}


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
                                value={parseFloat(rate || 0).toFixed(2)}
                                onChange={handleRateChange}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right w-32 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                                step="0.01"
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

                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row, index) => {
                                const rowTotalUSD = Math.round(((row.quantity || 0) * (row.unitPrice || 0)) * 100) / 100;
                                const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
                                const unitBS = Math.round(((row.unitPrice || 0) * cleanRate) * 100) / 100;
                                const rowTotalBS = Math.round((rowTotalUSD * cleanRate) * 100) / 100;

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
                                        </td>

                                        {/* Quantity */}
                                        <td className="p-1">
                                            <input
                                                type="number"
                                                min="0"
                                                value={row.quantity}
                                                onChange={(e) => updateRow(row.id, 'quantity', parseFloat(e.target.value))}
                                                className={`w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm font-bold focus:border-emerald-500 outline-none show-spinner bg-white text-slate-900`}
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
                                                    {paymentMethods
                                                        .filter(m => m.nb_metodo_pago !== 'BANCO (POS)')
                                                        .map(m => (
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
                            onClick={() => setIsNewInvoiceModalOpen(true)}
                            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 font-bold transition-all shadow-sm text-sm flex items-center gap-2"
                        >
                            <FaFileInvoice /> Nueva Factura
                        </button>
                    </div>

                </div>
            </motion.div>



            {/* New Invoice Modal */}
            <AnimatePresence>
                {isNewInvoiceModalOpen && (
                    <NewInvoiceModal
                        products={products}

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
                                    paymentDetails: rowPaymentDetails
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
                                        Bs. {(mixedModalData.totalToPayUSD * (Math.round((parseFloat(rate) || 0) * 100) / 100)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
    const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
    const totalPaidUSD = payments.reduce((acc, p) => acc + p.amountInUSD, 0);
    const remainingUSD = Math.round((totalUSD - totalPaidUSD) * 100) / 100;
    const remainingBS = Math.round((remainingUSD * cleanRate) * 100) / 100;

    const addPayment = () => {
        if (!currentMethod || !amount || parseFloat(amount) <= 0) return;

        const val = parseFloat(amount);
        const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
        const valInUSD = currency === 'BS' ? Math.round((val / cleanRate) * 100) / 100 : val;

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
                                if (method === 'DIVISAS' || method === 'ZELLE') {
                                    setCurrency('USD');
                                } else if (method !== '') {
                                    setCurrency('BS');
                                }
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="">Seleccionar...</option>
                            {paymentMethods
                                .filter(m => m.nb_metodo_pago !== 'MIXTO' && m.nb_metodo_pago !== 'BANCO (POS)')
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
                                $ {(parseFloat(amount) / (Math.round((parseFloat(rate) || 0) * 100) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        {remainingUSD > 0.01 ? 'Restante:' : 'Completado:'}
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
                        onClick={() => onConfirm([...payments])}
                        disabled={!isComplete}
                        className="px-6 py-3 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Pagos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesPage;
const NewInvoiceModal = ({ products, paymentMethods, rate, onClose, onConfirm }) => {

    const [items, setItems] = useState([]);
    const [error, setError] = useState(null); // Local error state for modal

    // Auto-clear error
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

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
            setError('Producto no encontrado');
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
    const invoiceTotalUSD = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 100) / 100;
    const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
    const invoiceTotalBS = Math.round((invoiceTotalUSD * cleanRate) * 100) / 100;

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
        const cleanRate = Math.round((parseFloat(rate) || 0) * 100) / 100;
        const valInUSD = mixedCurrencyInput === 'BS' ? Math.round((val / cleanRate) * 100) / 100 : val;

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
            // Block if not fully paid
            if (Math.abs(remainingUSD) > 0.01) {
                return;
            }
            finalPaymentData = { type: 'MIXED', details: details };
        }

        onConfirm({
            items,
            payment: finalPaymentData
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] min-h-[500px] relative"
            >
                {/* Modal Error Notification */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full shadow-lg z-[50] flex items-center gap-2 font-bold text-sm"
                        >
                            <FaExclamationCircle />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                                                    if (e.target.value === 'DIVISAS' || e.target.value === 'ZELLE') setMixedCurrencyInput('USD');
                                                    else if (e.target.value) setMixedCurrencyInput('BS');
                                                }}
                                                className="flex-1 text-xs border rounded p-1"
                                            >
                                                <option value="">Método...</option>
                                                {paymentMethods.filter(m => m.nb_metodo_pago !== 'MIXTO').map(m => (
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
                                                    Bs. {(remainingUSD * (Math.round((parseFloat(rate) || 0) * 100) / 100)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                disabled={items.length === 0 || (paymentType === 'SINGLE' && !singleMethod) || (paymentType === 'MIXED' && Math.abs(remainingUSD) > 0.01)}
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



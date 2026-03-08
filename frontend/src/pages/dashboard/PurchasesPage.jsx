import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaSave, FaPlus, FaTrash, FaCheckCircle, FaExclamationCircle, FaTimes, FaCalendarAlt, FaFilePdf, FaBarcode, FaUpload, FaSpinner } from 'react-icons/fa';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

import { useRate } from '../../context/RateContext';
import API_URL from '../../config/api';

const PurchasesPage = () => {
    // Load initial state from localStorage if available
    const { rate, setRate } = useRate();
    const roundedRate = parseFloat(parseFloat(rate || 0).toFixed(2));
    const { user } = useAuth();
    const { effectiveTiendaId } = useStore();
    const [date, setDate] = useState(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const getInitialRows = () => {
        const savedRows = localStorage.getItem(`purchaseRows_${effectiveTiendaId || 'global'}`);
        return savedRows ? JSON.parse(savedRows) : [
            { id: 1, productId: '', profitPercent: 30, quantity: 1, currency: 'USD', costBultoBs: '', costBultoUsd: '', pvp: '' }
        ];
    };

    const [rows, setRows] = useState(getInitialRows());
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
    const [buyCurrencyData, setBuyCurrencyData] = useState({ amountUSD: '', amountBs: '', methodId: '', destMethodId: '' });

    // Receipt Upload State
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Barcode Scan State
    const [scanCode, setScanCode] = useState('');

    // Global Key Listener for Barcode Scanner
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = 0;

        const handleGlobalKeyDown = (e) => {
            // Ignore if modal is open (let modal handle it if there is one)
            if (isBuyCurrencyModalOpen) return;

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
                            let targetRowIndex = newRows.findIndex(r => !r.productId);
                            const newRowData = { productId: product.id_producto, profitPercent: 30, quantity: 1, currency: 'USD', costBultoBs: '', costBultoUsd: '', pvp: '' };

                            if (targetRowIndex === -1) {
                                newRows.push({ id: Date.now(), ...newRowData });
                            } else {
                                newRows[targetRowIndex] = { ...newRows[targetRowIndex], ...newRowData };
                            }
                            return newRows;
                        });
                        setSuccess(`Producto agregado: ${product.nombre}`);
                        setTimeout(() => setSuccess(''), 3000);
                    } else {
                        setError('Producto no encontrado con ese código');
                        setTimeout(() => setError(''), 3000);
                    }
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isBuyCurrencyModalOpen, products]);

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
            const res = await fetch(`${API_URL}/api/finances/buy-currency`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amountUSD: buyCurrencyData.amountUSD,
                    methodId: buyCurrencyData.methodId,
                    destinationId: buyCurrencyData.destMethodId, // Send destination method
                    rate: roundedRate, // Use rounded rate
                    date: date,
                    id_tienda: effectiveTiendaId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess(data.message);
            setIsBuyCurrencyModalOpen(false);
            setBuyCurrencyData({ amountUSD: '', amountBs: '', methodId: '', destMethodId: '' });
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    useEffect(() => {
        setRows(getInitialRows());
        fetchProducts();
        fetchPaymentMethods();
    }, [effectiveTiendaId]);

    // Auto-select first payment method when methods load and there are empty rows
    // (removed - handled directly in handleFinalizeClick)

    // Save state to localStorage
    useEffect(() => {
        localStorage.setItem(`purchaseRows_${effectiveTiendaId || 'global'}`, JSON.stringify(rows));
    }, [rows, effectiveTiendaId]);

    useEffect(() => {
        localStorage.setItem('purchaseDate', date);
    }, [date]);

    useEffect(() => {
        if (rate) localStorage.setItem('purchaseRate', rate);
    }, [rate]);


    const fetchPaymentMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/payment-methods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter(m => {
                    const name = m.nb_metodo_pago.toUpperCase();
                    return !name.includes('PENDIENTE') && !name.includes('MIXTO') && !name.includes('BIOPAGO') && !name.includes('BANCO (POS)');
                });
                setPaymentMethods(filtered);
                return filtered; // Return for immediate use
            }
        } catch (err) {
            console.error("Error fetching payment methods:", err);
        }
        return [];
    };

    const fetchProviders = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/suppliers${tiendaParam}`, {
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
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/products${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            } else {
                console.error("Failed to load products:", res.status);
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

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!scanCode.trim()) return;

            const product = products.find(p => p.codigo_de_barra === scanCode.trim());

            if (product) {
                // Find empty row or add new
                let newRows = [...rows];
                let targetRowIndex = newRows.findIndex(r => !r.productId);

                // Default values for new purchased product
                const newRowData = {
                    productId: product.id_producto,
                    profitPercent: 30,
                    quantity: 1,
                    currency: 'USD',
                    costBultoBs: '',
                    costBultoUsd: '', // We don't have cost, user must enter
                    pvp: ''
                };

                if (targetRowIndex === -1) {
                    // No empty row, add new
                    newRows.push({
                        id: Date.now(),
                        ...newRowData
                    });
                } else {
                    // Use empty row
                    newRows[targetRowIndex] = {
                        ...newRows[targetRowIndex],
                        ...newRowData
                    };
                }
                setRows(newRows);
                setSuccess(`Producto agregado: ${product.nombre}`);
                setScanCode('');
                setTimeout(() => setSuccess(''), 2000);
            } else {
                setError('Producto no encontrado con ese código');
                setScanCode('');
                setTimeout(() => setError(''), 3000);
            }
        }
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
                        updated.costBultoUsd = (parseFloat(value || 0) / roundedRate).toFixed(2);
                    }
                    if (field === 'costBultoUsd' && updated.currency === 'USD') {
                        updated.costBultoBs = (parseFloat(value || 0) * roundedRate).toFixed(2);
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
                rate: roundedRate,
                id_tienda: effectiveTiendaId, // Agregado contexto de venta
                rows: rows.filter(r => r.productId && r.quantity && r.pvp).map(r => ({
                    productId: r.productId,
                    profitPercent: r.profitPercent,
                    quantity: r.quantity,
                    currency: r.currency,
                    costBultoBs: r.costBultoBs,
                    costBultoUsd: r.currency === 'BS' ? (parseFloat(r.costBultoBs) / roundedRate) : r.costBultoUsd,
                    pvp: r.pvp
                })),
                invoiceData,
                payments: paymentsList
            };

            const response = await fetch(`${API_URL}/api/purchases`, {
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
        setPayments([{ methodId: '', amount: '' }]);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = () => {
        // Validate that every row with an amount also has a method
        for (const p of payments) {
            if (p.amount && !p.methodId) {
                setError('Seleccione un método de pago para cada fila antes de continuar.');
                setTimeout(() => setError(''), 5000);
                return;
            }
        }

        // Calculate Total Paid in USD
        let totalPaidUsd = 0;
        const finalPayments = [];

        for (const p of payments) {
            if (!p.methodId || !p.amount) continue;

            const method = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
            const isUsd = method && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => method.nb_metodo_pago.toUpperCase().includes(k));

            let amountUsd = parseFloat(p.amount);
            if (!isUsd) {
                amountUsd = amountUsd / roundedRate;
            }

            totalPaidUsd += amountUsd;
            finalPayments.push({ methodId: p.methodId, amount: amountUsd });
        }

        // Determine tolerance based on payment method types
        // USD payments: exact to the cent ($0.005 for floating point safety)
        // Bs payments: Bs 0.05 tolerance → converted to USD
        const allUsd = finalPayments.every(fp => {
            const method = paymentMethods.find(m => m.id_metodo_pago == fp.methodId);
            return method && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => method.nb_metodo_pago.toUpperCase().includes(k));
        });

        const currentRate = parseFloat(rate);
        // Margen ultrafino de 5 decimales de dólar (0.00005) o ~0.02 Bs de error,
        // esto bloquea que 31500 pase (diferencia 0.073 > 0.02) pero aprueba 31499.93
        const toleranceUsd = 0.00005;

        const diff = totalPaidUsd - totalCompasUsd;
        if (Math.abs(diff) > toleranceUsd) {
            const diffBs = diff * roundedRate;
            const totalPaidBs = totalPaidUsd * roundedRate;
            const totalCompraBs = totalCompasUsd * roundedRate;

            if (allUsd) {
                // Show USD-centered error with exact cents
                const msg = totalPaidUsd > totalCompasUsd
                    ? `El monto pagado ($${totalPaidUsd.toFixed(2)}) excede el total ($${totalCompasUsd.toFixed(2)}). Diferencia: $${diff.toFixed(2)}`
                    : `El monto pagado ($${totalPaidUsd.toFixed(2)}) no alcanza el total ($${totalCompasUsd.toFixed(2)}). Faltan: $${Math.abs(diff).toFixed(2)}`;
                setError(msg);
            } else {
                // Show Bs-centered error with 4 decimal places
                const msg = totalPaidUsd > totalCompasUsd
                    ? `El monto en Bs (${totalPaidBs.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}) excede el total (Bs ${totalCompraBs.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}). Diferencia: Bs ${diffBs.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                    : `El monto en Bs (${totalPaidBs.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}) no alcanza el total (Bs ${totalCompraBs.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}). Faltan: Bs ${Math.abs(diffBs).toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
                setError(msg);
            }
            setTimeout(() => setError(''), 3000);
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessingImage(true);
        try {
            const result = await Tesseract.recognize(
                file,
                'spa',
            );

            const text = result.data.text;
            console.log("Texto extraído:", text);

            const lines = text.split('\n');
            const newRows = [];
            const addedProductIds = new Set(); // Track added products to prevent duplicates

            // Helper to clean text for comparison
            const normalize = (str) => {
                return str
                    .toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^a-z0-9\s]/g, " "); // Replace special chars with space
            };

            lines.forEach(line => {
                if (!line.trim() || line.length < 5) return;

                const cleanLine = normalize(line);
                let bestMatch = null;
                let highestScore = 0;

                // 1. Try to extract quantity
                // Format A: "* 2 (C-P)..." (Quantity after *)
                // Format B: "... PET 1" (Quantity at end)
                let qty = 1;
                const starMatch = line.match(/\*\s*(\d+)/);

                if (starMatch) {
                    qty = parseInt(starMatch[1]);
                } else {
                    // Check end of line
                    const parts = line.trim().split(/\s+/);
                    const lastPart = parts[parts.length - 1];
                    if (/^\d+$/.test(lastPart) && parts.length > 2) {
                        qty = parseInt(lastPart);
                    }
                }

                // 2. Find best product match based on token intersection
                products.forEach(p => {
                    if (!p.nombre) return;

                    const cleanName = normalize(p.nombre);
                    const productTokens = cleanName.split(/\s+/).filter(t => t.length > 2); // Ignore short words like "de", "el"

                    if (productTokens.length === 0) return;

                    let matches = 0;
                    productTokens.forEach(token => {
                        if (cleanLine.includes(token)) {
                            matches++;
                        }
                    });

                    // Score is percentage of product tokens found in the line
                    const score = matches / productTokens.length;

                    // Bonus for exact sequence or high similarity
                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = p;
                    }
                });

                // Threshold: at least 50% of the significant words must match
                // AND product not already added in this batch
                if (bestMatch && highestScore >= 0.5 && !addedProductIds.has(bestMatch.id_producto)) {
                    console.log(`Match found: ${bestMatch.nombre} (Score: ${highestScore}) for line: ${line}`);
                    newRows.push({
                        id: Date.now() + Math.random(),
                        productId: bestMatch.id_producto,
                        profitPercent: 30,
                        quantity: qty,
                        currency: 'USD',
                        costBultoBs: '',
                        costBultoUsd: '', // User needs to fill this
                        pvp: ''
                    });
                    addedProductIds.add(bestMatch.id_producto);
                }
            });

            if (newRows.length > 0) {
                setRows(prevRows => {
                    // Keep existing manual rows if they have data, otherwise replace empty initial row
                    const validPrev = prevRows.filter(r => r.productId !== '');
                    return [...validPrev, ...newRows];
                });
                setSuccess(`Se identificaron ${newRows.length} productos.`);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError('No se encontraron coincidencias suficientes. Intente tomar una foto más clara o verifique los nombres.');
                setTimeout(() => setError(''), 5000);
            }

        } catch (err) {
            console.error(err);
            setError('Error al procesar la imagen.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setIsProcessingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGenerateReport = () => {
        const doc = new jsPDF('l'); // Landscape due to width
        const secondaryColor = [15, 23, 42]; // Slate 900
        const primaryColor = [15, 23, 42];   // Changed from emerald to slate

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 297, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ROPA MANIA SYSTEM', 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE DE COMPRAS (HOJA DE CÁLCULO)', 20, 30);

        // Metadata
        const dateStr = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        doc.setFontSize(10);
        doc.text(`Fecha: ${dateStr} ${time}`, 220, 20);
        doc.text(`Generado por: ${user ? user.nombre + ' ' + user.apellido : 'Usuario'}`, 220, 28);
        doc.text(`Tasa: Bs. ${roundedRate.toFixed(2)}`, 220, 36);

        // Table
        const validRows = rows.filter(r => r.productId && r.productId !== '');

        const tableBody = validRows.map((row, index) => {
            const productName = products.find(p => p.id_producto == row.productId)?.nombre || 'Desconocido';
            const costBulto = parseFloat(row.costBultoUsd || 0);
            const quantity = parseFloat(row.quantity) || 1;
            const costUnit = costBulto / quantity;
            const profit = parseFloat(row.profitPercent || 0);
            const priceUnit = costUnit * (1 + profit / 100);

            return [
                index + 1,
                productName,
                `${profit}%`,
                quantity,
                row.currency,
                `$ ${costBulto.toFixed(2)}`,
                `Bs. ${(parseFloat(row.costBultoBs || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
                `$ ${costUnit.toFixed(2)}`,
                `$ ${priceUnit.toFixed(2)}`,
                `$ ${parseFloat(row.pvp || 0).toFixed(2)}`
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['#', 'Producto', '% Gan', 'Cant', 'Moneda', 'Costo Bulto $', 'Costo Bulto Bs', 'Costo Unid $', 'Precio Unid $', 'PVP']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' },
                8: { halign: 'right' },
                9: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL COMPRA $: $ ${totalCompasUsd.toFixed(2)}`, 20, finalY);
        doc.text(`TOTAL COMPRA BS: Bs ${(totalCompasUsd * roundedRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 20, finalY + 8);

        doc.save(`Compras_${date.replace(/-/g, '')}.pdf`);
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
                                value={parseFloat(rate || 0).toFixed(2)}
                                onChange={e => setRate(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right w-32 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                                step="0.01"
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
                            Bs {(totalCompasUsd * roundedRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
                    {user && user.rol === 'Administrador' && (
                        <button onClick={handleGenerateReport} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-400/50 flex items-center gap-2">
                            <FaFilePdf /> Reporte
                        </button>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={isProcessingImage}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                        {isProcessingImage ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                        {isProcessingImage ? 'Procesando...' : 'Cargar Factura'}
                    </button>
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
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col min-h-[500px] max-h-[85vh]"
                        >
                            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="font-bold text-lg">Métodos de Pago</h3>
                                    <p className="text-white text-lg font-black">Total a Pagar: $ {totalCompasUsd.toFixed(2)} <span className="text-base font-bold opacity-90">(Bs {(totalCompasUsd * roundedRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })})</span></p>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-200 hover:text-white"><FaTimes /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                {payments.map((p, idx) => {
                                    const selectedMethod = paymentMethods.find(m => m.id_metodo_pago == p.methodId);
                                    const isUsd = selectedMethod && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => selectedMethod.nb_metodo_pago.toUpperCase().includes(k));

                                    return (
                                        <div key={idx} className="flex gap-3 items-start">
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
                                                {/* Equivalent Display */}
                                                <div className="text-right mt-1">
                                                    <span className="text-xs font-bold text-slate-400">
                                                        {isUsd
                                                            ? `Bs ${(parseFloat(p.amount || 0) * roundedRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                                            : `$ ${(parseFloat(p.amount || 0) / roundedRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-transparent uppercase mb-1">.</label>
                                                <button
                                                    onClick={() => removePaymentRow(idx)}
                                                    disabled={payments.length === 1}
                                                    className={`p-2.5 rounded-lg transition-colors ${payments.length === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:bg-red-50 hover:text-red-500'}`}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
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
                                            const bsVal = val ? (parseFloat(val) * roundedRate).toFixed(2) : '';
                                            setBuyCurrencyData({ ...buyCurrencyData, amountUSD: val, amountBs: bsVal });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-2xl text-center text-cyan-600"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta de Destino ($ USD)</label>
                                    <select
                                        value={buyCurrencyData.destMethodId}
                                        onChange={e => setBuyCurrencyData({ ...buyCurrencyData, destMethodId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold mb-3 border-l-4 border-l-cyan-500"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {paymentMethods
                                            .filter(m => {
                                                const name = m.nb_metodo_pago.toUpperCase();
                                                return name.includes('DIVISA') || name.includes('ZELLE') || name.includes('USD') || name.includes('EFECTIVO ($)');
                                            })
                                            .map(m => (
                                                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                            ))
                                        }
                                    </select>
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
                                        <span className="font-mono font-bold">Bs. {roundedRate.toFixed(2)}</span>
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
                                    disabled={!buyCurrencyData.amountUSD || !buyCurrencyData.methodId || !buyCurrencyData.destMethodId || !buyCurrencyData.amountBs}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Compra
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default PurchasesPage;

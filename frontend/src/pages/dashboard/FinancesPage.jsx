import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartLine, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaFileInvoiceDollar, FaWallet, FaReceipt, FaShoppingCart, FaPlus, FaTimes, FaDollarSign, FaMobileAlt, FaCreditCard, FaFingerprint, FaExchangeAlt, FaMoneyBill } from 'react-icons/fa';
import { useRate } from '../../context/RateContext';
import { useStore } from '../../context/StoreContext';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';

const FinancesPage = () => {
    const { rate } = useRate();
    const roundedRate = parseFloat(parseFloat(rate || 0).toFixed(2));
    const { user, logout } = useAuth();
    const { effectiveTiendaId, selectedTienda, isGlobal } = useStore();
    const [stats, setStats] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
        incomeBs: 0,
        incomeUSD: 0,
        totalZelleUSD: 0,
        totalEfectivoBs: 0,
        totalPunto: 0,
        totalPagoMovil: 0,
        totalBiopago: 0,
        totalTransferencia: 0,
        pendingInvoiceCount: 0,
        pendingInvoiceTotal: 0
    });
    const [recentTxFilter, setRecentTxFilter] = useState('Todos');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [fixedPaymentTypes, setFixedPaymentTypes] = useState([]);
    const [isVariableExpenseModalOpen, setIsVariableExpenseModalOpen] = useState(false);
    const [variableExpenseTypes, setVariableExpenseTypes] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const getLocalISODate = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    // Helper function for local date string
    const [formData, setFormData] = useState({
        id_tipo_pago_fijo: '',
        id_metodo_pago: '',
        monto: '',
        moneda: 'USD',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISODate()
    });
    const getLocalISOString = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    const [transferFormData, setTransferFormData] = useState({
        id_metodo_origen: '',
        id_metodo_destino: '',
        monto: '',
        tasa_dia: roundedRate ? roundedRate.toFixed(2) : '',
        fecha_traspaso: getLocalISODate()
    });

    const [variableExpenseForm, setVariableExpenseForm] = useState({
        id_tipo_gasto_variable: 'new',
        nb_gasto_variable: '',
        id_metodo_pago: '',
        monto: '',
        moneda: 'USD',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISOString()
    });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // All Transactions Modal State
    const [isAllTransactionsModalOpen, setIsAllTransactionsModalOpen] = useState(false);
    const [allTransactions, setAllTransactions] = useState([]);
    const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);

    const handleViewAllTransactions = async () => {
        setIsAllTransactionsModalOpen(true);
        setLoadingAllTransactions(true);
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `&tienda=${effectiveTiendaId}` : '';
            const res = await fetch(`${API_URL}/api/finances/transactions?limit=1000${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching all transactions:', error);
            toast.error('Error al cargar historial completo');
        } finally {
            setLoadingAllTransactions(false);
        }
    };

    const handleTransferClick = () => {
        setTransferFormData({
            id_metodo_origen: '',
            id_metodo_destino: '',
            monto: '',
            tasa_dia: roundedRate ? roundedRate.toFixed(2) : '',
            fecha_traspaso: getLocalISODate()
        });
        setIsTransferModalOpen(true);
    };

    useEffect(() => {
        fetchFinanceData();
        fetchFixedPaymentTypes();
        fetchVariableExpenseTypes();
        fetchPaymentMethods();
    }, [effectiveTiendaId]);

    const fetchVariableExpenseTypes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/variable-expense-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setVariableExpenseTypes(data);
            }
        } catch (error) {
            console.error("Error fetching variable expense types:", error);
        }
    };

    useEffect(() => {
        setFormData(prev => ({ ...prev, tasa_dia: rate ? parseFloat(rate).toFixed(2) : '' }));
        setTransferFormData(prev => ({ ...prev, tasa_dia: rate ? parseFloat(rate).toFixed(2) : '' }));
        setVariableExpenseForm(prev => ({ ...prev, tasa_dia: rate ? parseFloat(rate).toFixed(2) : '' }));
    }, [rate]);

    const fetchFinanceData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';

            const [summaryRes, transactionsRes] = await Promise.all([
                fetch(`${API_URL}/api/finances/summary${tiendaParam}`, { headers }),
                fetch(`${API_URL}/api/finances/transactions${tiendaParam}`, { headers })
            ]);

            if (summaryRes.status === 401 || summaryRes.status === 403 || transactionsRes.status === 401 || transactionsRes.status === 403) {
                logout();
                return;
            }

            if (summaryRes.ok && transactionsRes.ok) {
                const summaryData = await summaryRes.json();
                const transactionsData = await transactionsRes.json();

                setStats({
                    income: parseFloat(summaryData.stats.income),
                    expenses: parseFloat(summaryData.stats.expenses),
                    balance: parseFloat(summaryData.stats.balance),
                    incomeBs: parseFloat(summaryData.stats.incomeBs),
                    incomeUSD: parseFloat(summaryData.stats.incomeUSD),
                    totalZelleUSD: parseFloat(summaryData.stats.totalZelleUSD || 0),
                    totalEfectivoBs: parseFloat(summaryData.stats.totalEfectivoBs || 0),
                    totalPunto: parseFloat(summaryData.stats.totalPunto || 0),
                    totalPagoMovil: parseFloat(summaryData.stats.totalPagoMovil || 0),
                    totalBiopago: parseFloat(summaryData.stats.totalBiopago || 0),
                    totalTransferencia: parseFloat(summaryData.stats.totalTransferencia || 0),
                    pendingInvoiceCount: parseInt(summaryData.stats.pendingInvoiceCount || 0),
                    pendingInvoiceTotal: parseFloat(summaryData.stats.pendingInvoiceTotal || 0)
                });
                setTransactions(transactionsData);
            } else {
                console.error("Failed to fetch finance data");
            }
        } catch (error) {
            console.error("Error fetching finance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFixedPaymentTypes = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/finances/fixed-payment-types${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setFixedPaymentTypes(data);
            }
        } catch (error) {
            console.error("Error fetching types:", error);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/finances/payment-methods`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setPaymentMethods(data);
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
        }
    };

    const handleVariableExpenseInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'id_metodo_pago') {
            const selectedMethod = paymentMethods.find(m => m.id_metodo_pago === parseInt(value));
            let newCurrency = variableExpenseForm.moneda;
            if (selectedMethod) {
                const methodName = selectedMethod.nb_metodo_pago.toUpperCase();
                if (methodName.includes('DIVISA') || methodName.includes('USD') || methodName.includes('ZELLE')) {
                    newCurrency = 'USD';
                } else {
                    newCurrency = 'BS';
                }
            }
            setVariableExpenseForm(prev => ({ ...prev, [name]: value, moneda: newCurrency }));
        } else {
            setVariableExpenseForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleVariableExpenseSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const now = new Date();
            const [year, month, day] = variableExpenseForm.fecha.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

            let finalAmount = parseFloat(variableExpenseForm.monto);
            if (variableExpenseForm.moneda === 'BS') {
                const rate = parseFloat(variableExpenseForm.tasa_dia);
                if (rate > 0) {
                    finalAmount = finalAmount / rate;
                }
            }

            const pad = (n) => n.toString().padStart(2, '0');
            const localDateString = `${paymentDate.getFullYear()}-${pad(paymentDate.getMonth() + 1)}-${pad(paymentDate.getDate())} ${pad(paymentDate.getHours())}:${pad(paymentDate.getMinutes())}:${pad(paymentDate.getSeconds())}`;

            let finalTipoId = variableExpenseForm.id_tipo_gasto_variable;
            if (finalTipoId === 'new') {
                finalTipoId = null;
            }

            const payload = {
                ...variableExpenseForm,
                id_tipo_gasto_variable: finalTipoId,
                monto: finalAmount,
                fecha: localDateString,
                id_tienda: effectiveTiendaId || 1
            };
            delete payload.moneda; // Keep clean

            const res = await fetch(`${API_URL}/api/finances/variable-expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsVariableExpenseModalOpen(false);
                fetchFinanceData();
                fetchVariableExpenseTypes();
                setVariableExpenseForm(prev => ({
                    ...prev,
                    id_tipo_gasto_variable: 'new',
                    nb_gasto_variable: '',
                    monto: '',
                    fecha: getLocalISODate()
                }));
                toast.success('Gasto variable registrado exitosamente', {
                    style: { background: '#10B981', color: '#fff' },
                    iconTheme: { primary: '#fff', secondary: '#10B981' }
                });
            } else {
                const errorData = await res.json();
                toast.error(errorData.message || 'Error al registrar gasto variable');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar gasto variable');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'id_metodo_pago') {
            const selectedMethod = paymentMethods.find(m => m.id_metodo_pago === parseInt(value));
            let newCurrency = formData.moneda;
            if (selectedMethod) {
                const methodName = selectedMethod.nb_metodo_pago.toUpperCase();
                if (methodName.includes('DIVISA') || methodName.includes('USD') || methodName.includes('ZELLE')) {
                    newCurrency = 'USD';
                } else {
                    newCurrency = 'BS';
                }
            }
            setFormData(prev => ({ ...prev, [name]: value, moneda: newCurrency }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            // Combine selected date with current time
            const now = new Date();
            const [year, month, day] = formData.fecha.split('-').map(Number);
            // new Date takes month index 0-11
            const paymentDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

            // Calculate amount in USD if currency is BS
            let finalAmount = parseFloat(formData.monto);
            if (formData.moneda === 'BS') {
                const rate = parseFloat(formData.tasa_dia);
                if (rate > 0) {
                    finalAmount = finalAmount / rate;
                }
            }

            // Create local date string YYYY-MM-DD HH:mm:ss
            const pad = (n) => n.toString().padStart(2, '0');
            const localDateString = `${paymentDate.getFullYear()}-${pad(paymentDate.getMonth() + 1)}-${pad(paymentDate.getDate())} ${pad(paymentDate.getHours())}:${pad(paymentDate.getMinutes())}:${pad(paymentDate.getSeconds())}`;

            const payload = {
                ...formData,
                monto: finalAmount, // Send calculated USD amount
                fecha: localDateString,
                id_tienda: effectiveTiendaId || 1
            };
            // Remove moneda from payload to avoid backend confusion (although backend ignores it, it's cleaner)
            delete payload.moneda;

            const res = await fetch(`${API_URL}/api/finances/fixed-payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchFinanceData(); // Refresh data
                // Reset form slightly
                setFormData(prev => ({
                    ...prev,
                    monto: '',
                    fecha: getLocalISODate()
                }));
                toast.success('Pago registrado exitosamente', {
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#10B981',
                    },
                });
            } else {
                const errorData = await res.json();
                toast.error(errorData.message || 'Error al registrar pago fijo', {
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
            toast.error('Error al registrar', {
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
    };

    const handleTransferInputChange = (e) => {
        const { name, value } = e.target;
        setTransferFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        if (transferFormData.id_metodo_origen === transferFormData.id_metodo_destino) {
            toast.error('El origen y destino no pueden ser el mismo', {
                style: {
                    background: '#EF4444',
                    color: '#fff',
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                },
            });
            return;
        }
        try {
            const token = localStorage.getItem('token');

            // Construct full datetime
            const now = new Date();
            const [year, month, day] = transferFormData.fecha_traspaso.split('-').map(Number);
            const transferDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

            const pad = (n) => n.toString().padStart(2, '0');
            const localDateString = `${transferDate.getFullYear()}-${pad(transferDate.getMonth() + 1)}-${pad(transferDate.getDate())} ${pad(transferDate.getHours())}:${pad(transferDate.getMinutes())}:${pad(transferDate.getSeconds())}`;

            const payload = {
                ...transferFormData,
                fecha_traspaso: localDateString,
                id_tienda: effectiveTiendaId || 1
            };

            const res = await fetch(`${API_URL}/api/finances/transfers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsTransferModalOpen(false);
                fetchFinanceData();
                setTransferFormData(prev => ({
                    ...prev,
                    monto: '',
                    id_metodo_origen: '',
                    id_metodo_destino: '',
                    fecha_traspaso: getLocalISODate(),
                    tasa_dia: roundedRate ? roundedRate.toFixed(2) : ''
                }));
                toast.success('Traspaso realizado exitosamente', {
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    },
                    iconTheme: {
                        primary: '#fff',
                        secondary: '#10B981',
                    },
                });
            } else {
                const errorData = await res.json();
                toast.error(errorData.message || 'Error al realizar traspaso', {
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
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                },
            });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatBs = (amount) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount).replace('Bs.S', 'Bs.');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        doc.text('VENALTA SYSTEM', 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE FINANCIERO', 20, 30);

        // Metadata
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        doc.setFontSize(10);
        doc.text(`Fecha: ${date} ${time}`, 140, 20);
        doc.text(`Generado por: ${user ? user.nombre + ' ' + user.apellido : 'Usuario'}`, 140, 28);

        // Section: Resumen General
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen General', 20, 55);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(20, 58, 190, 58);

        const summaryData = [
            ['Concepto', 'Monto'],
            ['Ingresos Totales (Recaudado)', formatCurrency(stats.income)],
            ['Egresos Totales', formatCurrency(stats.expenses)],
            ['Balance Neto', formatCurrency(stats.balance)],
            ['Total General Bs', formatBs(stats.incomeBs)],
            ['DIVISAS USD', formatCurrency(stats.incomeUSD)],
            ['ZELLE USD', formatCurrency(stats.totalZelleUSD)]
        ];

        autoTable(doc, {
            startY: 65,
            head: [['Concepto', 'Valor']],
            body: summaryData.slice(1), // Exclude header row from body
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } }
        });

        // Section: Desglose por Método de Pago
        doc.text('Desglose por Método de Pago (Bs)', 20, doc.lastAutoTable.finalY + 15);
        doc.line(20, doc.lastAutoTable.finalY + 18, 190, doc.lastAutoTable.finalY + 18);

        const paymentData = [
            ['Efectivo (Bs)', formatBs(stats.totalEfectivoBs)],
            ['Punto de Venta', formatBs(stats.totalPunto)],
            ['Pago Móvil', formatBs(stats.totalPagoMovil)],
            ['Transferencia', formatBs(stats.totalTransferencia)]
        ];

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 25,
            head: [['Método', 'Monto (Bs)']],
            body: paymentData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }, // Blue header
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } }
        });

        // Section: Transacciones Recientes (Top 20)
        doc.addPage();
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(14);
        doc.text('Transacciones Recientes (Últimas 20)', 20, 20);
        doc.line(20, 23, 190, 23);

        const txData = transactions.slice(0, 20).map(tx => {
            const isUSDMethod = (tx.payment_method || '').toUpperCase().includes('DIVISA') ||
                (tx.payment_method || '').toUpperCase().includes('USD') ||
                (tx.payment_method || '').toUpperCase().includes('EFECTIVO ($)') ||
                (tx.payment_method || '').toUpperCase().includes('ZELLE') ||
                (tx.payment_method || '').toUpperCase().includes('BINANCE');

            let formattedAmount = '';
            const prefix = tx.category === 'Egreso' ? '-' : (tx.category === 'Ingreso' ? '+' : '');

            if ((tx.category === 'Traspaso' || tx.type === 'Préstamo' || tx.type === 'Pago Préstamo') && !isUSDMethod) {
                formattedAmount = `${prefix} ${formatBs(tx.amount)}`;
            } else {
                formattedAmount = `${prefix} ${formatCurrency(tx.amount)}`;
            }

            return [
                tx.date ? new Date(tx.date).toLocaleDateString() : '-',
                tx.type,
                tx.category,
                tx.user,
                formattedAmount
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [['Fecha', 'Tipo', 'Categoría', 'Usuario', 'Monto']],
            body: txData,
            theme: 'grid',
            headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        // Footer
        const footerY = doc.internal.pageSize.height - 10;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Reporte generado automáticamente por Ropa Mania System.', 105, footerY, { align: 'center' });

        doc.save(`Reporte_Financiero_${date.replace(/\//g, '-')}.pdf`);
        toast.success('Reporte financiero descargado', {
            style: {
                background: '#10B981',
                color: '#fff',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#10B981',
            },
        });
    };

    const StatCard = ({ title, value, icon: Icon, gradient, trend, isBs = false }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-6 rounded-3xl shadow-lg border-0 overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${gradient}`}
        >
            {/* Background Decoration */}
            <div className="absolute -right-6 -top-6 text-white opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-110 rotate-12">
                <Icon className="text-[10rem]" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/10">
                        <Icon className="text-2xl" />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/10">
                            {trend > 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-white/80 font-bold text-xs mb-1 uppercase tracking-wider">{title}</h3>
                    <div className="text-4xl font-black text-white tracking-tight">
                        {isBs ? formatBs(value) : formatCurrency(value)}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8 relative">
            <Toaster position="top-right" reverseOrder={false} />
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Finanzas</h2>
                    <p className="text-slate-500">Resumen financiero, ingresos y egresos.</p>
                </div>
                <div className="flex flex-wrap items-center lg:justify-end gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                    <button
                        onClick={handleGenerateReport}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 text-sm rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                        <FaFileInvoiceDollar />
                        Reporte
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales (Recaudado)"
                    value={stats.income}
                    icon={FaMoneyBillWave}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
                <StatCard
                    title="Egresos Totales (Compras + Gastos)"
                    value={stats.expenses}
                    icon={FaShoppingCart}
                    gradient="bg-gradient-to-br from-red-600 to-rose-700"
                />
                <StatCard
                    title="Balance Neto"
                    value={stats.balance}
                    icon={FaWallet}
                    gradient={stats.balance >= 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-orange-500 to-amber-600"}
                />

                <StatCard
                    title={`Facturas Pendientes (${stats.pendingInvoiceCount})`}
                    value={stats.pendingInvoiceTotal}
                    icon={FaFileInvoiceDollar}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                />

                {/* Payment Methods Breakdown */}
                <StatCard
                    title="Efectivo (Bs)"
                    value={stats.totalEfectivoBs}
                    icon={FaMoneyBill}
                    gradient="bg-gradient-to-br from-green-600 to-emerald-700"
                    isBs={true}
                />
                <StatCard
                    title="Punto de Venta"
                    value={stats.totalPunto}
                    icon={FaCreditCard}
                    gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                    isBs={true}
                />
                <StatCard
                    title="Pago Móvil"
                    value={stats.totalPagoMovil}
                    icon={FaMobileAlt}
                    gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
                    isBs={true}
                />
                <StatCard
                    title="Transferencia"
                    value={stats.totalTransferencia}
                    icon={FaExchangeAlt}
                    gradient="bg-gradient-to-br from-gray-500 to-slate-600"
                    isBs={true}
                />

                {/* Currency Totals - Moved to End */}
                <StatCard
                    title="ZELLE USD"
                    value={stats.totalZelleUSD}
                    icon={FaDollarSign}
                    gradient="bg-gradient-to-br from-purple-600 to-indigo-700"
                />
                <StatCard
                    title="DIVISAS USD"
                    value={stats.incomeUSD}
                    icon={FaDollarSign}
                    gradient="bg-gradient-to-br from-cyan-500 to-blue-500"
                />
                <StatCard
                    title="TOTAL GENERAL BS"
                    value={stats.incomeBs}
                    icon={FaMoneyBillWave}
                    gradient="bg-gradient-to-br from-purple-500 to-indigo-500"
                    isBs={true}
                />
            </div>

            {/* Transactions Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-slate-800 text-lg">Transacciones Recientes</h3>
                    <div className="flex items-center gap-3">
                        <select
                            value={recentTxFilter}
                            onChange={e => setRecentTxFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                        >
                            <option value="Todos">Todas</option>
                            <option value="Venta">Ventas</option>
                            <option value="Compra">Compras</option>
                            <option value="Gasto Fijo">Gastos Fijos</option>
                            <option value="Gasto Variable">Gastos Variables</option>
                            <option value="Préstamo">Préstamos</option>
                            <option value="Pago Préstamo">Pago Préstamos</option>
                            <option value="Traspaso">Traspasos</option>
                        </select>
                        <button onClick={handleViewAllTransactions} className="text-sm text-emerald-600 font-medium hover:text-emerald-700 whitespace-nowrap">Ver Todo</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">ID</th>
                                <th className="p-4">Método / Detalle</th>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Cargando datos...</td></tr>
                            ) : transactions.filter(tx => recentTxFilter === 'Todos' || tx.type.toLowerCase().includes(recentTxFilter.toLowerCase())).length > 0 ? (
                                transactions.filter(tx => recentTxFilter === 'Todos' || tx.type.toLowerCase().includes(recentTxFilter.toLowerCase())).map((tx, idx) => (
                                    <tr key={`${tx.type}-${tx.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${tx.category === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' :
                                                tx.category === 'Egreso' ? 'bg-red-100 text-red-700' :
                                                    'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {tx.category === 'Ingreso' ? <FaArrowUp size={10} /> :
                                                    tx.category === 'Egreso' ? <FaArrowDown size={10} /> :
                                                        <FaExchangeAlt size={10} />}
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-slate-600 text-xs">#{tx.id}</td>
                                        <td className="p-4 text-slate-700 font-medium text-xs break-words max-w-[200px]">
                                            {tx.type === 'Compra' && (tx.payment_method?.toUpperCase() === 'PAGADA' || tx.payment_method?.toUpperCase() === 'PENDIENTE') ? (
                                                <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${tx.payment_method?.toUpperCase() === 'PAGADA'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-orange-100 text-orange-600 border-orange-200'
                                                    }`}>
                                                    {tx.payment_method?.toUpperCase()}
                                                </span>
                                            ) : (
                                                tx.payment_method === 'BANCO (POS)' ? 'PUNTO DE VENTA' : (tx.payment_method || '-')
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-700 text-sm">{tx.user}</td>
                                        <td className="p-4 text-slate-500 text-xs">{formatDate(tx.date)}</td>
                                        <td className={`p-4 text-right font-bold font-mono ${tx.category === 'Ingreso' ? 'text-emerald-600' :
                                            tx.category === 'Egreso' ? 'text-slate-700' :
                                                'text-indigo-600'
                                            }`}>
                                            {(tx.category === 'Traspaso' || tx.type === 'Préstamo' || tx.type === 'Pago Préstamo') ? (
                                                (tx.payment_method.includes('DIVISA') || tx.payment_method.includes('USD') || tx.payment_method.includes('EFECTIVO ($)') || tx.payment_method.includes('ZELLE') || tx.payment_method.includes('BINANCE'))
                                                    ? (
                                                        <span>
                                                            {tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} {formatCurrency(tx.amount)}
                                                        </span>
                                                    )
                                                    : `${tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} Bs. ${parseFloat(tx.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                            ) : (
                                                <>
                                                    {tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} {formatCurrency(tx.amount)}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FaChartLine className="text-4xl text-slate-200" />
                                            <p>{recentTxFilter === 'Todos' ? 'No hay transacciones registradas.' : `No hay transacciones de tipo "${recentTxFilter}".`}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">Registrar Gasto Fijo</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pago</label>
                                    <select
                                        name="id_tipo_pago_fijo"
                                        value={formData.id_tipo_pago_fijo}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione un tipo</option>
                                        {fixedPaymentTypes.map(type => (
                                            <option key={type.id_tipo_pago_fijo} value={type.id_tipo_pago_fijo}>
                                                {type.nb_tipo_pago_fijo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                                    <select
                                        name="id_metodo_pago"
                                        value={formData.id_metodo_pago}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione método...</option>
                                        {paymentMethods
                                            .filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO'].includes(m.nb_metodo_pago.toUpperCase()))
                                            .map(method => (
                                                <option key={method.id_metodo_pago} value={method.id_metodo_pago}>
                                                    {method.nb_metodo_pago}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Monto {formData.moneda === 'BS' ? '(en Bolívares)' : '(en USD)'}
                                        </label>
                                        <input
                                            type="number"
                                            name="monto"
                                            value={formData.monto}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-bold"
                                            placeholder="0.00"
                                            required
                                        />
                                        {formData.moneda === 'BS' && formData.monto && formData.tasa_dia > 0 && (
                                            <p className="text-xs text-emerald-600 mt-1 font-bold">
                                                ≈ {formatCurrency(parseFloat(formData.monto) / parseFloat(formData.tasa_dia))} USD
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Moneda de Pago</label>
                                        <select
                                            name="moneda"
                                            value={formData.moneda}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-600"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="BS">Bolívares (Bs)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            name="fecha"
                                            value={formData.fecha}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tasa del Día</label>
                                        <input
                                            type="number"
                                            name="tasa_dia"
                                            value={formData.tasa_dia}
                                            onChange={handleInputChange} // Allow manual edit if needed
                                            step="0.01"
                                            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 focus:outline-none cursor-default font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95"
                                    >
                                        Guardar Pago
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                {isVariableExpenseModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">Registrar Gasto Variable</h3>
                                <button
                                    onClick={() => setIsVariableExpenseModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleVariableExpenseSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Gasto</label>
                                    <select
                                        name="id_tipo_gasto_variable"
                                        value={variableExpenseForm.id_tipo_gasto_variable}
                                        onChange={handleVariableExpenseInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        required
                                    >
                                        <option value="new">+ Nuevo Tipo de Gasto</option>
                                        {variableExpenseTypes.map(type => (
                                            <option key={type.id_tipo_gasto_variable} value={type.id_tipo_gasto_variable}>
                                                {type.nb_gasto_variable}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {variableExpenseForm.id_tipo_gasto_variable === 'new' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Nuevo Gasto</label>
                                        <input
                                            type="text"
                                            name="nb_gasto_variable"
                                            value={variableExpenseForm.nb_gasto_variable}
                                            onChange={handleVariableExpenseInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="Ej: Internet, Papelería..."
                                            required={variableExpenseForm.id_tipo_gasto_variable === 'new'}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                                    <select
                                        name="id_metodo_pago"
                                        value={variableExpenseForm.id_metodo_pago}
                                        onChange={handleVariableExpenseInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione método...</option>
                                        {paymentMethods
                                            .filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO'].includes(m.nb_metodo_pago.toUpperCase()))
                                            .map(method => (
                                                <option key={method.id_metodo_pago} value={method.id_metodo_pago}>
                                                    {method.nb_metodo_pago}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Monto {variableExpenseForm.moneda === 'BS' ? '(en Bolívares)' : '(en USD)'}
                                        </label>
                                        <input
                                            type="number"
                                            name="monto"
                                            value={variableExpenseForm.monto}
                                            onChange={handleVariableExpenseInputChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-bold"
                                            placeholder="0.00"
                                            required
                                        />
                                        {variableExpenseForm.moneda === 'BS' && variableExpenseForm.monto && variableExpenseForm.tasa_dia > 0 && (
                                            <p className="text-xs text-blue-600 mt-1 font-bold">
                                                ≈ {formatCurrency(parseFloat(variableExpenseForm.monto) / parseFloat(variableExpenseForm.tasa_dia))} USD
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                                        <select
                                            name="moneda"
                                            value={variableExpenseForm.moneda}
                                            onChange={handleVariableExpenseInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-600"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="BS">Bolívares (Bs)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            name="fecha"
                                            value={variableExpenseForm.fecha}
                                            onChange={handleVariableExpenseInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tasa del Día</label>
                                        <input
                                            type="number"
                                            name="tasa_dia"
                                            value={variableExpenseForm.tasa_dia}
                                            onChange={handleVariableExpenseInputChange}
                                            step="0.01"
                                            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 focus:outline-none cursor-default font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsVariableExpenseModalOpen(false)}
                                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95"
                                    >
                                        Guardar Gasto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                {isTransferModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">Registrar Traspaso</h3>
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Origen (Sale de)</label>
                                    <select
                                        name="id_metodo_origen"
                                        value={transferFormData.id_metodo_origen}
                                        onChange={handleTransferInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione cuenta...</option>
                                        {paymentMethods.filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'DIVISAS', 'ZELLE'].includes(m.nb_metodo_pago.toUpperCase())).map(method => (
                                            <option key={method.id_metodo_pago} value={method.id_metodo_pago}>
                                                {method.nb_metodo_pago}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-slate-100 p-2 rounded-full border border-slate-200 text-slate-400">
                                        <FaArrowDown size={14} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Destino (Entra a)</label>
                                    <select
                                        name="id_metodo_destino"
                                        value={transferFormData.id_metodo_destino}
                                        onChange={handleTransferInputChange}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione cuenta...</option>
                                        {paymentMethods.filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'DIVISAS', 'BIOPAGO', 'ZELLE'].includes(m.nb_metodo_pago.toUpperCase())).map(method => (
                                            <option key={method.id_metodo_pago} value={method.id_metodo_pago}>
                                                {method.nb_metodo_pago}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto (Bs)</label>
                                    <input
                                        type="number"
                                        name="monto"
                                        value={transferFormData.monto}
                                        onChange={handleTransferInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            name="fecha_traspaso"
                                            value={transferFormData.fecha_traspaso}
                                            onChange={handleTransferInputChange}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tasa (Ref)</label>
                                        <input
                                            type="number"
                                            name="tasa_dia"
                                            value={transferFormData.tasa_dia}
                                            readOnly
                                            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 focus:outline-none cursor-default font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsTransferModalOpen(false)}
                                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                                    >
                                        Confirmar Traspaso
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* All Transactions Modal */}
            <AnimatePresence>
                {isAllTransactionsModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-800">Historial de Transacciones</h3>
                                    <p className="text-sm text-slate-500">Mostrando las últimas 1000 operaciones</p>
                                </div>
                                <button onClick={() => setIsAllTransactionsModalOpen(false)} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition-colors text-slate-500 hover:text-red-500">
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-4 bg-slate-50">Tipo</th>
                                            <th className="p-4 bg-slate-50">ID</th>
                                            <th className="p-4 bg-slate-50">Método / Detalle</th>
                                            <th className="p-4 bg-slate-50">Usuario</th>
                                            <th className="p-4 bg-slate-50">Fecha</th>
                                            <th className="p-4 text-right bg-slate-50">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loadingAllTransactions ? (
                                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">Cargando datos...</td></tr>
                                        ) : allTransactions.length > 0 ? (
                                            allTransactions.map((tx, idx) => (
                                                <tr key={`${tx.type}-${tx.id}-${idx}-modal`} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${tx.category === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' :
                                                            tx.category === 'Egreso' ? 'bg-red-100 text-red-700' :
                                                                'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                            {tx.category === 'Ingreso' ? <FaArrowUp size={10} /> :
                                                                tx.category === 'Egreso' ? <FaArrowDown size={10} /> :
                                                                    <FaExchangeAlt size={10} />}
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-600 text-xs text-center">#{tx.id}</td>
                                                    <td className="p-4 text-slate-700 font-medium text-xs break-words max-w-[200px]">
                                                        {tx.type === 'Compra' && (tx.payment_method === 'PAGADA' || tx.payment_method === 'PENDIENTE') ? (
                                                            <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${tx.payment_method === 'PAGADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                                }`}>
                                                                {tx.payment_method}
                                                            </span>
                                                        ) : (
                                                            tx.payment_method === 'BANCO (POS)' ? 'PUNTO DE VENTA' : (tx.payment_method || '-')
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-slate-700 text-sm">{tx.user}</td>
                                                    <td className="p-4 text-slate-500 text-xs">{formatDate(tx.date)}</td>
                                                    <td className={`p-4 text-right font-bold font-mono ${tx.category === 'Ingreso' ? 'text-emerald-600' :
                                                        tx.category === 'Egreso' ? 'text-slate-700' :
                                                            'text-indigo-600'
                                                        }`}>
                                                        {(tx.category === 'Traspaso' || tx.type === 'Préstamo') ? (
                                                            (tx.payment_method && (tx.payment_method.includes('DIVISA') || tx.payment_method.includes('USD') || tx.payment_method.includes('EFECTIVO ($)') || tx.payment_method.includes('ZELLE') || tx.payment_method.includes('BINANCE')))
                                                                ? (
                                                                    <span>
                                                                        {tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} {formatCurrency(tx.amount)}
                                                                    </span>
                                                                )
                                                                : `${tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} Bs. ${parseFloat(tx.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                                        ) : (
                                                            <>
                                                                {tx.category === 'Egreso' ? '-' : tx.category === 'Ingreso' ? '+' : ''} {formatCurrency(tx.amount)}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-12 text-center text-slate-400">
                                                    No hay transacciones registradas.
                                                </td>
                                            </tr>
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

export default FinancesPage;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaReceipt, FaPlus, FaTimes, FaStore, FaCalendarAlt,
    FaDollarSign, FaMoneyBillWave, FaFilter, FaLayerGroup,
    FaTag, FaCreditCard, FaMobileAlt, FaExchangeAlt, FaMoneyBill, FaSpinner, FaHandHoldingUsd, FaFilePdf
} from 'react-icons/fa';
import { useRate } from '../../context/RateContext';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import API_URL from '../../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GastosPage = () => {
    const { rate } = useRate();
    const { effectiveTiendaId, isGlobal, tiendas, selectedTienda } = useStore();
    const { user } = useAuth();

    // ── State ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('fijos'); // 'variables' | 'fijos'
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [fixedPaymentTypes, setFixedPaymentTypes] = useState([]);
    const [variableExpenseTypes, setVariableExpenseTypes] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [loadingGastos, setLoadingGastos] = useState(true);
    const [filterTienda, setFilterTienda] = useState('all');
    const [filterTipo, setFilterTipo] = useState('all');

    const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
    const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const getLocalISOString = () => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const getLocalISODate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [fixedForm, setFixedForm] = useState({
        id_tipo_pago_fijo: '',
        descripcion: '',
        id_metodo_pago: '',
        monto: '',
        moneda: 'USD',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISODate(),
        id_tienda: ''
    });

    const [variableForm, setVariableForm] = useState({
        id_tipo_gasto_variable: 'new',
        nb_gasto_variable: '',
        descripcion: '',
        id_metodo_pago: '',
        monto: '',
        moneda: 'USD',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISODate(),
        id_tienda: ''
    });

    const [loanForm, setLoanForm] = useState({
        methodId: '',
        amount: '',
        motivo: '',
        date: getLocalISOString(),
        id_tienda: ''
    });

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchPaymentMethods();
    }, [effectiveTiendaId]);

    useEffect(() => {
        if (fixedForm.id_tienda) {
            fetchFixedPaymentTypes(fixedForm.id_tienda);
        }
    }, [fixedForm.id_tienda]);

    useEffect(() => {
        if (variableForm.id_tienda) {
            fetchVariableExpenseTypes(variableForm.id_tienda);
        }
    }, [variableForm.id_tienda]);

    useEffect(() => {
        fetchGastos();
    }, [effectiveTiendaId, activeTab]);

    useEffect(() => {
        const r = rate ? parseFloat(rate).toFixed(2) : '';
        setFixedForm(prev => ({ ...prev, tasa_dia: r }));
        setVariableForm(prev => ({ ...prev, tasa_dia: r }));
    }, [rate]);

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const token = () => localStorage.getItem('token');

    const fetchPaymentMethods = async () => {
        try {
            const res = await fetch(`${API_URL}/api/finances/payment-methods`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) setPaymentMethods(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchFixedPaymentTypes = async (tiendaIdToFetch) => {
        try {
            const tId = tiendaIdToFetch || effectiveTiendaId;
            const tiendaParam = tId ? `?tienda=${tId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/finances/fixed-payment-types${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) setFixedPaymentTypes(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchVariableExpenseTypes = async (tiendaIdToFetch) => {
        try {
            const tId = tiendaIdToFetch || effectiveTiendaId;
            const tiendaParam = tId ? `?tienda=${tId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/finances/variable-expense-types${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) setVariableExpenseTypes(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchGastos = async () => {
        setLoadingGastos(true);
        try {
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const res = await fetch(`${API_URL}/api/finances/transactions${tiendaParam}&limit=500`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                const all = await res.json();
                // Filtramos solo gastos fijos y variables
                const filtered = all.filter(tx =>
                    activeTab === 'fijos'
                        ? tx.source_module === 'pago_fijo'
                        : tx.source_module === 'gasto_variable'
                );
                setGastos(filtered);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingGastos(false); }
    };

    // ── Handlers Fixed ─────────────────────────────────────────────────────────
    const handleFixedInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'id_metodo_pago') {
            const m = paymentMethods.find(pm => pm.id_metodo_pago === parseInt(value));
            const moneda = m && ['DIVISA', 'USD', 'ZELLE', 'BINANCE', 'PAYPAL']
                .some(k => m.nb_metodo_pago.toUpperCase().includes(k)) ? 'USD' : 'BS';
            setFixedForm(prev => ({ ...prev, [name]: value, moneda }));
        } else {
            setFixedForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFixedSubmit = async (e) => {
        e.preventDefault();
        const tiendaId = fixedForm.id_tienda || effectiveTiendaId || 1;
        if (!tiendaId || tiendaId === 'all') {
            toast.error('Seleccione una tienda para registrar el gasto.');
            return;
        }
        setSubmitting(true);
        try {
            const now = new Date();
            const [y, m, d] = fixedForm.fecha.split('-').map(Number);
            const dt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
            const pad = n => n.toString().padStart(2, '0');
            const fechaStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

            let monto = parseFloat(fixedForm.monto);
            if (fixedForm.moneda === 'BS') {
                const r = parseFloat(fixedForm.tasa_dia);
                if (r > 0) monto = monto / r;
            }

            const payload = {
                id_tipo_pago_fijo: fixedForm.id_tipo_pago_fijo,
                id_metodo_pago: fixedForm.id_metodo_pago,
                monto,
                tasa_dia: fixedForm.tasa_dia,
                fecha: fechaStr,
                id_tienda: tiendaId,
                descripcion: fixedForm.descripcion || null
            };

            const res = await fetch(`${API_URL}/api/finances/fixed-payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Gasto fijo registrado exitosamente', { style: { background: '#10B981', color: '#fff' } });
                setIsFixedModalOpen(false);
                resetFixedForm();
                fetchGastos();
                fetchFixedPaymentTypes(fixedForm.id_tienda);
            } else {
                const err = await res.json();
                toast.error(err.message || 'Error al registrar gasto fijo', { style: { background: '#EF4444', color: '#fff' } });
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const resetFixedForm = () => setFixedForm({
        id_tipo_pago_fijo: '', descripcion: '', id_metodo_pago: '',
        monto: '', moneda: 'USD', tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISODate(), id_tienda: effectiveTiendaId || ''
    });

    // ── Handlers Variable ──────────────────────────────────────────────────────
    const handleVariableInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'id_metodo_pago') {
            const m = paymentMethods.find(pm => pm.id_metodo_pago === parseInt(value));
            const moneda = m && ['DIVISA', 'USD', 'ZELLE', 'BINANCE', 'PAYPAL']
                .some(k => m.nb_metodo_pago.toUpperCase().includes(k)) ? 'USD' : 'BS';
            setVariableForm(prev => ({ ...prev, [name]: value, moneda }));
        } else {
            setVariableForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleVariableSubmit = async (e) => {
        e.preventDefault();
        const tiendaId = variableForm.id_tienda || effectiveTiendaId || 1;
        if (!tiendaId || tiendaId === 'all') {
            toast.error('Seleccione una tienda para registrar el gasto.');
            return;
        }
        setSubmitting(true);
        try {
            const now = new Date();
            const [y, m, d] = variableForm.fecha.split('-').map(Number);
            const dt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
            const pad = n => n.toString().padStart(2, '0');
            const fechaStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

            let monto = parseFloat(variableForm.monto);
            if (variableForm.moneda === 'BS') {
                const r = parseFloat(variableForm.tasa_dia);
                if (r > 0) monto = monto / r;
            }

            const payload = {
                id_tipo_gasto_variable: variableForm.id_tipo_gasto_variable === 'new' ? null : variableForm.id_tipo_gasto_variable,
                nb_gasto_variable: variableForm.nb_gasto_variable,
                id_metodo_pago: variableForm.id_metodo_pago,
                monto_usd: monto,
                tasa_dia: variableForm.tasa_dia,
                fecha: fechaStr,
                id_tienda: tiendaId,
                descripcion: variableForm.descripcion || null
            };

            const res = await fetch(`${API_URL}/api/finances/variable-expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Gasto variable registrado exitosamente', { style: { background: '#10B981', color: '#fff' } });
                setIsVariableModalOpen(false);
                resetVariableForm();
                fetchGastos();
                fetchVariableExpenseTypes(variableForm.id_tienda);
            } else {
                const err = await res.json();
                toast.error(err.message || 'Error al registrar gasto variable', { style: { background: '#EF4444', color: '#fff' } });
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const resetVariableForm = () => setVariableForm({
        id_tipo_gasto_variable: 'new', nb_gasto_variable: '', descripcion: '',
        id_metodo_pago: '', monto: '', moneda: 'USD',
        tasa_dia: rate ? parseFloat(rate).toFixed(2) : '',
        fecha: getLocalISODate(), id_tienda: effectiveTiendaId || ''
    });

    const handleLoanClick = () => {
        setLoanForm({
            methodId: '',
            amount: '',
            motivo: '',
            date: getLocalISOString(),
            id_tienda: effectiveTiendaId || (tiendasList.length === 1 ? tiendasList[0].id_tienda : '')
        });
        setIsLoanModalOpen(true);
    };

    const handleLoanSubmit = async (e) => {
        e.preventDefault();
        const tiendaId = loanForm.id_tienda || effectiveTiendaId || 1;
        if (!tiendaId || tiendaId === 'all') {
            toast.error('Seleccione una tienda para registrar el préstamo.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/finances/loans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token()}`
                },
                body: JSON.stringify({
                    ...loanForm,
                    rate: parseFloat(rate).toFixed(2),
                    date: loanForm.date,
                    id_tienda: tiendaId
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Préstamo registrado exitosamente', { style: { background: '#10B981', color: '#fff' } });
                setIsLoanModalOpen(false);
                fetchGastos(); // Update list if applicable
            } else {
                toast.error(data.message || 'Error al registrar préstamo', { style: { background: '#EF4444', color: '#fff' } });
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Formatters ─────────────────────────────────────────────────────────────
    const fmt$ = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    const fmtBs = v => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(v).replace('Bs.S', 'Bs.');
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    // Filtrado de gastos display
    const displayGastos = gastos.filter(g => {
        if (filterTienda !== 'all') {
            // no tenemos tienda en la transacción directamente, omitir filtro por ahora
        }
        if (filterTipo !== 'all' && !g.type.toLowerCase().includes(filterTipo.toLowerCase())) return false;
        return true;
    });

    // Tiendas para selector
    const tiendasList = tiendas || [];

    const handleGenerateReport = () => {
        if (!displayGastos || displayGastos.length === 0) {
            toast.error('No hay gastos para generar el reporte');
            return;
        }

        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('es-VE');
        const time = new Date().toLocaleTimeString('es-VE');
        const tiendaName = selectedTienda ? selectedTienda.nb_tienda.toUpperCase() : 'ROPA MANIA - TODAS LAS TIENDAS';
        const isFijos = activeTab === 'fijos';

        // Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 42, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`REPORTE DE GASTOS ${isFijos ? 'FIJOS' : 'VARIABLES'}`, 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tienda: ${tiendaName}`, 15, 28);
        doc.text(`Generado: ${date} ${time} por ${user?.nombre || 'Admin'}`, 15, 34);

        // Calculate Totals
        const totalUSD = displayGastos.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
        const r = parseFloat(rate) || 1;
        const totalBS = totalUSD * r;

        // Resumen
        doc.setFillColor(isFijos ? 16 : 59, isFijos ? 185 : 130, isFijos ? 129 : 246);
        doc.roundedRect(15, 48, 180, 25, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL RECAUDADO', 25, 58);
        doc.setFontSize(16);
        doc.text(`$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, 67);
        doc.setFontSize(11);
        doc.text(`Bs ${(Math.round(totalBS * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 100, 67);

        // Table
        autoTable(doc, {
            startY: 85,
            head: [['Tipo / Descripción', 'Método', 'Usuario', 'Fecha', 'Monto (USD)']],
            body: displayGastos.map(g => [
                `${g.type} ${g.descripcion ? '- ' + g.descripcion : ''}`,
                g.payment_method || '-',
                g.user,
                new Date(g.date).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }),
                `$ ${parseFloat(g.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        const pageH = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Reporte generado automáticamente por el sistema.', 105, pageH - 8, { align: 'center' });

        doc.save(`Reporte_Gastos_${isFijos ? 'Fijos' : 'Variables'}_${date.replace(/\//g, '-')}.pdf`);
        toast.success('Reporte PDF descargado exitosamente', { style: { background: '#10B981', color: '#FFFFFF' } });
    };

    // Método icono
    const methodIcon = (method = '') => {
        const m = method.toUpperCase();
        if (m.includes('ZELLE') || m.includes('DIVISA') || m.includes('USD')) return <FaDollarSign className="text-purple-500" />;
        if (m.includes('PUNTO') || m.includes('POS')) return <FaCreditCard className="text-blue-500" />;
        if (m.includes('MOVIL') || m.includes('MÓVIL')) return <FaMobileAlt className="text-indigo-500" />;
        if (m.includes('TRANSFERENCIA')) return <FaExchangeAlt className="text-cyan-500" />;
        return <FaMoneyBill className="text-green-500" />;
    };

    const openFixedModal = () => {
        setFixedForm(prev => ({
            ...prev,
            id_tienda: effectiveTiendaId || (tiendasList.length === 1 ? tiendasList[0].id_tienda : ''),
            tasa_dia: rate ? parseFloat(rate).toFixed(2) : ''
        }));
        setIsFixedModalOpen(true);
    };

    const openVariableModal = () => {
        setVariableForm(prev => ({
            ...prev,
            id_tienda: effectiveTiendaId || (tiendasList.length === 1 ? tiendasList[0].id_tienda : ''),
            tasa_dia: rate ? parseFloat(rate).toFixed(2) : ''
        }));
        setIsVariableModalOpen(true);
    };

    return (
        <div className="space-y-6 relative">
            <Toaster position="top-right" />

            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Gastos</h2>
                    <p className="text-slate-500 text-sm">Registro de gastos fijos, variables y préstamos.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleGenerateReport}
                        disabled={loadingGastos || displayGastos.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf /> Reporte
                    </button>
                    <button
                        onClick={handleLoanClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <FaHandHoldingUsd /> Préstamo
                    </button>
                    <button
                        onClick={openFixedModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <FaPlus /> Gasto Fijo
                    </button>
                    <button
                        onClick={openVariableModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <FaPlus /> Gasto Variable
                    </button>
                </div>
            </header>

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { key: 'fijos', label: 'Gastos Fijos', icon: FaTag },
                    { key: 'variables', label: 'Gastos Variables', icon: FaLayerGroup }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === tab.key
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tabla de gastos ─────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        <FaReceipt className="text-orange-500" />
                        {activeTab === 'variables' ? 'Gastos Variables Registrados' : 'Gastos Fijos Registrados'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                        <FaFilter className="text-slate-400" />
                        <span className="text-slate-400 text-xs font-medium">
                            {displayGastos.length} registro{displayGastos.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Tipo / Descripción</th>
                                <th className="p-4">Método de Pago</th>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loadingGastos ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FaSpinner className="animate-spin text-2xl text-orange-400" />
                                            <span>Cargando gastos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayGastos.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <FaReceipt className="text-5xl text-slate-200" />
                                            <p className="font-medium">No hay gastos {activeTab === 'variables' ? 'variables' : 'fijos'} registrados.</p>
                                            <p className="text-xs">Usa el botón de arriba para registrar uno.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayGastos.map((g, idx) => (
                                    <tr key={`${g.type}-${g.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                    <FaReceipt size={9} />
                                                    {g.type}
                                                </span>
                                            </div>
                                            {g.descripcion && (
                                                <div className="text-xs text-slate-500 mt-1.5 max-w-[200px] truncate" title={g.descripcion}>
                                                    {g.descripcion}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                {methodIcon(g.payment_method)}
                                                <span className="font-medium">{g.payment_method || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-medium">{g.user}</td>
                                        <td className="p-4 text-slate-500 text-xs">{fmtDate(g.date)}</td>
                                        <td className="p-4 text-right font-bold font-mono text-slate-800">
                                            {fmt$(g.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totales */}
                {!loadingGastos && displayGastos.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total {activeTab === 'variables' ? 'Variables' : 'Fijos'}</span>
                        <span className="text-xl font-black text-slate-800 font-mono">
                            {fmt$(displayGastos.reduce((s, g) => s + parseFloat(g.amount || 0), 0))}
                        </span>
                    </div>
                )}
            </motion.div>

            {/* ══════════════════════════════════════════════════════════
                MODAL: Gasto Fijo
            ══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isFixedModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-10">
                                    <FaTag size={80} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-black text-xl">Registrar Gasto Fijo</h3>
                                    <p className="text-emerald-100 text-sm mt-0.5">Gasto recurrente o programado.</p>
                                </div>
                                <button onClick={() => setIsFixedModalOpen(false)} className="relative z-10 p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleFixedSubmit} className="p-6 space-y-4">
                                {/* Tienda */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <FaStore className="inline mr-1" /> Tienda
                                    </label>
                                    <select
                                        value={fixedForm.id_tienda}
                                        onChange={e => setFixedForm(prev => ({ ...prev, id_tienda: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm font-medium"
                                        required
                                    >
                                        <option value="">Seleccione tienda...</option>
                                        {tiendasList.map(t => (
                                            <option key={t.id_tienda} value={t.id_tienda}>{t.nb_tienda}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tipo de Pago */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Gasto</label>
                                    <select
                                        name="id_tipo_pago_fijo"
                                        value={fixedForm.id_tipo_pago_fijo}
                                        onChange={handleFixedInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="">Seleccione tipo...</option>
                                        {fixedPaymentTypes.map(t => (
                                            <option key={t.id_tipo_pago_fijo} value={t.id_tipo_pago_fijo}>{t.nb_tipo_pago_fijo}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción (Opcional)</label>
                                    <input
                                        type="text" name="descripcion" value={fixedForm.descripcion}
                                        onChange={handleFixedInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm"
                                        placeholder="Detalle adicional del gasto fijo..."
                                        maxLength="200"
                                    />
                                </div>

                                {/* Método de Pago */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Método de Pago</label>
                                    <select
                                        name="id_metodo_pago"
                                        value={fixedForm.id_metodo_pago}
                                        onChange={handleFixedInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="">Seleccione método...</option>
                                        {paymentMethods
                                            .filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO', 'BANCO (POS)'].includes(m.nb_metodo_pago.toUpperCase()))
                                            .map(m => (
                                                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Monto + Moneda */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Monto {fixedForm.moneda === 'BS' ? '(Bs)' : '($)'}
                                        </label>
                                        <input
                                            type="number" name="monto" value={fixedForm.monto}
                                            onChange={handleFixedInputChange}
                                            step="0.01" min="0"
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all font-mono font-bold text-sm"
                                            placeholder="0.00" required
                                        />
                                        {fixedForm.moneda === 'BS' && fixedForm.monto && parseFloat(fixedForm.tasa_dia) > 0 && (
                                            <p className="text-xs text-emerald-600 mt-1 font-bold">
                                                ≈ {fmt$(parseFloat(fixedForm.monto) / parseFloat(fixedForm.tasa_dia))}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label>
                                        <select
                                            name="moneda" value={fixedForm.moneda}
                                            onChange={handleFixedInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm font-bold text-slate-600"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="BS">Bolívares (Bs)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Fecha + Tasa */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            <FaCalendarAlt className="inline mr-1" /> Fecha
                                        </label>
                                        <input
                                            type="date" name="fecha" value={fixedForm.fecha}
                                            onChange={handleFixedInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tasa del Día</label>
                                        <div className="bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-xl px-4 py-2.5 font-bold text-right cursor-not-allowed">
                                            Bs {parseFloat(rate || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsFixedModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                        Guardar Gasto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════
                MODAL: Gasto Variable
            ══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isVariableModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-10">
                                    <FaLayerGroup size={80} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-black text-xl">Registrar Gasto Variable</h3>
                                    <p className="text-blue-100 text-sm mt-0.5">Gastos operativos no recurrentes.</p>
                                </div>
                                <button onClick={() => setIsVariableModalOpen(false)} className="relative z-10 p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleVariableSubmit} className="p-6 space-y-4">
                                {/* Tienda */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <FaStore className="inline mr-1" /> Tienda
                                    </label>
                                    <select
                                        value={variableForm.id_tienda}
                                        onChange={e => setVariableForm(prev => ({ ...prev, id_tienda: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm font-medium"
                                        required
                                    >
                                        <option value="">Seleccione tienda...</option>
                                        {tiendasList.map(t => (
                                            <option key={t.id_tienda} value={t.id_tienda}>{t.nb_tienda}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tipo de Gasto */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Gasto</label>
                                    <select
                                        name="id_tipo_gasto_variable"
                                        value={variableForm.id_tipo_gasto_variable}
                                        onChange={handleVariableInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="new">+ Nuevo Tipo de Gasto</option>
                                        {variableExpenseTypes.map(t => (
                                            <option key={t.id_tipo_gasto_variable} value={t.id_tipo_gasto_variable}>{t.nb_gasto_variable}</option>
                                        ))}
                                    </select>
                                </div>

                                {variableForm.id_tipo_gasto_variable === 'new' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Gasto</label>
                                        <input
                                            type="text" name="nb_gasto_variable" value={variableForm.nb_gasto_variable}
                                            onChange={handleVariableInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm"
                                            placeholder="Ej: Internet, Papelería..."
                                            required={variableForm.id_tipo_gasto_variable === 'new'}
                                        />
                                    </div>
                                )}

                                {/* Descripción */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción (Opcional)</label>
                                    <input
                                        type="text" name="descripcion" value={variableForm.descripcion}
                                        onChange={handleVariableInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm"
                                        placeholder="Detalle adicional del gasto..."
                                        maxLength="200"
                                    />
                                </div>

                                {/* Método de Pago */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Método de Pago</label>
                                    <select
                                        name="id_metodo_pago"
                                        value={variableForm.id_metodo_pago}
                                        onChange={handleVariableInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="">Seleccione método...</option>
                                        {paymentMethods
                                            .filter(m => !['PENDIENTE POR COBRAR', 'MIXTO', 'BIOPAGO', 'BANCO (POS)'].includes(m.nb_metodo_pago.toUpperCase()))
                                            .map(m => (
                                                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nb_metodo_pago}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Monto + Moneda */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Monto {variableForm.moneda === 'BS' ? '(Bs)' : '($)'}
                                        </label>
                                        <input
                                            type="number" name="monto" value={variableForm.monto}
                                            onChange={handleVariableInputChange}
                                            step="0.01" min="0"
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all font-mono font-bold text-sm"
                                            placeholder="0.00" required
                                        />
                                        {variableForm.moneda === 'BS' && variableForm.monto && parseFloat(variableForm.tasa_dia) > 0 && (
                                            <p className="text-xs text-blue-600 mt-1 font-bold">
                                                ≈ {fmt$(parseFloat(variableForm.monto) / parseFloat(variableForm.tasa_dia))}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label>
                                        <select
                                            name="moneda" value={variableForm.moneda}
                                            onChange={handleVariableInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm font-bold text-slate-600"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="BS">Bolívares (Bs)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Fecha + Tasa */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            <FaCalendarAlt className="inline mr-1" /> Fecha
                                        </label>
                                        <input
                                            type="date" name="fecha" value={variableForm.fecha}
                                            onChange={handleVariableInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tasa del Día</label>
                                        <div className="bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-xl px-4 py-2.5 font-bold text-right cursor-not-allowed">
                                            Bs {parseFloat(rate || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsVariableModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                        Guardar Gasto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════
                MODAL: Préstamo
            ══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isLoanModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-amber-500 text-white p-6 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <FaHandHoldingUsd size={80} />
                                </div>
                                <div className="relative z-10 w-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-2xl tracking-tight">Registrar Préstamo</h3>
                                        <button onClick={() => setIsLoanModalOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg hover:bg-white/20">
                                            <FaTimes size={18} />
                                        </button>
                                    </div>
                                    <p className="text-amber-100/90 text-sm font-medium">Ingreso de dinero en calidad de préstamo.</p>
                                </div>
                            </div>

                            <form onSubmit={handleLoanSubmit} className="p-6 space-y-6">
                                <div className="space-y-4">
                                    {isGlobal && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tienda Destino</label>
                                            <select
                                                value={loanForm.id_tienda}
                                                onChange={e => setLoanForm({ ...loanForm, id_tienda: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3 font-bold transition-all outline-none"
                                                required
                                            >
                                                <option value="">Seleccione tienda...</option>
                                                {tiendasList.map(t => (
                                                    <option key={t.id_tienda} value={t.id_tienda}>{t.nb_tienda}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cuenta Destino</label>
                                        <select
                                            value={loanForm.methodId}
                                            onChange={e => setLoanForm({ ...loanForm, methodId: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3 font-bold transition-all outline-none"
                                            required
                                        >
                                            <option value="">Seleccione cuenta...</option>
                                            {paymentMethods.filter(m =>
                                                ['DIVISA', 'USD', 'ZELLE', 'BINANCE', 'PAYPAL', 'MOVIL', 'MÓVIL', 'TRANSFERENCIA', 'EFECTIVO', 'PUNTO'].some(k => m.nb_metodo_pago.toUpperCase().includes(k)) &&
                                                !m.nb_metodo_pago.toUpperCase().includes('PENDIENTE')
                                            ).map((method) => (
                                                <option key={method.id_metodo_pago} value={method.id_metodo_pago}>
                                                    {method.nb_metodo_pago}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo / Descripción (Opcional)</label>
                                        <input
                                            type="text"
                                            value={loanForm.motivo}
                                            onChange={e => setLoanForm({ ...loanForm, motivo: e.target.value })}
                                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full p-3 transition-all outline-none"
                                            placeholder="Ej: Inversión en mercancía"
                                            maxLength="100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Monto del Préstamo
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-400 font-bold">
                                                    {loanForm.methodId && paymentMethods.find(pm => pm.id_metodo_pago == loanForm.methodId && ['USD', 'DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL'].some(k => pm.nb_metodo_pago.toUpperCase().includes(k))) ? '$' : 'Bs'}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                value={loanForm.amount}
                                                onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })}
                                                className="bg-slate-50 border border-slate-200 text-slate-900 text-lg rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 p-3 font-black text-right outline-none transition-all"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha</label>
                                            <input
                                                type="datetime-local"
                                                value={loanForm.date}
                                                onChange={e => setLoanForm({ ...loanForm, date: e.target.value })}
                                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full p-3 font-bold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tasa del Día</label>
                                            <div className="bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-xl block w-full p-3 font-bold text-right cursor-not-allowed">
                                                Bs {parseFloat(rate).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsLoanModalOpen(false)}
                                        className="flex-1 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 font-bold rounded-xl px-5 py-3 transition-colors text-sm"
                                        disabled={submitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 text-white bg-amber-500 hover:bg-amber-600 font-bold rounded-xl px-5 py-3 shadow-lg shadow-amber-500/20 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        {submitting ? '...' : 'Confirmar Préstamo'}
                                        {!submitting && <FaHandHoldingUsd />}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default GastosPage;

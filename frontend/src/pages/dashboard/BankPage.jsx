import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUniversity, FaCopy, FaCheckCircle, FaBuilding } from 'react-icons/fa';

// ─── DATOS DE CUENTAS BANCARIAS ────────────────────────────────────────────────
// Edita aquí los números de cuenta, titulares y datos RIF/CI
const BANK_ENTITIES = [
    {
        id: 1,
        entity: 'YUPI',
        color: 'from-emerald-500 to-teal-600',
        lightBg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        accounts: [
            {
                bank: 'BNC',
                fullBankName: 'Banco Nacional de Crédito',
                type: 'Cuenta Corriente',
                number: '0191-xxxx-xx-xxxxxxxxxxxx',
                holder: 'YUPI C.A.',
                rif: 'J-xxxxxxxxxx-x',
            },
        ],
    },
    {
        id: 2,
        entity: 'MEDFORD',
        color: 'from-blue-500 to-indigo-600',
        lightBg: 'bg-blue-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        accounts: [
            {
                bank: 'PROVINCIAL',
                fullBankName: 'BBVA Provincial',
                type: 'Cuenta Corriente',
                number: '0108-xxxx-xx-xxxxxxxxxxxx',
                holder: 'MEDFORD C.A.',
                rif: 'J-xxxxxxxxxx-x',
            },
        ],
    },
    {
        id: 3,
        entity: 'ROPA MANIA',
        color: 'from-orange-500 to-amber-600',
        lightBg: 'bg-orange-50',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
        accounts: [
            {
                bank: 'BNC',
                fullBankName: 'Banco Nacional de Crédito',
                type: 'Cuenta Corriente',
                number: '0191-xxxx-xx-xxxxxxxxxxxx',
                holder: 'ROPA MANIA C.A.',
                rif: 'J-xxxxxxxxxx-x',
            },
            {
                bank: 'PROVINCIAL',
                fullBankName: 'BBVA Provincial',
                type: 'Cuenta Corriente',
                number: '0108-xxxx-xx-xxxxxxxxxxxx',
                holder: 'ROPA MANIA C.A.',
                rif: 'J-xxxxxxxxxx-x',
            },
        ],
    },
    {
        id: 4,
        entity: 'CONJUNTA VV',
        color: 'from-purple-500 to-violet-600',
        lightBg: 'bg-purple-50',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        accounts: [
            {
                bank: 'VENEZUELA',
                fullBankName: 'Banco de Venezuela',
                type: 'Cuenta Conjunta',
                number: '0102-xxxx-xx-xxxxxxxxxxxx',
                holder: 'NOMBRE TITULAR',
                rif: 'V-xxxxxxxxxx',
            },
        ],
    },
];

// ─── BANK LOGO COLORS ──────────────────────────────────────────────────────────
const BANK_COLORS = {
    BNC: 'bg-red-600',
    PROVINCIAL: 'bg-blue-700',
    VENEZUELA: 'bg-red-700',
};

const AccountCard = ({ account }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const bankColor = BANK_COLORS[account.bank] || 'bg-slate-600';

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
            {/* Bank header */}
            <div className="flex items-center gap-3">
                <div className={`${bankColor} text-white text-xs font-black px-3 py-1.5 rounded-lg tracking-wider`}>
                    {account.bank}
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-medium">{account.fullBankName}</p>
                    <p className="text-xs text-slate-500 font-bold">{account.type}</p>
                </div>
            </div>

            {/* Account number with copy */}
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Número de Cuenta</p>
                    <p className="font-mono text-sm font-black text-slate-800 tracking-wider">{account.number}</p>
                </div>
                <button
                    onClick={() => handleCopy(account.number)}
                    className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-700 flex-shrink-0"
                    title="Copiar número"
                >
                    {copied ? <FaCheckCircle className="text-emerald-500" /> : <FaCopy size={14} />}
                </button>
            </div>

            {/* Holder & RIF */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Titular</p>
                    <p className="font-bold text-slate-700">{account.holder}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">RIF / CI</p>
                    <p className="font-mono font-bold text-slate-700">{account.rif}</p>
                </div>
            </div>
        </div>
    );
};

const BankPage = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading flex items-center gap-3">
                        <FaUniversity className="text-slate-600" />
                        Cuentas Bancarias
                    </h2>
                    <p className="text-slate-500 mt-1">Información bancaria de todas las entidades del grupo.</p>
                </div>
            </motion.header>

            {/* Entity cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {BANK_ENTITIES.map((entity, idx) => (
                    <motion.div
                        key={entity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`rounded-3xl border-2 ${entity.border} overflow-hidden shadow-sm`}
                    >
                        {/* Entity header */}
                        <div className={`bg-gradient-to-r ${entity.color} p-5 relative overflow-hidden`}>
                            <div className="absolute -right-4 -top-4 opacity-10">
                                <FaBuilding className="text-[8rem]" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <FaUniversity className="text-white text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-xl tracking-wide">{entity.entity}</h3>
                                    <p className="text-white/70 text-xs font-medium">
                                        {entity.accounts.length} {entity.accounts.length === 1 ? 'cuenta bancaria' : 'cuentas bancarias'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Accounts */}
                        <div className={`${entity.lightBg} p-4 space-y-3`}>
                            {entity.accounts.map((acc, i) => (
                                <AccountCard key={i} account={acc} />
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default BankPage;

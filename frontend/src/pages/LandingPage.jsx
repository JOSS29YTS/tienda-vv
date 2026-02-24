import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaChartLine, FaUsers, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/logo.jpg';

const LandingPage = () => {
    const { user } = useAuth();
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative font-primary">
            {/* Background Decorations - Warm/Dark Theme */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-amber-700/10 rounded-full blur-[100px] opacity-30"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-6 w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    {/* Logo - Ropa Mania Style */}
                    <div className="relative group cursor-pointer">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                        <div className="relative px-4 py-2 bg-slate-950 ring-1 ring-white/10 rounded-lg leading-none flex items-center gap-2">
                            <div className="p-1 bg-orange-500 rounded text-slate-950 font-bold text-xs font-heading">RM</div>
                            <span className="text-xl font-bold font-heading tracking-wide text-white">
                                Ropa <span className="text-orange-500">Mania</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {user ? (
                        <Link to="/dashboard" className="px-6 py-2.5 rounded-lg bg-white text-slate-950 hover:bg-slate-100 transition-all text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-orange-500/20">
                            <span>Ir al Perfil</span>
                            <FaArrowRight className="text-xs" />
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="hidden sm:inline-block px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Iniciar Sesión
                            </Link>
                            <Link to="/register" className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all text-sm font-bold shadow-lg shadow-orange-900/20">
                                Registrarse
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto px-6 md:px-12 py-12 lg:py-20 gap-12 lg:gap-20">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex-1 space-y-8 text-center lg:text-left z-20"
                >
                    {/* Centered Large Logo for Mobile, Left Aligned for Desktop */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex justify-center lg:justify-start"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-orange-600/20 rounded-full blur-2xl group-hover:bg-orange-600/40 transition duration-500"></div>
                            <img
                                src={logo}
                                alt="Ropa Mania Logo"
                                className="relative w-32 md:w-48 lg:w-56 h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    </motion.div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-orange-400 text-[10px] font-bold tracking-widest uppercase mx-auto lg:mx-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        SISTEMA DE GESTIÓN V2.0
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading leading-tight text-white tracking-tight">
                        Controla tu <br />
                        <span className="text-orange-500">
                            Tienda de Ropa
                        </span> <br />
                        Sin Límites
                    </h1>

                    <p className="text-lg text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                        Experimenta la nueva era de la administración de inventarios de moda. Rápido, intuitivo y diseñado para el éxito de tus ventas.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                        <Link to={user ? "/dashboard" : "/register"} className="px-8 py-3.5 rounded-lg bg-white text-slate-950 font-bold text-base hover:bg-slate-100 transition-transform hover:scale-105 flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                            {user ? "Ir al Perfil" : "Comenzar Ahora"}
                            <FaArrowRight className="text-sm" />
                        </Link>
                    </div>
                </motion.div>

                {/* Hero Visual/Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="flex-1 w-full max-w-xl perspective-[1000px] relative"
                >
                    {/* Floating Badge - System Active */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="absolute -right-4 top-0 z-30 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-3 animate-float-delayed"
                    >
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ESTADO</div>
                            <div className="text-sm font-bold text-slate-900">Sistema Activo</div>
                        </div>
                    </motion.div>

                    <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800 shadow-2xl shadow-black/50 overflow-hidden transform rotate-y-6 rotate-x-6 hover:rotate-0 transition-all duration-700 ease-out">
                        {/* Dashboard Header Mockup */}
                        <div className="bg-slate-800 rounded-t-xl px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">dashboard.mania.app</div>
                        </div>

                        {/* Dashboard Content Mockup */}
                        <div className="p-6 grid grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 mb-3">
                                    <FaBoxOpen />
                                </div>
                                <div className="text-2xl font-bold text-white mb-1">24</div>
                                <div className="text-xs text-slate-500">Ventas Hoy</div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                                    <FaChartLine />
                                </div>
                                <div className="text-2xl font-bold text-white mb-1">$450.00</div>
                                <div className="text-xs text-slate-500">Ingresos</div>
                            </div>

                            {/* Chart Area */}
                            <div className="col-span-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-32 flex items-end justify-between px-2 gap-2">
                                {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-orange-600 to-amber-500 rounded-sm opacity-90 hover:opacity-100 transition-all hover:scale-y-110 origin-bottom" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default LandingPage;

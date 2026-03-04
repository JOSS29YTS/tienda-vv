import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaChartLine, FaUsers, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';



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

                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-2xl shadow-black/50 overflow-hidden transform rotate-y-6 rotate-x-6 hover:rotate-0 transition-all duration-700 ease-out flex items-center justify-center">
                        <img
                            src="/img/LOGO.png"
                            alt="Ropa Mania Dashboard Logo"
                            className="w-full h-auto rounded-xl object-contain drop-shadow-2xl"
                        />
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default LandingPage;

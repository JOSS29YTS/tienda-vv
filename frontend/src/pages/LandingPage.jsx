import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaChartLine, FaUsers, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
    const { user } = useAuth();
    return (
        <div className="min-h-screen hero-gradient-bg text-white overflow-hidden relative font-primary">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 animate-float"></div>
                <div className="absolute top-[30%] right-[10%] w-72 h-72 bg-teal-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 animate-float-delayed"></div>
                <div className="absolute -bottom-8 left-[20%] w-96 h-96 bg-green-600 rounded-full mix-blend-overlay filter blur-[120px] opacity-20"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-6 w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    {/* Glassy Logo Container */}
                    <div className="h-12 w-12 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                        <img src="/img/venalta-logo.png" alt="Venalta" className="h-8 w-auto object-contain" />
                    </div>
                    <span className="text-2xl font-bold font-heading tracking-tight text-white drop-shadow-md">Venalta</span>
                </div>
                <div className="flex gap-4">
                    {user ? (
                        <Link to="/dashboard" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all text-sm font-bold flex items-center gap-2">
                            <span>Ir al Dashboard</span>
                            <FaArrowRight className="text-xs" />
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="px-6 py-2.5 rounded-xl border border-emerald-400/30 text-emerald-50 hover:bg-emerald-800/50 transition-all text-sm font-semibold backdrop-blur-sm">
                                Iniciar Sesión
                            </Link>
                            <Link to="/register" className="hidden sm:inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all text-sm font-bold">
                                Registrarse
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto px-6 md:px-12 py-12 lg:py-24 gap-12 lg:gap-20">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex-1 space-y-8 text-center lg:text-left"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wider uppercase backdrop-blur-sm mx-auto lg:mx-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Gestión e Inventario v2.0
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading leading-[1.1] text-white">
                        Controla tu Bodega <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 drop-shadow-sm">
                            Sin Límites
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-emerald-100/70 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                        Experimenta la nueva era de la administración de inventarios. Rápido, intuitivo y diseñado para el éxito de tu negocio.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                        <Link to={user ? "/dashboard" : "/login"} className="px-8 py-4 rounded-2xl bg-white text-emerald-900 font-bold text-lg shadow-xl shadow-emerald-900/20 hover:scale-105 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 group">
                            {user ? "Ir al Dashboard" : "Comenzar Ahora"}
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform text-emerald-600" />
                        </Link>
                    </div>
                </motion.div>

                {/* Hero Visual/Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="flex-1 w-full max-w-lg lg:max-w-xl perspective-[2000px]"
                >
                    <div
                        className="relative z-10 glass-panel rounded-3xl p-6 border-t border-l border-white/20 shadow-2xl backdrop-blur-xl transform transition-transform hover:scale-[1.02] duration-500"
                        style={{ transform: "rotateY(-10deg) rotateX(5deg)" }}
                    >
                        {/* Mock UI Header */}
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                            </div>
                            <div className="h-2 w-24 bg-white/10 rounded-full"></div>
                        </div>

                        {/* Mock Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-emerald-950/40 p-5 rounded-2xl border border-white/5 h-32 flex flex-col justify-between">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <FaBoxOpen />
                                </div>
                                <div>
                                    <div className="h-2 w-16 bg-white/20 rounded-full mb-2"></div>
                                    <div className="h-6 w-20 bg-white/10 rounded-md"></div>
                                </div>
                            </div>
                            <div className="bg-emerald-950/40 p-5 rounded-2xl border border-white/5 h-32 flex flex-col justify-between">
                                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <FaUsers />
                                </div>
                                <div>
                                    <div className="h-2 w-16 bg-white/20 rounded-full mb-2"></div>
                                    <div className="h-6 w-20 bg-white/10 rounded-md"></div>
                                </div>
                            </div>
                        </div>

                        {/* Mock Chart */}
                        <div className="bg-emerald-950/40 p-6 rounded-2xl h-48 border border-white/5 flex items-end gap-3">
                            {[35, 60, 45, 75, 55, 85, 65].map((h, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>

                        {/* Floating Badge */}
                        <div className="absolute -right-6 top-10 glass-panel p-4 rounded-2xl shadow-lg border border-white/20 animate-float-delayed">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                                    +
                                </div>
                                <div>
                                    <div className="text-xs text-white/60 font-semibold uppercase">Ventas Hoy</div>
                                    <div className="text-lg font-bold text-white">+ Bs 1,250</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default LandingPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, user, loading: authLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (user && !authLoading) {
            navigate('/dashboard');
        }
    }, [user, authLoading, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Clear error on typing
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // Login successful
            login(data.user, data.token);
            navigate('/dashboard');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen hero-gradient-bg flex items-center justify-center p-4 relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-emerald-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-float"></div>
                <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-teal-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-float-delayed"></div>
            </div>

            {/* Back to Home Button */}
            <Link to="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/70 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Volver al Inicio</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass-panel-dark p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner border border-white/10 ring-1 ring-white/20">
                            <img src="/img/venalta-logo.png" alt="Venalta" className="h-12 w-auto object-contain opacity-90" />
                        </div>
                        <h2 className="text-3xl font-bold text-white font-heading tracking-tight">Bienvenido</h2>
                        <p className="text-emerald-100/60 mt-2 font-light">Inicia sesión en tu cuenta Venalta</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-emerald-100/80 ml-1">Usuario</label>
                            <div className="relative group">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="Ingresa tu correo electrónico"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-emerald-100/80 ml-1">Contraseña</label>
                            <div className="relative group">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="Ingresa tu contraseña"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-300 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end text-sm text-emerald-200/80">
                            <Link to="/forgot-password" className="hover:text-white transition-colors font-medium hover:underline decoration-emerald-500">¿Olvidaste tu contraseña?</Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-lg shadow-black/20 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-slate-400 text-sm font-medium">
                        ¿No tienes una cuenta? {' '}
                        <Link to="/register" className="text-emerald-300 hover:text-emerald-200 transition-colors ml-1 font-bold hover:underline">
                            Regístrate aquí
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaPlay } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';
import { IS_DEMO_MODE, DEMO_EMAIL } from '../../config/demoMode';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, user, loading: authLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: IS_DEMO_MODE ? DEMO_EMAIL : '',
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

    const handleDemoLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/auth/demo-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar demostración');
            }

            login(data.user, data.token);
            navigate('/dashboard');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-primary">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-amber-700/10 rounded-full blur-[80px] opacity-30"></div>
            </div>

            {/* Back to Home Button */}
            <Link to="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Volver al Inicio</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-800/50">
                    <div className="text-center mb-8">
                        {/* Logo - Tienda VV Style */}
                        <div className="mx-auto inline-flex items-center justify-center mb-6">
                            <div className="relative px-3 py-3 bg-slate-950 ring-1 ring-white/5 rounded-xl leading-none flex items-center gap-2 shadow-lg">
                                <div className="p-1.5 bg-orange-500 rounded text-slate-950 font-bold text-sm font-heading">TV</div>
                                <span className="text-2xl font-bold font-heading tracking-wide text-white">
                                    Tienda <span className="text-orange-500">VV</span>
                                </span>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-white font-heading tracking-tight">{IS_DEMO_MODE ? 'Demostración del Sistema' : 'Bienvenido'}</h2>
                        <p className="text-slate-400 mt-2 font-light text-sm">{IS_DEMO_MODE ? 'Explora el sistema con una cuenta de prueba' : 'Inicia sesión en tu cuenta Tienda VV'}</p>
                    </div>

                    {IS_DEMO_MODE && (
                        <div style={{
                            background: 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.35)',
                            borderRadius: '8px', padding: '12px 14px',
                            marginBottom: 16, fontSize: 13,
                            color: '#cbd5e1', lineHeight: 1.5,
                        }}>
                            Modo demostración — cuenta de prueba con permisos
                            de Gerente. Usa el botón de abajo para
                            explorar el sistema sin registrarte.
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Usuario</label>
                            <div className="relative group">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Ingresa tu usuario"
                                    required
                                    readOnly={IS_DEMO_MODE}
                                    style={IS_DEMO_MODE ? { opacity: 0.85, cursor: 'not-allowed' } : undefined}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Contraseña</label>
                            <div className="relative group">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Ingresa tu contraseña"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                                </button>
                            </div>
                        </div>

                        {IS_DEMO_MODE ? (
                            <div className="flex justify-end pt-1">
                                <span className="text-xs text-slate-500 font-semibold">La recuperación de contraseña no está disponible en demo</span>
                            </div>
                        ) : (
                            <div className="flex justify-end pt-1">
                                <Link to="/forgot-password" className="text-xs text-orange-500 hover:text-orange-400 font-semibold transition-colors">¿Olvidaste tu contraseña?</Link>
                            </div>
                        )}

                        {IS_DEMO_MODE && (
                            <button type="button" disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-indigo-900/20 hover:shadow-indigo-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                onClick={handleDemoLogin}
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <><FaPlay size={14} /> Probar demo</>
                                )}
                            </button>
                        )}

                        <button type="submit" disabled={loading}
                            className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-orange-900/20 hover:shadow-orange-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2`}
                        >
                            {loading ? 'Iniciando...' : IS_DEMO_MODE ? 'Iniciar con contraseña' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {!IS_DEMO_MODE && (
                        <div className="mt-8 text-center text-slate-500 text-xs font-medium">
                            ¿No tienes una cuenta? {' '}
                            <Link to="/register" className="text-white hover:text-orange-400 transition-colors ml-0.5 font-bold">
                                Regístrate aquí
                            </Link>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-[10px] text-slate-600">
                        {IS_DEMO_MODE
                            ? 'Entorno de demostración — los datos pueden restablecerse periódicamente'
                            : '© 2026 Tienda VV. Todos los derechos reservados.'
                        }
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;

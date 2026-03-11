import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [step, setStep] = useState(1); // 1: Form, 2: Verification
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (user && !authLoading) {
            navigate('/dashboard');
        }
    }, [user, authLoading, navigate]);

    // Visibility States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showRequirements, setShowRequirements] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        confirmPassword: '',
        codigo: ''
    });

    // Mock verification code (for demo purposes)
    const MOCK_CODE = "123456";

    const [tempToken, setTempToken] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: (name === 'nombre' || name === 'apellido') ? value.toUpperCase() : value
        });
    };

    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // Password Validation
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            showNotification("La contraseña no cumple con los requisitos mínimos.", "error");
            setShowRequirements(true); // Auto show requirements
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            showNotification("Las contraseñas no coinciden.", "error");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register-init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al iniciar registro');

            setTempToken(data.tempToken);
            setStep(2);

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyBox = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: formData.codigo,
                    tempToken
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error de verificación');

            // Success Notification
            showNotification("¡Registro exitoso! Redirigiendo...", "success");

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
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
                <FaArrowLeft className="text-sm" />
                <span>Volver al Inicio</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-800/50">
                    <div className="text-center mb-6">
                        {/* Logo - Tienda VV Style */}
                        <div className="mx-auto inline-flex items-center justify-center mb-6">
                            <div className="relative px-3 py-3 bg-slate-950 ring-1 ring-white/5 rounded-xl leading-none flex items-center gap-2 shadow-lg">
                                <div className="p-1.5 bg-orange-500 rounded text-slate-950 font-bold text-sm font-heading">TV</div>
                                <span className="text-2xl font-bold font-heading tracking-wide text-white">
                                    Tienda <span className="text-orange-500">VV</span>
                                </span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white font-heading tracking-tight">Crear Cuenta</h2>
                        <p className="text-slate-400 mt-2 font-light text-sm">
                            {step === 1 ? "Únete al equipo de Tienda VV" : "Verifica tu identidad"}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleRegister}
                                className="space-y-5"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Nombre</label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type="text"
                                                name="nombre"
                                                required
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                                placeholder="Ej. Juan"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Apellido</label>
                                        <div className="relative group">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type="text"
                                                name="apellido"
                                                required
                                                value={formData.apellido}
                                                onChange={handleChange}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                                placeholder="Ej. Pérez"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Correo Electrónico</label>
                                    <div className="relative group">
                                        <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                            placeholder="ejemplo@correo.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contraseña</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowRequirements(!showRequirements)}
                                            className="text-orange-500 hover:text-orange-400 text-[10px] uppercase font-bold flex items-center gap-1 transition-colors focus:outline-none bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20"
                                        >
                                            <FaInfoCircle /> Requisitos
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showRequirements && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-300 backdrop-blur-md overflow-hidden mb-2"
                                            >
                                                <p className="font-bold text-orange-400 mb-2 uppercase tracking-wide">Tu contraseña debe incluir:</p>
                                                <ul className="space-y-1.5 pl-1">
                                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Mínimo 8 caracteres</li>
                                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Una mayúscula</li>
                                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Un carácter especial</li>
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="relative group">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                            placeholder="••••••••"
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

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Confirmar Contraseña</label>
                                    <div className="relative group">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400 transition-colors focus:outline-none"
                                        >
                                            {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-orange-900/20 hover:shadow-orange-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            "Registrarse"
                                        )}
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleVerifyBox}
                                className="space-y-6"
                            >
                                <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
                                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-500">
                                        <FaEnvelope />
                                    </div>
                                    <p className="text-slate-300 text-xs mb-1">
                                        Hemos enviado un código de verificación de 6 dígitos al correo de administración:
                                    </p>
                                    <p className="text-white font-bold text-base">venaltadm@gmail.com</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Código de Verificación</label>
                                    <input
                                        type="text"
                                        name="codigo"
                                        required
                                        maxLength="6"
                                        value={formData.codigo}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950 border border-orange-500/30 rounded-xl py-4 px-4 text-center text-3xl tracking-[0.5em] text-white placeholder-slate-700 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-bold font-mono"
                                        placeholder="000000"
                                    />
                                </div>

                                <div className="pt-2 space-y-3">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-orange-900/20 hover:shadow-orange-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <>
                                                <span>Verificar y Acceder</span>
                                                <FaCheckCircle className="text-white/80" />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full py-2 text-slate-500 hover:text-white text-xs font-medium transition-colors"
                                    >
                                        Volver atrás
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {step === 1 && (
                        <div className="mt-8 text-center text-slate-500 text-xs font-medium">
                            ¿Ya tienes una cuenta? {' '}
                            <Link to="/login" className="text-white hover:text-orange-400 transition-colors ml-0.5 font-bold">
                                Inicia Sesión
                            </Link>
                        </div>
                    )}
                </div>
                <div className="mt-6 text-center">
                    <p className="text-[10px] text-slate-600">© 2026 Tienda VV. Todos los derechos reservados.</p>
                </div>
            </motion.div>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, y: 0 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 50, y: 0 }}
                        className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${notification.type === 'success'
                            ? 'bg-green-600/90 text-white border-green-500/50 shadow-green-900/20'
                            : 'bg-red-600/90 text-white border-red-500/50 shadow-red-900/20'
                            }`}
                    >
                        <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-500/50' : 'bg-red-500/50'}`}>
                            {notification.type === 'success' ? <FaCheckCircle className="text-xl" /> : <FaExclamationCircle className="text-xl" />}
                        </div>
                        <div>
                            <p className="font-bold text-base font-heading">{notification.type === 'success' ? '¡Excelente!' : 'Atención'}</p>
                            <p className="text-sm font-medium opacity-90">{notification.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RegisterPage;

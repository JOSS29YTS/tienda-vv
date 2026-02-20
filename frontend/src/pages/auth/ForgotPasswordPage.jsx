import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaArrowLeft, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import API_URL from '../../config/api';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password
    const [recoveryToken, setRecoveryToken] = useState('');

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.message || "Error al enviar solicitud.", "error");
            } else {
                if (data.recoveryToken) setRecoveryToken(data.recoveryToken);
                setStep(2);
                showNotification(data.message, "success");
            }

        } catch (error) {
            showNotification("Error de conexión.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            showNotification("Las contraseñas no coinciden", "error");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword, recoveryToken })
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.message || "Error al restablecer.", "error");
            } else {
                showNotification("Contraseña restablecida exitosamente. Redirigiendo...", "success");
                setTimeout(() => window.location.href = '/login', 2500);
            }
        } catch (error) {
            showNotification("Error de conexión.", "error");
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

            {/* Back to Login Button */}
            <Link to="/login" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5">
                <FaArrowLeft />
                <span>Volver al Login</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-800/50">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-slate-800 ring-1 ring-white/5">
                            <FaLock className="text-3xl text-orange-500 opacity-90" />
                        </div>
                        <h2 className="text-2xl font-bold text-white font-heading tracking-tight">Recuperar Contraseña</h2>
                        <p className="text-slate-400 mt-2 font-light text-sm">
                            {step === 1
                                ? "Ingresa tu correo y te enviaremos las instrucciones."
                                : "Correo enviado. Revisa tu bandeja de entrada."}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Correo Electrónico</label>
                                    <div className="relative group">
                                        <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                            placeholder="ejemplo@correo.com"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-orange-900/20 hover:shadow-orange-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            Enviar Enlace <FaPaperPlane />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleResetPassword}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
                                    <p className="text-orange-200/80 text-xs">
                                        Hemos enviado el código a <strong>{email}</strong>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Código de Verificación</label>
                                        <div className="relative group">
                                            <FaCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-medium tracking-widest text-center"
                                                placeholder="123456"
                                                maxLength={6}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Nueva Contraseña</label>
                                        <div className="relative group">
                                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm font-medium"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400 transition-colors focus:outline-none"
                                            >
                                                {showNewPassword ? <FaEye /> : <FaEyeSlash />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Confirmar Contraseña</label>
                                        <div className="relative group">
                                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
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
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-orange-900/20 hover:shadow-orange-700/30 transform hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            Cambiar Contraseña <FaCheckCircle />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
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
                            ? 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-900/20'
                            : 'bg-red-600/90 text-white border-red-400/50 shadow-red-900/20'
                            }`}
                    >
                        <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}>
                            {notification.type === 'success' ? <FaCheckCircle className="text-xl" /> : <FaExclamationCircle className="text-xl" />}
                        </div>
                        <div>
                            <p className="font-bold text-base font-heading">{notification.type === 'success' ? 'Enviado' : 'Error'}</p>
                            <p className="text-sm font-medium opacity-90">{notification.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};



export default ForgotPasswordPage;

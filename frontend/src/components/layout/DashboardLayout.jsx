import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBox, FaCashRegister, FaShoppingCart, FaUserFriends, FaHistory, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const SidebarItem = ({ to, icon: Icon, label, active }) => {
    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden isolate ${active ? 'text-white font-bold bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Icon className={`text-xl ${active ? 'text-white scale-110' : 'text-slate-500 group-hover:text-emerald-400'} transition-transform duration-300`} />
            <span className="relative z-10">{label}</span>
        </Link>
    );
};

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    // Responsive Sidebar
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    let navItems = [
        { to: "/dashboard", icon: FaHome, label: "Inicio" }
    ];

    if (user) {
        const role = user.rol.toLowerCase();

        if (role === 'vendedor') {
            navItems.push({ to: "/dashboard/sales", icon: FaCashRegister, label: "Ventas" });
            navItems.push({ to: "/dashboard/clients", icon: FaUserFriends, label: "Clientes" });
        } else {
            // Administrador & Gerente
            navItems.push({ to: "/dashboard/inventory", icon: FaBox, label: "Inventario" });
            navItems.push({ to: "/dashboard/products", icon: FaBox, label: "Productos" });
            navItems.push({ to: "/dashboard/sales", icon: FaCashRegister, label: "Ventas" });
            navItems.push({ to: "/dashboard/purchases", icon: FaShoppingCart, label: "Compras" });
            navItems.push({ to: "/dashboard/clients", icon: FaUserFriends, label: "Clientes" });

            // Only Admin sees Users and History
            if (role === 'administrador') {
                navItems.push({ to: "/dashboard/history", icon: FaHistory, label: "Historial" });
                navItems.push({ to: "/dashboard/users", icon: FaUserFriends, label: "Usuarios" });
            }
        }
    }

    const isActive = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-primary">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`bg-[#0f172a] h-full flex flex-col shadow-2xl z-30 overflow-hidden flex-shrink-0 relative`}
                style={{ position: window.innerWidth < 1024 ? 'absolute' : 'relative' }}
            >
                <Link to="/" className="p-6 flex items-center gap-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <img src="/img/venalta-logo.png" alt="Venalta" className="h-8 w-auto" />
                    </div>
                    <span className="text-2xl font-bold text-white font-heading tracking-wide group-hover:text-emerald-400 transition-colors">Venalta</span>
                </Link>

                <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 font-heading">Menu Principal</div>
                    {navItems.map((item) => (
                        <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={isActive(item.to)} />
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800/50 space-y-2">
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all font-medium group"
                    >
                        <FaHome className="group-hover:text-emerald-400 transition-colors" />
                        <span>Volver al Inicio</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-medium group"
                    >
                        <FaSignOutAlt className="group-hover:-translate-x-1 transition-transform" />
                        <span>Cerrar Sesión</span>
                    </button>
                    <div className="px-4 py-3 mt-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-400 font-medium">Venalta System</div>
                        <div className="text-[10px] text-slate-600">v2.0.0 Business Edition</div>
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && window.innerWidth < 1024 && (
                <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f1f5f9]">
                {/* Topbar */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-all active:scale-95"
                        >
                            {isSidebarOpen ? <FaTimes /> : <FaBars />}
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 font-heading">
                            {navItems.find(i => isActive(i.to))?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 pl-2 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                                    {user ? `${user.nombre} ${user.apellido}` : 'Usuario'}
                                </div>
                                <div className="text-xs text-slate-400 font-medium capitalize">
                                    {user ? user.rol : 'Invitado'}
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white group-hover:ring-emerald-200 transition-all">
                                {user ? user.nombre.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

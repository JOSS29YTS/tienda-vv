import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBox, FaCashRegister, FaShoppingCart, FaUserFriends, FaHistory, FaSignOutAlt, FaBars, FaTimes, FaChartLine, FaFileInvoiceDollar, FaBalanceScale, FaPercentage, FaStore, FaGlobe, FaChevronDown, FaUniversity, FaReceipt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRate } from '../../context/RateContext';
import { useStore } from '../../context/StoreContext';

const SidebarItem = ({ to, icon: Icon, label, active }) => {
    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden isolate ${active ? 'text-white font-bold bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Icon className={`text-xl ${active ? 'text-white scale-110' : 'text-slate-500 group-hover:text-orange-400'} transition-transform duration-300`} />
            <span className="relative z-10">{label}</span>
        </Link>
    );
};

// Colores predefinidos por tienda
const TIENDA_COLORS = {
    1: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    2: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    3: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
};
const GLOBAL_COLORS = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { rate, setRate } = useRate();
    const { tiendas, selectedTienda, setSelectedTienda, canSwitchStore } = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [showStoreDropdown, setShowStoreDropdown] = React.useState(false);
    const dropdownRef = React.useRef(null);

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

    // Cerrar dropdown al hacer clic fuera
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowStoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-seleccionar primera tienda al entrar a Ventas o Compras desde Global
    React.useEffect(() => {
        const isOperationalRoute = location.pathname.includes('/sales') || location.pathname.includes('/purchases');
        const isInGlobal = !selectedTienda;
        const hasTiendas = tiendas.length > 0;

        if (isOperationalRoute && isInGlobal && hasTiendas && canSwitchStore) {
            // Seleccionar la primera tienda automáticamente (ej: Ropa Mania)
            setSelectedTienda(tiendas[0]);
        }
    }, [location.pathname, tiendas]);

    let navItems = [
        { to: "/dashboard", icon: FaHome, label: "Inicio" }
    ];

    if (user) {
        const role = user.rol.toLowerCase();

        if (role === 'vendedor') {
            navItems.push({ to: "/dashboard/sales", icon: FaCashRegister, label: "Ventas" });
        } else if (role === 'gerente') {
            navItems.push({ to: "/dashboard/finances", icon: FaChartLine, label: "Finanzas" });
            navItems.push({ to: "/dashboard/bank", icon: FaUniversity, label: "Banco" });
            navItems.push({ to: "/dashboard/sales", icon: FaCashRegister, label: "Ventas" });
            navItems.push({ to: "/dashboard/gastos", icon: FaReceipt, label: "Gastos" });
            navItems.push({ to: "/dashboard/products", icon: FaBox, label: "Productos" });
            navItems.push({ to: "/dashboard/purchases", icon: FaShoppingCart, label: "Compras" });
            navItems.push({ to: "/dashboard/inventory", icon: FaBox, label: "Inventario" });
            navItems.push({ to: "/dashboard/invoices", icon: FaFileInvoiceDollar, label: "Facturas" });
            navItems.push({ to: "/dashboard/commissions", icon: FaPercentage, label: "Comisión" });
            navItems.push({ to: "/dashboard/profit-loss", icon: FaBalanceScale, label: "Balance" });
            navItems.push({ to: "/dashboard/history", icon: FaHistory, label: "Historial" });
        } else if (role === 'administrador') {
            navItems.push({ to: "/dashboard/finances", icon: FaChartLine, label: "Finanzas" });
            navItems.push({ to: "/dashboard/bank", icon: FaUniversity, label: "Banco" });
            navItems.push({ to: "/dashboard/sales", icon: FaCashRegister, label: "Ventas" });
            navItems.push({ to: "/dashboard/gastos", icon: FaReceipt, label: "Gastos" });
            navItems.push({ to: "/dashboard/products", icon: FaBox, label: "Productos" });
            navItems.push({ to: "/dashboard/purchases", icon: FaShoppingCart, label: "Compras" });
            navItems.push({ to: "/dashboard/inventory", icon: FaBox, label: "Inventario" });
            navItems.push({ to: "/dashboard/invoices", icon: FaFileInvoiceDollar, label: "Facturas" });
            navItems.push({ to: "/dashboard/commissions", icon: FaPercentage, label: "Comisión" });
            navItems.push({ to: "/dashboard/profit-loss", icon: FaBalanceScale, label: "Balance" });
            navItems.push({ to: "/dashboard/history", icon: FaHistory, label: "Historial" });
            navItems.push({ to: "/dashboard/users", icon: FaUserFriends, label: "Usuarios" });
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

    // Calcular colores actuales del selector de tienda
    const currentColors = selectedTienda
        ? (TIENDA_COLORS[selectedTienda.id_tienda] || TIENDA_COLORS[1])
        : GLOBAL_COLORS;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-primary">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`bg-[#0f172a] h-full flex flex-col shadow-2xl z-30 overflow-hidden flex-shrink-0 relative`}
                style={{ position: window.innerWidth < 1024 ? 'fixed' : 'relative' }}
            >
                <Link to="/" className="p-6 flex items-center gap-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                    <div className="relative px-3 py-2 bg-slate-950 ring-1 ring-white/10 rounded-lg leading-none flex items-center gap-2 w-full justify-center">
                        <div className="p-1 bg-orange-500 rounded text-slate-950 font-bold text-xs font-heading">TV</div>
                        <span className="text-xl font-bold font-heading tracking-wide text-white">
                            Tienda <span className="text-orange-500">VV</span>
                        </span>
                    </div>
                </Link>

                {/* Tienda activa en sidebar */}
                {user?.id_tienda && (
                    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-center gap-2">
                            <FaStore className="text-orange-400 text-xs" />
                            <span className="text-xs text-orange-300 font-semibold">{user.nb_tienda || 'Mi Tienda'}</span>
                        </div>
                    </div>
                )}

                <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={isActive(item.to)} />
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800/50 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-medium group"
                    >
                        <FaSignOutAlt className="group-hover:-translate-x-1 transition-transform" />
                        <span>Cerrar Sesión</span>
                    </button>
                    <div className="px-4 py-3 mt-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-400 font-medium">Tienda VV v1.0</div>
                        <div className="text-[10px] text-slate-600">Multi-Store Business System</div>
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
                            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-orange-600 transition-all active:scale-95"
                        >
                            {isSidebarOpen ? <FaTimes /> : <FaBars />}
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 font-heading">
                            {navItems.find(i => isActive(i.to))?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Selector de Tienda - Solo visible para admin/dueño */}
                        {canSwitchStore && tiendas.length > 0 && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${currentColors.bg} ${currentColors.border} ${currentColors.text} hover:shadow-sm`}
                                >
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentColors.dot}`}></span>
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        {selectedTienda ? selectedTienda.nb_tienda : 'Global'}
                                    </span>
                                    <FaChevronDown className={`text-xs transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {showStoreDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
                                        >
                                            {/* Opción Global - Solo mostrar si no estamos en compra/venta donde se requiere tienda específica */}
                                            {(!location.pathname.includes('/sales') && !location.pathname.includes('/purchases')) && (
                                                <>
                                                    <button
                                                        onClick={() => { setSelectedTienda(null); setShowStoreDropdown(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${!selectedTienda ? 'bg-slate-50 font-bold' : ''}`}
                                                    >
                                                        <FaGlobe className="text-slate-400 text-sm" />
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-700">Global</div>
                                                            <div className="text-xs text-slate-400">Todas las tiendas</div>
                                                        </div>
                                                        {!selectedTienda && <div className="ml-auto w-2 h-2 bg-slate-400 rounded-full"></div>}
                                                    </button>
                                                    <div className="border-t border-slate-100"></div>
                                                </>
                                            )}

                                            {/* Opciones por Tienda */}
                                            {tiendas.map((tienda) => {
                                                const colors = TIENDA_COLORS[tienda.id_tienda] || TIENDA_COLORS[1];
                                                const isSelected = selectedTienda?.id_tienda === tienda.id_tienda;
                                                return (
                                                    <button
                                                        key={tienda.id_tienda}
                                                        onClick={() => { setSelectedTienda(tienda); setShowStoreDropdown(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${isSelected ? 'bg-slate-50 font-bold' : ''}`}
                                                    >
                                                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`}></span>
                                                        <div>
                                                            <div className={`text-sm font-semibold ${colors.text}`}>{tienda.nb_tienda}</div>
                                                            {tienda.descripcion && <div className="text-xs text-slate-400">{tienda.descripcion}</div>}
                                                        </div>
                                                        {isSelected && <div className={`ml-auto w-2 h-2 rounded-full ${colors.dot}`}></div>}
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Usuario de tienda específica: badge de su tienda */}
                        {!canSwitchStore && user?.nb_tienda && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200">
                                <FaStore className="text-orange-500 text-xs" />
                                <span className="text-xs font-bold text-orange-700 uppercase">{user.nb_tienda}</span>
                            </div>
                        )}

                        {/* Global Rate Input */}
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                            <span className="text-xs font-bold text-orange-600 uppercase">Tasa: BS</span>
                            <input
                                type="number"
                                value={parseFloat(rate || 0).toFixed(2)}
                                onChange={(e) => setRate(e.target.value)}
                                className="w-20 bg-transparent border-none focus:ring-0 text-right font-black text-orange-700 p-0 text-lg"
                                step="0.01"
                            />
                        </div>

                        <div className="flex items-center gap-3 pl-2 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-slate-700 group-hover:text-orange-700 transition-colors">
                                    {user
                                        ? user.rol.toLowerCase() === 'vendedor'
                                            ? user.nombre.charAt(0).toUpperCase() + user.nombre.slice(1).toLowerCase()
                                            : `${user.nombre.charAt(0).toUpperCase() + user.nombre.slice(1).toLowerCase()} ${user.apellido ? user.apellido.charAt(0).toUpperCase() + user.apellido.slice(1).toLowerCase() : ''}`
                                        : 'Usuario'}
                                </div>
                                <div className="text-xs text-slate-400 font-medium capitalize">
                                    {user ? user.rol : 'Invitado'}
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white group-hover:ring-orange-200 transition-all">
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

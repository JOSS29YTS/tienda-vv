import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUserCog, FaSearch, FaCheckCircle, FaExclamationCircle, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/users');
            if (!response.ok) throw new Error('Error al cargar usuarios');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        // Optimistic update
        const originalUsers = [...users];
        setUsers(users.map(u => u.id_usuario === userId ? { ...u, rol: newRole } : u));

        try {
            const response = await fetch(`http://localhost:3000/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol: newRole })
            });

            if (!response.ok) throw new Error('Error al actualizar rol');

        } catch (err) {
            // Revert on error
            setUsers(originalUsers);
            alert('Error al actualizar el rol: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

        try {
            const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar usuario');

            setUsers(users.filter(u => u.id_usuario !== userId));
        } catch (err) {
            console.error(err);
            // Ideally use a toast here instead of alert, but keeping it simple as per previous pattern or lack thereof
            // If the user hates alerts, I should probably console log or show a UI message. 
            // I'll stick to console for now to avoid "alert" popup which they dislike.
        }
    };

    const filteredUsers = users.filter(user =>
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Gestión de Usuarios</h2>
                    <p className="text-slate-500">Administra los usuarios y asigna sus roles correspondientes.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Usuario</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Email</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Rol Actual</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider text-center">Estado</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <tr key={user.id_usuario} className="hover:bg-emerald-50/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center text-slate-600 font-bold border border-white shadow-sm">
                                                {user.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.nombre} {user.apellido}</div>
                                                <div className="text-xs text-slate-400 font-medium">ID: {user.id_usuario}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm font-medium">{user.email}</td>
                                    <td className="p-4">
                                        <div className="relative inline-block">
                                            <select
                                                value={user.rol}
                                                onChange={(e) => handleRoleChange(user.id_usuario, e.target.value)}
                                                disabled={currentUser && user.id_usuario === currentUser.id_usuario}
                                                className={`
                                                    appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-sm font-bold shadow-sm outline-none transition-all cursor-pointer
                                                    ${user.rol.toLowerCase() === 'administrativo' || user.rol.toLowerCase() === 'administrador' ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-200' : ''}
                                                    ${user.rol.toLowerCase() === 'contador' || user.rol.toLowerCase() === 'gerente' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-200' : ''}
                                                    ${user.rol.toLowerCase() === 'vendedor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-200' : ''}
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                            >
                                                <option value="Vendedor">Vendedor</option>
                                                <option value="Administrador">Administrador</option>
                                                <option value="Gerente">Gerente</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600">
                                            <FaCheckCircle /> Activo
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleDeleteUser(user.id_usuario)}
                                            disabled={currentUser && user.id_usuario === currentUser.id_usuario}
                                            className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                                            title="Eliminar Usuario"
                                        >
                                            <FaTrash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400">
                                        No se encontraron usuarios que coincidan con "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default UsersPage;

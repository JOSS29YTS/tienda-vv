import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBox, FaSearch, FaPlus, FaCheckCircle, FaTimesCircle, FaDollarSign, FaTag, FaPen, FaTrash } from 'react-icons/fa';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        precio: '',
        estado: 'activo'
    });

    const [editingProduct, setEditingProduct] = useState(null);
    const [editPriceValue, setEditPriceValue] = useState('');
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

    const handleEditPriceClick = (product) => {
        setEditingProduct(product.id_producto);
        setEditPriceValue(product.precio);
    };

    const handleSavePrice = async (productId) => {
        const originalProducts = [...products];
        setProducts(products.map(p => p.id_producto === productId ? { ...p, precio: editPriceValue } : p));
        setEditingProduct(null);

        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/price`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ precio: editPriceValue })
            });

            if (!response.ok) throw new Error('Error al actualizar precio');

        } catch (err) {
            setProducts(originalProducts);
            alert('Error al actualizar el precio: ' + err.message);
        }
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            if (!response.ok) throw new Error('Error al cargar productos');
            const data = await response.json();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3000/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Error al crear producto');

            fetchProducts();
            setIsModalOpen(false);
            setFormData({ nombre: '', precio: '', estado: 'activo' });

        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleStatusChange = async (productId, newStatus) => {
        // Optimistic update
        const originalProducts = [...products];
        setProducts(products.map(p => p.id_producto === productId ? { ...p, estado: newStatus } : p));

        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newStatus })
            });

            if (!response.ok) throw new Error('Error al actualizar estado');

        } catch (err) {
            // Revert on error
            setProducts(originalProducts);
            alert('Error al actualizar el estado: ' + err.message);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al eliminar');

            setProducts(products.filter(p => p.id_producto !== productId));
            alert('Producto eliminado exitosamente.');

        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const filteredProducts = products
        .filter(product =>
            product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.nombre.localeCompare(b.nombre);
            } else {
                return b.nombre.localeCompare(a.nombre);
            }
        });

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Productos</h2>
                    <p className="text-slate-500">Gestiona el inventario de productos comprados.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <FaPlus />
                        <span className="hidden sm:inline">Nuevo Producto</span>
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FaBox size={24} /></div>
                    <div>
                        <div className="text-sm text-slate-500 font-medium">Total Productos</div>
                        <div className="text-2xl font-bold text-slate-800">{products.length}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><FaCheckCircle size={24} /></div>
                    <div>
                        <div className="text-sm text-slate-500 font-medium">Activos</div>
                        <div className="text-2xl font-bold text-slate-800">{products.filter(p => p.estado === 'activo').length}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><FaTimesCircle size={24} /></div>
                    <div>
                        <div className="text-sm text-slate-500 font-medium">Inactivos</div>
                        <div className="text-2xl font-bold text-slate-800">{products.filter(p => p.estado === 'inactivo').length}</div>
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none" onClick={toggleSortOrder}>
                                    <div className="flex items-center gap-2">
                                        Producto
                                        <div className="flex flex-col text-[10px] leading-tight text-slate-400">
                                            <span className={sortOrder === 'asc' ? 'text-emerald-500' : ''}>▲</span>
                                            <span className={sortOrder === 'desc' ? 'text-emerald-500' : ''}>▼</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Precio</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Estado</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Cargando productos...</td></tr>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                    <tr key={product.id_producto} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold border border-indigo-100">
                                                    <FaBox />
                                                </div>
                                                <div className="font-bold text-slate-800">{product.nombre}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-800 font-bold font-mono text-lg">
                                            {editingProduct === product.id_producto ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={editPriceValue}
                                                        autoFocus
                                                        step="0.01"
                                                        onChange={(e) => setEditPriceValue(e.target.value)}
                                                        className="w-24 px-2 py-1 rounded border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSavePrice(product.id_producto);
                                                            if (e.key === 'Escape') setEditingProduct(null);
                                                        }}
                                                    />
                                                    <button onClick={() => handleSavePrice(product.id_producto)} className="text-emerald-600 hover:text-emerald-700"><FaCheckCircle /></button>
                                                    <button onClick={() => setEditingProduct(null)} className="text-red-400 hover:text-red-500"><FaTimesCircle /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 group/price cursor-pointer p-1 -ml-1 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => handleEditPriceClick(product)}>
                                                    <span>$ {parseFloat(product.precio).toFixed(2)}</span>
                                                    <span className="opacity-0 group-hover/price:opacity-100 transition-all duration-200 text-emerald-500 bg-emerald-50 p-1.5 rounded-md">
                                                        <FaPen size={12} />
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${product.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${product.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                {product.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <select
                                                    value={product.estado}
                                                    onChange={(e) => handleStatusChange(product.id_producto, e.target.value)}
                                                    className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer hover:bg-slate-50"
                                                >
                                                    <option value="activo">Activo</option>
                                                    <option value="inactivo">Inactivo</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id_producto)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                    title="Eliminar Producto"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FaBox className="text-4xl text-slate-200" />
                                            <p>No se encontraron productos.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">Nuevo Producto</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Producto</label>
                                    <div className="relative">
                                        <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                            placeholder="Ej. Arroz Premium"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Precio ($)</label>
                                    <div className="relative">
                                        <FaDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={formData.precio}
                                            onChange={e => setFormData({ ...formData, precio: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Estado Inicial</label>
                                    <select
                                        value={formData.estado}
                                        onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
                                    >
                                        Guardar Producto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductsPage;

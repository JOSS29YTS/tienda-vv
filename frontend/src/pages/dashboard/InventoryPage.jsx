import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBox, FaSearch, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/inventory', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(data);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product =>
        product.nb_producto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 font-heading">Inventario</h1>
                    <p className="text-slate-500 mt-1">Gestión y control de existencia de productos.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total Comprado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total Vendido</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Disponible</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredProducts.map((product) => {
                                    const isOutOfStock = parseInt(product.current_stock) <= 0;

                                    return (
                                        <motion.tr
                                            key={product.id_producto}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`transition-colors ${isOutOfStock
                                                ? 'bg-red-50 hover:bg-red-100' // Red background if out of stock
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${isOutOfStock ? 'bg-red-200 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        <FaBox />
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold ${isOutOfStock ? 'text-red-800' : 'text-slate-700'}`}>
                                                            {product.nb_producto}
                                                        </div>
                                                        <div className="text-xs text-slate-400">ID: {product.id_producto}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-600">
                                                $ {parseFloat(product.precio).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500">
                                                {product.total_bought}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500">
                                                {product.total_sold}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-4 py-2 rounded-lg font-bold text-sm ${isOutOfStock
                                                    ? 'bg-red-200 text-red-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {product.current_stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${product.estado === 'Activo'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {product.estado}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No se encontraron productos.
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryPage;

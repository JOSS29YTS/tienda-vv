import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBox, FaSearch, FaPlus, FaCheckCircle, FaTimesCircle, FaDollarSign, FaTag, FaPen, FaTrash, FaBarcode, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';

const ProductsPage = () => {
    const { user } = useAuth();
    const { effectiveTiendaId } = useStore();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        precio: '',
        estado: 'activo',
        id_categoria: '',
        codigo_de_barra: ''
    });

    const [editingProduct, setEditingProduct] = useState(null);
    const [editPriceValue, setEditPriceValue] = useState('');
    const [editingBarcodeProduct, setEditingBarcodeProduct] = useState(null);
    const [editBarcodeValue, setEditBarcodeValue] = useState('');
    const [editingCategoryProduct, setEditingCategoryProduct] = useState(null);
    const [editCategoryValue, setEditCategoryValue] = useState('');
    const [editingNameProduct, setEditingNameProduct] = useState(null);
    const [editNameValue, setEditNameValue] = useState('');
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [priceHistory, setPriceHistory] = useState([]);
    const [historyProduct, setHistoryProduct] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const filteredProducts = products
        .filter(product => {
            const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory ? product.id_categoria == selectedCategory : true;
            const matchesStatus = selectedStatus ? product.estado === selectedStatus : true;
            return matchesSearch && matchesCategory && matchesStatus;
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.nombre.localeCompare(b.nombre);
            } else {
                return b.nombre.localeCompare(a.nombre);
            }
        });

    const handleEditPriceClick = (product) => {
        setEditingProduct(product.id_producto);
        setEditPriceValue(product.precio);
    };

    const handleSavePrice = async (productId) => {
        const originalProducts = [...products];
        setProducts(products.map(p => p.id_producto === productId ? { ...p, precio: editPriceValue } : p));
        setEditingProduct(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productId}/price`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ precio: editPriceValue })
            });

            if (!response.ok) throw new Error('Error al actualizar precio');

        } catch (err) {
            toast.error('Error al actualizar precio: ' + err.message);
        }
    };

    const handleEditNameClick = (product) => {
        setEditingNameProduct(product.id_producto);
        setEditNameValue(product.nombre);
    };

    const handleSaveName = async (productId) => {
        if (!editNameValue.trim()) return;
        const originalProducts = [...products];
        const newName = editNameValue.trim().toUpperCase();
        setProducts(products.map(p => p.id_producto === productId ? { ...p, nombre: newName } : p));
        setEditingNameProduct(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nombre: newName })
            });
            if (!response.ok) throw new Error('Error al actualizar nombre');
        } catch (err) {
            toast.error('Error al actualizar el nombre: ' + err.message);
        }
    };

    const handleEditBarcodeClick = (product) => {
        setEditingBarcodeProduct(product.id_producto);
        setEditBarcodeValue(product.codigo_de_barra || '');
    };

    const handleSaveBarcode = async (productId) => {
        const originalProducts = [...products];
        setProducts(products.map(p => p.id_producto === productId ? { ...p, codigo_de_barra: editBarcodeValue } : p));
        setEditingBarcodeProduct(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productId}/barcode`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ codigo_de_barra: editBarcodeValue })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Error al actualizar código');
            }

        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleEditCategoryClick = (product) => {
        setEditingCategoryProduct(product.id_producto);
        setEditCategoryValue(product.id_categoria);
    };

    const handleSaveCategory = async (productId) => {
        const originalProducts = [...products];
        const newCategoryName = categories.find(c => c.id_categoria == editCategoryValue)?.nb_categoria || 'Sin Categoría';

        setProducts(products.map(p => p.id_producto === productId ? { ...p, categoria: newCategoryName, id_categoria: editCategoryValue } : p));
        setEditingCategoryProduct(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productId}/category`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id_categoria: editCategoryValue })
            });

            if (!response.ok) throw new Error('Error al actualizar categoría');

        } catch (err) {
            toast.error('Error al actualizar la categoría: ' + err.message);
        }
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [effectiveTiendaId]);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/api/products/categories`);
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, id_categoria: data[0].id_categoria }));
                }
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const tiendaParam = effectiveTiendaId ? `?tienda=${effectiveTiendaId}` : '?tienda=global';
            const response = await fetch(`${API_URL}/api/products${tiendaParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
            if (!formData.id_categoria) {
                toast.error("Por favor seleccione una categoría");
                return;
            }

            const payload = {
                ...formData,
                tienda: effectiveTiendaId // Send the currently selected store
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear producto');
            }

            toast.success('Producto creado con éxito');

            fetchProducts();
            setIsModalOpen(false);
            setFormData({ nombre: '', precio: '', estado: 'activo', id_categoria: categories.length > 0 ? categories[0].id_categoria : '', codigo_de_barra: '' });

        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleStatusChange = async (productId, newStatus) => {
        // Optimistic update
        const originalProducts = [...products];
        setProducts(products.map(p => p.id_producto === productId ? { ...p, estado: newStatus } : p));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ estado: newStatus })
            });

            if (!response.ok) throw new Error('Error al actualizar estado');

        } catch (err) {
            // Revert on error
            toast.error('Error al actualizar el estado: ' + err.message);
        }
    };

    const handleViewHistory = async (product) => {
        setHistoryProduct(product);
        setIsHistoryModalOpen(true);
        setHistoryLoading(true);
        setPriceHistory([]);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${product.id_producto}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPriceHistory(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDeleteProduct = (product) => {
        setProductToDelete(product);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${productToDelete.id_producto}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al eliminar');

            setProducts(products.filter(p => p.id_producto !== productToDelete.id_producto));
            setDeleteModalOpen(false);
            setProductToDelete(null);

        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const getCategoryColor = (categoryName) => {
        if (!categoryName) return 'bg-slate-100 text-slate-600 border-slate-200';

        // Manual Overrides
        const name = categoryName.toLowerCase();
        if (name === 'comida') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (name === 'limpieza') return 'bg-pink-100 text-pink-700 border-pink-200';

        const colors = [
            'bg-blue-100 text-blue-700 border-blue-200',
            'bg-emerald-100 text-emerald-700 border-emerald-200',
            'bg-amber-100 text-amber-700 border-amber-200',
            'bg-purple-100 text-purple-700 border-purple-200',
            'bg-rose-100 text-rose-700 border-rose-200',
            'bg-indigo-100 text-indigo-700 border-indigo-200'
        ];

        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-heading">Productos</h2>
                    <p className="text-slate-500">Gestiona el inventario de productos comprados.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="h-full pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm bg-white text-slate-600 font-medium appearance-none cursor-pointer"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <FaCheckCircle size={12} />
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-full pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm bg-white text-slate-600 font-medium appearance-none cursor-pointer"
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map(cat => (
                                <option key={cat.id_categoria} value={cat.id_categoria}>
                                    {cat.nb_categoria}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <FaTag size={12} />
                        </div>
                    </div>

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
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Código</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Categoría</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Precio</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider">Estado</th>
                                <th className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando productos...</td></tr>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                    <tr key={product.id_producto} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold border border-indigo-100">
                                                    <FaBox />
                                                </div>
                                                {editingNameProduct === product.id_producto ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editNameValue}
                                                            autoFocus
                                                            onChange={(e) => setEditNameValue(e.target.value.toUpperCase())}
                                                            className="w-40 px-2 py-1 rounded border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm font-bold uppercase"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveName(product.id_producto);
                                                                if (e.key === 'Escape') setEditingNameProduct(null);
                                                            }}
                                                        />
                                                        <button onClick={() => handleSaveName(product.id_producto)} className="text-emerald-600 hover:text-emerald-700"><FaCheckCircle /></button>
                                                        <button onClick={() => setEditingNameProduct(null)} className="text-red-400 hover:text-red-500"><FaTimesCircle /></button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="flex items-center gap-2 group/name cursor-pointer"
                                                        onClick={() => handleEditNameClick(product)}
                                                        title="Click para editar nombre"
                                                    >
                                                        <span className="font-bold text-slate-800">{product.nombre}</span>
                                                        <span className="opacity-0 group-hover/name:opacity-100 transition-all duration-200 text-emerald-500 bg-emerald-50 p-1.5 rounded-md">
                                                            <FaPen size={10} />
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {editingBarcodeProduct === product.id_producto ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editBarcodeValue}
                                                        autoFocus
                                                        onChange={(e) => setEditBarcodeValue(e.target.value)}
                                                        className="w-32 px-2 py-1 rounded border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm font-mono"
                                                        placeholder="Escanea..."
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveBarcode(product.id_producto);
                                                            if (e.key === 'Escape') setEditingBarcodeProduct(null);
                                                        }}
                                                    />
                                                    <button onClick={() => handleSaveBarcode(product.id_producto)} className="text-emerald-600 hover:text-emerald-700"><FaCheckCircle /></button>
                                                    <button onClick={() => setEditingBarcodeProduct(null)} className="text-red-400 hover:text-red-500"><FaTimesCircle /></button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex items-center gap-2 group/barcode cursor-pointer hover:bg-slate-50 p-1 -ml-1 rounded-lg"
                                                    onClick={() => handleEditBarcodeClick(product)}
                                                    title="Click para editar código"
                                                >
                                                    {product.codigo_de_barra ? (
                                                        <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            {product.codigo_de_barra}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300 italic flex items-center gap-1">
                                                            <FaBarcode /> Sin código
                                                        </span>
                                                    )}
                                                    <span className="opacity-0 group-hover/barcode:opacity-100 transition-all duration-200 text-emerald-500">
                                                        <FaPen size={10} />
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-medium">
                                            {editingCategoryProduct === product.id_producto ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={editCategoryValue}
                                                        onChange={(e) => setEditCategoryValue(e.target.value)}
                                                        className="w-32 px-2 py-1 rounded border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-xs font-bold uppercase"
                                                        autoFocus
                                                        onBlur={() => { /* Optional: auto-save or close on blur */ }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveCategory(product.id_producto);
                                                            if (e.key === 'Escape') setEditingCategoryProduct(null);
                                                        }}
                                                    >
                                                        {categories.map(cat => (
                                                            <option key={cat.id_categoria} value={cat.id_categoria}>
                                                                {cat.nb_categoria}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button onClick={() => handleSaveCategory(product.id_producto)} className="text-emerald-600 hover:text-emerald-700"><FaCheckCircle /></button>
                                                    <button onClick={() => setEditingCategoryProduct(null)} className="text-red-400 hover:text-red-500"><FaTimesCircle /></button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="group/category cursor-pointer flex items-center gap-2"
                                                    onClick={() => handleEditCategoryClick(product)}
                                                    title="Click para editar categoría"
                                                >
                                                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getCategoryColor(product.categoria)}`}>
                                                        {product.categoria}
                                                    </span>
                                                    <span className="opacity-0 group-hover/category:opacity-100 transition-all duration-200 text-emerald-500 bg-emerald-50 p-1.5 rounded-md">
                                                        <FaPen size={12} />
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-800 font-bold font-mono">
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
                                                <div className="flex items-center gap-2 group/price cursor-pointer p-1 -ml-1 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap" onClick={() => handleEditPriceClick(product)}>
                                                    <span className="text-slate-400 text-xs font-sans">$</span>
                                                    <span className="font-black text-slate-900 text-base">{parseFloat(product.precio).toFixed(2)}</span>
                                                    <span className="opacity-0 group-hover/price:opacity-100 transition-all duration-200 text-emerald-500 bg-emerald-50 p-1 rounded-md">
                                                        <FaPen size={10} />
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
                                                    onClick={() => handleDeleteProduct(product)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                    title="Eliminar Producto"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewHistory(product)}
                                                    className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                                                    title="Ver historial de precios"
                                                >
                                                    <FaHistory size={14} />
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-400">
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
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                            placeholder="Ej. Camisa Polo"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Código de Barra (Opcional)</label>
                                    <div className="relative">
                                        <FaBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={formData.codigo_de_barra}
                                            onChange={e => setFormData({ ...formData, codigo_de_barra: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-mono"
                                            placeholder="Escanea aquí..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                                    <div className="relative">
                                        <FaBox className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            required
                                            value={formData.id_categoria}
                                            onChange={e => setFormData({ ...formData, id_categoria: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Seleccione Categoría...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id_categoria} value={cat.id_categoria}>
                                                    {cat.nb_categoria}
                                                </option>
                                            ))}
                                        </select>
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

                {isHistoryModalOpen && historyProduct && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsHistoryModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black flex items-center gap-2">
                                        <FaHistory className="text-indigo-400" />
                                        Historial de Precios
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{historyProduct.nombre}</p>
                                </div>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>

                            <div className="p-8">
                                {historyLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-slate-500 font-bold animate-pulse">Consultando base de datos...</p>
                                    </div>
                                ) : priceHistory.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                                            <FaBox size={40} />
                                        </div>
                                        <p className="text-slate-500 font-medium">No hay registros de compras para este producto aún.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-slate-100 pb-2">
                                            {priceHistory.map((entry, idx) => {
                                                const maxCost = Math.max(...priceHistory.map(e => parseFloat(e.precio_costo)));
                                                const height = maxCost > 0 ? (parseFloat(entry.precio_costo) / maxCost) * 100 : 0;

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                        <div className="absolute -top-10 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap">
                                                            Costo: ${parseFloat(entry.precio_costo).toFixed(2)}
                                                        </div>
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${height}%` }}
                                                            className="w-full bg-indigo-500 rounded-t-lg opacity-70 group-hover:opacity-100 transition-all shadow-lg shadow-indigo-100"
                                                        />
                                                        <div className="mt-2 text-[8px] font-bold text-slate-400 rotate-45 origin-left whitespace-nowrap">
                                                            {new Date(entry.fecha).toLocaleDateString('es-VE', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Precio Costo Inicial</div>
                                                <div className="text-xl font-black text-slate-800">${parseFloat(priceHistory[0].precio_costo).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                                <div className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-1">Último Precio Costo</div>
                                                <div className="text-xl font-black text-indigo-700 font-heading">
                                                    ${parseFloat(priceHistory[priceHistory.length - 1].precio_costo).toFixed(2)}
                                                    {priceHistory.length > 1 && (
                                                        <span className={`ml-2 text-xs flex inline-items items-center gap-0.5 ${parseFloat(priceHistory[priceHistory.length - 1].precio_costo) >= parseFloat(priceHistory[priceHistory.length - 2].precio_costo) ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                            {parseFloat(priceHistory[priceHistory.length - 1].precio_costo) >= parseFloat(priceHistory[priceHistory.length - 2].precio_costo) ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />}
                                                            {Math.abs(((parseFloat(priceHistory[priceHistory.length - 1].precio_costo) - parseFloat(priceHistory[priceHistory.length - 2].precio_costo)) / parseFloat(priceHistory[priceHistory.length - 2].precio_costo)) * 100).toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-white">
                                                    <tr className="text-slate-400 font-bold uppercase border-b border-slate-50 text-left">
                                                        <th className="pb-2">Fecha</th>
                                                        <th className="pb-2">Costo ($)</th>
                                                        <th className="pb-1 text-right">PVP ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {[...priceHistory].reverse().map((entry, i) => (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="py-2 text-slate-600 font-medium">{new Date(entry.fecha).toLocaleDateString('es-VE')}</td>
                                                            <td className="py-2 font-bold text-slate-800">${parseFloat(entry.precio_costo).toFixed(2)}</td>
                                                            <td className="py-2 text-right font-black text-indigo-600">${parseFloat(entry.precio_venta).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {deleteModalOpen && productToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setDeleteModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                    <FaTrash size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Producto?</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Estás a punto de eliminar <span className="font-bold text-slate-700">{productToDelete.nombre}</span>.
                                    Esta acción no se puede deshacer.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteModalOpen(false)}
                                        className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all text-sm"
                                    >
                                        Sí, Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductsPage;

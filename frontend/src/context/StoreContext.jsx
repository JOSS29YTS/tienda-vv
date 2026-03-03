import React, { createContext, useContext, useState, useEffect } from 'react';
import API_URL from '../config/api';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
    const { user } = useAuth();
    const [tiendas, setTiendas] = useState([]);
    const [selectedTienda, setSelectedTienda] = useState(null); // null = Global

    // Cargar tiendas disponibles
    useEffect(() => {
        const fetchTiendas = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/tiendas`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTiendas(data);
                }
            } catch (err) {
                console.error('Error cargando tiendas:', err);
            }
        };
        fetchTiendas();
    }, [user]);

    // Si el usuario tiene tienda asignada, forzar esa tienda
    useEffect(() => {
        if (user?.id_tienda) {
            // Usuario de tienda específica: solo puede ver su tienda
            const tienda = tiendas.find(t => t.id_tienda === user.id_tienda);
            if (tienda) setSelectedTienda(tienda);
        } else {
            // Admin/Dueño con acceso global: inicia en Global (null)
            setSelectedTienda(null);
        }
    }, [user, tiendas]);

    // ¿Puede el usuario cambiar de tienda? 
    // Los Administradores y Gerentes pueden cambiar siempre. 
    // Los Vendedores solo si no tienen una tienda fija asignada.
    const userRole = user?.rol?.toLowerCase() || '';
    const isAdminOrManager = userRole === 'administrador' || userRole === 'gerente';
    const canSwitchStore = isAdminOrManager || !user?.id_tienda;

    // Obtener el id_tienda efectivo para filtros
    // Si selectedTienda es null Y el usuario tiene tienda, usar la del usuario
    const effectiveTiendaId = selectedTienda?.id_tienda || user?.id_tienda || null;

    return (
        <StoreContext.Provider value={{
            tiendas,
            selectedTienda,
            setSelectedTienda,
            canSwitchStore,
            effectiveTiendaId,
            isGlobal: !effectiveTiendaId
        }}>
            {children}
        </StoreContext.Provider>
    );
};

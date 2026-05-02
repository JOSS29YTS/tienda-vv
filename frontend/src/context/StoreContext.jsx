import React, { createContext, useContext, useState, useEffect } from 'react';
import API_URL from '../config/api';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
    const { user } = useAuth();
    const [tiendas, setTiendas] = useState([]);
    const [selectedTienda, _setSelectedTienda] = useState(null); // null = Global

    const setSelectedTienda = (tienda) => {
        _setSelectedTienda(tienda);
        if (tienda) {
            localStorage.setItem('selectedTiendaId', tienda.id_tienda);
        } else {
            localStorage.removeItem('selectedTiendaId');
        }
    };

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

    // Restaurar la tienda seleccionada al cargar las tiendas
    useEffect(() => {
        if (tiendas.length === 0) return;

        if (user?.id_tienda) {
            // Usuario de tienda específica: solo puede ver su tienda
            const tienda = tiendas.find(t => t.id_tienda === user.id_tienda);
            if (tienda) setSelectedTienda(tienda);
        } else {
            // Admin/Dueño con acceso global: intentar restaurar de localStorage
            const savedTiendaId = localStorage.getItem('selectedTiendaId');
            if (savedTiendaId) {
                const tienda = tiendas.find(t => t.id_tienda === parseInt(savedTiendaId));
                if (tienda) {
                    _setSelectedTienda(tienda); // Set directly without overwriting localStorage again unnecessarily
                } else {
                    setSelectedTienda(null);
                }
            } else {
                // Inicia en Global por defecto si no hay nada guardado
                setSelectedTienda(null);
            }
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

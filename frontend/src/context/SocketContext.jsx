import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../config/api';
import { useStore } from './StoreContext';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { currentStore } = useStore();
    const { user } = useAuth();

    useEffect(() => {
        // Solo conectamos si hay un usuario logueado
        if (!user) return;

        // Extraer la URL base (sin /api si estuviera en la config)
        // Como tu API_URL es directamente la raíz (ej. http://localhost:3000), la usamos así.
        const baseUrl = API_URL;

        const newSocket = io(baseUrl, {
            withCredentials: true,
            // Puedes agregar parámetros extra aquí si necesitas
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ Conectado a Socket.io con ID:', newSocket.id);
        });

        // Limpiar al desmontar
        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // Efecto separado para manejar los "Rooms" cuando cambia la tienda seleccionada
    useEffect(() => {
        if (!socket || !currentStore) return;

        const tiendaId = currentStore.id_tienda;
        
        // Nos unimos a la sala de la tienda actual
        socket.emit('join_tienda', tiendaId);

        // Cuando la tienda cambie, nos salimos de la sala anterior (limpieza)
        return () => {
            socket.emit('leave_tienda', tiendaId);
        };
    }, [socket, currentStore]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

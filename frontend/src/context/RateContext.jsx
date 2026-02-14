import React, { createContext, useContext, useState, useEffect } from 'react';

const RateContext = createContext();

export const useRate = () => {
    return useContext(RateContext);
};

export const RateProvider = ({ children }) => {
    // Initialize from localStorage or default to 38.0
    const [rate, setRateState] = useState(() => {
        const saved = localStorage.getItem('globalRate');
        return saved ? parseFloat(saved) : 38.0;
    });

    // Fetch rate from backend on mount
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/config/rate');
                if (response.ok) {
                    const data = await response.json();
                    if (data.rate) {
                        setRateState(data.rate);
                        localStorage.setItem('globalRate', data.rate);
                    }
                }
            } catch (error) {
                console.error('Error fetching rate from backend:', error);
            }
        };

        fetchRate();
    }, []);

    const setRate = async (newRate) => {
        const numericRate = parseFloat(newRate);
        setRateState(numericRate);
        localStorage.setItem('globalRate', numericRate);

        // Sync to backend (optional, but good for consistency across users)
        try {
            await fetch('http://localhost:3000/api/config/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rate: numericRate })
            });
        } catch (error) {
            console.error('Error updating backend rate:', error);
        }
    };

    return (
        <RateContext.Provider value={{ rate, setRate }}>
            {children}
        </RateContext.Provider>
    );
};

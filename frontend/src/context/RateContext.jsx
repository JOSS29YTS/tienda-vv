import React, { createContext, useContext, useState, useEffect } from 'react';

const RateContext = createContext();

export const useRate = () => {
    return useContext(RateContext);
};

export const RateProvider = ({ children }) => {
    // Initialize from localStorage or default to 35.5 (or whatever default)
    const [rate, setRateState] = useState(() => {
        const saved = localStorage.getItem('globalRate');
        return saved ? parseFloat(saved) : 35.5;
    });

    const setRate = (newRate) => {
        setRateState(newRate);
        localStorage.setItem('globalRate', newRate);
    };

    // Optional: Sync with backend if needed, but for now client-side persistence is fine.

    return (
        <RateContext.Provider value={{ rate, setRate }}>
            {children}
        </RateContext.Provider>
    );
};

// ============================================================
// TEST UNITARIO: balanceUtils.test.js
// Descripción: Valida los cálculos financieros y validación de fondos en balanceUtils.js
// Ejecutar con: npm test
// ============================================================

const balanceUtils = require('./balanceUtils');

// Mockear getMethodBalances para aislar las pruebas de checkSufficientFunds sin conexión de DB
const getMethodBalancesSpy = jest.spyOn(balanceUtils, 'getMethodBalances').mockImplementation(async () => {
    return {
        1: { id: 1, name: 'Efectivo ($)', balance: 10.00, type: 'USD' },
        2: { id: 2, name: 'Punto de Venta', balance: 100.00, type: 'BS' }
    };
});

describe('balanceUtils - checkSufficientFunds (Validación de Fondos)', () => {
    
    afterAll(() => {
        // Restaurar la implementación original al finalizar las pruebas
        getMethodBalancesSpy.mockRestore();
    });

    it('debe retornar ok: true si hay fondos suficientes en USD', async () => {
        const result = await balanceUtils.checkSufficientFunds(1, 5.00, 'USD');
        expect(result.ok).toBe(true);
    });

    it('debe retornar ok: false con mensaje formateado si los fondos USD son insuficientes', async () => {
        const result = await balanceUtils.checkSufficientFunds(1, 15.00, 'USD');
        expect(result.ok).toBe(false);
        expect(result.message).toContain('Fondos insuficientes en Efectivo ($). Disponible: $ 10.00');
    });

    it('debe retornar ok: true para pagos en BS si entra en la tolerancia blanda (0.05)', async () => {
        // Saldo Bs. 100.00, solicita Bs. 100.04 (dentro de tolerancia de 0.05)
        const result = await balanceUtils.checkSufficientFunds(2, 100.04, 'BS');
        expect(result.ok).toBe(true);
    });

    it('debe retornar ok: false si el monto en BS supera la tolerancia blanda (0.05)', async () => {
        // Saldo Bs. 100.00, solicita Bs. 100.06 (supera la tolerancia de 0.05)
        const result = await balanceUtils.checkSufficientFunds(2, 100.06, 'BS');
        expect(result.ok).toBe(false);
        // es-VE usa coma para decimales y punto para miles
        expect(result.message).toContain('Fondos insuficientes en Punto de Venta. Disponible: Bs. 100,00');
    });

    it('debe lanzar un error si el método de pago no existe en la DB', async () => {
        await expect(balanceUtils.checkSufficientFunds(99, 10.00, 'USD'))
            .rejects.toThrow('Método de pago no encontrado');
    });
});

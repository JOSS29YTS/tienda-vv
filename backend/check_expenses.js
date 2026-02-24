const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 30000
    });

    console.log('--- COMPRAS DE FEBRERO 2026 ---');
    const [compras] = await c.query(
        `SELECT id_compra, total_compra, fecha_compra 
         FROM compra 
         WHERE MONTH(fecha_compra) = 2 AND YEAR(fecha_compra) = 2026 
         ORDER BY fecha_compra`
    );
    let suma = 0;
    compras.forEach(r => {
        suma += parseFloat(r.total_compra);
        console.log(`ID: ${r.id_compra} | Total: $${parseFloat(r.total_compra).toFixed(2)} | Fecha: ${r.fecha_compra}`);
    });
    console.log(`TOTAL COMPRAS: $${suma.toFixed(2)} (${compras.length} compras)`);

    console.log('\n--- PAGOS PRESTAMOS DE FEBRERO 2026 ---');
    const [prestamos] = await c.query(
        `SELECT pp.monto, pp.tasa_dia, mp.nb_metodo_pago, pp.fecha_pago
         FROM pago_prestamo pp
         JOIN prestamo pr ON pp.id_prestamo = pr.id_prestamo
         JOIN metodo_pago mp ON pp.id_metodo_pago = mp.id_metodo_pago
         WHERE MONTH(pp.fecha_pago) = 2 AND YEAR(pp.fecha_pago) = 2026`
    );
    const USD_KEYWORDS = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', 'EFECTIVO ($)'];
    let sumaPrestamos = 0;
    prestamos.forEach(r => {
        const amt = parseFloat(r.monto);
        const rate = parseFloat(r.tasa_dia) || 1;
        const isUsd = USD_KEYWORDS.some(k => r.nb_metodo_pago.toUpperCase().includes(k));
        const usd = isUsd ? amt : amt / rate;
        sumaPrestamos += usd;
        console.log(`Monto: ${amt} | Método: ${r.nb_metodo_pago} | isUSD: ${isUsd} | USD: $${usd.toFixed(2)} | Fecha: ${r.fecha_pago}`);
    });
    console.log(`TOTAL PRESTAMOS USD: $${sumaPrestamos.toFixed(2)}`);

    console.log('\n--- GASTOS OPERATIVOS DE FEBRERO 2026 ---');
    const [gastos] = await c.query(
        `SELECT pf.monto, tpf.nb_tipo_pago_fijo, pf.fecha_pago_fijo
         FROM pago_fijo pf
         JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
         WHERE MONTH(pf.fecha_pago_fijo) = 2 AND YEAR(pf.fecha_pago_fijo) = 2026
         AND tpf.nb_tipo_pago_fijo != 'AVANCE DE EFECTIVO'`
    );
    let sumaGastos = 0;
    gastos.forEach(r => {
        sumaGastos += parseFloat(r.monto);
        console.log(`Monto: $${parseFloat(r.monto).toFixed(2)} | Tipo: ${r.nb_tipo_pago_fijo} | Fecha: ${r.fecha_pago_fijo}`);
    });
    console.log(`TOTAL GASTOS: $${sumaGastos.toFixed(2)}`);

    console.log(`\n=== RESUMEN ===`);
    console.log(`Compras: $${suma.toFixed(2)}`);
    console.log(`Gastos: $${sumaGastos.toFixed(2)}`);
    console.log(`Préstamos: $${sumaPrestamos.toFixed(2)}`);
    console.log(`TOTAL EGRESOS: $${(suma + sumaGastos + sumaPrestamos).toFixed(2)}`);

    await c.end();
}

check().catch(e => console.error(e.message));

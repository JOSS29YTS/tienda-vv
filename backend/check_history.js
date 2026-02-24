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

    // Same query as historyController
    console.log('=== PAGOS DE VENTAS (detalle_pago) ===');
    const [pagos] = await c.query(`
        SELECT 
            p.fecha_pago,
            mp.nb_metodo_pago as metodo, 
            dp.monto,
            p.tasa_dia,
            dv.id_detalle_venta,
            v.id_venta
        FROM pago p
        JOIN detalle_pago dp ON p.id_pago = dp.id_pago
        JOIN metodo_pago mp ON dp.id_metodo_pago = mp.id_metodo_pago
        JOIN detalle_venta dv ON p.id_detalle_venta = dv.id_detalle_venta
        JOIN venta v ON dv.id_venta = v.id_venta
        WHERE UPPER(mp.nb_metodo_pago) != 'PENDIENTE POR COBRAR'
        AND DATE(DATE_SUB(p.fecha_pago, INTERVAL 4 HOUR)) = '2026-02-23'
        ORDER BY p.fecha_pago, mp.nb_metodo_pago
    `);

    let byMethod = {};
    pagos.forEach(r => {
        const m = r.metodo;
        if (!byMethod[m]) byMethod[m] = { total: 0, count: 0, items: [] };
        byMethod[m].total += parseFloat(r.monto);
        byMethod[m].count++;
        byMethod[m].items.push({
            monto: parseFloat(r.monto).toFixed(4),
            venta: r.id_venta,
            detalle: r.id_detalle_venta,
            fecha: r.fecha_pago
        });
    });

    for (const [method, data] of Object.entries(byMethod)) {
        console.log(`\n${method}: $${data.total.toFixed(2)} (${data.count} pagos)`);
        data.items.forEach(i => {
            console.log(`  - $${i.monto} | Venta #${i.venta} | Detalle #${i.detalle} | ${i.fecha}`);
        });
    }

    console.log('\n=== AVANCES DE EFECTIVO ===');
    const [avances] = await c.query(`
        SELECT pf.monto, mp.nb_metodo_pago, pf.fecha_pago_fijo, pf.tasa_dia
        FROM pago_fijo pf
        JOIN metodo_pago mp ON pf.id_metodo_pago = mp.id_metodo_pago
        JOIN tipo_pago_fijo tpf ON pf.id_tipo_pago_fijo = tpf.id_tipo_pago_fijo
        WHERE tpf.nb_tipo_pago_fijo = 'AVANCE DE EFECTIVO'
        AND DATE(DATE_SUB(pf.fecha_pago_fijo, INTERVAL 4 HOUR)) = '2026-02-23'
    `);
    avances.forEach(a => {
        console.log(`  ${a.nb_metodo_pago}: -$${parseFloat(a.monto).toFixed(2)} | Tasa: ${a.tasa_dia}`);
    });
    if (avances.length === 0) console.log('  (ninguno)');

    // Summary
    console.log('\n=== RESUMEN POR MÉTODO ===');
    let grandTotalUsd = 0;
    let grandTotalBs = 0;
    const USD_KEYS = ['DIVISA', 'ZELLE', 'BINANCE', 'PAYPAL', 'USD', 'DOLAR', '$'];
    for (const [method, data] of Object.entries(byMethod)) {
        const isUsd = USD_KEYS.some(k => method.toUpperCase().includes(k));
        const rate = 405.35; // today's rate
        if (isUsd) {
            console.log(`${method}: $${data.total.toFixed(2)} (USD)`);
            grandTotalUsd += data.total;
        } else {
            const bs = data.total * rate;
            console.log(`${method}: $${data.total.toFixed(2)} → Bs ${bs.toFixed(2)}`);
            grandTotalBs += bs;
        }
    }
    console.log(`\nVENTA $: $${grandTotalUsd.toFixed(2)}`);
    console.log(`VENTA BS: Bs ${grandTotalBs.toFixed(2)}`);
    console.log(`TOTAL ($): $${(grandTotalUsd + grandTotalBs / 405.35).toFixed(2)}`);
    console.log(`TOTAL (Bs): Bs ${(grandTotalBs + grandTotalUsd * 405.35).toFixed(2)}`);

    await c.end();
}

check().catch(e => console.error(e.message));

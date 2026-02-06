const pool = require('./database/db');

const paymentMethods = [
    "DIVISAS",
    "EFECTIVO",
    "PAGO MOVIL",
    "PENDIENTE POR COBRAR",
    "PUNTO DE VENTA",
    "TRANSFERENCIA",
    "BIOPAGO",
    "MIXTO"
];

async function populateTarget() {
    try {
        console.log("Checking payment methods...");

        // Get existing methods to avoid duplicates
        const [existing] = await pool.query("SELECT nb_metodo_pago FROM metodo_pago");
        const existingNames = existing.map(row => row.nb_metodo_pago);

        for (const method of paymentMethods) {
            if (!existingNames.includes(method)) {
                await pool.query("INSERT INTO metodo_pago (nb_metodo_pago) VALUES (?)", [method]);
                console.log(`Inserted: ${method}`);
            } else {
                console.log(`Skipped (already exists): ${method}`);
            }
        }

        console.log("Payment methods population complete.");
        process.exit(0);
    } catch (error) {
        console.error("Error populating payment methods:", error);
        process.exit(1);
    }
}

populateTarget();

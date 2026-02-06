const pool = require('./database/db');
require('dotenv').config();
const dashboardController = require('./controllers/dashboardController');

// Mock request and response
const req = {};
const res = {
    json: (data) => {
        console.log('--- API Response ---');
        console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => {
        console.log('Status Code:', code);
        return {
            json: (data) => console.log('Error JSON:', data)
        };
    }
};

async function testDashboardController() {
    try {
        console.log('Testing dashboardController.getDashboardStats...');
        await dashboardController.getDashboardStats(req, res);
    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        // give it a moment for queries to finish if not awaited properly in controller (they are awaited though)
        setTimeout(() => process.exit(), 1000);
    }
}

testDashboardController();

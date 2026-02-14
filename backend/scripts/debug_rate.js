const axios = require('axios');

async function testApi() {
    try {
        console.log('Testing API: https://pydolarvenezuela-api.vercel.app/api/v1/dollar?monitor=bcv (FAILED BEFORE)');

        console.log('Testing ALTERNATIVE API: https://ve.dolarapi.com/v1/dolares/oficial');
        const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response data:', error.response.data);
        }
    }
}

testApi();

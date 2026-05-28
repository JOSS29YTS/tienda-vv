const isDemoMode = () => process.env.DEMO_MODE === 'true'
const getDemoEmail = () => (process.env.DEMO_EMAIL || 'admin@tiendavv.com').toLowerCase()
module.exports = { isDemoMode, getDemoEmail }

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                primary: ['"Outfit"', 'sans-serif'],
                heading: ['"DM Sans"', 'sans-serif'],
            },
            colors: {
                venalta: {
                    primary: '#059669', // emerald-600
                    dark: '#064e3b',    // emerald-900
                    light: '#34d399',   // emerald-400
                }
            }
        },
    },
    plugins: [],
}

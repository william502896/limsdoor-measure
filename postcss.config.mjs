/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
        "@tailwindcss/postcss": {},
        autoprefixer: {}, // Autoprefixer is optional with v4 but keeping it is fine
    },
};

export default config;

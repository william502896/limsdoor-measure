/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}", // just in case
    ],
    extend: {
        colors: {
            // Semantic Colors
            primary: "rgb(var(--color-primary) / <alpha-value>)",
            secondary: "rgb(var(--color-secondary) / <alpha-value>)",
            accent: "rgb(var(--color-accent) / <alpha-value>)",

            // Backgrounds & Surfaces
            background: "rgb(var(--color-background) / <alpha-value>)", // Base Main BG
            surface: "rgb(var(--color-surface) / <alpha-value>)",       // Card / Sidebar BG

            // Text
            "brand-text": "rgb(var(--color-text) / <alpha-value>)",
            "brand-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        },
        borderRadius: {
            "btn-custom": "var(--radius-btn)",
            "input-custom": "var(--radius-input)",
        },
        fontFamily: {
            title: ["var(--font-title)", "sans-serif"],
            body: ["var(--font-body)", "sans-serif"],
        }
    },
    plugins: [],
};

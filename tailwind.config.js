/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        artesanal: {
          bg: "#FAF6EF",       // Fundo bege claro
          card: "#4E2114",     // Marrom terroso do card
          primary: "#3D180E",  // Marrom escuro dos textos principais e botões
          accent: "#D45B28",   // Terracota
          gold: "#E09B31",     // Amarelo/Dourado dos selos
          green: "#0B8054",    // Verde do selo de autenticidade
          muted: "#6B5E57"     // Texto secundário
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
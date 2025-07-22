/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        fadeInDown: {
          from: { opacity: "0", transform: "translate(-50%, -20px)" },
          to: { opacity: "1", transform: "translate(-50%, 0)" },
        },
      },
      animation: {
        "fade-in-down": "fadeInDown 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

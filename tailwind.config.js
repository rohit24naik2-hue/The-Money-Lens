/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5EFE0",
        ink: "#1A1A1A",
        urgent: "#E0241B",
        amber: "#F4B400",
        energy: "#F26A1B",
        teal: "#0FA8B0",
        positive: "#2FA94F",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

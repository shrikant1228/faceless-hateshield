/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0D12",
        panel: "#12151C",
        line: "#20242F",
        signal: "#3DFFB2", // arena-online green
        alert: "#FF4D6A", // hateshield alert
        muted: "#7A8194",
      },
      fontFamily: {
        display: ["'JetBrains Mono'", "monospace"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

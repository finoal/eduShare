/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          primary: "#eb2f96",
          "primary-content": "#fff0f6",
          secondary: "#f759ab",
          "secondary-content": "#fff0f6",
          accent: "#c41d7f",
          "accent-content": "#fff0f6",
          neutral: "#ffadd2",
          "neutral-content": "#c41d7f",
          "base-100": "#fff0f6",
          "base-200": "#ffadd2",
          "base-300": "#ffa6d0",
          "base-content": "#c41d7f",
          info: "#eb2f96",
          success: "#52c41a",
          warning: "#faad14",
          error: "#f5222d",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        dark: {
          primary: "#eb2f96",
          "primary-content": "#fff0f6",
          secondary: "#f759ab",
          "secondary-content": "#fff0f6",
          accent: "#ffa6d0",
          "accent-content": "#c41d7f",
          neutral: "#ffadd2",
          "neutral-content": "#eb2f96",
          "base-100": "#c41d7f",
          "base-200": "#a3156a",
          "base-300": "#7d0e51",
          "base-content": "#fff0f6",
          info: "#ffadd2",
          success: "#52c41a",
          warning: "#faad14",
          error: "#f5222d",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      colors: {
        // 添加与区块链分析页面一致的粉色系统
        pink: {
          100: "#fff0f6",
          200: "#ffadd2",
          300: "#ffa6d0",
          400: "#ff85c0",
          500: "#f759ab",
          600: "#eb2f96",
          700: "#c41d7f",
          800: "#a3156a",
          900: "#7d0e51"
        }
      },
    },
  },
};

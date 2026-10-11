/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F3F1FF", 100: "#E8E4FF", 200: "#D4CCFF", 300: "#B7AAFF", 400: "#8F7CF5",
          500: "#6D58E8", 600: "#5842D1", 700: "#4733AB", 800: "#392A87", 900: "#271D5C", 950: "#181238",
        },
        mist: {
          50: "#FAF9FD", 100: "#F4F3F9", 200: "#E8E6F0", 300: "#D5D2E2", 400: "#A9A5BF",
          500: "#7C7894", 600: "#5E5A78", 700: "#46425E", 800: "#2E2B44", 900: "#1A1633",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 1px 2px rgba(39,29,92,.06), 0 8px 24px -12px rgba(39,29,92,.18)",
      },
    },
  },
  plugins: [],
};

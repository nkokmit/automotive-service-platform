/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Bảng màu chính của dự án (chỉ 4 màu theo yêu cầu)
        primary: {
          DEFAULT: "#1D4533",
          hover: "#15382A",
          light: "#2A5A45",
        },
        accent: {
          DEFAULT: "#F9D2BA",
          hover: "#F4BE9C",
        },
        bgsoft: {
          DEFAULT: "#F7EAE0",
          dark: "#F0DCC8",
        },
        ink: {
          DEFAULT: "#5E3122",
          light: "#7A4A37",
          muted: "#9A6B58",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(94, 49, 34, 0.08), 0 1px 2px rgba(94, 49, 34, 0.04)",
        cardHover:
          "0 4px 12px rgba(94, 49, 34, 0.10), 0 2px 4px rgba(94, 49, 34, 0.06)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
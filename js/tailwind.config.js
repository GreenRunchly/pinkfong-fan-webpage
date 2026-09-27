// Tailwind runtime config for fast/on-the-fly editing.
// Preflight is disabled so Tailwind never resets the preserved original design.
tailwind.config = {
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        ink: "#49266c",
        purple: "#9d72ec",
        violet: "#b38af3",
        pink: "#e5a8e8",
        blush: "#ffc6ec",
        periwinkle: "#958bff",
      },
      fontFamily: {
        rounded: [
          "ui-rounded",
          '"Arial Rounded MT Bold"',
          '"Trebuchet MS"',
          "sans-serif",
        ],
      },
    },
  },
};

// eslint.config.mjs
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,

  // ✅ ignores (flat config)
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },

  // ✅ overrides (precisa vir DEPOIS para ganhar)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

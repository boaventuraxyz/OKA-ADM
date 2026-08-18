import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "bin/**",
      "obj/**",
      "packages/**",
      "public/legacy/**"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript
];

export default config;

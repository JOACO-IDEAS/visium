import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "services/**", "prototypes/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;

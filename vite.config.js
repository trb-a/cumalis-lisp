import path from "path";
import { defineConfig } from "vite";

// Note: Vite enables typescript support, esm convert & terser by default.
module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Scheme',
      fileName: (format) => `index.${format}.js`,
      formats: ['esm', 'cjs', 'umd']
    }
  }
});

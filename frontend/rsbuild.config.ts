import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
    plugins: [pluginReact()],
    html: {
        template: "./index.html",
    },
    source: {
        entry: {
            index: "./src/main.tsx",
        },
    },
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "http://localhost:3002",
                changeOrigin: true,
            },
        },
    },
    output: {
        distPath: {
            root: "dist",
        },
    },
    tools: {
        rspack: {
            module: {
                rules: [
                    {
                        test: /\.wasm$/,
                        type: "asset/resource",
                    },
                ],
            },
            experiments: {
                asyncWebAssembly: true,
            },
        },
    },
});

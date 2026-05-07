
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/supabaseClient.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __FAVICON_URL__: '"https://i.postimg.cc/P57rx2YZ/25ef81a4-22e4-4c1d-a14d-55270436a2ef.png"'
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    target: "es2015",
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          routing: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
          radix: ['@radix-ui/react-toast', '@radix-ui/react-tooltip', '@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-dropdown-menu'],
          icons: ['lucide-react'],
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const ext = assetInfo.name.split('.').pop() || '';
          if (/png|jpe?g|svg|gif|webp|avif/i.test(ext)) return `assets/images/[name]-[hash][extname]`;
          if (/css/i.test(ext)) return `assets/css/[name]-[hash][extname]`;
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
  optimizeDeps: {
    exclude: [],
  }
}));

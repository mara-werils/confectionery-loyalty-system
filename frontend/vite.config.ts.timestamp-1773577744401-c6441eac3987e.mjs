// vite.config.ts
import { defineConfig } from "file:///Users/marleshkaa./Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Documents/AITU/Diploma%20Project/Development%20and%20Implementation%20of%20a%20Loyalty%20System%20for%20a%20Confectionery%20Based%20on%20Smart%20Contracts/node_modules/vite/dist/node/index.js";
import react from "file:///Users/marleshkaa./Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Documents/AITU/Diploma%20Project/Development%20and%20Implementation%20of%20a%20Loyalty%20System%20for%20a%20Confectionery%20Based%20on%20Smart%20Contracts/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { nodePolyfills } from "file:///Users/marleshkaa./Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Documents/AITU/Diploma%20Project/Development%20and%20Implementation%20of%20a%20Loyalty%20System%20for%20a%20Confectionery%20Based%20on%20Smart%20Contracts/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_dirname = "/Users/marleshkaa./Library/Mobile Documents/com~apple~CloudDocs/Documents/AITU/Diploma Project/Development and Implementation of a Loyalty System for a Confectionery Based on Smart Contracts/frontend";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer"],
      globals: {
        Buffer: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
      "@pages": path.resolve(__vite_injected_original_dirname, "./src/pages"),
      "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
      "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
      "@store": path.resolve(__vite_injected_original_dirname, "./src/store"),
      "@types": path.resolve(__vite_injected_original_dirname, "./src/types"),
      "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils")
    }
  },
  server: {
    port: 5173,
    host: true,
    // Разрешить доступ с любых хостов
    allowedHosts: [
      ".trycloudflare.com"
      // Разрешить все домены Cloudflare
    ],
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api/, "")
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          ton: ["@tonconnect/ui-react"],
          charts: ["recharts"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFybGVzaGthYS4vTGlicmFyeS9Nb2JpbGUgRG9jdW1lbnRzL2NvbX5hcHBsZX5DbG91ZERvY3MvRG9jdW1lbnRzL0FJVFUvRGlwbG9tYSBQcm9qZWN0L0RldmVsb3BtZW50IGFuZCBJbXBsZW1lbnRhdGlvbiBvZiBhIExveWFsdHkgU3lzdGVtIGZvciBhIENvbmZlY3Rpb25lcnkgQmFzZWQgb24gU21hcnQgQ29udHJhY3RzL2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWFybGVzaGthYS4vTGlicmFyeS9Nb2JpbGUgRG9jdW1lbnRzL2NvbX5hcHBsZX5DbG91ZERvY3MvRG9jdW1lbnRzL0FJVFUvRGlwbG9tYSBQcm9qZWN0L0RldmVsb3BtZW50IGFuZCBJbXBsZW1lbnRhdGlvbiBvZiBhIExveWFsdHkgU3lzdGVtIGZvciBhIENvbmZlY3Rpb25lcnkgQmFzZWQgb24gU21hcnQgQ29udHJhY3RzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9tYXJsZXNoa2FhLi9MaWJyYXJ5L01vYmlsZSUyMERvY3VtZW50cy9jb20lN0VhcHBsZSU3RUNsb3VkRG9jcy9Eb2N1bWVudHMvQUlUVS9EaXBsb21hJTIwUHJvamVjdC9EZXZlbG9wbWVudCUyMGFuZCUyMEltcGxlbWVudGF0aW9uJTIwb2YlMjBhJTIwTG95YWx0eSUyMFN5c3RlbSUyMGZvciUyMGElMjBDb25mZWN0aW9uZXJ5JTIwQmFzZWQlMjBvbiUyMFNtYXJ0JTIwQ29udHJhY3RzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBub2RlUG9seWZpbGxzKHtcbiAgICAgIGluY2x1ZGU6IFsnYnVmZmVyJ10sXG4gICAgICBnbG9iYWxzOiB7XG4gICAgICAgIEJ1ZmZlcjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAnQHBhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BhZ2VzJyksXG4gICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXG4gICAgICAnQHNlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXG4gICAgICAnQHN0b3JlJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0b3JlJyksXG4gICAgICAnQHR5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXG4gICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiB0cnVlLCAvLyBcdTA0MjBcdTA0MzBcdTA0MzdcdTA0NDBcdTA0MzVcdTA0NDhcdTA0MzhcdTA0NDJcdTA0NEMgXHUwNDM0XHUwNDNFXHUwNDQxXHUwNDQyXHUwNDQzXHUwNDNGIFx1MDQ0MSBcdTA0M0JcdTA0NEVcdTA0MzFcdTA0NEJcdTA0NDUgXHUwNDQ1XHUwNDNFXHUwNDQxXHUwNDQyXHUwNDNFXHUwNDMyXG4gICAgYWxsb3dlZEhvc3RzOiBbXG4gICAgICAnLnRyeWNsb3VkZmxhcmUuY29tJywgLy8gXHUwNDIwXHUwNDMwXHUwNDM3XHUwNDQwXHUwNDM1XHUwNDQ4XHUwNDM4XHUwNDQyXHUwNDRDIFx1MDQzMlx1MDQ0MVx1MDQzNSBcdTA0MzRcdTA0M0VcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NEIgQ2xvdWRmbGFyZVxuICAgIF0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfQVBJX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJycpLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgcXVlcnk6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXG4gICAgICAgICAgdG9uOiBbJ0B0b25jb25uZWN0L3VpLXJlYWN0J10sXG4gICAgICAgICAgY2hhcnRzOiBbJ3JlY2hhcnRzJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcblxuXG5cblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5eUIsU0FBUyxvQkFBb0I7QUFDdDBCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFIOUIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFFBQVE7QUFBQSxNQUNsQixTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUNwQyxlQUFlLEtBQUssUUFBUSxrQ0FBVyxrQkFBa0I7QUFBQSxNQUN6RCxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDL0MsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLGFBQWEsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLE1BQ3JELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDL0MsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLElBQ2pEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixjQUFjO0FBQUEsTUFDWjtBQUFBO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUSxRQUFRLElBQUksZ0JBQWdCO0FBQUEsUUFDcEMsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDOUM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUNqRCxPQUFPLENBQUMsdUJBQXVCO0FBQUEsVUFDL0IsS0FBSyxDQUFDLHNCQUFzQjtBQUFBLFVBQzVCLFFBQVEsQ0FBQyxVQUFVO0FBQUEsUUFDckI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o necessário pra rodar (server.js + deps usadas) numa imagem
  // Docker enxuta. Usado no Dockerfile de produção (deploy na VPS).
  output: "standalone",
  experimental: {
    serverActions: {
      // Padrão é 1 MB. Comprovantes (imagem/PDF) podem passar disso; o
      // tamanho real é validado de novo dentro da action (máx 5 MB).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

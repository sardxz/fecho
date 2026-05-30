import { customAlphabet } from "nanoid";

// Sufixo curto e sem caracteres ambiguos para garantir unicidade do slug
// (decisao arquitetural #5: slug = base do nome + nanoid).
const suffix = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export function slugify(name: string): string {
  const base = name
    .normalize("NFKD") // separa acentos das letras
    .replace(/\p{Diacritic}/gu, "") // remove os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // troca o que nao e letra/numero por hifen
    .replace(/^-+|-+$/g, "") // tira hifens das pontas
    .slice(0, 40);

  return `${base || "grupo"}-${suffix()}`;
}

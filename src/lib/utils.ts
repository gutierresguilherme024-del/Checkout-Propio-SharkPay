import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // Se for URL completa ou base64, usar direto
  if (clean.startsWith('http') || clean.startsWith('data:')) return clean;

  const base = 'https://tcthjnpqjlifmuqipwhq.supabase.co';

  // Limpar caminhos que já contenham a estrutura de storage para evitar duplicação
  let path = clean.replace(/^\/+/, '');
  if (path.includes('storage/v1/object/public/')) {
    path = path.split('storage/v1/object/public/')[1];
  }

  // Se já tiver bucket no início, retornar URL completa
  if (path.startsWith('imagens-produtos/') || path.startsWith('produtos-pdf/')) {
    return `${base}/storage/v1/object/public/${path}`;
  }

  // Fallback: assume que está no bucket imagens-produtos para imagens
  return `${base}/storage/v1/object/public/imagens-produtos/${path}`;
}

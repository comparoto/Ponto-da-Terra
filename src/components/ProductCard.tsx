import React from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';
import type { FeaturedProduct } from '../types';

interface ProductCardProps {
  product: FeaturedProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Moldura do Card com efeito terroso */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#6E3019] to-[#3D180E] p-1 shadow-2xl border border-[#8C4328]/30">
        <div className="relative aspect-[4/3] sm:aspect-[1/1] w-full rounded-xl overflow-hidden group">
          
          {/* Imagem do Produto (ou gradiente simulado de fallback) */}
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fallback para estilo barro visual caso a imagem falhe
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {/* Sombra interna/overlay para legibilidade dos textos */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Tag de Destaque */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-[#E09B31] text-[#220E08] font-black text-[11px] uppercase tracking-wider rounded-md shadow-md">
              {product.tag}
            </span>
          </div>

          {/* Detalhes do Produto */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
            <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
              {product.title}
            </h3>
            <div className="flex items-center gap-1.5 text-stone-300 text-xs sm:text-sm">
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{product.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selo de Autenticidade Flutuante (Bottom Left Overlay) */}
      {product.verified && (
        <div className="absolute -bottom-6 left-4 sm:-left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-stone-200 flex items-center gap-3 z-10 max-w-xs">
          <div className="w-9 h-9 rounded-lg bg-[#0B8054] flex items-center justify-center text-white shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-900 leading-tight">
              Selo de Autenticidade
            </p>
            <p className="text-[11px] text-stone-500 font-medium">
              Origem 100% Verificada
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
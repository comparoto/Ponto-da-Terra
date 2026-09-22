import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { FeaturedProduct } from '../types';

interface ProductCardProps {
  product: FeaturedProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-black bg-gradient-to-br from-[#7C3A1D] to-[#3D180E] shadow-[4px_4px_0px_#000] group">
      
      {/* Imagem do Produto */}
      <img
        src={product.imageUrl}
        alt={product.title}
        className="w-full h-[360px] sm:h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Overlay escuro inferior */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-5">
        
        {/* Espaço Superior Livre */}
        <div />

        {/* Informações da Base */}
        <div className="space-y-2">
          {/* Tag "DESTAQUE DA SEMANA" */}
          <div className="inline-block bg-[#E09B31] text-[#3D180E] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-md border border-black shadow-sm">
            {product.tag}
          </div>

          <h3 className="font-serif font-black text-xl text-white tracking-wide leading-snug">
            {product.title}
          </h3>
          
          <p className="text-stone-300 text-xs font-medium">
            {product.location}
          </p>
        </div>
      </div>

      {/* Selo de Autenticidade Flutuante (estilo Imagem 1) */}
      {product.verified && (
        <div className="absolute -bottom-2 -left-2 bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000] flex items-center gap-2.5 z-20">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-800 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-stone-900 leading-none">
              Selo de Autenticidade
            </h4>
            <p className="text-[8px] text-stone-500 font-semibold mt-0.5">
              Origem 100% Verificada
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCard;
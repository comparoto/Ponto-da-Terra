import React from 'react';
import { Search, ShoppingBag, Store } from 'lucide-react';

// =========================================================================
// ADIÇÃO: Componente vetorial estilizado da Bandeira de Pernambuco
// =========================================================================
const PernambucoFlagIcon = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg
    viewBox="0 0 36 36"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#pe-flag-clip-nav)">
      {/* Campo Superior Azul */}
      <rect width="36" height="18" fill="#1E3A8A" />
      {/* Campo Inferior Branco */}
      <rect y="18" width="36" height="18" fill="#FFFFFF" />
      
      {/* Arco-íris (Vermelho, Amarelo, Verde) */}
      <path d="M 3 18 A 15 15 0 0 1 33 18" stroke="#DC2626" strokeWidth="3" fill="none" />
      <path d="M 6.5 18 A 11.5 11.5 0 0 1 29.5 18" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
      <path d="M 10 18 A 8 8 0 0 1 26 18" stroke="#10B981" strokeWidth="2" fill="none" />
      
      {/* Sol Central */}
      <circle cx="18" cy="18" r="2.5" fill="#F59E0B" />
      
      {/* Estrela Superior */}
      <polygon points="18,3 18.9,5.8 21.8,5.8 19.4,7.5 20.3,10.2 18,8.5 15.7,10.2 16.6,7.5 14.2,5.8 17.1,5.8" fill="#F59E0B" />
      
      {/* Cruz Vermelha Inferior */}
      <rect x="16.5" y="21" width="3" height="11" fill="#DC2626" stroke="#DC2626" strokeWidth="0.5" />
      <rect x="12.5" y="24.5" width="11" height="3" fill="#DC2626" stroke="#DC2626" strokeWidth="0.5" />
    </g>
    <defs>
      <clipPath id="pe-flag-clip-nav">
        <rect width="36" height="36" rx="8" />
      </clipPath>
    </defs>
  </svg>
);

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#FAF6EF]/95 backdrop-blur-md border-b border-stone-200/80">
      {/* Barra de cores do Estado no topo */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-amber-400 to-red-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* ========================================================================= */}
        {/* ALTERAÇÃO INÍCIO: Logo com o novo ícone estilizado da Bandeira           */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-11 h-11 bg-[#3D180E] rounded-xl flex items-center justify-center p-1 shadow-md hover:scale-105 transition-transform">
            <PernambucoFlagIcon className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-lg sm:text-xl text-[#3D180E] tracking-tight leading-none">
              MÃOS DE PE
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#E09B31] tracking-widest uppercase mt-0.5">
              ORIGEM & TRADIÇÃO
            </span>
          </div>
        </div>
        {/* ========================================================================= */}
        {/* ALTERAÇÃO FIM                                                            */}
        {/* ========================================================================= */}

        {/* Campo de Busca Central */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Busque por mestre, peças de barro, renda..."
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-stone-300/80 rounded-full text-xs font-medium text-[#3D180E] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E09B31] focus:bg-white shadow-inner"
          />
        </div>

        {/* Botões do Lado Direito */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F3E8D3] hover:bg-[#EBDCBF] text-[#3D180E] border border-[#E09B31]/30 font-bold text-xs transition-colors shadow-sm">
            <Store className="w-4 h-4 text-[#3D180E]" />
            <span className="hidden sm:inline">Painel do Mestre</span>
          </button>

          <button className="relative p-2.5 rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white transition-colors shadow-sm">
            <ShoppingBag className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#FAF6EF]">
              0
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}
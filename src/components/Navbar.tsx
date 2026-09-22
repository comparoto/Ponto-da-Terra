import React, { useState } from 'react';
import { Search, ShoppingBag, Store, Menu, X } from 'lucide-react';

// Componente da Bandeira de Pernambuco (Somente a bandeira, sem fundo marrom)
const PernambucoFlagIcon = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg
    viewBox="0 0 36 36"
    width="32"
    height="32"
    style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#pe-flag-clip-nav)">
      {/* Campo Superior Azul */}
      <rect width="36" height="18" fill="#002B7F" />
      {/* Campo Inferior Branco */}
      <rect y="18" width="36" height="18" fill="#FFFFFF" />
      
      {/* Arco-íris (Vermelho, Amarelo, Verde) */}
      <path d="M 3 18 A 15 15 0 0 1 33 18" stroke="#E31B23" strokeWidth="3" fill="none" />
      <path d="M 6.5 18 A 11.5 11.5 0 0 1 29.5 18" stroke="#FFCC00" strokeWidth="2.5" fill="none" />
      <path d="M 10 18 A 8 8 0 0 1 26 18" stroke="#009B3A" strokeWidth="2" fill="none" />
      
      {/* Sol Central */}
      <circle cx="18" cy="18" r="2.5" fill="#FFCC00" />
      
      {/* Estrela Superior */}
      <polygon points="18,3 18.9,5.8 21.8,5.8 19.4,7.5 20.3,10.2 18,8.5 15.7,10.2 16.6,7.5 14.2,5.8 17.1,5.8" fill="#FFCC00" />
      
      {/* Cruz Vermelha Inferior */}
      <rect x="16.5" y="21" width="3" height="11" fill="#E31B23" stroke="#E31B23" strokeWidth="0.5" />
      <rect x="12.5" y="24.5" width="11" height="3" fill="#E31B23" stroke="#E31B23" strokeWidth="0.5" />
    </g>
    <defs>
      <clipPath id="pe-flag-clip-nav">
        <rect width="36" height="36" rx="8" />
      </clipPath>
    </defs>
  </svg>
);

export const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartCount = 0;

  return (
    <header className="w-full sticky top-0 z-50 bg-[#FAF6EF]/95 backdrop-blur-md border-b border-stone-200">
      {/* Barra superior com degradê suave contínuo com as cores da Bandeira de PE */}
      <div className="h-1.5 w-full bg-[linear-gradient(to_right,#002B7F,#009B3A,#E31B23,#FFCC00,#FFFFFF)] shadow-sm" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Logo e Marca PONTO DA TERRA */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center hover:scale-105 transition-transform">
            <PernambucoFlagIcon className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-serif font-black text-lg tracking-tight text-[#3D180E] leading-none">
              PONTO DA TERRA
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-[#D45B28] font-bold block mt-0.5">
              ORIGEM & TRADIÇÃO
            </span>
          </div>
        </div>

        {/* Busca Desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por mestre, peças de barro, renda..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-full text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D180E]/20 focus:border-[#3D180E] transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Botões de Ação (Desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#E09B31]/15 text-[#3D180E] font-medium text-sm rounded-lg border border-[#E09B31]/40 hover:bg-[#E09B31]/25 transition-colors">
            <Store className="w-4 h-4" />
            <span>Painel do Mestre</span>
          </button>

          <button 
            aria-label="Carrinho de Compras"
            className="relative p-2.5 bg-[#3D180E] text-white rounded-lg hover:bg-[#4E2114] transition-colors shadow-sm"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#FAF6EF]">
              {cartCount}
            </span>
          </button>
        </div>

        {/* Menu Hambúrguer (Mobile) */}
        <div className="flex md:hidden items-center gap-2">
          <button 
            aria-label="Carrinho de Compras"
            className="relative p-2 bg-[#3D180E] text-white rounded-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </button>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-[#3D180E] hover:bg-stone-200/50 rounded-lg"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FAF6EF] px-4 pt-3 pb-6 space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por mestre, peças..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-300 rounded-full text-sm"
            />
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E09B31]/20 text-[#3D180E] font-medium text-sm rounded-lg border border-[#E09B31]/40">
            <Store className="w-4 h-4" />
            <span>Painel do Mestre</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
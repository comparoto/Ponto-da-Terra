import React, { useState } from 'react';
import { Search, ShoppingBag, Store, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartCount = 0;

  return (
    <header className="w-full sticky top-0 z-50 bg-[#FAF6EF]/95 backdrop-blur-md border-b border-stone-200">
      {/* Linha colorida do topo - Referência cultural */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-amber-400 via-green-500 to-blue-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-[#3D180E] rounded-lg flex items-center justify-center text-amber-400 font-bold shadow-sm">
            <span className="text-xl">☀️</span>
          </div>
          <div>
            <h1 className="font-serif font-black text-lg tracking-tight text-[#3D180E] leading-none">
              MÃOS DE PE
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-[#D45B28] font-bold block mt-0.5">
              ORIGEM & TRADIÇÃO
            </span>
          </div>
        </div>

        {/* Campo de Busca (Desktop) */}
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

      {/* Busca e Opções Mobile (Dropdown) */}
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
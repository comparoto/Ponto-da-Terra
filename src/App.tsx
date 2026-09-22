import React from 'react';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { CulturalRegions } from './components/CulturalRegions';
import { CatalogSection } from './components/CatalogSection';
import { ImpactCalculator } from './components/ImpactCalculator';
import { MastersSection } from './components/MastersSection';
import { Footer } from './components/Footer';
import { LayoutGrid, Heart } from 'lucide-react';
import type { FeaturedProduct } from './types';

const featuredData: FeaturedProduct = {
  id: '1',
  title: 'Escultura em Barro Alto do Moura',
  location: 'Caruaru • Agreste Pernambucano',
  region: 'Agreste',
  tag: 'DESTAQUE DA SEMANA',
  imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800',
  verified: true,
};

export function App() {
  const handleRegionChange = (regionId: string) => {
    console.log('Região selecionada:', regionId);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#3D180E] font-sans antialiased flex flex-col selection:bg-[#E09B31]/30">
      <Navbar />

      {/* HERO SECTION: Ocupa a visualização inicial com margens enxutas */}
      <main className="min-h-[calc(100vh-4rem)] flex flex-col justify-center relative overflow-hidden bg-[#FAF6EF] py-6 px-4">
        
        {/* Marca D'Água Superior Esquerda: Cavalo de Barro */}
        <div className="absolute top-4 left-4 sm:left-8 opacity-[0.12] pointer-events-none select-none">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-[#3D180E]">
            <path d="M20 80 C 20 60, 30 40, 50 30 C 55 20, 65 10, 80 15 C 85 25, 75 35, 65 40 C 70 55, 75 70, 80 80 M35 80 L35 60 M65 80 L65 65" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Marca D'Água Inferior Direita: Sol */}
        <div className="absolute bottom-4 right-4 sm:right-8 opacity-[0.12] pointer-events-none select-none">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-[#3D180E]">
            <circle cx="50" cy="50" r="18" strokeWidth="2" />
            <path d="M50 15 L50 25 M50 75 L50 85 M15 50 L25 50 M75 50 L85 50 M25 25 L32 32 M68 68 L75 75 M25 75 L32 68 M68 32 L75 25" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Lado Esquerdo: Textos e Métricas */}
            <div className="lg:col-span-7 space-y-5">

              {/* Tag de Retorno */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E09B31]/20 border border-[#E09B31] text-[#3D180E] font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-[#D9381E]" />
                <span>100% RETORNO DIRETO AO MESTRE ARTESÃO</span>
              </div>

              {/* Título Principal no estilo da Imagem 1 */}
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#3D180E] tracking-tight leading-[1.15]">
                Do Barro de Caruaru às{' '}
                <span className="relative inline-block underline decoration-[#E09B31] decoration-4 underline-offset-4">
                  Renascenças
                </span>{' '}
                do Sertão.
              </h2>

              <p className="text-stone-700 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                Conectamos você diretamente à alma criativa de Pernambuco. Sem intermediários exploradores, com origem certificada e impacto social garantido na vida de quem molda a nossa história.
              </p>

              {/* Botões com Estilo Neo-brutalista (Borda e Sombra 2D) */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#5B2213] hover:bg-[#451A0E] text-white font-bold text-sm rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                  <LayoutGrid className="w-4 h-4 text-[#E09B31]" />
                  <span>Explorar Catálogo</span>
                </button>

                <button className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-stone-100 text-[#3D180E] font-bold text-sm rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                  <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <Heart className="w-3 h-3 text-red-600 fill-red-600" />
                  </span>
                  <span>Ver Transparência</span>
                </button>
              </div>

              {/* Métricas estilo Imagem 1 */}
              <div className="pt-5 border-t-2 border-stone-300/70 grid grid-cols-3 gap-4 max-w-lg">
                <div className="flex flex-col">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-[#1E3A8A]">
                    120+
                  </span>
                  <span className="text-xs text-stone-600 font-medium mt-0.5">Mestres Cadastrados</span>
                </div>

                <div className="flex flex-col">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-[#3D180E]">
                    4 Regiões
                  </span>
                  <span className="text-xs text-stone-600 font-medium mt-0.5">Polos da Tradição</span>
                </div>

                <div className="flex flex-col">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-[#10B981]">
                    88%
                  </span>
                  <span className="text-xs text-stone-600 font-medium mt-0.5">Repasse Direto</span>
                </div>
              </div>

            </div>

            {/* Lado Direito: Card do Produto */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center">
              <div className="w-full max-w-sm sm:max-w-md">
                <ProductCard product={featuredData} />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Próxima Seção (aparece ao rolar a página) */}
      <CulturalRegions onSelectRegion={handleRegionChange} />
      <CatalogSection />
      <ImpactCalculator />
      <MastersSection />
      <Footer />
    </div>
  );
}

export default App;
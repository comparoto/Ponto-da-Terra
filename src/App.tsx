import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { CulturalRegions } from './components/CulturalRegions';
import { CatalogSection } from './components/CatalogSection'; // 1. Import da nova seção
import { ImpactCalculator } from './components/ImpactCalculator';
import { MastersSection } from './components/MastersSection';
import { Footer } from './components/Footer';
import { LayoutGrid, Heart, Sparkles } from 'lucide-react';
import type { FeaturedProduct, Stats } from './types';

const featuredData: FeaturedProduct = {
  id: '1',
  title: 'Escultura em Barro Alto do Moura',
  location: 'Caruaru • Agreste Pernambucano',
  region: 'Agreste',
  tag: 'DESTAQUE DA SEMANA',
  imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800',
  verified: true,
};

const statsData: Stats[] = [
  { value: '120+', label: 'Mestres Cadastrados', description: 'Artesãos certificados' },
  { value: '4 Regiões', label: 'Polos da Tradição', description: 'Zona da Mata ao Sertão' },
  { value: '88%', label: 'Repasse Direto', description: 'Retorno financeiro justo' },
];

export function App() {
  const handleRegionChange = (regionId: string) => {
    console.log('Região selecionada:', regionId);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#3D180E] font-sans antialiased flex flex-col selection:bg-[#E09B31]/30">
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-10 lg:pt-6 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E09B31]/15 border border-[#E09B31]/40 text-[#3D180E] font-bold text-xs tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#E09B31] animate-pulse" />
                100% RETORNO DIRETO AO MESTRE ARTESÃO
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-[#3D180E] tracking-tight leading-[1.15]">
                Do Barro de Caruaru às{' '}
                <span className="relative inline-block underline decoration-[#E09B31] decoration-4 underline-offset-8">
                  Renascenças
                </span>{' '}
                do Sertão.
              </h2>

              <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                Conectamos você diretamente à alma criativa de Pernambuco. Sem intermediários exploradores, com origem certificada e impacto social garantido na vida de quem molda a nossa história.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button className="flex items-center gap-2.5 px-6 py-3.5 bg-[#3D180E] hover:bg-[#4E2114] text-white font-bold text-sm rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                  <LayoutGrid className="w-4 h-4 text-[#E09B31]" />
                  <span>Explorar Catálogo</span>
                </button>

                <button className="flex items-center gap-2.5 px-6 py-3.5 bg-white hover:bg-stone-50 text-[#3D180E] border-2 border-[#3D180E] font-bold text-sm rounded-xl transition-all shadow-sm">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
                  <span>Ver Transparência</span>
                </button>
              </div>

              <div className="pt-8 border-t border-stone-300/60 grid grid-cols-3 gap-4 max-w-xl">
                {statsData.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="font-serif text-2xl sm:text-3xl font-black text-[#3D180E] lg:text-4xl">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#3D180E] leading-tight">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end pb-8 lg:pb-0">
              <ProductCard product={featuredData} />
            </div>

          </div>
        </div>
      </main>

      {/* 1. Filtro por Regiões Culturais */}
      <CulturalRegions onSelectRegion={handleRegionChange} />

      {/* 2. Catálogo Vivo: Obras & Obras-Primas (Nova Seção Inserida) */}
      <CatalogSection />

      {/* 3. Calculadora de Impacto Direto */}
      <ImpactCalculator />

      {/* 4. Grandes Mestres de Pernambuco */}
      <MastersSection />

      {/* Rodapé */}
      <Footer />
    </div>
  );
}

export default App;
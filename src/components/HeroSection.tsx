import React from 'react';
import { LayoutGrid, Heart, ShieldCheck } from 'lucide-react';

// Vetor Lineart do Cavalo de Barro de Caruaru / Mestre Vitalino (Substitui a figura humana)
const ClayHorseWatermark = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Contorno do cavalo artesanal de barro */}
    <path d="M 22 78 L 22 62 C 20 50 24 38 34 26 C 42 16 52 12 62 14 C 67 15 70 18 68 23 C 65 28 58 30 52 34 C 48 37 46 44 48 54 L 48 78" />
    <path d="M 24 48 Q 14 50 8 58 Q 6 62 10 65 Q 16 68 24 60" />
    <path d="M 32 78 L 32 62" />
    <path d="M 40 78 L 40 64" />
    <path d="M 60 18 C 66 10 74 8 80 12 C 84 15 80 22 72 25" />
    <path d="M 48 42 C 60 44 72 44 82 50 C 88 54 90 60 86 65 C 80 70 72 64 64 58 C 56 52 50 50 48 50" />
    <path d="M 70 64 L 70 78" />
    <path d="M 78 64 L 78 78" />
  </svg>
);

export const HeroSection: React.FC = () => {
  return (
    <section className="bg-[#FAF6EF] pt-4 pb-10 lg:pt-6 lg:pb-14 relative overflow-hidden">
      
      {/* Watermark do Cavalo de Barro no canto superior esquerdo */}
      <div className="absolute top-2 left-4 sm:top-4 sm:left-8 opacity-25 pointer-events-none text-stone-500">
        <ClayHorseWatermark className="w-20 h-20 sm:w-24 sm:h-24" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Coluna da Esquerda: Textos e Métricas */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Badge Promocional */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E09B31]/15 border border-[#E09B31]/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#D45B28] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#3D180E]">
                100% Retorno Direto ao Mestre Artesão
              </span>
            </div>

            {/* Título sem quebras indesejadas */}
            <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[#3D180E] leading-[1.15] tracking-tight">
              Do Barro de Caruaru às&nbsp;Renascenças do Sertão.
            </h1>

            {/* Descrição */}
            <p className="text-stone-600 text-base sm:text-lg max-w-xl leading-relaxed">
              Conectamos você diretamente à alma criativa de Pernambuco. Sem intermediários exploradores, com origem certificada e impacto social garantido na vida de quem molda a nossa história.
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button className="flex items-center gap-2 px-6 py-3.5 bg-[#3D180E] text-white font-medium text-sm rounded-xl hover:bg-[#4E2114] transition-all shadow-md">
                <LayoutGrid className="w-4 h-4" />
                <span>Explorar Catálogo</span>
              </button>

              <button className="flex items-center gap-2 px-6 py-3.5 bg-white text-[#3D180E] font-medium text-sm rounded-xl border border-stone-300 hover:bg-stone-50 transition-all shadow-sm">
                <Heart className="w-4 h-4 text-[#D45B28]" />
                <span>Ver Transparência</span>
              </button>
            </div>

            {/* Métricas com Alinhamento de Base Perfeito (baseline) */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 border-t border-stone-200/80 w-full items-end">
              
              {/* Item 1 */}
              <div className="flex flex-col justify-end">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#002B7F] leading-none">
                  120+
                </span>
                <span className="text-xs sm:text-sm text-stone-600 font-medium leading-tight mt-2 block">
                  Mestres Cadastrados
                </span>
              </div>

              {/* Item 2 - "4 Regiões" alinhados na mesma linha de base */}
              <div className="flex flex-col justify-end">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#3D180E] leading-none">
                    4
                  </span>
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#3D180E] leading-none">
                    Regiões
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-stone-600 font-medium leading-tight mt-2 block">
                  Polos da Tradição
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col justify-end">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#009B3A] leading-none">
                  88%
                </span>
                <span className="text-xs sm:text-sm text-stone-600 font-medium leading-tight mt-2 block">
                  Repasse Direto
                </span>
              </div>

            </div>

          </div>

          {/* Coluna da Direita: Card de Destaque com Selo Desobstruído */}
          <div className="lg:col-span-5 relative pb-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-900">
              
              {/* Imagem */}
              <img
                src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=1000"
                alt="Escultura em Barro Alto do Moura"
                className="w-full h-[420px] sm:h-[480px] object-cover opacity-90"
              />

              {/* Tag Destaque da Semana */}
              <div className="absolute top-4 left-4 bg-[#E09B31] text-[#3D180E] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                Destaque da Semana
              </div>

              {/* Informações da Peça */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-6 pb-10 flex flex-col justify-end">
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-white tracking-wide">
                  Escultura em Barro Alto do Moura
                </h3>
                <p className="text-stone-300 text-xs mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Caruaru • Agreste Pernambucano
                </p>
              </div>

            </div>

            {/* Selo de Autenticidade sem cobrir o texto da imagem */}
            <div className="absolute -bottom-1 left-6 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-stone-200/80 flex items-center gap-2.5 z-20">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 leading-none">
                  Selo de Autenticidade
                </h4>
                <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                  Origem 100% Verificada
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
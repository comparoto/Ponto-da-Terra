'use client';

import { useState } from 'react';

interface ArtItem {
  id: string;
  title: string;
  artisan: string;
  regionBadge: string;
  badgeBg: string;
  imageUrl: string;
  price?: string;
}

const CATEGORIES = [
  'Todas Técnicas',
  'Barro & Cerâmica',
  'Xilogravura & Cordel',
  'Couro & Cangaço',
  'Renda Renascença',
  'Entalhe em Madeira',
];

const SAMPLE_WORKS: ArtItem[] = [
  {
    id: '1',
    title: 'Conjunto de Vasos Utilitários',
    artisan: 'Mestre Vitalino Neto',
    regionBadge: 'AGRESTE',
    badgeBg: 'bg-[#E09B31]',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=600',
    price: 'R$ 180,00',
  },
  {
    id: '2',
    title: 'Painel Fachada do Recife',
    artisan: 'Mestra Maria do Barro',
    regionBadge: 'AGRESTE',
    badgeBg: 'bg-[#E09B31]',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=600',
    price: 'R$ 350,00',
  },
  {
    id: '3',
    title: 'Natureza Morta Sertaneja',
    artisan: 'Mestre Dila',
    regionBadge: 'SERTÃO',
    badgeBg: 'bg-[#E09B31]',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=600',
    price: 'R$ 290,00',
  },
  {
    id: '4',
    title: 'Galeria de Retratos e Gravuras',
    artisan: 'Mestre J. Borges',
    regionBadge: 'SERTÃO',
    badgeBg: 'bg-[#E09B31]',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600',
    price: 'R$ 420,00',
  },
];

export function CatalogSection() {
  const [selectedCategory, setSelectedCategory] = useState('Todas Técnicas');

  return (
    <section className="bg-[#FAF6EF] py-12 px-4 sm:px-6 lg:px-8 border-b border-[#E8DFC8]">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#7A2E1E]">
              Catálogo Vivo
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#3D180E] tracking-tight mt-1">
              Obras & Obras-Primas
            </h2>
          </div>

          {/* Filtros de Técnica (Pills) */}
          <div className="flex flex-col items-start md:items-end">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 max-w-full">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`
                      px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150
                      border border-[#1E100A]
                      ${
                        isActive
                          ? 'bg-[#1E100A] text-white'
                          : 'bg-white text-[#1E100A] hover:bg-[#F2E8D9]'
                      }
                    `}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {/* Linha Marrom Decorativa sob as abas */}
            <div className="w-full h-1.5 bg-[#7A2E1E] rounded-full mt-2 hidden md:block" />
          </div>
        </div>

        {/* Grid de Obras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SAMPLE_WORKS.map((item) => (
            <div
              key={item.id}
              className="group bg-white border-2 border-[#1E100A] rounded-2xl overflow-hidden shadow-[4px_4px_0px_#1E100A] hover:translate-y-[-2px] transition-all duration-200 flex flex-col"
            >
              {/* Container da Imagem com Badge */}
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Badge da Região */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black text-[#1E100A] border border-[#1E100A] shadow-[2px_2px_0px_#1E100A] ${item.badgeBg}`}>
                    {item.regionBadge}
                  </span>
                </div>
              </div>

              {/* Informações da Peça */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#3D180E] line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    {item.artisan}
                  </p>
                </div>

                {item.price && (
                  <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#3D180E]">
                      {item.price}
                    </span>
                    <button className="px-3 py-1.5 bg-[#3D180E] text-white text-xs font-bold rounded-lg hover:bg-[#4E2114] transition-colors">
                      Ver Detalhes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
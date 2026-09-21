'use client';

import { useState } from 'react';

interface Region {
  id: string;
  name: string;
  cities?: string;
  colorDot?: string;
}

const REGIONS: Region[] = [
  { id: 'all', name: 'Todos Pernambuco' },
  { id: 'agreste', name: 'Agreste', cities: 'Caruaru / Bezerros', colorDot: 'bg-red-500' },
  { id: 'sertao', name: 'Sertão', cities: 'Petrolina / Arcoverde', colorDot: 'bg-amber-500' },
  { id: 'zona-mata', name: 'Zona da Mata', cities: 'Tracunhaém / Goiana', colorDot: 'bg-emerald-500' },
  { id: 'metropolitana', name: 'Região Metropolitana', cities: 'Recife / Olinda', colorDot: 'bg-blue-600' },
];

interface CulturalRegionsProps {
  onSelectRegion?: (id: string) => void;
}

export function CulturalRegions({ onSelectRegion }: CulturalRegionsProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');

  const handleSelect = (id: string) => {
    setSelectedRegion(id);
    if (onSelectRegion) {
      onSelectRegion(id);
    }
  };

  return (
    <section className="bg-[#FAF6EF] py-12 px-4 border-b border-[#E8DFC8]">
      <div className="max-w-6xl mx-auto text-center">
        {/* Título & Subtítulo */}
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3D180E] mb-2 tracking-tight">
          Explore por Regiões Culturais
        </h2>
        <p className="text-[#6B5244] text-sm md:text-base mb-8">
          Selecione uma região para filtrar as obras dos mestres locais
        </p>

        {/* Botões de Filtro */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-5xl mx-auto">
          {REGIONS.map((region) => {
            const isSelected = selectedRegion === region.id;

            return (
              <button
                key={region.id}
                onClick={() => handleSelect(region.id)}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-150
                  border-2 border-[#1E100A] shadow-[3px_3px_0px_#1E100A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                  ${
                    isSelected
                      ? 'bg-[#5A2418] text-white'
                      : 'bg-white text-[#1E100A] hover:bg-[#F5EFE6]'
                  }
                `}
              >
                {region.id === 'all' ? (
                  /* Ícone de Globo */
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                ) : (
                  /* Dot Colorido */
                  <span className={`w-3 h-3 rounded-full shrink-0 ${region.colorDot}`} />
                )}

                <span>
                  {region.name}
                  {region.cities && (
                    <span className="font-normal opacity-90"> ({region.cities})</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
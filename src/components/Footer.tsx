'use client';

export function Footer() {
  return (
    <footer className="bg-[#1E100A] text-[#FAF6EF] pt-12 pb-8 px-4 sm:px-8 border-t-4 border-[#E09B31]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        
        {/* Coluna 1: Sobre */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-black tracking-wide text-white uppercase">
            Mãos de PE
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed">
            Plataforma coletiva de valorização do artesanato genuinamente pernambucano. Fortalecendo a identidade do Nordeste.
          </p>
        </div>

        {/* Coluna 2: Polos Culturais */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase text-[#E09B31] tracking-wider">
            Polos Culturais
          </h4>
          <ul className="space-y-1.5 text-xs text-stone-300">
            <li>Alto do Moura (Caruaru)</li>
            <li>Bezerros (Terra do Papangu)</li>
            <li>Tracunhaém (Barro Sagrado)</li>
            <li>Petrolina (Carrancas do Velho Chico)</li>
          </ul>
        </div>

        {/* Coluna 3: Técnicas Ancestrais */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase text-[#E09B31] tracking-wider">
            Técnicas Ancestrais
          </h4>
          <ul className="space-y-1.5 text-xs text-stone-300">
            <li>Escultura em Barro Queimado</li>
            <li>Xilogravura e Literatura de Cordel</li>
            <li>Arte em Couro do Cangaço</li>
            <li>Renda Renascença de Pesqueira</li>
          </ul>
        </div>

        {/* Coluna 4: Contato & Apoio */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase text-[#E09B31] tracking-wider">
            Contato & Apoio
          </h4>
          <ul className="space-y-2 text-xs text-stone-300">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Suporte ao Mestre: (81) 99999-8181
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              contato@maosdepernambuco.org.br
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-stone-800 text-center text-[11px] text-stone-500">
        © {new Date().getFullYear()} Mãos de PE — Origem & Tradição. Todos os direitos reservados.
      </div>
    </footer>
  );
}
'use client';

interface Master {
  id: string;
  name: string;
  location: string;
  badgeBg: string;
  avatarUrl: string;
  quote: string;
}

const MASTERS: Master[] = [
  {
    id: '1',
    name: 'Mestre do Barro',
    location: 'CARUARU / AGRESTE',
    badgeBg: 'bg-[#8B3A2B]',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
    quote: '"O barro não é terra sem vida, é a voz de nossa gente sendo esculpida com fé."',
  },
  {
    id: '2',
    name: 'Poeta da Xilogravura',
    location: 'BEZERROS / AGRESTE',
    badgeBg: 'bg-[#1D4ED8]',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    quote: '"Cada corte na madeira é uma estrofe de cordel gravada para a eternidade."',
  },
  {
    id: '3',
    name: 'Mestra Rendeira',
    location: 'PESQUEIRA / AGRESTE',
    badgeBg: 'bg-[#047857]',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    quote: '"Na paciência dos bilros, entrelaçamos o passado ao futuro das nossas filhas."',
  },
];

export function MastersSection() {
  return (
    <section className="bg-white py-16 px-4 md:px-8 border-b border-[#E8DFC8]">
      <div className="max-w-6xl mx-auto text-center">
        
        {/* Subtítulo & Título */}
        <span className="text-blue-900 font-bold text-xs tracking-widest uppercase">
          Patrimônio Vivo
        </span>
        <h2 className="font-serif text-3xl md:text-5xl font-black text-[#3D180E] mt-1 mb-3">
          Grandes Mestres de Pernambuco
        </h2>
        <p className="text-stone-600 text-sm md:text-base max-w-2xl mx-auto mb-12">
          Inspirados pela arte barroca do barro, xilogravuras históricas e pela bravura do Sertão.
        </p>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MASTERS.map((master) => (
            <div
              key={master.id}
              className="bg-[#FAF6EF] border-2 border-[#1E100A] rounded-2xl p-6 text-center shadow-[4px_4px_0px_#1E100A] hover:translate-y-[-2px] transition-all duration-200"
            >
              {/* Foto de Perfil */}
              <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-2 border-[#1E100A]">
                <img
                  src={master.avatarUrl}
                  alt={master.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Tag de Localização */}
              <span
                className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider mb-3 ${master.badgeBg}`}
              >
                {master.location}
              </span>

              {/* Nome do Mestre */}
              <h3 className="font-serif text-xl font-bold text-[#3D180E] mb-3">
                {master.name}
              </h3>

              {/* Citação */}
              <p className="text-xs text-stone-600 italic leading-relaxed px-2">
                {master.quote}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
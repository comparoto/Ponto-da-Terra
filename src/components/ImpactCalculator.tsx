'use client';

import { useState } from 'react';
import { Heart, Package, ShieldCheck, UserCheck } from 'lucide-react';

export function ImpactCalculator() {
  const [price, setPrice] = useState<number>(200);

  const artisanShare = price * 0.88;
  const logisticsShare = price * 0.07;
  const platformShare = price * 0.05;

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <section className="bg-[#FAF6EF] py-16 px-4 md:px-8 border-b border-[#E8DFC8]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Lado Esquerdo: Textos e Badges */}
        <div className="lg:col-span-6 space-y-6">
          <span className="text-emerald-700 font-bold text-xs tracking-widest uppercase">
            Transparência Radical
          </span>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#3D180E] leading-tight">
            Calculadora de Impacto Direto
          </h2>

          <p className="text-stone-600 leading-relaxed text-sm md:text-base">
            Diferente dos atravessadores tradicionais que chegam a reter até 70% do valor de uma obra, em nossa plataforma coletiva a maior parcela da sua compra vai direto para a conta do artesão.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-8 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                88%
              </span>
              <span className="text-[#3D180E] font-bold text-sm">
                Renda Limpa para o Mestre Criador
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 h-8 rounded bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                7%
              </span>
              <span className="text-[#3D180E] font-bold text-sm">
                Cooperativa Local e Embalagem Sustentável
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 h-8 rounded bg-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                5%
              </span>
              <span className="text-[#3D180E] font-bold text-sm">
                Manutenção Tecnológica Coletiva
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Simulador Interativo */}
        <div className="lg:col-span-6">
          <div className="bg-white border-2 border-[#1E100A] rounded-2xl p-6 sm:p-8 shadow-[5px_5px_0px_#1E100A] space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone-200 pb-4">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3D180E]">
                Simule o Impacto da sua Compra
              </h3>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold uppercase text-stone-500 tracking-wider">
                  Valor da Peça Escolhida:
                </label>
                <span className="font-serif text-2xl font-black text-[#3D180E]">
                  {formatCurrency(price)}
                </span>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="50"
                max="2000"
                step="10"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#5A2418]"
              />
            </div>

            {/* Barras de Divisão */}
            <div className="space-y-4 pt-2">
              {/* Repasse ao Artesão (88%) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-emerald-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Repasse ao Artesão (88%)
                  </span>
                  <span>{formatCurrency(artisanShare)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-150" style={{ width: '88%' }} />
                </div>
              </div>

              {/* Logística (7%) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-amber-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> Logística e Embalagem (7%)
                  </span>
                  <span>{formatCurrency(logisticsShare)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-150" style={{ width: '7%' }} />
                </div>
              </div>

              {/* Plataforma (5%) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-blue-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Plataforma e Suporte (5%)
                  </span>
                  <span>{formatCurrency(platformShare)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-150" style={{ width: '5%' }} />
                </div>
              </div>
            </div>

            {/* Banner inferior do card */}
            <div className="bg-[#FAF6EF] border border-[#E8DFC8] rounded-xl p-3.5 flex items-center gap-3 text-xs font-medium text-[#3D180E]">
              <Heart className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
              <span>Você está fomentando a economia criativa do agreste e sertão nordestino.</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
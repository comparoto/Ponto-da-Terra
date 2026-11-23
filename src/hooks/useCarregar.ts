'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ApiResult } from '@/services/http';
import { mensagemDeErro } from '@/services/http';

type Estado<T> = { dados: T | null; erro: string | null; carregando: boolean; meta?: ApiResult<T>['meta'] };

/**
 * Busca dados da API ao montar o componente e quando `deps` mudam.
 * O estado só é atualizado no callback da promessa (padrão recomendado pelo React),
 * e respostas atrasadas de buscas antigas são descartadas.
 */
export function useCarregar<T>(buscar: () => Promise<ApiResult<T>>, deps: unknown[] = []) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscar().then(res => {
      if (!ativo) return;
      setEstado(res.success ? { dados: res.data, erro: null, carregando: false, meta: res.meta } : { dados: null, erro: mensagemDeErro(res), carregando: false });
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);

  const recarregar = useCallback(() => setVersao(v => v + 1), []);
  return { ...estado, recarregar };
}

import { useState } from 'react';
import { Peca } from '@/types';
import { produtoService } from '@/services/produtoService';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80';

interface UseProductFormParams {
  products: Peca[];
  artisanOnly: boolean;
  artisanId: string;
  sessionName?: string;
  onSaved: () => void;
}

export function useProductForm({
  products,
  artisanOnly,
  artisanId,
  sessionName,
  onSaved,
}: UseProductFormParams) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Cerâmica & Barro');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  function selectImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Escolha um arquivo de imagem.');
      return;
    }
    if (file.size > 1_500_000) {
      setMessage('A imagem deve ter no máximo 1,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setMessage('Imagem pronta para salvar.');
      }
    };
    reader.onerror = () =>
      setMessage('Não foi possível abrir essa imagem. Tente outro arquivo.');
    reader.readAsDataURL(file);
  }

  function add() {
    if (!name.trim() || Number(price) <= 0) {
      setMessage('Informe o nome da peça e um preço maior que zero.');
      return;
    }
    const existing = products.find((p) => p.id === editingId);
    produtoService.salvarProduto({
      id: editingId || `demo-s${Date.now()}`,
      nome: name.trim(),
      preco: Number(price),
      categoria: category,
      artesaoId: artisanOnly ? artisanId : existing?.artesaoId || artisanId,
      artesaoNome: artisanOnly
        ? sessionName || 'Artesão Demonstração'
        : existing?.artesaoNome || 'Artesão Demonstração',
      artesaoCidade: existing?.artesaoCidade || 'Caruaru - PE',
      imagemUrl: imageUrl,
      descricao: existing?.descricao || 'Peça cadastrada no painel de demonstração.',
      emEstoque: true,
      status: existing ? (existing as any).status : 'pendente',
    } as any);

    setEditingId(null);
    setName('');
    setPrice('');
    setCategory('Cerâmica & Barro');
    setImageUrl(DEFAULT_IMAGE);
    setMessage('Peça enviada para aprovação do administrador!');
    onSaved();
  }

  return {
    defaultImage: DEFAULT_IMAGE,
    name,
    setName,
    price,
    setPrice,
    category,
    setCategory,
    imageUrl,
    setImageUrl,
    message,
    setMessage,
    editingId,
    setEditingId,
    selectImage,
    add,
  };
}
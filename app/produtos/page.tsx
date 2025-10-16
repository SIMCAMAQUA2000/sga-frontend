// Arquivo: app/produtos/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

interface Estabelecimento {
  id: number;
  nome: string;
}
interface Produto {
  id: number;
  registro_produto_numero: string;
  nome_produto: string;
}
interface Parametro {
  id: number;
  nome_parametro: string;
}

export default function GerenciarProdutosPage() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedEstId, setSelectedEstId] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [registroNumero, setRegistroNumero] = useState('');
  const [nomeProduto, setNomeProduto] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para o modal de parâmetros
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProductForParams, setCurrentProductForParams] = useState<Produto | null>(null);
  const [allParams, setAllParams] = useState<Parametro[]>([]);
  const [linkedParams, setLinkedParams] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchInitialData() {
      const { data: estData } = await supabase.from('estabelecimentos').select('id, nome').order('nome');
      if (estData) setEstabelecimentos(estData);
      
      const { data: paramData } = await supabase.from('parametros_analise').select('id, nome_parametro').eq('aplicacao', 'PRODUTO').order('nome_parametro');
      if (paramData) setAllParams(paramData);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedEstId) {
      setProdutos([]);
      return;
    }
    async function fetchProdutos() {
      setLoading(true);
      const { data } = await supabase.from('produtos').select('*').eq('estabelecimento_id', selectedEstId).order('registro_produto_numero');
      if (data) setProdutos(data);
      setLoading(false);
    }
    fetchProdutos();
  }, [selectedEstId]);

  const openParamsModal = async (produto: Produto) => {
    setCurrentProductForParams(produto);
    const { data } = await supabase.from('produto_parametros').select('parametro_id').eq('produto_id', produto.id);
    if (data) {
      setLinkedParams(new Set(data.map(item => item.parametro_id)));
    }
    setIsModalOpen(true);
  };

  const handleParamChange = (paramId: number) => {
    const newSelection = new Set(linkedParams);
    newSelection.has(paramId) ? newSelection.delete(paramId) : newSelection.add(paramId);
    setLinkedParams(newSelection);
  };

  const handleSaveParams = async () => {
    if (!currentProductForParams) return;
    await supabase.from('produto_parametros').delete().eq('produto_id', currentProductForParams.id);
    const newLinks = Array.from(linkedParams).map(paramId => ({ produto_id: currentProductForParams.id, parametro_id: paramId }));
    if (newLinks.length > 0) {
      const { error } = await supabase.from('produto_parametros').insert(newLinks);
      if (error) {
        alert("Erro ao salvar parâmetros: " + error.message);
        return;
      }
    }
    alert("Parâmetros salvos com sucesso!");
    setIsModalOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setRegistroNumero('');
    setNomeProduto('');
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduct(produto);
    setRegistroNumero(produto.registro_produto_numero);
    setNomeProduto(produto.nome_produto);
  };

  const handleDelete = async (produtoId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      const { error } = await supabase.from('produtos').delete().eq('id', produtoId);
      if (error) {
        alert("Erro ao excluir produto: " + error.message);
      } else {
        setProdutos(produtos.filter(p => p.id !== produtoId));
        alert("Produto excluído com sucesso!");
      }
    }
  };

  const handleSubmitProduto = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    if (editingProduct) {
      const { data: updatedProduct, error } = await supabase.from('produtos').update({ registro_produto_numero: registroNumero, nome_produto: nomeProduto }).eq('id', editingProduct.id).select().single();
      if (error) {
        alert("Erro ao atualizar produto: " + error.message);
      } else {
        setProdutos(produtos.map(p => p.id === editingProduct.id ? updatedProduct : p));
        alert("Produto atualizado com sucesso!");
        handleCancelEdit();
      }
    } else {
      const { data: newProductData, error } = await supabase.from('produtos').insert({ estabelecimento_id: parseInt(selectedEstId), registro_produto_numero: registroNumero, nome_produto: nomeProduto }).select().single();
      if (error) {
        alert('Erro ao salvar produto: ' + error.message);
      } else {
        setProdutos([...produtos, newProductData]);
        setRegistroNumero('');
        setNomeProduto('');
      }
    }
    setSaving(false);
  };

  return (
    <main>
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Gerenciar Produtos</h1>
          <Link href="/" className="form-link" style={{ fontSize: '1rem' }}>Voltar</Link>
        </div>
        <hr style={{ margin: '1rem 0 2rem 0' }} />

        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="estabelecimento" className="form-label">Selecione um Estabelecimento:</label>
          <select id="estabelecimento" value={selectedEstId} onChange={(e) => { setSelectedEstId(e.target.value); handleCancelEdit(); }}>
            <option value="">-- Selecione --</option>
            {estabelecimentos.map((est) => <option key={est.id} value={est.id}>{est.nome}</option>)}
          </select>
        </div>

        {selectedEstId && (
          <div>
            <div className="analysis-box">
              <h3>Produtos Cadastrados</h3>
              {loading ? <p>Carregando...</p> : (
                <ul className="product-list">
                  {produtos.length > 0 ? produtos.map(p => (
                    <li key={p.id}>
                      <span><strong>{p.registro_produto_numero}</strong> - {p.nome_produto}</span>
                      <div className="action-buttons">
                        <button onClick={() => openParamsModal(p)} className="params-button">Parâmetros</button>
                        <button onClick={() => handleEdit(p)} className="edit-button">Editar</button>
                        <button onClick={() => handleDelete(p.id)} className="delete-button">Excluir</button>
                      </div>
                    </li>
                  )) : <p>Nenhum produto cadastrado para este estabelecimento.</p>}
                </ul>
              )}
            </div>
            
            <div className="analysis-box" style={{marginTop: '2rem'}}>
              <h3>{editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
              <form onSubmit={handleSubmitProduto}>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="registroNumero" className="form-label">Nº de Registro do Produto (Ex: 001):</label>
                  <input type="text" id="registroNumero" value={registroNumero} onChange={e => setRegistroNumero(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="nomeProduto" className="form-label">Nome do Produto:</label>
                  <input type="text" id="nomeProduto" value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} required />
                </div>
                <div className="form-actions">
                  {editingProduct && (
                    <button type="button" onClick={handleCancelEdit} className="cancel-button">Cancelar</button>
                  )}
                  <button type="submit" className="submit-button" disabled={saving}>
                    {saving ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Adicionar Produto')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && currentProductForParams && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Parâmetros para: {currentProductForParams.nome_produto}</h3>
            <div className="param-list">
              {allParams.map(param => (
                <div key={param.id} className="param-item">
                  <input type="checkbox" id={`param-${param.id}`} checked={linkedParams.has(param.id)} onChange={() => handleParamChange(param.id)} />
                  <label htmlFor={`param-${param.id}`}>{param.nome_parametro}</label>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setIsModalOpen(false)} className="cancel-button">Cancelar</button>
              <button onClick={handleSaveParams} className="submit-button">Salvar Parâmetros</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
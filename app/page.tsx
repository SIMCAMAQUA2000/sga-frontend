// Arquivo: app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

// --- Tipagens ---
interface Estabelecimento { id: number; nome: string; cnpj_cpf: string; endereco: string; }
interface Produto { id: number; nome_produto: string; }
interface Parametro { id: number; nome_parametro: string; tipo: 'MICROBIOLOGICA' | 'FISICO-QUIMICA'; aplicacao: 'AGUA' | 'PRODUTO'; }

export default function HomePage() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [allParams, setAllParams] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Estados do Formulário ---
  const [tipoAnalise, setTipoAnalise] = useState('');
  const [selectedEstId, setSelectedEstId] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [produtosDoEstabelecimento, setProdutosDoEstabelecimento] = useState<Produto[]>([]);
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [parametrosDoProduto, setParametrosDoProduto] = useState<Parametro[]>([]);
  const [dataColeta, setDataColeta] = useState<string>('');
  const [horaColeta, setHoraColeta] = useState<string>('');
  const [lacre, setLacre] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [pontoColeta, setPontoColeta] = useState<string>('');
  const [analisesSelecionadas, setAnalisesSelecionadas] = useState<Set<number>>(new Set());
  const [mesReferencia, setMesReferencia] = useState<string>('');
  const [lote, setLote] = useState<string>('');
  const [dataProducao, setDataProducao] = useState<string>('');
  const [dataValidade, setDataValidade] = useState<string>('');

  useEffect(() => {
    async function fetchInitialData() {
      const { data: estData } = await supabase.from('estabelecimentos').select('*').order('nome');
      if (estData) setEstabelecimentos(estData);
      
      const { data: paramData } = await supabase.from('parametros_analise').select('*');
      if (paramData) setAllParams(paramData);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedEstId) {
      setProdutosDoEstabelecimento([]);
      setSelectedProdId('');
      return;
    }
    async function fetchProdutos() {
      const { data } = await supabase.from('produtos').select('id, nome_produto').eq('estabelecimento_id', selectedEstId).order('nome_produto');
      if (data) setProdutosDoEstabelecimento(data);
    }
    fetchProdutos();
    setSelectedProdId('');
  }, [selectedEstId]);

  useEffect(() => {
    if (!selectedProdId) {
      setParametrosDoProduto([]);
      setAnalisesSelecionadas(new Set());
      return;
    }
    async function fetchParametros() {
      const { data: paramLinks } = await supabase.from('produto_parametros').select('parametro_id').eq('produto_id', selectedProdId);
      if (paramLinks && paramLinks.length > 0) {
        const paramIds = paramLinks.map(link => link.parametro_id);
        
        // LINHA CORRIGIDA: Adicionamos 'aplicacao' para satisfazer a tipagem de 'Parametro'.
        const { data: paramsData } = await supabase.from('parametros_analise').select('id, nome_parametro, tipo, aplicacao').in('id', paramIds);
        
        if (paramsData) {
          setParametrosDoProduto(paramsData);
          setAnalisesSelecionadas(new Set(paramsData.map(p => p.id)));
        }
      } else {
        setParametrosDoProduto([]);
        setAnalisesSelecionadas(new Set());
      }
    }
    fetchParametros();
  }, [selectedProdId]);

  const handleEstabelecimentoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    setSelectedEstId(id);
    const selecionado = estabelecimentos.find(est => est.id === parseInt(id));
    setCnpj(selecionado?.cnpj_cpf || '');
    setEndereco(selecionado?.endereco || '');
  };
  
  const handleAnaliseChange = (parametroId: number) => {
    const newSelection = new Set(analisesSelecionadas);
    newSelection.has(parametroId) ? newSelection.delete(parametroId) : newSelection.add(parametroId);
    setAnalisesSelecionadas(newSelection);
  };
  
  const resetForm = () => {
    setTipoAnalise(''); setSelectedEstId(''); setCnpj('');
    setEndereco(''); setDataColeta(''); setHoraColeta('');
    setLacre(''); setObservacoes(''); setPontoColeta('');
    setSelectedProdId('');
    setParametrosDoProduto([]); setAnalisesSelecionadas(new Set());
    setMesReferencia(''); setLote(''); setDataProducao(''); setDataValidade('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEstId) { alert('Por favor, selecione um estabelecimento.'); return; }
    setLoading(true);

    const produtoSelecionado = produtosDoEstabelecimento.find(p => p.id === parseInt(selectedProdId));
    const nomeProdutoColetado = tipoAnalise === 'PRODUTO' ? produtoSelecionado?.nome_produto : null;

    const { data: requisicaoData, error: requisicaoError } = await supabase.from('requisicoes').insert([{
        estabelecimento_id: parseInt(selectedEstId), tipo_requisicao: tipoAnalise,
        data_coleta: dataColeta || null, hora_coleta: horaColeta || null,
        lacre_numero: lacre, observacao: observacoes, ponto_coleta: pontoColeta,
        produto_coletado: nomeProdutoColetado, mes_referencia: mesReferencia,
        lote: lote, data_producao: dataProducao || null, data_validade: dataValidade || null,
    }]).select().single();

    if (requisicaoError) { alert('Erro ao salvar requisição: ' + requisicaoError.message); setLoading(false); return; }
    
    const analisesParaInserir = Array.from(analisesSelecionadas).map(paramId => ({
      requisicao_id: requisicaoData.id, parametro_id: paramId
    }));

    if (analisesParaInserir.length > 0) {
      const { error: analisesError } = await supabase.from('requisicao_analises').insert(analisesParaInserir);
      if (analisesError) { alert('Requisição salva, mas houve erro ao salvar análises: ' + analisesError.message); setLoading(false); return; }
    }
    
    alert('Requisição enviada com sucesso!');
    resetForm();
    setLoading(false);
  };

  return (
    <main>
      <form className="form-container" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Requisição para Análise Oficial</h1>
          <div>
            <Link href="/produtos" className="form-link" style={{ fontSize: '1rem', marginRight: '1rem' }}>Gerenciar Produtos</Link>
            <Link href="/historico" className="form-link" style={{ fontSize: '1rem' }}>Ver Histórico</Link>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <label htmlFor="tipo_analise" className="form-label">Tipo de Análise:</label>
          <select id="tipo_analise" value={tipoAnalise} onChange={(e) => setTipoAnalise(e.target.value)} required>
            <option value="">-- Selecione --</option>
            <option value="AGUA">Água de Abastecimento</option>
            <option value="PRODUTO">Produto de Origem Animal</option>
          </select>
        </div>
        <hr />

        <div style={{ marginTop: '1.5rem' }}>
          <label htmlFor="estabelecimento" className="form-label">Estabelecimento:</label>
          <select id="estabelecimento" value={selectedEstId} onChange={handleEstabelecimentoChange} required>
            <option value="">-- Selecione um estabelecimento --</option>
            {estabelecimentos.map((est) => <option key={est.id} value={est.id}>{est.nome}</option>)}
          </select>
          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <Link href="/cadastro" className="form-link">Cadastrar novo</Link>
          </div>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="cnpj" className="form-label">CNPJ/CPF:</label>
          <input type="text" id="cnpj" value={cnpj} readOnly style={{ backgroundColor: '#e9ecef' }} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="endereco" className="form-label">Endereço:</label>
          <input type="text" id="endereco" value={endereco} readOnly style={{ backgroundColor: '#e9ecef' }} />
        </div>
        
        {tipoAnalise === 'PRODUTO' && (
          <div className="analysis-box">
            <h3>Análise de Produto</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="produto_coletado" className="form-label">Produto Coletado:</label>
              <select id="produto_coletado" value={selectedProdId} onChange={e => setSelectedProdId(e.target.value)} required disabled={!selectedEstId}>
                <option value="">-- Selecione um produto --</option>
                {produtosDoEstabelecimento.map(prod => <option key={prod.id} value={prod.id}>{prod.nome_produto}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="lote" className="form-label">Lote:</label>
              <input type="text" id="lote" value={lote} onChange={e => setLote(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="dataProducao" className="form-label">Data de Produção:</label>
                <input type="date" id="dataProducao" value={dataProducao} onChange={e => setDataProducao(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="dataValidade" className="form-label">Data de Validade:</label>
                <input type="date" id="dataValidade" value={dataValidade} onChange={e => setDataValidade(e.target.value)} />
              </div>
            </div>
            {parametrosDoProduto.length > 0 && (
              <>
                <h4 style={{ marginTop: '1.5rem' }}>Análises Solicitadas (Automático)</h4>
                <h5>Microbiológicas</h5>
                {parametrosDoProduto.filter(p => p.tipo === 'MICROBIOLOGICA').map(param => (
                  <div key={param.id}><input type="checkbox" id={`param-${param.id}`} checked={true} readOnly /><label htmlFor={`param-${param.id}`} className="checkbox-label">{param.nome_parametro}</label></div>
                ))}
                <h5 style={{ marginTop: '1rem' }}>Físico-químicas</h5>
                {parametrosDoProduto.filter(p => p.tipo === 'FISICO-QUIMICA').map(param => (
                  <div key={param.id}><input type="checkbox" id={`param-${param.id}`} checked={true} readOnly /><label htmlFor={`param-${param.id}`} className="checkbox-label">{param.nome_parametro}</label></div>
                ))}
              </>
            )}
          </div>
        )}

        {tipoAnalise === 'AGUA' && (
          <div className="analysis-box">
            <h3>Análise de Água</h3>
            <label htmlFor="ponto_coleta" className="form-label">Ponto de Coleta:</label>
            <input type="text" id="ponto_coleta" value={pontoColeta} onChange={e => setPontoColeta(e.target.value)} />
            <h4 style={{ marginTop: '1.5rem' }}>Análises Solicitadas</h4>
            {allParams.filter(p => p.aplicacao === 'AGUA').map(param => (
              <div key={param.id}>
                <input type="checkbox" id={`param-${param.id}`} checked={analisesSelecionadas.has(param.id)} onChange={() => handleAnaliseChange(param.id)} />
                <label htmlFor={`param-${param.id}`} className="checkbox-label">{param.nome_parametro}</label>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="dataColeta" className="form-label">Data da Coleta:</label>
            <input type="date" id="dataColeta" value={dataColeta} onChange={e => setDataColeta(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="horaColeta" className="form-label">Hora da Coleta:</label>
            <input type="time" id="horaColeta" value={horaColeta} onChange={e => setHoraColeta(e.target.value)} />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="mesReferencia" className="form-label">Mês de Referência:</label>
            <input type="text" id="mesReferencia" value={mesReferencia} onChange={e => setMesReferencia(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="lacre" className="form-label">Nº do Lacre:</label>
            <input type="text" id="lacre" value={lacre} onChange={e => setLacre(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label htmlFor="observacoes" className="form-label">Observações:</label>
          <textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '5px' }}></textarea>
        </div>

        <hr style={{ margin: '2rem 0' }} />
        <button type="submit" className="submit-button" disabled={loading || !tipoAnalise}>
          {loading ? 'Enviando...' : 'Enviar Requisição'}
        </button>
      </form>
    </main>
  );
}
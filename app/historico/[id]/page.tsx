'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Estabelecimento { id: number; nome: string; cnpj_cpf: string; endereco: string; }
interface Produto { id: number; nome_produto: string; }
interface Parametro { id: number; nome_parametro: string; tipo: 'MICROBIOLOGICA' | 'FISICO-QUIMICA'; aplicacao: 'AGUA' | 'PRODUTO'; }

export default function EditarRequisicaoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [allParams, setAllParams] = useState<Parametro[]>([]);
  
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
  const [temperaturaProduto, setTemperaturaProduto] = useState<string>('');
  const [temperaturaAmbiente, setTemperaturaAmbiente] = useState<string>('');
  const [frequenciaAnalise, setFrequenciaAnalise] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    async function fetchRequisicao() {
      const { data: estData } = await supabase.from('estabelecimentos').select('*').order('nome');
      if (estData) setEstabelecimentos(estData);
      
      const { data: paramData } = await supabase.from('parametros_analise').select('*');
      if (paramData) setAllParams(paramData as Parametro[]);

      const { data: reqData, error } = await supabase
        .from('requisicoes')
        .select('*, requisicao_analises(parametro_id)')
        .eq('id', id)
        .single();

      if (error || !reqData) {
        console.error("Erro ao buscar dados para edição:", error);
        alert("Não foi possível carregar os dados da requisição.");
        router.push('/historico');
        return;
      }

      setTipoAnalise(reqData.tipo_requisicao || '');
      setSelectedEstId(reqData.estabelecimento_id?.toString() || '');
      setDataColeta(reqData.data_coleta || '');
      setHoraColeta(reqData.hora_coleta || '');
      setLacre(reqData.lacre_numero || '');
      setObservacoes(reqData.observacao || '');
      setPontoColeta(reqData.ponto_coleta || '');
      setMesReferencia(reqData.mes_referencia || '');
      setLote(reqData.lote || '');
      setDataProducao(reqData.data_producao || '');
      setDataValidade(reqData.data_validade || '');
      setTemperaturaProduto(reqData.temperatura_produto || '');
      setTemperaturaAmbiente(reqData.temperatura_ambiente || '');
      setFrequenciaAnalise(reqData.frequencia_analise?.toString() || '');

      if (reqData.requisicao_analises) {
        const selectedIds = new Set(reqData.requisicao_analises.map(ra => ra.parametro_id));
        setAnalisesSelecionadas(selectedIds);
      }
      
      setLoading(false);
    }

    fetchRequisicao();
  }, [id, router]);

  useEffect(() => {
    const selecionado = estabelecimentos.find(est => est.id === parseInt(selectedEstId));
    setCnpj(selecionado?.cnpj_cpf || '');
    setEndereco(selecionado?.endereco || '');

    if (!selectedEstId) {
      setProdutosDoEstabelecimento([]);
      return;
    }
    async function fetchProdutos() {
      const { data } = await supabase.from('produtos').select('id, nome_produto').eq('estabelecimento_id', selectedEstId).order('nome_produto');
      if (data) setProdutosDoEstabelecimento(data);
    }
    fetchProdutos();
  }, [selectedEstId, estabelecimentos]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const { error: updateError } = await supabase
      .from('requisicoes')
      .update({
        tipo_requisicao: tipoAnalise,
        estabelecimento_id: parseInt(selectedEstId),
        data_coleta: dataColeta || null,
        hora_coleta: horaColeta || null,
        lacre_numero: lacre,
        observacao: observacoes,
        ponto_coleta: pontoColeta,
        mes_referencia: mesReferencia,
        lote: lote,
        data_producao: dataProducao || null,
        data_validade: dataValidade || null,
        temperatura_produto: temperaturaProduto,
        temperatura_ambiente: temperaturaAmbiente,
        frequencia_analise: frequenciaAnalise ? parseInt(frequenciaAnalise) : null,
      })
      .eq('id', id);

    if (updateError) {
      alert('Erro ao atualizar a requisição: ' + updateError.message);
      setSaving(false);
      return;
    }

    const { error: deleteAnalisesError } = await supabase
      .from('requisicao_analises')
      .delete()
      .eq('requisicao_id', id);
    
    if (deleteAnalisesError) {
        alert('Erro ao limpar análises antigas: ' + deleteAnalisesError.message);
        setSaving(false);
        return;
    }
    
    const analisesParaInserir = Array.from(analisesSelecionadas).map(paramId => ({
        requisicao_id: id, parametro_id: paramId
    }));
  
    if (analisesParaInserir.length > 0) {
      const { error: analisesError } = await supabase.from('requisicao_analises').insert(analisesParaInserir);
      if (analisesError) {
        alert('Requisição salva, mas houve erro ao salvar análises: ' + analisesError.message);
        setSaving(false);
        return;
      }
    }

    alert('Requisição atualizada com sucesso!');
    router.push(`/historico/${id}`);
    setSaving(false);
  };
  
  const handleAnaliseChange = (parametroId: number) => {
    const newSelection = new Set(analisesSelecionadas);
    newSelection.has(parametroId) ? newSelection.delete(parametroId) : newSelection.add(parametroId);
    setAnalisesSelecionadas(newSelection);
  };

  if (loading) {
    return <main><div className="form-container"><p>Carregando dados para edição...</p></div></main>;
  }

  return (
    <main>
      <form className="form-container" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Editar Requisição #{id}</h1>
          <Link href={`/historico/${id}`} className="form-link">Cancelar</Link>
        </div>
        <hr/>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="tipo_analise" className="form-label">Tipo de Análise:</label>
            <select id="tipo_analise" value={tipoAnalise} onChange={(e) => setTipoAnalise(e.target.value)} required>
              <option value="">-- Selecione --</option>
              <option value="AGUA">Água de Abastecimento</option>
              <option value="PRODUTO">Produto de Origem Animal</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="frequencia" className="form-label">Frequência da Análise:</label>
            <select id="frequencia" value={frequenciaAnalise} onChange={(e) => setFrequenciaAnalise(e.target.value)} required>
              <option value="">-- Selecione --</option>
              <option value="30">Mensal (30 dias)</option>
              <option value="60">Bimestral (60 dias)</option>
              <option value="90">Trimestral (90 dias)</option>
              <option value="180">Semestral (180 dias)</option>
              <option value="365">Anual (365 dias)</option>
              <option value="0">Eventual</option>
            </select>
          </div>
        </div>
        <hr />
        {/* O resto do formulário continua o mesmo */}
        <div style={{ marginTop: '1.5rem' }}>
          <label htmlFor="estabelecimento" className="form-label">Estabelecimento:</label>
          <select id="estabelecimento" value={selectedEstId} onChange={(e) => setSelectedEstId(e.target.value)} required>
            <option value="">-- Selecione um estabelecimento --</option>
            {estabelecimentos.map((est) => <option key={est.id} value={est.id}>{est.nome}</option>)}
          </select>
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
            <label htmlFor="temperaturaProduto" className="form-label">Temp. Produto (°C):</label>
            <input type="text" id="temperaturaProduto" value={temperaturaProduto} onChange={e => setTemperaturaProduto(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="temperaturaAmbiente" className="form-label">Temp. Ambiente (°C):</label>
            <input type="text" id="temperaturaAmbiente" value={temperaturaAmbiente} onChange={e => setTemperaturaAmbiente(e.target.value)} />
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
          <textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}></textarea>
        </div>
        <hr style={{ margin: '2rem 0' }} />
        <button type="submit" className="submit-button" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </main>
  );
}
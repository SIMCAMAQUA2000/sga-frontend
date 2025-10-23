'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface ProximaAnalise {
  id: string;
  estabelecimentoNome: string;
  itemAnalisado: string;
  ultimaColeta: string;
  frequencia: number; // Agora é um número
  proximaColeta: Date | null;
}

// Função de cálculo de data ATUALIZADA para usar dias
const calcularProximaData = (ultimaData: string, frequenciaEmDias: number): Date | null => {
  if (!ultimaData || !frequenciaEmDias) {
    return null;
  }
  const data = new Date(ultimaData + 'T00:00:00');
  data.setDate(data.getDate() + frequenciaEmDias); // Soma os dias
  return data;
};

export default function AgendaPage() {
  const [proximasAnalises, setProximasAnalises] = useState<ProximaAnalise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEProcessarAnalises() {
      const { data: requisicoes, error } = await supabase
        .from('requisicoes')
        .select(`
          estabelecimento_id,
          tipo_requisicao,
          produto_coletado,
          data_coleta,
          frequencia_analise,
          estabelecimentos (nome)
        `)
        .order('data_coleta', { ascending: false });

      if (error || !requisicoes) {
        console.error("Erro ao buscar requisições:", error);
        setLoading(false);
        return;
      }

      const ultimasAnalises = new Map<string, ProximaAnalise>();

      for (const req of requisicoes) {
        if (!req.data_coleta || req.frequencia_analise === null || !req.estabelecimentos) continue;

        const itemAnalisado = req.tipo_requisicao === 'AGUA' ? 'Água de Abastecimento' : req.produto_coletado || 'Produto Desconhecido';
        const idUnico = `${req.estabelecimento_id}-${itemAnalisado}`;

        if (!ultimasAnalises.has(idUnico)) {
          ultimasAnalises.set(idUnico, {
            id: idUnico,
            estabelecimentoNome: req.estabelecimentos.nome,
            itemAnalisado: itemAnalisado,
            ultimaColeta: req.data_coleta,
            frequencia: req.frequencia_analise,
            proximaColeta: calcularProximaData(req.data_coleta, req.frequencia_analise),
          });
        }
      }

      const resultado = Array.from(ultimasAnalises.values());
      
      resultado.sort((a, b) => {
        if (!a.proximaColeta) return 1;
        if (!b.proximaColeta) return -1;
        return a.proximaColeta.getTime() - b.proximaColeta.getTime();
      });

      setProximasAnalises(resultado);
      setLoading(false);
    }

    fetchEProcessarAnalises();
  }, []);

  if (loading) {
    return <main><div className="form-container"><p>Calculando próximas análises...</p></div></main>;
  }

  return (
    <main>
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Agenda de Próximas Análises</h1>
          <Link href="/" className="form-link">Voltar para o Início</Link>
        </div>

        <table className="history-table">
          <thead>
            <tr>
              <th>Estabelecimento</th>
              <th>Item Analisado</th>
              <th>Última Coleta</th>
              <th>Frequência</th>
              <th>Próxima Coleta</th>
            </tr>
          </thead>
          <tbody>
            {proximasAnalises.map((analise) => {
              const hoje = new Date();
              const proxima = analise.proximaColeta;
              let statusClass = '';

              if (proxima) {
                proxima.setHours(0,0,0,0);
                hoje.setHours(0,0,0,0);
                const diffDias = (proxima.getTime() - hoje.getTime()) / (1000 * 3600 * 24);
                if (diffDias < 0) statusClass = 'status-vencido';
                else if (diffDias <= 30) statusClass = 'status-atencao';
              }

              return (
                <tr key={analise.id} className={statusClass}>
                  <td>{analise.estabelecimentoNome}</td>
                  <td>{analise.itemAnalisado}</td>
                  <td>{new Date(analise.ultimaColeta + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{analise.frequencia > 0 ? `${analise.frequencia} dias` : 'Eventual'}</td>
                  <td>{analise.proximaColeta ? analise.proximaColeta.toLocaleDateString('pt-BR') : 'N/A'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {proximasAnalises.length === 0 && <p>Nenhuma análise com frequência definida encontrada.</p>}
      </div>
    </main>
  );
}
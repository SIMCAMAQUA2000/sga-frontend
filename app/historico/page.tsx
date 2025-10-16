// Arquivo: app/historico/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

// A interface permanece a mesma, esperando um array.
interface Requisicao {
  id: number;
  created_at: string;
  tipo_requisicao: 'AGUA' | 'PRODUTO';
  produto_coletado: string | null;
  ponto_coleta: string | null;
  estabelecimentos: {
    nome: string;
  }[] | null;
}

export default function HistoricoPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequisicoes() {
      const { data, error } = await supabase
        .from('requisicoes')
        .select(`
          id,
          created_at,
          tipo_requisicao,
          produto_coletado,
          ponto_coleta,
          estabelecimentos ( nome )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        alert('Não foi possível carregar o histórico.');
      } else {
        // LINHA CORRIGIDA: Removemos o "as any[]".
        // O TypeScript agora irá verificar se 'data' é compatível com 'Requisicao[]'.
        setRequisicoes(data || []);
      }
      setLoading(false);
    }

    fetchRequisicoes();
  }, []);

  return (
    <main>
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Histórico de Requisições</h1>
          <Link href="/" className="form-link" style={{ fontSize: '1rem' }}>+ Nova Requisição</Link>
        </div>
        <hr style={{ margin: '1rem 0 2rem 0' }} />

        {loading ? (
          <p>Carregando histórico...</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Data de Envio</th>
                <th>Estabelecimento</th>
                <th>Tipo</th>
                <th>Amostra</th>
              </tr>
            </thead>
            <tbody>
              {requisicoes.length > 0 ? (
                requisicoes.map(req => (
                  <tr key={req.id}>
                    <td>{new Date(req.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>{req.estabelecimentos && req.estabelecimentos.length > 0 ? req.estabelecimentos[0].nome : 'N/A'}</td>
                    <td>{req.tipo_requisicao}</td>
                    <td>{req.tipo_requisicao === 'AGUA' ? req.ponto_coleta : req.produto_coletado}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Nenhuma requisição encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
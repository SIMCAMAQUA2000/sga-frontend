'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// ==========================================================================
//  CORREÇÃO DE TIPO DEFINITIVA AQUI
// ==========================================================================
interface Requisicao {
  id: number;
  created_at: string;
  tipo_requisicao: string;
  data_coleta: string | null;
  estabelecimentos: { // Deve ser um array de objetos
    nome: string;
  }[] | null;
}

export default function HistoricoPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistorico() {
      try {
        const { data, error } = await supabase
          .from('requisicoes')
          .select(`
            id,
            created_at,
            tipo_requisicao,
            data_coleta,
            estabelecimentos (nome)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        if (data) {
          setRequisicoes(data as Requisicao[]);
        }
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
        setError("Não foi possível carregar o histórico.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistorico();
  }, []);

  if (loading) {
    return (
      <main>
        <div className="form-container">
          <p>Carregando histórico...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="form-container">
          <h1>Erro</h1>
          <p>{error}</p>
          <Link href="/" className="form-link">Voltar</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Histórico de Requisições</h1>
          <Link href="/" className="form-link">Nova Requisição</Link>
        </div>

        {requisicoes.length === 0 ? (
          <p>Nenhuma requisição encontrada.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Req. Nº</th>
                <th>Estabelecimento</th>
                <th>Tipo</th>
                <th>Data da Coleta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {requisicoes.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  {/* CORREÇÃO AQUI: Acessamos o primeiro item do array */}
                  <td>{req.estabelecimentos?.[0]?.nome || 'N/A'}</td>
                  <td>{req.tipo_requisicao}</td>
                  <td>{req.data_coleta ? new Date(req.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
                  <td>
                    <Link href={`/historico/${req.id}`} className="details-link">
                      Ver Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
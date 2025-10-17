// Arquivo: app/historico/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipagens ---
interface RequisicaoDetalhada {
  id: number;
  created_at: string;
  tipo_requisicao: string;
  data_coleta: string;
  hora_coleta: string;
  lacre_numero: string;
  mes_referencia: string;
  observacao: string;
  ponto_coleta: string;
  lote: string;
  data_producao: string;
  data_validade: string;
  produto_coletado: string;
  estabelecimentos: {
    nome: string;
    cnpj_cpf: string;
    endereco: string;
    sim_id: string;
  };
  requisicao_analises: {
    parametros_analise: {
      nome_parametro: string;
      tipo: string;
    }
  }[] | null;
}

// Função auxiliar para converter a imagem para o formato que o PDF precisa
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default function DetalhesRequisicaoPage() {
  const params = useParams();
  const [requisicao, setRequisicao] = useState<RequisicaoDetalhada | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      async function fetchDetalhes() {
        const { data, error } = await supabase
          .from('requisicoes')
          .select(`*, estabelecimentos (*), requisicao_analises (parametros_analise (*))`)
          .eq('id', params.id)
          .single();

        if (error) {
          console.error("Erro ao buscar detalhes:", error);
          alert("Não foi possível carregar os detalhes da requisição.");
        } else {
          setRequisicao(data);
        }
        setLoading(false);
      }
      fetchDetalhes();
    }
  }, [params.id]);

  // A função agora é 'async' para poder carregar a imagem antes de gerar o PDF
  const generatePDF = async () => {
    if (!requisicao) return;
    
    // --- LÓGICA CORRETA PARA CARREGAR A IMAGEM ---
    const response = await fetch('/brasao.png');
    const imageBuffer = await response.arrayBuffer();
    const brasaoBase64 = `data:image/png;base64,${arrayBufferToBase64(imageBuffer)}`;
    // --- FIM DA LÓGICA DA IMAGEM ---

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const addHeaderAndFooter = (data: any) => {
      // Adiciona o cabeçalho
      doc.addImage(brasaoBase64, 'PNG', 15, 12, 25, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DO RIO GRANDE DO SUL', pageWidth / 2, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('PREFEITURA MUNICIPAL DE CAMAQUÃ', pageWidth / 2, 20, { align: 'center' });
      doc.text('SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', pageWidth / 2, 25, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('SERVIÇO DE INSPEÇÃO MUNICIPAL', pageWidth / 2, 30, { align: 'center' });
      
      // Adiciona o rodapé
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);
      doc.text('SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', pageWidth / 2, pageHeight - 25, { align: 'center' });
      doc.text('Av. Cônego Luíz Walter Hanquet, 151 - Jardim, Camaquã - RS, 96180-000', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text('Email: sim.agricultura.camaqua@gmail.com', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text('Tel/Watts: (51) 99544-2158', pageWidth / 2, pageHeight - 10, { align: 'center' });
    };
    
    const isProduto = requisicao.tipo_requisicao === 'PRODUTO';
    const title = isProduto ? "REQUISIÇÃO PARA ANÁLISE OFICIAL DE PRODUTOS" : "REQUISIÇÃO PARA ANÁLISE OFICIAL DE ÁGUA";

    const analises = requisicao.requisicao_analises ?? [];
    const paramsMicro = analises.filter(p => p.parametros_analise.tipo === 'MICROBIOLOGICA').map(p => [p.parametros_analise.nome_parametro]);
    const paramsFisico = analises.filter(p => p.parametros_analise.tipo === 'FISICO-QUIMICA').map(p => [p.parametros_analise.nome_parametro]);

    const coletaBody = isProduto ? [
      ['PRODUTO COLETADO', requisicao.produto_coletado || ''],
      ['LOTE', requisicao.lote || ''],
      ['DATA DE PRODUÇÃO', requisicao.data_producao ? new Date(requisicao.data_producao).toLocaleDateString('pt-BR') : ''],
      ['DATA DE VALIDADE', requisicao.data_validade ? new Date(requisicao.data_validade).toLocaleDateString('pt-BR') : ''],
    ] : [
      ['PONTO DE COLETA', requisicao.ponto_coleta || ''],
    ];

    const coletaInfoBody = [
        ['DATA DA COLETA', requisicao.data_coleta ? new Date(requisicao.data_coleta).toLocaleDateString('pt-BR') : ''],
        ['HORA DA COLETA', requisicao.hora_coleta || ''],
        ['MÊS DE REFERÊNCIA', requisicao.mes_referencia || ''],
        ['Nº DO LACRE', requisicao.lacre_numero || ''],
    ];
    
    let finalY = 0;

    autoTable(doc, {
      head: [[title]],
      headStyles: { halign: 'center', fontSize: 14, fontStyle: 'bold' },
      startY: 40,
      body: [
        ['SIM', requisicao.estabelecimentos.sim_id || ''],
        ['ESTABELECIMENTO', requisicao.estabelecimentos.nome],
        ['ENDEREÇO', requisicao.estabelecimentos.endereco],
        ['CNPJ/CPF', requisicao.estabelecimentos.cnpj_cpf],
      ],
      theme: 'grid', styles: { fontSize: 10, cellPadding: 1.5 },
      didDrawPage: (data) => addHeaderAndFooter(data),
    });

    autoTable(doc, { head: [['ANÁLISES SOLICITADAS']], body: [['MICROBIOLÓGICAS']], theme: 'grid', styles: { fontSize: 10, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) });
    if (paramsMicro.length > 0) { autoTable(doc, { body: paramsMicro, theme: 'grid', styles: { fontSize: 9, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) }); }

    autoTable(doc, { body: [['FÍSICO-QUÍMICAS']], theme: 'grid', styles: { fontSize: 10, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) });
    if (paramsFisico.length > 0) { autoTable(doc, { body: paramsFisico, theme: 'grid', styles: { fontSize: 9, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) }); }

    autoTable(doc, { body: coletaBody, theme: 'grid', styles: { fontSize: 10, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) });
    autoTable(doc, { body: coletaInfoBody, theme: 'grid', styles: { fontSize: 10, cellPadding: 1.5 }, didDrawPage: (data) => addHeaderAndFooter(data) });
    
    autoTable(doc, {
      body: [['OBSERVAÇÕES', requisicao.observacao || '']],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 1.5, minCellHeight: 20 },
      didDrawPage: (data) => {
        addHeaderAndFooter(data);
        finalY = data.cursor.y;
      }
    });

    if (finalY + 30 > pageHeight) {
        doc.addPage();
        finalY = 40;
        addHeaderAndFooter({} as any);
    }

    doc.text('_________________________', 30, finalY + 20);
    doc.text('Estabelecimento', 40, finalY + 25);
    doc.text('_________________________', 120, finalY + 20);
    doc.text('Médico Veterinário Oficial', 125, finalY + 25);
    
    doc.save(`Requisicao_${requisicao.id}_${requisicao.estabelecimentos.nome}.pdf`);
  };

  if (loading) { return <main><div className="form-container"><p>Carregando detalhes...</p></div></main>; }
  if (!requisicao) { return <main><div className="form-container"><p>Requisição não encontrada.</p></div></main>; }

  const paramsMicro = (requisicao.requisicao_analises ?? []).filter(p => p.parametros_analise.tipo === 'MICROBIOLOGICA');
  const paramsFisico = (requisicao.requisicao_analises ?? []).filter(p => p.parametros_analise.tipo === 'FISICO-QUIMICA');

  return (
    <main>
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Detalhes da Requisição #{requisicao.id}</h1>
          <div>
            <button onClick={generatePDF} className="pdf-button">Gerar PDF</button>
            <Link href="/historico" className="form-link" style={{ fontSize: '1rem', marginLeft: '1rem' }}>Voltar</Link>
          </div>
        </div>
        <hr style={{ margin: '1rem 0' }} />

        <div className="details-section">
          <h3>Dados do Estabelecimento</h3>
          <p><strong>Nome:</strong> {requisicao.estabelecimentos.nome}</p>
          <p><strong>CNPJ/CPF:</strong> {requisicao.estabelecimentos.cnpj_cpf}</p>
          <p><strong>Endereço:</strong> {requisicao.estabelecimentos.endereco}</p>
        </div>

        <div className="details-section">
          <h3>Dados da Coleta</h3>
          <div className="details-grid">
            <p><strong>Data da Coleta:</strong> {requisicao.data_coleta ? new Date(requisicao.data_coleta).toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p><strong>Hora da Coleta:</strong> {requisicao.hora_coleta || 'N/A'}</p>
            <p><strong>Mês de Referência:</strong> {requisicao.mes_referencia || 'N/A'}</p>
            <p><strong>Nº do Lacre:</strong> {requisicao.lacre_numero || 'N/A'}</p>
          </div>
        </div>
        
        <div className="details-section">
          <h3>Dados da Amostra</h3>
          {requisicao.tipo_requisicao === 'PRODUTO' ? (
            <div className="details-grid">
              <p><strong>Produto:</strong> {requisicao.produto_coletado}</p>
              <p><strong>Lote:</strong> {requisicao.lote || 'N/A'}</p>
              <p><strong>Produção:</strong> {requisicao.data_producao ? new Date(requisicao.data_producao).toLocaleDateString('pt-BR') : 'N/A'}</p>
              <p><strong>Validade:</strong> {requisicao.data_validade ? new Date(requisicao.data_validade).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          ) : (
            <p><strong>Ponto de Coleta (Água):</strong> {requisicao.ponto_coleta || 'N/A'}</p>
          )}
        </div>

        <div className="details-section">
          <h3>Análises Solicitadas</h3>
          {paramsMicro.length > 0 && (
            <>
              <h4>Microbiológicas</h4>
              <ul>{paramsMicro.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul>
            </>
          )}
          {paramsFisico.length > 0 && (
            <>
              <h4>Físico-químicas</h4>
              <ul>{paramsFisico.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul>
            </>
          )}
          {(paramsMicro.length === 0 && paramsFisico.length === 0) && (
            <p>Nenhuma análise solicitada para esta requisição.</p>
          )}
        </div>
        
        {requisicao.observacao && (
          <div className="details-section">
            <h3>Observações</h3>
            <p>{requisicao.observacao}</p>
          </div>
        )}
      </div>
    </main>
  );
}
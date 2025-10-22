'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

// --- Tipagens (com temperaturas) ---
interface RequisicaoDetalhada {
  id: number;
  created_at: string;
  tipo_requisicao: string;
  data_coleta: string | null;
  hora_coleta: string | null;
  lacre_numero: string | null;
  mes_referencia: string | null;
  observacao: string | null;
  ponto_coleta: string | null;
  lote: string | null;
  data_producao: string | null;
  data_validade: string | null;
  produto_coletado: string | null;
  temperatura_produto: string | null;
  temperatura_ambiente: string | null;
  estabelecimentos: {
    nome: string;
    cnpj_cpf: string;
    endereco: string;
    sim_id: string;
  } | null;
  requisicao_analises: {
    parametros_analise: {
      nome_parametro: string;
      tipo: string;
    }
  }[] | null;
}

// Função para carregar imagem (sem alterações)
async function getImageBase64(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Erro ao carregar a imagem do brasão:", error);
        return null;
    }
}

export default function DetalhesRequisicaoPage() {
  const params = useParams();
  const [requisicao, setRequisicao] = useState<RequisicaoDetalhada | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      async function fetchDetalhes() {
        setLoading(true);
        const { data, error } = await supabase
          .from('requisicoes')
          .select(`*, estabelecimentos (*), requisicao_analises (parametros_analise (*))`)
          .eq('id', params.id)
          .single();
        if (error) { console.error("Erro ao buscar detalhes:", error); } 
        else { setRequisicao(data as RequisicaoDetalhada); }
        setLoading(false);
      }
      fetchDetalhes();
    }
  }, [params.id]);

  const generatePDF = async () => {
    if (!requisicao || !requisicao.estabelecimentos) {
      alert("Dados da requisição ou do estabelecimento não carregados.");
      return;
    }
    const brasaoBase64 = await getImageBase64('/brasao.png') as string;
    if (!brasaoBase64) {
      alert("Não foi possível carregar a imagem do brasão para o PDF.");
      return;
    }
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // ==========================================================================
    //  AJUSTE 1: CABEÇALHO E RODAPÉ ENCOLHIDOS
    // ==========================================================================
    const addHeaderAndFooter = () => {
      // Cabeçalho com caixa
      autoTable(doc, {
        startY: 10,
        theme: 'grid',
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center', valign: 'middle' },
          1: { halign: 'center', valign: 'middle', fontSize: 8.5 } // Fonte menor
        },
        body: [
          [
            { content: '', rowSpan: 4, styles: { cellPadding: 0 } },
            { content: 'ESTADO DO RIO GRANDE DO SUL', styles: { fontStyle: 'bold', cellPadding: 0.8 } }
          ],
          [ { content: 'PREFEITURA MUNICIPAL DE CAMAQUÃ', styles: { cellPadding: 0.8 } } ],
          [ { content: 'SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', styles: { cellPadding: 0.8 } } ],
          [ { content: 'SERVIÇO DE INSPEÇÃO MUNICIPAL', styles: { fontStyle: 'bold', cellPadding: 0.8 } } ]
        ],
        didDrawCell: (data) => {
          if (data.row.index === 0 && data.column.index === 0 && brasaoBase64) {
            const brasaoSize = 22;
            doc.addImage(brasaoBase64, 'PNG',
              data.cell.x + (data.cell.width - brasaoSize) / 2,
              data.cell.y + (data.cell.height - brasaoSize) / 2,
              brasaoSize, brasaoSize);
          }
        },
      });
      
      // Rodapé mais compacto
      doc.setFontSize(7); // Fonte bem pequena
      doc.setFont('helvetica', 'normal');
      doc.line(15, pageHeight - 22, pageWidth - 15, pageHeight - 22);
      doc.text('SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', pageWidth / 2, pageHeight - 19, { align: 'center' });
      doc.text('Av. Cônego Luíz Walter Hanquet, 151 - Jardim, Camaquã - RS, 96180-000', pageWidth / 2, pageHeight - 15.5, { align: 'center' });
      doc.text('Email: sim.agricultura.camaqua@gmail.com', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text('Tel/Watts: (51) 99544-2158', pageWidth / 2, pageHeight - 8.5, { align: 'center' });
    };

    const isProduto = requisicao.tipo_requisicao === 'PRODUTO';
    const title = isProduto ? "REQUISIÇÃO PARA ANÁLISE OFICIAL DE PRODUTOS" : "REQUISIÇÃO PARA ANÁLISE OFICIAL DE ÁGUA";
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 45, { align: 'center' });

    const sectionHeadStyle = { fillColor: '#E9ECEF', textColor: '#343A40', fontStyle: 'bold' as const, halign: 'center' as const };
    const spacerStyle = { minCellHeight: 3, styles: { lineWidth: 0 } };

    const bodyData: RowInput[] = [];

    bodyData.push([{ content: 'DADOS DO ESTABELECIMENTO', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push([{ content: `SIM: ${requisicao.estabelecimentos.sim_id || ''}` }, { content: `CNPJ/CPF: ${requisicao.estabelecimentos.cnpj_cpf}` }]);
    bodyData.push([{ content: `ESTABELECIMENTO: ${requisicao.estabelecimentos.nome}`, colSpan: 2 }]);
    bodyData.push([{ content: `ENDEREÇO: ${requisicao.estabelecimentos.endereco}`, colSpan: 2 }]);
    bodyData.push([{ content: '', colSpan: 2, styles: spacerStyle }]);
    const coletaHead = isProduto ? 'DADOS DA AMOSTRA (PRODUTO)' : 'DADOS DA AMOSTRA (ÁGUA)';
    bodyData.push([{ content: coletaHead, colSpan: 2, styles: sectionHeadStyle }]);
    if (isProduto) {
        bodyData.push([{ content: 'PRODUTO COLETADO' }, { content: requisicao.produto_coletado || '' }]);
        bodyData.push([{ content: 'LOTE' }, { content: requisicao.lote || '' }]);
        bodyData.push([{ content: 'DATA DE PRODUÇÃO' }, { content: requisicao.data_producao ? new Date(requisicao.data_producao + 'T00:00:00').toLocaleDateString('pt-BR') : '' }]);
        bodyData.push([{ content: 'DATA DE VALIDADE' }, { content: requisicao.data_validade ? new Date(requisicao.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : '' }]);
    } else {
        bodyData.push([{ content: `PONTO DE COLETA: ${requisicao.ponto_coleta || ''}`, colSpan: 2 }]);
    }
    bodyData.push([{ content: '', colSpan: 2, styles: { minCellHeight: 4, lineWidth: 0 } }]);
    bodyData.push([{ content: 'DADOS DA COLETA', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push([{ content: 'DATA DA COLETA' }, { content: requisicao.data_coleta ? new Date(requisicao.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : '' }]);
    bodyData.push([{ content: 'HORA DA COLETA' }, { content: requisicao.hora_coleta || '' }]);
    // ==========================================================================
    //  AJUSTE 2: TEMPERATURAS LADO A LADO
    // ==========================================================================
    bodyData.push([
      { content: `TEMP. PRODUTO (°C): ${requisicao.temperatura_produto || ''}` }, 
      { content: `TEMP. AMBIENTE (°C): ${requisicao.temperatura_ambiente || ''}` }
    ]);
    bodyData.push([{ content: 'MÊS DE REFERÊNCIA' }, { content: requisicao.mes_referencia || '' }]);
    bodyData.push([{ content: 'Nº DO LACRE' }, { content: requisicao.lacre_numero || '' }]);
    bodyData.push([{ content: '', colSpan: 2, styles: spacerStyle }]);
    const analises = requisicao.requisicao_analises ?? [];
    const paramsMicro = analises.filter(p => p.parametros_analise?.tipo === 'MICROBIOLOGICA').map(p => `(X) ${p.parametros_analise.nome_parametro}`);
    const paramsFisico = analises.filter(p => p.parametros_analise?.tipo === 'FISICO-QUIMICA').map(p => `(X) ${p.parametros_analise.nome_parametro}`);
    const hasMicro = paramsMicro.length > 0;
    const hasFisico = paramsFisico.length > 0;
    if (hasMicro || hasFisico) {
      bodyData.push([{ content: 'ANÁLISES SOLICITADAS', colSpan: 2, styles: sectionHeadStyle }]);
      if (hasMicro && hasFisico) {
        bodyData.push([{ content: 'MICROBIOLÓGICAS', styles: { fontStyle: 'bold' as const, halign:'center' as const } }, { content: 'FÍSICO-QUÍMICAS', styles: { fontStyle:'bold' as const, halign:'center' as const } }]);
        const maxRows = Math.max(paramsMicro.length, paramsFisico.length);
        for (let i = 0; i < maxRows; i++) { bodyData.push([{ content: paramsMicro[i] || '' }, { content: paramsFisico[i] || '' }]); }
      } else if (hasMicro) {
        bodyData.push([{ content: 'MICROBIOLÓGICAS', colSpan: 2, styles: { fontStyle:'bold' as const, halign:'center' as const } }]);
        paramsMicro.forEach(p => bodyData.push([{ content: p, colSpan: 2 }]));
      } else {
        bodyData.push([{ content: 'FÍSICO-QUÍMICAS', colSpan: 2, styles: { fontStyle:'bold' as const, halign:'center' as const } }]);
        paramsFisico.forEach(p => bodyData.push([{ content: p, colSpan: 2 }]));
      }
      bodyData.push([{ content: '', colSpan: 2, styles: spacerStyle }]);
    }
    bodyData.push([{ content: 'OBSERVAÇÕES', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push([{ content: requisicao.observacao || 'Nenhuma observação.', colSpan: 2, styles: { minCellHeight: 15 } }]);

    autoTable(doc, { 
        startY: 50, 
        body: bodyData, 
        theme: 'grid',
        didDrawPage: (data) => { addHeaderAndFooter(); },
        styles: { fontSize: 9, cellPadding: 1.5 }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY;
    const signatureSectionHeight = 40; 
    const footerStartY = pageHeight - 25; // Posição do topo do rodapé
    if (finalY + signatureSectionHeight > footerStartY) {
        doc.addPage();
        finalY = 40;
    }
    const startYAssinaturas = finalY + 10;
    const spaceBetweenBoxes = 8;
    const marginHorizontal = 15;
    const boxWidth = (pageWidth - (marginHorizontal * 2) - spaceBetweenBoxes) / 2;
    autoTable(doc, { startY: startYAssinaturas, head: [['RESPONSÁVEL LEGAL']], headStyles: sectionHeadStyle, body: [[' ']], bodyStyles: { minCellHeight: 18 }, theme: 'grid', tableWidth: boxWidth, margin: { left: marginHorizontal } });
    autoTable(doc, { startY: startYAssinaturas, head: [['MÉDICO VETERINÁRIO OFICIAL']], headStyles: sectionHeadStyle, body: [[' ']], bodyStyles: { minCellHeight: 18 }, theme: 'grid', tableWidth: boxWidth, margin: { left: marginHorizontal + boxWidth + spaceBetweenBoxes } });
    
    doc.save(`Requisicao_${requisicao.id}_${requisicao.estabelecimentos.nome}.pdf`);
  };

  if (loading) { return <main><div className="form-container"><p>Carregando detalhes...</p></div></main>; }
  if (!requisicao) { return <main><div className="form-container"><p>Requisição não encontrada.</p> <Link href="/historico">Voltar</Link></div></main>; }

  const paramsMicro = (requisicao.requisicao_analises ?? []).filter(p => p.parametros_analise?.tipo === 'MICROBIOLOGICA');
  const paramsFisico = (requisicao.requisicao_analises ?? []).filter(p => p.parametros_analise?.tipo === 'FISICO-QUIMICA');

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
        <div className="details-section"><h3>Dados do Estabelecimento</h3><p><strong>Nome:</strong> {requisicao.estabelecimentos?.nome || 'N/A'}</p><p><strong>CNPJ/CPF:</strong> {requisicao.estabelecimentos?.cnpj_cpf || 'N/A'}</p><p><strong>Endereço:</strong> {requisicao.estabelecimentos?.endereco || 'N/A'}</p></div>
        <div className="details-section">
          <h3>Dados da Coleta</h3>
          <div className="details-grid">
            <p><strong>Data da Coleta:</strong> {requisicao.data_coleta ? new Date(requisicao.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p><strong>Hora da Coleta:</strong> {requisicao.hora_coleta || 'N/A'}</p>
            <p><strong>Temp. Produto:</strong> {requisicao.temperatura_produto ? `${requisicao.temperatura_produto}°C` : 'N/A'}</p>
            <p><strong>Temp. Ambiente:</strong> {requisicao.temperatura_ambiente ? `${requisicao.temperatura_ambiente}°C` : 'N/A'}</p>
            <p><strong>Mês de Referência:</strong> {requisicao.mes_referencia || 'N/A'}</p>
            <p><strong>Nº do Lacre:</strong> {requisicao.lacre_numero || 'N/A'}</p>
          </div>
        </div>
        <div className="details-section"><h3>Dados da Amostra</h3>{requisicao.tipo_requisicao === 'PRODUTO' ? (<div className="details-grid"><p><strong>Produto:</strong> {requisicao.produto_coletado || 'N/A'}</p><p><strong>Lote:</strong> {requisicao.lote || 'N/A'}</p><p><strong>Produção:</strong> {requisicao.data_producao ? new Date(requisicao.data_producao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p><p><strong>Validade:</strong> {requisicao.data_validade ? new Date(requisicao.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p></div>) : (<p><strong>Ponto de Coleta (Água):</strong> {requisicao.ponto_coleta || 'N/A'}</p>)}</div>
        <div className="details-section"><h3>Análises Solicitadas</h3>{paramsMicro.length > 0 && ( <> <h4>Microbiológicas</h4> <ul>{paramsMicro.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul> </> )}{paramsFisico.length > 0 && ( <> <h4>Físico-químicas</h4> <ul>{paramsFisico.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul> </> )}{(paramsMicro.length === 0 && paramsFisico.length === 0) && (<p>Nenhuma análise solicitada.</p>)}</div>
        {requisicao.observacao && (<div className="details-section"><h3>Observações</h3><p>{requisicao.observacao}</p></div>)}
      </div>
    </main>
  );
}
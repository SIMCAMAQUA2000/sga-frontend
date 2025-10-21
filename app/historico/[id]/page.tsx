'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipagens (sem alterações) ---
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

  // useEffect para buscar dados (sem alterações)
  useEffect(() => {
    if (params.id) {
      async function fetchDetalhes() {
        setLoading(true);
        const { data, error } = await supabase
          .from('requisicoes')
          .select(`*, estabelecimentos (*), requisicao_analises (parametros_analise (*))`)
          .eq('id', params.id)
          .single();

        if (error) {
          console.error("Erro ao buscar detalhes:", error);
        } else {
          setRequisicao(data as RequisicaoDetalhada);
        }
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
    
    // Função de cabeçalho e rodapé (sem alterações)
    const addHeaderAndFooter = () => {
      doc.addImage(brasaoBase64, 'PNG', 15, 12, 25, 25);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DO RIO GRANDE DO SUL', pageWidth / 2, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('PREFEITURA MUNICIPAL DE CAMAQUÃ', pageWidth / 2, 20, { align: 'center' });
      doc.text('SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', pageWidth / 2, 25, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('SERVIÇO DE INSPEÇÃO MUNICIPAL', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);
      doc.text('SECRETARIA MUNICIPAL DE AGRICULTURA E ABASTECIMENTO', pageWidth / 2, pageHeight - 25, { align: 'center' });
      doc.text('Av. Cônego Luíz Walter Hanquet, 151 - Jardim, Camaquã - RS, 96180-000', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text('Email: sim.agricultura.camaqua@gmail.com', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text('Tel/Watts: (51) 99544-2158', pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Título Principal (sem alterações)
    const isProduto = requisicao.tipo_requisicao === 'PRODUTO';
    const title = isProduto ? "REQUISIÇÃO PARA ANÁLISE OFICIAL DE PRODUTOS" : "REQUISIÇÃO PARA ANÁLISE OFICIAL DE ÁGUA";
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 50, { align: 'center' });

    // ==========================================================================
    //  CORREÇÃO FINAL DE TIPO AQUI: USANDO STRING HEXADECIMAL
    // ==========================================================================
    const sectionHeadStyle = { fillColor: '#E9ECEF', textColor: '#343A40', fontStyle: 'bold', halign: 'center' as const };
    const spacerStyle = { minCellHeight: 5, styles: { lineWidth: 0 } };

    // Construção do corpo da tabela ÚNICA
    const bodyData = [];

    bodyData.push([{ content: 'DADOS DO ESTABELECIMENTO', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push([`SIM: ${requisicao.estabelecimentos.sim_id || ''}`, `CNPJ/CPF: ${requisicao.estabelecimentos.cnpj_cpf}`]);
    bodyData.push([{ content: `ESTABELECIMENTO: ${requisicao.estabelecimentos.nome}`, colSpan: 2 }]);
    bodyData.push([{ content: `ENDEREÇO: ${requisicao.estabelecimentos.endereco}`, colSpan: 2 }]);
    bodyData.push([{ content: '', colSpan: 2, styles: spacerStyle }]);

    const coletaHead = isProduto ? 'DADOS DA AMOSTRA (PRODUTO)' : 'DADOS DA AMOSTRA (ÁGUA)';
    bodyData.push([{ content: coletaHead, colSpan: 2, styles: sectionHeadStyle }]);
    if (isProduto) {
        bodyData.push(['PRODUTO COLETADO', requisicao.produto_coletado || '']);
        bodyData.push(['LOTE', requisicao.lote || '']);
        bodyData.push(['DATA DE PRODUÇÃO', requisicao.data_producao ? new Date(requisicao.data_producao + 'T00:00:00').toLocaleDateString('pt-BR') : '']);
        bodyData.push(['DATA DE VALIDADE', requisicao.data_validade ? new Date(requisicao.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : '']);
    } else {
        bodyData.push([{ content: `PONTO DE COLETA: ${requisicao.ponto_coleta || ''}`, colSpan: 2 }]);
    }
    bodyData.push([{ content: 'DADOS DA COLETA', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push(['DATA DA COLETA', requisicao.data_coleta ? new Date(requisicao.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : '']);
    bodyData.push(['HORA DA COLETA', requisicao.hora_coleta || '']);
    bodyData.push(['MÊS DE REFERÊNCIA', requisicao.mes_referencia || '']);
    bodyData.push(['Nº DO LACRE', requisicao.lacre_numero || '']);
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
        for (let i = 0; i < maxRows; i++) {
            bodyData.push([ paramsMicro[i] || '', paramsFisico[i] || '' ]);
        }
      } else if (hasMicro) {
        bodyData.push([{ content: 'MICROBIOLÓGICAS', colSpan: 2, styles: { fontStyle:'bold' as const, halign:'center' as const } }]);
        paramsMicro.forEach(p => bodyData.push([{ content: p, colSpan: 2 }]));
      } else { // hasFisico
        bodyData.push([{ content: 'FÍSICO-QUÍMICAS', colSpan: 2, styles: { fontStyle:'bold' as const, halign:'center' as const } }]);
        paramsFisico.forEach(p => bodyData.push([{ content: p, colSpan: 2 }]));
      }
      bodyData.push([{ content: '', colSpan: 2, styles: spacerStyle }]);
    }
    
    bodyData.push([{ content: 'OBSERVAÇÕES', colSpan: 2, styles: sectionHeadStyle }]);
    bodyData.push([{ content: requisicao.observacao || 'Nenhuma observação.', colSpan: 2, styles: { minCellHeight: 25 } }]);

    // DESENHA A TABELA PRINCIPAL
    autoTable(doc, {
      startY: 55,
      body: bodyData,
      theme: 'grid',
      didDrawPage: () => { addHeaderAndFooter(); },
    });

    // Seção de Assinaturas (sem alterações)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY;
    if (finalY + 50 > pageHeight) {
        doc.addPage();
        finalY = 40;
    }
    const startYAssinaturas = finalY + 15;
    const spaceBetweenBoxes = 8;
    const marginHorizontal = 15;
    const boxWidth = (pageWidth - (marginHorizontal * 2) - spaceBetweenBoxes) / 2;

    autoTable(doc, {
        startY: startYAssinaturas,
        head: [['RESPONSÁVEL LEGAL']], headStyles: sectionHeadStyle,
        body: [[' ']], bodyStyles: { minCellHeight: 25 },
        theme: 'grid', tableWidth: boxWidth, margin: { left: marginHorizontal },
    });
    autoTable(doc, {
        startY: startYAssinaturas,
        head: [['MÉDICO VETERINÁRIO OFICIAL']], headStyles: sectionHeadStyle,
        body: [[' ']], bodyStyles: { minCellHeight: 25 },
        theme: 'grid', tableWidth: boxWidth, margin: { left: marginHorizontal + boxWidth + spaceBetweenBoxes },
    });
    
    doc.save(`Requisicao_${requisicao.id}_${requisicao.estabelecimentos.nome}.pdf`);
  };

  // O restante do componente (JSX) para exibir a página (sem alterações)
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

        <div className="details-section">
          <h3>Dados do Estabelecimento</h3>
          <p><strong>Nome:</strong> {requisicao.estabelecimentos?.nome || 'N/A'}</p>
          <p><strong>CNPJ/CPF:</strong> {requisicao.estabelecimentos?.cnpj_cpf || 'N/A'}</p>
          <p><strong>Endereço:</strong> {requisicao.estabelecimentos?.endereco || 'N/A'}</p>
        </div>

        <div className="details-section">
          <h3>Dados da Coleta</h3>
          <div className="details-grid">
            <p><strong>Data da Coleta:</strong> {requisicao.data_coleta ? new Date(requisicao.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p><strong>Hora da Coleta:</strong> {requisicao.hora_coleta || 'N/A'}</p>
            <p><strong>Mês de Referência:</strong> {requisicao.mes_referencia || 'N/A'}</p>
            <p><strong>Nº do Lacre:</strong> {requisicao.lacre_numero || 'N/A'}</p>
          </div>
        </div>
        
        <div className="details-section">
          <h3>Dados da Amostra</h3>
          {requisicao.tipo_requisicao === 'PRODUTO' ? (
            <div className="details-grid">
              <p><strong>Produto:</strong> {requisicao.produto_coletado || 'N/A'}</p>
              <p><strong>Lote:</strong> {requisicao.lote || 'N/A'}</p>
              <p><strong>Produção:</strong> {requisicao.data_producao ? new Date(requisicao.data_producao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
              <p><strong>Validade:</strong> {requisicao.data_validade ? new Date(requisicao.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          ) : (
            <p><strong>Ponto de Coleta (Água):</strong> {requisicao.ponto_coleta || 'N/A'}</p>
          )}
        </div>

        <div className="details-section">
          <h3>Análises Solicitadas</h3>
          {paramsMicro.length > 0 && ( <> <h4>Microbiológicas</h4> <ul>{paramsMicro.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul> </> )}
          {paramsFisico.length > 0 && ( <> <h4>Físico-químicas</h4> <ul>{paramsFisico.map(p => <li key={p.parametros_analise.nome_parametro}>{p.parametros_analise.nome_parametro}</li>)}</ul> </> )}
          {(paramsMicro.length === 0 && paramsFisico.length === 0) && (<p>Nenhuma análise solicitada.</p>)}
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
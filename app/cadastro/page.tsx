// Arquivo: app/cadastro/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importa o hook de navegação
import Link from 'next/link'; // Importa o componente de Link
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário

export default function CadastroEstabelecimentoPage() {
  const router = useRouter(); // Inicializa o router para redirecionamento

  // Estados para cada campo do formulário
  const [nome, setNome] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [simId, setSimId] = useState('');
  const [endereco, setEndereco] = useState('');
  const [municipio, setMunicipio] = useState('CAMAQUÃ-RS'); // Valor padrão
  const [emailLaudo, setEmailLaudo] = useState('');
  const [emailCobranca, setEmailCobranca] = useState('');
  const [loading, setLoading] = useState(false);

  // Função chamada ao enviar o formulário
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Previne o recarregamento da página
    setLoading(true);

    // Insere os dados no Supabase
    const { error } = await supabase
      .from('estabelecimentos')
      .insert([{ 
        nome, 
        cnpj_cpf: cnpjCpf, 
        sim_id: simId, 
        endereco, 
        municipio, 
        email_laudo: emailLaudo, 
        email_cobranca: emailCobranca 
      }]);

    setLoading(false);

    if (error) {
      alert('Erro ao cadastrar estabelecimento: ' + error.message);
    } else {
      alert('Estabelecimento cadastrado com sucesso!');
      router.push('/'); // Redireciona o usuário para a página inicial
    }
  };

  return (
    <main>
      <div className="form-container">
        <h1>Cadastrar Novo Estabelecimento</h1>
        
        <form onSubmit={handleSubmit}>
          {/* Campo Nome */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="nome" className="form-label">Nome do Estabelecimento:</label>
            <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          {/* Campo CNPJ/CPF */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="cnpjCpf" className="form-label">CNPJ/CPF:</label>
            <input type="text" id="cnpjCpf" value={cnpjCpf} onChange={(e) => setCnpjCpf(e.target.value)} required />
          </div>

          {/* Campo SIM */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="simId" className="form-label">Nº SIM:</label>
            <input type="text" id="simId" value={simId} onChange={(e) => setSimId(e.target.value)} required />
          </div>

          {/* Campo Endereço */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="endereco" className="form-label">Endereço:</label>
            <input type="text" id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>

          {/* Campo Município */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="municipio" className="form-label">Município:</label>
            <input type="text" id="municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} required />
          </div>

          {/* Campo Email Laudo */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="emailLaudo" className="form-label">Email para Laudo:</label>
            <input type="email" id="emailLaudo" value={emailLaudo} onChange={(e) => setEmailLaudo(e.target.value)} />
          </div>

          {/* Campo Email Cobrança */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="emailCobranca" className="form-label">Email para Cobrança (Opcional):</label>
            <input type="email" id="emailCobranca" value={emailCobranca} onChange={(e) => setEmailCobranca(e.target.value)} />
          </div>
          
          <hr style={{ margin: '2rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" className="form-link">Voltar</Link>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Estabelecimento'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
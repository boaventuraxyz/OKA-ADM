function PrivacyContent({
  normalizedCandidateName,
  updateSubject,
}: {
  normalizedCandidateName: string | null;
  updateSubject: string;
}) {
  return (
    <>
      <h1 className="pol-titulo">Política de Privacidade</h1>
      <p className="pol-updated">Última atualização: junho de 2026</p>

      <p>
        Esta Política de Privacidade descreve como os dados pessoais coletados por meio
        deste abaixo-assinado são tratados, armazenados e utilizados, em conformidade
        com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
      </p>

      <h2>1. Responsável pelo Tratamento</h2>
      <p>
        Os dados coletados neste formulário são de responsabilidade {normalizedCandidateName ? (
          <>de {normalizedCandidateName}</>
        ) : (
          <>da equipe responsável pela iniciativa</>
        )}, que atua como controladora dos dados pessoais fornecidos pelos participantes.
      </p>

      <h2>2. Dados Coletados</h2>
      <p>Durante o preenchimento do formulário, os seguintes dados poderão ser coletados:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endereço de e-mail</li>
        <li>Telefone / WhatsApp</li>
        <li>Endereço (CEP, rua, número, complemento, bairro, cidade e estado)</li>
      </ul>

      <h2>3. Finalidade do Tratamento</h2>
      <p>Os dados coletados serão utilizados exclusivamente para as seguintes finalidades:</p>
      <ul>
        <li>Registro e controle das assinaturas do abaixo-assinado;</li>
        <li>Envio de comunicados, atualizações e informações relacionadas à iniciativa;</li>
        <li>
          Encaminhamento de materiais informativos e atualizações sobre {updateSubject};
        </li>
        <li>Comunicação futura por e-mail, telefone, WhatsApp ou correspondência.</li>
      </ul>

      <h2>4. Base Legal</h2>
      <p>
        O tratamento dos dados é realizado com base no consentimento expresso do
        titular, conforme previsto no art. 7º, inciso I, da LGPD.
      </p>

      <h2>5. Compartilhamento de Dados</h2>
      <p>
        Os dados pessoais dos participantes não serão vendidos, cedidos ou compartilhados
        com terceiros para fins comerciais. Poderão ser compartilhados apenas com
        ferramentas de gestão e comunicação utilizadas internamente pela iniciativa.
      </p>

      <h2>6. Armazenamento e Segurança</h2>
      <p>
        Os dados são armazenados em ambiente seguro e protegido. Adotamos medidas
        técnicas e administrativas para proteger as informações contra acessos não
        autorizados, alteração, divulgação ou destruição indevida.
      </p>

      <h2>7. Prazo de Retenção</h2>
      <p>
        Os dados serão mantidos pelo período necessário para o cumprimento das finalidades
        descritas nesta política ou até que o titular solicite a sua exclusão.
      </p>

      <h2>8. Direitos do Titular</h2>
      <p>Nos termos da LGPD, o titular dos dados tem direito a:</p>
      <ul>
        <li>Confirmar a existência de tratamento de seus dados;</li>
        <li>Acessar seus dados pessoais;</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Revogar o consentimento a qualquer momento;</li>
        <li>Solicitar a exclusão de seus dados.</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>Este site não utiliza cookies de rastreamento ou ferramentas de análise.</p>

      <h2>10. Alterações nesta Política</h2>
      <p>
        Esta Política de Privacidade pode ser atualizada periodicamente. Em caso de
        alterações relevantes, os participantes serão notificados pelos canais disponíveis.
      </p>

      <hr />
      <p>
        Ao assinar o abaixo-assinado, o participante declara ter lido e compreendido
        esta Política de Privacidade e consente com o tratamento de seus dados.
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <h1 className="pol-titulo">Termos de Uso</h1>
      <p className="pol-updated">Última atualização: junho de 2026</p>
      <p>
        Ao utilizar esta página, você concorda em fornecer informações verdadeiras e em
        usar o serviço somente para manifestar apoio e receber comunicações relacionadas
        à iniciativa.
      </p>
      <p>
        É proibido tentar comprometer a segurança da página, inserir dados de terceiros
        sem autorização ou utilizar o formulário para fins ilícitos.
      </p>
      <p>
        O conteúdo e as condições desta página podem ser atualizados quando necessário,
        sempre respeitando a legislação aplicável e os direitos dos titulares dos dados.
      </p>
    </>
  );
}

function consentPartyReference(partyName?: string | null) {
  const normalizedPartyName = partyName?.trim();
  if (!normalizedPartyName) return "da organização partidária responsável";
  if (/^(?:partido liberal|pl)(?:\s*\(pl\))?$/i.test(normalizedPartyName)) {
    return "do Partido Liberal (PL)";
  }
  return `de ${normalizedPartyName}`;
}

export function PoliticasRodape({
  candidateName,
  partyName,
}: {
  candidateName?: string | null;
  partyName?: string | null;
}) {
  const normalizedCandidateName = candidateName?.trim() || null;
  const updateSubject = normalizedCandidateName || "a iniciativa";
  const partyReference = consentPartyReference(partyName);

  return (
    <section aria-label="Privacidade e termos" className="politicas-rodape">
      <div className="pol-actions">
        <details className="pol-item pol-policy">
          <summary className="pol-toggle">
            <span className="pol-toggle-default">
              Seus dados são protegidos pela LGPD &middot; Ler Política de Privacidade
            </span>
            <span className="pol-toggle-campaign">Política de Privacidade</span>
          </summary>
          <div className="pol-conteudo">
            <PrivacyContent
              normalizedCandidateName={normalizedCandidateName}
              updateSubject={updateSubject}
            />
          </div>
        </details>

        <details className="pol-item pol-terms">
          <summary className="pol-toggle">Termos de Uso</summary>
          <div className="pol-conteudo">
            <TermsContent />
          </div>
        </details>

        <details className="pol-item pol-optout">
          <summary className="pol-toggle">Sair da lista</summary>
          <div className="pol-conteudo">
            <h1 className="pol-titulo">Sair da lista</h1>
            <p>
              Para revogar o consentimento, responda <strong>SAIR</strong> em qualquer
              mensagem recebida ou solicite o descadastramento pelo contato da campanha
              informado acima.
            </p>
          </div>
        </details>
      </div>

      <p className="pol-campaign-summary">
        Os dados informados são tratados com base no seu consentimento (art. 7º, I e art.
        11, I da Lei 13.709/2018 — LGPD) e usados para comunicação por WhatsApp e SMS da
        campanha e {partyReference}. Nenhum dado é vendido nem usado para fins comerciais.
        Você pode revogar o consentimento e sair da lista a qualquer momento, ou respondendo
        SAIR em qualquer mensagem.
      </p>
      <p className="pol-copyright">© 2026. Todos os direitos reservados.</p>
    </section>
  );
}

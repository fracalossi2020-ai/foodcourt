import { api } from "../core/api.js";
import { esc } from "../core/ui.js";

// Páginas legais públicas: Termos de Uso, Política de Privacidade e Política
// de Cancelamento e Reembolso. O texto descreve o que a plataforma faz de
// fato hoje; os dados cadastrais da empresa vêm do servidor.

const PAGES = {
  termos: { title: "Termos de Uso", kicker: "CONDIÇÕES DA PLATAFORMA" },
  privacidade: { title: "Política de Privacidade", kicker: "SEUS DADOS" },
  cancelamento: { title: "Cancelamento e Reembolso", kicker: "PEDIDOS E PAGAMENTOS" },
};

export async function render(view, _boot, params = {}) {
  const slug = PAGES[params.mode] ? params.mode : "termos";
  const page = PAGES[slug];
  let company = { tradeName: "FoodCourt", complete: false };
  try {
    company = (await api.publicCompany()).company || company;
  } catch {
    /* sem os dados da empresa a página ainda deve abrir */
  }
  const updated = formatDate(company.termsUpdatedAt);
  view.innerHTML = `<div class="legal-page">
    <button type="button" class="legal-back" data-legal-back>← Voltar</button>
    <header class="legal-head">
      <span class="legal-kicker">${page.kicker}</span>
      <h1>${page.title}</h1>
      <p>Última atualização: ${updated}</p>
      <nav class="legal-nav" aria-label="Documentos legais">
        ${Object.entries(PAGES)
          .map(([id, item]) => `<a class="${id === slug ? "active" : ""}" href="#/${id}">${item.title}</a>`)
          .join("")}
      </nav>
    </header>
    ${companyBlock(company)}
    <article class="legal-body">${slug === "termos" ? terms(company) : slug === "privacidade" ? privacy(company) : refunds(company)}</article>
  </div>`;
  view.querySelector("[data-legal-back]").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.hash = "#/";
  });
}

function formatDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? esc(iso || "") : date.toLocaleDateString("pt-BR");
}

function companyBlock(company) {
  if (!company.complete)
    return `<aside class="legal-company legal-company-pending"><b>${esc(company.tradeName)}</b><span>Os dados cadastrais da empresa responsável (razão social, CNPJ e endereço) estão sendo publicados. Para contato, use a Central de Ajuda.</span></aside>`;
  return `<aside class="legal-company"><b>${esc(company.legalName)}</b><span>CNPJ ${esc(company.cnpj)}</span><span>${esc(company.address)}</span><span>Contato: <a href="mailto:${esc(company.email)}">${esc(company.email)}</a>${company.phone ? ` · ${esc(company.phone)}` : ""}</span></aside>`;
}

function operator(company) {
  return company.complete
    ? `${esc(company.legalName)} (CNPJ ${esc(company.cnpj)}), responsável pela plataforma ${esc(company.tradeName)}`
    : `a empresa responsável pela plataforma ${esc(company.tradeName)}`;
}

function contact(company) {
  return company.privacyEmail
    ? `<a href="mailto:${esc(company.privacyEmail)}">${esc(company.privacyEmail)}</a>`
    : `a <a href="#/suporte">Central de Ajuda</a>`;
}

function terms(company) {
  const name = esc(company.tradeName);
  return `
<h2>1. O que é o ${name}</h2>
<p>O ${name} é uma plataforma digital operada por ${operator(company)}. Ela conecta clientes a estabelecimentos independentes (lojas) que vendem alimentos e produtos, e a entregadores autônomos que realizam as entregas. O ${name} não produz os alimentos, não é o vendedor dos produtos e não realiza as entregas por conta própria.</p>

<h2>2. Cadastro e conta</h2>
<p>Para pedir, vender ou entregar, é preciso criar uma conta com dados verdadeiros e mantê-los atualizados. A conta é pessoal e intransferível. Você é responsável por guardar sua senha e por tudo que for feito com a sua conta. Menores de 18 anos só podem usar a plataforma com autorização e supervisão do responsável legal.</p>
<p>Podemos suspender ou encerrar contas que violem estes termos, apresentem dados falsos, pratiquem fraude ou coloquem em risco outros usuários. Você pode excluir sua conta a qualquer momento em Perfil → Privacidade.</p>

<h2>3. Pedidos</h2>
<p>Ao confirmar um pedido, você faz uma oferta de compra ao estabelecimento escolhido. O pedido só é considerado confirmado após a aprovação do pagamento pelo provedor e o aceite da loja. Preços, taxas de entrega, prazos estimados e disponibilidade são definidos por cada loja e informados antes da confirmação. Prazos de entrega são estimativas e podem variar por trânsito, clima e volume de pedidos.</p>
<p>A loja é a responsável pela qualidade, composição, informações nutricionais, alergênicos, embalagem e validade dos produtos, bem como pela emissão dos documentos fiscais da venda.</p>

<h2>4. Pagamentos</h2>
<p>Os pagamentos são processados por provedores externos (Mercado Pago e, quando disponível, Stripe). O ${name} não armazena números de cartão. Os meios disponíveis podem variar por loja e região. Cancelamentos e reembolsos seguem a <a href="#/cancelamento">Política de Cancelamento e Reembolso</a>.</p>

<h2>5. Estabelecimentos parceiros</h2>
<p>Lojas cadastradas concordam em manter cardápio, preços, horários e dados cadastrais corretos, cumprir a legislação sanitária, fiscal e de defesa do consumidor, e atender os pedidos aceitos. O uso do Portal do Parceiro pode estar condicionado a um plano de assinatura e a uma comissão sobre as vendas, informados no momento do cadastro. As condições financeiras e os repasses são detalhados no contrato de adesão do parceiro.</p>

<h2>6. Entregadores</h2>
<p>Entregadores atuam de forma autônoma, sem vínculo empregatício com o ${name} ou com as lojas. O cadastro passa por análise documental e pode ser recusado ou encerrado. O entregador é responsável por seu veículo, sua habilitação e pelo cumprimento das leis de trânsito.</p>

<h2>7. Uso aceitável</h2>
<p>É proibido usar a plataforma para fins ilícitos, fraudar pagamentos ou cupons, publicar conteúdo ofensivo ou falso em avaliações, tentar acessar contas ou dados de terceiros, ou interferir no funcionamento do serviço.</p>

<h2>8. Avaliações e conteúdo</h2>
<p>Avaliações e comentários são de responsabilidade de quem os publica. Podemos remover conteúdo que viole estes termos. Ao publicar, você autoriza a exibição do conteúdo na plataforma.</p>

<h2>9. Responsabilidade</h2>
<p>O ${name} se empenha para manter o serviço disponível, mas não garante funcionamento ininterrupto. Como intermediário, o ${name} não responde pela qualidade dos produtos nem pela conduta de lojas e entregadores, sem prejuízo dos direitos previstos no Código de Defesa do Consumidor. Nossa Central de Ajuda intermedeia reclamações entre clientes e lojas.</p>

<h2>10. Propriedade intelectual</h2>
<p>Marca, layout, textos e código do ${name} pertencem à empresa responsável ou a seus licenciantes. Logos, fotos e descrições de produtos pertencem às respectivas lojas, que autorizam sua exibição na plataforma.</p>

<h2>11. Alterações</h2>
<p>Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas na plataforma ou por e-mail. O uso continuado após a atualização significa concordância com a nova versão.</p>

<h2>12. Lei aplicável e contato</h2>
<p>Estes termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados. Dúvidas e solicitações: ${contact(company)}.</p>`;
}

function privacy(company) {
  const name = esc(company.tradeName);
  return `
<p>Esta política explica quais dados o ${name} coleta, por que coleta e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). O controlador dos dados é ${operator(company)}.</p>

<h2>1. Dados que coletamos</h2>
<ul>
<li><b>Cadastro:</b> nome, e-mail, telefone e senha (guardada apenas como hash). No login social, recebemos nome e e-mail do Google ou da Apple.</li>
<li><b>Endereços de entrega:</b> CEP, rua, número, complemento, bairro, cidade e estado que você cadastra.</li>
<li><b>Pedidos e pagamentos:</b> itens, valores, loja, status, observações, meio de pagamento escolhido e identificadores retornados pelo provedor de pagamento. Não armazenamos número de cartão nem CVV.</li>
<li><b>Uso da plataforma:</b> favoritos, cupons, pontos de fidelidade, avaliações, mensagens de suporte e conversas sobre pedidos.</li>
<li><b>Notificações:</b> assinatura de push do navegador, quando você autoriza.</li>
<li><b>Lojas:</b> dados do responsável, CNPJ ou CPF, endereço, cardápio, horários, imagens e dados financeiros necessários para repasses.</li>
<li><b>Entregadores:</b> CPF, data de nascimento, veículo, placa, CNH, chave Pix, foto do documento e selfie para verificação de identidade, e localização durante uma entrega em andamento, quando o compartilhamento está ligado.</li>
<li><b>Técnicos:</b> endereço IP, navegador e registros de acesso, usados para segurança e prevenção a fraudes.</li>
</ul>

<h2>2. Para que usamos</h2>
<ul>
<li>Criar e manter sua conta e processar pedidos, pagamentos e entregas (execução de contrato).</li>
<li>Enviar avisos sobre o andamento dos pedidos e comunicações da conta (execução de contrato e legítimo interesse).</li>
<li>Prevenir fraudes, proteger contas e cumprir obrigações legais e fiscais.</li>
<li>Enviar promoções e novidades, apenas com seu consentimento, que pode ser retirado nas configurações.</li>
<li>Verificar a identidade de entregadores antes de liberar corridas.</li>
</ul>

<h2>3. Com quem compartilhamos</h2>
<ul>
<li><b>Lojas:</b> recebem nome, telefone, endereço de entrega e detalhes do seu pedido para prepará-lo e entregá-lo.</li>
<li><b>Entregadores:</b> recebem nome, endereço de entrega e telefone durante a entrega.</li>
<li><b>Provedores de pagamento:</b> Mercado Pago e Stripe recebem os dados necessários para processar a cobrança e os estornos.</li>
<li><b>Infraestrutura:</b> hospedagem, envio de e-mail, notificações push e serviços de mapa, quando ativados, apenas para prestar o serviço.</li>
<li><b>Autoridades:</b> quando exigido por lei ou ordem judicial.</li>
</ul>
<p>Não vendemos dados pessoais.</p>

<h2>4. Por quanto tempo guardamos</h2>
<p>Dados da conta ficam guardados enquanto ela existir. Pedidos e pagamentos são mantidos pelo prazo exigido pela legislação fiscal e para defesa em processos, de forma anonimizada após a exclusão da conta. Documentos e selfies de entregadores são apagados até 90 dias após a decisão sobre o cadastro. A localização do entregador não é armazenada em histórico: expira poucos minutos após o último envio.</p>

<h2>5. Seus direitos</h2>
<p>Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir anonimização ou exclusão, obter uma cópia, retirar consentimentos e saber com quem compartilhamos. Na plataforma:</p>
<ul>
<li><b>Corrigir dados:</b> Perfil → Minha conta.</li>
<li><b>Baixar uma cópia:</b> Perfil → Privacidade → Exportar meus dados.</li>
<li><b>Excluir a conta:</b> Perfil → Privacidade → Excluir conta.</li>
<li><b>Promoções:</b> Perfil → Configurações.</li>
</ul>
<p>Outras solicitações podem ser enviadas a ${contact(company)}. Respondemos em até 15 dias. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</p>

<h2>6. Cookies e armazenamento local</h2>
<p>Usamos um cookie de sessão (HttpOnly) para manter você conectado e o armazenamento local do navegador para carrinho, favoritos e preferências de exibição. Não usamos cookies de publicidade de terceiros. O login pode usar o Cloudflare Turnstile para bloquear robôs, que processa dados técnicos do navegador.</p>

<h2>7. Segurança</h2>
<p>Senhas são protegidas com hash (scrypt), o tráfego é criptografado (HTTPS), o acesso administrativo é restrito e registrado, e pagamentos são processados por provedores certificados. Nenhum sistema é infalível: em caso de incidente que possa causar risco relevante, comunicaremos os afetados e a ANPD.</p>

<h2>8. Alterações</h2>
<p>Esta política pode ser atualizada. A data no topo indica a versão vigente. Mudanças relevantes serão avisadas na plataforma.</p>`;
}

function refunds(company) {
  const name = esc(company.tradeName);
  return `
<h2>1. Cancelamento pelo cliente</h2>
<p>Você pode cancelar um pedido pela tela de acompanhamento enquanto ele estiver <b>aguardando pagamento</b> ou <b>aguardando aceite da loja</b>. Depois que a loja aceita e começa o preparo, o cancelamento depende da concordância da loja, porque os insumos já foram usados. Nesses casos, fale com a loja pela conversa do pedido ou abra um chamado na Central de Ajuda.</p>

<h2>2. Cancelamento pela loja ou pela plataforma</h2>
<p>A loja pode recusar ou cancelar um pedido por falta de produto, fechamento ou impossibilidade de entrega. O ${name} pode cancelar pedidos em caso de suspeita de fraude ou falha de pagamento. Em todos esses casos, o valor pago é integralmente estornado.</p>

<h2>3. Como o reembolso é feito</h2>
<p>O estorno é solicitado automaticamente ao provedor de pagamento no mesmo meio usado na compra. Prazos usuais para o valor aparecer:</p>
<ul>
<li><b>Pix:</b> geralmente em até 1 dia útil.</li>
<li><b>Cartão de crédito:</b> na fatura atual ou na seguinte, conforme a operadora (até 2 faturas).</li>
<li><b>Cartão de débito e Apple Pay:</b> até 10 dias úteis, conforme o banco.</li>
</ul>
<p>O status do reembolso aparece na tela do pedido. Se o prazo passar, abra um chamado na Central de Ajuda com o número do pedido.</p>

<h2>4. Problemas com o pedido</h2>
<p>Se o pedido chegou errado, incompleto, danificado ou não chegou, registre a ocorrência na Central de Ajuda em até 7 dias. A loja é a primeira responsável pela solução (reenvio, estorno parcial ou total). O ${name} intermedeia a análise e pode determinar o estorno quando a reclamação for procedente. Guarde fotos e a embalagem, pois podem ser solicitadas.</p>

<h2>5. Pedidos agendados</h2>
<p>Pedidos agendados podem ser cancelados sem custo até a loja iniciar o preparo, normalmente até o horário de abertura do turno agendado.</p>

<h2>6. Direito de arrependimento</h2>
<p>Por se tratar de alimentos preparados sob demanda e perecíveis, o direito de arrependimento de 7 dias do Código de Defesa do Consumidor não se aplica após o início do preparo. Ele continua valendo para produtos não perecíveis vendidos por lojas na plataforma, que devem ser devolvidos íntegros.</p>

<h2>7. Cupons e pontos</h2>
<p>Cupons usados em pedidos cancelados por culpa da loja ou da plataforma são devolvidos à sua carteira. Pontos de fidelidade concedidos por um pedido estornado são revertidos.</p>

<h2>8. Assinatura de lojas parceiras</h2>
<p>Lojas podem cancelar a assinatura do plano a qualquer momento pelo Portal do Parceiro. O cancelamento vale a partir do fim do período já pago; não há reembolso proporcional do mês em curso, salvo indisponibilidade comprovada da plataforma.</p>

<h2>9. Contato</h2>
<p>Dúvidas sobre esta política: ${contact(company)} ou <a href="#/suporte">Central de Ajuda</a>.</p>`;
}

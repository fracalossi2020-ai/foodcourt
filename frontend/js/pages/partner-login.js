import { api } from '../core/api.js'
import { toast } from '../core/ui.js'

let turnstileScriptPromise=null

function loadTurnstileScript(){
  if(window.turnstile)return Promise.resolve(window.turnstile)
  if(turnstileScriptPromise)return turnstileScriptPromise
  turnstileScriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async=true
    script.defer=true
    script.onload=()=>resolve(window.turnstile)
    script.onerror=()=>reject(new Error('Não foi possível carregar a verificação de segurança.'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

export async function render(view){
  const turnstileConfig=await api.turnstileConfig().catch(()=>({enabled:false,siteKey:''}))
  let turnstileToken='',turnstileWidgetId=null
  view.innerHTML=`<div class="partner-login-page"><header><a href="#/para-estabelecimentos">← Voltar para estabelecimentos</a><img src="/assets/images/foodcourt-logo.png" alt="Food Court"></header><main><section class="partner-login-intro"><span>PORTAL DO PARCEIRO</span><h1>Sua operação<br><em>em um só lugar.</em></h1><p>Acompanhe pedidos, cardápio, vendas e o funcionamento do seu estabelecimento.</p><ul><li>Gestão de pedidos em tempo real</li><li>Cardápio e disponibilidade</li><li>Indicadores da sua loja</li></ul></section><section class="partner-login-card"><span>ACESSO DO VENDEDOR</span><h2>Entre no seu portal</h2><p>Use o e-mail e a senha cadastrados para o estabelecimento.</p><form data-partner-login novalidate><label>E-mail do vendedor<div><i>✉</i><input name="email" type="email" autocomplete="email" placeholder="voce@sualoja.com" required></div></label><label>Senha<div><i>⌑</i><input name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required><button type="button" data-show-password aria-label="Mostrar senha">◉</button></div></label>${turnstileConfig.enabled?'<div class="partner-login-turnstile" data-partner-turnstile aria-label="Verificação de segurança"></div>':''}<p class="partner-login-error" role="alert" hidden></p><button class="partner-login-submit" type="submit">Entrar no Portal <b>→</b></button><a class="partner-login-forgot" href="#/esqueci-senha">Esqueci minha senha</a></form><footer>Ainda não vende no FoodCourt? <a href="#/cadastro-parceiro">Cadastrar estabelecimento</a></footer></section></main></div>`
  const form=view.querySelector('[data-partner-login]'),error=view.querySelector('.partner-login-error'),submit=view.querySelector('.partner-login-submit')
  if(turnstileConfig.enabled){
    try{
      const widget=await loadTurnstileScript(),container=view.querySelector('[data-partner-turnstile]')
      if(container?.isConnected&&widget)turnstileWidgetId=widget.render(container,{sitekey:turnstileConfig.siteKey,action:'login',theme:'light',size:'flexible',language:'pt-BR',callback:token=>{turnstileToken=token;error.hidden=true},'expired-callback':()=>{turnstileToken=''},'error-callback':()=>{turnstileToken='';error.textContent='Não foi possível concluir a verificação de segurança.';error.hidden=false}})
    }catch(exception){error.textContent=exception.message;error.hidden=false}
  }
  view.querySelector('[data-show-password]').onclick=()=>{const input=form.password;input.type=input.type==='password'?'text':'password'}
  form.onsubmit=async event=>{event.preventDefault();error.hidden=true;if(!form.email.value.trim()||!form.password.value){error.textContent='Informe o e-mail e a senha do vendedor.';error.hidden=false;return}if(turnstileConfig.enabled&&!turnstileToken){error.textContent='Confirme que você não é um robô para continuar.';error.hidden=false;return}submit.disabled=true;submit.innerHTML='Entrando...';try{const result=await api.login({email:form.email.value.trim(),password:form.password.value,turnstileToken});if(result.user.role!=='merchant'){await api.logout();throw new Error('Esta conta não está vinculada a um estabelecimento.')}window.dispatchEvent(new CustomEvent('fc:auth',{detail:result.user}));toast('Bem-vindo ao Portal do Parceiro.','success');location.hash='#/parceiro'}catch(exception){error.textContent=exception.message;error.hidden=false;submit.disabled=false;submit.innerHTML='Entrar no Portal <b>→</b>';if(turnstileConfig.enabled&&window.turnstile&&turnstileWidgetId!==null){turnstileToken='';window.turnstile.reset(turnstileWidgetId)}}}
}

import { api } from "../core/api.js";
import { esc, toast } from "../core/ui.js";

const statusCopy = {
  pending: [
    "Cadastro em análise",
    "Nossa equipe está conferindo seus dados. Você receberá uma notificação quando houver uma decisão.",
  ],
  approved: [
    "Cadastro aprovado",
    "Seu Portal do Entregador está liberado. Entre novamente na conta para atualizar o acesso.",
  ],
  rejected: [
    "Cadastro não aprovado",
    "Confira a observação da análise, corrija os dados e envie novamente.",
  ],
};
const imageData = (file) =>
  new Promise((resolve, reject) => {
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      reject(new Error("Envie uma imagem JPG, PNG ou WebP."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("A imagem enviada é inválida."));
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export async function render(view, boot) {
  const { application } = await api.courierApplication();
  const role = boot.user?.role;
  if (role === "courier") {
    view.innerHTML =
      '<div class="page courier-signup"><section class="courier-signup-card courier-status"><span>✓</span><h1>Você já é entregador</h1><p>Seu acesso está liberado para receber corridas e acompanhar seus ganhos.</p><a class="btn btn-primary" href="#/entregador">Abrir Portal do Entregador</a></section></div>';
    return;
  }
  if (["merchant", "admin"].includes(role)) {
    view.innerHTML =
      '<div class="page courier-signup"><section class="courier-signup-card courier-status"><span>🛵</span><h1>Use uma conta de cliente</h1><p>Para separar as permissões e os pagamentos, o cadastro de entregador deve ser feito em uma conta de cliente.</p><a class="btn btn-outline" href="#/perfil">Voltar ao perfil</a></section></div>';
    return;
  }
  const status = application && statusCopy[application.status];
  view.innerHTML = `<div class="page courier-signup"><header><span>FOODCOURT ENTREGAS</span><h1>Ganhe fazendo entregas</h1><p>A análise documental leva até 3 dias. Depois da aprovação, as lojas poderão enviar convites de entrega sem obrigação de aceite.</p></header>${status ? `<aside class="courier-application-status ${application.status}"><b>${status[0]}</b><p>${status[1]}</p>${application.reviewNote ? `<small>Observação: ${esc(application.reviewNote)}</small>` : ""}</aside>` : ""}<form class="courier-signup-card" data-courier-form><h2>${application ? "Atualizar cadastro" : "Cadastro de entregador"}</h2><div class="courier-form-grid"><label>CPF ou CNPJ<input class="input" name="document" inputmode="numeric" required minlength="11" maxlength="18" value="${esc(application?.document || "")}"></label><label>Data de nascimento<input class="input" name="birthDate" type="date" required value="${esc(application?.birthDate || "")}"></label><label>Veículo<select class="input" name="vehicle" required>${["Moto", "Bicicleta", "Carro"].map((value) => `<option ${application?.vehicle === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Placa (se houver)<input class="input" name="licensePlate" maxlength="10" value="${esc(application?.licensePlate || "")}" placeholder="ABC1D23"></label><label>Cidade de atuação<input class="input" name="city" required maxlength="80" value="${esc(application?.city || "")}"></label><label>Chave Pix para receber<input class="input" name="pixKey" required maxlength="140" value="${esc(application?.pixKey || "")}"></label><label>Foto do RG ou CNH<input class="input" name="identityFile" type="file" accept="image/jpeg,image/png,image/webp" required></label><label>Selfie segurando o documento<input class="input" name="selfieFile" type="file" accept="image/jpeg,image/png,image/webp" required></label><label>Número da CNH (moto/carro)<input class="input" name="cnhNumber" maxlength="20"></label><label>Categoria da CNH<input class="input" name="cnhCategory" maxlength="5" placeholder="A, B ou AB"></label><label>Habilitado desde<input class="input" name="cnhSince" type="date"></label><label>Validade da CNH<input class="input" name="cnhExpiresAt" type="date"></label></div><label class="courier-terms"><input type="checkbox" name="ear"> Minha CNH possui EAR (atividade remunerada).</label><label class="courier-terms"><input type="checkbox" name="motofreteCourse"> Para moto: concluí o curso especializado de motofrete.</label><label class="courier-terms"><input type="checkbox" required> Confirmo que os dados são verdadeiros e autorizo a análise para este cadastro.</label><button class="btn btn-primary btn-block">${application ? "Reenviar para análise" : "Enviar cadastro"}</button></form></div>`;
  const form = view.querySelector("[data-courier-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      values.identityImage = await imageData(
        form.elements.identityFile.files[0],
      );
      values.selfieImage = await imageData(form.elements.selfieFile.files[0]);
      delete values.identityFile;
      delete values.selfieFile;
      await api.submitCourierApplication(values);
      toast("Cadastro enviado para análise.", "success");
      location.hash = `#/quero-ser-entregador?at=${Date.now()}`;
    } catch (error) {
      toast(error.message, "error");
      button.disabled = false;
    }
  });
}

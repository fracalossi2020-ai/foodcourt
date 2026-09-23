"use strict";

// Identificação da empresa responsável pela plataforma. Os valores vêm do
// ambiente para não amarrar dados cadastrais ao código. O rodapé, as páginas
// legais e os e-mails leem daqui; campos vazios são omitidos na interface.
const text = (value, max = 200) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

function formatCnpj(raw) {
  const digits = text(raw).replace(/\D/g, "");
  if (digits.length !== 14) return text(raw, 32);
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function publicInfo(env = process.env) {
  const legalName = text(env.COMPANY_LEGAL_NAME);
  const tradeName = text(env.COMPANY_TRADE_NAME) || "FoodCourt";
  const cnpj = formatCnpj(env.COMPANY_CNPJ);
  const address = text(env.COMPANY_ADDRESS, 300);
  const email = text(env.COMPANY_EMAIL, 120).toLowerCase();
  const privacyEmail = text(env.COMPANY_PRIVACY_EMAIL, 120).toLowerCase() || email;
  const phone = text(env.COMPANY_PHONE, 40);
  const complete = Boolean(legalName && cnpj && address && email);
  return {
    tradeName,
    legalName,
    cnpj,
    address,
    email,
    privacyEmail,
    phone,
    // A interface mostra um aviso discreto enquanto os dados cadastrais não
    // estiverem preenchidos, em vez de exibir campos vazios.
    complete,
    termsUpdatedAt: text(env.LEGAL_TERMS_UPDATED_AT, 10) || "2026-09-22",
  };
}

module.exports = { publicInfo, formatCnpj };

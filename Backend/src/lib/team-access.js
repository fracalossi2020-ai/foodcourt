"use strict";
function roleFor(state, user, store) {
  if (!user || !store) return null;
  if (user.role === "admin") return "owner";
  if (store.ownerId === user.id) return "owner";
  const member = state.storeMembers.find(
    (item) =>
      item.storeId === store.id &&
      item.active !== false &&
      item.userId === user.id,
  );
  return ["manager", "kitchen"].includes(member?.role) ? member.role : null;
}
const sections = {
  owner: [
    "dashboard",
    "pedidos",
    "cardapio",
    "promocoes",
    "financeiro",
    "avaliacoes",
    "minhaloja",
    "horarios",
    "plano",
    "configuracoes",
    "equipe",
    "suporte",
  ],
  manager: [
    "dashboard",
    "pedidos",
    "cardapio",
    "promocoes",
    "avaliacoes",
    "minhaloja",
    "horarios",
    "suporte",
  ],
  kitchen: ["pedidos"],
};
function allowed(role, method, path, body = {}) {
  if (!role) return false;
  if (role === "owner" || path === "/api/partner-access") return true;
  if (role === "kitchen")
    return (
      (method === "GET" && path === "/api/partner-orders") ||
      (method === "POST" &&
        path === "/api/partner-order-status" &&
        ["preparing", "ready"].includes(body.status))
    );
  return [
    "GET /api/partner-dashboard",
    "GET /api/partner-orders",
    "POST /api/partner-order-status",
    "POST /api/partner-assign-courier",
    "GET /api/partner-catalog",
    "POST /api/partner-product",
    "POST /api/partner-menu-analyze",
    "POST /api/partner-menu-import",
    "POST /api/partner-store",
    "GET /api/partner-promotions",
    "POST /api/partner-promotion",
    "GET /api/partner-reviews",
    "POST /api/partner-review-reply",
    "GET /api/partner-support",
    "POST /api/partner-support-ticket",
  ].includes(`${method} ${path}`);
}
module.exports = { roleFor, allowed, sections };

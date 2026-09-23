"use strict";

const db = require("./db");
const auth = require("./auth");

// Direitos do titular (LGPD): exportar os dados que a plataforma guarda sobre
// ele e encerrar a conta. Pedidos e pagamentos são preservados de forma
// anonimizada porque sustentam obrigações fiscais e o histórico das lojas.

const DELETED_EMAIL_DOMAIN = "excluido.foodcourt.invalid";
const COURIER_DOCUMENT_RETENTION_DAYS = 90;

function exportUserData(user) {
  const state = db.state;
  const mine = (item) => item.userId === user.id;
  const orders = state.platformOrders.filter(
    (order) => order.customerId === user.id,
  );
  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role || "customer",
      status: user.status,
      memberSince: user.memberSince,
      points: user.points,
      level: user.level,
      cashback: user.cashback,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin || null,
      termsAcceptedAt: user.termsAcceptedAt || null,
      socialLogins: Object.keys(user.oauthProviders || {}),
    },
    addresses: state.customerAddresses.filter(mine),
    orders,
    payments: state.paymentEvents.filter(mine),
    reviews: state.reviews.filter((review) => review.customerId === user.id),
    coupons: state.userCoupons.filter(mine),
    loyalty: state.loyaltyEvents.filter(mine),
    notifications: state.userNotifications.filter(mine),
    supportTickets: state.supportTickets.filter(
      (ticket) => ticket.customerId === user.id,
    ),
    courierApplication:
      state.courierApplications
        .filter(mine)
        .map(({ identityImage, selfieImage, ...rest }) => ({
          ...rest,
          identityImageStored: Boolean(identityImage),
          selfieImageStored: Boolean(selfieImage),
        }))[0] || null,
    courierPayouts: state.courierPayouts.filter(
      (payout) => payout.courierId === user.id,
    ),
    deliveries: state.deliveries.filter(
      (delivery) => delivery.courierId === user.id,
    ),
    storeMemberships: state.storeMembers.filter(mine),
  };
}

function ownedStores(user) {
  return db.state.stores.filter((store) => store.ownerId === user.id);
}

function deleteAccount(user) {
  const state = db.state;
  const now = new Date().toISOString();
  const notMine = (item) => item.userId !== user.id;

  auth.revokeUserSessions(user.id);
  db.deleteResetTokensByUser(user.id);

  state.customerAddresses = state.customerAddresses.filter(notMine);
  state.pushSubscriptions = state.pushSubscriptions.filter(notMine);
  state.userNotifications = state.userNotifications.filter(notMine);
  state.userCoupons = state.userCoupons.filter(notMine);
  state.loyaltyEvents = state.loyaltyEvents.filter(notMine);
  state.storeMembers = state.storeMembers.filter(notMine);
  state.teamInvites = state.teamInvites.filter(
    (invite) => String(invite.email || "").toLowerCase() !== user.email,
  );
  state.courierApplications = state.courierApplications.filter(notMine);

  for (const order of state.platformOrders) {
    if (order.customerId !== user.id) continue;
    order.customerName = "Cliente (conta excluída)";
    if (order.customerPhone) order.customerPhone = "";
    if (order.customerEmail) order.customerEmail = "";
  }
  for (const review of state.reviews) {
    if (review.customerId === user.id)
      review.customerName = "Cliente (conta excluída)";
  }

  const original = { email: user.email, phone: user.phone };
  user.fullName = "Conta excluída";
  user.email = `${user.id}@${DELETED_EMAIL_DOMAIN}`;
  user.phone = "";
  user.passwordHash = "";
  user.oauthProviders = {};
  user.avatarEmoji = "";
  user.status = "deleted";
  user.deletedAt = now;
  user.updatedAt = now;
  user.courierAvailable = false;
  db.rebuildIndexes();
  db.saveNow();
  return original;
}

// Documentos de entregador (identidade e selfie) só existem para a análise do
// cadastro. Depois da decisão, ficam guardados por um prazo curto para
// contestação e então são apagados do banco.
function purgeCourierDocuments(now = Date.now()) {
  const cutoff = now - COURIER_DOCUMENT_RETENTION_DAYS * 86400000;
  let purged = 0;
  for (const application of db.state.courierApplications) {
    if (application.status === "pending") continue;
    if (!application.identityImage && !application.selfieImage) continue;
    const reviewedAt = Date.parse(application.reviewedAt || application.updatedAt || 0);
    if (!Number.isFinite(reviewedAt) || reviewedAt > cutoff) continue;
    application.identityImage = "";
    application.selfieImage = "";
    application.documentsPurgedAt = new Date(now).toISOString();
    purged++;
  }
  if (purged) db.saveNow();
  return purged;
}

module.exports = {
  exportUserData,
  deleteAccount,
  ownedStores,
  purgeCourierDocuments,
  COURIER_DOCUMENT_RETENTION_DAYS,
};

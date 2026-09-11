"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH =
  process.env.FC_DB_PATH ||
  (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "foodcourt-db.json")
    : path.join(
        __dirname,
        "..",
        "..",
        "..",
        "banco de dados",
        "runtime",
        "foodcourt-db.json",
      ));

function ensureDbDirectory() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const EMPTY = () => ({
  users: [],
  sessions: {},
  resetTokens: {},
  stores: [],
  subscriptions: [],
  storeMembers: [],
  platformOrders: [],
  promotions: [],
  reviews: [],
  supportTickets: [],
  auditLog: [],
  loyaltyEvents: [],
  loyaltyRedemptions: [],
  userCoupons: [],
  referrals: [],
  customerAddresses: [],
  deliveries: [],
  conversations: [],
  paymentEvents: [],
  courierPayouts: [],
  courierApplications: [],
  userNotifications: [],
  pushSubscriptions: [],
  teamInvites: [],
});
let state = EMPTY();
let emailIndex = new Map();
let phoneIndex = new Map();
let domainFingerprint = "";
let changeRevision = 0;
let persistenceError = false;
let lastSavedAt = null;
const changeListeners = new Set();

function fingerprintDomainState() {
  const domainState = { ...state };
  delete domainState.sessions;
  delete domainState.resetTokens;
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(domainState))
    .digest("hex");
}

function rebuildIndexes() {
  emailIndex = new Map(state.users.map((u) => [u.email, u]));
  phoneIndex = new Map(state.users.map((u) => [u.phone, u]));
}

function load() {
  try {
    ensureDbDirectory();
    if (fs.existsSync(DB_PATH)) {
      state = { ...EMPTY(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
    }
  } catch (e) {
    throw new Error("Falha ao carregar o banco. Inicialização interrompida para preservar os dados.", { cause: e });
  }
  rebuildIndexes();
  domainFingerprint = fingerprintDomainState();
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { saveNow(); } catch {} }, 50);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (persistenceError) throw new Error('DB_PERSISTENCE_FAILED');
  try {
    ensureDbDirectory();
    const tmp = DB_PATH + ".tmp";
    const fd = fs.openSync(tmp, 'w', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(state, null, 2));
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, DB_PATH);
    lastSavedAt = new Date().toISOString();
    const nextFingerprint = fingerprintDomainState();
    if (nextFingerprint !== domainFingerprint) {
      domainFingerprint = nextFingerprint;
      changeRevision += 1;
      for (const listener of changeListeners) {
        try {
          listener({ revision: changeRevision, at: new Date().toISOString() });
        } catch {}
      }
    }
  } catch (e) {
    persistenceError = true;
    console.error("[db] falha ao salvar:", e.message);
    throw new Error('DB_PERSISTENCE_FAILED', { cause: e });
  }
}

const uid = (prefix = "id") => prefix + "_" + crypto.randomUUID();

module.exports = {
  path: DB_PATH,
  load,
  rebuildIndexes,
  save,
  saveNow,
  health: () => ({ status: persistenceError ? 'error' : 'ok', lastSavedAt, engine: 'json' }),
  subscribeChanges(listener) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  },
  uid,
  get state() {
    return state;
  },
  findByEmail: (email) =>
    emailIndex.get((email || "").trim().toLowerCase()) || null,
  findByPhone: (phone) => phoneIndex.get((phone || "").trim()) || null,
  addUser(user) {
    state.users.push(user);
    emailIndex.set(user.email, user);
    phoneIndex.set(user.phone, user);
    save();
    return user;
  },
  saveUser() {
    save();
  },
  removeUserSessions(userId) {
    for (const k of Object.keys(state.sessions)) {
      if (state.sessions[k].userId === userId) delete state.sessions[k];
    }
    save();
  },
  getSession(key) {
    return state.sessions[key] || null;
  },
  setSession(key, sess) {
    state.sessions[key] = sess;
    save();
  },
  deleteSession(key) {
    delete state.sessions[key];
    save();
  },
  setResetToken(key, rec) {
    state.resetTokens[key] = rec;
    save();
  },
  getResetToken(key) {
    return state.resetTokens[key] || null;
  },
  deleteResetToken(key) {
    delete state.resetTokens[key];
    save();
  },
  deleteResetTokensByUser(userId) {
    for (const k of Object.keys(state.resetTokens)) {
      if (state.resetTokens[k].userId === userId) delete state.resetTokens[k];
    }
    save();
  },
};

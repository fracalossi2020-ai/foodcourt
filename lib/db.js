'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = process.env.FC_DB_PATH || path.join(__dirname, '..', 'foodcourt-db.json')

const EMPTY = () => ({ users: [], sessions: {}, resetTokens: {} })
let state = EMPTY()
let emailIndex = new Map()
let phoneIndex = new Map()

function rebuildIndexes() {
  emailIndex = new Map(state.users.map(u => [u.email, u]))
  phoneIndex = new Map(state.users.map(u => [u.phone, u]))
}

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      state = { ...EMPTY(), ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }
    }
  } catch (e) {
    console.error('[db] falha ao carregar, iniciando vazio:', e.message)
    state = EMPTY()
  }
  rebuildIndexes()
}

let saveTimer = null
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 50)
}
function saveNow() {
  clearTimeout(saveTimer)
  try {
    const tmp = DB_PATH + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
    fs.renameSync(tmp, DB_PATH)
  } catch (e) {
    console.error('[db] falha ao salvar:', e.message)
  }
}

const uid = (prefix = 'id') => prefix + '_' + crypto.randomUUID()

module.exports = {
  load,
  save,
  saveNow,
  uid,
  get state() { return state },
  findByEmail: (email) => emailIndex.get((email || '').trim().toLowerCase()) || null,
  findByPhone: (phone) => phoneIndex.get((phone || '').trim()) || null,
  addUser(user) {
    state.users.push(user)
    emailIndex.set(user.email, user)
    phoneIndex.set(user.phone, user)
    save()
    return user
  },
  saveUser() { save() },
  removeUserSessions(userId) {
    for (const k of Object.keys(state.sessions)) {
      if (state.sessions[k].userId === userId) delete state.sessions[k]
    }
    save()
  },
  getSession(key) { return state.sessions[key] || null },
  setSession(key, sess) { state.sessions[key] = sess; save() },
  deleteSession(key) { delete state.sessions[key]; save() },
  setResetToken(key, rec) { state.resetTokens[key] = rec; save() },
  getResetToken(key) { return state.resetTokens[key] || null },
  deleteResetToken(key) { delete state.resetTokens[key]; save() },
  deleteResetTokensByUser(userId) {
    for (const k of Object.keys(state.resetTokens)) {
      if (state.resetTokens[k].userId === userId) delete state.resetTokens[k]
    }
    save()
  }
}

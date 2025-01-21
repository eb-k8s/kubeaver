const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const k8s = require('@kubernetes/client-node');

async function kubeadminDB() {
  const dbPath = path.resolve(__dirname, '../data/kubeadmin', 'kubeadmin.db');

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clusters (
      id TEXT PRIMARY KEY,
      name TEXT,
      config TEXT,
      address TEXT,
      version TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS appstore (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS imagestore (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT NOT NULL
    );
  `);

  return db;
}

module.exports = { kubeadminDB };
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

(async () => {
  const mode = process.argv[2]; // users | all
  const confirmed = process.argv[3] === '--yes';
  if (!['users', 'all'].includes(mode)) {
    console.log('Use: node resetDb.js users   OR   node resetDb.js all');
    process.exit(1);
  }

  await connectDB();
  const db = mongoose.connection.db;
  console.log('Database:', db.databaseName);

  const all = await db.listCollections().toArray();
  const names = all.map((c) => c.name);
  const targets = mode === 'users' ? names.filter((n) => ['users', 'pushsubscriptions'].includes(n)) : names;

  for (const n of targets) {
    console.log(n, '->', await db.collection(n).countDocuments(), 'documents');
  }

  if (!confirmed) {
    console.log('\nDRY RUN: kuch delete nahi hua. Asli delete ke liye end me --yes lagao.');
    process.exit(0);
  }

  for (const n of targets) {
    if (mode === 'all') await db.collection(n).drop();
    else await db.collection(n).deleteMany({});
  }
  console.log('\nDone. Deleted:', targets.join(', '));
  process.exit(0);
})();

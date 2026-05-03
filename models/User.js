const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, default: 'Admin' },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;

  const exists = await User.findOne({ email });
  if (exists) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email, passwordHash, name: 'Admin', role: 'admin' });
  console.log(`Default admin created: ${email}`);
}

module.exports = { User, createDefaultAdmin };

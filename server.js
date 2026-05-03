const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const applicationRoutes = require('./routes/applications');
const { createDefaultAdmin } = require('./models/User');

const app = express();
const PORT = process.env.PORT || 10000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Oakbridge Claims CRM API',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/applications', applicationRoutes);

// Backwards compatible route for your existing application form
app.use('/api/application', applicationRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Server error' });
});

async function start() {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in .env');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    await createDefaultAdmin();
    app.listen(PORT, () => console.log(`CRM backend running on port ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

start();

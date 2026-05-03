const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const Application = require('../models/Application');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${uuidv4()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 15 }
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// Public website application endpoint
router.post('/', upload.array('documents', 15), async (req, res) => {
  const files = (req.files || []).map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    url: `/uploads/${file.filename}`,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype
  }));

  const application = await Application.create({
    leadId: req.body.leadId || '',
    fullName: req.body.fullName || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    bankName: req.body.bankName || '',
    amountLost: Number(req.body.amountLost || 0),
    scamType: req.body.scamType || '',
    caseType: req.body.caseType || '',
    paymentMethod: req.body.paymentMethod || '',
    paymentDate: req.body.paymentDate || '',
    reportDate: req.body.reportDate || '',
    country: req.body.country || '',
    companyPaid: req.body.companyPaid || '',
    howContacted: req.body.howContacted || '',
    bankWarning: req.body.bankWarning || '',
    reportedToBank: req.body.reportedToBank || '',
    vulnerable: req.body.vulnerable || '',
    policeOrActionFraudRef: req.body.policeOrActionFraudRef || '',
    caseDetails: req.body.caseDetails || '',
    consent: req.body.consent === 'true' || req.body.consent === 'on',
    files
  });

  if (req.body.leadId) {
    await Lead.findByIdAndUpdate(req.body.leadId, { status: 'Application Submitted' }).catch(() => null);
  }

  try {
    if (process.env.NOTIFY_EMAIL && process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `Oakbridge Claims <${process.env.SMTP_USER}>`,
        to: process.env.NOTIFY_EMAIL,
        subject: `New Claim Application - ${application.fullName || 'Unknown Client'}`,
        html: `
          <h2>New Claim Application</h2>
          <p><strong>Application ID:</strong> ${application._id}</p>
          <p><strong>Name:</strong> ${application.fullName}</p>
          <p><strong>Email:</strong> ${application.email}</p>
          <p><strong>Phone:</strong> ${application.phone}</p>
          <p><strong>Amount Lost:</strong> £${application.amountLost}</p>
          <p><strong>Scam Type:</strong> ${application.scamType}</p>
          <p><strong>Payment Method:</strong> ${application.paymentMethod}</p>
          <p><strong>Case Details:</strong></p>
          <p>${application.caseDetails}</p>
          <p><strong>Documents Uploaded:</strong> ${files.length}</p>
        `,
        attachments: files.map(file => ({ filename: file.originalName, path: file.path }))
      });
    }
  } catch (emailError) {
    console.log('Email failed but application saved:', emailError.message);
  }

  res.json({ success: true, applicationId: application._id, message: 'Application saved to CRM.' });
});

// CRM private endpoints
router.get('/', auth, async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  const filter = q ? {
    $or: [
      { fullName: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { scamType: new RegExp(q, 'i') },
      { status: new RegExp(q, 'i') }
    ]
  } : {};

  const applications = await Application.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ applications });
});

router.get('/:id', auth, async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  res.json({ application });
});

router.put('/:id', auth, async (req, res) => {
  const application = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  res.json({ application });
});

router.delete('/:id', auth, async (req, res) => {
  await Application.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;

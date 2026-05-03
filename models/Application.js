const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  url: String,
  path: String,
  size: Number,
  mimetype: String
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  leadId: String,
  fullName: String,
  email: String,
  phone: String,
  address: String,
  bankName: String,
  amountLost: Number,
  scamType: String,
  caseType: String,
  paymentMethod: String,
  paymentDate: String,
  reportDate: String,
  country: String,
  companyPaid: String,
  howContacted: String,
  bankWarning: String,
  reportedToBank: String,
  vulnerable: String,
  policeOrActionFraudRef: String,
  caseDetails: String,
  consent: Boolean,
  files: [fileSchema],
  status: { type: String, default: 'New Application' },
  assignedTo: String,
  internalNotes: { type: String, default: '' },
  source: { type: String, default: 'website-application-form' }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);

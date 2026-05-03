const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  amountLost: Number,
  scamType: String,
  caseType: String,
  paymentMethod: String,
  source: { type: String, default: 'website-calculator' },
  status: { type: String, default: 'New Lead' },
  confidence: String,
  estimatedClaimAmount: Number,
  supportFee: Number,
  estimatedNetIfSuccessful: Number,
  legalRoute: String,
  notes: [String],
  rawInput: Object
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);

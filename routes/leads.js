const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');

const router = express.Router();

function money(value) {
  const amount = Number(value || 0);
  return Math.max(amount, 0);
}

function calculateSupportFee(amount, caseType = '') {
  const claimAmount = Number(amount || 0);
  const type = String(caseType).toLowerCase();

  if (type.includes('timeshare') || type.includes('crypto') || type.includes('investment')) {
    if (claimAmount <= 10000) return 499;
    if (claimAmount <= 50000) return 899;
    return 1499;
  }

  if (claimAmount <= 5000) return 149;
  if (claimAmount <= 25000) return 399;
  return 699;
}

function calculateClaim(input) {
  const amountLost = money(input.amountLost);
  const scamType = String(input.scamType || input.caseType || '').toLowerCase();
  const paymentMethod = String(input.paymentMethod || '').toLowerCase();

  let score = 55;
  let legalRoute = 'Financial scam review';
  const notes = ['Indicative estimate only. Final result depends on evidence and provider review.'];

  if (scamType.includes('timeshare')) {
    legalRoute = 'European timeshare claim review';
    score += 15;
    notes.push('Timeshare cases need contract and country-specific review.');
  }

  if (paymentMethod.includes('bank')) {
    legalRoute = 'APP bank transfer reimbursement review';
    score += 10;
  }

  if (paymentMethod.includes('card')) {
    legalRoute = 'Card provider / chargeback review';
    score += 5;
  }

  if (paymentMethod.includes('crypto') || scamType.includes('crypto')) {
    legalRoute = 'Crypto / platform / fraud recovery review';
    score -= 15;
  }

  let confidence = 'Medium';
  if (score >= 75) confidence = 'Strong';
  if (score < 55) confidence = 'Needs review';
  if (score < 40) confidence = 'Higher risk';

  let estimatedClaimAmount = amountLost;
  if (score < 55) estimatedClaimAmount = Math.round(amountLost * 0.5);
  if (score < 40) estimatedClaimAmount = Math.round(amountLost * 0.25);

  const supportFee = calculateSupportFee(amountLost, scamType);
  const estimatedNetIfSuccessful = Math.max(estimatedClaimAmount - supportFee, 0);

  return { amountLost, estimatedClaimAmount, supportFee, estimatedNetIfSuccessful, confidence, legalRoute, notes };
}

// Public website calculator endpoint
router.post('/calculate-claim', async (req, res) => {
  const calc = calculateClaim(req.body);
  const lead = await Lead.create({
    fullName: req.body.fullName || req.body.name || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    amountLost: calc.amountLost,
    scamType: req.body.scamType || '',
    caseType: req.body.caseType || '',
    paymentMethod: req.body.paymentMethod || '',
    confidence: calc.confidence,
    estimatedClaimAmount: calc.estimatedClaimAmount,
    supportFee: calc.supportFee,
    estimatedNetIfSuccessful: calc.estimatedNetIfSuccessful,
    legalRoute: calc.legalRoute,
    notes: calc.notes,
    rawInput: req.body
  });

  res.json({
    success: true,
    leadId: lead._id,
    ...calc,
    applicationUrl: `${process.env.FRONTEND_URL || ''}/application.html?leadId=${lead._id}&name=${encodeURIComponent(lead.fullName || '')}&email=${encodeURIComponent(lead.email || '')}&phone=${encodeURIComponent(lead.phone || '')}&amount=${encodeURIComponent(calc.estimatedClaimAmount || 0)}&type=${encodeURIComponent(lead.scamType || lead.caseType || '')}`
  });
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

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ leads });
});

router.put('/:id', auth, async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ lead });
});

router.delete('/:id', auth, async (req, res) => {
  await Lead.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;

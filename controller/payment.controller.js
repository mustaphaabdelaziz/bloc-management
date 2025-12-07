const Payment = require("../models/Payment");
const Surgery = require("../models/Surgery");
const Surgeon = require("../models/Surgeon");
const catchAsync = require("../utils/catchAsync");

// List all payments with filtering and pagination
module.exports.paymentList = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  
  const { status, paymentType, surgeonId, dateFrom, dateTo, search } = req.query;
  
  // Build query
  let query = {};
  if (status) query.status = status;
  if (paymentType) query.paymentType = paymentType;
  if (surgeonId) query.surgeon = surgeonId;
  
  // Search filter - handle search by code, surgeon name, or patient name
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    // Get payment IDs matching search criteria
    const surgeries = await Surgery.find({ code: searchRegex });
    const surgeons = await Surgeon.find({
      $or: [
        { lastname: searchRegex },
        { firstname: searchRegex }
      ]
    });
    
    query.$or = [
      { surgery: { $in: surgeries.map(s => s._id) } },
      { surgeon: { $in: surgeons.map(s => s._id) } }
    ];
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }
  
  const totalPayments = await Payment.countDocuments(query);
  const totalPages = Math.ceil(totalPayments / limit);
  
  const payments = await Payment.find(query)
    .populate({
      path: "surgery",
      populate: [
        { path: "patient" },
        { path: "prestation" }
      ]
    })
    .populate("surgeon")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const surgeons = await Surgeon.find().sort({ lastname: 1 });
  
  // Calculate summary statistics
  const allPayments = await Payment.find(query);
  const summary = {
    totalOutgoing: allPayments
      .filter(p => p.paymentType === 'outgoing')
      .reduce((sum, p) => sum + p.totalAmount, 0),
    totalIncoming: allPayments
      .filter(p => p.paymentType === 'incoming')
      .reduce((sum, p) => sum + p.totalAmount, 0),
    paidOutgoing: allPayments
      .filter(p => p.paymentType === 'outgoing')
      .reduce((sum, p) => sum + p.amountPaid, 0),
    paidIncoming: allPayments
      .filter(p => p.paymentType === 'incoming')
      .reduce((sum, p) => sum + p.amountPaid, 0)
  };
  
  summary.remainingOutgoing = summary.totalOutgoing - summary.paidOutgoing;
  summary.remainingIncoming = summary.totalIncoming - summary.paidIncoming;
  summary.netBalance = summary.paidIncoming - summary.paidOutgoing;
  
  res.render("payments/index", {
    title: "Suivi des Paiements",
    payments,
    surgeons,
    filters: { status, paymentType, surgeonId, dateFrom, dateTo, search },
    currentPage: page,
    totalPages,
    summary
  });
});

// View single payment details
module.exports.viewPayment = catchAsync(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: "surgery",
      populate: [
        { path: "patient" },
        { path: "surgeon" },
        { path: "prestation" }
      ]
    })
    .populate("surgeon")
    .populate("transactions.recordedBy");
  
  if (!payment) {
    req.flash("error", "Paiement non trouvé");
    return res.redirect("/payments");
  }
  
  // Handle orphaned payment (deleted surgery)
  if (!payment.surgery) {
    req.flash("error", "La chirurgie associée a été supprimée");
    return res.redirect("/payments");
  }
  
  res.render("payments/show", {
    title: `Paiement - ${payment.surgery.code}`,
    payment
  });
});

// Record a new payment transaction
module.exports.recordPayment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, reference, notes } = req.body;
  
  const payment = await Payment.findById(id);
  if (!payment) {
    req.flash("error", "Paiement non trouvé");
    return res.redirect("/payments");
  }
  
  const paymentAmount = parseFloat(amount);
  
  // Validation
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    req.flash("error", "Montant invalide");
    return res.redirect(`/payments/${id}`);
  }
  
  if (paymentAmount > payment.amountRemaining) {
    req.flash("error", "Le montant dépasse le reste à payer");
    return res.redirect(`/payments/${id}`);
  }
  
  // Record transaction using model method
  await payment.recordTransaction(
    paymentAmount,
    paymentMethod,
    reference,
    notes,
    req.user._id
  );
  
  req.flash("success", `Paiement de ${paymentAmount.toFixed(2)} MAD enregistré avec succès`);
  res.redirect(`/payments/${id}`);
});

// Update payment notes
module.exports.updatePaymentNotes = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  await Payment.findByIdAndUpdate(id, { notes });
  
  req.flash("success", "Notes mises à jour");
  res.redirect(`/payments/${id}`);
});

// Cancel payment (for cancelled surgeries)
module.exports.cancelPayment = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const payment = await Payment.findByIdAndUpdate(
    id,
    { status: "cancelled" },
    { new: true }
  );
  
  if (!payment) {
    req.flash("error", "Paiement non trouvé");
    return res.redirect("/payments");
  }
  
  req.flash("success", "Paiement annulé");
  res.redirect(`/payments/${id}`);
});

// Surgeon payment summary
module.exports.surgeonPaymentSummary = catchAsync(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  
  const surgeon = await Surgeon.findById(id);
  if (!surgeon) {
    req.flash("error", "Chirurgien non trouvé");
    return res.redirect("/payments");
  }
  
  const totalPayments = await Payment.countDocuments({ surgeon: id });
  const totalPages = Math.ceil(totalPayments / limit);
  
  const payments = await Payment.find({ surgeon: id })
    .populate({
      path: "surgery",
      populate: [
        { path: "patient" },
        { path: "prestation" }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  // Calculate totals
  const allSurgeonPayments = await Payment.find({ surgeon: id });
  
  const outgoingPayments = allSurgeonPayments.filter(p => p.paymentType === 'outgoing');
  const incomingPayments = allSurgeonPayments.filter(p => p.paymentType === 'incoming');
  
  const summary = {
    outgoing: {
      count: outgoingPayments.length,
      total: outgoingPayments.reduce((sum, p) => sum + p.totalAmount, 0),
      paid: outgoingPayments.reduce((sum, p) => sum + p.amountPaid, 0),
      remaining: 0
    },
    incoming: {
      count: incomingPayments.length,
      total: incomingPayments.reduce((sum, p) => sum + p.totalAmount, 0),
      paid: incomingPayments.reduce((sum, p) => sum + p.amountPaid, 0),
      remaining: 0
    }
  };
  
  summary.outgoing.remaining = summary.outgoing.total - summary.outgoing.paid;
  summary.incoming.remaining = summary.incoming.total - summary.incoming.paid;
  summary.netBalance = summary.incoming.paid - summary.outgoing.paid;
  
  // Breakdown by status
  summary.byStatus = {
    pending: allSurgeonPayments.filter(p => p.status === 'pending').length,
    partial: allSurgeonPayments.filter(p => p.status === 'partial').length,
    complete: allSurgeonPayments.filter(p => p.status === 'complete').length,
    cancelled: allSurgeonPayments.filter(p => p.status === 'cancelled').length
  };
  
  res.render("payments/surgeon-summary", {
    title: `Paiements - Dr. ${surgeon.lastName} ${surgeon.firstName}`,
    surgeon,
    payments,
    summary,
    currentPage: page,
    totalPages
  });
});

// Create or update payment record for a surgery
module.exports.createOrUpdatePaymentRecord = async function(surgeryId) {
  try {
    const surgery = await Surgery.findById(surgeryId)
      .populate("surgeon");
    
    if (!surgery || !surgery.surgeon) {
      console.error(`Cannot create payment record: Surgery ${surgeryId} or surgeon not found`);
      return null;
    }
    
    // Determine payment type and amount based on contract type
    let paymentType, totalAmount;
    
    if (surgery.surgeon.contractType === 'location') {
      // Surgeon pays clinic (incoming payment)
      paymentType = 'incoming';
      totalAmount = surgery.clinicAmount;
    } else if (surgery.surgeon.contractType === 'percentage') {
      // Clinic pays surgeon (outgoing payment)
      paymentType = 'outgoing';
      totalAmount = surgery.surgeonAmount;
    } else {
      console.error(`Unknown contract type: ${surgery.surgeon.contractType}`);
      return null;
    }
    
    // Skip if amount is zero
    if (totalAmount <= 0) {
      console.log(`Skipping payment record creation for surgery ${surgery.code} - amount is ${totalAmount}`);
      return null;
    }
    
    // Check if payment record already exists
    let payment = await Payment.findOne({ surgery: surgeryId });
    
    if (payment) {
      // Update existing payment record
      const oldTotal = payment.totalAmount;
      payment.paymentType = paymentType;
      payment.totalAmount = totalAmount;
      
      // Adjust remaining amount if total changed
      if (oldTotal !== totalAmount) {
        const difference = totalAmount - oldTotal;
        payment.amountRemaining = Math.max(0, payment.amountRemaining + difference);
      }
      
      await payment.save();
      console.log(`Updated payment record for surgery ${surgery.code}`);
    } else {
      // Create new payment record
      payment = new Payment({
        surgery: surgeryId,
        surgeon: surgery.surgeon._id,
        paymentType,
        totalAmount,
        amountPaid: 0,
        amountRemaining: totalAmount,
        status: 'pending',
        createdBy: undefined,  // Will be set by middleware if needed
        updatedBy: undefined
      });
      
      await payment.save();
      console.log(`Created payment record for surgery ${surgery.code}: ${paymentType} ${totalAmount} MAD`);
      
      // Link payment to surgery
      surgery.paymentTracking = payment._id;
      await surgery.save();
    }
    
    return payment;
  } catch (error) {
    console.error(`Error creating/updating payment record for surgery ${surgeryId}:`, error);
    return null;
  }
};

// Export statistics for reports
module.exports.getPaymentStatistics = async function(filters = {}) {
  const query = {};
  
  if (filters.surgeonId) query.surgeon = filters.surgeonId;
  if (filters.status) query.status = filters.status;
  if (filters.paymentType) query.paymentType = filters.paymentType;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }
  
  const payments = await Payment.find(query);
  
  return {
    totalCount: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.totalAmount, 0),
    totalPaid: payments.reduce((sum, p) => sum + p.amountPaid, 0),
    totalRemaining: payments.reduce((sum, p) => sum + p.amountRemaining, 0),
    byType: {
      outgoing: payments.filter(p => p.paymentType === 'outgoing').length,
      incoming: payments.filter(p => p.paymentType === 'incoming').length
    },
    byStatus: {
      pending: payments.filter(p => p.status === 'pending').length,
      partial: payments.filter(p => p.status === 'partial').length,
      complete: payments.filter(p => p.status === 'complete').length,
      cancelled: payments.filter(p => p.status === 'cancelled').length
    }
  };
};

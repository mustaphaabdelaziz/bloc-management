const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  surgery: {
    type: Schema.Types.ObjectId,
    ref: 'Surgery',
    required: true,
    unique: true
  },
  surgeon: {
    type: Schema.Types.ObjectId,
    ref: 'Surgeon',
    required: true
  },
  paymentType: {
    type: String,
    enum: ['outgoing', 'incoming'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  amountRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'complete', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  transactions: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'transfer', 'other'],
      default: 'cash'
    },
    reference: {
      type: String
    },
    notes: {
      type: String
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Pre-save hook to update payment status and remaining amount
PaymentSchema.pre('save', function(next) {
  // Calculate remaining amount
  this.amountRemaining = Math.max(0, this.totalAmount - this.amountPaid);
  
  // Update status based on payment progress
  if (this.amountPaid === 0) {
    this.status = 'pending';
  } else if (this.amountPaid >= this.totalAmount) {
    this.status = 'complete';
    this.amountRemaining = 0;
    this.amountPaid = this.totalAmount; // Cap at total
  } else {
    this.status = 'partial';
  }
  
  // Round amounts to 2 decimals
  this.totalAmount = Math.round(this.totalAmount * 100) / 100;
  this.amountPaid = Math.round(this.amountPaid * 100) / 100;
  this.amountRemaining = Math.round(this.amountRemaining * 100) / 100;
  
  next();
});

// Virtual for payment completion percentage
PaymentSchema.virtual('completionPercentage').get(function() {
  if (this.totalAmount === 0) return 100;
  return Math.round((this.amountPaid / this.totalAmount) * 100);
});

// Method to record a new transaction
PaymentSchema.methods.recordTransaction = async function(amount, method, reference, notes, userId) {
  this.transactions.push({
    amount: parseFloat(amount),
    date: new Date(),
    paymentMethod: method || 'cash',
    reference: reference || '',
    notes: notes || '',
    recordedBy: userId
  });
  
  this.amountPaid += parseFloat(amount);
  
  return this.save();
};

module.exports = mongoose.model('Payment', PaymentSchema);

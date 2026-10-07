const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true }, method: { type: String, enum: ['UPI Demo', 'Card Demo', 'Cash'], default: 'UPI Demo' },
  transactionId: { type: String, unique: true }, status: { type: String, enum: ['Pending', 'Confirmed', 'Failed'], default: 'Pending' }, paidAt: Date
}, { timestamps: true });
module.exports = mongoose.model('Payment', paymentSchema);

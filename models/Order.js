const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, studentName: { type: String, default: 'Student' },
  items: [{ foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' }, name: String, price: Number, quantity: Number }],
  total: { type: Number, required: true }, token: { type: Number, required: true },
  status: { type: String, enum: ['Pending Payment', 'Paid', 'Preparing', 'Ready', 'Picked Up', 'Cancelled'], default: 'Pending Payment' },
  pickupCounter: { type: String, default: 'Counter 1' }, deliveryDate: { type: String, default: '' }, deliveryTime: { type: String, default: '' }, paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, qrData: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);

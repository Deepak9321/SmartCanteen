const mongoose = require('mongoose');
const feedbackSchema = new mongoose.Schema({ orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, rating: { type: Number, min: 1, max: 5 }, comment: { type: String, default: '' } }, { timestamps: true });
module.exports = mongoose.model('Feedback', feedbackSchema);
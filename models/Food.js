const mongoose = require('mongoose');
const foodSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, category: { type: String, default: 'Other' }, price: { type: Number, required: true, min: 0 },
  emoji: { type: String, default: '🍽️' }, image: { type: String, default: '/images/food/default.svg' }, available: { type: Boolean, default: true }, stock: { type: Number, default: 0, min: 0 },
  salesHistory: { type: [Number], default: [] }, prepMinutes: { type: Number, default: 10 }, description: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Food', foodSchema);

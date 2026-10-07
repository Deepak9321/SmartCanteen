const mongoose = require('mongoose');
const wasteSchema = new mongoose.Schema({ foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' }, foodName: String, prepared: { type: Number, default: 0 }, sold: { type: Number, default: 0 }, unsold: { type: Number, default: 0 }, unsoldKg: { type: Number, default: 0 }, date: { type: Date, default: Date.now } }, { timestamps: true });
module.exports = mongoose.model('Waste', wasteSchema);

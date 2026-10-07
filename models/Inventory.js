const mongoose = require('mongoose');
const inventorySchema = new mongoose.Schema({ foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', unique: true }, foodName: String, currentStock: { type: Number, default: 0 }, reorderLevel: { type: Number, default: 10 }, unit: { type: String, default: 'servings' }, lastUpdated: { type: Date, default: Date.now } }, { timestamps: true });
module.exports = mongoose.model('Inventory', inventorySchema);

const mongoose = require('mongoose');
const forecastSchema = new mongoose.Schema({ foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' }, foodName: String, date: { type: Date, default: Date.now }, predicted: { type: Number, default: 0 }, recommendedPrepare: { type: Number, default: 0 }, confidence: { type: Number, default: 0 }, method: { type: String, default: '7-day moving average + trend' } }, { timestamps: true });
module.exports = mongoose.model('Forecast', forecastSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HolidaySchema = new Schema({
    developer: {
        type: Schema.Types.ObjectId,
        ref: 'Developer',  // Assuming you have a Developer model
        required: true
    },
    developerName: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Denied','Withdrawn'],
        default: 'Pending'
    },
    appliedOn: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Holiday = mongoose.model('Holiday', HolidaySchema);

module.exports = Holiday;

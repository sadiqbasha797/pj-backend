const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CalendarEventSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    eventDate: {
        type: Date,
        required: true
    },
    endDate:{
        type:Date,
        required : false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'onModel' // This references the model type of the creator
    },
    status : {
        type : String,
        required : true,
        enum : ['Active','Not-Active'],
        default : 'Active'
    },
    onModel: {
        type: String,
        required: true,
        enum: ['Admin', 'Manager', 'Developer', 'Client'] // Models allowed to create the event
    },
    participants: [{
        participantId: {
            type: Schema.Types.ObjectId,
            refPath: 'participants.onModel'
        },
        onModel: {
            type: String,
            required: true,
            enum: ['Admin', 'Manager', 'Developer', 'Client']
        }
    }],
    location: {
        type: String,
        required: false
    },
    eventType: {
        type: String,
        required: true,
        enum: ['Meeting', 'Project Deadline', 'Reminder', 'Other', 'Work','Holiday','Task'] // Expanded types of events
    },
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project', // This references the Project model
        required: false // This is optional because not all events might be linked to a project
    },
    isAllDay: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const CalendarEvent = mongoose.model('CalendarEvent', CalendarEventSchema);

module.exports = CalendarEvent;

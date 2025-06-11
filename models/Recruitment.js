const mongoose = require('mongoose');

const recruitmentSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['LinkedIn', 'Wuzzuf', 'Facebook', 'Referral'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  hrInterviewer: {
    type: String,
    enum: ['Sandra', 'Nour'],
    required: true
  },
  technicalInterviewer: {
    type: String,
    enum: ['Sales Manager', 'Sales Director', 'Marketing Manager', 'Operation Manager', 'CFO', 'Legal Manager'],
    required: true
  },
  hrAssessment: {
    type: String,
    enum: ['Approved', 'Rejected', 'Pending'],
    required: true
  },
  finalStatus: {
    type: String,
    enum: ['Offered', 'Hired', 'Accepted', 'Pending', 'Rejected'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Recruitment', recruitmentSchema); 
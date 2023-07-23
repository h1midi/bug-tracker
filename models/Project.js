/* eslint-disable linebreak-style */
const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: {
    type: String,
    enum: ['Admin', 'Developer', 'Project Manager'],
    default: 'Developer',
  },
});

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low', 'Urgent'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Pending', 'Closed', 'Reopened'],
    default: 'Open',
  },
  type: {
    type: String,
    enum: ['Bug', 'Task', 'Enhancement', 'Support'],
    default: 'Task',
  },

  assignee: [teamMemberSchema],
  comments: [{ content: String, author: String, date: Date }],
});

const projectSchema = new mongoose.Schema({
  name: String,
  description: String,

  tickets: [ticketSchema],
  team: [teamMemberSchema],

}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;

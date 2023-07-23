/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable prefer-template */
const validator = require('validator');

const Project = require('../models/Project');
const User = require('../models/User');

function getParam(param, url) {
  const regexS = '[\\?&]' + param + '=([^&#]*)';
  const regex = new RegExp(regexS);
  const results = regex.exec(url);
  return results[1];
}
/**
 * Retrieve projects.
 */

exports.getDashboard = async (req, res) => {
  try {
    const docs = await Project.find().exec();

    const foundProjects = await Project.find({ 'tickets.assignee.email': req.user.email }).exec();

    const myTickets = [];
    if (foundProjects.length !== 0) {
      foundProjects.forEach((project) => {
        const matchingTickets = project.tickets.filter((ticket) => ticket.assignee.some((a) => a.email === req.user.email));
        if (matchingTickets.length > 0) {
          myTickets.push(...matchingTickets);
        }
      });
    }

    return res.render('home', { title: 'Home', projects: docs, tickets: myTickets });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllProjects = (req, res) => {
  Project.find((err, docs) => (
    res.render('project/list', { title: 'Projects', projects: docs })
  ));
};

exports.getProjectsById = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    res.render('project/detail', { title: 'Projects', project: prjct });
  });
};

/**
 * Create project.
 */

exports.postCreateProgram = (req, res, next) => {
  const project = new Project({
    name: req.body.name,
    description: req.body.description,
    tickets: [],
    team: [
      {
        email: req.user.email,
        name: req.user.profile.name,
        role: 'Manager',
      }
    ],
  });
  project.save((err) => {
    if (err) { return next(err); }
    this.getProjects(req, res);
  });
};

exports.getCreateProgram = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    res.render('project/create', { title: 'Create Project', project: prjct });
  });
};

/**
 * Delete project.
 */

exports.deleteProjectsById = (req, res, next) => {
  Project.findByIdAndDelete(getParam('id', req.originalUrl), (err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
};

/**
 * Edit project.
 */

exports.getEditProjectsById = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    res.render('project/edit', { title: 'Edit Project', project: prjct });
  });
};

exports.postEditProjectsById = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    project.name = req.body.name || '';
    project.description = req.body.description || '';
    project.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', { msg: 'Project information has been updated.' });
      res.redirect('/project/all');
    });
  });
};

/**
 * Add ticket.
 */

exports.getAddTicket = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    res.render('project/ticket/add', { title: 'Add Ticket', project: prjct });
  });
};

exports.postAddTicket = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, project) => {
    if (err) { return next(err); }

    const newTicket = {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status,
      type: req.body.type,
      assignee: [],
      comments: [],
    };

    project.tickets.push(newTicket);
    project.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', { msg: 'Ticket has been added.' });
      res.redirect('/project?id=' + project.id);
    });
  });
};

/**
 * Eddit ticket.
 */

exports.getEdditTicket = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    const tckt = prjct.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));
    res.render('project/ticket/edit', { title: 'Eddit Ticket', project: prjct, ticket: tckt });
  });
};

exports.postEdditTicket = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    const ticket = project.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));

    ticket.title = req.body.title;
    ticket.description = req.body.description || '';
    ticket.priority = req.body.priority || 'Medium';
    ticket.status = req.body.status || 'Open';
    ticket.type = req.body.type || 'Task';

    project.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', { msg: 'Ticket has been updated.' });
      res.redirect('/ticket?pid=' + project.id + '&tid=' + ticket.id);
    });
  });
};

/**
 * Desplay ticket.
 */

exports.getTicketById = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    const foundTicket = prjct.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));
    res.render('project/ticket/detail', { title: 'Ticket', ticket: foundTicket, project: prjct });
  });
};

/**
 * Delete ticket.
 */

exports.deleteTicket = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    const ticketIndex = project.tickets.findIndex((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));
    if (ticketIndex === -1) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    project.tickets.splice(ticketIndex, 1);
    project.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', { msg: 'Ticket has been deleted.' });
      res.redirect('/project?id=' + project.id);
    });
  });
};

/**
 * Add comment.
 */

exports.postAddComment = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    const ticket = project.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));

    const newComment = {
      author: req.body.author,
      content: req.body.content,
      date: Date.now(),
    };

    ticket.comments.push(newComment);
    project.save((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', { msg: 'Assignee has been added.' });
      res.redirect('/ticket?pid=' + project.id + '&tid=' + ticket.id);
    });
  });
};

/**
 * Add assignee.
 */

exports.getAddAssignee = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    const tckt = prjct.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));
    res.render('project/ticket/addAssignee', { title: 'Add Assignee', project: prjct, ticket: tckt });
  });
};

exports.postAddAssignee = (req, res, next) => {
  Project.findById(getParam('pid', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    const ticket = project.tickets.find((ticket) => ticket._id.toString() === getParam('tid', req.originalUrl));
    User.findOne({ email: req.body.email }, (err, foundUser) => {
      if (err) { return next(err); }

      if (!foundUser) {
        req.flash('error', { msg: 'User with the provided email not found.' });
        return res.redirect('/ticket?pid=' + project.id + '&tid=' + ticket.id);
      }

      ticket.assignee.push({
        uuid: foundUser.uuid,
        name: foundUser.profile.name,
        role: foundUser.profile.role,
        email: foundUser.email,
      });
      project.save((err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', { msg: 'Assignee has been added.' });
        res.redirect('/ticket?pid=' + project.id + '&tid=' + ticket.id);
      });
    });
  });
};

/**
 * Add member.
 */

exports.getAddMember = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, prjct) => {
    if (err) { return next(err); }
    res.render('project/addMember', { title: 'Add Member', project: prjct });
  });
};

exports.postAddMember = (req, res, next) => {
  Project.findById(getParam('id', req.originalUrl), (err, project) => {
    if (err) { return next(err); }
    User.findOne({ email: req.body.email }, (err, foundUser) => {
      if (err) { return next(err); }

      if (!foundUser) {
        req.flash('error', { msg: 'User with the provided email not found.' });
        return res.redirect('/project?id=' + project.id);
      }

      project.team.push({
        uuid: foundUser.uuid,
        name: foundUser.profile.name,
        role: foundUser.profile.role,
        email: foundUser.email,
      });
      project.save((err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', { msg: 'Member has been added.' });
        res.redirect('/project?id=' + project.id);
      });
    });
  });
};

/**
 * My Tickets.
 */

exports.getMyTickets = (req, res) => {
  Project.find({ 'tickets.assignee.email': req.user.email }, (err, foundProjects) => {
    if (err) {
      console.error('Error finding tickets:', err);
      return;
    }
    // Process the found projects and tickets
    if (foundProjects.length === 0) {
      console.log('No tickets found for the provided email.');
      res.render('myTickets', { title: 'My Tickets', resaults: [] });
    } else {
      const allMatchingTickets = [];
      foundProjects.forEach((project) => {
        const matchingTickets = project.tickets.filter((ticket) => ticket.assignee.some((a) => a.email === req.user.email));
        if (matchingTickets.length > 0) {
          allMatchingTickets.push({
            projectId: project.id,
            projectName: project.name,
            tickets: matchingTickets,
          });
        }
      });
      res.render('myTickets', { title: 'My Tickets', resaults: allMatchingTickets });
    }
  });
};

/**
 * Manage Users.
 */

exports.getUsers = async (_, res) => {
  const usrs = await User.find().exec();
  res.render('admin/manageUsers', { title: 'Manage Users', users: usrs });
};

/**
 * Edit Users.
 */

exports.getEditUser = (req, res, next) => {
  User.findById(getParam('id', req.originalUrl), (err, usr) => {
    if (err) { return next(err); }
    return res.render('admin/editUser', { title: 'Manage Users', user: usr });
  });
};

exports.postEditUser = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/users');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  User.findById(getParam('id', req.originalUrl), (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email;
    user.profile.name = req.body.name;
    user.profile.role = req.body.role;
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect('/users');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/users');
    });
  });
};

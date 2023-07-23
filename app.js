/* eslint-disable linebreak-style */
/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo');
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

/**
 * Controllers (route handlers).
 */
// const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const contactController = require('./controllers/contact');
const projectController = require('./controllers/project');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();
console.log('Run this app using "npm start" to include sass/scss/css builds.');

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // Two weeks in milliseconds
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  lusca.csrf()(req, res, next);
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user
    && req.path !== '/login'
    && req.path !== '/signup'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user
    && (req.path === '/account')) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

/**
 * Home routes.
 */
app.get('/', passportConfig.isAuthenticated, projectController.getDashboard);
/**
 * Auth routes.
 */
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
/**
 * Project routes.
 */
app.get('/project', passportConfig.isAuthenticated, projectController.getProjectsById);
app.get('/project/all', passportConfig.isAuthenticated, projectController.getAllProjects);
app.get('/project/new', passportConfig.isAuthenticated, projectController.getCreateProgram);
app.post('/project/new', passportConfig.isAuthenticated, projectController.postCreateProgram);
app.get('/project/delete', passportConfig.isAuthenticated, projectController.deleteProjectsById);
app.get('/project/edit', passportConfig.isAuthenticated, projectController.getEditProjectsById);
app.post('/project/edit', passportConfig.isAuthenticated, projectController.postEditProjectsById);
app.get('/project/addMember', passportConfig.isAuthenticated, projectController.getAddMember);
app.post('/project/addMember', passportConfig.isAuthenticated, projectController.postAddMember);
/**
 * Ticket routes.
 */
app.get('/project/addTicket', passportConfig.isAuthenticated, projectController.getAddTicket);
app.post('/project/addTicket', passportConfig.isAuthenticated, projectController.postAddTicket);
app.get('/ticket', passportConfig.isAuthenticated, projectController.getTicketById);
app.get('/ticket/edit', passportConfig.isAuthenticated, projectController.getEdditTicket);
app.post('/ticket/edit', passportConfig.isAuthenticated, projectController.postEdditTicket);
app.get('/ticket/delete', passportConfig.isAuthenticated, projectController.deleteTicket);
app.post('/ticket/submitComment', passportConfig.isAuthenticated, projectController.postAddComment);
app.get('/ticket/addAssignee', passportConfig.isAuthenticated, projectController.getAddAssignee);
app.post('/ticket/addAssignee', passportConfig.isAuthenticated, projectController.postAddAssignee);
app.get('/myTickets', passportConfig.isAuthenticated, projectController.getMyTickets);
/**
 * Contact routes.
 */
app.get('/contact', passportConfig.isAuthenticated, contactController.getContact);
app.post('/contact', passportConfig.isAuthenticated, contactController.postContact);
/**
 * account routes.
 */
app.get('/account/verify', passportConfig.isAuthenticated, userController.getVerifyEmail);
app.get('/account/verify/:token', passportConfig.isAuthenticated, userController.getVerifyEmailToken);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
/**
 * admin routes.
 */
app.get('/users', passportConfig.isAuthenticated, userController.isAdmin, projectController.getUsers);
app.get('/user', passportConfig.isAuthenticated, userController.isAdmin, projectController.getEditUser);
app.post('/user', passportConfig.isAuthenticated, userController.isAdmin, projectController.postEditUser);

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log(`App is running on http://localhost:${app.get('port')} in ${app.get('env')} mode`);
  console.log('Press CTRL-C to stop');
});

module.exports = app;

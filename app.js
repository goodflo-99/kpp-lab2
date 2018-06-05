const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const socket = require('socket.io');
const keys = require('./config/keys');

mongoose.connect(keys.mongodb.database);
let db = mongoose.connection;

// Check connection
db.once('open', function(){
	console.log('Connected to MongoDb');
});

// Check for DB errors
db.on('error', function(err) {
	console.log(err);
});

// Init app
const app = express();

// Bring in Models
let User = require('./models/user');
let Article = require('./models/article');

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Body Parser
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

//Express Session Middleware
app.use(session({
	secret: keys.session.cookieKey,
	resave: true,
	saveUninitialized: true
}));

//Express Messages Middleware
app.use(require('connect-flash')());
app.use(function(req, res, next) {
	res.locals.messages = require('express-messages')(req, res);
	next();
});

//Express Validator Middleware
app.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.');
		var root = namespace.shift();
		var formParam = root;

		while(namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return {
			param: formParam,
			msg: msg,
			value: value
		};
	}
}));

//Passport config
require('./config/passport')(passport);

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
	res.locals.user = req.user || null;
	next();
});

// Home Route
app.get('/', function(req, res){
	Article.find({}, function(err, article){
		if(err){
			console.log(err);
		} else {
			res.render('index', {
				title: 'EXPRESS HOME',
				text: "Hello!",
				articles: article
			});	
		}
	});

});

app.get('/chat', function(req, res){
	res.render('chat', {
		title: 'EXPRESS Chat'
	});
});

//Route Files
let articles = require('./routes/articles');
let users = require('./routes/user');
app.use('/articles', articles);
app.use('/users', users);

app.get('*', function(req, res){
	res.render('404');
});

let server = app.listen(process.env.PORT || 3000, function(){
	console.log('Server is run on port:3000');
});


//Socket connection
let io = socket(server);

io.on('connection', function(socket){
	socket.on('chat', function(data){
		io.sockets.emit('chat', data);
	});
	socket.on('typing', function(data){
		socket.broadcast.emit('typing', data)
	});
});
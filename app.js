/* Some initialization boilerplate. Also, we include the code from
   routes/routes.js, so we can have access to the routes. Note that
   we get back the object that is defined at the end of routes.js,
   and that we use the fields of that object (e.g., routes.get_main)
   to access the routes. */

var express = require('express');
var routes = require('./routes/routes.js');
var app = express();

app.use(express.bodyParser());
app.use(express.logger("default"));
app.use(express.cookieParser());
app.use(express.session({secret:"nobodyGue$$Thi$"}));

/* Below we install the routes. The first argument is the URL that we
   are routing, and the second argument is the handler function that
   should be invoked when someone opens that URL. Note the difference
   between app.get and app.post; normal web requests are GETs, but
   POST is often used when submitting web forms ('method="post"'). */

app.get('/', routes.get_main);
app.get('/login', routes.get_login);
app.post('/checklogin', routes.check_login);
app.post('/createaccount', routes.create_account);
app.get('/logout', routes.log_out);
app.post('/updateprofile', routes.update_user);
app.post('/likepost', routes.like_post);
app.get('/whoami', routes.whoami);
app.post('/getprofile', routes.get_profile);
app.post('/updatestatus', routes.update_status);
app.post('/getwall', routes.load_wall);
app.get('/getfeed', routes.load_feed);
app.post('/wallpost', routes.wall_post);
app.post('/addfriend', routes.request_friend);
app.post('/autocomplete', routes.auto_complete);
//app.post('/completefriend', routes.complete_friend);
app.get('/loadnetwork', routes.load_network);
/* Run the server */

console.log('Smartnet: A Project by Salaar and Akshay');
app.listen(8080);
console.log('Server running on port 8080. Now open http://localhost:8080/ in your browser!');

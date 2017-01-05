var db = require('../models/database.js');
var Joi = require('joi');

var getMain = function(req, res) {
  if(req.session.username) {
	res.render('main.ejs');
  } else {
	res.redirect('/login');
  }
};

var getLogin = function(req, res) {
  res.render('login.ejs');
}

var logMeIn = function(req, res) {
	var username = req.body.nameInput;
	var password = req.body.passInput;
	if(username === "" || password === "") {
		res.send("All Fields Are Required");
		return;
	}
	username = username.toLowerCase();
	db.login(username, password, function(data, err) {
	    if (data) {
	      req.session.username = username;
	      req.session.fullname = data.name;
	      res.send("/");
	    } else {
	      res.send(err);
	    }
	 });
};

var signMeUp = function(req, res) {
	var fullname = req.body.fullInput;
	var username = req.body.nameInput;
	var password = req.body.passInput;
	var confpass = req.body.passInput2;
	if(username === "" || password === "" || fullname === "") {
		res.send("All Fields Are Required");
		return;
	} else if(password != confpass) {
		res.send("Passwords must match");
		return;
	} else if(!/^[a-zA-Z]+$/.test(username)) {
		res.send("Username must only contain letters");
		return;
	}
	username = username.toLowerCase();
	db.signup(fullname, username, password, function(data, err) {
	    if (data) {
	      req.session.username = username;
	      req.session.fullname = data.name;
	      res.send("/");
	    } else {
	      res.send(err);
	    }
	 });
};

var logMeOut = function(req, res) {
	req.session.destroy();
	res.redirect('/');
};

var return_me = function(req, res) {
	res.send({username: req.session.username, fullname: req.session.fullname});
}

var updateProfile = function(req, res) {
	var email = req.body.email;
	var affil = req.body.affiliation;
	var birthday = req.body.birthday;
	var interests = req.body.interests;
	var picture = req.body.picture;
	db.updateuser(req.session.username, email, affil, birthday, interests, picture, function(data, err) {
		if(data) {
			res.send(data);
		} else {
			//console.log(err);
			res.send(err);
		}
	});
}

var likePost = function(req, res) {
	var user = req.body.username;
	var time = req.body.timestamp;
	db.likepost(user, time, req.session.username, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	});
};

var loadWall = function(req, res) {
	db.loadwall(req.body.username, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	})
}

var loadFeed = function(req, res) {
	db.loadfeed(req.session.username, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	})
}

var getProfile = function(req, res) {
	db.getprofile(req.body.username, function(data, err) {
		if (data) {
			db.checkfriend(req.session.username, req.body.username, function(data2, err) {
				if (data2) {
					console.log(data);
					data.friendstatus = data2;
				}
				res.send(data);
			});
		} else {
			res.send(err);
		}
	});
};

var updateStatus = function(req, res) {
	var timestamp = Date.now();
	var content = req.body.content.replace(/[^a-zA-Z0-9.?!,\s]+/,"");;
	db.updatestatus(req.session.username, timestamp, content, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	});
};

var wallPost = function(req, res) {
	var timestamp = Date.now();
	var content = req.body.content.replace(/[^a-zA-Z0-9.?!,\s]+/,"");
	var recipient = req.body.username;
	db.wallpost(recipient, timestamp, content, req.session.username, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	});
};

var requestFriend = function(req, res) {
	var friend = req.body.username;
	db.requestfriend(req.session.username, friend, function(data, err) {
		if (err) {
			res.send(err);
		} else if (data == 1) {
			//console.log('friend complete')
			db.completefriend(friend, req.session.username, function(data2, err) {
				if (data2 == "Completed") {
					res.send("Completed");
				} else {
					res.send(err);
				}
			});
		} else if (data == 0){
			res.send("Requested");
		} else {
			db.removefriend(friend, req.session.username, function(data2, err) {
				if (data2 == "Deleted") {
					res.send("Deleted");
				} else {
					res.send(null);
				}
			});
		}
	});	
};

var completeFriend = function(req, res) {
	db.completefriend(req.session.username, req.body.friend, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	});
};

var autoComplete = function(req, res) {
	db.autocomplete(req.body.text, function(data, err) {
		if(data) {
			res.send(data);
		} else {
			res.send(err);
		}
	});
}

var loadNetwork = function(req, res) {
	db.loadnetwork(req.session.username, function(data, err) {
		if (data) {
			res.send(data);
		} else {
			res.send(err);
		}
	})
}

var routes = { 
  get_main: getMain,
  get_login: getLogin,
  check_login: logMeIn,
  create_account: signMeUp,
  log_out: logMeOut,
  whoami:return_me,
  update_user:updateProfile,
  like_post:likePost,
  get_profile:getProfile,
  update_status:updateStatus,
  load_wall:loadWall,
  load_feed:loadFeed,
  wall_post:wallPost,
  request_friend:requestFriend,
  complete_friend:completeFriend,
  auto_complete:autoComplete,
  load_network:loadNetwork
};

module.exports = routes;

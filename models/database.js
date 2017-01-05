var async = require('async');
var SHA3 = require('crypto-js/sha3');

var vogels = require('vogels');
var Joi = require('joi');

vogels.AWS.config.loadFromPath('config.json');

var User = vogels.define('user', {
	hashKey:'username',
	schema:{
		username:Joi.string(),
		fullname:Joi.string(),
		password:Joi.string(),
		name:Joi.string(),
		info : {
			birthday:Joi.date(),
			interests:vogels.types.stringSet(),
			affiliation:Joi.string(),
			email:Joi.string().email(),
			picture:Joi.string()
		}	
	}
});

var Friend = vogels.define('friend', {
	hashKey:'username',
	rangeKey:'frienduser',
	schema:{
		username:Joi.string(),
		frienduser:Joi.string(),
		weight:Joi.number()
	}
});

var Post = vogels.define('post', {
	hashKey:'creator',
	rangeKey:'timestamp',
	schema:{
		timestamp:Joi.date().timestamp(),
		creator:Joi.string(),
		content:Joi.string(),
		type:Joi.number(),
		likes:Joi.number(),
		recipient:Joi.string(),
		id:Joi.number()
	}
});


var myDB_login = function(user, pass, route_callbck){
	  console.log('Looking up: ' + user);
	  User.get(user, function (err, data) {
	    if (err) {
	      route_callbck(null, "Lookup error: "+err);
	    } else if (data === null) {
	      route_callbck(null, "Unknown user");
	    } else {
	      var parsed = data.get('password');
	      if(parsed != SHA3(pass).toString()) {
	    	  route_callbck(null, "Incorrect password");
	      } else {
	    	  route_callbck({ name : data.get('fullname') }, null);
	      }
	    }
	  });
};

var myDB_signup = function(name, user, pass, route_callbck){
	  console.log('Looking up: ' + user);
	  User.get(user, function (err, data) {
	    if (err) {
	    	route_callbck(null, "Error creating user")
	    } else if (data === null) {
			  User.update({username:user, fullname:name, password:SHA3(pass).toString(),"name":user,
				  info:{picture:"https://x1.xingassets.com/assets/frontend_minified/img/users/nobody_m.original.jpg"}}, function(err, data) {
			  	  if (err) {
			   	      route_callbck(null, "Creation error: "+err);
			   	  } else {
		    	      route_callbck({name:name}, null);
		    	  }
			  });
	    } else {
	      route_callbck(null, "User already exists");
	    }
	  });
};

var update_user = function(user, email, affil, birthday, interests, picture, route_callbck) {
	console.log('interests');
	console.log(interests);
	User.update({username:user, info:{birthday:birthday, affil:affil, email:email, interests:interests,
		picture:picture}},
			function(err, data) {
				if (err) {
					route_callbck(null, "Creation error: "+err);
				} else {
					var time = Date.now();
					var post_content = "Go check out their profile!";
					Post.update({creator:user, timestamp:time,id:time, content:post_content, type:2, likes:0}, 
							function(err, data) {
								if (err) {
									route_callbck("User updated", null);
								} else {
									route_callbck("User updated", null);
								}
					})
				}
	});
};

var update_likes = function(creator, time, recipient, route_callbck) {
	var post_content = "";
	Post.get(creator, time, function (err, data) {
		if (data) {
			post_content = "Original post: "+ data.get('content');
		}
	});
	Post.update({creator:creator, timestamp:time, id:time, likes:{$add:1}}, function(err, data) {
		if (err) {
			route_callbck(null, "Error liking post");
		} else {
			Friend.get(creator, recipient, function(err, data) {
				if (err) {
					route_callbck(null, null);
				} else {
					if (data === null) {
						timestamp = Date.now();
						Post.update({creator:recipient, timestamp:timestamp, 
							content:post_content, type:4, id: timestamp, recipient:creator}, function(err, data) {
								if (err) {
									route_callbck("Likes updated", null);
								} else {
									route_callbck("Likes updated", null);
								}
						});
					} else if (data.get('weight') != 0){
						Friend.update({username:creator, frienduser:recipient, weight:{$add:1}}, function(err, data) {
							if (err) {
								route_callbck("Likes updated", null);
							} else {
								Friend.update({username:recipient, frienduser:creator, weight:{$add:1}}, function (err, data) {
									if (err) {
										route_callbck("Likes updated", null);
									} else {
										var timestamp = Date.now();
										Post.update({creator:recipient, timestamp:timestamp, 
											content:post_content, id:timestamp, type:4, recipient:creator}, function(err, data) {
												if (err) {
													route_callbck("No post created", null);
												} else {
													route_callbck("Likes updated", null);
												}
										});
									}
								})
							}
						})
					} else {
						route_callbck(null, null);
					}
				}
			})
		}
	});
};

var load_wall = function(user, route_callbck) {
	Post.query(user).filter("type").lt(2).descending().limit(4).exec(function(err, data) {
		if (err) {
			route_callbck(null, "Error loading posts");
		} else {
			var arr = [];
			async.forEach(data.Items, function(item, callback) {
					var pic = "";
					var target = item.attrs.creator;
					if (item.attrs.type == 1) {
						target = item.attrs.recipient;
					}
					User.get(target, function(err, data2) {
						pic = data2.get('info').picture;
						item.attrs.picture = pic;
						arr.push(item.attrs);
						callback(null);
					});
			}, function() {
				console.log(arr);
				route_callbck(arr, null);
			});
		}
	});
}

var load_feed = function(user, route_callbck) {
	Friend.query(user).exec(function(err, data) {
		if (err) {
			route_callbck(null, "error loading feed");
		} else {
			var arr = [];
			var posts = [];
			var d = new Date();
			d.setDate(d.getDate()-1);
			var dtime = d.getTime();
			async.forEach(data.Items, function(friend, callback) {
				arr.push({friend:friend.attrs.frienduser, weight:friend.attrs.weight});
				callback();
			}, function() {
				if (arr.length == 0) {
					route_callbck("nothing in feed", null);
				}
				async.forEach(arr, function(friender, callback2) {
					Post.query(friender.friend).filter("id").gt(dtime).descending().exec(function(err, data2) {
						if (data2 === undefined) {
							route_callbck("nothing in feed", null);
						} else {
							async.forEach(data2.Items, function(post, callback3) {
								var pic = "";
								User.get(post.attrs.creator, function(err, data3) {
									pic = data3.get('info').picture;
									post.attrs.picture = pic;
									post.attrs.weight = friender.weight;
									posts.push(post.attrs);
									callback3();
								})
							}, function () {
								callback2();
							});
						}
					});
					
				}, function () {
					//important code
					//sort the posts
					if (posts.length > 8) {
						var return_posts = []
						var i = 0;
						posts.sort(function(x,y){return y.weight - x.weight});
						console.log(posts[0].weight);
						console.log(posts[1].weight);
						route_callbck(posts.slice(0,8))
					} else {
						route_callbck(posts, null);
					}
				});
			});
			
		}
	})
}

var status_update = function(creator, time, content, route_callbck) {
	Post.update({creator:creator, timestamp:time, content:content, likes:0, type:0, id:time}, function(err, data) {
		if (err) {
			route_callbck(null, "Error updating status");
		} else {
			route_callbck({message:"Status updated successfully"}, null);
		}
	});
};

var wall_post = function(creator, time, content, recipient, route_callbck) {
	Post.update({creator:creator, timestamp:time, content:content, likes:0, type:1, recipient:recipient,
		id:time}, function(err, data) {
		if (err) {
			route_callbck(null, "Error posting on wall");
		} else {
			Friend.get(creator, recipient, function(err, data) {
				if (err) {
					route_callbck(null, null);
				} else {
					if (data === null) {
						route_callbck(null, null);
					} else if (data.get('weight') != 0){
						Friend.update({username:creator, frienduser:recipient, weight:{$add:1}}, function(err, data) {
							if (err) {
								route_callbck("Posted on wall", null);
							} else {
								Friend.update({username:recipient, frienduser:creator, weight:{$add:1}}, function (err, data) {
									route_callbck("Posted on wall", null);
								})
							}
						})
					} else {
						route_callbck("Posted on wall", null);
					}
				}
			})
		}
	});
};

var get_profile = function(user, route_callbck) {
	User.get(user, function(err, data) {
		console.log('getprofile');
		console.log(user);
		if (err) {
			route_callbck(null, "Error getting user profile data");
		} else {
			if (data === null) {
				route_callbck(null, null);
			} else if(data.get('info')) {
				route_callbck(data.get('info'), null);
			} else {
				route_callbck({}, null);
			}
		}
	});
};

var request_friend = function(user, friend, route_callbck) {
	Friend.get(user, friend, function (err, data) {
		if (err) {
			route_callbck(null, "error requesting friend");
		} else if (data == null) {
			Friend.get(friend, user, function(err, data) {
				if (err) {
					route_callbck(null, "Error requesting friend");
				} else if (data == null) {
					Friend.update({username:user, frienduser:friend, weight:0}, function(err, data) {
						if (err) {
							route_callbck(null, "Error requesting friend");
						} else {
							route_callbck(0, null);
						}
					});
				} else {
					route_callbck(1, null);
				}
				
			})
		} else {
			route_callbck(2, null);
		}
	})

}

var complete_friend = function(user, friend, route_callbck) {
	Friend.update({username:user, frienduser:friend, weight:1}, function(err, data) {
		if (err) {
			route_callbck(null, "Error completing friendship");
		} else {
			Friend.update({username:friend, frienduser:user, weight:1}, function(err, data) {
				if (err) {
					route_callbck(null, "Error updating friend weight");
				} else {
					var post_content = "" + user.charAt(0).toUpperCase()+user.slice(1) + " and " + 
					friend.charAt(0).toUpperCase()+friend.slice(1) + " are now friends!";
					var time = Date.now();
					Post.update({creator:user, timestamp:time, content:post_content, id:time, recipient:friend, type:3, likes:0}, function(err, data) {
						if (err) {
							route_callbck("Success", null);
						} else {
							post_content = "" + friend.charAt(0).toUpperCase()+friend.slice(1) + " and " + 
							user.charAt(0).toUpperCase()+user.slice(1) + " are now friends!";
							Post.update({creator:friend, timestamp:time, id:time, content:post_content, recipient:user, type:3, likes:0}, function(err, data) {
								if (err) {
									route_callbck("Success", null);
								} else {
									route_callbck("Completed", null);
								}
							});
						}
					});
				}
			});
		};
	});
}

var check_friend = function(user, friend, route_callbck) {
	Friend.get(friend, user, function(err, data) {
		if (data != null) {
			Friend.get(user, friend, function(err, data2) {
				if (data2 != null) {
					route_callbck(3, null);
				} else {
					route_callbck(1, null);
				}
			});
		} else {
			Friend.get(user, friend, function(err, data2) {
				if (data2 != null) {
					route_callbck(2, null);
				} else {
					route_callbck(0, null);
				}
			});
		}
	})
}

var delete_friend = function(user, friend, route_callbck) {
	Friend.destroy(user, friend, function(err) {
		if (err) {
			route_callbck(null, null);
		} else {
			Friend.destroy(friend, user, function(err) {
				if (err) {
					route_callbck(null, null);
				} else {
					route_callbck("Deleted", null);
				}
			});
		}
	});
}

var auto_complete = function(text, route_callbck) {
	arr = [];
	console.log(text);
	User.scan().where('name').beginsWith(text).exec(function(err, data) {
		if (data) {
			for(var i = 0; i < data.Items.length; i++) {
				arr.push(data.Items[i].attrs.username);
			}
			route_callbck(arr, null);
		}

	});
}

var load_network = function(user, route_callbck) {
	json = {}
	seen_friends = [];
	var arr;
	json.id = user;
	json.name = user;
	json.children = [];
	Friend.query(user).exec(function(err, data) {
		if (err) {
			route_callbck(null, "no friends")
		} else {
			async.forEach(data.Items, function(friend, callback) {
				var fr = friend.attrs.frienduser;
				arr.push(fr);
				json.children.push({id:fr, name:fr, children:[]});
				callback();
			}, function() {
				async.forEach(arr, function(second_friend, callback2) {
					Friend.query(second_friend).exec(function(err, data2) {
						if (err) {
							route_callbck(null, "no second friends")
						} else {
							async.forEach(data2.Items, function(f, callback3) {
								json.children.push({id:second_friend, name:second_friend})
								seen_friends.push(last);
							}, function() {
								callback3();
							})
						}
					}, function() {
						callback2();
					});
				})
			});
		}
	})
	
}

var database = {
  login: myDB_login,
  signup: myDB_signup,
  updateuser: update_user,
  likepost: update_likes,
  loadwall: load_wall,
  updatestatus: status_update,
  getprofile: get_profile,
  loadfeed: load_feed,
  wallpost: wall_post,
  requestfriend: request_friend,
  completefriend: complete_friend,
  checkfriend:check_friend,
  removefriend: delete_friend,
  autocomplete: auto_complete,
};
                                        
module.exports = database;


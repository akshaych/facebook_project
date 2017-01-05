var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config.json');

var db = new AWS.DynamoDB();
var SHA3 = require('crypto-js/sha3');

var async = require('async');
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
			picture:Joi.string(),
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
/* Here is our initial data. */
function setup() {
User.deleteTable(function(err) {
	  if (err) {
	    console.log('Error deleting table: ', err);
	  } else {
	    console.log('Table has been deleted');
	  }
	});

Friend.deleteTable(function(err) {
	  if (err) {
	    console.log('Error deleting table: ', err);
	  } else {
	    console.log('Table has been deleted');
	  }
	});

Post.deleteTable(function(err) {
	  if (err) {
	    console.log('Error deleting table: ', err);
	  } else {
	    console.log('Table has been deleted');
	  }
	});

vogels.createTables(function(err) {
	  if (err) {
	    console.log('Error creating tables: ', err);
	  } else {
	    console.log('Tables have been created');
	    User.update({username:"akshay", name:"akshay",fullname:"Akshay", 
			password:SHA3("salaar").toString(), info:{
			birthday:'06-14-1996',interests:['tennis', 'golf'],affil:'Penn',email:'akcm96@gmail.com',
			picture:"https://x1.xingassets.com/assets/frontend_minified/img/users/nobody_m.original.jpg"}},
			function(err, data) {
			  if (err) {
			 	     console.log(err);
			 	  } else {
				     console.log(data);
				  }
			});
	  }
});
}

/* So far we've only defined functions - the line below is the first line that
   is actually executed when we start the program. */
setup();

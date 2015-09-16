var request = require('request');
var bcrypt = require('bcrypt-nodejs');
var User = require('../app/models/user');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};


exports.hash = function(password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      console.err(err)
    }
    bcrypt.hash(password, salt, null, function(err, hash) {
      if (err) {
        console.err(err)
      }
      return callback(hash, salt);
    });
  });
}

exports.hashCheck = function(password, hash, callback) {
  bcrypt.compare(password, hash, function(err, res) {
    if (err) {
      console.err(err);
    }
    callback(res)
  });
}

exports.restrict = function(req, res, next) {
  if (req.url === '/' || req.url === '/create' || req.url === '/links') {
    if (req.session.username) {
      new User({
        username: req.session.username
      }).fetch().then(function(found) {
        if (found.attributes.session === req.session.token) {
          //next();
          return;
        } else {
          console.log("BAD LOGIN, REDIRECTING")
          res.redirect('login');
        }
      })
    } else {
      console.log("USER NOT LOGGED IN, REDIRECTING")
      res.redirect('login');
    }

  }
  //next();
  return;
}
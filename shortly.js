var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({
  extended: true
}));
// Use express' session system
app.use(session({
  secret: 'super secret phrase',
  resave: false,
  saveUninitialized: false
}));
//AUTH CHECK
// app.get('*', function(req, res, next) {
//   console.log("checking for validation")
//   util.restrict(req, res, next);
// })

app.use(express.static(__dirname + '/public'));

app.get('/',
  function(req, res) {
    console.log("Homepage", req.session);
    util.restrict(req, res);
    res.render('index');
  });

app.get('/create',
  function(req, res) {
    util.restrict(req, res);
    res.render('index');
  });

app.get('/links',
  function(req, res) {
    util.restrict(req, res);
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });

app.post('/links',
  function(req, res) {
    util.restrict(req, res);
    var uri = req.body.url;
    console.log('url:', uri);

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({
      url: uri
    }).fetch().then(function(found) {
      if (found) {
        console.log("FOUND LINK:", found.attributes)
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          Links.create({
              url: uri,
              title: title,
              base_url: req.headers.origin
            })
            .then(function(newLink) {
              res.send(200, newLink);
            });
        });
      }
    }).catch(function(err) {
      console.log('ERROR!!!', err)
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login',
  function(req, res) {
    res.render('login')
  }
);

app.post('/login',
  function(req, res) {
    new User({
      username: req.body.username
    }).fetch().then(function(found) {
      util.hashCheck(req.body.password, found.attributes.hash, function(result) {
        if (result) {
          date = new Date();
          util.hash(req.body.password + date, function(token) {
            found.save({
              session: token
            })
            req.session = req.session.regenerate(function(err) {
              req.session.token = token;
              req.session.username = req.body.username
              console.log("THIS IS THE REQ", req.session);
              res.redirect('/')

            })
            console.log("THIS IS THE SESSION DATA:", req.session);
          })

        } else if (result === false) {
          //needs some sort of visual indicator of a failed login
          res.redirect('/login');

        }
      });
    })
  }
);

app.get('/signup',
  function(req, res) {
    res.render('signup');
  }
);

app.post('/signup',
  function(req, res) {
    util.hash(req.body.password, function(hash, salt) {
      new User({
        username: req.body.username,
        hash: hash,
        salt: salt
      }).fetch().then(function(found) {
        if (found) {
          res.send(200, found.attributes);
        } else {
          Users.create({
              username: req.body.username,
              hash: hash,
              salt: salt
            })
            .then(function(newLink) {
              res.send(200, newLink);
            });
        }
      });
    });

  })

app.post('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/login');
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({
    code: req.params[0]
  }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
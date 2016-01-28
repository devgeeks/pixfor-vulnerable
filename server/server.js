var sqlite3 = require('sqlite3');
var path = require('path');
var fs = require('fs');
//fs.unlinkSync('data/demodb02');
var fs = require('fs-extra');
fs.copySync(path.resolve(__dirname,'./data/demodboriginal.db'), path.resolve(__dirname,'./data/demodb02.db'));
var db = new sqlite3.Database('data/demodb02.db');
var sha1 = require('sha1');

var express = require('express');
var restapi = express();
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

db.serialize(function() {
  db.run("PRAGMA foreign_keys = ON");
});

restapi.use('/static', express.static(__dirname + '/static'));
restapi.use( bodyParser.json() );
restapi.use(bodyParser.urlencoded({
  extended: true
}));

restapi.get('/data', function(req, res) {
  db.get("SELECT value FROM counts", function(err, row){
    res.json({ "count" : row.value });
  });
});

restapi.get('/user', function(req, res) {
  console.log(req.query.username);
  // contrived. this should be db.get
  db.all("SELECT * from users WHERE username = '" + req.query.username + "'", function(err, rows) {
  //db.all("SELECT * from users WHERE username = ?", req.query.username, function(err, rows) {
  //db.get("SELECT * from users WHERE username = ?", req.query.username, function(err, rows) {
    if (err) {
      console.err(err);
      return res.status(500).send(err);
    }
    else {
      return res.json(rows);
    }
  });
});

restapi.post('/auth', jsonParser, function(req, res) {
  console.log(req.body);
  if (req.body.username && req.body.password) {
    db.get("SELECT * FROM users WHERE username = '" + req.body.username + "'", function(err, row) {
      if (row) {
        if (sha1(req.body.password) === row.password) {
          return res.json({
            success: true,
            id: row.id,
            username: row.username
          });
        }
        else {
          return res.status(403).send("Username or Password incorrect");
        }
      }
      else {
        return res.status(404).send("User not found");
      }
    });
  }
  else {
    return res.status(500).send("Username or Password missing");
  }
});

restapi.post('/register', jsonParser, function(req, res) {
  console.log(req.body);
  if (req.body.username && req.body.password) {
    db.get("SELECT * FROM users WHERE username = '" + req.body.username + "'", function(err, row) {
      if (row) {
        return res.status(500).send("Try again");
      }
      else {
        db.run("INSERT INTO users (username, password) VALUES('" + req.body.username + "', '" + sha1(req.body.password) + "')", function(err) {
          if (err) {
            return res.status(500).send(err);
          }
          else if(this.lastID) {
            return res.json({
              success: true,
              id: this.lastID
            });
          }
          else {
            return res.status(500).send("Unknown error");
          }
        });
      }
    });
  }
  else {
    return res.status(500).send("Username or Password missing");
  }
});

restapi.get('/album', function(req, res) {
  if (req.query.albumid) {
    db.get("SELECT * FROM albums WHERE id = " + req.query.albumid, function(err, row) {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      else {
        return res.json(row);
      }
    });
  }
  else {
    return res.status(500).send("Invalid params");
  }
});

restapi.get('/albums', function(req, res) {
  console.log(req.query.username);
  console.log(req.query.albumid);
  if (req.query.username) {
    db.all("SELECT * FROM albums WHERE ownerid = (SELECT id from users WHERE username = '" + req.query.username + "')", function(err, rows) {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      else {
        return res.json(rows);
      }
    });
  }
  else if (req.query.albumid) {
    db.all("SELECT * FROM albums WHERE id = " + req.query.albumid, function(err, rows) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      }
      else {
        return res.json(rows);
      }
    });
  }
  else {
    console.log('this should 500');
    res.status(500).send("Invalid params");
  }
});

restapi.get('/pix', function(req, res) {
  console.log(req.query.pixid);
  db.all("SELECT * FROM pix WHERE albumid = " + req.query.albumid, function(err, rows) {
    if (err) {
      console.log(err);
      return res.status(500).send(err);;
    }
    else {
      return res.json(rows);
    }
  });
});

restapi.post('/data', function(req, res) {
  db.run("UPDATE counts SET value = value + 1 WHERE key = ?", "counter", function(err, row){
    if (err){
      console.err(err);
      res.status(500);
    }
    else {
      res.status(202);
    }
    res.end();
  });
});


restapi.listen(3000);

console.log("Submit GET or POST to http://localhost:3000/data");

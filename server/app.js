const express = require('express');
const path = require('path');
const db = require('./queries.js');
const app = express();
const PORT = 3000;

const FRONTEND_DIR = '/../frontend';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  const FILE = path.join(__dirname, `${FRONTEND_DIR}/home.html`);
  res.sendFile(FILE);
});

app.get('/style.css', (req, res) => {
  const FILE = path.join(__dirname, `${FRONTEND_DIR}/style.css`);
  res.sendFile(FILE);
});

app.get('/script.js', (req, res) => {
  const FILE = path.join(__dirname, `${FRONTEND_DIR}/script.js`);
  res.sendFile(FILE);
});

app.get('/post/:id', (req, res) => {
  const POST_ID = req.params.id;
  const auth = req.query.auth;
  db.getPost(POST_ID, auth)
    .then(html => {
      res.status(200).send(html);
    })
    .catch(error => {
      res.status(404);
      console.log(error);
    });
});

app.get('/api/feed', (req, res) => {
  const userauth = req.query.auth;
  if (userauth === undefined) {
    res.status(401).end("Authentication required");
  }
  else {
    db.getFeed(userauth)
      .then(feed => {
        res.json(feed);
      })
      .catch(error => {
        console.log(error);
      });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === undefined || password === undefined) {
    res.status(401);
  }
  else {
    db.loginUser(username, password)
      .then(uuid => {
        res.json(uuid);
      })
      .catch(error => {
        res.status(401);
        console.log(error);
      });
  }
});

app.listen(PORT, () => {
  console.log(`App hosted at http://localhost:3000`);
});

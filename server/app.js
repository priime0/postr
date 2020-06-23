const express = require('express');
const path = require('path');
const db = require('./queries.js');
const app = express();
const PORT = 3000;

const FRONTEND_DIR = '/../frontend';

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

app.get('/feed', (req, res) => {
  getFeed(req, res);
});

app.get('/post/:id', (req, res) => {
  const POST_ID = req.params.id;
  db.getPost(POST_ID)
    .then(html => {
      res.status(200).send(html);
    })
    .catch(error => {
      res.status(404);
      console.log(error);
    });
});

app.listen(PORT, () => {
  console.log(`App hosted at http://localhost:3000`);
});

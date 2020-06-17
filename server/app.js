const express = require('express');
const app = express();
const PORT = 3000;

const FRONTEND = '/../frontend';

app.get('/', (req, res) => {
  const FILE = path.join(__dirname, `${FRONTEND}/home.html`);
  res.sendFile(FILE);
});

app.listen(PORT, () => {
  console.log(`App hosted at http://localhost:3000`);
});

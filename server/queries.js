const Vue = require('vue');
const vsr = require('vue-server-renderer');
const Pool = require('pg').Pool;
const fs = require('fs');
const path = require('path');
const pool = new Pool({
  user: 'me',
  host: 'localhost',
  database: 'postr',
  password: 'password',
  port: 5432
});
const POST_TEMPLATE_PATH = path.join(__dirname, '/../templates/post.html');
const POST_TEMPLATE = fs.readFileSync(POST_TEMPLATE_PATH, 'utf-8');
const POST_DIR = '../data/posts';
const POST_RENDERER = vsr.createRenderer({
  POST_TEMPLATE,
});

const getFeed = (req, res) => {

};

const getPost = (req, res) => {
  const POST_ID = req.params.id;
  renderAndSendPost(POST_ID, res);
};

const renderAndSendPost = (POST_ID, res) => {
  const POST_FILE = path.join(__dirname, `${POST_DIR}/${POST_ID}`);
  const POST_CONTENTS = fs.readFileSync(POST_FILE, 'utf-8');
  pool
    .query('SELECT * FROM posts WHERE id = $1', [POST_ID])
    .then((results) => {
      const info = results.rows[0];
      const POST_TITLE = info.title;
      const POST_AUTHOR = info.author;
      const POST_TIME = info.time;
      const post_tag_string = info.tags;
      const POST_TAGS = post_tag_string.split(',');

      const stuff = {
        title: POST_TITLE,
        author: POST_AUTHOR,
        time: POST_TIME,
        tags: POST_TAGS,
        text: POST_CONTENTS
      }

      const vue_app = new Vue({
        data: {
          title: POST_TITLE,
          author: POST_AUTHOR,
          time: POST_TIME,
          tags: POST_TAGS,
          text: POST_CONTENTS
        },
        template: POST_TEMPLATE
      });

      POST_RENDERER
        .renderToString(vue_app, {})
        .then(html => {
          res.send(html);
          return;
        })
        .catch(error => console.log(error));
    })
    .catch((error) => {
      console.log(error); 
    });
  
}

module.exports = {
  getPost: getPost,
}

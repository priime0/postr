const Vue = require('vue');
const vsr = require('vue-server-renderer');
const Pool = require('pg').Pool;
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
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
  const userauth = req.query.auth;
  if (userauth == undefined) {
    res.status(401).end("Auth required");
    return;
  }
  getUserIDFromUUID(userauth)
    .then(user_id => {
      pool
        .query('SELECT * FROM posts WHERE NOT author = $1', [user_id])
        .then(results => {
          const posts = results.rows;
          res.send(posts);
        })
        .catch(error => {
          console.log(error);
        });
    })
    .catch(error => {
      console.log(error);
    });
};

const getPost = (POST_ID) => {
  return new Promise((resolve, reject) => {
    getPostInfo(POST_ID)
      .then(post => {
        renderPostPage(post)
          .then(html => {
            resolve(html);
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
}

const getPostInfo = (POST_ID) => {
  return new Promise((resolve, reject) => {
    const POST_FILE = path.join(__dirname, `${POST_DIR}/${POST_ID}`);
    const POST_CONTENTS = fs.readFileSync(POST_FILE, 'utf-8');
    pool
      .query('SELECT * FROM posts WHERE id = $1', [POST_ID])
      .then((results) => {
        const post = results.rows[0];
        getUsernamesFromId(post.author)
          .then((author) => {
            resolve({
              "title": post.title,
              "author-name": author.name,
              "author-username": author.username,
              "time": post.time,
              "tags": post.tags.split(','),
              "text": POST_CONTENTS
            });
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
}

const renderPostPage = (post) => {
  return new Promise((resolve, reject) => {
    const vue_app = new Vue({
      data: post,
      template: POST_TEMPLATE
    });

    POST_RENDERER
      .renderToString(vue_app, {})
      .then(html => {
        resolve(html);
      })
      .catch(error => {
        reject(error);
      });
  });
}

const loginUser = (req, res) => {
  const { username, password } = req.body;
  checkUserLogin(username, password)
    .then(result => {
      res
        .status(200)
        .end(createNewUUID);
    })
    .catch(error => {
      res.send(error);
    });
}

const getUsernamesFromId = (id) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE id = $1', [id])
      .then(results => {
        resolve({
          'username': results.rows[0].username,
          'name': results.rows[0].name
        })
      })
      .catch(error => {
        reject(error);
      });
  });
}

const getUserIDFromUUID = (auth) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE uuid = $1 LIMIT 1', [auth])
      .then(results => {
        resolve(results.rows[0].id);
      })
      .catch(error => {
        reject(error);
      });
  });
}

const checkUserLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(results => {
        const info = results.rows[0];
        if (password === info.password) {
          resolve("Correct password");
        }
        else {
          reject("Incorrect password");
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

const createNewUUID = () => {
  return uuidv4();
}

module.exports = {
  getPost: getPost,
  getFeed: getFeed,
  getPostInfo: getPostInfo,
}

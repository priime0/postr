const Vue = require('vue');
const Pool = require('pg').Pool;
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const bcrypt = require('bcrypt');

const dblogin = require('./login.json');
const pool = new Pool(dblogin);

const salt_rounds = 10;

const getFeed = (userauth) => {
  return new Promise((resolve, reject) => {
    getUserIDFromUUID(userauth)
      .then(user_id => {
        getPostsExcludingUser(user_id)
          .then(posts => {
            resolve(posts);
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPost = (POST_ID, auth) => {
  return new Promise((resolve, reject) => {
    getPostIfViewable(POST_ID)
      .then(result => {
        if (result.publicity === 'public') {
          resolve(result.post);
        }
        else {
          getPrivatePostIfViewable(result.post, auth)
            .then(result_json => {
              resolve(result_json);
            })
            .catch(error => {
              reject(error);
            });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPostComments = (POST_ID, auth) => {
  return new Promise((resolve, reject) => {
    getPostIfViewable(POST_ID)
      .then(result => {
        if (result.publicity === 'public') {
          queryPostComments(POST_ID)
            .then(comments => {
              resolve(comments);
            })
            .catch(error => {
              reject(error);
            });
        }
        else {
          getFollowStatus(auth, POST.author_username)
            .then(follow_status => {
              if (follow_status === 'accept') {
                queryPostComments(POST_ID)
                  .then(comments => {
                    resolve(comments);
                  })
                  .catch(error => {
                    reject(error);
                  });
              }
              else {
                resolve({ "error": "not following post author" });
              }
            })
            .catch(error => {
              reject(error);
            });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPostLikes = (POST_ID) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM postlikes WHERE post = $1',
        [POST_ID])
      .then(results => {
        resolve(results.rows);
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPostIfViewable = (POST_ID) => {
  return new Promise((resolve, reject) => {
    getPostInfo(POST_ID)
      .then(post => {
        isUserPublic(post.author_username)
          .then(publicity => {
            resolve({ "publicity": publicity, "post": post });
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPrivatePostIfViewable = (POST, auth) => {
  return new Promise((resolve, reject) => {
    getFollowStatus(auth, POST.author_username)
      .then(follow_status => {
        if (follow_status === 'accept') {
          resolve(post);
        }
        else if (follow_status === 'wait') {
          resolve({ "error": "request awaiting" });
        }
        else if (follow_status === 'none') {
          resolve({ "error": "follow to view" });
        }
        else {
          resolve({ "error": "follow to view" });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const queryPostComments = (POST_ID) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM comments WHERE post = $1', [POST_ID])
      .then(results => {
        const comments = results.rows;
        let detailed_comments = comments.map(comment => {
          return getCommentDetailed(comment)
            .then(detailed_comment => {
              return detailed_comment;
            })
        });
        Promise.all(detailed_comments)
          .then(ret_comments => {
            resolve(ret_comments);
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getCommentDetailed = (comment) => {
  return new Promise((resolve, reject) => {
    const author_id = comment.author;
    getUsernamesFromId(author_id)
      .then(author => {
        resolve({
          "id": comment.id,
          "author_name": author.name,
          "author_username": author.username,
          "time": comment.time,
          "text": comment.text
        });
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPostInfo = (POST_ID) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM posts WHERE id = $1', [POST_ID])
      .then((results) => {
        const post = results.rows[0];
        getUsernamesFromId(post.author)
          .then((author) => {
            resolve({
              "id": post.id,
              "title": post.title,
              "author_name": author.name,
              "author_username": author.username,
              "time": post.time,
              "tags": post.tags.split(','),
              "text": post.text
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
};

const registerUser = (user_details) => {
  return new Promise((resolve, reject) => {
    verifyUserDetails(user_details)
      .then(a => {
        const { name, username, password, email, description, privacy } = user_details;
        encryptPassword(password)
          .then(hashed_password => {
            checkForExistingUser(username, email)
              .then(result => {
                if (result) {
                  const user = {
                    name,
                    username,
                    "password": hashed_password,
                    email,
                    description,
                    privacy
                  };
                  addUserToDatabase(user);
                  resolve({ "status": "success" });
                }
                else {
                  resolve({ "error": "user already exists" });
                }
              })
              .catch(error => {
                reject(error);
              });
          })
      })
      .catch(error => {
        resolve({ "error": error });
      });
  });
};

const verifyUserDetails = (user_details) => {
  return new Promise((resolve, reject) => {
    if (user_details.name === undefined || user_details.name.length < 3) {
      reject("name too short");
    }
    if (user_details.username === undefined || user_details.username.length < 3) {
      reject("username too short");
    }
    if (user_details.password === undefined || user_details.password.length < 6) {
      reject("password too short");
    }
    if (user_details.email === undefined || user_details.email.length < 3) {
      reject("email too short");
    }
    if (user_details.privacy != "public" && user_details.privacy != "private") {
      reject("invalid privacy");
    }
    else {
      resolve("valid");
    }
  });
};

const encryptPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, salt_rounds, (err, hash) => {
      if (err) {
        reject(err);
      }
      resolve(hash);
    });
  });
};

const checkForExistingUser = (username, email) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE username = $1 OR email = $2', 
        [username, email])
      .then(results => {
        if (results.rows.length == 0) {
          resolve(true);
        }
        else {
          resolve(false);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const addUserToDatabase = (user) => {
  createNewUUID()
    .then(user_uuid => {
      pool
        .query('INSERT INTO users (uuid, name, username, password, email, description, privacy) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [user_uuid, user.name, user.username, user.password, user.email, user.description, user.privacy]);
    })
    .catch(error => console.log(error));
};

const loginUser = (username, password) => {
  return new Promise((resolve, reject) => {
    checkUserLogin(username, password)
      .then(result => {
        createLoginToken(username)
          .then(login_token => {
            resolve({ "token": login_token });
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getPostsExcludingUser = (user_id) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM posts WHERE NOT author = $1 ORDER BY time ASC', [user_id])
      .then(results => {
        let posts = results.rows;
        let detailed_posts = posts.map(post => {
          return getPostInfo(post.id)
            .then(info => {
              return info;
            })
            .catch(error => {
              reject(error);
            });
        });
        Promise.all(detailed_posts)
          .then(results => {
            resolve(results);
          })
          .catch(error => {
            reject(error);
          });
      })
      .catch(error => {
        reject(error);
      });
  });
};

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
};

const getUserIDFromUUID = (auth) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE uuid = $1 LIMIT 1', [auth])
      .then(results => {
        if (results.rows.length === 0) {
          reject(404);
        }
        else {
          resolve(results.rows[0].id);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getUserIDFromUsername = (username) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(results => {
        if (results.rows.length != 0) {
          resolve(results.rows[0].id);
        }
        else {
          reject('User does not exist');
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const checkUserLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(results => {
        if (results.rows.length === 0) {
          reject("User non-existent");
        }
        else {
          const db_password = results.rows[0].password;
          bcrypt.compare(password, db_password, (err, result) => {
            if (err) {
              reject(err);
            }
            else if (result) {
              resolve("Correct password");
            }
            else {
              reject("Incorrect password");
            }
          });
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const isUserPublic = (username) => {
  return new Promise((resolve, reject) => {
    pool
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(results => {
        if (results.rows.length != 0) {
          resolve(results.rows[0].privacy);
        }
        else {
          reject("None");
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

const getFollowStatus = (first_auth, second_username) => {
  return new Promise((resolve, reject) => {
    getUserIDFromUUID(first_auth)
      .then(first_id => {
        getUserIDFromUsername(second_username)
          .then(second_id => {
            pool
              .query('SELECT * FROM follows WHERE follower = $1 AND followed = $2', 
                [first_id, second_id])
              .then(results => {
                if (results.rows.length != 0) {
                  resolve(results.rows[0].status);
                }
                else {
                  resolve('none');
                }
              })
              .catch(error => {
                reject(error);
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
};

const createLoginToken = (username) => {
  return new Promise((resolve, reject) => {
    createNewUUID()
      .then(id => {
        pool
         .query('UPDATE users SET uuid = $1 WHERE username = $2', [id, username])
         .then(results => {
           resolve(id);
         })
         .catch(error => {
           reject(error);
         });
      })
      .catch(error => {
        reject(error);
      });
    });
};

const createNewUUID = () => {
  return new Promise((resolve, reject) => {
    resolve(uuid.v4());
  });
};

module.exports = {
  getPost: getPost,
  getPostComments: getPostComments,
  getFeed: getFeed,
  getPostInfo: getPostInfo,
  loginUser: loginUser,
  registerUser: registerUser,
}

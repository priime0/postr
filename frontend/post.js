const BASE_URL = 'http://localhost:3000';

window.addEventListener('load', (event) => {
  let cookies = document.cookie;
  if (cookies === undefined || getCookie('auth') === undefined) {
    postDetails.loggedin = false;
    updatePost();
  }
  else {
    postDetails.loggedin = true;
    updatePost();
  }
});

Vue.component('detailed-post', {
  props: ['info'],
  template:
  `<div id="post-long"><h1>{{ info.title }}</h1>
   <h5 class="author">{{ info.author_name }} @{{ info.author_username }} {{ info.time }}</h5>
   <h5 class="tags"><span v-for="tag in info.tags">{{ tag }}</span></h5>
   <p>{{ info.text }}</p></div>`
});

Vue.component('post-comment', {
  props: ['comment'],
  template:
  `<div class="post-comment">
     <h5 class="author">{{ comment.author_name }} @{{ comment.author_username }} {{ comment.time }}</h5>
     <p>{{ comment.text }}</p>
   </div>`
});

const postDetails = new Vue({
  el: "#main",
  data: {
    loggedin: false,
    info: {
      "id": undefined,
      "title": "",
      "author_name": "",
      "author_username": "",
      "time": "",
      "tags": [],
      "text": "",
    },
    comments: []
  }
});


const updatePost = () => {
  const token = getCookie('auth');
  if (token === undefined) {
    fetchPost()
      .then(post => {
        if (post.error === undefined) {
          postDetails.info = post;
        }
        else {
          console.log(post.error);
        }
      })
      .catch(error => {
        console.log(error);
      });
    fetchPostComments()
      .then(comments => {
        if (comments.error === undefined) {
          postDetails.comments = comments;
        }
        else {
          console.log(comments.error);
        }
      })
      .catch(error => {
        console.log(error);
      });
  }
  else {
    fetchPostAuth(token)
      .then(post => {
        if (post.error === undefined) {
          postDetails.info = post;
        }
        else {
          console.log(post.error);
        }
      })
      .catch(error => {
        console.log(error);
      });
    fetchCommentsAuth(token)
      .then(comments => {
        if (comments.error === undefined) {
          postDetails.comments = comments;
        }
        else {
          console.log(comments.error);
        }
      })
      .catch(error => {
        console.log(error);
      });
  }
}

const fetchPostAuth = (token) => {
  const POST_ID = getPostId();
  const URL = `${BASE_URL}/api/post/${POST_ID}?auth=${token}`;
  return new Promise((resolve, reject) => {
    fetch(URL)
      .then(data => {
        data.json()
          .then(post => {
            resolve(post);
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

const fetchCommentsAuth = (token) => {
  const POST_ID = getPostId();
  const URL = `${BASE_URL}/api/postcomments/${POST_ID}?auth=${token}`;
  return new Promise((resolve, reject) => {
    fetch(URL)
      .then(data => {
        data.json()
          .then(comments => {
            console.log(comments);
            resolve(comments);
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

const fetchPost = () => {
  const POST_ID = getPostId();
  const URL = `${BASE_URL}/api/post/${POST_ID}`;
  return new Promise((resolve, reject) => {
    fetch(URL)
      .then(data => {
        data.json()
          .then(post => {
            resolve(post);
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

const fetchPostComments = () => {
  const POST_ID = getPostId();
  const URL = `${BASE_URL}/api/postcomments/${POST_ID}`;
  return new Promise((resolve, reject) => {
    fetch(URL)
      .then(data => {
        data.json()
          .then(comments => {
            resolve(comments);
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

const getPostId = () => {
  const full = window.location.pathname;
  const sections = full.split('/');
  return sections[sections.length - 1];
};

const getCookie = (name) => {
  let cookies = document.cookie.split(';');
  let value = undefined;
  for(let i = 0; i < cookies.length; i++) {
    const nameVal = cookies[i].trim();
    if (nameVal.indexOf(name) === 0) {
      value = nameVal.substring(name.length + 1);
    }
  }
  return value;
};

const setCookie = (name, value, days) => {
  let expires = "";
  const date = new Date();
  date.setTime(date.getTime() + days*24*60*60*1000);
  expires += `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}`;
};

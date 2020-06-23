const BASE_URL = 'http://localhost:3000';

window.addEventListener('load', (event) => {
  let cookies = document.cookie;
  if (cookies === undefined || getCookie('auth') === undefined) {
    postFeed.loggedin= false;
  }
  else {
    postFeed.loggedin = true;
    updateFeed();
  }
});

const postFeed = new Vue({
  el: '#posts',
  data: {
    loggedin: false,
    feed: []
  }
});

Vue.component('post', {
  props: ['info'],
  template: 
    `<div class="post">
       <h3 class="post-title">{{ info.title }}</h3>
       <h4 class="post-author">{{ info.author_name }} @{{ info.author_username }}</h4>
       <h4 class="post-time">{{ info.time }}</h4>
       <h5 class="post-tags" v-for="tag in info.tags">{{ tag }}</h5>
       <p class="post-text">{{ info.text.substring(0, 500) }}...</p>
       <a href="localhost:3000/post/{{ info.id }}">read more</a>
     </div>`
});

const updateFeed = () => {
  getCookie('auth')
    .then(uuid => {
      fetchFeed(uuid)
        .then(posts => {
          postFeed.feed = posts;
        })
        .catch(error => {
          console.log(error);
        });
    })
    .catch(error => {
      console.log(error);
    });
};

const fetchFeed = (uuid) => {
  const URL = `${BASE_URL}/api/feed?auth=${uuid}`;
  return new Promise((resolve, reject) => {
    fetch(URL)
      .then(data => {
        data.json()
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

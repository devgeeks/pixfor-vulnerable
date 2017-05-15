// Initialize app
var myApp = new Framework7({
  swipePanel: 'left',
  swipePanelActiveArea: '30',
  swipeBackPage: true,
  animateNavBackIcon: true,
});

var server = "http://take.pixfor.me:8080";
// var server = "http://localhost:3000";
// var server = "http://192.168.1.19:3000";

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

// Add view
var mainView = myApp.addView('.view-main', {
  // Because we want to use dynamic navbar, we need to enable it for this view:
  dynamicNavbar: true
});

var loginView = myApp.addView('.view-login', {
  //animatePages: false,
  domCache: true
});

function populateAlbums(albums) {
  $$('.albums').html('<ul></ul>');
  if (albums.length) {
    var l = albums.length;
    for (var i = 0; i < l; i++) {
      // This could be ripe for XSS in album.name
      // e.g.: album.name = '<span onclick=alert("XSS")>Album name<span>';
      $$('.albums ul').append('<li><a href="album.html?albumid=' +
        albums[i].id + '" data-album="' + albums[i].id +
        '" class="album-link item-link item-content">' +
        '<div class="item-inner"><div class="item-title">' +
        albums[i].name + '</div></div></a></li>');
    }
  }
  else {
    $$('.albums').html('<div class="content-block"><p>No albums. Add one?</p></div>');
  }
}

function loadPixGrid(albumid) {
  $$('.pix-grid').html('<div class="content-block">Loading thumbnails...</div>');
  $$.ajax({
    method: 'GET',
    url: server + '/pix',
    data: {
      albumid: albumid
    },
    success: function(resp) {
      var albumPix = JSON.parse(resp);
      var pix = albumPix.map(function(pic) {
        return { url: pic.pixdata, caption: pic.caption };
      });
      $$('.pix-grid').html('');
      if (pix.length === 0) {
        $$('.pix-grid').append('<div class="content-block">No pix found, add some?</div>');
      }
      else {
        var colCount = 0;
        pix.forEach(function(pic, index) {
          $$('.pix-grid').append(
            '<a class="pix-grid-item" href="#"><img data-img-id="' +
            index + '" alt="' + pic.caption + '" src="' + pic.url + '" /></a>'
          );
        });
        $$('.pix-grid-item').on('click', function(e) {
          var index = $$(e.target).attr('data-img-id');
          loadPix(albumid, index);
        });
      }
    },
    error: function(xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Pix error");
    }
  });
}

function fetchUserAlbums(username) {
  // 1. call /albums api with ?username=1
  // 2. populate a list with the returned albums
  // 3. If empty, prompt to make or join one (not implemented)
  // This is rife for a ` or 1=1; -- ` SQL injection
  console.log(username);
  var albums = [];

  $$('.albums').html('<div class="content-block">Loading albums...</div>');
  $$.ajax({
    method: 'GET',
    url: server + '/albums',
    data: {
      username: username
    },
    success: function(resp) {
      var albums = JSON.parse(resp);
      populateAlbums(albums);
    },
    error: function(xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Albums error");
    }
  });
}

function createAlbum(userId, albumName) {
  if (!albumName) {
    // throw an error
    myApp.alert("Album name must not be empty", "Album error");
  }
  else if(!userId) {
    // throw an error
    myApp.alert("Authentication error", "Album error");
  }
  else {
    // Use the geolocation plugin
    myApp.showPreloader("Creating album");
    navigator.geolocation.getCurrentPosition(function(position) {
      console.log(position);
      var location = '{latitude: ' + position.coords.latitude + ', longitude: ' + position.coords.longitude + '}';
      // create the album
      $$.ajax({
        method: 'POST',
        url: server + '/album',
        data: {
          userid: userId,
          albumname: albumName,
          location: location
        },
        success: function (resp) {
          var result = JSON.parse(resp);
          console.log(result);
          if (result.success) {
            // go back?
            // mainView.router.back();
            myApp.hidePreloader();
            mainView.router.load({
              url: 'album.html',
              reload: true,
              query: {
                albumid: result.id
              }
            });
          }
        },
        error: function (xhr) {
          console.log("Error on ajax call " + xhr);
          myApp.alert(xhr.responseText, "Album error");
        }

      });
    }, function(error) {
      myApp.alert(error, 'Geolocation Error');
    });
  }
}

function loadAlbum(albumId) {
  var album = {};

  $$.ajax({
    method: 'GET',
    url: server + '/album',
    data: {
      albumid: albumId
    },
    success: function(resp) {
      var album = JSON.parse(resp);
      populateAlbum(album);
    },
    error: function(xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Album error");
    }
  });
}

function populateAlbum(album) {
  console.log(album);
  $$('.album-name').append(album.name);
  $$('.browse-photos').attr('data-albumid', album.id);
}

// Use the camera plugin
function addPix() {
  navigator.camera.getPicture(function(pix) {
    // 1. Display the pix and ask for a caption
    previewPix(pix);
    // 2. On "save", post the pix to the api
  }, function(error) {
    console.error(error);
    myApp.alert(error, "Camera error");
  }, {
    sourceType: Camera.PictureSourceType.CAMERA,
    destinationType: Camera.DestinationType.DATA_URL,
    targetHeight: 414,
    targetWidth: 414
  });
}

function previewPix(pix) {
  $$('.pix').html('<img src="data:image/png;base64,' + pix + '" />');
}

function addPixToAlbum(albumid, pix, caption) {
  var userid = localStorage.getItem('userid');
  myApp.showPreloader("Posting Pix");
  $$.ajax({
    method: 'POST',
    url: server + '/pix',
    data: {
      userid: userid,
      albumid: albumid,
      pix: pix,
      caption: caption
    },
    success: function (resp) {
      var result = JSON.parse(resp);
      console.log(result);
      if (result.success) {
        // go back?
        myApp.hidePreloader();
        loadPixGrid(albumid);
        mainView.router.back();
      }
    },
    error: function (xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Album error");
    }

  });

}

function loadPix(albumid, index) {
  myApp.showPreloader('Fetching images');
  $$.ajax({
    method: 'GET',
    url: server + '/pix',
    data: {
      albumid: albumid
    },
    success: function(resp) {
      var albumPix = JSON.parse(resp);
      var pix = albumPix.map(function(pic) {
        return { url: pic.pixdata, caption: pic.caption };
      });
      myApp.hidePreloader();
      if (pix.length === 0) {
        myApp.alert("No pix found. Time to add some?", "Empty Album");
      }
      else {
        var albumPhotoBrowser = myApp.photoBrowser({
          photos : pix,
          type: 'popup',
          initialSlide: index || 0
        });
        albumPhotoBrowser.open();
      }
    },
    error: function(xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Pix error");
    }
  });
}

function auth(uname, pword) {
  var username = uname || $$('.login-form input[name=username]').val();
  var password = pword || $$('.login-form input[name=password]').val();

  if (!username || !password) {
    myApp.alert("Don't forget to fill in both username and password", "Auth error");
    return;
  }

  $$.ajax({
    method: 'POST',
    url: server + '/auth',
    data: {
      username: username,
      password: password
    },
    success: function (resp) {
      var result = JSON.parse(resp);
      console.log(result);
      if (result.success) {
        myApp.closeModal();
        fetchUserAlbums(result.username);
        localStorage.setItem('username', result.username);
        localStorage.setItem('userid', result.id);
      }
    },
    error: function (xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Auth error");
    }
  });
}

function logOut() {
  localStorage.clear();
  $$('.login-screen input').val('');
}

$$('.logout').on('click', function(e) {
  console.log('logout');
  logOut();
});

$$('.signin').on('click', function(e) {
  auth();
});

$$('.login-form').on('submit', function(e) {
  e.preventDefault();
  auth();
});

function register() {
  var username = $$('.register-form input[name=username]').val();
  var password = $$('.register-form input[name=password]').val();

  if (!username || !password) {
    myApp.alert("Don't forget to fill in both username and password", "Auth error");
    return;
  }

  $$.ajax({
    method: 'POST',
    url: server + '/register',
    data: {
      username: username,
      password: password
    },
    success: function (resp) {
      console.log(resp);
      var result = JSON.parse(resp);
      if (result.success) {
        auth(username, password);
        //myApp.closeModal();
        //fetchUserAlbums(result.username);
      }
    },
    error: function (xhr) {
      console.log("Error on ajax call ", xhr);
      alert(xhr.responseText);
    }
  });
}

$$('.register').on('click', function(e) {
  register();
});

$$('.register-form').on('submit', function(e) {
  e.preventDefault();
  register();
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
  console.log("Device is ready!");
});

// Now we need to run the code that will be executed only for About page.

// Option 1. Using page callback for page (for "about" page in this case) (recommended way):
myApp.onPageInit('about', function (page) {
  // Do something here for "about" page
  //alert('About page, incoming...');
});
myApp.onPageInit('index', function (page) {
  // Do something here for "index" page
  var username = localStorage.getItem('username');
  fetchUserAlbums(username);
});
myApp.onPageBeforeAnimation('index', function (page) {
  // Do something here for "index" page
  var username = localStorage.getItem('username');
  fetchUserAlbums(username);
});
myApp.onPageInit('album', function (page) {
  // Do something here for "album" page
  loadAlbum(page.query.albumid);
  $$('.browse-photos').on('click', function(e) {
    //albumid = $$(e.target).attr('data-albumid');
    loadPix(page.query.albumid);
  });
  loadPixGrid(page.query.albumid);
  $$('.add-pix').attr('href', 'addphoto.html?albumid=' + page.query.albumid);
  $$('.add-pix').on('click', function(e) {
    addPix();
  });
});
myApp.onPageInit('addphoto', function (page) {
  // Do something here for "addphoto" page
  $$('.save-pix').on('click', function(e) {
    e.preventDefault();
    var pix = $$('.pix img').attr('src');
    var caption = $$('input[name=caption]').val();
    addPixToAlbum(page.query.albumid, pix, caption);
  });
});
myApp.onPageInit('createalbum', function(page) {
  $$('.savealbum').on('click', function(e) {
    e.preventDefault();
    var albumName = $$('input[name=albumname]').val();
    var userId = localStorage.getItem('userid');
    createAlbum(userId, albumName);
  });
});

//// Option 2. Using one 'pageInit' event handler for all pages:
//$$(document).on('pageInit', function (e) {
//// Get page data from event data
//var page = e.detail.page;

//if (page.name === 'about') {
//// Following code will be executed for page with data-page attribute equal to "about"
////myApp.alert('Here comes About page');
//}
//});

//// Option 2. Using live 'pageInit' event handlers for each page
//$$(document).on('pageInit', '.page[data-page="about"]', function (e) {
//// Following code will be executed for page with data-page attribute equal to "about"
////myApp.alert('Here comes About page');
//});

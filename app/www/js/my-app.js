// Initialize app
var myApp = new Framework7();

var server = "http://take.pixfor.me:3000";
//var server = "http://localhost:3000";

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
  if (albums.length) {
    $$('.albums').append('<ul></ul>');
    var l = albums.length;
    for (var i = 0; i < l; i++) {
      // This could be ready for XSS in album.name
      $$('.albums ul').append('<li><a href="album.html?albumid=' + albums[i].id
          + '" data-album="' + albums[i].id
          + '" class="album-link item-link item-content">'
          + '<div class="item-inner"><div class="item-title">'
          + albums[i].name + '</div></div></a></li>');
    }
  }
}

function loadUsersAlbums(username) {
  // 1. call /albums api with ?username=1
  // 2. populate a list with the returned albums
  // 3. If empty, prompt to make or join one (not implemented)
  // This is rife for a ` or 1=1; -- ` SQL injection
  var albums = [];

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

function loadAlbum(albumid) {
  var album = {};

  $$.ajax({
    method: 'GET',
    url: server + '/album',
    data: {
      albumid: albumid
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
  $$('.album-name').append(album.name);
  $$('.browse-photos').attr('data-albumid', album.id);
}

function loadPix(albumid) {
  $$.ajax({
    method: 'GET',
    url: server + '/pix',
    data: {
      albumid: albumid
    },
    success: function(resp) {
      var albumPix = JSON.parse(resp);
      var pix = albumPix.map(function(pic) {
        return pic.pixdata;
      });
      var albumPhotoBrowser = myApp.photoBrowser({
        photos : pix
      });
      albumPhotoBrowser.open();
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
        loadUsersAlbums(result.username);
      }
    },
    error: function (xhr) {
      console.log("Error on ajax call " + xhr);
      myApp.alert(xhr.responseText, "Auth error");
    }
  });
}

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
        //loadUsersAlbums(result.username);
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

myApp.onPageInit('album', function (page) {
  loadAlbum(page.query.albumid);
  $$('.browse-photos').on('click', function(e) {
    //albumid = $$(e.target).attr('data-albumid');
    loadPix(page.query.albumid);
  });
});

// Now we need to run the code that will be executed only for About page.

// Option 1. Using page callback for page (for "about" page in this case) (recommended way):
myApp.onPageInit('about', function (page) {
  // Do something here for "about" page
  //alert('About page, incoming...');
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

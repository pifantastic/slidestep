var express = require('express'),
    markdown = require('node-markdown').Markdown,
    fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    io = require('socket.io')
    password = 'lollercopter',
    app = express.createServer();

function ucwords(str) {
  return (str + '').replace('-', ' ').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
    return $1.toUpperCase();
  });
}

app.configure( function(){
  app.set( 'views', __dirname + '/views' )
  app.set( 'view engine', 'jade' )
  app.use( express.bodyParser() )
  app.use( express.methodOverride() )
  app.use( express.static( __dirname + '/presentations' ) )
  app.use( app.router )
});

var presos = fs.readdirSync( __dirname + '/presentations' ).filter(function(dir) {
  return dir !== 'public';
});

app.get('/', function(req, res) {
  res.render( 'index', { title: 'slidestep!', presos: presos, ucwords: ucwords });  
});

app.get(/^\/([\w-]+)/, function(req, res) {
  // Make sure the requested presentation exists.
  var presentation = './presentations/' + req.params[0];
  if (path.existsSync(presentation)) {
    // Parse the slides.
    var slides = '';

    // Jade.
    if (path.existsSync(presentation + '/preso.jade')) {
      slides = jade.render(fs.readFileSync(presentation + '/preso.jade', 'utf8')); 

    // Markdown.
    } else if (path.existsSync(presentation + '/preso.md')) {
      var html = markdown(fs.readFileSync(presentation + '/preso.md', 'utf8'));
      html.split('<h1>').filter(Boolean).forEach(function(str, i) {
        slides += '<div class="slide"><h1>' + str + '</div>';
      });
      
    // Html.
    } else if (path.existsSync(presentation + '/preso.html')) {
      slides = fs.readFileSync(presentation + '/preso.md', 'utf8'); 
    }
    
    // Render the presentation.
    res.render( 'preso', { title: 'slidestep!', name: req.params[0], slides: slides });
  } else {
    res.render( 'index', { title: 'slidestep!', presos: presos, ucwords: ucwords });
  }
});

app.listen(3000);

var socket = io.listen(app);

socket.on('connection', function(client) {
  // Listen to messages from clients.
  client.on('message', function(data) {
    switch (data.action) {
      // A user is trying to upgrade to Presenter.
      case 'upgrade':
        if (data.password === password) {
          client._isPresenter = true;
          client.send({ action: 'upgrade' });
        }
        break;
      // User no longer wants to present.
      case 'downgrade':
        client._isPresenter = false;
        client.send({ action: 'downgrade' });
        break;
      // A user is changing slides.
      case 'move':
        if (client._isPresenter) {
          for (sid in socket.clients) {
            var user = socket.clients[sid];
            if (user._presentation === client._presentation && sid !== client.sessionId) {
              user.send({ action: 'move', slide: data.slide });
            }
          }
        }
        break;
      // A user is joining a presentation.
      case 'join':
        client._presentation = data.presentation;
        break;
    }
  });
});

console.log('slidestep listening on port 3000');

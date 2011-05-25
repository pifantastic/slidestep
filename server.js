var express = require('express'),
    findit = require('findit'),
    markdown = require('node-markdown').Markdown,
    fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    io = require('socket.io')
    password = 'lollercopter';

var app = express.createServer();

app.configure( function(){
  app.set( 'views', __dirname + '/views' )
  app.set( 'view engine', 'jade' )
  app.use( express.bodyParser() )
  app.use( express.methodOverride() )
  app.use( app.router )
  app.use( express.static( __dirname + '/presentations' ) )
})

app.get(/^\/([^public]+)/, function(req, res) {
  // Make sure the requested presentation exists.
  var presentation = './presentations/' + req.params[0];
  if (path.existsSync(presentation)) {
    // Parse the slides.
    var slides = [];
    fs.readdirSync(presentation).forEach(function(file, i) {
      if (file.match(/\.md$/)) {
        slides.push({
          content: markdown(fs.readFileSync(presentation + '/' + file, 'utf8'))
        }); 
      }
    });
    // Render the presentation.
    res.render( 'preso', { title: 'slidestep!', name: req.params[0], slides: slides });
  } else {
    res.render( 'index', { title: 'slidestep!' });
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

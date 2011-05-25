$(function() {
  
  var socket = new io.Socket();
  socket.connect();
  var presenting = false;
  
  // Connect to the slidestep server.  Let the server know
  // which presentation we are viewing.
  socket.on('connect', function() {
    socket.send({ action: 'join', presentation: document.location.pathname.substring(1) });
  });
  
  // Listen for messages from the slidestep server.
  socket.on('message', function(data) {
    switch (data.action) {
      // Change the current slide if the user is 'Following'
      // the presenter.
      case 'move':
        if ($('#follow input').is(':checked'))
          $('#slides').presentation('navigate', data.slide);
        break;
      // Upgrade this user to someone who can control slides.
      case 'upgrade':
        $('#password').hide();
        $('#relinquish').show();
        presenting = true;
        break;
    }
  });
  
  // Convert the slides into a proper presentation.
  $('#slides').presentation({
		slide: '.slide',
		prevText: 'Previous',
		nextText: 'Next',
		transition: "fade",
		navigate:$.noop,
		slides:false,
		pager: true,
		prevNext: true,
		navigate: function(e, ui) {
		  if (presenting)
		    socket.send({ action: 'move', slide: ui.presentation.count });
		}
  });
  
  $('#password').keydown(function(e) {
    if (e.keyCode === 13) {
      socket.send({ action: 'upgrade', password: $(this).val() });
      $(this).val('');
    }
  });
  
  $('#relinquish').click(function() {
    $(this).hide();
    $('#password').show();
    presenting = false;
    socket.send({ action: 'downgrade' });
  });
});

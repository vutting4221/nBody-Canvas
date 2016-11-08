
$( document ).ready(function() {
    setCanvasSize();    /* Set canvas dimensions when page HTML loads */
	load('canvas');
	setControlButtons();
	setControlElements();
});


/* Dynamically adjust the size of the canvas based on the browser screen 
*/
function setCanvasSize(x,y) { 

	if (!autoCanvasSize && x === undefined) {		// If auto-resizing is turned off... exit function.
		return;
	}

	var paddingHorizontal = 30;
	var paddingVertical = 60;

	// Get variable values
	//	var controlButtonsHeight = $('#controlButtons').height();
	var windowWidth;
	var windowHeight;

	if (x !== undefined) {
		windowWidth = x;
	} else {
		windowWidth = $(window).width();
	}

	if (y !== undefined) {
		windowHeight = y;
	} else {
		windowHeight = $(window).height();
	}


	//	if (!controlButtonsHeight) {
		controlButtonsHeight = 34;  // If JQuery cannot get the footer height on page load, set a fixed height here
	//	}

	// Calculate
	var canvasWidth = windowWidth - paddingHorizontal;
	var canvasHeight = windowHeight - controlButtonsHeight - paddingVertical;

	log("canvasHeight: " + canvasHeight + " - windowHeight: " + windowHeight + " - controlButtonsHeight: " + controlButtonsHeight + " - paddingVertical: " + paddingVertical);

	// Meet Mins & Maxs
	if (canvasWidth < minCanvasWidth) {
		canvasWidth = minCanvasWidth;
	}
	if (canvasHeight < minCanvasHeight) {
		canvasHeight = minCanvasHeight;
	}

	if (squareResize) {					// Set in nBody.js
		canvasWidth = canvasHeight;			// Set to a square based on the canvas height.
	}

	// Set Global Simulator Variables
	canvas_height = canvasHeight;
	canvas_width  = canvasWidth;

	//	$("#canvas").width(canvasWidth).height(canvasHeight);      // Reset DIV container containing Canvas -- WARNING: Stretches content
    $("#canvas").attr({ width: canvasWidth, height: canvasHeight });		// This works without stretching content
}
// Rather than reset each time the window changes size, call setCanvasSize() on canvas reset()
// $( window ).resize(function(){ setCanvasSize(); });   	// Reset canvas dimensions when the window resizes


/* Hides Pause, Displays Play Button */
function resetPlayButton() {
	$('#pause').hide();
	$('#play').show();
}

/* Reduce the number of buttons on the screen to only ones that are needed:
   When the simulation is in motion, there is no need for a play button. Likewise, when it is stopped, no need for a pause. */
function setControlButtons() { 
	// Control Button Behavior
	$('#play').bind("click", function() {
		$('#pause').show();
		$(this).hide();
		$('#pause').focus();
		start();
	});
	$('#play').hide();
	$('#pause').bind("click", function() {
		$('#play').show();
		$(this).hide();
		$('#play').focus();
		stop();
		printTable();
	});
	$('#step').bind("click", function() {
	  resetPlayButton();
	  onestep();
	  printTable();
	});
	$('#reset').bind("click", function() {
	  resetPlayButton();
	  setCanvasSize();	
	  set_sim_variables();
	  reset();
	  printTable();
	});

	// Bootstrap Buttons
	// $('.btn').button();   // Enable buttons via JavaScript
}

/* Set most of the sim controls */
function setControlElements() {

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-speed" ).slider({
			range: "min",
			value: 30,
			min: 1,
			max: 60,
			slide: function( event, ui ) {
				var speed = ui.value;
				if (speed == 1) {
					$( "#simSpeed" ).val("Slowest");		// Min speed
				}
				else if (speed == 60) {
					$( "#simSpeed" ).val("Fastest");		// Max speed
				}
				else {
					$( "#simSpeed" ).val(speed);		// Default behavior: display a number for speed
				}
				set_step_time(Math.abs(61-speed));		// Need to send in the opposite of the value because we're actually setting a timeout.
			}
		});
	});

	$("#simSpeed").val("30");

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-resolution" ).slider({
			range: "min",
			value: 100,
			min: 1,
			max: 200,
			slide: function( event, ui ) {
				var value = ui.value;
				if (value == 1) {
					$( "#simResolution" ).val("Coarse");		// Min
				}
				else if (value == 200) {
					$( "#simResolution" ).val("Fine");	// Max
				}
				else {
					$( "#simResolution" ).val(value);		// Need to send in the opposite of the value
				}
				set_delta_t(Math.abs(201-value));
			}
		});
	});

	$("#simResolution").val("100");

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-friction" ).slider({
			range: "max",
			value: 100,
			min: 80,
			max: 100,
			slide: function( event, ui ) {
				var value = ui.value;
				if (value == 80) {
					$( "#simFriction" ).val("Thick");	// Min
				}
				else if (value == 100) {
					$( "#simFriction" ).val("None");	// Max
				}
				else {
					$( "#simFriction" ).val(value/100);		// Default behavior
				}
				set_friction(value/100);
			}
		});
	});

	$("#simFriction").val("None");

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-grav" ).slider({
			range: "min",
			value: 667384,
			min: 100000,
			max: 1000000,
			slide: function( event, ui ) {
				var value = ui.value;
				var computedValue = value / 100000;

				if (computedValue == 1.0) {
					$( "#simGrav" ).val("Weak");		// Min
				}
				else if (computedValue == 10.0) {
					$( "#simGrav" ).val("Strong");		// Max
				}
				else {
					$( "#simGrav" ).val( computedValue + "e-11");		// Default: 6.67384e-11  m3 / (kg s2)
				}
				set_grav(computedValue * Math.pow(10, -11));
			}
		});
	});

	$("#simGrav").val("6.67384" + "e-11");

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-canvasSize" ).slider({
			range: "min",
			value: get_canvas_width(),
			min: 300,
			max: 1400,
			slide: function( event, ui ) {
				var x_size = ui.value;
				$( "#simCanvasSize" ).val(x_size);
				setCanvasSize(x_size, x_size);		// Square the canvas

				if (g_running) {				// Stop the simulation
					stop();
				}

				if (autoCanvasSize) {			// Turn off auto-resize to false
					autoCanvasSize = false;
				}
			}
		});
	});

	$("#simCanvasSize").val("Auto");

	// -------------------------------------------------------------
	$(function() {
		$( "#slider-bodySize" ).slider({
			range: "min",
			value: 5.0,
			min: 1.0,
			max: 15.0,
			slide: function( event, ui ) {
				var computedValue = ui.value;
				$( "#simBodySize" ).val(computedValue);

				if (computedValue == 1.0) {
					$( "#simBodySize" ).val("Small");		// Min
				}
				else if (computedValue == 15.0) {
					$( "#simBodySize" ).val("Large");		// Max
				}
				else {
					$( "#simBodySize" ).val( computedValue );		// Default: 6.67384e-11  m3 / (kg s2)
				}
				set_body_minimum_size(computedValue);
			}
		});
	});

	$("#simBodySize").val("Default");

	// -------------------------------------------------------------


	$(function() {		// Activate JQuery UI Buttons
		$( "#radioBoundary" ).buttonset();
		$( "#radioTrails" ).buttonset();
		$( "#radioGrid" ).buttonset();
		$( "#radioCollisions" ).buttonset();
		$( "#radioBodySize" ).buttonset();
		$( "#radioBarycenters" ).buttonset();
		$( "#radioReverseGravity" ).buttonset();
		$( "#radioNightMode" ).buttonset();

	 	$( "#menuScenarios" ).menu();
	 	$( "#menuScenarios2" ).menu();
	 	$( "#menuScenarios3" ).menu();
	});

}

// Set dark theme for page
function setNight() {
	set_canvas_background("#000000");							// Set Canvas to black
	$("body").css("color", "#bbbbbb");							// Set Font to gray
	$("body").css("background-color", "#222222");				// Set Body to charcoal
	$(".panel").css("background-color", "#555555");				// Set Panel to lighter charcoal
	$(".panel-heading").css("background-color", "#cccccc");		// Set Panel Header
	$(".colorTD").css("color", "#222222");						// Set color field to charcoal
	$("tbody tr:nth-child(odd)").css("color", "#222222");		// Set alternating color field to charcoal
}

// Set light theme for page
function setDay() {	
	set_canvas_background("#FFFFFF");							// Set Canvas
	$("body").css("color", "#000000");							// Set Font
	$("body").css("background-color", "#FFFFFF");				// Set Body
	$(".panel").css("background-color", "#FFFFFF");				// Set Panel
	$(".panel-heading").css("background-color", "#F5F5F5");		// Set Panel Header
	$(".colorTD").css("color", "#000000");						// Set color field
}

// Print an HTML table list with the nBodies and their attributes
function printTable() {

	$("#nbodyTableBody").empty();   // Remove all child nodes of the set of matched elements from the DOM.

	for(var i=0; i < bodies.length; i++) {

	  var body = bodies[i];

	  $("#nbodyTableBody").loadTemplate($("#nbodyTemplate"),
	    {
	       id: i+1, 
	       color: "", // body.color,
	       position: "(" + numberWithCommas(body.x.toFixed(2)) +  ", " + numberWithCommas(body.y.toFixed(2)) +  ")",
	       velocity: "(" + body.vx.toFixed(2) + ", " + body.vy.toFixed(2) + ")",
	       mass: body.mass.toPrecision(3),
	       radius: numberWithCommas(Math.floor(body.radius)),
	       distance_traveled: numberWithCommas(body.distance_traveled.toFixed(2)),
	       modifyEdit:   "<button type='button' class='btn btn-default btn-md' onclick='launchModal("+i+")'><span class='glyphicon glyphicon-pencil'></span></button>",
	       modifyDelete: "<button type='button' class='btn btn-default btn-md' onclick='remove_body("+i+"); printTable();'><span class='glyphicon glyphicon-remove-circle'></span></button>"
	    }, 
	    {append: true});

	  $("#unsetColor").css('background-color', body.highlight_color);
	  $("#unsetColor").removeAttr('id');

	}
}

// Source: http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// Create & Close JQuery UI Modal
  $( "#dialog-confirm" ).dialog({ modal: true });
  $( "#dialog-confirm" ).dialog( "close" );

// JS to launch Modal to edit bodies
function launchModal(body_id) {

	var body = get_body(body_id);

	var resumeOnClose = false;

	// Read in values from object...
	$("#bodyMass").val( body.get_mass() );
	$("#bodyPosX").val( body.get_xPos().toFixed(2) );
	$("#bodyPosY").val( body.get_yPos().toFixed(2) );
	$("#bodyVelX").val( body.get_xVel().toFixed(2) );
	$("#bodyVelY").val( body.get_yVel().toFixed(2) );

	$("#modalBodyBox").css('border-color', body.get_color() );
	$("#modalBodyBox").css('background-color', body.get_highlight_color() );

	if (g_running) {
		stop();   // Pause Simulation, if it's running
		var resumeOnClose = true;
	}

	// Overwrite Modal
	$( "#dialog-confirm" ).dialog({   // Launch JQuery UI Dialog
	resizable: true,
	modal: true,
	width: 500,
	// close: start,   // On close, call start() & continue simulation
	buttons: {

	  "Delete Body": function() {
	  	remove_body(body_id);
	  	$( this ).dialog( "close" );
	  	if (resumeOnClose) { start(); }
	  },

	  "Save": function() {
		body.set_mass( $("#bodyMass").val() );
		body.set_position( $("#bodyPosX").val(), $("#bodyPosY").val() );
		body.set_velocity( $("#bodyVelX").val(), $("#bodyVelY").val() );
	    $( this ).dialog( "close" );

	    printTable();	// Refresh table of values
	  	if (resumeOnClose) { start(); }
	  },
	  Cancel: function() {
	    $( this ).dialog( "close" );
	    if (resumeOnClose) { start(); }
	  }
	}
	});
}

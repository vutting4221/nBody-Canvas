
/* nBody Simulation v.1.27
/  Original by Simran Gleason, http://www.art.net/~simran/
/  Redesign by Vlad Tchompalov - Jan 10, 2012 / Updated: Dec 21, 2012 / Updated: May 11th 2014
/
/ Known issues: 
/ - Forces between bodies are applied instantly in this simulator. In reality, gravity moves at the speed of light - so forces would not apply until gravity waves from one nBody reach another. 
/ - Also, 64-bit floating point calculations in Javascript limit the accuracy of force and velocity vector calculations. On the plus side, it's fast.
/ - An accurate gravity model should have at least 3-dimensions. This one is intentionally simplified.
*/

var g_running = false;
var nb_canvas;						// Canvas Element - HTML5's element for programmable bitmap graphics

var context;						// Context Object - used to render to the canvas
var canvas_width;           //  = 600.;  // Now loaded from HTML
var canvas_height;          // = 600.;  // Now loaded from HTML
var canvas_origin_x;				// Center x-coordinate of Canvas
var canvas_origin_y;				// Center y-coordinate of Canvas
var bg_color = "#FFFFFF";			// Background Color set to WHITE

var autoCanvasSize = true;    // Resize canvas automatically with window?
var squareResize = true;      // Always set the canvas to a square? (Sets y-coordinate to x-coordinate's value)
var minCanvasWidth = 160;     // Minimum auto-resize values
var minCanvasHeight = 90;

// Javascript Arrays
var bodies = [];					// All bodies in the system: body[position(x,y), mass, velocity(vx,vy), color]
var forces = [];					// Parallel array, holds the active horizontal and vertical forces pulling on each body (per tick) - these are combined w/ the velocity on the prior tick

var nticks = 0;						// Time: Measured in ticks. Each tick redraws the canvas.
var mass_min;	// kg				// Smallest body mass in system
var mass_max;	// kg				// Largest body mass in system
var trails = 0.2;					// Default: Short trails (0.2) / (Long Trails = 0.02 / No Trails = -1)

var BOUNDARY_TYPE_NONE = 0;					// no boundary
var BOUNDARY_TYPE_BOUNCE = 1;				// bounce body at boundary 
var BOUNDARY_TYPE_TORUS = 2;				// invert body position at boundary
var boundary = BOUNDARY_TYPE_BOUNCE;

var delta_t = 100; 							// Default: Fine time steps (units?)
var G = 6.67384E-11; 	// m^3/(kg s^2)		// Gravitational Constant
var g_step_time = 30;	// ms				// Milliseconds between each frame refresh. (1= Max CPU) / Default: 60
var TWO_PI = Math.PI * 2;
var DEGREES_TO_RADIANS = Math.PI / 180.

var universe_radius = 50000;	// km		// Range of system -- Space for bodies to move, be sure to scale body sizes // default = 50000

var scaleX;                     // scale = (universe_radius / (canvas_width / 2)) => 50,000/300 => 166.67
var scaleY;                    // vertical scale
var scale;                    // (scaleX + scaleY) / 2

var scaleX_reciprocal;            // inverse of the vertical scale
var scaleY_reciprocal;           // inverse of the vertical scale
var scale_reciprocal;           // (scaleX_reciprocal + scaleY_reciprocal) / 2

var body_minimum_size = 5.0;				// Minimum size of a body / Default: 7.0 (~7 pixel radius @ 50,000 Universe Radius) -- Smaller = fewer collisions
var friction = 1.0;							// Friction (1.0 = No friction, 0.88 = Sticky) / Default: 1.0

var COLLISIONS_OFF = 0;						// no collisions
var COLLISIONS_MERGE = 1;					// collisions will merge bodies' mass & vectors
var COLLISIONS_BOUNCE = 2;					// collisions will bounce bodies
var collisions = COLLISIONS_BOUNCE;

var reverse_gravity = false;				// Reverse gravity (bodies repel) / Default: false
var current_world;							// Keeps track of the last world loaded into memory
var draw_grid = false;						// Draw a grid / Default: false
var grid_scale = 15;						// Distance between grid lines / Default: 15
var highlight_factor = 2.0;					// Inner color of the body / 1.0 = Original Color, 2.0 = 50% washed out, etc...
var draw_gradient_effect = false; 			// Adds a spherical look to the bodies (requires more CPU when enabled)
var draw_velocity_vector = false;			// Adds a velocity vector to each moving body
var draw_barycenters = false;				// Adds a barycenter between each body to show center of mass

var logging = false; 						// Detailed logging / Default: false // Disabled to optimize performance

var mousing = false;						// Global Flag for mouse interaction with the canvas
var dragging_body = null;					// Keeps track of a body that has been clicked on
var fling_points = [];						// Used to track mouse movements when mouse-throwing a body

var calculate_distance_traveled = true;  // Calculate distance between cordinates every tick? (expensive!!)


/*-- Sample Worlds -------------------------------------------------------------------
/    [x_coordinate, y_coordinate, mass, horizontal_velocity, vertical_velocity, color]  
*/
var g_worlds_json = {
    'justin1' : [
              [ 30000,  40000,  1.0E14, 0, 0, "#6B79B0"],		// Small Body
              [-40000,      0,  5.0E14, 0, 0, "#A15FCD"],		// Medium Body
              [ 30000, -40000, 25.0E14, 0, 0, "#CC4400"]		// Big Body
              ],
    'justin2' : [
              [ 30000,  40000,  1.0E14, 0, 0, "#6B79B0"],		// Small Body
              [-40000,      0, 25.0E14, 0, 0, "#A15FCD"],		// Big Body
              [ 30000, -40000,  5.0E14, 0, 0, "#CC4400"]		// Medium Body
              ],
    'justin3' : [
              [ 30000,  40000, 25.0E14, 0, 0, "#6B79B0"],		// Big Body
              [-40000,      0,  1.0E14, 0, 0, "#A15FCD"],		// Small Body
              [ 30000, -40000,  5.0E14, 0, 0, "#CC4400"]		// Medium Body
              ],
    'asteroids' : [
              [ 30000,      0, 1.2E14, 0, 0, "#6B79B0"],
              [ -5000,  30000, 3.6E14, 0, 0, "#8FBECC"],
              [-40000,  -5000, 1.8E14, 0, 0, "#A15FCD"],
              [  5000, -30000, 2.4E14, 0, 0, "#CC4400"]
              ],
    'one_moon' : [
              [    0,     0, 6.2E16, -0.1,   0.1, "#6273C4"],	// Larger Planet
              [16000, 16000, 6.2E14, 10.2, -10.2, "#9E9E9E"]	// Smaller Moon, with orbital acceleration
              ],
    'two_moons' : [
              [    0,     0, 6.2E16, -0.1,   0.1, "#6273C4"], // Larger Planet
              [16000, 16000, 6.2E14, 10.2, -10.2, "#9E9E9E"]  // Smaller Moon, with orbital acceleration
              [16000, 16000, 6.2E14, 10.2, -10.2, "#9E9E9E"]  // Smaller Moon, with orbital acceleration
              ],
    'binary_stars' : [
              [-5000, -5000, 6.2E14, -1,  1, "#6B79B0"],
              [ 5000,  5000, 6.2E14,  1, -1, "#8FBECC"]
              ],
	'fourbit' : [
              [ 10000,      0, 4.2E14,  0, -2, "#6B79B0"],
              [     0,  10000, 4.2E14,  2,  0, "#8FBECC"],
              [-10000,      0, 4.2E14,  0,  2, "#A15FCD"],
              [     0, -10000, 4.2E14, -2,  0, "#CC4400"]
                 ],
    'ringworld' : [
			   [28000,   0, 6.2E14, 2.87,  90, "#6B79B0", "polar"],
			   [28000,  30, 6.2E14, 2.87, 120, "#6B79B0", "polar"],
			   [28000,  60, 6.2E14, 2.87, 150, "#6B79B0", "polar"],
			   [28000,  90, 6.2E14, 2.87, 180, "#8FBECC", "polar"],
			   [28000, 120, 6.2E14, 2.87, 210, "#8FBECC", "polar"],
			   [28000, 150, 6.2E14, 2.87, 240, "#8FBECC", "polar"],
			   [28000, 180, 6.2E14, 2.87, 270, "#A15FCD", "polar"],
			   [28000, 210, 6.2E14, 2.87, 300, "#A15FCD", "polar"],
			   [28000, 240, 6.2E14, 2.87, 330, "#A15FCD", "polar"],
			   [28000, 270, 6.2E14, 2.87, 360, "#9E9E9E", "polar"],
			   [28000, 300, 6.2E14, 2.87, 390, "#9E9E9E", "polar"],
			   [28000, 330, 6.2E14, 2.87, 420, "#9E9E9E", "polar"],
                 ],
    'big_crunch' : [
			   [    0,   0, 4.3E15,       0,   0, "#333333"],					// dense black body
			   [32000,   0, 6.2E14, Math.PI,  90, "#CCA527", "polar"],
			   [32000,  30, 6.2E14, Math.PI, 120, "#A6701F", "polar"],
			   [32000,  60, 6.2E14, Math.PI, 150, "#805618", "polar"],
			   [32000,  90, 6.2E14, Math.PI, 180, "#569126", "polar"],
			   [32000, 120, 6.2E14, Math.PI, 210, "#6DB830", "polar"],
			   [32000, 150, 6.2E14, Math.PI, 240, "#84DE3A", "polar"],
			   [32000, 180, 6.2E14, Math.PI, 270, "#545F8A", "polar"],
			   [32000, 210, 6.2E14, Math.PI, 300, "#6B79B0", "polar"],
			   [32000, 240, 6.2E14, Math.PI, 330, "#8393D6", "polar"],
			   [32000, 270, 6.2E14, Math.PI, 360, "#A15FCD", "polar"],
			   [32000, 300, 6.2E14, Math.PI, 390, "#824CA6", "polar"],
			   [32000, 330, 6.2E14, Math.PI, 420, "#643B80", "polar"],
                 ]//,
/* Set Minimum World Size = 0.1, Universe Radius = 100,0000
	'solar_system' : [ 
			   [      0,  0, 1.98E15, -0.01, 0.03, "#fbe461"],	// Sun			Mass: 1.98E30
			   [ 3870*3,  0, 3.30E11, 0, -3.3, "#bd9965"],		// Mercury		Mass: 3.30E23		Mean orbital velocity:	47.9 km/s		Mean distance from Sun:	0.387 AU = 5.79E7 km
			   [ 7230*3,  0, 4.87E12, 0, -2.5, "#f7c93c"],		// Venus		Mass: 4.87E24		Mean orbital velocity:	35.0 km/s		Mean distance from Sun:	0.723 AU = 1.08E8 km
			   [10000*3,  0, 5.98E12, 0, -2.1, "#98b1c6"],		// Earth		Mass: 5.98E24		Mean orbital velocity:	29.8 km/s		Mean distance from Sun:	1.000 AU = 1.50E8 km
			   [15240*3,  0, 6.42E11, 0, -1.7, "#f76f1d"],		// Mars			Mass: 6.42E23		Mean orbital velocity:	24.1 km/s		Mean distance from Sun:	1.524 AU = 2.28E8 km
			   [52030*3,  0, 1.90E13, 0, -0.9, "#c79a72"],		// Jupiter		Mass: 1.90E27		Mean orbital velocity:	13.1 km/s		Mean distance from Sun:	5.203 AU = 7.78E8 km
			   [95290*3,  0, 5.69E13, 0, -0.7, "#ffe3a9"],		// Saturn		Mass: 5.69E26		Mean orbital velocity:	9.6 km/s		Mean distance from Sun:	9.529 AU = 1.43E9 km
			   [191900*3, 0, 8.70E12, 0, -0.5, "#9ebed4"],		// Uranus		Mass: 8.70E25		Mean orbital velocity:	6.8 km/s		Mean distance from Sun:	19.19 AU = 2.87E9 km
			   [300600*3, 0, 1.03E13, 0, -0.4, "#596e9c"],		// Neptune		Mass: 1.03E26		Mean orbital velocity:	5.4 km/s		Mean distance from Sun:	30.06 AU = 4.50E9 km
			  ],
*/
/* Set Minimum World Size = 1.0, Universe Radius = 500,000
			    F = G mM / r^2, where
				F = gravitational force between the earth and the moon,
				G = Universal gravitational constant = 6.67 x 10^(-11) Nm^2/(kg)^2,
				m = mass of the moon = 7.36 × 10^(22) kg
				M = mass of the earth = 5.9742 × 10^(24) and
				r = distance between the earth and the moon = 384,402 km

				F = 6.67 x 10^(-11) * (7.36 × 10^(22) * 5.9742 × 10^(24) / (384,402 )^2 
				  = 1.985 x 10^(26) N
    'earth_moon' : [
              [0, 0, 5.97E16, 0, 0, "#6273C4"],	// Earth: 5.97 x 10^24 kg
              [?, 0, 7.35E14, ?, ?, "#9E9E9E"]		// Moon: 7.347 x 10^22 kg / 356,400 km to 406,700 km from Earth / Orbital Velocity 1.023 km/s
              ],
 */
};

/* -- Set Simulation Variables - 
*/
function set_sim_variables() {
  log("Setting Simulation Variables...");
  canvas_origin_x = canvas_width / 2.;              // Center points of canvas used for scale and drawing bodies
  canvas_origin_y = canvas_height / 2.;

  log("canvas_width: " + canvas_width + " - canvas_height: " + canvas_height);
  log("canvas_origin_x: " + canvas_origin_x + " - canvas_origin_y: " + canvas_origin_y);

  scaleX = universe_radius / canvas_origin_x;              // Get the horizontal scale = the Universe Size / CanvasSizeX/2
  scaleX_reciprocal = canvas_origin_x / universe_radius;   // Inverse of the horizontal scale

  scaleY = universe_radius / canvas_origin_y;               // Get the vertical scale = the Universe Size / CanvasSizeY/2
  scaleY_reciprocal = canvas_origin_y / universe_radius;    // Inverse of the vertical scale

  scale = (scaleX+scaleY/2);                                    // Split the size of the scales
  scale_reciprocal = (scaleX_reciprocal+scaleY_reciprocal)/2;   // Split the size of the reciprocals

  log("scale: " + scale + " - scale_reciprocal: " + scale_reciprocal);

  body_min_radius = body_minimum_size * scale;      // multiply the scale by the minimum body size
}

/* -- Called once at start of program to set things up... ------------------------------------------- 
*/
function load(canvasID) {
  log("Welcome to the nBody Simulator. Starting up...");
  nb_canvas = document.getElementById(canvasID);					// The draw function gets the canvas element,
  context = nb_canvas.getContext("2d");										// then obtains the 2d context.
  
  // Add event listeners for mouse movements
  nb_canvas.addEventListener('mousedown', on_mousedown, false);   // Call on_mousedown() on mouse click
  nb_canvas.addEventListener('mouseup', on_mouseup, false);
  nb_canvas.addEventListener('mousemove', on_mousemove, false);
  nb_canvas.addEventListener('mouseout', on_mouseout, false);
  
  set_sim_variables();

  random_world();		// Create a random world & load it into memory...
  nticks = 0;			// Set time interval to zero...
  start();			// Go!
}

/* Simple logger
*/
function log(msg) {
	if (logging) {				// If logging is enabled...
		console.log(msg);		// Output to Javascript console
	}
}

/* Read and load the selected simulation
*/
function read_world(world_name) {
    clear();											// Clear data, clear background...
    var world_json = g_worlds_json[world_name];			// Load system...
	current_world = world_name;
    unpack_bodies(world_json);
    draw_bodies();

    printTable();   // Warning: TIED TO HTML
}

/* Generate a random world with a random number of bodies, each with random position, mass, velocity and color.
*/
function random_world() {	
	var numWorlds = random_range(5,20);		// Number of random bodies to generate...	
	var randomWorld = [];

	for (var i = 0; i < numWorlds; i++ ) {		// Populate the Universe...
		randomWorld.push([
			random_range(-48000, 48000),		// xPos
			random_range(-48000, 48000),		// yPos
			random_range(1.0E14, 1.0E15),		// mass
			random_range(-30, 30)*0.1,			// xVel
			random_range(-30, 30)*0.1,			// yVel
			random_color()
		]);
    }
	g_worlds_json.random = randomWorld;			// Load into JSON struct (overwrite old random world if necessary)	
	read_world("random");						// Go!
}

/* Generate a random world with a random number of bodies, each with random position, mass and color but STATIC velocity.
 * TODO: recycle this code into the old function...
*/
function random_static_world() {	
	var numWorlds = random_range(5,20);		// Number of random bodies to generate...	
	var randomWorld = [];

	for (var i = 0; i < numWorlds; i++ ) {		// Populate the Universe...
		randomWorld.push([
			random_range(-48000, 48000),		// xPos
			random_range(-48000, 48000),		// yPos
			random_range(1.0E14, 1.0E15),		// mass
			0,									// static xVel
			0,									// static yVel
			random_color()
		]);
    }
	g_worlds_json.randomstatic = randomWorld;		// Load into JSON struct (overwrite old random world if necessary)	
	read_world("randomstatic");						// Go!
}

/* Generate a world in a grid-style with static velocity.
*/
function grid_world() {	
	var num_border_worlds = 6;		// Worlds along each 1/2 edge of grid
	var margins = 2000;				// Buffer between grid and edge of simulation
	var distance_between_worlds = (universe_radius - margins) / num_border_worlds;
	var matrixWorld = [];

	for (var i = (-1 * num_border_worlds + 1); i < num_border_worlds; i++ ) {		// Populate the Universe along x-axis...
		for (var j = (-1 * num_border_worlds + 1); j < num_border_worlds; j++ ) {		// Populate the Universe along y-axis...
			matrixWorld.push([
				i*distance_between_worlds,		// xPos
				j*distance_between_worlds,		// yPos
				1.0E14,							// static mass - random may be interesting
				0,								// static xVel
				0,								// static yVel
				random_color()
			]);
		}
    }
	g_worlds_json.matrix = matrixWorld;			// Load into JSON struct (overwrite old random world if necessary)	
	read_world("matrix");						// Go!
}

function unpack_bodies(json_struct) {		// json_struct: [ [x, y, mass, vx, vy, color], ... ]
    var x = 0;			// Indexes current x-coordinate
    var y = 1;			// Indexes current y-coordinate
    var mass = 2;		// Indexes mass in kg
    var vx = 3;			// Indexes horizontal speed of the body
    var vy = 4;			// Indexes vertical speed of the body
    var color = 5;		// Indexes Color
    var polar = 6;			// Polar uses degrees for positioning objects around a circle, rather than precise x,y coordinates -- ditto for setting velocity

    var r = 0;				// radius
    var theta = 1;			// Indexes Polar Degrees
    var vr = 3;				// Indexes Polar Velocity
    var vtheta = 4;			// Indexes Polar Velocity Degrees
    
    mass_min = -1;		// Will store smallest mass in the system
    mass_max = 0;		// Will store largest mass in the system
	
    for(var i=0; i < json_struct.length; i++) {			// Iterate through world list & load each body
        var body_spec = json_struct[i];
		log("Unpacking body spec[" + (i+1) + " / " + json_struct.length + "]: [" + body_spec + "]");

		var position;		// Stored as (x,y) finite coordinates for the body center
		var velocity;		// Stored as (x-speed, y-speed), when the two are merged, they give a direction for movement

        if (body_spec.length > 6 && body_spec[polar] == 'polar') {		// Polar
            position = new Vector(0, 0);
            position.set_polar(body_spec[r], body_spec[theta]);
            velocity = new Vector(0, 0);
            velocity.set_polar(body_spec[vr], body_spec[vtheta]);
        } else {
            position = new Vector(body_spec[x], body_spec[y]);			// Position loaded with (x,y) coordinates
            velocity = new Vector(body_spec[vx], body_spec[vy]);		// Velocity loaded with speed values
        }
        var body = new Body(position, velocity, body_spec[mass]);
        body.color = body_spec[color];
		body.highlight_color = derive_highlight_color(body.color);		// This is a hexadecimal value holding the color
        add_body(body);
		
        if (mass_min == -1 || body.mass < mass_min) {				// Keep track of smallest body
            mass_min = body.mass;
        }
        if (body.mass > mass_max) {									// Keep track of biggest body
            mass_max = body.mass;
        }
        log("unpacked[" + i + "] P:(" + body.x + ", " + body.y + ") V: (" + body.vx + ", " + body.vy + ")");
    }
    
    /* This is scales-up the size of the bodies in the system.
	// 
	// reset the bodies' radii as a second pass, now that we know the min & max masses.
    //
    // 1. find the density that makes the smallest-mass body the right size
    //    for the body_min_radius (in world coordinates)
    //       density = V/m; V = dm
    //       V = 4/3 PI r^3
    //       dm = 4/3 PI r^3
    //     The density coefficient:
    //       d =  4/3 PI (body_min_radius)^3/mass_min,
    //
    //     But we can pre-compute much of that:
    //       r = cuberoot((3/4)* d * mass/PI), or r = cuberoot(d' * mass)
    //       where
    //         d' = (3d/4PI) = (body_min_radius)^3/mass_min
    //       
	*/
    body_density_coefficient = body_min_radius * body_min_radius * body_min_radius / mass_min;	// ?  - body_density_coefficient undeclared
    for(var i=0; i < bodies.length; i++) {
        bodies[i].reset_size();
    }
}

function add_body(body) {
    bodies.push(body);					// Push body into bodies[]
    forces.push(new Vector(0, 0));		// Push parallel vector into forces[] - this will store this body's forces
}

/* Draws a body (as a circle) on the canvas
*/
function draw_body(body) {
	var centerX = body.x * scaleX_reciprocal + canvas_origin_x;
	var centerY = -body.y * scaleY_reciprocal + canvas_origin_y;
	var sradius = body.radius * scale_reciprocal;
	context.beginPath();												// The context object is used to render to the canvas
	context.arc(centerX, centerY, sradius, 0, TWO_PI, false);			// context.arc(centerX, centerY, radius, startAngle, endAngle, clockwise);
	context.closePath();

	if (body.highlighted > 0) {					// Highlight this body for <body.highlighted> ticks
		context.fillStyle = body.color;
		context.fill();							// Fill body with a solid color
		body.highlighted--;
	} else {									// Otherwise, draw a normal body outline	
		if (draw_gradient_effect) {
		var gradient = context.createRadialGradient(		// Args: x1,y1,r1,x2,y2,r2 -- (two circles)
			centerX, centerY, sradius, 
			centerX-sradius/2, centerY-sradius/2, 0);
		gradient.addColorStop(0.0, body.color);
		gradient.addColorStop(1.0, body.highlight_color);
		context.fillStyle = gradient;
		} else {
			context.fillStyle = body.highlight_color;		// Normal fill w/ highlight color
		}
		context.fill();	
		context.strokeStyle = body.color;
		context.stroke();
	}
	if (draw_velocity_vector) {
		var line_coeffecient = 4;
		context.beginPath();
		context.moveTo(centerX, centerY);
		context.lineTo(centerX + line_coeffecient * body.vx, centerY - line_coeffecient * body.vy);
		context.stroke();
	}
	context.closePath();
}

/* Iterates over each body to each other body once. Calls draw_barycenter function to connect them. */
function draw_all_barycenters() {
	for(var i=0; i < bodies.length; i++) {
		for(var j=(i+1); j < bodies.length; j++) {
			draw_barycenter(bodies[i], bodies[j]);
		}
	}
}

/* Draws a line connecting one body to another, with a point indicating the center of mass 
 * TODO: make this function more efficient... maybe with making centerX1 points part of body to reduce computing...
*/
function draw_barycenter(body1, body2) {
	var centerX1 = body1.x * scaleX_reciprocal + canvas_origin_x;
	var centerY1 = -body1.y * scaleY_reciprocal + canvas_origin_y;
	var centerX2 = body2.x * scaleX_reciprocal + canvas_origin_x;
	var centerY2 = -body2.y * scaleY_reciprocal + canvas_origin_y;

	var combined_mass = body1.mass + body2.mass;
	var barycenterX = (centerX1*body1.mass/combined_mass + centerX2*body2.mass/combined_mass);
	var barycenterY = (centerY1*body1.mass/combined_mass + centerY2*body2.mass/combined_mass);
	
	// Draw line from body1 to barycenter
	context.strokeStyle = body1.highlight_color;
	context.beginPath();
	context.moveTo(centerX1, centerY1);	
	context.lineTo(barycenterX, barycenterY);	
	context.stroke();
	context.closePath();
	
	// Draw line from body2 to barycenter
	context.strokeStyle = body2.highlight_color;
	context.beginPath();
	context.moveTo(centerX2, centerY2);
	context.lineTo(barycenterX, barycenterY);
	context.stroke();
	context.closePath();
		
	/* Draw dot at barycenter 
	context.beginPath();
	context.arc(barycenterX, barycenterY, 2, 0, TWO_PI, false);		// context.arc(centerX, centerY, radius, startAngle, endAngle, clockwise);
	context.fillStyle = "#000";
	context.closePath();
	context.fill();	*/
}

function set_friction(val) {
    friction = val;
}

function set_step_time(st) {
    g_step_time = st;
}

function set_delta_t(val) {
    delta_t = val;
}

function set_boundary(type) {
    boundary = type;
}

function set_body_minimum_size(val) {
    body_minimum_size = val;
	body_min_radius = body_minimum_size * scale;
}

function set_collisions(val) {
    collisions = val;
}

function set_gridlines(val) {
	draw_grid = val;
}

function set_reverse_gravity(val) {
	reverse_gravity = val;
}

function set_trails(val) {
    trails = val;
}

function set_barycenters(val) {
	draw_barycenters = val;
}

function set_grav(val) {
  G = val;
}

/* -- Loop Functions ----------------------------------------------------------------- 
*/
function start() {					// Get things going at the standard tick rate
    if (g_running == false) {
		log("Starting...");
		g_running = true;
		nticks = 0;
		step_and_continue();
	}
}

function step_and_continue() {			// Tick every <g_step_time> ms
    if (g_running) {
		tick();
        window.setTimeout(step_and_continue, g_step_time);		// Schedule a timeout to rerun this function after this many milliseconds. 
    }
}

function stop() {					// Default stop
	log("Stopping...");
    g_running = false;
}

function reset() {					// New Reset: reload the entire system (versus resetting positions)
	stop();
	read_world(current_world);
    draw_bodies();
}

function onestep() {				// Stop, Advance one frame
    if (g_running) {
		g_running = false;
    }
	else {
		tick();
	}
}

function clear() {					// Blow everything away...
    bodies = [];
    forces = [];
    clear_canvas();
}

function clear_canvas() {
    context.fillStyle = bg_color;								// Set background color
    context.fillRect(0, 0, canvas_width, canvas_height);		// Fill the canvas with that color (fill at 100% opacity)
	if (draw_grid) {
		draw_gridlines();										// Draw the grid
		
		/* Maybe for future...
		context.font = "bold 12px Arial";
		context.fillStyle = "#000000";
		
		context.textBaseline = "top";
		context.textAlign = "left";
		context.fillText("(0,0)", 5, 5);
		
		context.textBaseline = "bottom";
		context.textAlign = "right";
		context.fillText("(600,600)", canvas_width-5, canvas_height-5);
		*/
	}
}

/* New Logic for trails, fade the old canvas incrementally. 
*/
function clear_canvas_for_trails(alpha) {
    var alpha_keep = context.globalAlpha;		// globalAlpha: 0 = no opacity / 1 = full opacity (default setting)
    context.globalAlpha = alpha;
    clear_canvas();								// Paint canvas with a mostly transparent fill (Alpha Trail Setting)
    context.globalAlpha = alpha_keep;			// Reset to old setting
}

/* Draws a grid on the canvas - Somewhat inefficient at high load. 
*/
function draw_gridlines() {

	var xMidPoint = Math.floor(canvas_width / 2 ) + 0.5;
	var yMidPoint = Math.floor(canvas_height / 2) + 0.5;

	// -- Draw Grid ------------------------------------\
	context.beginPath();
	context.strokeStyle = "#dddddd";

	var xStartPoint = xMidPoint % grid_scale;					// Each HTML5 lineTo() is actually drawn between points
	var yStartPoint = yMidPoint % grid_scale;

    for(var i=xStartPoint; i < canvas_width; i+=grid_scale) {		// Draw horizontal lines:
		context.moveTo(i, 0);											// Shift pen an increment left
		context.lineTo(i, canvas_height);								// Draw Up-Down
    }
	for(var j=yStartPoint; j < canvas_height; j+=grid_scale) {		// Draw vertical lines:
		context.moveTo(0, j);											// Shift pen an increment down
		context.lineTo(canvas_width, j);								// Draw L-R
    }
	context.closePath();
	context.stroke();												// Ink the above trace

	// -- Draw Axis ------------------------------------\
	context.beginPath();
	context.strokeStyle = "#999999";

    // Draw horizontal lines:
	context.moveTo(xMidPoint, 0);					// Shift pen an increment left
	context.lineTo(xMidPoint, canvas_height);		// Draw Up-Down
	// Draw vertical lines:
	context.moveTo(0, yMidPoint);					// Shift pen an increment down
	context.lineTo(canvas_width, yMidPoint);		// Draw L-R

	context.closePath();
	context.stroke();								// Ink the above trace

}

/* Each tick represents a clock cycle - calculate the forces between the bodies, redraw canvas (new frame). 
*/
function tick() {
    if (trails == 0) {							// No Trails...
        clear_canvas();	
    } else if (trails == -1) {					// Infinite Trails...
        // Don't clear anything
    } else {									// Short / Long Trails...
        clear_canvas_for_trails(trails);
    }
    
	log("-- Tick " + nticks + " --");
	for(var i=0; i < bodies.length; i++) {
		bodies[i].toString(i);					// Log each body's properties
	}
	
    for(var i=0; i < bodies.length; i++) {		// For each body...
        forces[i].zero();						// Reset corresponding forces for this calculation
    }
    for(var i=0; i < bodies.length; i++) {		// For each body...
        var body = bodies[i];
        update_body_forces(body, i);			// This is a nested loop, will calculate forces between remaining bodies
    }
    for(var i=0; i < bodies.length; i++) {		// For each body...
        var body = bodies[i];
        move_body(body, i);
        draw_body(body);
    }
	if (draw_barycenters) {
		draw_all_barycenters();
	}
	/* Need to update mouse-fling logic before enabling this... */
	if (mousing && dragging_body != null) {
		dragging_body.vx = 0;		// Makes for better mousing, as the body is not moving while selected
		dragging_body.vy = 0;
	}
    nticks++;						// Increment ticks
}

/* Cycle through all bodies in array and draw them */
function draw_bodies() {
    clear_canvas();
    for(var i=0; i < bodies.length; i++) {
        draw_body(bodies[i]);
    }
	if (draw_barycenters) {
		draw_all_barycenters();
	}
}

/* Take body1 and cycle through the array, calculating the remaining gravitational forces acting on it. 
/  The loop works sequentially, after one body has all its forces calculated, it is skipped for the remainder
/  of the loop, for efficiency.
*/
function update_body_forces(body1, i) {

    var g_body1_mass = G * body1.mass;		// (mass1 * G) -- Doing this outside the loop is more efficient
	var Pji = new Vector(0, 0);				// Sum position of this body against all other bodies, multiplied by gravitational force.

	/* This loop starts at (i+1) because forces for this body might have been calculated previously. We want to
	   avoid unnecessary calculations, so we'll only calculate the force between two bodies once. */

	for(var j=i+1; j < bodies.length; j++) {		// Cycle through the uncalculated forces between other bodies
        var body2 = bodies[j];
		
		/* F = G*Mi*Mj * u{Bj.pos - Bi.pos} (the pull from j to i)
        /      ----------------------------
        /                 r * r
        /   
		/	u{vec} is the unit vector, and r is |Bj - Bi|
		/
        /   We know: (V1-V2) == u{V1-V2} * {V1 - V2} so we can save a division by rewriting:
        /   		Fji = G MiMj (Bj.pos - Bi.pos) / r*r*r
		/ 
        /   Then the force is symmetric between i & j, so we have:
        /     F[i] += Fji
        /     F[j] -= Fji
        /   And then we only have to run the above equation n(n-1)/2 times.
        /   We do need to allocate a position difference vector for (Bj-Bi), 
		/		but we can re-use the same vector over & over.
		*/

        Pji.zero();							// Reset to (0,0) for current calculation
        Pji.x += body2.x - body1.x;			// Pji(0,0) = PositionBodyJ(x,y) - PositionBodyI(x,y)
		Pji.y += body2.y - body1.y;
        var r = Pji.magnitude();			// Distance btwn the bodies (hypotenuse): r = sqrt(x^2 + y^2)

        if (r <= (body1.radius + body2.radius)) {		// If r is smaller than their combined radii, they've collided - the inverse square law will be too big without collisions
			body1.highlighted = 1;						// Highlight the bodies to indicate a collision
			body2.highlighted = 1;
			if (collisions == COLLISIONS_MERGE) {
				handle_collision_merge_bodies(body1, body2);
			} 
			else if (collisions == COLLISIONS_BOUNCE) {
				handle_collision_bounce_bodies(body1, body2);
			}
        } else {
            var f = g_body1_mass * body2.mass / (r * r * r);		// Main Equation
            Pji.times_equals(f);
			if (reverse_gravity) {				// Reversed gravity - bodies repel each other
				forces[j].plus_equals(Pji);
				forces[i].minus_equals(Pji);
			} else {							// Normal gravity - bodies attract
				forces[i].plus_equals(Pji);
				forces[j].minus_equals(Pji);
			}
        }
    }
}

/* Update the body's position and velocity based on the current forces acting on it. 
*/
function move_body(body, i) {
    /*	V = dP/dt	(Velocity) = Position derived
	/	A = dV/dt	(Acceleration) = Velocity derived
	/	F = mA		(Force)
	/	
    /  A = F/m  (vector)
    /  V1 = V0 + A * delta_t :: V = V + F * (dt/m)
    /  P1 = P0 + V * delta_t
    /  Note that the body's mass and delta_t are known at body creation time, so we can store (1/m)*delta_t in the body.
	*/
  if (calculate_distance_traveled) {  // Don't take up extra memory unless this option is turned on
    var old_x = body.x;
    var old_y = body.y;
  }

	body.vx += forces[i].x * body.mass_reciprocal_dt;		// Add the forces acting on this body to its velocity -- Velocity(Vx, Vy) + (1/BodyMass)*(Fx, Fy)
	body.vy += forces[i].y * body.mass_reciprocal_dt;
	body.x += body.vx * delta_t;						// Add the distance moved to this body's position -- Poisition(x,y) + (Time_Change)*Velocity(Vx, Vy)
	body.y += body.vy * delta_t;
	body.vx *= friction;								// Multiply by the friction coefficient
	body.vy *= friction;

  if (calculate_distance_traveled) {
    body.distance_traveled += calculate_distance_between_coordinates(old_x, old_y, body.x, body.y); 
  }

  maybe_bounce(body);
}

/* If a body hits the edge of the simulation and boundries are turned on, bounce it back.
*/
function maybe_bounce(body) {
    if (boundary == BOUNDARY_TYPE_BOUNCE) {
        if (Math.abs(body.x) > universe_radius) {
            body.vx *= -1.;
        }
        if (Math.abs(body.y) > universe_radius) {
            body.vy *= -1.;
        }
    } else if (boundary == BOUNDARY_TYPE_TORUS) {
        if (Math.abs(body.x) > universe_radius) {
            body.x *= -1.;
        }
        if (Math.abs(body.y) > universe_radius) {
            body.y *= -1.;
        }
    }
}

/* New Collision Logic: Merge the velocities, color, mass & size of the bodies... 
*/
function handle_collision_merge_bodies(body1, body2) {
    log("Collision Detected... Merge!")
	
	var combined_mass = body1.mass + body2.mass;

	// Merge center positions proportionally based on mass
	body1.x = (body1.mass/combined_mass * body1.x + body2.mass/combined_mass * body2.x);
	body1.y = (body1.mass/combined_mass * body1.y + body2.mass/combined_mass * body2.y);
	
	/* Merge velocities, proportionally to their mass...
	/
	/	m1*v1 + m2*v2
	/	-------------
	/	   m1 + m2
	*/
	var new_velocity_x = (body1.mass * body1.vx + body2.mass * body2.vx) / combined_mass;
	var new_velocity_y = (body1.mass * body1.vy + body2.mass * body2.vy) / combined_mass;	
	body1.vx = new_velocity_x;
	body1.vy = new_velocity_y;
	
//	body1.velocity.times_equals(0.75);					// Account for 25% energy loss due to collision?

	if (body1.mass < body2.mass) {						// Merge colors: pick the bigger mass & go with that color
		body1.color = body2.color;						// Set new color
		body1.highlight_color = body2.highlight_color	// Set new highlight color
	}

	body1.mass = combined_mass;								// Set new mass	
	body1.mass_reciprocal_dt = (delta_t / combined_mass);	// Set new mass reciprocal
//  body1.distance_traveled = 0;              // Reset distance traveled?
	
	// Area Circle = pi*r^2
	// Radius of combined circles = sqrt(r_c1^2 + r_c2^2)
	
	body1.radius = Math.sqrt((body1.radius * body1.radius) + (body2.radius * body2.radius));	// Set new radius

	var indexJ = bodies.indexOf(body2);		// Find the array index of the second body
  remove_body(indexJ);                  // Remove this body and set of forces
	
	var indexI = bodies.indexOf(body1);		// Find the array index of the first body
	update_body_forces(body1, indexI);		// Update those forces - Better accuracy for first tick after collision
}

/* New Collision Logic: Bounce bodies in an elastic collision, 100% elasticity. Derived from doodle.js
*/
function handle_collision_bounce_bodies(body1, body2) {
    log("Collision Detected... Elastic Bounce!");
	
	var dx = body2.x - body1.x,
		dy = body2.y - body1.y,
		angle = Math.atan2(dy, dx),
		sin   = Math.sin(angle),
		cos   = Math.cos(angle),
		pos0 = {x:0, y:0},							// rotate body1's position
		pos1 = rotate(dx, dy, sin, cos, true),		// rotate body2's position
		vel0 = rotate(body1.vx, body1.vy, sin, cos, true),	// rotate body1's velocity
		vel1 = rotate(body2.vx, body2.vy, sin, cos, true),	// rotate body2's velocity
		vxTotal = vel0.x - vel1.x,
		absV,
		overlap,
		pos0F,
		pos1F,
		vel0F,
		vel1F;

	// collision reaction
	vel0.x = ((body1.mass - body2.mass) * vel0.x +
			2 * body2.mass * vel1.x) / (body1.mass + body2.mass);
	vel1.x = vxTotal + vel0.x;

	// update position - to avoid objects becoming stuck together at times
	absV = Math.abs(vel0.x) + Math.abs(vel1.x);
	overlap = (body1.radius + body2.radius) - Math.abs(pos0.x - pos1.x);
	
	// avoid divide by zero - this happens when bodies are created on top of each other
	if (absV == 0 || overlap == 0) {
		pos0.x += vel0.x;
		pos1.x += vel1.x;
	} else {
		pos0.x += vel0.x / absV * overlap;
		pos1.x += vel1.x / absV * overlap;
	}
	// rotate positions back
	pos0F = rotate(pos0.x, pos0.y, sin, cos, false);
	pos1F = rotate(pos1.x, pos1.y, sin, cos, false);

	// adjust positions to actual screen positions
	body2.x = body1.x + pos1F.x;
	body2.y = body1.y + pos1F.y;
	body1.x = body1.x + pos0F.x;
	body1.y = body1.y + pos0F.y;

	// rotate velocities back
	vel0F = rotate(vel0.x, vel0.y, sin, cos, false);
	vel1F = rotate(vel1.x, vel1.y, sin, cos, false);

	body1.vx = vel0F.x;
	body1.vy = vel0F.y;
	body2.vx = vel1F.x;
	body2.vy = vel1F.y;
}
  
// Derived from doodle.js
function rotate (x, y, sin, cos, reverse) {
	var result =  {};
	if (reverse) {
		result.x = x * cos + y * sin;
		result.y = y * cos - x * sin;
	} else {
		result.x = x * cos - y * sin;
		result.y = y * cos + x * sin;
	}
	return result;
}

/* Body class ------------------------------------------------------------------------
*/
function body_mass_to_size(body, mass) {
    var radius = Math.pow(body_density_coefficient * mass, (1.0/3.0));
    return radius;
}

function Body(pos, vel, mass) {
    this.color = "#000000";
    this.highlight_color = "#FFFFFF";
    this.x = pos.x;
  	this.y = pos.y;
    this.vx = vel.x;
    this.vy = vel.y;
    this.mass = mass;
    this.mass_reciprocal_dt = (delta_t / mass);
    this.radius = body_min_radius;
    this.original_spec = [pos.x, pos.y, vel.x, vel.y];
    this.highlighted = 0;
    this.distance_traveled = 0;   // Keep track of distance between start position and current (or final) position
}

Body.prototype.reset_size = function() {
    this.radius = body_mass_to_size(this, this.mass);
}
    
Body.prototype.reset = function() {					// This is the old way of resetting a system
    this.x = this.original_spec[0];
    this.y = this.original_spec[1];
    this.vx = this.original_spec[2];
    this.vy = this.original_spec[3];
}

Body.prototype.point_inside = function(point) {		// Used in mouse methods
    // TODO: use the actual distance.
    //     For now: within the bounding box...
    var dx = Math.abs(this.x - point.x);
    var dy = Math.abs(this.y - point.y);
    return (dx <= this.radius && dy <= this.radius);
}

Body.prototype.move_to_point = function(point) {	// Used in mouse methods
    this.x = point.x;
    this.y = point.y;
}

// NOTE: .toFixed(2) rounds to two decimal places -- expects a String in but browser JS engine should convert numeric value.
Body.prototype.toString = function(id) {							      // Examples:
    log("<Body " + id +												              // ---------
		" - Position: (" + this.x.toFixed(2) +  ", " + this.y.toFixed(2) +  ")" +			// Position: (-24853, -16046)
		" - Velocity: (" + this.vx.toFixed(2) + ", " + this.vy.toFixed(2) + ")" +			// Velocity: (0.36, 0.34)
		" - Mass: " + this.mass.toPrecision(2) +                // Mass: 1.240e+15
		" - Radius: " + Math.floor(this.radius) +					      // Radius: 3989
		" - Forces: " + forces[id].toString(0) +				  	    // Forces: (3477651065428, -3178667090207)
    " - Distance Traveled: " + this.distance_traveled.toFixed(4) +    // Distance Traveled: 10844.9805
		">");

	/* Sample Output:
	-- Tick 9 --
	<Body 0 - Position: (29999, 19996) - Velocity: (-0.00, -0.01) - Mass: 4.000e+15 - Radius: 3989 - Forces: (-4845794207, -34859486336)>
	<Body 1 - Position: (-39978, 5) - Velocity: (0.05, 0.01) - Mass: 1.000e+14 - Radius: 1166 - Forces: (5088214438, 1315249785)>
	<Body 2 - Position: (29999, -19925) - Velocity: (-0.00, 0.15) - Mass: 2.000e+14 - Radius: 1469 - Forces: (-242420233, 33544236550)>
	*/
}

Body.prototype.get_color = function() {
	return this.color;
}

Body.prototype.get_highlight_color = function() {
	return this.highlight_color;
}


Body.prototype.get_mass = function() {
    return this.mass;
}

Body.prototype.set_mass = function(newMass) {
	if (!isNumber(newMass) || newMass < 0) {
		return false;
	}

    this.mass = parseFloat(newMass);

    this.mass_reciprocal_dt = (delta_t / this.mass);
    this.radius = body_min_radius;
    this.reset_size();

    log("Set new value for mass: " + newMass);
    return true;
}


Body.prototype.get_xPos = function() {
    return this.x;
}

Body.prototype.get_yPos = function() {
    return this.y;
}

Body.prototype.set_position = function(newX, newY) {
	if (!isNumber(newX) || !isNumber(newY)) {
		return false;
	}
    this.x = parseFloat(newX);
  	this.y = parseFloat(newY);
  	log("Set new value for position: ("+newX+","+newY+")");
    return true;
}


Body.prototype.get_xVel = function() {
    return this.vx;
}

Body.prototype.get_yVel = function() {
    return this.vy;
}

Body.prototype.set_velocity = function(newVX, newVY) {
	if (!isNumber(newVX) || !isNumber(newVY)) {
		return false;
	}
    this.vx = parseFloat(newVX);
    this.vy = parseFloat(newVY);
    log("Set new value for velocity: ("+newVX+","+newVY+")");
    return true;
}


function get_body(id) {
	return bodies[id];
}

// Remove this body and set of forces
function remove_body(id) {
  log("Removing body id: " + id);

  // Redraw
  ghostBody = get_body(id);		// Get body to be removed
  ghostBody.color = bg_color;	// Set body color to background
  draw_body( ghostBody );		// Draw white circle around body

  // Remove
  bodies.splice(id, 1);        // Remove the body from the BODIES array
  forces.splice(id ,1)         // Remove the body's forces from the FORCES array (it's the same index)
}


/* Vector class ------------------------------------------------------------------------
*/
function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
}
    
Vector.prototype.set = function(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.set_to = function(vec) {
    this.x = vec.x;
    this.y = vec.y;
}

Vector.prototype.set_polar = function(r, theta_degrees) {
    var theta_radians = theta_degrees * DEGREES_TO_RADIANS;
    var x = r * Math.cos(theta_radians);
    var y = r * Math.sin(theta_radians);
    log("set_polar. r: " + r + " th: " + theta_degrees + " theta_rad: " + theta_radians + " x: " + x + " y: " + y);
    this.set(x, y);
}
       
Vector.prototype.plus_equals = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
}

Vector.prototype.plus_factor_equals = function(vec, factor) {	// this += V * factor;
    this.x += vec.x * factor;
    this.y += vec.y * factor;
    return this;
}

Vector.prototype.minus_equals = function(vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
}

Vector.prototype.times_equals = function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
}

Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vector.prototype.plus = function(vec) {
    return new Vector(this.x + vec.x, this.y + vec.y);
}

Vector.prototype.minus = function(vec) {
    return new Vector(this.x - vec.x, this.y - vec.y);
}

Vector.prototype.times = function(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
}

Vector.prototype.timesVector = function(vec) {
    return new Vector(this.x * vec.x, this.y * vec.y);
}

Vector.prototype.divide = function(scalar) {
	if (scalar != 0) {
		return new Vector(this.x / scalar, this.y / scalar);
	} else {
		return new Vector(this.x, this.y);		// Handle divide by zero
	}
}

Vector.prototype.toString = function(precision) {				// Formats the decimal output to fixed precision
    return "(" + this.x.toFixed(precision) + ", "
			   + this.y.toFixed(precision) + ")";				// Outputs: (x,y)
}

function derive_highlight_color(color) {						// Take an HTML color and derive its highlight based on <highlight_factor>

	/* This will take a 6-digit html color, such as "#FF22EE"
	/	1) Split the colors into R,G,B
	/	2) Parse the Hex values	
	/	3) Calculate highlight-range between color and white
	/	4) Divide that range by the highlight factor and scale back that much from white
	*/

	var colorString = color.toString();
//	log(colorString);  // Debugging
	
	var R = colorString.substr(1,2);
	var G = colorString.substr(3,2);
	var B = colorString.substr(5,2);
	
	var newHexR = 255-Math.floor((255-parseInt(R,16)) / highlight_factor);
	var newHexG = 255-Math.floor((255-parseInt(G,16)) / highlight_factor);
	var newHexB = 255-Math.floor((255-parseInt(B,16)) / highlight_factor);

//	log(("0" + (newHexR).toString(16)).slice(-2));  // Debugging
//	log(("0" + (newHexG).toString(16)).slice(-2));  // Debugging
//	log(("0" + (newHexB).toString(16)).slice(-2));  // Debugging
	
	return ("#" 
		+ ("0" + (newHexR).toString(16)).slice(-2)			// The "0" and slice pads the one-digit numbers with a leading zero
		+ ("0" + (newHexG).toString(16)).slice(-2)
		+ ("0" + (newHexB).toString(16)).slice(-2));
}

/* -- Mouse Event Handling ---------------------------------------------------- 

	Mouse tips: 
		- throw bodies while simulation is in motion,
		- pause to re-position bodies
		- Right-click > "View Image" / "Save Image As..." will take a screenshot
		
*/
function get_world_coordinates(ev) {
    var cx, cy;
    if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
        cy = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
        cy = ev.offsetY;
    }
    var wx = cx * scaleX - universe_radius;
    var wy = universe_radius - cy * scaleY;
    log("getWorld C: (" + cx + ", " + cy + ") ==> W:  (" + wx + ", " + wy + ")");
    return new Vector(wx, wy);
}

function on_mousedown(ev) {
	
	if (!g_running) {
		
	} 
//	else {
	    mousing = true;		// Otherwise, fling it.
	    var worldmouse = get_world_coordinates(ev);
	    for(var i=0; i < bodies.length; i++) {
	        var body = bodies[i];
	        if (body.point_inside(worldmouse)) {
	            body.highlighted = 10;
	            dragging_body = body;
	            if (g_running) {
	                cancel_fling();
	            } else {
	                draw_bodies();
	            	launchModal(i);		// Edit Body if simulation is paused -- Tightly coupled with View
	            }
	            return;
	        }
	    }
//    }
}

function on_mouseup(ev) {
    if (mousing && g_running) {
        fling_finish(dragging_body);
    }
    mousing = false;
    dragging_body = null;
}

function on_mouseout(ev) {
    mousing = false;
    dragging_body = null;
    cancel_fling();
}

function on_mousemove(ev) {
    if (mousing) {
        var worldmouse = get_world_coordinates(ev);
        if (dragging_body) {
            if (g_running) {								// If the simulation is running, mouse-throw the body...
                dragging_body.move_to_point(worldmouse);
                dragging_body.highlighted = 10;
                fling_drag(dragging_body, worldmouse);
            } else {										// If it is not, then simply move the body...
                dragging_body.move_to_point(worldmouse);
                dragging_body.highlighted = 10;
                draw_bodies();
            }
        }
    }
}

function fling_drag(body, worldpoint) {
    worldpoint.timestamp = new Date().getTime();
	if (fling_points.length > 10) {					// New: if array size is more than 10 coordinate points:
		fling_points.shift();						// Remove first element before adding another one on
	}
    fling_points.push(worldpoint);					// Add a new coordinate
}

function cancel_fling() {
    fling_points = [];
}

function fling_finish(body) {
    //
    // find the sum of the last n worldpoints (excluding the last two)
    //   (we can get the sum by just taking the vector from the first to
    //    last)
    // then use that to determine the new velocity of the body.
    //    Tworld        Treal
    //    ------   =   -------
    //    delta_t      g_step_time
    //
    //    Tworld = (Treal * delta_t) / g_step_time
    //    V = DragVector / Tworld;
    //
    var fling_window = 4;
    var fling_ignore = 2;
    if (fling_points.length < fling_window + fling_ignore) {
        return;
    }
    var interval_start = fling_points.length - fling_window - fling_ignore;
    var start_point = fling_points[interval_start];
    var interval_end = fling_points.length - fling_ignore - 1;
    var end_point = fling_points[interval_end];
    var interval_time_real = (end_point.timestamp - start_point.timestamp)/1000.0;  // seconds
    var drag_vector = end_point.minus_equals(start_point);
    var t_world = interval_time_real * delta_t / (g_step_time / 1000.);
    var dragVector = drag_vector.times_equals(1.0 / t_world);
	body.vx = dragVector.x;
	body.vy = dragVector.y;
    fling_points = [];
}

// -- Utility Methods -------------------------------------------------------

/* Calculate distance between two x & y coordinate points
   Note: Expensive function to call every tick but will keep track of how far bodies travel
*/
function calculate_distance_between_coordinates(x1, y1, x2, y2) {

  // Formula: sqrt( (x2-x1)^2 + (y2-y1)^2 )
  // Src: http://www.mathwarehouse.com/algebra/distance_formula/index.php
  // Src: http://www.mathsisfun.com/algebra/distance-2-points.html
  
  var distance = Math.sqrt( 
      Math.pow((x2 - x1), 2) + 
      Math.pow((y2 - y1), 2)
      );

  return distance;
}

/* Returns a random value between this range... 
*/
function random_range(minVal,maxVal) {
  return Math.floor(minVal+(Math.random()*(maxVal-minVal)));
}

/* Returns a random HTML HEX color... http://stackoverflow.com/questions/1484506
*/
function random_color() {
  var letters = '0123456789ABCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.round(Math.random() * 15)];
  }
  return color;
}

function set_canvas_background(colorString) {
  if (colorString) {
    bg_color = colorString;
  }
}

function get_canvas_width() {
  return canvas_width;
}

// Source: http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
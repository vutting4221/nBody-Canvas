/** -- nBody Test Suite ---------------------------------------------------- 
*/

// -- Test the actual test suite -----------------------
test( "Test Suite", function() {
	ok( 1 == "1", "Test Suite online" );
	ok( 1 !== "1", "Test Suite online" );
	ok( 1 === parseInt("1"), "Test Suite online" );
});


// -- Test the Initialization functions ------------------------------
test( "Startup", function() {

	ok( bg_color == "#FFFFFF", "BG Color OK :)" );
	/*
	// Check defaults
	ok( totalPassengerFloors == 10, "totalPassengerFloors" );
	ok( numberOfHoistways == 2, "numberOfHoistways" );
	ok( cabsPerHoistway == 2, "cabsPerHoistway" );
	
	ok( nticks == 0, "nticks = zero" );
	ok( passengerCount == 0, "passengerCount = zero" );
	
	var floors = tower.getFloors();
	if (floors) {
		ok( floors.length == totalNumFloors, "Number of floors in array: " + floors.length + (" -> 1 bstm + 10 pass + 1 attic"));	
	}

	var hoistways = tower.getHoistways()
	if (hoistways) {
		ok( hoistways.length == numberOfHoistways, "Number of HWs in array: " + hoistways.length);	
	} // HWs	

	*/
});

// -- Test the Util functions ------------------------------
test( "Utility", function() {
	
	var one = calculate_distance_between_coordinates(0,0,1,0);
	ok( one == 1, "X: calculate_distance_between_coordinates 1 == " + one );

	var two = calculate_distance_between_coordinates(0,0,0,2);
	ok( two == 2, "Y: calculate_distance_between_coordinates 2 == " + two );

	var ten = calculate_distance_between_coordinates(0,6,8,0);
	ok( ten == 10, "HYPOTENUSE: calculate_distance_between_coordinates 1 == " + ten );

	var one = calculate_distance_between_coordinates(0,0,0.1,0);
	ok( one == 0.1, "DECIMAL: calculate_distance_between_coordinates 0.1 == " + one );

});
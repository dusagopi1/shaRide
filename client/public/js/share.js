// Check token before form submission
function checkToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html?error=auth_required';
    return false;
  }
  return true;
}

// Show confirmation dialog with rider details and accept/decline options
function showRiderConfirmationDialog(riderData) {
  const confirmationDialog = document.createElement('div');
  confirmationDialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
  confirmationDialog.id = 'rider-confirmation-dialog';
  
  // Get rider details from the updated data structure with detailed logging
  console.log('Rider data received (full object):', JSON.stringify(riderData, null, 2));
  
  // Extract username directly from the format we're receiving
  // Format: { rideId: '...', username: '...', userId: '...' }
  console.log('Processing rider data:', JSON.stringify(riderData, null, 2));
  
  // The username is directly in the root object
  let riderName = riderData.username || 'Anonymous Rider';
  console.log('Extracted rider name:', riderName);
  
  const riderId = riderData.rider?.userId || riderData.userId || null;
  const rideId = riderData.rideId;
  
  // Create the dialog content
  confirmationDialog.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <h2 class="text-xl font-bold mb-4 text-blue-800">Ride Request</h2>
      
      <div class="mb-4 bg-blue-50 p-3 rounded">
        <p class="font-semibold text-lg">${riderName} wants to join your ride!</p>
        <hr class="my-2 border-blue-200">
        <p><strong>From:</strong> ${riderData.rideDetails?.pickup || 'Your pickup location'}</p>
        <p><strong>To:</strong> ${riderData.rideDetails?.drop || 'Your destination'}</p>
      </div>
      
      <p class="mb-4">Would you like to accept this rider?</p>
      
      <div class="flex justify-between gap-4">
        <button id="decline-rider-btn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-1/2">
          Decline
        </button>
        <button id="accept-rider-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-1/2">
          Accept
        </button>
      </div>
    </div>
  `;
  
  // Add the dialog to the DOM
  document.body.appendChild(confirmationDialog);
  
  // Get status div for updates
  const statusDiv = document.getElementById('status');
  
  // Add event listeners to the buttons
  document.getElementById('accept-rider-btn').addEventListener('click', () => {
    // Get the ride ID and name from the rider data
    const rideId = riderData.rideId;
    // Use the riderName from the outer scope that was already determined
    
    // Save ALL available rider info to session storage including phone numbers
    // Get current user info for phone number
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const rideData = {
      rideId,
      riderName,  // This uses the correctly determined riderName from above
      driverName: currentUser.username,
      driverPhone: currentUser.phone || 'Not available',
      riderPhone: riderData.phone || 'Not available',
    };
    console.log('Saving complete ride data with phone numbers:', rideData);
    sessionStorage.setItem('currentRideData', JSON.stringify(rideData));
    
    // Remove the dialog
    confirmationDialog.remove();
    
    // Show loading state
    statusDiv.innerHTML = '<div class="bg-blue-100 text-blue-700 p-3 rounded"><i class="fas fa-spinner fa-spin mr-2"></i>Accepting rider... Please wait.</div>';
    statusDiv.classList.remove('hidden');
    
    // Emit ride-accepted event
    if (window.socket) {
      window.socket.emit('ride-accepted', { 
        rideId, 
        userId: riderId,
        driverAccepted: true,  // Flag to indicate driver accepted the request
        timestamp: new Date().toISOString()
      }, (response) => {
        console.log('Acceptance response from server:', response);
        
        if (response && response.success) {
          // Save complete ride details to session storage for the details page
          if (response.rideDetails) {
            console.log('Saving complete ride details to sessionStorage:', response.rideDetails);
            sessionStorage.setItem('currentRideData', JSON.stringify(response.rideDetails));
          }
          // Show success message before redirecting
          statusDiv.innerHTML = '<div class="text-green-500 p-3">Rider accepted! Redirecting to details page...</div>';
          
          // Redirect after a short delay with ride ID parameter
          setTimeout(() => {
            window.location.href = `/details.html?rideId=${rideId}`;
          }, 1500);
        } else {
          // Show error message
          statusDiv.innerHTML = `<div class="text-red-500 p-3">${response?.error || 'Failed to accept rider. Please try again.'}</div>`;
        }
      });
    } else {
      // Fallback if socket is not available
      statusDiv.innerHTML = '<div class="text-green-500 p-3">Rider accepted! Redirecting to details page...</div>';
      setTimeout(() => {
        window.location.href = '/details.html';
      }, 1500);
    }
  });
  
  document.getElementById('decline-rider-btn').addEventListener('click', () => {
    // Remove the dialog
    confirmationDialog.remove();
    
    // Show declined message
    statusDiv.innerHTML = '<div class="bg-yellow-100 text-yellow-700 p-3 rounded"><i class="fas fa-times-circle mr-2"></i>Rider declined. Waiting for other riders...</div>';
    statusDiv.classList.remove('hidden');
    
    // Emit ride-declined event
    if (window.socket) {
      window.socket.emit('ride-declined', { 
        rideId, 
        riderId, 
        driverDeclined: true  // Flag to indicate driver declined the request
      }, (response) => {
        // Log response
        console.log('Ride decline acknowledged:', response);
        
        // Reset status after some time
        setTimeout(() => {
          statusDiv.innerHTML = '<div class="text-blue-500 p-3">Your ride is still available for others to join.</div>';
        }, 3000);
      });
    } else {
      // Fallback if socket is not available
      setTimeout(() => {
        statusDiv.innerHTML = '<div class="text-blue-500 p-3">Your ride is still available for others to join.</div>';
      }, 3000);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkToken()) return;

  // Initialize the departure time field with current date/time + 30 minutes
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const dateTimeLocalString = now.toISOString().slice(0, 16);
  document.getElementById('departure-time').value = dateTimeLocalString;
  
  // Add stop button functionality
  const addStopBtn = document.getElementById('add-stop-btn');
  const stopsContainer = document.getElementById('stops-container');
  let stopCount = 0;
  
  addStopBtn.addEventListener('click', () => {
    const stopIndex = stopCount++;
    const stopDiv = document.createElement('div');
    stopDiv.className = 'mb-4 stop-input flex items-center';
    stopDiv.innerHTML = `
      <div class="flex-grow">
        <label for="stop-${stopIndex}" class="block text-gray-700 mb-2">Stop ${stopIndex + 1}</label>
        <input type="text" id="stop-${stopIndex}" name="stops[]" class="w-full p-2 border rounded" placeholder="Enter stop location">
      </div>
      <button type="button" class="remove-stop-btn ml-2 mt-6 text-red-500 hover:text-red-700">
        <i class="fas fa-times-circle"></i>
      </button>
    `;
    
    stopsContainer.appendChild(stopDiv);
    
    // Add remove functionality
    stopDiv.querySelector('.remove-stop-btn').addEventListener('click', () => {
      stopDiv.remove();
    });
  });
});

document.getElementById('ride-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get all form values
    const pickup = document.getElementById('pickup').value.trim();
    const drop = document.getElementById('drop').value.trim();
    const fare = document.getElementById('fare').value.trim();
    const departureTime = document.getElementById('departure-time').value;
    const vehicleInfo = document.getElementById('vehicle-info').value.trim();
    const availableSeats = document.getElementById('available-seats').value;
    
    // Get stops if any
    const stopInputs = document.querySelectorAll('input[name="stops[]"]');
    const stops = Array.from(stopInputs).map(input => input.value.trim()).filter(stop => stop);
  
    const submitButton = e.target.querySelector('button[type="submit"]');
    const statusDiv = document.getElementById('status');
  
    // Validate required inputs
    if (!pickup || !drop) {
      statusDiv.innerHTML = '<div class="bg-red-100 text-red-700 p-3 rounded">Please fill in pickup and drop locations</div>';
      statusDiv.classList.remove('hidden');
      return;
    }
  
    // Set loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating ride...';
    statusDiv.innerHTML = '<div class="bg-blue-100 text-blue-700 p-3 rounded">Creating your ride...</div>';
    statusDiv.classList.remove('hidden');
  
    try {
      // Create the ride
      if (!checkToken()) return;

      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pickup,
          drop,
          fare: fare || null,
          departureTime: departureTime || null,
          vehicleInfo: vehicleInfo || null,
          availableSeats: availableSeats || '1',
          stops: stops.length > 0 ? stops : null
        })
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ride');
      }
  
      // Ride created successfully
      statusDiv.textContent = 'Waiting for riders...';
      statusDiv.className = 'text-yellow-500';
  
      // Use centralized socket connection
      if (!window.socket?.connected) {
        statusDiv.textContent = 'Reconnecting to server...';
        initializeSocketConnection();
      }
      
      // Store the ride ID in a variable for comparison
      const currentRideId = data._id;
      console.log('Created ride with ID:', currentRideId);
      
      // Setup ride-specific listeners
      const rideUpdatedHandler = (updatedRide) => {
        console.log('Ride updated event received:', updatedRide);
        if (typeof updateRideDisplay === 'function') {
          updateRideDisplay(updatedRide);
        }
      };
      
      const rideJoinedHandler = (joinedData) => {
        console.log('Ride joined event received in share.js:', joinedData);
        
        // Make sure this notification is for our ride
        if (joinedData.rideId === currentRideId) {
          console.log('Match found! Updating UI for joined ride:', currentRideId);
          
          // Show a dialog with rider details and accept/decline options
          showRiderConfirmationDialog(joinedData);
        } else {
          console.log('Ignoring join for different ride. Current ride:', currentRideId, 'Joined ride:', joinedData.rideId);
        }
      };
      
      // Handle ride acceptance events
      const rideAcceptedHandler = (acceptData) => {
        console.log('Ride accepted event received:', acceptData);
        
        // Make sure this is for our ride
        if (acceptData.rideId === currentRideId) {
          // IMPORTANT: Save ALL ride data including phone numbers to session storage
          console.log('Saving complete ride data with phone numbers:', acceptData);
          sessionStorage.setItem('currentRideData', JSON.stringify({
            rideId: acceptData.rideId,
            driverName: acceptData.driverName || acceptData.driver,
            riderName: acceptData.riderName || acceptData.rider,
            driverPhone: acceptData.driverPhone || 'Not available',
            riderPhone: acceptData.riderPhone || 'Not available',
          }));
          
          // Update UI
          statusDiv.innerHTML = `
            <div class="text-green-500">
              <strong>${acceptData.username || 'A rider'}</strong> has accepted your ride!
              <p>Preparing to redirect to ride details...</p>
            </div>`;
          
          // Redirect after delay with ride ID parameter
          setTimeout(() => {
            window.location.href = `/details.html?rideId=${currentRideId}`;
          }, 2000);
          
          // Clean up event listeners to avoid duplicates
          window.socket.off('ride-joined', rideJoinedHandler);
          window.socket.off('ride-accepted', rideAcceptedHandler);
          window.socket.off('ride-declined', rideDeclinedHandler);
          window.socket.off('ride-updated', rideUpdatedHandler);
        }
      };
      
      // Handle ride declined events
      const rideDeclinedHandler = (declineData) => {
        console.log('Ride declined event received:', declineData);
        
        // Make sure this is for our ride
        if (declineData.rideId === currentRideId) {
          // Update UI
          statusDiv.innerHTML = `
            <div class="text-yellow-500">
              <strong>${declineData.username || 'A rider'}</strong> has declined your ride.
              <p>Waiting for other riders...</p>
            </div>`;
          
          // Reset status after some time
          setTimeout(() => {
            statusDiv.innerHTML = `
              <div class="text-blue-500">
                <p>Your ride is available for others to join.</p>
              </div>`;
          }, 3000);
        }
      };
      
      // Setup listeners with named handler functions so we can remove them later
      window.socket.on('ride-updated', rideUpdatedHandler);
      window.socket.on('ride-joined', rideJoinedHandler);
      window.socket.on('ride-accepted', rideAcceptedHandler);
      window.socket.on('ride-declined', rideDeclinedHandler);
  
      // Emit ride created event
      // Modified ride-created emission with acknowledgment
      window.socket.emit('ride-created', data._id, (response) => {
        if (response?.error) {
          console.error('Server error:', response.error);
          statusDiv.textContent = response.error;
          statusDiv.className = 'text-red-500';
        }
      });
    } catch (error) {
      console.error('Error creating ride:', error);
      statusDiv.textContent = error.message || 'Failed to create ride';
      statusDiv.className = 'text-red-500';
      submitButton.disabled = false;
    }
  });
  
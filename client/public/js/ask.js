const ridesList = document.getElementById('rides-list');
const loadingIndicator = document.getElementById('loading-indicator');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-location');
const refreshBtn = document.getElementById('refresh-btn');

// Store all rides to filter locally
let allRides = [];

// Click event delegation for the entire document
document.addEventListener('click', async (e) => {
  // Check if the clicked element or its parent has the join-ride-btn class
  const joinButton = e.target.closest('.join-ride-btn');
  if (joinButton) {
    const rideId = joinButton.dataset.rideId;
    await joinRide(rideId);
  }
});

// Add refresh button functionality
refreshBtn.addEventListener('click', () => {
  loadRides();
});

// Add search functionality
searchInput.addEventListener('input', filterRides);

// Filter rides based on search input
function filterRides() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  if (!searchTerm) {
    // If search is empty, show all rides
    renderRides(allRides);
    return;
  }
  
  const filteredRides = allRides.filter(ride => {
    // Search in pickup, drop, and stops
    const matchesPickup = ride.pickup.toLowerCase().includes(searchTerm);
    const matchesDrop = ride.drop.toLowerCase().includes(searchTerm);
    
    // Check stops if available
    let matchesStops = false;
    if (ride.stops && ride.stops.length) {
      matchesStops = ride.stops.some(stop => 
        stop.toLowerCase().includes(searchTerm));
    }
    
    return matchesPickup || matchesDrop || matchesStops;
  });
  
  renderRides(filteredRides);
}

// Fetch available rides
async function loadRides() {
  try {
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    ridesList.innerHTML = '';
    emptyState.classList.add('hidden');
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch('/api/rides', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load rides');
    }
    
    // Store all rides for filtering
    allRides = data;
    
    // Check if there's any search filter applied
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filterRides();
    } else {
      renderRides(data);
    }
  } catch (error) {
    console.error('Failed to load rides:', error);
    const errorMessage = error.message === 'Authentication required. Please login.' ?
      error.message : 'Failed to load rides. Please try again.';
    
    ridesList.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">${errorMessage}</div>`;
    emptyState.classList.add('hidden');
    
    if (error.message === 'Authentication required. Please login.') {
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    }
  } finally {
    // Always hide loading indicator
    loadingIndicator.classList.add('hidden');
  }
}

// Render rides list
function renderRides(rides) {
  // Handle empty state
  const emptyState = document.getElementById('empty-state');
  if (!rides || !rides.length) {
    ridesList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  // Format departure time nicely
  const formatDepartureTime = (dateStr) => {
    if (!dateStr) return 'Flexible';
    
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const dateFormat = isToday ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ';
    const timeFormat = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    
    const timeDiff = Math.floor((date - now) / (1000 * 60));
    let relativeTime = '';
    if (timeDiff > 0 && timeDiff < 60) {
      relativeTime = ` (in ${timeDiff} mins)`;
    }
    
    return `${dateFormat}${timeFormat}${relativeTime}`;
  };
  
  // Build HTML for each ride card
  ridesList.innerHTML = rides.map(ride => {
    // Format fare display
    const fareDisplay = ride.fare ? `₹${ride.fare}` : 'Not specified';
    
    // Format departure time
    const departureDisplay = formatDepartureTime(ride.departureTime);
    
    // Format stops if any
    const stopsSection = ride.stops && ride.stops.length > 0 ? `
      <div class="mt-2 bg-blue-50 p-2 rounded">
        <p class="text-sm font-semibold text-blue-800"><i class="fas fa-map-signs mr-1"></i> Stops:</p>
        <ul class="list-disc pl-5 text-sm">
          ${ride.stops.map(stop => `<li>${stop}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    // Format available seats
    const seatsText = ride.availableSeats > 1 ? `${ride.availableSeats} seats` : '1 seat';
    
    return `
    <div class="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-map-marker-alt text-red-500 mr-1"></i> ${ride.pickup}
          </h3>
          <h3 class="text-lg font-semibold text-gray-800 mt-1">
            <i class="fas fa-flag-checkered text-green-500 mr-1"></i> ${ride.drop}
          </h3>
        </div>
        <div class="text-right">
          <p class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full inline-block font-medium">
            ${fareDisplay}
          </p>
          ${ride.vehicleInfo ? `<p class="text-sm text-gray-600 mt-1"><i class="fas fa-car mr-1"></i> ${ride.vehicleInfo}</p>` : ''}
        </div>
      </div>
      
      ${stopsSection}
      
      <div class="flex items-center justify-between mt-4 border-t pt-3 border-gray-200">
        <div>
          <p class="text-sm"><i class="far fa-clock text-blue-500 mr-1"></i> ${departureDisplay}</p>
          <p class="text-sm"><i class="fas fa-user-friends text-purple-500 mr-1"></i> ${seatsText} available</p>
        </div>
        <button data-ride-id="${ride._id}" class="join-ride-btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 flex items-center">
          <i class="fas fa-sign-in-alt mr-2"></i> Join
        </button>
      </div>
    </div>
    `;
  }).join('');
}

// Get current user info from localStorage and sessionStorage
function getCurrentUserInfo() {
  try {
    // First try to get from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      if (currentUser && (currentUser._id || currentUser.username)) {
        console.log('Found user in localStorage:', currentUser);
        return {
          username: currentUser.username || 'User',
          userId: currentUser._id || currentUser.userId || null
        };
      }
    }
    
    // Try token parsing as fallback
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Extract payload from JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Extracted user info from token:', payload);
        return {
          username: payload.username || 'TokenUser',
          userId: payload.userId || payload.sub || null
        };
      } catch (e) {
        console.warn('Could not parse token:', e);
      }
    }
    
    // Last resort - check session storage 
    const sessionUsername = sessionStorage.getItem('username');
    if (sessionUsername) {
      return {
        username: sessionUsername,
        userId: sessionStorage.getItem('userId') || null
      };
    }
    
    return { username: 'Guest User', userId: null };
  } catch (error) {
    console.error('Error getting current user info:', error);
    return { username: 'Error User', userId: null };
  }
}

// Get current user ID 
function getCurrentUserId() {
  return getCurrentUserInfo().userId;
}

// Show ride confirmation dialog with accept/decline options
function showRideConfirmationDialog(rideId, rideDetails) {
  // Use the modal element already in HTML
  const joinModal = document.getElementById('join-modal');
  const joinModalContent = document.getElementById('join-modal-content');
  // Format fare and departure time
  const fareDisplay = rideDetails.fare ? `₹${rideDetails.fare}` : 'Not specified';
  const formatDepartureTime = (dateStr) => {
    if (!dateStr) return 'Flexible';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };
  
  // Format vehicle info
  const vehicleInfo = rideDetails.vehicleInfo || 'Not specified';
  
  // Format stops if available
  const stopsHTML = rideDetails.stops && rideDetails.stops.length > 0 
    ? `<div class="mt-2">
        <p class="font-semibold">Stops:</p>
        <ul class="list-disc pl-5">
          ${rideDetails.stops.map(stop => `<li>${stop}</li>`).join('')}
        </ul>
       </div>` 
    : '';
  
  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const username = currentUser.username || 'Anonymous User';
  const userId = getCurrentUserId();
  
  // Create the dialog content
  joinModalContent.innerHTML = `
    <div class="bg-white rounded-lg">
      <div class="bg-blue-600 text-white p-4 rounded-t-lg">
        <h2 class="text-xl font-bold">Ride Details</h2>
      </div>
      
      <div class="p-4">
        <div class="bg-blue-50 p-3 rounded-lg mb-4">
          <div class="flex items-start mb-2">
            <i class="fas fa-map-marker-alt text-red-500 mt-1 mr-2"></i>
            <div>
              <p class="font-semibold">Pickup:</p>
              <p>${rideDetails.pickup}</p>
            </div>
          </div>
          
          <div class="flex items-start">
            <i class="fas fa-flag-checkered text-green-500 mt-1 mr-2"></i>
            <div>
              <p class="font-semibold">Destination:</p>
              <p>${rideDetails.drop}</p>
            </div>
          </div>
        </div>
        
        ${stopsHTML}
        
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="bg-gray-50 p-3 rounded">
            <p class="font-semibold"><i class="fas fa-money-bill-wave text-green-600 mr-1"></i> Fare:</p>
            <p>${fareDisplay}</p>
          </div>
          
          <div class="bg-gray-50 p-3 rounded">
            <p class="font-semibold"><i class="fas fa-car text-blue-600 mr-1"></i> Vehicle:</p>
            <p>${vehicleInfo}</p>
          </div>
          
          <div class="bg-gray-50 p-3 rounded">
            <p class="font-semibold"><i class="far fa-clock text-purple-600 mr-1"></i> Departure:</p>
            <p>${formatDepartureTime(rideDetails.departureTime)}</p>
          </div>
          
          <div class="bg-gray-50 p-3 rounded">
            <p class="font-semibold"><i class="fas fa-user-friends text-orange-600 mr-1"></i> Seats:</p>
            <p>${rideDetails.availableSeats || 1} available</p>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <p class="mb-2">Send a request to join this ride?</p>
          <p class="text-sm text-gray-600">The driver will need to accept your request.</p>
        </div>
        
        <div class="flex justify-between mt-4">
          <button id="cancel-join-btn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-300">
            <i class="fas fa-times mr-1"></i> Cancel
          </button>
          <button id="confirm-join-btn" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-300">
            <i class="fas fa-paper-plane mr-1"></i> Send Request
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Show the modal
  joinModal.classList.remove('hidden');
  
  // Add event listeners
  document.getElementById('cancel-join-btn').addEventListener('click', () => {
    joinModal.classList.add('hidden');
  });
  
  document.getElementById('confirm-join-btn').addEventListener('click', async () => {
    joinModal.classList.add('hidden');
    
    // Get complete current user information
    const userInfo = getCurrentUserInfo();
    const username = userInfo.username;
    const userId = userInfo.userId;
    
    // Show loading state
    ridesList.innerHTML = '<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded"><i class="fas fa-spinner fa-spin mr-2"></i>Sending join request... Please wait.</div>';
    
    try {
      // First, call the API endpoint to join the ride
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/rides/${rideId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, userId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join ride');
      }
      
      // After API call succeeds, emit socket event to notify driver in real-time
      if (window.socket) {
        // Pass the ride details to the driver
        window.socket.emit('ride-joined', {
          rideId, 
          username, 
          userId,
          rideDetails: data.ride
        }, (response) => {
          if (response && response.error) {
            console.warn('Socket warning:', response.error);
            // Continue anyway since the API call succeeded
          }
        });
      }
      
      // Show waiting for driver message
      ridesList.innerHTML = `
        <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p class="font-medium"><i class="fas fa-info-circle mr-2"></i>Join request sent successfully!</p>
          <p class="mt-2">Please wait for the driver to accept your request.</p>
          <div class="mt-3 flex justify-center">
            <div class="animate-pulse flex space-x-2">
              <div class="h-3 w-3 bg-blue-400 rounded-full"></div>
              <div class="h-3 w-3 bg-blue-400 rounded-full"></div>
              <div class="h-3 w-3 bg-blue-400 rounded-full"></div>
            </div>
          </div>
        </div>
      `;
      
      // Set up listeners for driver's response
      setupDriverResponseListeners(rideId);
      
    } catch (error) {
      console.error('Error joining ride:', error);
      ridesList.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"><i class="fas fa-exclamation-circle mr-2"></i>${error.message || 'Failed to join ride. Please try again.'}</div>`;
      
      // Reload available rides after a delay
      setTimeout(() => {
        loadRides();
      }, 3000);
    }
  });
  
  // No need for decline-btn handler as it's now handled by cancel-join-btn
}

/**
 * Set up listeners for driver's response to join request
 * @param {string} rideId - ID of the ride being joined
 */
function setupDriverResponseListeners(rideId) {
  if (!window.socket) {
    console.warn('Socket not available for ride response listeners');
    return;
  }
  
  // Remove any existing listeners to avoid duplicates
  window.socket.off('ride-accepted');
  window.socket.off('ride-declined');
  
  // Listen for driver accepting the request
  window.socket.on('ride-accepted', (data) => {
    console.log('Received ride-accepted event:', data);
    
    // Make sure this is for our ride
    if (data.rideId === rideId) {
      // Show success message
      ridesList.innerHTML = `
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p class="font-medium"><i class="fas fa-check-circle mr-2"></i>Great news! Your ride request was accepted.</p>
          <p class="mt-2">Redirecting to ride details page...</p>
        </div>
      `;
      
      // Store any ride data received
      if (data.ride) {
        sessionStorage.setItem('currentRideData', JSON.stringify(data.ride));
      }
      
      // Redirect to details page
      setTimeout(() => {
        window.location.href = `/details.html?rideId=${rideId}`;
      }, 2000);
    }
  });
  
  // Listen for driver declining the request
  window.socket.on('ride-declined', (data) => {
    console.log('Received ride-declined event:', data);
    
    // Make sure this is for our ride
    if (data.rideId === rideId) {
      // Show declined message
      ridesList.innerHTML = `
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p class="font-medium"><i class="fas fa-times-circle mr-2"></i>The driver declined your ride request.</p>
          <p class="mt-2">Please try joining another available ride.</p>
        </div>
      `;
      
      // Reload rides list after a delay
      setTimeout(() => {
        loadRides();
      }, 3000);
    }
  });
}

// Join a ride
async function joinRide(rideId) {
  try {
    // Show loading indicator in the rides list
    const loadingHTML = `
      <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded flex items-center" id="join-loading-indicator">
        <i class="fas fa-spinner fa-spin mr-2"></i>
        <span>Loading ride details...</span>
      </div>
    `;
    const existingLoadingIndicator = document.getElementById('join-loading-indicator');
    if (!existingLoadingIndicator) {
      ridesList.insertAdjacentHTML('afterbegin', loadingHTML);
    }
    
    // Get token or redirect to login
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login.html?redirect=ask.html';
      return;
    }
    
    // First fetch the ride details to confirm
    let detailsResponse;
    try {
      detailsResponse = await fetch(`/api/rides/${rideId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        throw new Error(errorData.error || 'Failed to fetch ride details');
      }
      
      const rideDetails = await detailsResponse.json();
      
      // Remove any loading indicators
      const loadingElement = document.getElementById('join-loading-indicator');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Show confirmation dialog
      showRideConfirmationDialog(rideId, rideDetails);
      return;
      
    } catch (error) {
      console.error('Error fetching ride details:', error);
      // Remove loading indicator and show error
      const loadingElement = document.getElementById('join-loading-indicator');
      if (loadingElement) {
        loadingElement.remove();
      }
      ridesList.insertAdjacentHTML('afterbegin', `
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><i class="fas fa-exclamation-circle mr-2"></i> ${error.message || 'Failed to load ride details'}</p>
        </div>
      `);
      return;
    }
    
    // Get complete current user information using our robust function
    const userInfo = getCurrentUserInfo();
    const username = userInfo.username;
    const userId = userInfo.userId;
    
    console.log('User joining ride (robust method):', userInfo);
    
    // Store user info in sessionStorage for persistence
    sessionStorage.setItem('username', username);
    if (userId) {
      sessionStorage.setItem('userId', userId);
    }
    
    const response = await fetch(`/api/rides/${rideId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, userId }) // Include user info in request body
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to join ride');
    }
    
    // Show loading state
    ridesList.innerHTML = '<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded"><i class="fas fa-spinner fa-spin mr-2"></i>Joining ride, please wait...</div>';
    
    // Make sure socket is initialized before proceeding
    console.log('Ensuring socket is connected before sending join event');
    try {
      // Use the global helper function to ensure we have a connected socket
      if (typeof window.ensureSocketConnected === 'function') {
        window.socket = window.ensureSocketConnected();
        console.log('Socket connected successfully:', window.socket?.id);
      } else {
        console.warn('ensureSocketConnected not available, falling back to manual connection');
        // Fallback to wait for socket connection
        await new Promise((resolve) => {
          if (typeof window.socket !== 'undefined' && window.socket?.connected) {
            console.log('Socket already connected');
            resolve();
          } else {
            console.log('Waiting for socket to connect...');
            document.addEventListener('socket-connected', () => {
              console.log('Socket connected event received');
              resolve();
            }, { once: true });
            
            // Failsafe - don't wait forever
            setTimeout(() => {
              console.log('Socket connection timeout, proceeding anyway');
              resolve();
            }, 2000);
          }
        });
      }
    } catch (err) {
      console.error('Error initializing socket connection:', err);
      // Continue anyway so we don't get stuck
    }
    
    // Add timeout to handle potential socket issues
    const socketPromise = new Promise((resolve, reject) => {
      // Set timeout to handle if acknowledgment never comes back
      const timeout = setTimeout(() => {
        console.log('Socket acknowledgment timeout - proceeding anyway');
        // Instead of rejecting, we'll resolve to prevent getting stuck
        resolve({ success: true, timedOut: true });
      }, 3000);
      
      // Check if socket is available
      if (!window.socket) {
        console.warn('Socket not available, skipping emit');
        clearTimeout(timeout);
        resolve({ success: true, noSocket: true });
        return;
      }
      
      // Log socket state for debugging
      console.log('Socket connected:', window.socket?.connected, 'Socket ID:', window.socket?.id);
      
      try {
        // Get fresh user info right before emitting
        const userInfo = getCurrentUserInfo();
        
        // Use most appropriate username from various sources
        const userToSend = {
          username: userInfo.username,
          userId: userInfo.userId
        };
        
        console.log('Emitting ride-joined with user details (robust):', userToSend);
        
        // Emit socket event with complete user info and wait for acknowledgment
        window.socket.emit('ride-joined', { 
          rideId, 
          username: userToSend.username, 
          userId: userToSend.userId,
          userInfo: userToSend // Send the complete object for redundancy
        }, (ack) => {
          clearTimeout(timeout);
          console.log('Received acknowledgment:', ack);
          if (ack && ack.success) {
            resolve(ack);
          } else if (ack) {
            console.warn('Acknowledgment received but unsuccessful:', ack);
            // Still resolve since we got some response
            resolve({ success: true, warning: true });
          } else {
            console.warn('Empty acknowledgment received');
            // Still resolve since we at least got a callback
            resolve({ success: true, warning: true });
          }
        });
      } catch (error) {
        console.error('Error emitting socket event:', error);
        clearTimeout(timeout);
        resolve({ success: true, emitError: true });
      }
    });
    
    // Variable to store ride details from acknowledgment
    let rideDetails = null;

    try {
      const result = await socketPromise;
      console.log('Socket promise resolved:', result);
      
      // Check if we got ride details back
      if (result && result.rideDetails) {
        rideDetails = result.rideDetails;
      }
    } catch (error) {
      console.error('Socket error, but continuing anyway:', error);
      // We'll continue even if there's a socket error
    }
    
    // Additional manual acknowledgment as a failsafe
    if (window.socket) {
      try {
        const userId = getCurrentUserId();
        window.socket.emit('ride-joined-ack', { 
          rideId, 
          username, 
          userId: userId
        });
        console.log('Manual acknowledgment sent with userId:', userId);
      } catch (err) {
        console.warn('Failed to send manual acknowledgment:', err);
      }
    } else {
      console.warn('Socket not available for manual acknowledgment');
    }
    
    // Register for the manual ack event as backup
    document.addEventListener('ride-joined-ack', (event) => {
      console.log('Received manual acknowledgment event:', event.detail);
      if (event.detail && event.detail.rideDetails) {
        rideDetails = event.detail.rideDetails;
      }
    }, { once: true });
    
    // Show a simple waiting message
    ridesList.innerHTML = '<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">Request sent! Waiting for driver to accept...</div>';
    
    // Listen for ride acceptance or declination
    const acceptListener = (acceptData) => {
      console.log('Ride accepted event received:', acceptData);
      
      if (acceptData.rideId === rideId) {
        // Save complete ride details to sessionStorage for the details page
        console.log('Saving complete ride details to sessionStorage:', acceptData);
        sessionStorage.setItem('currentRideData', JSON.stringify(acceptData));
        
        // Show success message in the rides list section
        ridesList.innerHTML = `
          <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Ride accepted! Driver: ${acceptData.driverName || acceptData.driver || 'Your driver'}
            <p>Redirecting to details page...</p>
          </div>`;
        
        // Remove event listeners to avoid duplicates
        window.socket?.off('ride-accepted', acceptListener);
        window.socket?.off('ride-declined', declineListener);
        
        // Redirect after delay with ride ID parameter
        setTimeout(() => {
          window.location.href = `/details.html?rideId=${rideId}`;
        }, 1500);
      }
    };
    
    const declineListener = (data) => {
      if (data.rideId === rideId) {
        console.log('Ride declined by driver');
        
        // Show declined message
        ridesList.innerHTML = '<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Ride declined by driver. Please try another ride.</div>';
        
        // Remove listeners
        window.socket?.off('ride-accepted', acceptListener);
        window.socket?.off('ride-declined', declineListener);
        
        // Refresh rides list after delay
        setTimeout(() => {
          loadRides();
        }, 3000);
      }
    };
    
    // Set up listeners for driver's response
    if (window.socket) {
      window.socket.on('ride-accepted', acceptListener);
      window.socket.on('ride-declined', declineListener);
    }
  
    
  } catch (error) {
    console.error('Join error:', error);
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4';
    errorDiv.textContent = error.message || 'Failed to join ride. Please try again.';
    ridesList.insertAdjacentElement('beforebegin', errorDiv);
  }
}

function waitForSocketIO(callback) {
  if (typeof io !== 'undefined') {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/index.html?error=auth_required';
      return;
    }

    // Use the global socket from sockets.js if available
    if (typeof socket !== 'undefined' && socket.connected) {
      callback();
      return;
    }
    
    // If sockets.js has loaded but socket isn't connected yet
    if (typeof initializeSocketConnection === 'function') {
      // Listen for when socket is connected
      document.addEventListener('socket-connected', () => {
        callback();
      }, { once: true });
      
      // Ensure socket gets initialized
      initializeSocketConnection();
    } else {
      // Wait for sockets.js to load and initialize socket
      document.addEventListener('socket-connected', () => {
        callback();
      }, { once: true });
    }
  } else {
    setTimeout(() => waitForSocketIO(callback), 100);
  }
}

// Use centralized socket connection from sockets.js

// Initialize the page
loadRides();

// Make sure socket is connected and refresh rides when connected
document.addEventListener('socket-connected', () => {
  console.log('Socket connected, refreshing rides list');
  loadRides();
});
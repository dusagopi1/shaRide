// details.js - Ride details and live location tracking with Google Maps integration

// Global variables for map functionality
let map = null;
let driverMarker = null;
let riderMarker = null;
let userRole = null;
let watchId = null;
let currentPosition = null;
let locationSharing = false;
let followMap = true;
let otherUserLocation = null;
let rideId = null;

// Make initializeMap function globally available for Google Maps callback
window.initializeMap = function() {
  console.log('Google Maps API loaded, initializing map...');
  
  // If ride details haven't been loaded yet, wait for them
  if (!userRole) {
    console.log('User role not determined yet, map will be initialized after ride details load');
    return;
  }
  
  // Default coordinates for India
  const defaultPosition = { lat: 20.5937, lng: 78.9629 };
  const defaultZoom = 5;
  
  // Create map instance
  map = new google.maps.Map(document.getElementById('map'), {
    center: defaultPosition,
    zoom: defaultZoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: [
      // Optional custom styles to make the map look better
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  });
  
  // Create custom marker options for driver
  const createDriverMarkerOptions = () => ({
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="2"/>
          <path d="M27 14h-2V12c0-2.21-1.79-4-4-4h-2c-2.21 0-4 1.79-4 4v2H13c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm-2-8h2v2h-2v-2z" fill="white"/>
        </svg>
      `),
      size: new google.maps.Size(40, 40),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    },
    optimized: false, // Required for CSS animations
    title: 'Driver',
    zIndex: 10
  });
  
  // Create custom marker options for rider
  const createRiderMarkerOptions = () => ({
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="2"/>
          <path d="M20 10c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
        </svg>
      `),
      size: new google.maps.Size(40, 40),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    },
    optimized: false, // Required for CSS animations
    title: 'Rider',
    zIndex: 10
  });
  
  // Create markers for driver and rider with distinct icons
  const driverOptions = createDriverMarkerOptions();
  const riderOptions = createRiderMarkerOptions();
  
  // Create custom SVG icons for markers
  const createDriverIcon = ({
    bgColor = '#2563eb',
    iconColor = 'white',
    size = 40
  } = {}) => {
    const radius = size / 2 - 2;
    const midX = size/2;
    const midY = size/2;
    
    // Simple car icon with fixed proportions
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${midX}" cy="${midY}" r="${radius}" 
                fill="${bgColor}" stroke="${iconColor}" stroke-width="2"/>
        <path d="M${midX-10} ${midY-2}h20v-5l-5-5h-10l-5 5v5z
                 M${midX-8} ${midY-7}h16 M${midX-7} ${midY+2}a3,3 0 1,0 0,6 M${midX+7} ${midY+2}a3,3 0 1,0 0,6" 
              fill="none" stroke="${iconColor}" stroke-width="2"/>
      </svg>
    `.replace(/\s+/g, ' ').trim(); // Minify SVG
  
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size/2, size/2),
      origin: new google.maps.Point(0, 0)
    };
  };
  
  const createRiderIcon = () => ({
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="2"/>
        <path d="M20 10c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
      </svg>
    `),
    size: new google.maps.Size(40, 40),
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  });
  
  // Create driver and rider markers with custom SVG icons
  driverMarker = new google.maps.Marker({
    position: defaultPosition,
    icon: createDriverMarkerOptions(), // Fixed to use the correct icon function
    title: 'Driver',
    map: null // Don't add to map yet
  });
  
  riderMarker = new google.maps.Marker({
    position: defaultPosition,
    icon: createRiderIcon(),
    title: 'Rider',
    map: null // Don't add to map yet
  });
  
  // Add info windows for the markers
  const driverInfo = new google.maps.InfoWindow({
    content: '<div class="marker-info">Driver</div>'
  });
  
  const riderInfo = new google.maps.InfoWindow({
    content: '<div class="marker-info">Rider</div>'
  });
  
  // Add click listeners to markers
  driverMarker.addListener('click', () => {
    driverInfo.open(map, driverMarker);
  });
  
  riderMarker.addListener('click', () => {
    riderInfo.open(map, riderMarker);
  });
  
  // Add event listeners for the map
  map.addListener('dragstart', () => {
    followMap = false;
  });
  
  // Setup event listeners for location controls
  setupEventListeners();
  
  // Show initial status
  showStatus(`You are the ${userRole}. Click "Share My Location" to begin live tracking.`, 'info');
};

// Helper function to format phone numbers for WhatsApp links
function formatPhoneForWhatsApp(phone) {
  // If it's not available or empty, use a default
  if (!phone || phone === 'Not available' || phone === 'Contact via username') {
    return '91'; // Default country code as fallback (India)
  }
  
  // Strip all non-numeric characters
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // If it looks like our format "username-phone", extract just the username part
  if (cleanPhone.length < 5 && phone.includes('-phone')) {
    // For our auto-generated format, use the username + some digits
    const username = phone.split('-')[0];
    // Generate a pseudo-random number from the username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert hash to a positive 10-digit number
    cleanPhone = '91' + Math.abs(hash).toString().padEnd(10, '0').substring(0, 10);
  }
  
  // Ensure it starts with country code (default to India +91)
  if (cleanPhone.length <= 10) {
    cleanPhone = '91' + cleanPhone;
  }
  
  return cleanPhone;
}

// Start tracking user's location
function startLocationTracking() {
  if (!navigator.geolocation) {
    showStatus('Your browser does not support location tracking', 'error');
    return;
  }
  
  locationSharing = true;
  updateShareButton();
  showStatus('Starting location tracking...', 'info');
  
  // Options for high accuracy and frequent updates
  const options = {
    enableHighAccuracy: true,
    maximumAge: 10000,        // 10 seconds
    timeout: 15000            // 15 seconds
  };
  
  // Watch position
  watchId = navigator.geolocation.watchPosition(
    handleLocationSuccess,
    handleLocationError,
    options
  );
}

// Stop tracking user's location
function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    locationSharing = false;
    updateShareButton();
    showStatus('Location sharing stopped', 'info');
  }
}

// Handle successful location update
function handleLocationSuccess(position) {
  const { latitude, longitude, accuracy } = position.coords;
  currentPosition = { lat: latitude, lng: longitude };
  
  // Update location status
  const locationStatus = document.getElementById('location-status');
  if (locationStatus) {
    locationStatus.textContent = `Location active (±${Math.round(accuracy)}m)`;
  }
  
  // Update our marker based on user role
  if (userRole === 'Driver') {
    driverMarker.setPosition(currentPosition);
    driverMarker.setMap(map); // Add to map if not already there
  } else {
    riderMarker.setPosition(currentPosition);
    riderMarker.setMap(map); // Add to map if not already there
  }
  
  // Center map if following is enabled
  if (followMap) {
    centerMapOnBothUsers();
  }
  
  // Send location to server
  sendLocationUpdate(latitude, longitude);
}

// Center map to show both users
function centerMapOnBothUsers() {
  // If we have both positions, fit bounds to include both
  if (currentPosition && otherUserLocation && map) {
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(currentPosition);
    bounds.extend(otherUserLocation);
    map.fitBounds(bounds);
    
    // Set a minimum zoom level for a better experience
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > 15) map.setZoom(15);
    });
  } 
  // Otherwise center on our position
  else if (currentPosition && map) {
    map.setCenter(currentPosition);
    map.setZoom(15);
  }
}

// Handle location error
function handleLocationError(error) {
  let message;
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = 'Location permission denied';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Location information unavailable';
      break;
    case error.TIMEOUT:
      message = 'Location request timed out';
      break;
    default:
      message = 'Unknown error with location tracking';
      break;
  }
  
  console.error('Geolocation error:', message);
  showStatus(message, 'error');
  
  const locationStatus = document.getElementById('location-status');
  if (locationStatus) {
    locationStatus.textContent = 'Location error: ' + message;
  }
  
  stopLocationTracking();
}

// Send location update to server via socket
function sendLocationUpdate(latitude, longitude) {
  if (!window.socket || !rideId || !userRole) {
    console.log('Not sending location - missing required data:', {
      socketExists: !!window.socket,
      rideId: rideId,
      userRole: userRole
    });
    return;
  }
  
  // Log what we're sending to help debug
  console.log('Sending location update as:', userRole);
  
  // Send explicit user role for clarity
  window.socket.emit('location-update', {
    rideId,
    userRole,  // This is critical - identifies who's sending the update
    latitude,
    longitude,
    timestamp: new Date().toISOString()
  });
}

// Update other user's location on the map
function updateOtherUserLocation(data) {
  if (!map) return;
  
  console.log('Updating other user location with data:', data);
  console.log('Current user role:', userRole);
  
  const { userRole: senderRole, latitude, longitude } = data;
  otherUserLocation = { lat: latitude, lng: longitude };
  
  // Update the appropriate marker based on the sender's role
  if (senderRole === 'Driver') {
    console.log('Received DRIVER location update - updating driver marker');
    driverMarker.setPosition(otherUserLocation);
    driverMarker.setMap(map); // Add to map if not already there
    showStatus('Driver location updated', 'info');
    
    // If both driver and rider markers are shown, ensure rider is slightly offset
    if (riderMarker.getMap()) {
      offsetRiderMarker();
    }
  } else if (senderRole === 'Rider') {
    console.log('Received RIDER location update - updating rider marker');
    
    // Always offset the rider marker slightly from the driver
    if (driverMarker.getMap()) {
      // Driver marker exists, offset the rider position
      const offsetPos = calculateOffset(otherUserLocation);
      riderMarker.setPosition(offsetPos);
    } else {
      // No driver marker yet, just use the actual position
      riderMarker.setPosition(otherUserLocation);
    }
    
    riderMarker.setMap(map); // Add to map if not already there
    showStatus('Rider location updated', 'info');
  }
}

// Function to offset a position slightly (for rider marker)
function calculateOffset(position) {
  // Offset by a small amount (~30 meters)
  // This creates a random offset within a certain range, biased to the right
  const offsetLat = position.lat + (Math.random() * 0.0003 - 0.0001); // -0.0001 to 0.0002
  const offsetLng = position.lng + (Math.random() * 0.0003 + 0.0001);  // 0.0001 to 0.0004
  
  return { lat: offsetLat, lng: offsetLng };
}

// Function to ensure rider marker is offset from driver marker
function offsetRiderMarker() {
  if (!driverMarker.getMap() || !riderMarker.getMap()) return;
  
  const driverPos = driverMarker.getPosition();
  const riderPos = riderMarker.getPosition();
  
  // If markers are too close (within ~20 meters), offset the rider marker
  const distance = google.maps.geometry.spherical.computeDistanceBetween(driverPos, riderPos);
  if (distance < 20) {
    console.log('Rider too close to driver, offsetting position');
    riderMarker.setPosition(calculateOffset(driverPos));
  }
  
  // Center map if following is enabled
  if (followMap) {
    centerMapOnBothUsers();
  }
}

// Show status messages
function showStatus(message, type = 'info') {
  const statusBanner = document.getElementById('status-banner');
  if (!statusBanner) return;
  
  statusBanner.textContent = message;
  statusBanner.className = 'mb-4 p-3 rounded-lg text-center font-medium';
  
  // Apply styles based on message type
  switch (type) {
    case 'success':
      statusBanner.classList.add('bg-green-100', 'text-green-800');
      break;
    case 'error':
      statusBanner.classList.add('bg-red-100', 'text-red-800');
      break;
    case 'warning':
      statusBanner.classList.add('bg-yellow-100', 'text-yellow-800');
      break;
    default:
      statusBanner.classList.add('bg-blue-100', 'text-blue-800');
  }
  
  statusBanner.classList.remove('hidden');
  
  // Hide after 5 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      statusBanner.classList.add('hidden');
    }, 5000);
  }
}

// Update share location button state
function updateShareButton() {
  const shareLocationBtn = document.getElementById('share-location-btn');
  if (!shareLocationBtn) return;
  
  if (locationSharing) {
    shareLocationBtn.textContent = 'Stop Sharing';
    shareLocationBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    shareLocationBtn.classList.add('bg-red-500', 'hover:bg-red-600');
  } else {
    shareLocationBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Share My Location
    `;
    shareLocationBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
    shareLocationBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }
}

// Setup event listeners for map controls
function setupEventListeners() {
  if (!map) return; // Make sure map exists
  
  const shareLocationBtn = document.getElementById('share-location-btn');
  if (shareLocationBtn) {
    shareLocationBtn.addEventListener('click', () => {
      if (locationSharing) {
        stopLocationTracking();
      } else {
        startLocationTracking();
      }
    });
  }
  
  const centerMapBtn = document.getElementById('center-map-btn');
  if (centerMapBtn) {
    centerMapBtn.addEventListener('click', () => {
      followMap = true;
      centerMapOnBothUsers();
    });
  }
  
  // Listen for location updates from other user
  if (window.socket) {
    window.socket.on('location-update', (data) => {
      console.log('Received location update:', data);
      if (data.rideId === rideId && data.userRole !== userRole) {
        updateOtherUserLocation(data);
      }
    });
  }
}

// Handle rating star selection
function setupRatingStars() {
  const stars = document.querySelectorAll('.star-rating');
  const submitButton = document.getElementById('submit-rating-btn');
  let selectedRating = 0;
  
  stars.forEach(star => {
    // Set initial styling
    star.style.color = '#d1d5db'; // Gray color for unselected stars
    
    // Add click event
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'));
      selectedRating = rating;
      
      // Update star colors
      stars.forEach(s => {
        const starRating = parseInt(s.getAttribute('data-rating'));
        s.style.color = starRating <= rating ? '#fbbf24' : '#d1d5db'; // Yellow for selected, gray for unselected
      });
      
      // Enable submit button
      if (submitButton) {
        submitButton.disabled = false;
      }
    });
  });
  
  // Submit button handler
  if (submitButton) {
    submitButton.addEventListener('click', () => {
      const comment = document.getElementById('rating-comment')?.value || '';
      submitRating(selectedRating, comment);
    });
  }
}

// Handle finishing a ride
async function finishRide() {
  if (!rideId) return;
  
  try {
    const response = await fetch(`/api/rides/${rideId}/finish`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to finish ride');
    
    // Reload ride details to show rating section
    loadRideDetails();
    showStatus('Ride completed! Please rate your experience.', 'success');
  } catch (error) {
    console.error('Error finishing ride:', error);
    showStatus('Error finishing ride. Please try again.', 'error');
  }
}

// Setup event handlers for finish ride button
function setupFinishRideButton() {
  const finishRideBtn = document.getElementById('finish-ride-btn');
  if (finishRideBtn) {
    finishRideBtn.addEventListener('click', finishRide);
  }
}

// Main document ready function
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const rideDetails = document.getElementById('ride-details');
  
  // Extract ride details from URL
  const params = new URLSearchParams(window.location.search);
  rideId = params.get('rideId');
  
  if (!rideId) {
    if (rideDetails) {
      rideDetails.innerHTML = '<p class="text-red-500">Missing ride ID</p>';
    }
    return;
  }
  
  // Debug log to see what we have in storage
  console.log('Session storage:', JSON.parse(JSON.stringify(sessionStorage)));
  console.log('localStorage:', JSON.parse(JSON.stringify(localStorage)));
  
  // Try to get ride data from session storage first, which should have all names
  const storedRideData = JSON.parse(sessionStorage.getItem('currentRideData') || '{}');
  console.log('Stored ride data from session:', storedRideData);
  
  // Listen for real-time ride join updates
  document.addEventListener('ride-joined', (event) => {
    const { ride, message } = event.detail;
    if (ride && ride._id === rideId) {
      loadRideDetails(); // Reload ride details to show the joined user
      
      // Show a temporary success message
      const notification = document.createElement('div');
      notification.className = 'bg-green-100 text-green-700 p-4 rounded mb-4';
      notification.textContent = message;
      
      if (rideDetails) {
        rideDetails.insertAdjacentElement('beforebegin', notification);
        // Remove notification after 5 seconds
        setTimeout(() => notification.remove(), 5000);
      }
    }
  });
  
  // Load ride details function
  async function loadRideDetails() {
    try {
      const response = await fetch(`/api/rides/${rideId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load ride');
      
      const data = await response.json();
      console.log('API response:', data); // Log full response for debugging
      
      // Extract ride details
      const pickup = data.pickup || '';
      const drop = data.drop || '';
      
      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const currentUsername = currentUser.username;
      const currentUserPhone = currentUser.phone || 'Not available';
      
      console.log('Current user info:', currentUser);
      console.log('Ride data:', data);
      
      // Get basic user information
      let driverName = data.driver || 'Unknown Driver';
      let riderName = data.rider || 'Unknown Rider';
      
      // Log values for debugging
      console.log('Current username:', currentUsername);
      console.log('Driver name from API:', driverName);
      console.log('Rider name from API:', riderName);
      
      // Determine user role - comparing exact strings with trimming to avoid whitespace issues
      const isDriver = currentUsername && driverName && 
                       currentUsername.trim().toLowerCase() === driverName.trim().toLowerCase();
      userRole = isDriver ? 'Driver' : 'Rider';
      
      // Force logging of the determination process
      console.log(`Role determination: Username '${currentUsername}' compared to driver '${driverName}'`);
      console.log(`Result: isDriver=${isDriver}, assigned role=${userRole}`);
      
      console.log('User role determined:', userRole, 'isDriver:', isDriver);
      
      // Get phone numbers for communication (use defaults if not provided)
      let driverPhone = data.driverPhone || 'Not available';
      let riderPhone = data.riderPhone || 'Not available';
      
      if (rideDetails) {
        // Render the ride details
        rideDetails.innerHTML = `
          <div class="p-4">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h2 class="text-lg font-bold">Ride Status</h2>
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  ${data.status ? data.status.toUpperCase() : 'PENDING'}
                </span>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">You are the</div>
                <div class="font-bold text-lg px-3 py-1 rounded-lg inline-block ${isDriver ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">
                  ${userRole}
                </div>
              </div>
            </div>
            
            <div class="border-t border-gray-200 pt-4">
              <div class="mb-4">
                <h3 class="text-md font-semibold mb-3">Contact Details</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-gray-50 p-3 rounded">
                    <div class="text-xs text-gray-500 mb-1">DRIVER</div>
                    <div class="font-medium">${driverName}</div>
                    <div class="flex items-center mt-1 text-xs">
                      <svg class="h-3 w-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span class="text-sm text-gray-600">${driverPhone}</span>
                    </div>
                  </div>
                  <div class="bg-gray-50 p-3 rounded">
                    <div class="text-xs text-gray-500 mb-1">RIDER</div>
                    <div class="font-medium">${riderName || 'Waiting for rider...'}</div>
                    <div class="flex items-center mt-1 text-xs">
                      <svg class="h-3 w-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span class="text-sm text-gray-600">${riderPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="mb-3">
                  <span class="text-xs text-gray-500 font-semibold">PICKUP</span>
                  <p class="font-medium">${pickup}</p>
                </div>
                <div class="mb-3">
                  <span class="text-xs text-gray-500 font-semibold">DESTINATION</span>
                  <p class="font-medium">${drop}</p>
                </div>
              </div>
              
            </div>
          </div>
          
          <!-- Action Buttons Container -->
          <div class="mt-4 space-y-3">
            <!-- WhatsApp Chat Button -->
            <div>
              ${isDriver ? 
                `<a href="https://wa.me/${formatPhoneForWhatsApp(riderPhone)}" target="_blank" 
                    class="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-center flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-5 h-5 mr-2 fill-current">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                  </svg>
                  Chat with Rider
                </a>` : 
                `<a href="https://wa.me/${formatPhoneForWhatsApp(driverPhone)}" target="_blank" 
                    class="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-center flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-5 h-5 mr-2 fill-current">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                  </svg>
                  Chat with Driver
                </a>`
              }
            </div>
            
            <!-- Finish Ride Button - only shown if ride is active/ongoing -->
            ${data.status && data.status.toLowerCase() === 'active' ? 
              `<button id="finish-ride-btn" class="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-center flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Finish Ride
              </button>` : 
              ''
            }
            
           
            
           
          </div>
        `;
      }

      // Initialize map if not already initialized
      if (typeof google !== 'undefined' && !map) {
        window.initializeMap();
      }
      
      // Setup the finish ride button and rating stars
      setupFinishRideButton();
      setupRatingStars();
      
    } catch (error) {
      if (rideDetails) {
        rideDetails.innerHTML = `
          <div class="p-2 bg-red-100 text-red-800">
            Error: ${error.message}
          </div>
        `;
      }
    }
  }
  
  // Start execution
  if (rideId) {
    loadRideDetails();
    
    // Setup socket connection and event listeners for location updates
    if (window.socket) {
      console.log('Setting up location update listeners for ride:', rideId);
      
      // Listen for location updates from other user
      window.socket.on('location-update', (data) => {
        console.log('Received location update:', data);
        
        // Make sure this update is for our ride
        if (data.rideId === rideId) {
          updateOtherUserLocation(data);
        }
      });
      
      // Join the ride-specific room for real-time updates
      window.socket.emit('join-ride-room', { rideId }, (response) => {
        console.log('Joined ride-specific socket room:', response);
      });
    } else {
      console.warn('Socket connection not available for location updates');
    }
  }
});

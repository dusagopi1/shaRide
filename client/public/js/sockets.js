// Wait for Socket.IO to be available
function waitForSocketIO(callback) {
    if (typeof io !== 'undefined') {
      callback();
    } else {
      console.log('Socket.IO not available yet, waiting...');
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (typeof io !== 'undefined') {
          console.log('Socket.IO found after', attempts, 'attempts');
          clearInterval(checkInterval);
          callback();
        } else if (attempts >= maxAttempts) {
          console.error('Socket.IO not available after', maxAttempts, 'attempts, giving up');
          clearInterval(checkInterval);
          // Still call callback to prevent blocking
          callback();
        }
      }, 100);
    }
  }
  
  // Enhanced Socket.IO client with robust error handling
  // Initialize the global socket variable
  if (typeof window.socket === 'undefined') {
    window.socket = null;
  }
  
  function initializeSocketConnection() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      redirectToLogin();
      return;
    }
  
    // Assign to window.socket to make it globally accessible
    window.socket = io({
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      // Connect to backend on port 3001
      "url": "http://localhost:3001"
    });
  
    // Connection handlers
    // Added connection status validation
    let isSocketConnected = false;
    
    window.socket.on('connect', () => {
      isSocketConnected = true;
      console.log('Socket connected:', window.socket.id);
      document.dispatchEvent(new CustomEvent('socket-connected'));
    });
  
    window.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
  
      if (err.message.includes('invalid token') || err.message.includes('unauthorized')) {
        redirectToLogin();
      } else {
        showNetworkError();
      }
    });
  
    setupRideListeners();
    return window.socket;
  }
  
  function setupRideListeners() {
    // Listen for ride matched events
    window.socket.on('ride-matched', (updatedRide) => {
      console.log('Ride matched:', updatedRide);
      // Dispatch custom event for UI updates
      document.dispatchEvent(new CustomEvent('ride-matched', { 
        detail: {
          ride: updatedRide,
          message: 'A user has joined the ride!'
        }
      }));
    });
  
    // Listen for ride joined events
    window.socket.on('ride-joined', (data, callback) => {
      console.log('Ride joined event received:', data);
      // Log if callback exists
      console.log('Callback provided with ride-joined event:', typeof callback === 'function');
      
      // Dispatch custom event for UI updates
      document.dispatchEvent(new CustomEvent('ride-joined', {
        detail: {
          ride: data.ride,
          message: `${data.username || 'A rider'} has joined the ride!`
        }
      }));
      
      // If a callback function was provided, call it with success
      if (typeof callback === 'function') {
        console.log('Sending acknowledgment back to client');
        try {
          callback({ success: true });
        } catch (e) {
          console.error('Error when sending acknowledgment:', e);
        }
      }
    });
    
    // Create a fallback listener for ride-joined-ack for compatibility
    window.socket.on('ride-joined-ack', (data) => {
      console.log('Ride joined acknowledgment received manually:', data);
      // Manually trigger acknowledgment flow without waiting for callback
      if (data && data.rideId) {
        // Notify all UI components
        document.dispatchEvent(new CustomEvent('ride-joined-ack', {
          detail: {
            success: true,
            rideId: data.rideId
          }
        }));
      }
    });
  }
  
  function redirectToLogin() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/index.html?error=session_expired';
  }
  
  function showNetworkError() {
    const errorEl = document.getElementById('connection-error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = 'Connection issues. Trying to reconnect...';
    }
  }
  
  // Initialize when both DOM and Socket.IO are ready
  // Ensure socket is initialized as early as possible
  if (typeof io !== 'undefined') {
    // Initialize immediately if io is available
    initializeSocketConnection();
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    waitForSocketIO(initializeSocketConnection);
    
    // Optional: Add reconnect button
    document.getElementById('reconnect-btn')?.addEventListener('click', initializeSocketConnection);
    
    // Add a global method to check/initialize socket
    window.ensureSocketConnected = function() {
      if (!window.socket) {
        console.log('Socket not initialized, initializing now');
        return initializeSocketConnection();
      } else if (!window.socket.connected) {
        console.log('Socket initialized but not connected, reconnecting');
        return initializeSocketConnection();
      } else {
        console.log('Socket already connected:', window.socket.id);
        return window.socket;
      }
    };
  });

  window.socket?.on('disconnect', () => {
    isSocketConnected = false;
    console.log('Socket disconnected, will attempt to reconnect');
  });
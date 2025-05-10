// my-rides.js - Handles fetching and displaying user rides
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!localStorage.getItem('token')) {
    window.location.href = '/index.html?error=auth_required';
    return;
  }

  // Get UI elements
  const loadingIndicator = document.getElementById('loading-indicator');
  const ridesContainer = document.getElementById('rides-container');
  const emptyState = document.getElementById('empty-state');
  const rideCardTemplate = document.getElementById('ride-card-template');

  // Get tab buttons and add click handlers
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      tabButtons.forEach(btn => {
        btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
        btn.classList.add('border-transparent');
      });
      
      // Add active class to clicked tab
      button.classList.add('active', 'text-blue-600', 'border-blue-600');
      button.classList.remove('border-transparent');
      
      // Load rides with the selected filter
      const status = button.dataset.status;
      loadUserRides(status);
    });
  });

  // Initial load of all rides
  loadUserRides('all');

  /**
   * Load user rides with optional status filter
   */
  async function loadUserRides(statusFilter = 'all') {
    try {
      // Show loading state
      loadingIndicator.classList.remove('hidden');
      ridesContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      
      // Clear existing rides
      ridesContainer.innerHTML = '';
      
      // Build API URL with filter
      let url = '/api/rides/user';
      if (statusFilter && statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      
      // Fetch user rides
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load rides');
      }
      
      const rides = await response.json();
      
      // Hide loading, show appropriate view
      loadingIndicator.classList.add('hidden');
      
      if (rides.length === 0) {
        // Show empty state if no rides
        emptyState.classList.remove('hidden');
      } else {
        // Show rides container and populate with ride cards
        ridesContainer.classList.remove('hidden');
        renderRides(rides);
      }
    } catch (error) {
      console.error('Error loading rides:', error);
      loadingIndicator.classList.add('hidden');
      
      // Show error message
      emptyState.classList.remove('hidden');
      emptyState.querySelector('h2').textContent = 'Error loading rides';
      emptyState.querySelector('p').textContent = error.message || 'Please try again later.';
    }
  }

  /**
   * Render ride cards from ride data
   */
  function renderRides(rides) {
    rides.forEach(ride => {
      // Clone template
      const rideCard = rideCardTemplate.content.cloneNode(true);
      
      // Set status with appropriate color
      const statusEl = rideCard.querySelector('.ride-status');
      statusEl.textContent = ride.status.toUpperCase();
      
      switch (ride.status) {
        case 'waiting':
          statusEl.classList.add('bg-yellow-500');
          break;
        case 'confirmed':
          statusEl.classList.add('bg-blue-500');
          break;
        case 'completed':
          statusEl.classList.add('bg-green-500');
          break;
        default:
          statusEl.classList.add('bg-gray-500');
      }
      
      // Set ride details
      rideCard.querySelector('.ride-id').textContent = ride._id.substring(0, 10) + '...';
      
      // Format the date
      const rideDate = new Date(ride.createdAt);
      rideCard.querySelector('.ride-date').textContent = rideDate.toLocaleDateString();
      
      // Set pickup and drop locations
      rideCard.querySelector('.ride-pickup').textContent = ride.pickup;
      rideCard.querySelector('.ride-drop').textContent = ride.drop;
      
      // Set participants
      const driverElement = rideCard.querySelector('.ride-driver');
      const riderElement = rideCard.querySelector('.ride-rider');
      
      // Driver info (always present)
      driverElement.textContent = ride.driver || 'Unknown Driver';
      
      // Rider info (may be empty for waiting rides)
      riderElement.textContent = ride.rider || 'Waiting for rider';
      
      // Set link to details page
      const detailsLink = rideCard.querySelector('.ride-details-link');
      detailsLink.href = `/details.html?rideId=${ride._id}`;
      
      // Configure cancel button based on ride status
      const cancelButton = rideCard.querySelector('.cancel-ride-btn');
      
      if (ride.status === 'completed') {
        // Can't cancel completed rides
        cancelButton.textContent = 'Completed';
        cancelButton.disabled = true;
        cancelButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        cancelButton.classList.add('bg-gray-400', 'cursor-not-allowed');
      } else {
        // Add event listener for cancellation
        cancelButton.addEventListener('click', () => cancelRide(ride._id));
      }
      
      // Add card to container
      ridesContainer.appendChild(rideCard);
    });
  }

  /**
   * Cancel a ride
   */
  async function cancelRide(rideId) {
    if (!confirm('Are you sure you want to cancel this ride?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/rides/${rideId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel ride');
      }
      
      // Reload the current tab
      const activeTab = document.querySelector('.tab-btn.active');
      loadUserRides(activeTab.dataset.status);
      
      alert('Ride cancelled successfully');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert(`Failed to cancel ride: ${error.message}`);
    }
  }
});

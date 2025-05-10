// Profile Page Functionality
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profile-form');
  const usernameInput = document.getElementById('username');
  const phoneInput = document.getElementById('phone');
  const statusMessage = document.getElementById('status-message');
  
  // Get current user data from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const token = localStorage.getItem('token');
  
  // If not logged in, redirect to login page
  if (!token) {
    window.location.href = '/index.html?error=auth_required';
    return;
  }
  
  // Populate form with current user data
  if (currentUser) {
    usernameInput.value = currentUser.username || '';
    phoneInput.value = currentUser.phone || '';
  }
  
  // Handle form submission
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const username = usernameInput.value.trim();
    const phone = phoneInput.value.trim();
    
    // Validate input
    if (!username) {
      showStatus('Please enter a username', 'error');
      return;
    }
    
    // Format phone number if provided (remove non-digits)
    const formattedPhone = phone ? phone.replace(/\D/g, '') : '';
    
    try {
      // Show loading status
      showStatus('Saving your profile...', 'loading');
      
      // Send update request to server
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          phone: formattedPhone
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      
      // Update local storage with new user data
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      
      // Show success message
      showStatus('Profile updated successfully!', 'success');
      
      // Update nav username display after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      showStatus(error.message || 'Failed to update profile', 'error');
    }
  });
  
  // Helper function to show status messages
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'mt-4 p-3 rounded-md';
    
    // Reset all styles
    statusMessage.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800', 'animate-pulse');
    
    // Apply appropriate styles based on message type
    switch (type) {
      case 'success':
        statusMessage.classList.add('bg-green-100', 'text-green-800');
        break;
      case 'error':
        statusMessage.classList.add('bg-red-100', 'text-red-800');
        break;
      case 'loading':
        statusMessage.classList.add('bg-blue-100', 'text-blue-800', 'animate-pulse');
        break;
      default:
        statusMessage.classList.add('bg-blue-100', 'text-blue-800');
    }
    
    statusMessage.classList.remove('hidden');
  }
});

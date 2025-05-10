// navigation.js - Consistent navigation bar across all pages
document.addEventListener('DOMContentLoaded', () => {
  // Create the navigation bar element
  const navBar = document.createElement('nav');
  navBar.className = 'bg-blue-600 text-white shadow-md mb-4';
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const username = currentUser?.username || 'User';
  
  // If logged in, show the full navigation
  if (token) {
    // Get current page path
    const currentPath = window.location.pathname;
    
    // Add the navigation content
    navBar.innerHTML = `
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center py-3">
          <div class="flex items-center">
            <a href="/dashboard.html" class="text-xl font-bold">ShareTheRide</a>
          </div>
          <div class="hidden md:flex space-x-6">
            <a href="/dashboard.html" class="py-2 hover:text-blue-200 ${currentPath === '/dashboard.html' ? 'border-b-2 border-white font-bold' : ''}">Dashboard</a>
            <a href="/share.html" class="py-2 hover:text-blue-200 ${currentPath === '/share.html' ? 'border-b-2 border-white font-bold' : ''}">Share a Ride</a>
            <a href="/ask.html" class="py-2 hover:text-blue-200 ${currentPath === '/ask.html' ? 'border-b-2 border-white font-bold' : ''}">Find a Ride</a>
            <a href="/my-rides.html" class="py-2 hover:text-blue-200 ${currentPath === '/my-rides.html' ? 'border-b-2 border-white font-bold' : ''}">My Rides</a>
            <a href="/profile.html" class="py-2 hover:text-blue-200 ${currentPath === '/profile.html' ? 'border-b-2 border-white font-bold' : ''}">Profile</a>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-sm hidden md:inline-block" id="nav-username"></span>
            <button id="nav-logout-btn" class="bg-red-500 hover:bg-red-600 py-1 px-3 rounded text-sm">Logout</button>
          </div>
        </div>
      </div>
    `;
    
    // Add the navigation to the top of the body
    document.body.insertBefore(navBar, document.body.firstChild);
    
    // Display the username in the navigation bar
    const navUsername = document.getElementById('nav-username');
    if (navUsername) {
      navUsername.textContent = username;
    }
    
    // Add logout functionality
    document.getElementById('nav-logout-btn').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      window.location.href = '/index.html';
    });
  } else if (currentPath !== '/index.html') {
    // If not logged in and not on the login page, redirect to login
    window.location.href = '/index.html?error=auth_required';
  }
});

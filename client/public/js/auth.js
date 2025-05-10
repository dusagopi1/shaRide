// Auth state
let isLoginView = true;

// DOM Elements
const authFormContainer = document.getElementById('auth-form-container');

// Check authentication status
function checkAuth() {
  const token = localStorage.getItem('token');
  const isAuthPage = window.location.pathname.includes('index.html');
  
  if (!token && !isAuthPage) {
    window.location.href = '/index.html';
    return false;
  }
  
  if (token && isAuthPage) {
    window.location.href = '/dashboard.html';
  }
  return true;
}

// Handle form submission
async function handleAuthSubmit(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const endpoint = `/api/auth/${isLoginView ? 'login' : 'signup'}`;
  
  // Create request body based on login/signup
  const requestBody = { username, password };
  
  // Add phone for signup
  if (!isLoginView) {
    const phone = document.getElementById('phone').value.trim();
    if (!phone) {
      showError('Phone number is required');
      return;
    }
    requestBody.phone = phone;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Save all user data to localStorage
    localStorage.setItem('token', data.token);
    
    // Save user information including phone
    const userInfo = {
      userId: data.userId,
      username: data.username,
      phone: data.phone
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userInfo));
    console.log('Saved user data:', userInfo);
    
    window.location.href = '/dashboard.html';
    
  } catch (error) {
    console.error('Auth error:', error);
    showError(error.message);
  }
}

// Show error message
function showError(message) {
  const errorElement = document.getElementById('auth-error') || createErrorElement();
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}

function createErrorElement() {
  const div = document.createElement('div');
  div.id = 'auth-error';
  div.className = 'text-red-500 mb-4 hidden';
  authFormContainer.prepend(div);
  return div;
}

// Render auth form
function renderAuthForm() {
  authFormContainer.innerHTML = `
    <h2 class="text-xl font-semibold mb-4 text-center">
      ${isLoginView ? 'Login' : 'Create Account'}
    </h2>
    
    <form id="auth-form" class="space-y-4">
      <input type="text" id="username" placeholder="Username" required
             class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
             
      <input type="password" id="password" placeholder="Password" required
             class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
      
      ${isLoginView ? '' : `
      <input type="tel" id="phone" placeholder="Phone Number" required
             class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
      <p class="text-xs text-gray-500">Phone number will be shared with matched riders/drivers</p>
      `}
             
      <button type="submit"
              class="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
        ${isLoginView ? 'Login' : 'Sign Up'}
      </button>
    </form>
    
    <div class="mt-4 text-center">
      <button type="button" id="toggle-auth"
              class="text-blue-600 hover:text-blue-800 hover:underline">
        ${isLoginView ? 'Need an account? Sign up' : 'Have an account? Login'}
      </button>
    </div>
  `;

  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('toggle-auth').addEventListener('click', toggleAuthView);
}

// Toggle between login/signup
function toggleAuthView() {
  isLoginView = !isLoginView;
  renderAuthForm();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth() && authFormContainer) {
    renderAuthForm();
  }
});
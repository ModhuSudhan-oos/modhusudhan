import { auth } from './firebase-config.js';
import { 
  logoutUser, protectAdminRoute, protectSuperAdminRoute, isSuperAdmin 
} from './auth.js';
import { 
  getTools, addTool, updateTool, deleteTool, uploadFile, deleteFileByUrl,
  getSubscribers, getContactMessages, updateHomepageContent, getHomepageContent
} from './firestore.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
  protectAdminRoute();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) logoutButton.addEventListener('click', logoutUser);

  await onAuthStateChanged(auth, async (user) => {
    if (user) {
      const superAdmin = await isSuperAdmin();
      const adminMenu = document.getElementById('admin-menu');
      if (adminMenu) {
        adminMenu.innerHTML = `
          <li><a href="admin.html" class="block py-2 px-4 rounded hover:bg-indigo-700">Dashboard</a></li>
          <li><a href="admin.html?view=tools" class="block py-2 px-4 rounded hover:bg-indigo-700">Tools</a></li>
          <li><a href="admin.html?view=categories" class="block py-2 px-4 rounded hover:bg-indigo-700">Categories</a></li>
          <li><a href="admin.html?view=faqs" class="block py-2 px-4 rounded hover:bg-indigo-700">FAQs</a></li>
          <li><a href="admin.html?view=testimonials" class="block py-2 px-4 rounded hover:bg-indigo-700">Testimonials</a></li>
          <li><a href="admin.html?view=blog" class="block py-2 px-4 rounded hover:bg-indigo-700">Blog CMS</a></li>
          <li><a href="admin.html?view=team" class="block py-2 px-4 rounded hover:bg-indigo-700">Team</a></li>
          <li><a href="admin.html?view=seo" class="block py-2 px-4 rounded hover:bg-indigo-700">SEO Meta</a></li>
          <li><a href="admin.html?view=analytics" class="block py-2 px-4 rounded hover:bg-indigo-700">Analytics</a></li>
          <li><a href="admin.html?view=subscribers" class="block py-2 px-4 rounded hover:bg-indigo-700">Subscribers</a></li>
          <li><a href="admin.html?view=contact-messages" class="block py-2 px-4 rounded hover:bg-indigo-700">Contact Messages</a></li>
          <li><a href="admin.html?view=homepage" class="block py-2 px-4 rounded hover:bg-indigo-700">Homepage Content</a></li>
        `;
      }
      loadAdminContent();
    }
  });

  // Mobile menu toggle
  const adminMobileMenuButton = document.getElementById('admin-mobile-menu-button');
  const adminMobileMenu = document.getElementById('admin-mobile-menu');
  if (adminMobileMenuButton && adminMobileMenu) {
    adminMobileMenuButton.addEventListener('click', () => {
      adminMobileMenu.classList.toggle('hidden');
    });
  }
});

async function loadAdminContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');
  const mainContentArea = document.getElementById('admin-main-content');
  if (!mainContentArea) return;

  let htmlContent = '';
  let currentModule = '';

  switch (view) {
    case 'tools':
      currentModule = 'Tools';
      htmlContent = await renderToolsModule();
      break;
    case 'subscribers':
      currentModule = 'Subscribers';
      htmlContent = await renderSubscribersModule();
      break;
    case 'contact-messages':
      currentModule = 'Contact Messages';
      htmlContent = await renderContactMessagesModule();
      break;
    case 'homepage':
      currentModule = 'Homepage Content';
      htmlContent = await renderHomepageModule();
      break;
    // ... other cases from your original file
    default:
      currentModule = 'Dashboard';
      htmlContent = await renderDashboard();
  }

  mainContentArea.innerHTML = `
    <h2 class="text-3xl font-bold text-gray-800 mb-6">${currentModule}</h2>
    ${htmlContent}
  `;

  attachAdminEventListeners(view);
}

// New rendering functions
async function renderSubscribersModule() {
  const subscribers = await getSubscribers();
  return `
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Subscribed</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${subscribers.length > 0 ? subscribers.map(sub => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sub.email}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${sub.timestamp?.toDate().toLocaleString() || 'N/A'}
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="2" class="px-6 py-4 text-center text-gray-500">No subscribers yet</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

async function renderContactMessagesModule() {
  const messages = await getContactMessages();
  return `
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${messages.length > 0 ? messages.map(msg => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${msg.name}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${msg.email}</td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${msg.message}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${msg.timestamp?.toDate().toLocaleString() || 'N/A'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${msg.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                  ${msg.status}
                </span>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">No messages yet</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

async function renderHomepageModule() {
  const homepageContent = await getHomepageContent();
  return `
    <form id="homepage-form" class="bg-white p-6 rounded-lg shadow-md">
      <div class="mb-4">
        <label for="homepage-title" class="block text-sm font-medium text-gray-700">Hero Title</label>
        <input type="text" id="homepage-title" value="${homepageContent?.title || ''}" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
      </div>
      <div class="mb-4">
        <label for="homepage-subtitle" class="block text-sm font-medium text-gray-700">Hero Subtitle</label>
        <textarea id="homepage-subtitle" rows="3" 
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">${homepageContent?.subtitle || ''}</textarea>
      </div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
        Update Homepage
      </button>
    </form>
  `;
}

// ... rest of your existing admin-script.js functions

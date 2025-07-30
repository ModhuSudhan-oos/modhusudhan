import { 
  getTools, getCategories, getFeaturedTools, getBlogPosts, getBlogPost, 
  getFaqs, getTeamMembers, recordAffiliateClick, getHomepageContent,
  addSubscriber, submitContactForm
} from './firestore.js';
import { setPageMetaData } from './seo-meta.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Universal UI Logic
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  const path = window.location.pathname;

  // Dynamic Content Loading
  if (path === '/' || path === '/index.html') {
    await setPageMetaData('home');
    await renderHomePage();
  } else if (path.includes('/tool.html')) {
    await setPageMetaData('tool-detail');
    await renderToolDetailPage();
  } else if (path === '/blog.html') {
    await setPageMetaData('blog');
    await renderBlogPage();
  } else if (path.includes('/post.html')) {
    await setPageMetaData('blog-post');
    await renderBlogPostPage();
  } else if (path === '/faq.html') {
    await setPageMetaData('faq');
    await renderFaqPage();
  } else if (path === '/team.html') {
    await setPageMetaData('team');
    await renderTeamPage();
  } else if (path === '/submit-tool.html') {
    await setPageMetaData('submit-tool');
    setupSubmitToolForm();
  } else if (path === '/about.html') {
    await setPageMetaData('about');
    setupContactForm();
  }

  // Setup forms
  setupSubscribeForm();
});

// Updated renderHomePage with dynamic content
async function renderHomePage() {
  const homepageContent = await getHomepageContent();
  
  // Update hero section if exists
  const heroSection = document.querySelector('.bg-indigo-500.text-white.py-20');
  if (heroSection && homepageContent) {
    const h1 = heroSection.querySelector('h1');
    const p = heroSection.querySelector('p');
    if (h1) h1.textContent = homepageContent.title || h1.textContent;
    if (p) p.textContent = homepageContent.subtitle || p.textContent;
  }

  // Rest of your existing renderHomePage implementation...
  const toolsContainer = document.getElementById('tools-container');
  const categoriesContainer = document.getElementById('categories-container');
  const featuredToolsContainer = document.getElementById('featured-tools-container');

  if (toolsContainer) {
    const tools = await getTools();
    toolsContainer.innerHTML = tools.map(tool => `
      <div class="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <img src="${tool.logoURL || 'https://via.placeholder.com/64'}" alt="${tool.name} Logo" class="w-16 h-16 object-contain rounded-full">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">${tool.name}</h3>
          <p class="text-gray-600 line-clamp-2">${tool.description}</p>
          <div class="mt-2">
            ${(tool.tags || []).map(tag => `<span class="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">${tag}</span>`).join('')}
          </div>
          <a href="tool.html?id=${tool.id}" class="mt-3 inline-block text-indigo-600 hover:text-indigo-800 font-medium">Learn More &rarr;</a>
        </div>
      </div>
    `).join('');
  }

  // ... rest of your existing renderHomePage function
}

// New form handling functions
function setupSubscribeForm() {
  const subscribeForms = document.querySelectorAll('.subscribe-form');
  subscribeForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      
      try {
        await addSubscriber(email);
        showMessage('Thank you for subscribing!', 'success');
        form.reset();
      } catch (error) {
        showMessage(error.message || 'Subscription failed. Please try again.', 'error');
      }
    });
  });
}

function setupContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const name = formData.get('name');
      const email = formData.get('email');
      const message = formData.get('message');
      
      try {
        await submitContactForm(name, email, message);
        showMessage('Your message has been sent successfully!', 'success');
        contactForm.reset();
      } catch (error) {
        showMessage(error.message || 'Failed to send message. Please try again.', 'error');
      }
    });
  }
}

// Utility function
function showMessage(message, type = 'success') {
  const messageContainer = document.getElementById('message-container') || 
                         document.getElementById('contact-message-container');
  if (messageContainer) {
    messageContainer.innerHTML = `
      <div class="p-3 mb-4 rounded-md ${type === 'success' ? 
        'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
        ${message}
      </div>
    `;
    setTimeout(() => {
      messageContainer.innerHTML = '';
    }, 5000);
  }
}

// ... rest of your existing script.js functions

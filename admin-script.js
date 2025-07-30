// admin-script.js
import { auth, storage } from './firebase-config.js';
import { logoutUser, protectAdminRoute, protectSuperAdminRoute, isSuperAdmin } from './auth.js';
import {
    getTools, addTool, updateTool, deleteTool, uploadFile, deleteFileByUrl, getTopPerformingTools,
    getCategories, addCategory, updateCategory, deleteCategory,
    getAdminUsers, updateAdminUser,
    getTestimonials, addTestimonial, updateTestimonial, deleteTestimonial,
    getFaqs, addFaq, updateFaq, deleteFaq, // Corrected updateFaq import
    getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost, getBlogPostById, // Added getBlogPostById
    getSeoMeta, addOrUpdateSeoMeta,
    getAffiliateClicks,
    getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember
} from './firestore.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";


// Universal Admin UI Elements & Setup
document.addEventListener('DOMContentLoaded', async () => {
    // Protect all admin panel routes
    protectAdminRoute(); // This sets up the listener, but the subsequent loading depends on it.

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Dynamic admin menu based on user role and load content only after auth state is known
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const superAdmin = await isSuperAdmin();
            const adminMenu = document.getElementById('admin-menu');
            if (adminMenu) {
                if (superAdmin) {
                    // Super admin can see all
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
                    `;
                } else {
                    // Editors/Sub-admins see limited options
                    adminMenu.innerHTML = `
                        <li><a href="admin.html" class="block py-2 px-4 rounded hover:bg-indigo-700">Dashboard</a></li>
                        <li><a href="admin.html?view=tools" class="block py-2 px-4 rounded hover:bg-indigo-700">Tools</a></li>
                        <li><a href="admin.html?view=testimonials" class="block py-2 px-4 rounded hover:bg-indigo-700">Testimonials</a></li>
                    `;
                }
            }
            await loadAdminContent(); // Load content based on URL parameter after menu is set
        }
    });

    // Handle mobile menu for admin panel
    const adminMobileMenuButton = document.getElementById('admin-mobile-menu-button');
    const adminMobileMenu = document.getElementById('admin-mobile-menu');
    if (adminMobileMenuButton && adminMobileMenu) {
        adminMobileMenuButton.addEventListener('click', () => {
            adminMobileMenu.classList.toggle('hidden');
        });
    }

});

// --- Admin Content Loading Function ---
async function loadAdminContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const mainContentArea = document.getElementById('admin-main-content');
    if (!mainContentArea) return;

    let htmlContent = '';
    let currentModule = '';
    const superAdmin = await isSuperAdmin(); // Check super admin status once

    switch (view) {
        case 'tools':
            currentModule = 'Tools';
            htmlContent = await renderToolsModule();
            break;
        case 'add-tool':
            currentModule = 'Add Tool';
            htmlContent = renderAddToolForm();
            break;
        case 'edit-tool':
            currentModule = 'Edit Tool';
            const toolId = urlParams.get('id');
            if (toolId) {
                htmlContent = await renderEditToolForm(toolId);
            } else {
                htmlContent = `<p class="text-red-500">Tool ID missing for editing.</p>`;
            }
            break;
        case 'categories':
            currentModule = 'Categories';
            if (!superAdmin) { // Only super admins can manage categories
                htmlContent = `<p class="text-red-500">You do not have permission to manage categories.</p>`;
            } else {
                htmlContent = await renderCategoriesModule();
            }
            break;
        case 'faqs':
            currentModule = 'FAQs';
            if (!superAdmin) {
                htmlContent = `<p class="text-red-500">You do not have permission to manage FAQs.</p>`;
            } else {
                htmlContent = await renderFaqsModule();
            }
            break;
        case 'testimonials':
            currentModule = 'Testimonials';
            htmlContent = await renderTestimonialsModule();
            break;
        case 'blog':
            currentModule = 'Blog CMS';
            if (!superAdmin) {
                htmlContent = `<p class="text-red-500">You do not have permission to manage the Blog.</p>`;
            } else {
                htmlContent = await renderBlogModule();
            }
            break;
        case 'add-blog-post':
            currentModule = 'Add Blog Post';
            if (!superAdmin) { htmlContent = `<p class="text-red-500">You do not have permission to add blog posts.</p>`; break; }
            htmlContent = renderAddBlogPostForm();
            break;
        case 'edit-blog-post':
            currentModule = 'Edit Blog Post';
            if (!superAdmin) { htmlContent = `<p class="text-red-500">You do not have permission to edit blog posts.</p>`; break; }
            const postId = urlParams.get('id');
            if (postId) {
                htmlContent = await renderEditBlogPostForm(postId);
            } else {
                htmlContent = `<p class="text-red-500">Blog Post ID missing for editing.</p>`;
            }
            break;
        case 'team':
            currentModule = 'Team Members';
            if (!superAdmin) { htmlContent = `<p class="text-red-500">You do not have permission to manage team members.</p>`; break; }
            htmlContent = await renderTeamModule();
            break;
        case 'seo':
            currentModule = 'SEO Meta Editor';
            if (!superAdmin) { htmlContent = `<p class="text-red-500">You do not have permission to manage SEO meta.</p>`; break; }
            htmlContent = await renderSeoModule();
            break;
        case 'analytics':
            currentModule = 'Analytics';
            if (!superAdmin) { htmlContent = `<p class="text-red-500">You do not have permission to view analytics.</p>`; break; }
            htmlContent = await renderAnalyticsModule();
            break;
        default:
            currentModule = 'Dashboard';
            htmlContent = await renderDashboard();
            break;
    }

    mainContentArea.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-6">${currentModule}</h2>
        ${htmlContent}
    `;

    // Re-attach event listeners after content is rendered
    attachAdminEventListeners(view);
}

function showMessage(message, type = 'success') {
    const messageContainer = document.getElementById('admin-message-container');
    if (messageContainer) {
        messageContainer.innerHTML = `<div class="p-3 mb-4 rounded-md ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${message}</div>`;
        setTimeout(() => messageContainer.innerHTML = '', 5000);
    }
}

// --- Dashboard Module ---
async function renderDashboard() {
    const topTools = await getTopPerformingTools(5);
    const totalTools = (await getTools()).length;
    const totalCategories = (await getCategories()).length;
    const totalBlogPosts = (await getBlogPosts()).length;
    const totalFaqs = (await getFaqs()).length;
    const totalTestimonials = (await getTestimonials()).length;

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Total Tools</h3>
                <p class="text-4xl font-bold text-indigo-600">${totalTools}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Total Categories</h3>
                <p class="text-4xl font-bold text-green-600">${totalCategories}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Total Blog Posts</h3>
                <p class="text-4xl font-bold text-purple-600">${totalBlogPosts}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Total FAQs</h3>
                <p class="text-4xl font-bold text-yellow-600">${totalFaqs}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Total Testimonials</h3>
                <p class="text-4xl font-bold text-blue-600">${totalTestimonials}</p>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">Top 5 Performing Tools (by Clicks)</h3>
            <ul class="divide-y divide-gray-200">
                ${topTools.length > 0 ? topTools.map(tool => `
                    <li class="py-3 flex justify-between items-center">
                        <span class="text-gray-700 font-medium">${tool.name}</span>
                        <span class="bg-indigo-100 text-indigo-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">${tool.clicks || 0} Clicks</span>
                    </li>
                `).join('') : '<li class="text-gray-500">No tools with click data yet.</li>'}
            </ul>
        </div>
    `;
}

// --- Tools Module ---
async function renderToolsModule() {
    const tools = await getTools();
    const canEdit = await isSuperAdmin(); // Simplified for now; check 'canEditTools' from adminUser doc if needed
    const isSuper = await isSuperAdmin(); // Only super admin can delete

    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">All Tools</h3>
            <a href="admin.html?view=add-tool" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New Tool</a>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="tools-list">
                    ${tools.length > 0 ? tools.map(tool => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap"><img src="${tool.logoURL || 'https://via.placeholder.com/40'}" alt="${tool.name}" class="w-10 h-10 object-contain rounded-full"></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${tool.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tool.category || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tool.featured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${tool.featured ? 'Yes' : 'No'}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tool.clicks || 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                ${canEdit ? `<a href="admin.html?view=edit-tool&id=${tool.id}" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</a>` : ''}
                                ${isSuper ? `<button class="text-red-600 hover:text-red-900 delete-tool-btn" data-id="${tool.id}" data-logo-url="${tool.logoURL || ''}">Delete</button>` : ''}
                            </td>
                        </tr>
                    `).join('') : `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No tools found.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderAddToolForm() {
    return `
        <div id="admin-message-container" class="mb-4"></div>
        <form id="add-tool-form" class="bg-white p-6 rounded-lg shadow-md">
            <div class="mb-4">
                <label for="name" class="block text-sm font-medium text-gray-700">Tool Name</label>
                <input type="text" id="name" name="name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label for="description" class="block text-sm font-medium text-gray-700">Short Description</label>
                <textarea id="description" name="description" rows="3" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
            <div class="mb-4">
                <label for="url" class="block text-sm font-medium text-gray-700">Website URL</label>
                <input type="url" id="url" name="url" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label for="logo" class="block text-sm font-medium text-gray-700">Tool Logo (Image File)</label>
                <input type="file" id="logo" name="logo" accept="image/*" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
            </div>
            <div class="mb-4">
                <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                <input type="text" id="category" name="category" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label for="tags" class="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                <input type="text" id="tags" name="tags" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., AI, Marketing, CRM">
            </div>
            <div class="mb-4">
                <label for="rating" class="block text-sm font-medium text-gray-700">Rating (1-5)</label>
                <input type="number" id="rating" name="rating" min="1" max="5" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4 flex items-center">
                <input type="checkbox" id="featured" name="featured" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="featured" class="ml-2 block text-sm text-gray-900">Featured Tool</label>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add Tool</button>
        </form>
    `;
}

async function renderEditToolForm(toolId) {
    const tool = await getTool(toolId);
    if (!tool) {
        return `<p class="text-red-500">Tool not found.</p>`;
    }

    return `
        <div id="admin-message-container" class="mb-4"></div>
        <form id="edit-tool-form" class="bg-white p-6 rounded-lg shadow-md">
            <input type="hidden" id="tool-id" value="${tool.id}">
            <input type="hidden" id="current-logo-url" value="${tool.logoURL || ''}">

            <div class="mb-4">
                <label for="name" class="block text-sm font-medium text-gray-700">Tool Name</label>
                <input type="text" id="name" name="name" value="${tool.name}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label for="description" class="block text-sm font-medium text-gray-700">Short Description</label>
                <textarea id="description" name="description" rows="3" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">${tool.description}</textarea>
            </div>
            <div class="mb-4">
                <label for="url" class="block text-sm font-medium text-gray-700">Website URL</label>
                <input type="url" id="url" name="url" value="${tool.url}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Current Logo</label>
                <img src="${tool.logoURL || 'https://via.placeholder.com/64'}" alt="Current Logo" class="w-16 h-16 object-contain rounded-full my-2">
                <label for="logo" class="block text-sm font-medium text-gray-700">Upload New Logo (Optional)</label>
                <input type="file" id="logo" name="logo" accept="image/*" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
            </div>
            <div class="mb-4">
                <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                <input type="text" id="category" name="category" value="${tool.category || ''}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4">
                <label for="tags" class="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                <input type="text" id="tags" name="tags" value="${(tool.tags || []).join(', ')}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., AI, Marketing, CRM">
            </div>
            <div class="mb-4">
                <label for="rating" class="block text-sm font-medium text-gray-700">Rating (1-5)</label>
                <input type="number" id="rating" name="rating" min="1" max="5" value="${tool.rating || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="mb-4 flex items-center">
                <input type="checkbox" id="featured" name="featured" ${tool.featured ? 'checked' : ''} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                <label for="featured" class="ml-2 block text-sm text-gray-900">Featured Tool</label>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Update Tool</button>
        </form>
    `;
}

// --- Categories Module ---
async function renderCategoriesModule() {
    const categories = await getCategories();
    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">Manage Categories</h3>
            <button id="add-category-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New Category</button>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icon</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="categories-list">
                    ${categories.length > 0 ? categories.map(cat => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap"><img src="${cat.icon || 'https://via.placeholder.com/32'}" alt="${cat.name}" class="w-8 h-8 object-contain"></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${cat.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 mr-4 edit-category-btn" data-id="${cat.id}" data-name="${cat.name}" data-icon="${cat.icon || ''}">Edit</button>
                                <button class="text-red-600 hover:text-red-900 delete-category-btn" data-id="${cat.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('') : `<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No categories found.</td></tr>`}
                </tbody>
            </table>
        </div>

        <div id="category-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex justify-center items-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 id="category-modal-title" class="text-2xl font-semibold mb-4 text-gray-800">Add Category</h3>
                <form id="category-form">
                    <input type="hidden" id="category-id">
                    <div class="mb-4">
                        <label for="category-name" class="block text-sm font-medium text-gray-700">Category Name</label>
                        <input type="text" id="category-name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="category-icon" class="block text-sm font-medium text-gray-700">Icon URL (Optional)</label>
                        <input type="url" id="category-icon" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancel-category-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Category</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// --- FAQs Module ---
async function renderFaqsModule() {
    const faqs = await getFaqs();
    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">Manage FAQs</h3>
            <button id="add-faq-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New FAQ</button>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="faqs-list">
                    ${faqs.length > 0 ? faqs.map(faq => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${faq.question}</td>
                            <td class="px-6 py-4 text-sm text-gray-500 line-clamp-2">${faq.answer}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 mr-4 edit-faq-btn" data-id="${faq.id}" data-question="${faq.question}" data-answer="${faq.answer}">Edit</button>
                                <button class="text-red-600 hover:text-red-900 delete-faq-btn" data-id="${faq.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('') : `<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No FAQs found.</td></tr>`}
                </tbody>
            </table>
        </div>

        <div id="faq-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex justify-center items-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 id="faq-modal-title" class="text-2xl font-semibold mb-4 text-gray-800">Add FAQ</h3>
                <form id="faq-form">
                    <input type="hidden" id="faq-id">
                    <div class="mb-4">
                        <label for="faq-question" class="block text-sm font-medium text-gray-700">Question</label>
                        <input type="text" id="faq-question" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="faq-answer" class="block text-sm font-medium text-gray-700">Answer</label>
                        <textarea id="faq-answer" rows="4" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancel-faq-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save FAQ</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// --- Testimonials Module ---
async function renderTestimonialsModule() {
    const testimonials = await getTestimonials();
    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">Manage Testimonials</h3>
            <button id="add-testimonial-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New Testimonial</button>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="testimonials-list">
                    ${testimonials.length > 0 ? testimonials.map(t => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap"><img src="${t.avatar || 'https://via.placeholder.com/32'}" alt="${t.name}" class="w-8 h-8 object-cover rounded-full"></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.company || 'N/A'}</td>
                            <td class="px-6 py-4 text-sm text-gray-500 line-clamp-2">${t.message}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 mr-4 edit-testimonial-btn" data-id="${t.id}" data-name="${t.name}" data-company="${t.company || ''}" data-message="${t.message}" data-avatar="${t.avatar || ''}">Edit</button>
                                <button class="text-red-600 hover:text-red-900 delete-testimonial-btn" data-id="${t.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('') : `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No testimonials found.</td></tr>`}
                </tbody>
            </table>
        </div>

        <div id="testimonial-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex justify-center items-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 id="testimonial-modal-title" class="text-2xl font-semibold mb-4 text-gray-800">Add Testimonial</h3>
                <form id="testimonial-form">
                    <input type="hidden" id="testimonial-id">
                    <div class="mb-4">
                        <label for="testimonial-name" class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="testimonial-name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="testimonial-company" class="block text-sm font-medium text-gray-700">Company (Optional)</label>
                        <input type="text" id="testimonial-company" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="testimonial-message" class="block text-sm font-medium text-gray-700">Message</label>
                        <textarea id="testimonial-message" rows="4" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                    </div>
                    <div class="mb-4">
                        <label for="testimonial-avatar" class="block text-sm font-medium text-gray-700">Avatar URL (Optional)</label>
                        <input type="url" id="testimonial-avatar" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancel-testimonial-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Testimonial</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// --- Blog CMS Module ---
async function renderBlogModule() {
    const blogPosts = await getBlogPosts();
    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">Manage Blog Posts</h3>
            <a href="admin.html?view=add-blog-post" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New Post</a>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="blog-posts-list">
                    ${blogPosts.length > 0 ? blogPosts.map(post => {
                        const postDate = post.date && post.date.seconds ? new Date(post.date.seconds * 1000).toLocaleDateString() : 'N/A';
                        return `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${post.title}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${post.author}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${postDate}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href="admin.html?view=edit-blog-post&id=${post.id}" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</a>
                                    <button class="text-red-600 hover:text-red-900 delete-blog-post-btn" data-id="${post.id}">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('') : `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No blog posts found.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderAddBlogPostForm() {
    return `
        <div id="admin-message-container" class="mb-4"></div>
        <form id="add-blog-post-form" class="bg-white p-6 rounded-lg shadow-md">
            <div class="mb-4">
                <label for="post-title" class="block text-sm font-medium text-gray-700">Post Title</label>
                <input type="text" id="post-title" name="title" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-slug" class="block text-sm font-medium text-gray-700">Slug (for URL)</label>
                <input type="text" id="post-slug" name="slug" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-author" class="block text-sm font-medium text-gray-700">Author</label>
                <input type="text" id="post-author" name="author" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-cover-image" class="block text-sm font-medium text-gray-700">Cover Image URL (Optional)</label>
                <input type="url" id="post-cover-image" name="coverImageURL" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-content" class="block text-sm font-medium text-gray-700">Content</label>
                <textarea id="post-content" name="content" rows="10" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                <p class="text-sm text-gray-500 mt-1">Basic HTML allowed for formatting.</p>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add Post</button>
        </form>
    `;
}

async function renderEditBlogPostForm(postId) {
    const post = await getBlogPostById(postId); // Use the new function to fetch by ID
    if (!post) {
        return `<p class="text-red-500">Blog post not found.</p>`;
    }
    return `
        <div id="admin-message-container" class="mb-4"></div>
        <form id="edit-blog-post-form" class="bg-white p-6 rounded-lg shadow-md">
            <input type="hidden" id="post-id" value="${post.id}">
            <div class="mb-4">
                <label for="post-title" class="block text-sm font-medium text-gray-700">Post Title</label>
                <input type="text" id="post-title" name="title" value="${post.title}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-slug" class="block text-sm font-medium text-gray-700">Slug (for URL)</label>
                <input type="text" id="post-slug" name="slug" value="${post.slug}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-author" class="block text-sm font-medium text-gray-700">Author</label>
                <input type="text" id="post-author" name="author" value="${post.author}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-cover-image" class="block text-sm font-medium text-gray-700">Cover Image URL (Optional)</label>
                <input type="url" id="post-cover-image" name="coverImageURL" value="${post.coverImageURL || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="mb-4">
                <label for="post-content" class="block text-sm font-medium text-gray-700">Content</label>
                <textarea id="post-content" name="content" rows="10" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">${post.content}</textarea>
                <p class="text-sm text-gray-500 mt-1">Basic HTML allowed for formatting.</p>
            </div>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Update Post</button>
        </form>
    `;
}

// --- Team Module ---
async function renderTeamModule() {
    const teamMembers = await getTeamMembers();
    const adminUsers = await getAdminUsers(); // Get existing admin users for role assignment
    const usersWithoutTeamProfile = adminUsers.filter(admin => !teamMembers.some(tm => tm.uid === admin.id)); // Use admin.id as UID

    return `
        <div class="mb-6 flex justify-between items-center">
            <h3 class="text-2xl font-semibold text-gray-800">Manage Team Members</h3>
            <button id="add-team-member-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add New Team Member</button>
        </div>
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="team-members-list">
                    ${teamMembers.length > 0 ? teamMembers.map(member => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap"><img src="${member.avatarURL || 'https://via.placeholder.com/32'}" alt="${member.name}" class="w-8 h-8 object-cover rounded-full"></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.email || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.role}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-indigo-600 hover:text-indigo-900 mr-4 edit-team-member-btn" data-id="${member.id}" data-uid="${member.uid || ''}" data-name="${member.name}" data-email="${member.email || ''}" data-role="${member.role}" data-bio="${member.bio || ''}" data-avatarurl="${member.avatarURL || ''}" data-twitter="${(member.socialLinks && member.socialLinks.twitter) || ''}" data-linkedin="${(member.socialLinks && member.socialLinks.linkedin) || ''}">Edit</button>
                                <button class="text-red-600 hover:text-red-900 delete-team-member-btn" data-id="${member.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('') : `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No team members found.</td></tr>`}
                </tbody>
            </table>
        </div>

        <div id="team-member-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex justify-center items-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 id="team-member-modal-title" class="text-2xl font-semibold mb-4 text-gray-800">Add Team Member</h3>
                <form id="team-member-form">
                    <input type="hidden" id="team-member-id">
                    <input type="hidden" id="team-member-uid">

                    <div class="mb-4">
                        <label for="team-member-email-select" class="block text-sm font-medium text-gray-700">Select Existing Admin (Optional)</label>
                        <select id="team-member-email-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            <option value="">-- Select --</option>
                            ${usersWithoutTeamProfile.map(user => `<option value="${user.id}" data-email="${user.email || ''}">${user.email || 'No Email'}</option>`).join('')}
                        </select>
                        <p class="text-sm text-gray-500 mt-1">Selecting an admin will pre-fill UID and Email.</p>
                    </div>

                    <div class="mb-4">
                        <label for="team-member-name" class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="team-member-name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="team-member-email" class="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="team-member-email" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="team-member-role" class="block text-sm font-medium text-gray-700">Role</label>
                        <input type="text" id="team-member-role" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="team-member-bio" class="block text-sm font-medium text-gray-700">Bio (Optional)</label>
                        <textarea id="team-member-bio" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                    </div>
                    <div class="mb-4">
                        <label for="team-member-avatar-url" class="block text-sm font-medium text-gray-700">Avatar URL (Optional)</label>
                        <input type="url" id="team-member-avatar-url" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                     <div class="mb-4">
                        <label for="team-member-twitter" class="block text-sm font-medium text-gray-700">Twitter (Optional)</label>
                        <input type="url" id="team-member-twitter" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>
                    <div class="mb-4">
                        <label for="team-member-linkedin" class="block text-sm font-medium text-gray-700">LinkedIn (Optional)</label>
                        <input type="url" id="team-member-linkedin" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    </div>

                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancel-team-member-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Team Member</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// --- SEO Meta Editor Module ---
async function renderSeoModule() {
    const homePageMeta = await getSeoMeta('home') || {};
    const blogPageMeta = await getSeoMeta('blog') || {};
    // Add more pages as needed

    return `
        <div id="admin-message-container" class="mb-4"></div>
        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">Home Page SEO</h3>
            <form id="seo-home-form">
                <input type="hidden" id="home-page-id" value="${homePageMeta.id || ''}">
                <div class="mb-4">
                    <label for="home-title" class="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="home-title" value="${homePageMeta.title || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                </div>
                <div class="mb-4">
                    <label for="home-description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="home-description" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">${homePageMeta.description || ''}</textarea>
                </div>
                <div class="mb-4">
                    <label for="home-keywords" class="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
                    <input type="text" id="home-keywords" value="${homePageMeta.keywords || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                </div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Save Home SEO</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">Blog Page SEO</h3>
            <form id="seo-blog-form">
                 <input type="hidden" id="blog-page-id" value="${blogPageMeta.id || ''}">
                <div class="mb-4">
                    <label for="blog-title" class="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="blog-title" value="${blogPageMeta.title || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                </div>
                <div class="mb-4">
                    <label for="blog-description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="blog-description" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">${blogPageMeta.description || ''}</textarea>
                </div>
                <div class="mb-4">
                    <label for="blog-keywords" class="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
                    <input type="text" id="blog-keywords" value="${blogPageMeta.keywords || ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                </div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Save Blog SEO</button>
            </form>
        </div>
        `;
}

// --- Analytics Module ---
async function renderAnalyticsModule() {
    const affiliateClicks = await getAffiliateClicks();
    const tools = await getTools();
    const toolMap = new Map(tools.map(tool => [tool.id, tool.name]));

    const clickStats = {};
    affiliateClicks.forEach(click => {
        const toolName = toolMap.get(click.toolId) || `Unknown Tool (ID: ${click.toolId})`;
        clickStats[toolName] = (clickStats[toolName] || 0) + 1;
    });

    const sortedClickStats = Object.entries(clickStats).sort(([, a], [, b]) => b - a);

    return `
        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">Tool Click Analytics</h3>
            ${sortedClickStats.length > 0 ? `
                <ul class="divide-y divide-gray-200">
                    ${sortedClickStats.map(([toolName, count]) => `
                        <li class="py-3 flex justify-between items-center">
                            <span class="text-gray-700 font-medium">${toolName}</span>
                            <span class="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">${count} Clicks</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="text-gray-500">No click data available yet.</p>'}
        </div>
        `;
}


// --- Event Listener Attachment ---
function attachAdminEventListeners(view) {
    if (view === 'tools') {
        document.querySelectorAll('.delete-tool-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const toolId = e.target.dataset.id;
                const logoUrl = e.target.dataset.logoUrl;
                if (confirm('Are you sure you want to delete this tool?')) {
                    try {
                        await deleteTool(toolId);
                        if (logoUrl) {
                            await deleteFileByUrl(logoUrl); // Delete logo from storage
                        }
                        showMessage('Tool deleted successfully!', 'success');
                        loadAdminContent(); // Refresh the list
                    } catch (error) {
                        console.error("Error deleting tool:", error);
                        showMessage('Error deleting tool.', 'error');
                    }
                }
            });
        });
    } else if (view === 'add-tool') {
        const addToolForm = document.getElementById('add-tool-form');
        if (addToolForm) {
            addToolForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(addToolForm);
                const name = formData.get('name');
                const description = formData.get('description');
                const url = formData.get('url');
                const category = formData.get('category');
                const tags = formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                const rating = parseInt(formData.get('rating')) || 0;
                const featured = formData.get('featured') === 'on';
                const logoFile = formData.get('logo');

                let logoURL = '';
                if (logoFile && logoFile.size > 0) {
                    try {
                        logoURL = await uploadFile(logoFile, 'tool_logos/');
                    } catch (uploadError) {
                        console.error("Error uploading logo:", uploadError);
                        showMessage('Failed to upload logo. Tool not added.', 'error');
                        return;
                    }
                }

                const toolData = { name, description, url, logoURL, category, tags, rating, featured, clicks: 0 };

                try {
                    await addTool(toolData);
                    showMessage('Tool added successfully!', 'success');
                    addToolForm.reset();
                    // Optionally redirect to tools list
                    window.location.href = 'admin.html?view=tools';
                } catch (error) {
                    console.error("Error adding tool:", error);
                    showMessage('Error adding tool.', 'error');
                }
            });
        }
    } else if (view === 'edit-tool') {
        const editToolForm = document.getElementById('edit-tool-form');
        if (editToolForm) {
            editToolForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const toolId = document.getElementById('tool-id').value;
                const currentLogoUrl = document.getElementById('current-logo-url').value;
                const formData = new FormData(editToolForm);
                const name = formData.get('name');
                const description = formData.get('description');
                const url = formData.get('url');
                const category = formData.get('category');
                const tags = formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                const rating = parseInt(formData.get('rating')) || 0;
                const featured = formData.get('featured') === 'on';
                const newLogoFile = formData.get('logo');

                let logoURL = currentLogoUrl; // Start with existing logo URL

                if (newLogoFile && newLogoFile.size > 0) {
                    try {
                        // Delete old logo if it exists
                        if (currentLogoUrl) {
                            await deleteFileByUrl(currentLogoUrl);
                        }
                        // Upload new logo
                        logoURL = await uploadFile(newLogoFile, 'tool_logos/');
                    } catch (uploadError) {
                        console.error("Error uploading new logo:", uploadError);
                        showMessage('Failed to upload new logo. Tool update may be incomplete.', 'error');
                        return;
                    }
                }

                const toolData = { name, description, url, logoURL, category, tags, rating, featured };

                try {
                    await updateTool(toolId, toolData);
                    showMessage('Tool updated successfully!', 'success');
                    window.location.href = 'admin.html?view=tools';
                } catch (error) {
                    console.error("Error updating tool:", error);
                    showMessage('Error updating tool.', 'error');
                }
            });
        }
    } else if (view === 'categories') {
        const categoryModal = document.getElementById('category-modal');
        const categoryForm = document.getElementById('category-form');
        const categoryIdInput = document.getElementById('category-id');
        const categoryNameInput = document.getElementById('category-name');
        const categoryIconInput = document.getElementById('category-icon');
        const categoryModalTitle = document.getElementById('category-modal-title');
        const addCategoryBtn = document.getElementById('add-category-btn');
        const cancelCategoryBtn = document.getElementById('cancel-category-btn');

        addCategoryBtn.addEventListener('click', () => {
            categoryIdInput.value = '';
            categoryNameInput.value = '';
            categoryIconInput.value = '';
            categoryModalTitle.textContent = 'Add Category';
            categoryModal.classList.remove('hidden');
        });

        cancelCategoryBtn.addEventListener('click', () => {
            categoryModal.classList.add('hidden');
        });

        document.querySelectorAll('.edit-category-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                categoryIdInput.value = e.target.dataset.id;
                categoryNameInput.value = e.target.dataset.name;
                categoryIconInput.value = e.target.dataset.icon;
                categoryModalTitle.textContent = 'Edit Category';
                categoryModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const categoryId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this category?')) {
                    try {
                        await deleteCategory(categoryId);
                        showMessage('Category deleted successfully!', 'success');
                        loadAdminContent();
                    } catch (error) {
                        console.error("Error deleting category:", error);
                        showMessage('Error deleting category.', 'error');
                    }
                }
            });
        });

        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = categoryIdInput.value;
            const name = categoryNameInput.value;
            const icon = categoryIconInput.value;
            const categoryData = { name, icon };

            try {
                if (id) {
                    await updateCategory(id, categoryData);
                    showMessage('Category updated successfully!', 'success');
                } else {
                    await addCategory(categoryData);
                    showMessage('Category added successfully!', 'success');
                }
                categoryModal.classList.add('hidden');
                loadAdminContent();
            } catch (error) {
                console.error("Error saving category:", error);
                showMessage('Error saving category.', 'error');
            }
        });
    } else if (view === 'faqs') {
        const faqModal = document.getElementById('faq-modal');
        const faqForm = document.getElementById('faq-form');
        const faqIdInput = document.getElementById('faq-id');
        const faqQuestionInput = document.getElementById('faq-question');
        const faqAnswerInput = document.getElementById('faq-answer');
        const faqModalTitle = document.getElementById('faq-modal-title');
        const addFaqBtn = document.getElementById('add-faq-btn');
        const cancelFaqBtn = document.getElementById('cancel-faq-btn');

        addFaqBtn.addEventListener('click', () => {
            faqIdInput.value = '';
            faqQuestionInput.value = '';
            faqAnswerInput.value = '';
            faqModalTitle.textContent = 'Add FAQ';
            faqModal.classList.remove('hidden');
        });

        cancelFaqBtn.addEventListener('click', () => {
            faqModal.classList.add('hidden');
        });

        document.querySelectorAll('.edit-faq-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                faqIdInput.value = e.target.dataset.id;
                faqQuestionInput.value = e.target.dataset.question;
                faqAnswerInput.value = e.target.dataset.answer;
                faqModalTitle.textContent = 'Edit FAQ';
                faqModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.delete-faq-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const faqId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this FAQ?')) {
                    try {
                        await deleteFaq(faqId);
                        showMessage('FAQ deleted successfully!', 'success');
                        loadAdminContent();
                    } catch (error) {
                        console.error("Error deleting FAQ:", error);
                        showMessage('Error deleting FAQ.', 'error');
                    }
                }
            });
        });

        faqForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = faqIdInput.value;
            const question = faqQuestionInput.value;
            const answer = faqAnswerInput.value;
            const faqData = { question, answer };

            try {
                if (id) {
                    await updateFaq(id, faqData); // Corrected to updateFaq
                    showMessage('FAQ updated successfully!', 'success');
                } else {
                    await addFaq(faqData);
                    showMessage('FAQ added successfully!', 'success');
                }
                faqModal.classList.add('hidden');
                loadAdminContent();
            } catch (error) {
                console.error("Error saving FAQ:", error);
                showMessage('Error saving FAQ.', 'error');
            }
        });
    } else if (view === 'testimonials') {
        const testimonialModal = document.getElementById('testimonial-modal');
        const testimonialForm = document.getElementById('testimonial-form');
        const testimonialIdInput = document.getElementById('testimonial-id');
        const testimonialNameInput = document.getElementById('testimonial-name');
        const testimonialCompanyInput = document.getElementById('testimonial-company');
        const testimonialMessageInput = document.getElementById('testimonial-message');
        const testimonialAvatarInput = document.getElementById('testimonial-avatar');
        const testimonialModalTitle = document.getElementById('testimonial-modal-title');
        const addTestimonialBtn = document.getElementById('add-testimonial-btn');
        const cancelTestimonialBtn = document.getElementById('cancel-testimonial-btn');

        addTestimonialBtn.addEventListener('click', () => {
            testimonialIdInput.value = '';
            testimonialNameInput.value = '';
            testimonialCompanyInput.value = '';
            testimonialMessageInput.value = '';
            testimonialAvatarInput.value = '';
            testimonialModalTitle.textContent = 'Add Testimonial';
            testimonialModal.classList.remove('hidden');
        });

        cancelTestimonialBtn.addEventListener('click', () => {
            testimonialModal.classList.add('hidden');
        });

        document.querySelectorAll('.edit-testimonial-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                testimonialIdInput.value = e.target.dataset.id;
                testimonialNameInput.value = e.target.dataset.name;
                testimonialCompanyInput.value = e.target.dataset.company;
                testimonialMessageInput.value = e.target.dataset.message;
                testimonialAvatarInput.value = e.target.dataset.avatar;
                testimonialModalTitle.textContent = 'Edit Testimonial';
                testimonialModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.delete-testimonial-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const testimonialId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this testimonial?')) {
                    try {
                        await deleteTestimonial(testimonialId);
                        showMessage('Testimonial deleted successfully!', 'success');
                        loadAdminContent();
                    } catch (error) {
                        console.error("Error deleting testimonial:", error);
                        showMessage('Error deleting testimonial.', 'error');
                    }
                }
            });
        });

        testimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = testimonialIdInput.value;
            const name = testimonialNameInput.value;
            const company = testimonialCompanyInput.value;
            const message = testimonialMessageInput.value;
            const avatar = testimonialAvatarInput.value;
            const testimonialData = { name, company, message, avatar };

            try {
                if (id) {
                    await updateTestimonial(id, testimonialData);
                    showMessage('Testimonial updated successfully!', 'success');
                } else {
                    await addTestimonial(testimonialData);
                    showMessage('Testimonial added successfully!', 'success');
                }
                testimonialModal.classList.add('hidden');
                loadAdminContent();
            } catch (error) {
                console.error("Error saving testimonial:", error);
                showMessage('Error saving testimonial.', 'error');
            }
        });
    } else if (view === 'blog') {
        document.querySelectorAll('.delete-blog-post-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const postId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this blog post?')) {
                    try {
                        await deleteBlogPost(postId);
                        showMessage('Blog post deleted successfully!', 'success');
                        loadAdminContent();
                    } catch (error) {
                        console.error("Error deleting blog post:", error);
                        showMessage('Error deleting blog post.', 'error');
                    }
                }
            });
        });
    } else if (view === 'add-blog-post') {
        const addBlogPostForm = document.getElementById('add-blog-post-form');
        if (addBlogPostForm) {
            addBlogPostForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(addBlogPostForm);
                const title = formData.get('title');
                const slug = formData.get('slug');
                const author = formData.get('author');
                const coverImageURL = formData.get('coverImageURL');
                const content = formData.get('content');

                const postData = {
                    title,
                    slug,
                    author,
                    coverImageURL,
                    content,
                    date: new Date()
                };

                try {
                    await addBlogPost(postData);
                    showMessage('Blog post added successfully!', 'success');
                    addBlogPostForm.reset();
                    window.location.href = 'admin.html?view=blog';
                } catch (error) {
                    console.error("Error adding blog post:", error);
                    showMessage('Error adding blog post.', 'error');
                }
            });
        }
    } else if (view === 'edit-blog-post') {
        const editBlogPostForm = document.getElementById('edit-blog-post-form');
        if (editBlogPostForm) {
            editBlogPostForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const postId = document.getElementById('post-id').value;
                const formData = new FormData(editBlogPostForm);
                const title = formData.get('title');
                const slug = formData.get('slug');
                const author = formData.get('author');
                const coverImageURL = formData.get('coverImageURL');
                const content = formData.get('content');

                const postData = {
                    title,
                    slug,
                    author,
                    coverImageURL,
                    content
                }; // Date should not be updated on edit unless explicitly needed

                try {
                    await updateBlogPost(postId, postData);
                    showMessage('Blog post updated successfully!', 'success');
                    window.location.href = 'admin.html?view=blog';
                } catch (error) {
                    console.error("Error updating blog post:", error);
                    showMessage('Error updating blog post.', 'error');
                }
            });
        }
    } else if (view === 'team') {
        const teamMemberModal = document.getElementById('team-member-modal');
        const teamMemberForm = document.getElementById('team-member-form');
        const teamMemberIdInput = document.getElementById('team-member-id');
        const teamMemberUidInput = document.getElementById('team-member-uid');
        const teamMemberNameInput = document.getElementById('team-member-name');
        const teamMemberEmailInput = document.getElementById('team-member-email');
        const teamMemberRoleInput = document.getElementById('team-member-role');
        const teamMemberBioInput = document.getElementById('team-member-bio');
        const teamMemberAvatarUrlInput = document.getElementById('team-member-avatar-url');
        const teamMemberTwitterInput = document.getElementById('team-member-twitter');
        const teamMemberLinkedinInput = document.getElementById('team-member-linkedin');
        const teamMemberEmailSelect = document.getElementById('team-member-email-select');
        const teamMemberModalTitle = document.getElementById('team-member-modal-title');
        const addTeamMemberBtn = document.getElementById('add-team-member-btn');
        const cancelTeamMemberBtn = document.getElementById('cancel-team-member-btn');

        addTeamMemberBtn.addEventListener('click', () => {
            teamMemberIdInput.value = '';
            teamMemberUidInput.value = '';
            teamMemberNameInput.value = '';
            teamMemberEmailInput.value = '';
            teamMemberRoleInput.value = '';
            teamMemberBioInput.value = '';
            teamMemberAvatarUrlInput.value = '';
            teamMemberTwitterInput.value = '';
            teamMemberLinkedinInput.value = '';
            teamMemberEmailSelect.value = ''; // Reset select
            teamMemberModalTitle.textContent = 'Add Team Member';
            teamMemberModal.classList.remove('hidden');
            teamMemberEmailInput.removeAttribute('readonly'); // Make email editable by default for new entries
            teamMemberUidInput.value = ''; // Ensure UID is cleared for new entries
        });

        cancelTeamMemberBtn.addEventListener('click', () => {
            teamMemberModal.classList.add('hidden');
        });

        teamMemberEmailSelect.addEventListener('change', () => {
            const selectedOption = teamMemberEmailSelect.options[teamMemberEmailSelect.selectedIndex];
            if (selectedOption.value) {
                teamMemberUidInput.value = selectedOption.value; // UID is the option's value
                teamMemberEmailInput.value = selectedOption.dataset.email;
                teamMemberEmailInput.setAttribute('readonly', 'true'); // Prevent editing if selected from existing admin
                teamMemberNameInput.value = ''; // Clear name, let user fill
                teamMemberRoleInput.value = ''; // Clear role, let user fill
                teamMemberBioInput.value = '';
                teamMemberAvatarUrlInput.value = '';
                teamMemberTwitterInput.value = '';
                teamMemberLinkedinInput.value = '';
            } else {
                teamMemberUidInput.value = '';
                teamMemberEmailInput.value = '';
                teamMemberEmailInput.removeAttribute('readonly');
            }
        });

        document.querySelectorAll('.edit-team-member-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                teamMemberIdInput.value = e.target.dataset.id;
                teamMemberUidInput.value = e.target.dataset.uid;
                teamMemberNameInput.value = e.target.dataset.name;
                teamMemberEmailInput.value = e.target.dataset.email;
                teamMemberRoleInput.value = e.target.dataset.role;
                teamMemberBioInput.value = e.target.dataset.bio;
                teamMemberAvatarUrlInput.value = e.target.dataset.avatarurl;
                teamMemberTwitterInput.value = e.target.dataset.twitter;
                teamMemberLinkedinInput.value = e.target.dataset.linkedin;
                teamMemberEmailSelect.value = e.target.dataset.uid; // Pre-select if applicable
                teamMemberModalTitle.textContent = 'Edit Team Member';
                teamMemberModal.classList.remove('hidden');
                // If a UID exists, make email readonly as it's tied to an existing admin user
                if (teamMemberUidInput.value) {
                    teamMemberEmailInput.setAttribute('readonly', 'true');
                } else {
                    teamMemberEmailInput.removeAttribute('readonly');
                }
            });
        });

        document.querySelectorAll('.delete-team-member-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const memberId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this team member profile?')) {
                    try {
                        await deleteTeamMember(memberId);
                        showMessage('Team member deleted successfully!', 'success');
                        loadAdminContent();
                    } catch (error) {
                        console.error("Error deleting team member:", error);
                        showMessage('Error deleting team member.', 'error');
                    }
                }
            });
        });

        teamMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = teamMemberIdInput.value;
            const uid = teamMemberUidInput.value || null; // UID from selected admin user, or null if new
            const name = teamMemberNameInput.value;
            const email = teamMemberEmailInput.value;
            const role = teamMemberRoleInput.value;
            const bio = teamMemberBioInput.value;
            const avatarURL = teamMemberAvatarUrlInput.value;
            const twitter = teamMemberTwitterInput.value;
            const linkedin = teamMemberLinkedinInput.value;

            const socialLinks = {};
            if (twitter) socialLinks.twitter = twitter;
            if (linkedin) socialLinks.linkedin = linkedin;

            const memberData = { name, email, role, bio, avatarURL, socialLinks };
            if (uid) memberData.uid = uid; // Only add UID if it exists

            try {
                if (id) {
                    await updateTeamMember(id, memberData);
                    showMessage('Team member updated successfully!', 'success');
                } else {
                    await addTeamMember(memberData);
                    showMessage('Team member added successfully!', 'success');
                }
                teamMemberModal.classList.add('hidden');
                loadAdminContent();
            } catch (error) {
                console.error("Error saving team member:", error);
                showMessage('Error saving team member.', 'error');
            }
        });
    } else if (view === 'seo') {
        const seoHomeForm = document.getElementById('seo-home-form');
        if (seoHomeForm) {
            seoHomeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pageId = document.getElementById('home-page-id').value; // This will be empty for new, or ID for existing
                const title = document.getElementById('home-title').value;
                const description = document.getElementById('home-description').value;
                const keywords = document.getElementById('home-keywords').value;
                const seoData = { title, description, keywords };

                try {
                    await addOrUpdateSeoMeta('home', seoData);
                    showMessage('Home page SEO updated successfully!', 'success');
                    // Reload the content to ensure the ID is updated for subsequent edits
                    await loadAdminContent();
                } catch (error) {
                    console.error("Error updating home page SEO:", error);
                    showMessage('Error updating home page SEO.', 'error');
                }
            });
        }

        const seoBlogForm = document.getElementById('seo-blog-form');
        if (seoBlogForm) {
            seoBlogForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pageId = document.getElementById('blog-page-id').value; // This will be empty for new, or ID for existing
                const title = document.getElementById('blog-title').value;
                const description = document.getElementById('blog-description').value;
                const keywords = document.getElementById('blog-keywords').value;
                const seoData = { title, description, keywords };

                try {
                    await addOrUpdateSeoMeta('blog', seoData);
                    showMessage('Blog page SEO updated successfully!', 'success');
                    // Reload the content to ensure the ID is updated for subsequent edits
                    await loadAdminContent();
                } catch (error) {
                    console.error("Error updating blog page SEO:", error);
                    showMessage('Error updating blog page SEO.', 'error');
                }
            });
        }
    }
}

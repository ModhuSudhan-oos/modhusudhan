// script.js
import { getTools, getCategories, getFeaturedTools, getBlogPosts, getBlogPost, getFaqs, getTeamMembers, recordAffiliateClick, getTool } from './firestore.js'; // Added getTool import
import { setPageMetaData } from './seo-meta.js';

// Global utility for general success/error messages - Moved to global scope as it was already defined globally by window.showMessage
function showMessage(message, type = 'success') {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        messageContainer.innerHTML = `<div class="p-3 mb-4 rounded-md ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${message}</div>`;
        setTimeout(() => messageContainer.innerHTML = '', 5000);
    }
}
window.showMessage = showMessage; // Make it globally accessible for HTML inline calls if needed

// Global function for FAQ toggling - Moved to global scope
window.toggleFaq = (id) => {
    const content = document.getElementById(id);
    // Extract the index from the id string, e.g., 'faq-0' -> '0'
    const index = id.split('-')[1];
    const icon = document.getElementById(`faq-icon-${index}`);

    if (content && icon) {
        content.classList.toggle('hidden');
        icon.classList.toggle('rotate-45');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Universal UI Logic (e.g., mobile menu toggle)
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    const path = window.location.pathname;

    // --- Dynamic Content Loading based on Page ---

    if (path === '/' || path === '/index.html') {
        await setPageMetaData('home');
        renderHomePage();
    } else if (path.includes('/tool.html')) {
        // SEO metadata for tool detail page will be set inside renderToolDetailPage dynamically
        renderToolDetailPage();
    } else if (path === '/blog.html') {
        await setPageMetaData('blog');
        renderBlogPage();
    } else if (path.includes('/post.html')) {
        // SEO metadata for blog post page will be set inside renderBlogPostPage dynamically
        renderBlogPostPage();
    } else if (path === '/faq.html') {
        await setPageMetaData('faq');
        renderFaqPage();
    } else if (path === '/team.html') {
        await setPageMetaData('team');
        renderTeamPage();
    } else if (path === '/submit-tool.html') {
        await setPageMetaData('submit-tool');
        setupSubmitToolForm();
    }
    // Add more conditions for other frontend pages (compare.html, about.html, privacy.html, terms.html)
    // and call their respective rendering functions.
});

async function renderHomePage() {
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
                    <a href="tool.html?id=${tool.id}" class="mt-3 inline-block text-indigo-600 hover:text-indigo-800 font-medium" data-tool-id="${tool.id}">Learn More &rarr;</a>
                </div>
            </div>
        `).join('');

        // Attach click listeners for affiliate links after rendering
        toolsContainer.querySelectorAll('a[data-tool-id]').forEach(link => {
            link.addEventListener('click', (event) => {
                const toolId = link.dataset.toolId;
                if (toolId) { // Ensure toolId exists before recording
                    recordAffiliateClick(toolId);
                }
            });
        });
    }

    if (categoriesContainer) {
        const categories = await getCategories();
        categoriesContainer.innerHTML = categories.map(category => `
            <a href="#" class="block bg-gray-100 p-4 rounded-lg text-center hover:bg-gray-200 transition">
                <img src="${category.icon || 'https://via.placeholder.com/48'}" alt="${category.name} Icon" class="w-12 h-12 mx-auto mb-2">
                <span class="font-medium text-gray-800">${category.name}</span>
            </a>
        `).join('');
    }

    if (featuredToolsContainer) {
        const featuredTools = await getFeaturedTools();
        featuredToolsContainer.innerHTML = featuredTools.map(tool => `
            <div class="bg-yellow-50 p-6 rounded-lg shadow-md border border-yellow-200">
                <div class="flex items-center space-x-4 mb-3">
                    <img src="${tool.logoURL || 'https://via.placeholder.com/50'}" alt="${tool.name} Logo" class="w-12 h-12 object-contain rounded-full">
                    <h4 class="text-lg font-semibold text-gray-900">${tool.name}</h4>
                </div>
                <p class="text-gray-700 line-clamp-3">${tool.description}</p>
                <a href="${tool.url}" target="_blank" rel="noopener noreferrer" data-tool-id="${tool.id}" class="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Visit Tool</a>
            </div>
        `).join('');

        featuredToolsContainer.querySelectorAll('a[data-tool-id]').forEach(link => {
            link.addEventListener('click', (event) => {
                const toolId = link.dataset.toolId;
                if (toolId) { // Ensure toolId exists before recording
                    recordAffiliateClick(toolId);
                }
            });
        });
    }
}

async function renderToolDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('id');
    const toolDetailContainer = document.getElementById('tool-detail-container');

    if (!toolId || !toolDetailContainer) {
        toolDetailContainer.innerHTML = '<p class="text-center text-red-500">Tool ID missing or container not found.</p>';
        return;
    }

    const tool = await getTool(toolId);

    if (tool) {
        // Update SEO metadata for the specific tool page
        await setPageMetaData('tool-detail', { // Use a generic page name for fetching, then override
            title: `${tool.name} - SaaS Tool Directory`,
            description: tool.description,
            keywords: `${tool.name}, ${(tool.tags || []).join(', ')}, ${tool.category}, SaaS`
        });

        toolDetailContainer.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-lg">
                <div class="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                    <img src="${tool.logoURL || 'https://via.placeholder.com/128'}" alt="${tool.name} Logo" class="w-32 h-32 object-contain rounded-full shadow-md">
                    <div class="text-center md:text-left">
                        <h1 class="text-4xl font-extrabold text-gray-900 mb-2">${tool.name}</h1>
                        <p class="text-gray-700 text-lg mb-4">${tool.description}</p>
                        <div class="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                            ${(tool.tags || []).map(tag => `<span class="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">${tag}</span>`).join('')}
                            <span class="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">${tool.category}</span>
                        </div>
                        <div class="flex items-center justify-center md:justify-start mb-6">
                            <span class="text-yellow-500 text-xl mr-2">${'⭐'.repeat(tool.rating || 0)}</span>
                            <span class="text-gray-600 text-lg">(${tool.rating || 0}/5 Rating)</span>
                        </div>
                        <a href="${tool.url}" target="_blank" rel="noopener noreferrer" data-tool-id="${tool.id}" class="inline-block bg-indigo-600 text-white text-xl font-bold px-8 py-3 rounded-lg shadow-md hover:bg-indigo-700 transition transform hover:scale-105">
                            Visit Official Website &rarr;
                        </a>
                    </div>
                </div>

                <div class="mt-10 pt-8 border-t border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">More Details</h2>
                    <p class="text-gray-700 leading-relaxed">${tool.fullDescription || 'No additional description provided.'}</p>
                    </div>
            </div>
        `;
        // Attach event listener after rendering content
        toolDetailContainer.querySelector('a[data-tool-id]').addEventListener('click', () => {
            recordAffiliateClick(toolId);
        });
    } else {
        toolDetailContainer.innerHTML = '<p class="text-center text-red-500">Tool not found.</p>';
    }
}

async function renderBlogPage() {
    const blogPostsContainer = document.getElementById('blog-posts-container');
    if (blogPostsContainer) {
        const posts = await getBlogPosts();
        blogPostsContainer.innerHTML = posts.map(post => {
            const postDate = post.date && post.date.seconds ? new Date(post.date.seconds * 1000).toLocaleDateString() : 'N/A';
            return `
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <img src="${post.coverImageURL || 'https://via.placeholder.com/400x250'}" alt="${post.title}" class="w-full h-48 object-cover">
                    <div class="p-6">
                        <h3 class="text-2xl font-semibold text-gray-900 mb-2">${post.title}</h3>
                        <p class="text-gray-600 text-sm mb-3">By ${post.author} on ${postDate}</p>
                        <p class="text-gray-700 line-clamp-3">${post.content.substring(0, 150)}...</p>
                        <a href="post.html?slug=${post.slug}" class="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium">Read More &rarr;</a>
                    </div>
                </div>
            `;
        }).join('');
    }
}

async function renderBlogPostPage() {
    const params = new URLSearchParams(window.location.search);
    const postSlug = params.get('slug');
    const blogPostContainer = document.getElementById('blog-post-container');

    if (!postSlug || !blogPostContainer) {
        blogPostContainer.innerHTML = '<p class="text-center text-red-500">Blog post slug missing or container not found.</p>';
        return;
    }

    const post = await getBlogPost(postSlug); // getBlogPost correctly fetches by slug

    if (post) {
        await setPageMetaData('blog-post', { // Use a generic page name for fetching, then override
            title: `${post.title} - Blog`,
            description: post.content.substring(0, 160),
            keywords: `${post.title}, blog, ${post.author}`
        });

        const postDate = post.date && post.date.seconds ? new Date(post.date.seconds * 1000).toLocaleDateString() : 'N/A';

        blogPostContainer.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-lg">
                <img src="${post.coverImageURL || 'https://via.placeholder.com/800x400'}" alt="${post.title}" class="w-full h-72 object-cover rounded-lg mb-6">
                <h1 class="text-4xl font-extrabold text-gray-900 mb-3">${post.title}</h1>
                <p class="text-gray-600 text-sm mb-6">By ${post.author} on ${postDate}</p>
                <div class="prose max-w-none text-gray-800 leading-relaxed" id="post-content">
                    ${post.content}
                </div>
            </div>
        `;
    } else {
        blogPostContainer.innerHTML = '<p class="text-center text-red-500">Blog post not found.</p>';
    }
}

async function renderFaqPage() {
    const faqContainer = document.getElementById('faq-container');
    if (faqContainer) {
        const faqs = await getFaqs();
        faqContainer.innerHTML = faqs.map((faq, index) => `
            <div class="border-b border-gray-200 py-4">
                <button class="flex justify-between items-center w-full text-left font-semibold text-lg text-gray-900" onclick="toggleFaq('faq-${index}')">
                    ${faq.question}
                    <span id="faq-icon-${index}" class="transform transition-transform duration-200">+</span>
                </button>
                <div id="faq-${index}" class="mt-2 text-gray-700 hidden">
                    ${faq.answer}
                </div>
            </div>
        `).join('');
        // toggleFaq is now global, no need to define it here
    }
}

async function renderTeamPage() {
    const teamMembersContainer = document.getElementById('team-members-container');
    if (teamMembersContainer) {
        const teamMembers = await getTeamMembers();
        teamMembersContainer.innerHTML = teamMembers.map(member => `
            <div class="bg-white rounded-lg shadow-md p-6 text-center">
                <img src="${member.avatarURL || 'https://via.placeholder.com/120'}" alt="${member.name}" class="w-32 h-32 rounded-full mx-auto mb-4 object-cover">
                <h3 class="text-xl font-semibold text-gray-900">${member.name}</h3>
                <p class="text-indigo-600 mb-2">${member.role}</p>
                <p class="text-gray-600 text-sm">${member.bio || 'No bio available.'}</p>
                ${member.socialLinks && (member.socialLinks.twitter || member.socialLinks.linkedin) ? `
                    <div class="mt-4 flex justify-center space-x-4">
                        ${member.socialLinks.twitter ? `<a href="${member.socialLinks.twitter}" target="_blank" class="text-blue-400 hover:text-blue-600">Twitter</a>` : ''}
                        ${member.socialLinks.linkedin ? `<a href="${member.socialLinks.linkedin}" target="_blank" class="text-blue-700 hover:text-blue-900">LinkedIn</a>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
}

function setupSubmitToolForm() {
    const submitToolForm = document.getElementById('submit-tool-form');
    if (submitToolForm) {
        submitToolForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(submitToolForm);
            const toolData = {
                name: formData.get('tool-name'),
                url: formData.get('tool-url'),
                description: formData.get('tool-description'),
                category: formData.get('tool-category'),
                tags: formData.get('tool-tags').split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
                logoURL: formData.get('tool-logo-url') || '', // If direct URL is provided
                status: 'pending' // Mark as pending for admin review
            };

            // Basic validation
            if (!toolData.name || !toolData.url || !toolData.description || !toolData.category) {
                showMessage('Please fill in all required fields.', 'error');
                return;
            }

            try {
                // In a real scenario, you'd likely want to upload the logo via the admin panel
                // or have a more robust submission process including user accounts.
                // For this example, if a direct URL is provided, we use it.
                // If you want file uploads, it would need server-side or more complex client-side logic.
                await addTool(toolData);
                showMessage('Tool submitted successfully! It will be reviewed by an administrator.', 'success');
                submitToolForm.reset();
            } catch (error) {
                console.error("Error submitting tool:", error);
                showMessage('There was an error submitting your tool. Please try again.', 'error');
            }
        });
    }
                                                                                                     }

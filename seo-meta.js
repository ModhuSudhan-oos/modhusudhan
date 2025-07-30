// seo-meta.js
import { getSeoMeta } from './firestore.js';

/**
 * Sets page metadata (title, description, keywords).
 * Can override fetched meta with provided data.
 * @param {string} pageName - The name of the page to fetch SEO meta for (e.g., 'home', 'blog').
 * @param {Object} [overrideMeta] - Optional object to override fetched metaData (e.g., { title, description, keywords }).
 */
async function setPageMetaData(pageName, overrideMeta = {}) {
    const metaData = await getSeoMeta(pageName);
    const finalMetaData = { ...metaData, ...overrideMeta }; // Merge fetched with override

    if (finalMetaData) {
        document.title = finalMetaData.title || document.title;
        const descriptionTag = document.querySelector('meta[name="description"]');
        if (descriptionTag) descriptionTag.setAttribute('content', finalMetaData.description || '');
        const keywordsTag = document.querySelector('meta[name="keywords"]');
        if (keywordsTag) keywordsTag.setAttribute('content', finalMetaData.keywords || '');
        // You can add more meta tags here as needed (e.g., og:title, twitter:card)
    }
}

export { setPageMetaData };

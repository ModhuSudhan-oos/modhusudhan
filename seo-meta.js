// seo-meta.js
import { getSeoMeta } from './firestore.js';

async function setPageMetaData(pageName) {
    const metaData = await getSeoMeta(pageName);
    if (metaData) {
        document.title = metaData.title || document.title;
        const descriptionTag = document.querySelector('meta[name="description"]');
        if (descriptionTag) descriptionTag.setAttribute('content', metaData.description || '');
        const keywordsTag = document.querySelector('meta[name="keywords"]');
        if (keywordsTag) keywordsTag.setAttribute('content', metaData.keywords || '');
        // You can add more meta tags here as needed (e.g., og:title, twitter:card)
    }
}

export { setPageMetaData };

// firestore.js
import { db, storage } from './firebase-config.js';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// --- General CRUD Operations ---

/**
 * Fetches all documents from a collection.
 * @param {string} collectionName
 * @returns {Promise<Array>}
 */
async function getAllDocuments(collectionName) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches a single document by ID from a collection.
 * @param {string} collectionName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getDocumentById(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
}

/**
 * Adds a new document to a collection.
 * @param {string} collectionName
 * @param {Object} data
 * @returns {Promise<string>} - The ID of the new document.
 */
async function addDocument(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
}

/**
 * Updates an existing document in a collection.
 * @param {string} collectionName
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function updateDocument(collectionName, id, data) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
}

/**
 * Deletes a document from a collection.
 * @param {string} collectionName
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteDocument(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}

// --- Specific Collection Operations ---

// Tools
async function getTools() { return getAllDocuments("tools"); }
async function getTool(id) { return getDocumentById("tools", id); }
async function addTool(data) { return addDocument("tools", data); }
async function updateTool(id, data) { return updateDocument("tools", id, data); }
async function deleteTool(id) { return deleteDocument("tools", id); }
async function getFeaturedTools() {
    const q = query(collection(db, "tools"), where("featured", "==", true), limit(5));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function getTopPerformingTools(limitCount = 10) {
    const q = query(collection(db, "tools"), orderBy("clicks", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// Categories
async function getCategories() { return getAllDocuments("categories"); }
async function getCategory(id) { return getDocumentById("categories", id); }
async function addCategory(data) { return addDocument("categories", data); }
async function updateCategory(id, data) { return updateDocument("categories", id, data); }
async function deleteCategory(id) { return deleteDocument("categories", id); }

// Admin Users
async function getAdminUsers() { return getAllDocuments("adminUsers"); }
async function getAdminUser(uid) { return getDocumentById("adminUsers", uid); }
async function addAdminUser(uid, data) { // For adding new admin users with specific UID
    const docRef = doc(db, "adminUsers", uid);
    // Use set with merge: true to create the document if it doesn't exist, or merge if it does.
    await setDoc(docRef, data, { merge: true });
}
async function updateAdminUser(uid, data) { return updateDocument("adminUsers", uid, data); }
async function deleteAdminUser(uid) { return deleteDocument("adminUsers", uid); }

// Team Members
async function getTeamMembers() { return getAllDocuments("teamMembers"); }
async function getTeamMember(id) { return getDocumentById("teamMembers", id); }
async function addTeamMember(data) { return addDocument("teamMembers", data); }
async function updateTeamMember(id, data) { return updateDocument("teamMembers", id, data); }
async function deleteTeamMember(id) { return deleteDocument("teamMembers", id); }

// Testimonials
async function getTestimonials() { return getAllDocuments("testimonials"); }
async function getTestimonial(id) { return getDocumentById("testimonials", id); }
async function addTestimonial(data) { return addDocument("testimonials", data); }
async function updateTestimonial(id, data) { return updateDocument("testimonials", id, data); }
async function deleteTestimonial(id) { return deleteDocument("testimonials", id); }

// FAQs
async function getFaqs() { return getAllDocuments("faqs"); }
async function getFaq(id) { return getDocumentById("faqs", id); }
async function addFaq(data) { return addDocument("faqs", data); }
async function updateFaq(id, data) { return updateDocument("faqs", id, data); } // Corrected function name
async function deleteFaq(id) { return deleteDocument("faqs", id); }

// Blog Posts
async function getBlogPosts() {
    const q = query(collection(db, "blogPosts"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function getBlogPost(slug) { // Fetches by slug for public site
    const q = query(collection(db, "blogPosts"), where("slug", "==", slug));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    return null;
}
async function getBlogPostById(id) { // New function to fetch by ID for admin panel
    return getDocumentById("blogPosts", id);
}
async function addBlogPost(data) { return addDocument("blogPosts", data); }
async function updateBlogPost(id, data) { return updateDocument("blogPosts", id, data); }
async function deleteBlogPost(id) { return deleteDocument("blogPosts", id); }

// SEO Meta
async function getSeoMeta(page) {
    const q = query(collection(db, "seoMeta"), where("page", "==", page));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    return null;
}
async function addOrUpdateSeoMeta(page, data) {
    const existing = await getSeoMeta(page);
    if (existing) {
        return updateDocument("seoMeta", existing.id, data);
    } else {
        return addDocument("seoMeta", { page, ...data });
    }
}
async function deleteSeoMeta(id) { return deleteDocument("seoMeta", id); }

// Affiliate Clicks
async function recordAffiliateClick(toolId) {
    const data = {
        toolId,
        timestamp: new Date(),
        ipAddress: "N/A", // In a real app, you'd get this from server-side. For client-side, this is difficult due to privacy.
        userAgent: navigator.userAgent
    };
    await addDocument("affiliateClicks", data);
    // Increment clicks on the tool itself
    const toolDocRef = doc(db, "tools", toolId);
    const toolSnap = await getDoc(toolDocRef);
    if (toolSnap.exists()) {
        const currentClicks = toolSnap.data().clicks || 0;
        await updateDoc(toolDocRef, { clicks: currentClicks + 1 });
    }
}

async function getAffiliateClicks(toolId = null) {
    let q = collection(db, "affiliateClicks");
    if (toolId) {
        q = query(q, where("toolId", "==", toolId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Firebase Storage Operations ---

/**
 * Uploads a file to Firebase Storage.
 * @param {File} file - The file to upload.
 * @param {string} path - The storage path (e.g., "tool_logos/").
 * @returns {Promise<string>} - The download URL of the uploaded file.
 */
async function uploadFile(file, path) {
    const storageRef = ref(storage, path + file.name);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

/**
 * Deletes a file from Firebase Storage given its download URL.
 * @param {string} fileUrl - The download URL of the file to delete.
 * @returns {Promise<void>}
 */
async function deleteFileByUrl(fileUrl) {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
}


export {
    // General
    getAllDocuments, getDocumentById, addDocument, updateDocument, deleteDocument,
    // Specific
    getTools, getTool, addTool, updateTool, deleteTool, getFeaturedTools, getTopPerformingTools,
    getCategories, getCategory, addCategory, updateCategory, deleteCategory,
    getAdminUsers, getAdminUser, addAdminUser, updateAdminUser, deleteAdminUser,
    getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember,
    getTestimonials, getTestimonial, addTestimonial, updateTestimonial, deleteTestimonial,
    getFaqs, getFaq, addFaq, updateFaq, deleteFaq, // Corrected updateFaq export
    getBlogPosts, getBlogPost, getBlogPostById, addBlogPost, updateBlogPost, deleteBlogPost, // Added getBlogPostById
    getSeoMeta, addOrUpdateSeoMeta, deleteSeoMeta,
    recordAffiliateClick, getAffiliateClicks,
    // Storage
    uploadFile, deleteFileByUrl
};

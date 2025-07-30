import { db, storage, functions } from './firebase-config.js';
import { 
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, 
  query, where, orderBy, limit, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

// General CRUD Operations
async function getAllDocuments(collectionName) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getDocumentById(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

async function addDocument(collectionName, data) {
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
}

async function updateDocument(collectionName, id, data) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

async function deleteDocument(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

// Homepage Content
async function getHomepageContent() {
  const docRef = doc(db, 'homepageContent', 'hero');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

async function updateHomepageContent(data) {
  const docRef = doc(db, 'homepageContent', 'hero');
  await setDoc(docRef, data, { merge: true });
}

// Subscribers
async function addSubscriber(email) {
  const data = {
    email,
    timestamp: serverTimestamp(),
    ipAddress: await getClientIP() || 'unknown'
  };
  return addDocument('subscribers', data);
}

async function getSubscribers() {
  const q = query(collection(db, 'subscribers'), orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Contact Form
async function submitContactForm(name, email, message) {
  const submitContact = httpsCallable(functions, 'submitContactForm');
  try {
    const result = await submitContact({
      name,
      email,
      message,
      ipAddress: await getClientIP() || 'unknown'
    });
    return result.data;
  } catch (error) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
}

async function getContactMessages() {
  const q = query(collection(db, 'contactMessages'), orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Helper Functions
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Could not get IP address:", error);
    return null;
  }
}

// Export all functions
export {
  // General
  getAllDocuments, getDocumentById, addDocument, updateDocument, deleteDocument,
  
  // Homepage
  getHomepageContent, updateHomepageContent,
  
  // Subscribers
  addSubscriber, getSubscribers,
  
  // Contact Form
  submitContactForm, getContactMessages,
  
  // Existing exports from your original file
  getTools, getTool, addTool, updateTool, deleteTool, getFeaturedTools, getTopPerformingTools,
  getCategories, getCategory, addCategory, updateCategory, deleteCategory,
  getAdminUsers, getAdminUser, addAdminUser, updateAdminUser, deleteAdminUser,
  getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember,
  getTestimonials, getTestimonial, addTestimonial, updateTestimonial, deleteTestimonial,
  getFaqs, getFaq, addFaq, updateFaq, deleteFaq,
  getBlogPosts, getBlogPost, addBlogPost, updateBlogPost, deleteBlogPost,
  getSeoMeta, addOrUpdateSeoMeta, deleteSeoMeta,
  recordAffiliateClick, getAffiliateClicks,
  uploadFile, deleteFileByUrl
};

// auth.js (No changes needed, but included for completeness)
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const SUPER_ADMIN_UIDS = {
    'PjtAITuXjLYN6A1NX4pzy9KEZwJ3': true, // toolgenixs@gmail.com
    'vuY4TfTHdyRmltDUWCQerWGEyEG3': true, // sushantor360@gmail.com
    // Add other super admin UIDs here if needed
};

/**
 * Logs in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

/**
 * Logs out the current user.
 * @returns {Promise<void>}
 */
async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = '/login.html'; // Redirect to login page after logout
    } catch (error) {
        console.error("Logout error:", error);
        throw error;
    }
}

/**
 * Checks if the current user is an admin.
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    const user = auth.currentUser;
    if (!user) {
        return false;
    }
    const userDocRef = doc(db, "adminUsers", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    // An admin user is someone who has an entry in adminUsers collection
    return userDocSnap.exists();
}

/**
 * Checks if the current user is a super admin.
 * @returns {Promise<boolean>}
 */
async function isSuperAdmin() {
    const user = auth.currentUser;
    if (!user) {
        return false;
    }
    // Check if the user's UID is in the hardcoded super admin list
    if (SUPER_ADMIN_UIDS[user.uid]) {
        return true;
    }

    const userDocRef = doc(db, "adminUsers", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() && userDocSnap.data().isSuperAdmin === true;
}


/**
 * Protects an admin route. Redirects to login if not authenticated or not admin.
 * @param {string} redirectUrl - URL to redirect to if not authorized.
 */
function protectAdminRoute(redirectUrl = '/login.html') {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = redirectUrl;
            return;
        }
        const userDocRef = doc(db, "adminUsers", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        // User must exist in adminUsers collection to access admin panel
        if (!userDocSnap.exists()) {
            alert('You do not have permission to access this page.');
            window.location.href = redirectUrl;
        }
        // Additional checks like `canEditTools` should be done at the module level
    });
}

/**
 * Protects super admin routes. Redirects to admin dashboard if not super admin.
 * @param {string} redirectUrl - URL to redirect to if not super admin.
 */
function protectSuperAdminRoute(redirectUrl = '/admin.html') {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        const userDocRef = doc(db, "adminUsers", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists() || !userDocSnap.data().isSuperAdmin) {
            alert('You do not have super admin privileges to access this page.');
            window.location.href = redirectUrl;
        }
    });
}


export { loginUser, logoutUser, isAdmin, isSuperAdmin, protectAdminRoute, protectSuperAdminRoute, auth };

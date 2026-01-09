import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = { apiKey: "AIzaSyDerc9e0-e7WBnkK2GoinFejp7zszXJ3Jc", authDomain: "songho-8ef5c.firebaseapp.com", projectId: "songho-8ef5c", storageBucket: "songho-8ef5c.appspot.com", messagingSenderId: "489031747232", appId: "1:489031747232:web:4c1cde63dabaa620ed2bc5", measurementId: "G-5NY15E3XJJ" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const pageContent = document.getElementById('page-content');
const navItems = document.querySelectorAll('.nav-item');

let currentUser = null;

// --- Global Helper Functions ---
window.showError = (element, message) => {
    element.innerHTML = `<p class="error-message">${message}</p>`;
};
window.openModal = (modalId) => {
    if (currentUser && currentUser.isAnonymous && modalId === 'proofSubmissionModal') {
        alert('রেজিস্টার্ড সদস্য না হওয়ায় আপনি প্রমাণ জমা দিতে পারবেন না।');
        return;
    }
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = "block";
};
window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = "none";
};
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// --- Auth and Page Loading Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.body.style.display = 'block';

        if (user.isAnonymous) {
            document.getElementById('logoutBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i><span>লগইন</span>';
        } else {
            document.getElementById('logoutBtn').innerHTML = '<i class="fas fa-sign-out-alt"></i><span>লগআউট</span>';
            const userDocRef = doc(db, "members", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                 window.location.replace('complete-profile.html');
                 return;
            }
        }
        
        loadPage('home');
    } else {
        window.location.replace('index.html');
    }
});

navItems.forEach(item => {
    const pageName = item.dataset.page;
    if (pageName) {
        item.addEventListener('click', () => loadPage(pageName));
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).catch(error => console.error("Sign out error", error));
});

export async function loadPage(pageName) {
    navItems.forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === pageName);
    });

    pageContent.innerHTML = '<p style="text-align:center; margin-top: 50px;">লোড হচ্ছে...</p>';

    try {
        const response = await fetch(`components/${pageName}-section.html`);
        if (!response.ok) throw new Error(`HTML Load Error: ${response.statusText}`);
        pageContent.innerHTML = await response.text();

        const pageModule = await import(`./${pageName}.js`);
        await pageModule.init(db, currentUser);
    } catch (error) {
        console.error(`Error loading page '${pageName}':`, error);
        pageContent.innerHTML = `<div class="card" style="text-align:center;"><h2 style="color:var(--error-color);">একটি সমস্যা হয়েছে!</h2><p>এই পৃষ্ঠাটি লোড করা সম্ভব হচ্ছে না।</p><p style="color:var(--light-text); font-size: 0.8rem;">ত্রুটি: ${error.message}</p></div>`;
    }
}

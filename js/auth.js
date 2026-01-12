// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDerc9e0-e7WBnkK2GoinFejp7zszXJ3Jc",
    authDomain: "songho-8ef5c.firebaseapp.com",
    projectId: "songho-8ef5c",
    storageBucket: "songho-8ef5c.appspot.com",
    messagingSenderId: "489031747232",
    appId: "1:489031747232:web:4c1cde63dabaa620ed2bc5",
    measurementId: "G-5NY15E3XJJ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initEventListeners();
        this.checkAuthState();
    }
    
    initEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('guestForm')?.addEventListener('submit', (e) => this.handleGuest(e));
        
        // Google login
        document.getElementById('googleLogin')?.addEventListener('click', () => this.handleGoogleLogin());
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePassword(e));
        });
    }
    
    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });
    }
    
    togglePassword(e) {
        const icon = e.target.closest('i');
        const input = e.target.closest('.form-group').querySelector('input[type="password"], input[type="text"]');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        const loginId = document.getElementById('loginId').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Check if input is email or phone
            let userCredential;
            if (loginId.includes('@')) {
                // Email login
                userCredential = await auth.signInWithEmailAndPassword(loginId, password);
            } else {
                // Phone login - Firebase phone auth setup needed
                throw new Error("ফোন নম্বর দিয়ে লগইন এখনো চালু হয়নি");
            }
            
            this.currentUser = userCredential.user;
            
            // Check if profile is complete
            const userDoc = await db.collection('members').doc(this.currentUser.uid).get();
            if (!userDoc.exists) {
                window.location.href = 'complete-profile.html';
            } else {
                window.location.href = 'user.html';
            }
            
        } catch (error) {
            this.showError('loginForm', this.getErrorMessage(error));
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const phone = '880' + document.getElementById('regPhone').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        
        // Validation
        if (password !== confirmPassword) {
            this.showError('registerForm', 'দুটি পাসওয়ার্ড মিলছে না');
            return;
        }
        
        if (password.length < 6) {
            this.showError('registerForm', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }
        
        try {
            // Check if phone already exists
            const phoneCheck = await db.collection('members').where('phone', '==', phone).get();
            if (!phoneCheck.empty) {
                this.showError('registerForm', 'এই ফোন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে');
                return;
            }
            
            // Check if email already exists (if provided)
            if (email) {
                const emailCheck = await db.collection('members').where('email', '==', email).get();
                if (!emailCheck.empty) {
                    this.showError('registerForm', 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে');
                    return;
                }
            }
            
            // Create user with email if provided, otherwise with phone
            let userCredential;
            if (email) {
                userCredential = await auth.createUserWithEmailAndPassword(email, password);
            } else {
                // Create with phone (you'll need Firebase phone auth setup)
                throw new Error("ফোন নম্বর দিয়ে রেজিস্টার এখনো চালু হয়নি");
            }
            
            // Save basic member info
            await db.collection('members').doc(userCredential.user.uid).set({
                name: name,
                phone: phone,
                email: email || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isGuest: false,
                status: 'active'
            });
            
            // Send email verification if email was used
            if (email) {
                await userCredential.user.sendEmailVerification();
                alert('ভেরিফিকেশন ইমেইল পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইমেইল চেক করুন।');
            }
            
            // Redirect to complete profile
            window.location.href = 'complete-profile.html';
            
        } catch (error) {
            this.showError('registerForm', this.getErrorMessage(error));
        }
    }
    
    async handleGuest(e) {
        e.preventDefault();
        const name = document.getElementById('guestName').value.trim();
        const phone = '880' + document.getElementById('guestPhone').value.trim();
        
        try {
            // Check if guest already exists with this phone
            const phoneCheck = await db.collection('members').where('phone', '==', phone).where('isGuest', '==', true).get();
            
            let userId;
            if (!phoneCheck.empty) {
                // Existing guest
                userId = phoneCheck.docs[0].id;
            } else {
                // New guest - create anonymous user
                const userCredential = await auth.signInAnonymously();
                userId = userCredential.user.uid;
                
                // Save guest info
                await db.collection('members').doc(userId).set({
                    name: name,
                    phone: phone,
                    isGuest: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'guest'
                });
            }
            
            // Store guest ID in localStorage
            localStorage.setItem('guestUID', userId);
            window.location.href = 'user.html';
            
        } catch (error) {
            this.showError('guestForm', this.getErrorMessage(error));
        }
    }
    
    async handleGoogleLogin() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await auth.signInWithPopup(provider);
            
            // Check if user exists in members collection
            const userDoc = await db.collection('members').doc(userCredential.user.uid).get();
            
            if (!userDoc.exists) {
                // New Google user - save basic info
                await db.collection('members').doc(userCredential.user.uid).set({
                    name: userCredential.user.displayName,
                    email: userCredential.user.email,
                    photoURL: userCredential.user.photoURL,
                    isGuest: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                });
                
                // Redirect to complete profile for additional info
                window.location.href = 'complete-profile.html';
            } else {
                // Existing user
                window.location.href = 'user.html';
            }
            
        } catch (error) {
            this.showError('loginForm', this.getErrorMessage(error));
        }
    }
    
    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user && (user.emailVerified || user.isAnonymous)) {
                // User is logged in and verified or is guest
                this.currentUser = user;
                
                // Check if we're on login page
                if (window.location.pathname.includes('index.html') || 
                    window.location.pathname === '/') {
                    // Redirect to appropriate page
                    db.collection('members').doc(user.uid).get()
                        .then(doc => {
                            if (!doc.exists) {
                                window.location.href = 'complete-profile.html';
                            } else {
                                window.location.href = 'user.html';
                            }
                        });
                }
            }
        });
    }
    
    getErrorMessage(error) {
        const messages = {
            'auth/wrong-password': 'পাসওয়ার্ড ভুল হয়েছে',
            'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই',
            'auth/email-already-in-use': 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে',
            'auth/weak-password': 'পাসওয়ার্ড খুব দুর্বল',
            'auth/invalid-email': 'ইমেইল ঠিকানা সঠিক নয়',
            'auth/network-request-failed': 'ইন্টারনেট সংযোগে সমস্যা',
            'auth/too-many-requests': 'অনেকবার চেষ্টা করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন',
            'auth/operation-not-allowed': 'এই অপারেশনটি এখন চালু নেই',
            'auth/user-disabled': 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে'
        };
        
        return messages[error.code] || error.message || 'একটি সমস্যা হয়েছে';
    }
    
    showError(formId, message) {
        const form = document.getElementById(formId);
        let errorDiv = form.querySelector('.error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            form.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Remove error after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize Auth Manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
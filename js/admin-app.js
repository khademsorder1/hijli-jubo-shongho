// Firebase Configuration (Same as your project)
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
const storage = firebase.storage();

// Cloudinary Configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dy7sxczfo/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'songho_preset';

// Global Variables
let currentAdmin = null;
let allMembers = [];
let allDonations = [];
let allProofs = [];
let allExpenses = [];
let allNotices = [];

// Purpose mapping
const purposeMapping = {
    'samajik': 'সামাজিক উন্নয়ন',
    'khela': 'খেলাধুলা',
    'mosjid': 'মসজিদ উন্নয়ন',
    'madrasa': 'মাদ্রাসা',
    'eid': 'ঈদ উৎসব',
    'shikkha': 'নামাজ/কুরআন শিক্ষা',
    'hafez': 'হাফেজদের জন্য',
    'other': 'অন্যান্য'
};

class AdminApp {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Check admin authentication
            await this.checkAdminAuth();
            
            // Initialize UI
            this.initUI();
            
            // Load initial data
            await this.loadDashboardData();
            await this.loadAllData();
            
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            console.log('Admin panel initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Admin panel লোড করতে সমস্যা: ' + error.message);
        }
    }

    // Check if user is authenticated as admin
    async checkAdminAuth() {
        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    // Check if user is admin
                    const adminDoc = await db.collection('admins').doc(user.uid).get();
                    if (adminDoc.exists) {
                        currentAdmin = user;
                        resolve();
                    } else {
                        alert('আপনি অ্যাডমিন নন।');
                        window.location.href = 'admin-login.html';
                        reject();
                    }
                } else {
                    window.location.href = 'admin-login.html';
                    reject();
                }
            });
        });
    }

    // Initialize UI components
    initUI() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('.modal').id;
                this.closeModal(modalId);
            });
        });

        // Form submissions
        document.getElementById('addMemberForm')?.addEventListener('submit', (e) => this.handleAddMember(e));
        document.getElementById('addExpenseForm')?.addEventListener('submit', (e) => this.handleAddExpense(e));
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Search and filter listeners
        this.setupSearchFilters();

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    // Switch between tabs
    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // Load data for the tab if needed
        switch(tabName) {
            case 'proofs':
                this.loadProofsTable();
                break;
            case 'members':
                this.loadMembersTable();
                break;
            case 'donations':
                this.loadDonationsTable();
                break;
            case 'expenses':
                this.loadExpensesTable();
                break;
            case 'notices':
                this.loadNoticesTable();
                break;
        }
    }

    // Load all data initially
    async loadAllData() {
        try {
            const [
                membersSnapshot,
                donationsSnapshot,
                proofsSnapshot,
                expensesSnapshot,
                noticesSnapshot
            ] = await Promise.all([
                db.collection('members').get(),
                db.collection('donations').orderBy('date', 'desc').get(),
                db.collection('donation_proofs').where('status', '==', 'pending').get(),
                db.collection('expenses').orderBy('date', 'desc').get(),
                db.collection('notices').orderBy('createdAt', 'desc').get()
            ]);

            // Process members
            allMembers = membersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Process donations
            allDonations = donationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Process proofs
            allProofs = proofsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Process expenses
            allExpenses = expensesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Process notices
            allNotices = noticesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('All data loaded successfully');
        } catch (error) {
            console.error('Error loading all data:', error);
        }
    }

    // Load dashboard data
    async loadDashboardData() {
        try {
            // Calculate totals
            let totalIncome = 0;
            let totalExpense = 0;
            let totalMembers = allMembers.length;
            let activeDonors = allMembers.filter(m => m.blood && m.bloodDonor !== 'no').length;
            let pendingProofs = allProofs.length;

            // Calculate income from donations
            allDonations.forEach(donation => {
                totalIncome += parseFloat(donation.amount) || 0;
            });

            // Calculate expenses
            allExpenses.forEach(expense => {
                totalExpense += parseFloat(expense.amount) || 0;
            });

            const currentBalance = totalIncome - totalExpense;

            // Update UI
            document.getElementById('totalIncome').textContent = this.formatCurrency(totalIncome);
            document.getElementById('totalExpense').textContent = this.formatCurrency(totalExpense);
            document.getElementById('currentBalance').textContent = this.formatCurrency(currentBalance);
            document.getElementById('pendingProofs').textContent = pendingProofs;
            document.getElementById('totalMembers').textContent = totalMembers;
            document.getElementById('activeDonors').textContent = activeDonors;

            // Load latest donations
            this.loadLatestDonations();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // Load latest donations for dashboard
    loadLatestDonations() {
        const latestDonations = allDonations.slice(0, 10); // Get last 10
        const tbody = document.getElementById('latestDonations');
        
        if (latestDonations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <i class="fas fa-inbox" style="font-size: 2rem; color: #95a5a6; margin-bottom: 10px;"></i>
                        <p>কোনো ডোনেশন নেই</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = latestDonations.map(donation => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${donation.userImage || 'https://i.ibb.co/6y4g08x/default-avatar.png'}" 
                             alt="${donation.userName}" 
                             style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                        <span>${donation.userName || 'নাম নেই'}</span>
                    </div>
                </td>
                <td><strong>${this.formatCurrency(donation.amount)}</strong></td>
                <td>${donation.date || 'তারিখ নেই'}</td>
                <td>${purposeMapping[donation.purposeKey] || 'অনির্দিষ্ট'}</td>
                <td>
                    <span class="status-badge status-approved">
                        <i class="fas fa-check-circle"></i> অনুমোদিত
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Load proofs table
    loadProofsTable() {
        const tbody = document.getElementById('proofsTable');
        const pendingProofs = allProofs.filter(proof => proof.status === 'pending');

        if (pendingProofs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: #2ecc71; margin-bottom: 15px;"></i>
                        <h4 style="color: #27ae60;">কোনো পেন্ডিং প্রমাণ নেই!</h4>
                        <p style="color: #95a5a6;">সকল প্রমাণ যাচাই করা হয়েছে।</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pendingProofs.map(proof => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${proof.userImage || 'https://i.ibb.co/6y4g08x/default-avatar.png'}" 
                             alt="${proof.userName}" 
                             style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <strong>${proof.userName || 'নাম নেই'}</strong><br>
                            <small style="color: #95a5a6;">${proof.userPhone || ''}</small>
                        </div>
                    </div>
                </td>
                <td><strong>${this.formatCurrency(proof.amount)}</strong></td>
                <td>${proof.method || 'N/A'}</td>
                <td><code>${proof.trxId || 'N/A'}</code></td>
                <td>
                    ${proof.imageUrl ? 
                        `<button class="btn btn-sm btn-info" onclick="adminApp.viewProofImage('${proof.id}')">
                            <i class="fas fa-eye"></i> ছবি দেখুন
                        </button>` : 
                        'ছবি নেই'
                    }
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-success" onclick="adminApp.approveProof('${proof.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminApp.rejectProof('${proof.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminApp.viewProofDetails('${proof.id}')">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Load members table
    loadMembersTable() {
        const tbody = document.getElementById('membersTable');

        if (allMembers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #95a5a6; margin-bottom: 15px;"></i>
                        <p style="color: #95a5a6;">কোনো সদস্য নেই</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allMembers.map(member => `
            <tr>
                <td>
                    <img src="${member.img || 'https://i.ibb.co/6y4g08x/default-avatar.png'}" 
                         alt="${member.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                </td>
                <td>
                    <strong>${member.name || 'নাম নেই'}</strong>
                    ${member.isGuest ? '<span class="status-badge" style="background: #3498db; margin-left: 5px;">গেস্ট</span>' : ''}
                </td>
                <td>${member.phone || 'N/A'}</td>
                <td>
                    ${member.blood ? 
                        `<span style="padding: 4px 10px; background: #e74c3c; color: white; border-radius: 4px; font-weight: bold;">
                            ${member.blood}
                        </span>` : 
                        'N/A'
                    }
                </td>
                <td>${member.location || 'N/A'}</td>
                <td>
                    ${member.isGuest ? 'গেস্ট' : 
                     member.type === 'executive' ? 'কার্যনির্বাহী' : 'সাধারণ'}
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-info" onclick="adminApp.viewMember('${member.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminApp.editMember('${member.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminApp.deleteMember('${member.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Load donations table
    loadDonationsTable() {
        const tbody = document.getElementById('donationsTable');

        if (allDonations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px;">
                        <i class="fas fa-hand-holding-heart" style="font-size: 3rem; color: #95a5a6; margin-bottom: 15px;"></i>
                        <p style="color: #95a5a6;">কোনো ডোনেশন নেই</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allDonations.map(donation => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${donation.userImage || 'https://i.ibb.co/6y4g08x/default-avatar.png'}" 
                             alt="${donation.userName}" 
                             style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                        <span>${donation.userName || 'নাম নেই'}</span>
                    </div>
                </td>
                <td><strong>${this.formatCurrency(donation.amount)}</strong></td>
                <td>${donation.date || 'তারিখ নেই'}</td>
                <td>${purposeMapping[donation.purposeKey] || 'অনির্দিষ্ট'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-info" onclick="adminApp.viewDonation('${donation.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminApp.deleteDonation('${donation.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Load expenses table
    loadExpensesTable() {
        const tbody = document.getElementById('expensesTable');

        if (allExpenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px;">
                        <i class="fas fa-file-invoice-dollar" style="font-size: 3rem; color: #95a5a6; margin-bottom: 15px;"></i>
                        <p style="color: #95a5a6;">কোনো ব্যয় নেই</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allExpenses.map(expense => `
            <tr>
                <td>${purposeMapping[expense.purposeKey] || 'অন্যান্য'}</td>
                <td><strong style="color: #e74c3c;">${this.formatCurrency(expense.amount)}</strong></td>
                <td>${expense.date || 'তারিখ নেই'}</td>
                <td>${expense.description || 'বিবরণ নেই'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-danger" onclick="adminApp.deleteExpense('${expense.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Load notices table
    loadNoticesTable() {
        const tbody = document.getElementById('noticesTable');

        if (allNotices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        <i class="fas fa-bullhorn" style="font-size: 3rem; color: #95a5a6; margin-bottom: 15px;"></i>
                        <p style="color: #95a5a6;">কোনো নোটিশ নেই</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allNotices.map(notice => `
            <tr>
                <td><strong>${notice.title}</strong></td>
                <td>${notice.details?.substring(0, 100)}${notice.details?.length > 100 ? '...' : ''}</td>
                <td>${notice.createdAt ? new Date(notice.createdAt.seconds * 1000).toLocaleDateString('bn-BD') : 'তারিখ নেই'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-danger" onclick="adminApp.deleteNotice('${notice.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminApp.editNotice('${notice.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Setup search and filter functionality
    setupSearchFilters() {
        // Members search
        const memberSearch = document.getElementById('memberSearch');
        if (memberSearch) {
            memberSearch.addEventListener('input', (e) => {
                this.filterMembers(e.target.value);
            });
        }

        // Donations search
        const donationSearch = document.getElementById('donationSearch');
        if (donationSearch) {
            donationSearch.addEventListener('input', (e) => {
                this.filterDonations(e.target.value);
            });
        }

        // Proofs search
        const proofSearch = document.getElementById('proofSearch');
        if (proofSearch) {
            proofSearch.addEventListener('input', (e) => {
                this.filterProofs(e.target.value);
            });
        }
    }

    // Filter members
    filterMembers(searchTerm) {
        const rows = document.querySelectorAll('#membersTable tr');
        searchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // Filter donations
    filterDonations(searchTerm) {
        const rows = document.querySelectorAll('#donationsTable tr');
        searchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // Filter proofs
    filterProofs(searchTerm) {
        const rows = document.querySelectorAll('#proofsTable tr');
        searchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // Add new member
    async handleAddMember(e) {
        e.preventDefault();
        
        const name = document.getElementById('memberName').value.trim();
        const phone = '880' + document.getElementById('memberPhone').value.trim();
        const email = document.getElementById('memberEmail').value.trim();
        const blood = document.getElementById('memberBlood').value;
        const dob = document.getElementById('memberDOB').value;
        const location = document.getElementById('memberLocation').value.trim();
        const occupation = document.getElementById('memberOccupation').value.trim();
        const type = document.getElementById('memberType').value;
        const bloodDonor = document.querySelector('input[name="bloodDonor"]:checked').value;

        // Validation
        if (!name) {
            alert('অনুগ্রহ করে নাম দিন');
            return;
        }

        if (!/^8801[3-9]\d{8}$/.test(phone)) {
            alert('অনুগ্রহ করে সঠিক ফোন নম্বর দিন (01 দিয়ে শুরু করে 11 ডিজিট)');
            return;
        }

        try {
            // Check if phone already exists
            const phoneCheck = await db.collection('members').where('phone', '==', phone).get();
            if (!phoneCheck.empty) {
                alert('এই ফোন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে');
                return;
            }

            // Check if email already exists (if provided)
            if (email) {
                const emailCheck = await db.collection('members').where('email', '==', email).get();
                if (!emailCheck.empty) {
                    alert('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে');
                    return;
                }
            }

            // Format date
            const formattedDOB = dob ? this.formatDateForDB(dob) : null;

            // Create member data
            const memberData = {
                name: name,
                phone: phone,
                email: email || null,
                blood: blood || null,
                dob: formattedDOB,
                location: location,
                income: occupation,
                type: type,
                bloodDonor: bloodDonor,
                isGuest: type === 'guest',
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            await db.collection('members').add(memberData);

            // Reset form
            e.target.reset();

            // Close modal
            this.closeModal('addMemberModal');

            // Show success message
            this.showNotification('সদস্য সফলভাবে যোগ করা হয়েছে!', 'success');

            // Refresh data
            await this.loadAllData();
            this.loadMembersTable();
            this.loadDashboardData();

        } catch (error) {
            console.error('Error adding member:', error);
            this.showNotification('সদস্য যোগ করতে সমস্যা: ' + error.message, 'error');
        }
    }

    // Add new expense
    async handleAddExpense(e) {
        e.preventDefault();
        
        const category = document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value.trim();

        // Validation
        if (!category || !amount || !date) {
            alert('অনুগ্রহ করে সব required তথ্য দিন');
            return;
        }

        if (amount <= 0) {
            alert('টাকার পরিমাণ ০ এর বেশি হতে হবে');
            return;
        }

        try {
            // Format date
            const formattedDate = this.formatDateForDB(date);

            // Create expense data
            const expenseData = {
                purposeKey: category,
                amount: amount,
                date: formattedDate,
                description: description,
                addedBy: currentAdmin.uid,
                addedByName: currentAdmin.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            await db.collection('expenses').add(expenseData);

            // Reset form
            e.target.reset();

            // Close modal
            this.closeModal('addExpenseModal');

            // Show success message
            this.showNotification('ব্যয় সফলভাবে যোগ করা হয়েছে!', 'success');

            // Refresh data
            await this.loadAllData();
            this.loadExpensesTable();
            this.loadDashboardData();

        } catch (error) {
            console.error('Error adding expense:', error);
            this.showNotification('ব্যয় যোগ করতে সমস্যা: ' + error.message, 'error');
        }
    }

    // View proof details
    async viewProofDetails(proofId) {
        try {
            const proof = allProofs.find(p => p.id === proofId);
            if (!proof) return;

            // Find member info
            const member = allMembers.find(m => m.id === proof.userId);

            // Create modal content
            const modalContent = `
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 20px; color: #2c3e50;">
                        <i class="fas fa-file-invoice"></i> প্রমাণ বিস্তারিত
                    </h3>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <strong>সদস্যের নাম:</strong><br>
                                ${proof.userName || 'নাম নেই'}
                            </div>
                            <div>
                                <strong>পরিমাণ:</strong><br>
                                ${this.formatCurrency(proof.amount)}
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <strong>মাধ্যম:</strong><br>
                                ${proof.method || 'N/A'}
                            </div>
                            <div>
                                <strong>উদ্দেশ্য:</strong><br>
                                ${purposeMapping[proof.purposeKey] || 'অনির্দিষ্ট'}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <strong>ট্রাঙ্কশন আইডি:</strong><br>
                            <code style="background: #e9ecef; padding: 5px 10px; border-radius: 5px;">
                                ${proof.trxId || 'N/A'}
                            </code>
                        </div>
                        
                        <div>
                            <strong>জমা দেওয়ার তারিখ:</strong><br>
                            ${proof.submittedAt ? new Date(proof.submittedAt.seconds * 1000).toLocaleDateString('bn-BD') : 'তারিখ নেই'}
                        </div>
                    </div>
                    
                    ${proof.imageUrl ? `
                        <div style="text-align: center; margin-bottom: 20px;">
                            <strong>প্রমাণের ছবি:</strong><br>
                            <img src="${proof.imageUrl}" 
                                 alt="প্রমাণ ছবি" 
                                 style="max-width: 100%; max-height: 400px; border-radius: 10px; margin-top: 10px; border: 2px solid #dee2e6;">
                            <br>
                            <a href="${proof.imageUrl}" target="_blank" 
                               style="display: inline-block; margin-top: 10px; color: #3498db;">
                                <i class="fas fa-external-link-alt"></i> পূর্ণ স্ক্রিনে দেখুন
                            </a>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-success" style="flex: 1;" onclick="adminApp.approveProof('${proofId}')">
                            <i class="fas fa-check"></i> অনুমোদন করুন
                        </button>
                        <button class="btn btn-danger" style="flex: 1;" onclick="adminApp.rejectProof('${proofId}')">
                            <i class="fas fa-times"></i> প্রত্যাখ্যান করুন
                        </button>
                    </div>
                </div>
            `;

            // Create and show custom modal
            this.showCustomModal('প্রমাণ যাচাই', modalContent);

        } catch (error) {
            console.error('Error viewing proof:', error);
            this.showNotification('প্রমাণ দেখতে সমস্যা: ' + error.message, 'error');
        }
    }

    // Approve proof
    async approveProof(proofId) {
        if (!confirm('আপনি কি এই প্রমাণটি অনুমোদন করতে চান?')) return;

        try {
            const proof = allProofs.find(p => p.id === proofId);
            if (!proof) return;

            // Update proof status
            await db.collection('donation_proofs').doc(proofId).update({
                status: 'approved',
                verifiedBy: currentAdmin.uid,
                verifiedByName: currentAdmin.email,
                verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create donation record
            const donationData = {
                userId: proof.userId,
                userName: proof.userName,
                userImage: proof.userImage,
                userPhone: proof.userPhone,
                amount: proof.amount,
                date: this.formatDateForDB(new Date()),
                purposeKey: proof.purposeKey,
                proofId: proofId,
                addedBy: currentAdmin.uid,
                addedByName: currentAdmin.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('donations').add(donationData);

            // Show success message
            this.showNotification('প্রমাণ সফলভাবে অনুমোদন করা হয়েছে!', 'success');

            // Refresh data
            await this.loadAllData();
            this.loadProofsTable();
            this.loadDashboardData();

            // Close modal if open
            this.closeModal('viewProofModal');

        } catch (error) {
            console.error('Error approving proof:', error);
            this.showNotification('প্রমাণ অনুমোদন করতে সমস্যা: ' + error.message, 'error');
        }
    }

    // Reject proof
    async rejectProof(proofId) {
        const reason = prompt('প্রত্যাখ্যানের কারণ লিখুন:');
        if (!reason) return;

        try {
            // Update proof status
            await db.collection('donation_proofs').doc(proofId).update({
                status: 'rejected',
                rejectionReason: reason,
                verifiedBy: currentAdmin.uid,
                verifiedByName: currentAdmin.email,
                verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Show success message
            this.showNotification('প্রমাণ সফলভাবে প্রত্যাখ্যান করা হয়েছে!', 'success');

            // Refresh data
            await this.loadAllData();
            this.loadProofsTable();
            this.loadDashboardData();

            // Close modal if open
            this.closeModal('viewProofModal');

        } catch (error) {
            console.error('Error rejecting proof:', error);
            this.showNotification('প্রমাণ প্রত্যাখ্যান করতে সমস্যা: ' + error.message, 'error');
        }
    }

    // View member details
    async viewMember(memberId) {
        try {
            const member = allMembers.find(m => m.id === memberId);
            if (!member) return;

            // Calculate age if DOB exists
            let age = null;
            if (member.dob) {
                const birthDate = new Date(member.dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
            }

            // Create modal content
            const modalContent = `
                <div style="padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${member.img || 'https://i.ibb.co/6y4g08x/default-avatar.png'}" 
                             alt="${member.name}" 
                             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #16a085;">
                        <h3 style="margin-top: 15px; color: #2c3e50;">${member.name || 'নাম নেই'}</h3>
                        ${member.isGuest ? 
                            '<span style="background: #3498db; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">গেস্ট সদস্য</span>' : 
                            '<span style="background: #2ecc71; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">রেজিস্টার্ড সদস্য</span>'
                        }
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 10px; width: 40%;"><strong>ফোন নম্বর:</strong></td>
                                <td style="padding: 10px;">${member.phone || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>ইমেইল:</strong></td>
                                <td style="padding: 10px;">${member.email || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>রক্তের গ্রুপ:</strong></td>
                                <td style="padding: 10px;">
                                    ${member.blood ? 
                                        `<span style="background: #e74c3c; color: white; padding: 3px 10px; border-radius: 4px; font-weight: bold;">
                                            ${member.blood}
                                        </span>` : 
                                        'N/A'
                                    }
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>জন্ম তারিখ:</strong></td>
                                <td style="padding: 10px;">${member.dob || 'N/A'} ${age ? `(${age} বছর)` : ''}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>অবস্থান:</strong></td>
                                <td style="padding: 10
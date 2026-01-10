import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// CDN for html2canvas and jsPDF
const HTML2CANVAS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const defaultAvatar = 'https://i.ibb.co/6y4g08x/default-avatar.png';
let userProfileData = null; // To store user data globally in this module
let loadedScripts = {}; // To prevent reloading scripts

// Function to dynamically load a script
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (loadedScripts[src]) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedScripts[src] = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// --- View Profile Logic ---
function populateViewProfileModal() {
    if (!userProfileData) return;
    document.getElementById('modalProfileImg').src = userProfileData.img || defaultAvatar;
    document.getElementById('modalProfileName').innerText = userProfileData.name || 'নাম নেই';

    const infoTable = document.getElementById('modalProfileInfo');
    let tableHTML = '';
    const memberId = window.formatMemberId(userProfileData.memberId || userProfileData.uid, userProfileData.isGuest);

    tableHTML += `<tr><td>সদস্য আইডি:</td><td>${memberId}</td></tr>`;
    if (userProfileData.dob) tableHTML += `<tr><td>জন্ম তারিখ:</td><td>${userProfileData.dob}</td></tr>`;
    if (userProfileData.phone) tableHTML += `<tr><td>মোবাইল:</td><td>${userProfileData.phone}</td></tr>`;
    if (userProfileData.blood) tableHTML += `<tr><td>রক্তের গ্রুপ:</td><td>${userProfileData.blood}</td></tr>`;
    if (userProfileData.location) tableHTML += `<tr><td>অবস্থান:</td><td>${userProfileData.location}</td></tr>`;
    if (userProfileData.emergencyContact) tableHTML += `<tr><td>জরুরী যোগাযোগ:</td><td>${userProfileData.emergencyContact}</td></tr>`;

    infoTable.innerHTML = tableHTML;
    openModal('viewProfileModal');
}

// --- Edit Profile Logic ---
function populateEditProfileForm() {
    if (!userProfileData) return;
    document.getElementById('profileName').value = userProfileData.name || '';
    document.getElementById('profilePhone').value = userProfileData.phone ? userProfileData.phone.replace('+880', '') : '';
    document.getElementById('profileBlood').value = userProfileData.blood || '';
    document.getElementById('profileLocation').value = userProfileData.location || '';
    document.getElementById('emergencyContact').value = userProfileData.emergencyContact || '';
    document.getElementById('willingToDonate').value = userProfileData.willingToDonate || 'yes';
    document.getElementById('healthIssues').value = userProfileData.healthIssues || '';
    if (userProfileData.dob) {
        try {
            const parts = userProfileData.dob.split('-'); // DD-MM-YYYY
            document.getElementById('profileDob').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } catch (e) { console.error("Error parsing DOB"); }
    }
    openModal('editProfileModal');
}

async function handleProfileUpdate(e, db, currentUser) {
    e.preventDefault();
    const name = document.getElementById('profileName').value;
    if (!name) { alert("অনুগ্রহ করে আপনার নাম দিন।"); return; }
    
    const dobInput = document.getElementById('profileDob').value;
    const formattedDob = dobInput ? `${dobInput.split('-')[2]}-${dobInput.split('-')[1]}-${dobInput.split('-')[0]}` : null;
    const phoneInput = document.getElementById('profilePhone').value;

    const updatedData = {
        name,
        phone: phoneInput ? `+880${phoneInput}` : null,
        blood: document.getElementById('profileBlood').value,
        dob: formattedDob,
        location: document.getElementById('profileLocation').value,
        emergencyContact: document.getElementById('emergencyContact').value,
        willingToDonate: document.getElementById('willingToDonate').value,
        healthIssues: document.getElementById('healthIssues').value,
        isGuest: currentUser.isAnonymous, // Keep guest status
    };

    try {
        await setDoc(doc(db, "members", currentUser.uid), updatedData, { merge: true });
        alert("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
        closeModal('editProfileModal');
        // Refresh local data and any open modals
        const docSnap = await getDoc(doc(db, "members", currentUser.uid));
        userProfileData = docSnap.data();
    } catch (error) {
        alert("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    }
}


// --- Payment Status Logic ---
function setupPaymentTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === button.dataset.tab);
            });
        });
    });
}

async function loadMyProofs(db, currentUser) {
    const historyDiv = document.getElementById('myProofHistory');
    historyDiv.innerHTML = '<p>লোড হচ্ছে...</p>';
    const q = query(collection(db, "donation_proofs"), where("userId", "==", currentUser.uid), orderBy("submittedAt", "desc"));
    
    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            historyDiv.innerHTML = '<p>আপনি কোনো পেমেন্টের প্রমাণ জমা দেননি।</p>';
            return;
        }
        historyDiv.innerHTML = '';
        querySnapshot.forEach(doc => {
            const proof = doc.data();
            const statusText = { pending: 'পেন্ডিং', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' };
            const statusClass = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' };
            historyDiv.innerHTML += `<div class="proof-item">
                <div class="proof-item-info">
                    <p><strong>পরিমাণ:</strong> ${proof.amount} টাকা</p>
                    <p><strong>তারিখ:</strong> ${new Date(proof.submittedAt.seconds * 1000).toLocaleDateString('bn-BD')}</p>
                </div>
                <span class="status-badge ${statusClass[proof.status]}">${statusText[proof.status]}</span>
            </div>`;
        });
    }, (error) => {
        console.error(error);
        showError(historyDiv, "প্রমাণ তালিকা লোড করা সম্ভব হয়নি।");
    });
}

async function loadMyDonations(db, currentUser) {
    const historyDiv = document.getElementById('myDonationHistory');
    historyDiv.innerHTML = '<p>লোড হচ্ছে...</p>';
    const q = query(collection(db, "donations"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        historyDiv.innerHTML = '<p>আপনার কোনো অনুমোদিত পেমেন্ট নেই।</p>';
        return;
    }
    historyDiv.innerHTML = '';
    querySnapshot.forEach(doc => {
        const donation = doc.data();
        historyDiv.innerHTML += `<div class="data-item">
            <strong>পরিমাণ:</strong> ${donation.amount} টাকা | <strong>তারিখ:</strong> ${donation.date}
        </div>`;
    });
}

// --- Member Card Logic ---
function renderMemberCard() {
    const container = document.getElementById('id-card-container');
    if (!userProfileData) {
        container.innerHTML = '<p>কার্ড তৈরির জন্য তথ্য পাওয়া যায়নি।</p>';
        return;
    }
    const memberId = window.formatMemberId(userProfileData.memberId || userProfileData.uid, userProfileData.isGuest);
    
    container.innerHTML = `
        <div id="id-card">
            <div class="id-header">হিজলী দিঘাপাড়া যুব সংঘ<small>Bagatipara, Natore</small></div>
            <div class="id-body">
                <img class="photo" src="${userProfileData.img || defaultAvatar}" crossorigin="anonymous">
                <div class="info">
                    <h3>${userProfileData.name || 'N/A'}</h3>
                    <p class="member-id">ID: ${memberId}</p>
                    <p><b>Blood:</b> ${userProfileData.blood || 'N/A'}</p>
                    <p><b>Phone:</b> ${userProfileData.phone || 'N/A'}</p>
                </div>
            </div>
            <div class="emergency">🚨 জরুরী যোগাযোগ: ${userProfileData.emergencyContact || 'N/A'}</div>
            <div class="id-footer">Valid Member • Since 2026</div>
        </div>`;
    openModal('id-card-modal');
}

async function downloadCard(format) {
    await Promise.all([loadScript(HTML2CANVAS_CDN), loadScript(JSPDF_CDN)]);
    const cardElement = document.getElementById('id-card');
    const button = format === 'png' ? document.getElementById('downloadPngBtn') : document.getElementById('downloadPdfBtn');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

    try {
        const canvas = await html2canvas(cardElement, { useCORS: true, scale: 3 });
        if (format === 'png') {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `${userProfileData.name}_ID_Card.png`;
            link.click();
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [340, 214] });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 340, 214);
            pdf.save(`${userProfileData.name}_ID_Card.pdf`);
        }
    } catch (error) {
        console.error("Download Error:", error);
        alert("কার্ড ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-${format === 'png' ? 'download' : 'file-pdf'}"></i> ${format.toUpperCase()}`;
    }
}

// --- Main Init Function ---
export async function init(db, currentUser) {
    const userDocRef = doc(db, "members", currentUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        userProfileData = docSnap.data();
    } else {
        userProfileData = {}; // Empty object for new guests
    }

    // Attach event listeners to dashboard cards
    document.getElementById('viewProfileBtn').addEventListener('click', populateViewProfileModal);
    document.getElementById('editProfileBtn').addEventListener('click', populateEditProfileForm);
    document.getElementById('paymentStatusBtn').addEventListener('click', () => {
        openModal('paymentStatusModal');
        setupPaymentTabs();
        loadMyProofs(db, currentUser);
        loadMyDonations(db, currentUser);
    });
    document.getElementById('generateCardBtn').addEventListener('click', renderMemberCard);

    // Attach form submission and download listeners
    document.getElementById('profileEditForm').addEventListener('submit', (e) => handleProfileUpdate(e, db, currentUser));
    document.getElementById('downloadPngBtn').addEventListener('click', () => downloadCard('png'));
    document.getElementById('downloadPdfBtn').addEventListener('click', () => downloadCard('pdf'));
}

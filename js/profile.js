import { doc, getDoc, updateDoc, setDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dy7sxczfo/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'songho_preset';
const defaultAvatar = 'https://i.ibb.co/6y4g08x/default-avatar.png';
const donationPurposes = { "samajik": "সামাজিক উন্নয়ন", "khela": "খেলাধুলা", "mosjid": "মসজিদ উন্নয়ন", "madrasa": "মাদ্রাসা", "eid": "ঈদ উৎসব", "shikkha": "নামাজ/কুরআন শিক্ষা", "hafez": "হাফেজদের জন্য" };

function populatePurposeDropdowns() {
    const purposeSelect = document.getElementById('proofPurpose');
    if (!purposeSelect) return;
    purposeSelect.innerHTML = `<option value="">-- উদ্দেশ্য নির্বাচন করুন --</option>`;
    for (const [key, value] of Object.entries(donationPurposes)) {
        purposeSelect.innerHTML += `<option value="${key}">${value}</option>`;
    }
}

async function loadMyDonations(db, currentUser) {
    const historyDiv = document.getElementById('myDonationHistory');
    try {
        const q = query(collection(db, "donations"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            historyDiv.innerHTML = '<p>আপনি এখনো কোনো অনুদান দেননি।</p>';
            return;
        }
        historyDiv.innerHTML = '';
        querySnapshot.forEach(docSnap => {
            const donation = docSnap.data();
            let purposeHTML = `<strong>উদ্দেশ্য:</strong> ${donationPurposes[donation.purposeKey] || 'অনির্দিষ্ট'}`;
            historyDiv.innerHTML += `<div class="data-item"><strong>পরিমাণ:</strong> ${donation.amount} টাকা | <strong>তারিখ:</strong> ${donation.date} | ${purposeHTML}</div>`;
        });
    } catch (error) {
        console.error("Error loading my donations:", error);
        showError(historyDiv, "আপনার ডোনেশন ইতিহাস লোড করা সম্ভব হয়নি।");
    }
}

async function loadMyProofs(db, currentUser) {
    const historyDiv = document.getElementById('myProofHistory');
    try {
        const q = query(collection(db, "donation_proofs"), where("userId", "==", currentUser.uid), orderBy("submittedAt", "desc"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            historyDiv.innerHTML = '<p>আপনি এখনো কোনো প্রমাণ জমা দেননি।</p>';
            return;
        }
        historyDiv.innerHTML = '';
        querySnapshot.forEach(doc => {
            const proof = doc.data();
            const statusText = { pending: 'পেন্ডিং', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' };
            const statusClass = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' };
            historyDiv.innerHTML += `
                <div class="proof-item">
                    <div class="proof-item-info">
                        <p><strong>পরিমাণ:</strong> ${proof.amount} টাকা | <strong>মাধ্যম:</strong> ${proof.method}</p>
                        <p><strong>উদ্দেশ্য:</strong> ${donationPurposes[proof.purposeKey] || 'N/A'}</p>
                    </div>
                    <span class="status-badge ${statusClass[proof.status] || ''}">${statusText[proof.status] || 'Unknown'}</span>
                </div>`;
        });
    } catch(error) {
        console.error("Error loading my proofs:", error);
        showError(historyDiv, "আপনার প্রমাণ তালিকা লোড করা সম্ভব হয়নি।");
    }
}


function loadProfileForEditing(data) {
    document.getElementById('profileImg').src = data.img || defaultAvatar;
    document.getElementById('profileName').value = data.name || '';
    document.getElementById('profilePhone').value = data.phone ? data.phone.replace('+880', '') : '';
    document.getElementById('profileBlood').value = data.blood || '';
    document.getElementById('profileIncome').value = data.income || '';
    document.getElementById('profileLocation').value = data.location || '';
    document.getElementById('lastDonationDate').value = data.lastDonationDate || '';
    if (data.dob) {
        try {
            const parts = data.dob.split('-'); // DD-MM-YYYY
            document.getElementById('profileDob').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } catch (e) { console.error("Error parsing DOB", data.dob); }
    }
}

async function handleProfileSubmit(e, db, currentUser) {
    e.preventDefault();
    const name = document.getElementById('profileName').value;
    if (!name) { alert("অনুগ্রহ করে আপনার নাম দিন।"); return; }
    
    const uploadStatus = document.getElementById('editUploadStatus');
    uploadStatus.textContent = 'তথ্য সংরক্ষণ করা হচ্ছে...';
    uploadStatus.style.display = 'block';

    const dobInput = document.getElementById('profileDob').value;
    const dobParts = dobInput ? dobInput.split('-') : null;
    const formattedDob = dobParts ? `${dobParts[2]}-${dobParts[1]}-${dobParts[0]}` : null;

    const phoneInput = document.getElementById('profilePhone').value;
    const formattedPhone = phoneInput ? `+880${phoneInput}` : null;

    const profileData = {
        name: name,
        phone: formattedPhone,
        blood: document.getElementById('profileBlood').value,
        dob: formattedDob,
        income: document.getElementById('profileIncome').value,
        location: document.getElementById('profileLocation').value,
        lastDonationDate: document.getElementById('lastDonationDate').value,
        isGuest: currentUser.isAnonymous,
    };

    try {
        await setDoc(doc(db, "members", currentUser.uid), profileData, { merge: true });
        alert("প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!");
        location.reload();
    } catch (error) {
        alert("সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
        uploadStatus.style.display = 'none';
    }
}

async function handlePhotoUpdate(e, db, currentUser) {
    e.preventDefault();
    const statusP = document.getElementById('photoUploadStatus');
    const photoFile = document.getElementById('newProfilePhoto').files[0];
    if (!photoFile) { alert("অনুগ্রহ করে একটি ছবি নির্বাচন করুন।"); return; }

    statusP.textContent = 'ছবি আপলোড হচ্ছে...';
    statusP.style.display = 'block';
    const formData = new FormData();
    formData.append('file', photoFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Image upload failed');
        const data = await response.json();
        
        await setDoc(doc(db, "members", currentUser.uid), { img: data.secure_url }, { merge: true });
        alert("ছবি সফলভাবে আপডেট হয়েছে!");
        location.reload();
    } catch (error) {
        alert("ছবি আপলোড করতে সমস্যা হয়েছে: " + error.message);
        statusP.style.display = 'none';
    }
}


async function attachEventListeners(db, currentUser) {
    document.getElementById('profileEditForm').addEventListener('submit', (e) => handleProfileSubmit(e, db, currentUser));
    
    const photoUpdateForm = document.getElementById('photoUpdateForm');
    if (photoUpdateForm) {
         photoUpdateForm.addEventListener('submit', (e) => handlePhotoUpdate(e, db, currentUser));
    }
   
    const proofForm = document.getElementById('proofSubmissionForm');
    if (proofForm) {
        populatePurposeDropdowns();
        proofForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusP = document.getElementById('proofUploadStatus');
            statusP.textContent = 'আপনার প্রমাণ জমা দেওয়া হচ্ছে...';
            statusP.style.display = 'block';

            const photoFile = document.getElementById('proofPhoto').files[0];
            if (!photoFile) { statusP.textContent = 'অনুগ্রহ করে একটি ছবি দিন।'; statusP.style.color = 'var(--error-color)'; return; }
            
            try {
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Image upload failed');
                const imageData = await response.json();
                
                const userDoc = await getDoc(doc(db, "members", currentUser.uid));
                const userName = userDoc.exists() ? userDoc.data().name : "Unknown User";

                await addDoc(collection(db, "donation_proofs"), {
                    userId: currentUser.uid, userName: userName,
                    amount: document.getElementById('proofAmount').value,
                    method: document.getElementById('proofMethod').value,
                    purposeKey: document.getElementById('proofPurpose').value,
                    trxId: document.getElementById('proofTrxId').value,
                    imageUrl: imageData.secure_url, status: 'pending',
                    submittedAt: serverTimestamp()
                });
                
                statusP.textContent = 'আপনার প্রমাণ সফলভাবে জমা হয়েছে!';
                statusP.style.color = 'var(--success-color)';
                proofForm.reset();
                loadMyProofs(db, currentUser);
                setTimeout(() => closeModal('proofSubmissionModal'), 2000);
            } catch (error) {
                console.error("Proof submission error:", error);
                statusP.textContent = "প্রমাণ জমা দিতে সমস্যা হয়েছে: " + error.message;
                statusP.style.color = 'var(--error-color)';
            }
        });
    }
}

export async function init(db, currentUser) {
    const userDocRef = doc(db, "members", currentUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        loadProfileForEditing(docSnap.data());
    } else {
        document.getElementById('profileImg').src = defaultAvatar;
    }

    if (currentUser.isAnonymous) {
        document.querySelector('#myDonationHistory').parentElement.style.display = 'none';
        document.querySelector('#myProofHistory').parentElement.style.display = 'none';
    } else {
        await Promise.all([
            loadMyDonations(db, currentUser),
            loadMyProofs(db, currentUser)
        ]);
    }
    
    attachEventListeners(db, currentUser);
}
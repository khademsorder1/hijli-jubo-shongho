import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

function calculateNextDonationDate(lastDateStr) {
    if(!lastDateStr) return { nextDate: 'তথ্য নেই', isReady: true };
    const lastDate = new Date(lastDateStr);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + 4);
    const isReady = new Date() > nextDate;
    return { 
        nextDate: nextDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }), 
        isReady: isReady 
    };
}

async function loadBloodDonors(db) {
    const bloodList = document.getElementById('bloodList');
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        if (querySnapshot.empty) {
            bloodList.innerHTML = '<p>কোনো রক্তদাতা খুঁজে পাওয়া যায়নি।</p>';
            return;
        }
        bloodList.innerHTML = '';
        let hasDonors = false;
        querySnapshot.forEach((doc) => {
            const donor = doc.data();
            if(donor.blood) {
                hasDonors = true;
                const { nextDate, isReady } = calculateNextDonationDate(donor.lastDonationDate);
                const statusHTML = isReady ? `<span class="donor-status ready">প্রস্তুত</span>` : '';
                bloodList.innerHTML += `
                    <div class="donor-card">
                        <div class="donor-header">
                            <div class="donor-header-info"><span class="blood-group">${donor.blood}</span><h4>${donor.name}</h4></div>
                            ${statusHTML}
                        </div>
                        <div class="donor-details">
                            <p><i class="fas fa-phone"></i> ${donor.phone || 'N/A'}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${donor.location || 'N/A'}</p>
                            <p><i class="fas fa-calendar-check"></i> পরবর্তী সম্ভাব্য রক্তদান: <strong>${nextDate}</strong></p>
                        </div>
                    </div>`;
            }
        });
        if (!hasDonors) {
            bloodList.innerHTML = '<p>কোনো রক্তদাতা খুঁজে পাওয়া যায়নি।</p>';
        }
    } catch(error) {
        console.error("Error loading blood donors:", error);
        showError(bloodList, "রক্তদাতার তালিকা লোড করা সম্ভব হয়নি।");
    }
}

function filterBloodDonors() {
    const searchTerm = document.getElementById('bloodSearch').value.toLowerCase();
    const bloodGroup = document.getElementById('bloodGroupFilter').value;
    const donorCards = document.querySelectorAll('#bloodList .donor-card');

    donorCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const cardBloodGroup = card.querySelector('.blood-group').textContent;

        const groupMatch = !bloodGroup || cardBloodGroup === bloodGroup;
        const textMatch = cardText.includes(searchTerm);

        card.style.display = (groupMatch && textMatch) ? "" : "none";
    });
}

export async function init(db) {
    await loadBloodDonors(db);
    document.getElementById('bloodSearch').addEventListener('keyup', filterBloodDonors);
    document.getElementById('bloodGroupFilter').addEventListener('change', filterBloodDonors);
}
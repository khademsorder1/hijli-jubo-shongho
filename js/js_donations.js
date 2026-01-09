import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const donationPurposes = { "samajik": "সামাজিক উন্নয়ন", "khela": "খেলাধুলা", "mosjid": "মসজিদ উন্নয়ন", "madrasa": "মাদ্রাসা", "eid": "ঈদ উৎসব", "shikkha": "নামাজ/কুরআন শিক্ষা", "hafez": "হাফেজদের জন্য" };
const defaultAvatar = 'https://i.ibb.co/6y4g08x/default-avatar.png';

async function loadDonations(db) {
    const donationList = document.getElementById('donationList');
    try {
        const donationsSnapshot = await getDocs(query(collection(db, "donations"), orderBy("date", "desc")));
        if (donationsSnapshot.empty) {
            donationList.innerHTML = '<p>এখনো কোনো ডোনেশন যোগ করা হয়নি।</p>';
            return;
        }
        const userDonations = {};
        donationsSnapshot.forEach(doc => {
            const donation = doc.data();
            if (!userDonations[donation.userId]) {
                userDonations[donation.userId] = { name: donation.userName || 'নাম নেই', image: donation.userImage, total: 0, donations: [] };
            }
            userDonations[donation.userId].total += Number(donation.amount);
            userDonations[donation.userId].donations.push(donation);
        });
        donationList.innerHTML = '';
        for (const userId in userDonations) {
            const user = userDonations[userId];
            let detailsHTML = user.donations.map(d => `<div class="detail-item"><strong>পরিমাণ:</strong> ${d.amount} টাকা | <strong>তারিখ:</strong> ${d.date} | <strong>উদ্দেশ্য:</strong> ${donationPurposes[d.purposeKey] || 'অনির্দিষ্ট'}</div>`).join('');
            const item = document.createElement('div');
            item.className = 'donation-item';
            item.innerHTML = `
                <div class="donation-header">
                    <img src="${user.image || defaultAvatar}" alt="${user.name}">
                    <div class="donation-info"><h4>${user.name}</h4><p>মোট অনুদান: ${user.total.toLocaleString('bn-BD')} টাকা</p></div>
                </div>
                <div class="donation-details-list">${detailsHTML}</div>`;
            item.querySelector('.donation-header').onclick = function() {
                const details = this.nextElementSibling;
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            };
            donationList.appendChild(item);
        }
    } catch (error) {
        console.error("Error loading donations:", error);
        showError(donationList, "ডোনেশন তালিকা লোড করা সম্ভব হয়নি।");
    }
}

export async function init(db) {
    await loadDonations(db);

    document.getElementById('donationSearch').addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#donationList .donation-item').forEach(item => {
            const donorName = item.querySelector('.donation-info h4').textContent.toLowerCase();
            item.style.display = donorName.includes(searchTerm) ? "" : "none";
        });
    });
}
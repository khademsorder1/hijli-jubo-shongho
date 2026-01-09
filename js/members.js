import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let membersData = [];
const defaultAvatar = 'https://i.ibb.co/6y4g08x/default-avatar.png';
const nameColors = ['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#ba68c8', '#7986cb', '#4db6ac', '#f06292'];

// Helper function to generate a consistent color based on user's name
function getColorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % nameColors.length);
    return nameColors[index];
}

function calculateAge(dateString) {
    if (!dateString) return null;
    try {
        const parts = dateString.split('-'); // DD-MM-YYYY
        const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
    } catch (e) { return null; }
}

function showMemberDetails(id) {
    const member = membersData.find(m => m.id === id);
    if (!member) return;

    document.getElementById('modalImg').src = member.img || defaultAvatar;
    document.getElementById('modalName').innerText = member.name;
    
    // Build the info table dynamically, showing only available data
    const infoTable = document.querySelector('#memberModal .info-table');
    let tableHTML = '';
    
    const age = calculateAge(member.dob);
    if (member.dob) tableHTML += `<tr><td>জন্ম তারিখ:</td><td>${member.dob}</td></tr>`;
    if (age) tableHTML += `<tr><td>বর্তমান বয়স:</td><td>${age} বছর</td></tr>`;
    if (member.phone) tableHTML += `<tr><td>মোবাইল নম্বর:</td><td>${member.phone}</td></tr>`;
    if (member.blood) tableHTML += `<tr><td>রক্তের গ্রুপ:</td><td>${member.blood}</td></tr>`;
    if (member.income) tableHTML += `<tr><td>পেশা:</td><td>${member.income}</td></tr>`;
    if (member.location) tableHTML += `<tr><td>বর্তমান অবস্থান:</td><td>${member.location}</td></tr>`;

    infoTable.innerHTML = tableHTML;
    openModal('memberModal');
}

function filterMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const filterType = document.getElementById('memberTypeFilter').value;

    document.querySelectorAll('#memberList .member-card').forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const nameMatch = cardText.includes(searchTerm);
        const typeMatch = (filterType === 'all') || (card.dataset.type === filterType);
        
        card.style.display = (nameMatch && typeMatch) ? "flex" : "none";
    });
}

async function loadMembers(db) {
    const memberListContainer = document.getElementById('memberList');
    if (!memberListContainer) return;
    
    try {
        const q = query(collection(db, "members"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            memberListContainer.innerHTML = '<p>কোনো সদস্য খুঁজে পাওয়া যায়নি।</p>';
            return;
        }
        
        memberListContainer.innerHTML = ''; // Clear previous content
        membersData = [];

        querySnapshot.forEach((doc) => {
            const member = { id: doc.id, ...doc.data() };
            membersData.push(member);
            
            const card = document.createElement('div');
            card.className = 'member-card';
            card.dataset.type = member.isGuest ? 'guest' : 'registered';
            
            const guestBadge = member.isGuest ? '<span class="guest-badge-v2">গেস্ট</span>' : '';
            const locationInfo = member.location ? `<p class="member-location"><i class="fas fa-map-marker-alt"></i> ${member.location}</p>` : '';

            card.innerHTML = `
                <img src="${member.img || defaultAvatar}" alt="${member.name}">
                <div class="member-info">
                    <h4 class="member-name" style="color: ${getColorForName(member.name || '')};">
                        ${member.name || 'নাম নেই'}
                        ${guestBadge}
                    </h4>
                    ${locationInfo}
                </div>
            `;
            
            card.onclick = () => showMemberDetails(member.id);
            memberListContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading members:", error);
        showError(memberListContainer, "সদস্য তালিকা লোড করা সম্ভব হয়নি।");
    }
}

export async function init(db) {
    await loadMembers(db);
    document.getElementById('memberSearch')?.addEventListener('keyup', filterMembers);
    document.getElementById('memberTypeFilter')?.addEventListener('change', filterMembers);
}

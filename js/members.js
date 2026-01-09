import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let membersData = [];
const defaultAvatar = 'https://i.ibb.co/6y4g08x/default-avatar.png';

function calculateAge(dateString) {
    if (!dateString) return 'N/A';
    try {
        const parts = dateString.split('-');
        const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
    } catch (e) { return "N/A"; }
}

function showMemberDetails(id) {
    const member = membersData.find(m => m.id === id);
    if (member) {
        document.getElementById('modalImg').src = member.img || defaultAvatar;
        document.getElementById('modalName').innerText = member.name;
        document.getElementById('modalDob').innerText = member.dob || 'N/A';
        document.getElementById('modalAge').innerText = calculateAge(member.dob) + ' বছর';
        document.getElementById('modalPhone').innerText = member.phone || 'N/A';
        document.getElementById('modalBlood').innerText = member.blood || 'N/A';
        document.getElementById('modalIncome').innerText = member.income || 'N/A';
        document.getElementById('modalLocation').innerText = member.location || 'N/A';
        openModal('memberModal');
    }
}

function filterMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const filterType = document.getElementById('memberTypeFilter').value;

    document.querySelectorAll('#memberList .member-item').forEach(item => {
        const nameMatch = item.textContent.toLowerCase().includes(searchTerm);
        const typeMatch = (filterType === 'all') || (item.dataset.type === filterType);
        item.style.display = (nameMatch && typeMatch) ? "flex" : "none";
    });
}

async function loadMembers(db) {
    const memberList = document.getElementById('memberList');
    try {
        const q = query(collection(db, "members"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            memberList.innerHTML = '<p>কোনো সদস্য খুঁজে পাওয়া যায়নি।</p>';
            return;
        }
        memberList.innerHTML = '';
        membersData = [];
        querySnapshot.forEach((doc) => {
            const member = { id: doc.id, ...doc.data() };
            membersData.push(member);
            const item = document.createElement('div');
            item.className = 'member-item';
            item.dataset.type = member.isGuest ? 'guest' : 'registered';
            
            const guestBadge = member.isGuest ? '<span class="guest-badge">গেস্ট</span>' : '';

            item.innerHTML = `
                <img src="${member.img || defaultAvatar}" alt="${member.name}">
                <div class="member-info">${member.name} ${guestBadge}</div>`;
            
            item.onclick = () => showMemberDetails(member.id);
            memberList.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading members:", error);
        showError(memberList, "সদস্য তালিকা লোড করা সম্ভব হয়নি।");
    }
}

export async function init(db) {
    await loadMembers(db);
    document.getElementById('memberSearch').addEventListener('keyup', filterMembers);
    document.getElementById('memberTypeFilter').addEventListener('change', filterMembers);
}

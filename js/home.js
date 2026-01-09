import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { loadPage } from './main.js';

async function loadHomeNotices(db) {
    const noticeBoard = document.getElementById('homeNoticeBoard');
    try {
        const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            noticeBoard.innerHTML = '<p>কোনো নতুন নোটিশ নেই।</p>';
            return;
        }
        noticeBoard.innerHTML = '';
        querySnapshot.forEach(doc => {
            const notice = doc.data();
            noticeBoard.innerHTML += `<div class="notice-item"><h4>${notice.title}</h4><p>${notice.details}</p></div>`;
        });
    } catch (error) {
        console.error("Error loading notices:", error);
        showError(noticeBoard, "নোটিশ লোড করা সম্ভব হয়নি।");
    }
}

export async function init(db) {
    await loadHomeNotices(db);

    document.querySelectorAll('.feature-card-v2[data-page-link]').forEach(card => {
        card.addEventListener('click', () => {
            const pageName = card.dataset.pageLink;
            loadPage(pageName);
        });
    });
}

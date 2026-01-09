import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const donationPurposes = { "samajik": "সামাজিক উন্নয়ন", "khela": "খেলাধুলা", "mosjid": "মসজিদ উন্নয়ন", "madrasa": "মাদ্রাসা", "eid": "ঈদ উৎসব", "shikkha": "নামাজ/কুরআন শিক্ষা", "hafez": "হাফেজদের জন্য" };

async function loadFinanceData(db) {
    const financeDiv = document.getElementById('finance-summary');
    const filter = document.getElementById('financeFilter').value;
    financeDiv.innerHTML = '<p>লোড হচ্ছে...</p>';

    try {
        let donationsQuery = collection(db, "donations");
        let expensesQuery = collection(db, "expenses");

        if (filter === 'monthly') {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-${new Date(year, parseInt(month), 0).getDate()}`;
            
            donationsQuery = query(donationsQuery, where("date", ">=", startDate), where("date", "<=", endDate));
            expensesQuery = query(expensesQuery, where("date", ">=", startDate), where("date", "<=", endDate));
        }

        const [donationsSnapshot, expensesSnapshot] = await Promise.all([
            getDocs(donationsQuery), getDocs(expensesQuery)
        ]);

        let totalIncome = 0, totalExpense = 0;
        const purposeTotals = {};
        for (const key in donationPurposes) { purposeTotals[key] = { income: 0, expense: 0 }; }
        
        donationsSnapshot.forEach(doc => {
            const data = doc.data();
            totalIncome += Number(data.amount);
            if (data.purposeKey && purposeTotals[data.purposeKey]) {
                purposeTotals[data.purposeKey].income += Number(data.amount);
            }
        });

        expensesSnapshot.forEach(doc => {
            const data = doc.data();
            totalExpense += Number(data.amount);
            if (data.purposeKey && purposeTotals[data.purposeKey]) {
                purposeTotals[data.purposeKey].expense += Number(data.amount);
            }
        });
        
        let tableHTML = `<table class="finance-table"><thead><tr><th>খাত</th><th>মোট আয়</th><th>মোট ব্যয়</th><th>বর্তমান ব্যালেন্স</th></tr></thead><tbody>`;
        for (const key in purposeTotals) {
            const p = purposeTotals[key];
            const balance = p.income - p.expense;
            tableHTML += `<tr><td>${donationPurposes[key]}</td><td>${p.income.toLocaleString('bn-BD')}</td><td>${p.expense.toLocaleString('bn-BD')}</td><td>${balance.toLocaleString('bn-BD')}</td></tr>`;
        }
        const totalBalance = totalIncome - totalExpense;
        tableHTML += `</tbody><tfoot class="finance-total"><tr><td>সর্বমোট</td><td>${totalIncome.toLocaleString('bn-BD')}</td><td>${totalExpense.toLocaleString('bn-BD')}</td><td>${totalBalance.toLocaleString('bn-BD')}</td></tr></tfoot></table>`;
        financeDiv.innerHTML = tableHTML;

    } catch(error) {
        console.error("Error loading finance data:", error);
        showError(financeDiv, "আয়-ব্যয় হিসাব লোড করা সম্ভব হয়নি।");
    }
}

export async function init(db) {
    await loadFinanceData(db);

    document.getElementById('financeFilter').addEventListener('change', () => {
        loadFinanceData(db);
    });
}
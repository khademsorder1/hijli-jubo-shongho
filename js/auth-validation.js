class AuthValidation {
    constructor() {
        this.usedPhones = new Set();
        this.usedEmails = new Set();
    }
    
    validatePhone(phone) {
        // Must start with 01 and be 11 digits
        const phoneRegex = /^01[3-9]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            throw new Error("ফোন নম্বরটি অবশ্যই 01 দিয়ে শুরু করে 11 ডিজিটের হতে হবে");
        }
        
        // Check if phone already exists
        if (this.usedPhones.has(phone)) {
            throw new Error("এই ফোন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে");
        }
        
        return true;
    }
    
    validateEmail(email) {
        if (this.usedEmails.has(email)) {
            throw new Error("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে");
        }
        return true;
    }
    
    async checkPhoneExists(db, phone) {
        const q = query(collection(db, "members"), where("phone", "==", phone));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }
    
    async checkEmailExists(db, email) {
        const q = query(collection(db, "members"), where("email", "==", email));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }
}
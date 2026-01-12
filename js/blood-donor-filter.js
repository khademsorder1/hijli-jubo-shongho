class BloodDonorFilter {
    filterDonors(members) {
        return members.filter(member => {
            // Check if not interested in blood donation
            if (member.bloodDonor === 'no') return false;
            
            // Check health issues
            if (member.healthIssues && this.hasSeriousHealthIssues(member.healthIssues)) {
                return false;
            }
            
            // Check last donation date
            if (member.lastDonationDate) {
                const lastDonation = new Date(member.lastDonationDate);
                const nextDonationDate = new Date(lastDonation);
                nextDonationDate.setMonth(nextDonationDate.getMonth() + 4);
                
                if (new Date() < nextDonationDate) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    hasSeriousHealthIssues(healthIssues) {
        const seriousIssues = [
            'হৃদরোগ', 'heart disease', 'ক্যান্সার', 'cancer', 'এইডস', 'aids',
            'হেপাটাইটিস', 'hepatitis', 'ডায়াবেটিস', 'diabetes', 'উচ্চ রক্তচাপ'
        ];
        
        return seriousIssues.some(issue => 
            healthIssues.toLowerCase().includes(issue.toLowerCase())
        );
    }
}
const admin = require('firebase-admin');
const serviceAccount = require('./venus-ark-aix-firebase-adminsdk-fbsvc-707a084ccd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkFirestoreData() {
  const year = 2025;
  const weekNumber = 26;

  console.log(`Checking for year: ${year}, weekNumber: ${weekNumber}`);

  try {
    const snapshot = await db.collection('weekly_reports')
      .where('year', '==', year)
      .where('weekNumber', '==', weekNumber)
      .get();

    if (snapshot.empty) {
      console.log('No matching documents found.');
      return;
    }

    console.log(`Found ${snapshot.size} documents:`);
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
    });
  } catch (error) {
    console.error('Error getting documents:', error);
  }
}

checkFirestoreData();

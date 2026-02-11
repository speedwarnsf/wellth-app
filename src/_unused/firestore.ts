import { collection, doc, writeBatch, runTransaction, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { tips } from '../data/tipData';

// Function to populate Firestore with initial tips
export const populateTips = async () => {
  const tipsCollection = collection(db, 'tips');
  const batch = writeBatch(db);

  tips.forEach(tip => {
    const docRef = doc(tipsCollection, tip.id);
    batch.set(docRef, { ...tip, upvoteCount: 0 });
  });

  try {
    await batch.commit();
    console.log('Tips successfully populated in Firestore!');
  } catch (error) {
    console.error('Error populating tips: ', error);
  }
};


// Function to upvote a tip
export const upvoteTip = async (tipId: string) => {
  const tipRef = doc(db, 'tips', tipId);

  try {
    await runTransaction(db, async (transaction) => {
      const tipDoc = await transaction.get(tipRef);
      if (!tipDoc.exists()) {
        throw "Document does not exist!";
      }
      transaction.update(tipRef, { upvoteCount: increment(1) });
    });
    console.log("Tip upvoted successfully!");
  } catch (error) {
    console.error("Error upvoting tip: ", error);
  }
};

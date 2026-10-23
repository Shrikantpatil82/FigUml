import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DIAGRAMS_COLLECTION = 'diagrams';

/**
 * Save or update a diagram in Firestore.
 */
export async function saveDiagram(diagramId, userId, data) {
    const docRef = doc(db, DIAGRAMS_COLLECTION, diagramId);
    await setDoc(docRef, {
        ...data,
        userId,
        updatedAt: serverTimestamp(),
        createdAt: data.createdAt || serverTimestamp(),
    }, { merge: true });
}

/**
 * Load a single diagram by ID (no auth required — for shared views).
 */
export async function loadDiagram(diagramId) {
    const docRef = doc(db, DIAGRAMS_COLLECTION, diagramId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
}

/**
 * List all diagrams for a user.
 * Removed orderBy to avoid requiring a composite Firestore index —
 * sorting is done client-side instead for faster initial load.
 */
export async function listUserDiagrams(userId) {
    const q = query(
        collection(db, DIAGRAMS_COLLECTION),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort client-side by updatedAt descending
    results.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
    });

    return results;
}

/**
 * Delete a diagram by ID.
 */
export async function deleteDiagram(diagramId) {
    const docRef = doc(db, DIAGRAMS_COLLECTION, diagramId);
    await deleteDoc(docRef);
}

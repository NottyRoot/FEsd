/* =========================================================================
   MMIT Portfolio Hub — Data Store (Firestore-backed)
   ---------------------------------------------------------------------------
   โครงข้อมูลบน Firestore:

     projects/{projectId}/likes/{uid}   { createdAt: <serverTimestamp> }
         → 1 doc ต่อ 1 คนต่อ 1 โปรเจกต์  = บังคับ "1 คน 1 โหวต" ระดับฐานข้อมูล
           (คนเดียวกันกดซ้ำจะได้ doc เดิม นับเป็น 1 เสมอ)

     feedback/{autoId}
         { uid, projectId, projectTitle, author, rating, comment, createdAt }
         → ฟีดแบ็กจริงทุกคนที่ส่งเข้ามา

   ไม่มีตัวเลข hardcode ใดๆ — ทุกค่ามาจากฐานข้อมูล
   ========================================================================= */

const Store = (function () {

    let mode = 'local';          // 'firestore' | 'local'
    let db = null;
    let uid = null;
    let unsubscribeFeedback = null;

    const FEEDBACK_LIMIT = 100;  // โหลดฟีดแบกล่าสุด 100 รายการแรก

    // ---------------------------------------------------------------- utils
    function newId() {
        return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function tsToMillis(v) {
        if (v == null) return Date.now();
        if (typeof v === 'number') return v;
        if (typeof v.toMillis === 'function') return v.toMillis();   // Firestore Timestamp
        if (v instanceof Date) return v.getTime();
        return Date.now();
    }

    // ------------------------------------------------------------- local IO
    let memoryUid = null;   // fallback ถ้า localStorage ใช้ไม่ได้ (Private Mode)

    const local = {
        get uid() {
            const saved = safeStorage.get('mmit_uid');
            if (saved) return saved;
            if (!memoryUid) memoryUid = newId();
            safeStorage.set('mmit_uid', memoryUid);
            return memoryUid;
        },
        likes() { try { return JSON.parse(safeStorage.get('mmit_likes') || '{}'); } catch (e) { return {}; } },
        saveLikes(o) { safeStorage.set('mmit_likes', JSON.stringify(o)); },
        feedback() { try { return JSON.parse(safeStorage.get('mmit_feedback') || '[]'); } catch (e) { return []; } },
        saveFeedback(a) { safeStorage.set('mmit_feedback', JSON.stringify(a)); }
    };

    // --------------------------------------------------------------- init
    async function init() {
        if (!IS_FIREBASE_CONFIGURED || typeof firebase === 'undefined') {
            mode = 'local';
            uid = local.uid;
            return mode;
        }

        try {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.firestore();
            await firebase.auth().signInAnonymously();
            uid = firebase.auth().currentUser.uid;
            mode = 'firestore';
        } catch (err) {
            console.warn('[Store] Firebase init ไม่สำเร็จ, ใช้ local mode ชั่วคราว:', err && err.message);
            mode = 'local';
            uid = local.uid;
        }
        return mode;
    }

    // ---------------------------------------------------------- firestore
    const likesRef = (projectId) => db.collection('projects').doc(projectId).collection('likes');

    async function fsCountLikes(projectId) {
        const ref = likesRef(projectId);
        try {                                    // aggregation — อ่านน้อยกว่ามาก
            const snap = await ref.count().get();
            return snap.data().count;
        } catch (e) {                            // fallback สำหรับ SDK เก่า
            const snap = await ref.get();
            return snap.size;
        }
    }

    async function fsHasLiked(projectId) {
        const snap = await likesRef(projectId).doc(uid).get();
        return snap.exists;
    }

    async function fsSetLike(projectId, want) {
        const ref = likesRef(projectId).doc(uid);
        if (want) {
            await ref.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            await ref.delete();
        }
        return fsCountLikes(projectId);
    }

    // ------------------------------------------------------ project stats
    async function getProjectStats() {
        const ids = projectsData.map(p => p.id);

        if (mode === 'firestore') {
            const [counts, likedFlags, feedback] = await Promise.all([
                Promise.all(ids.map(fsCountLikes)),
                Promise.all(ids.map(fsHasLiked)),
                fetchFeedback()
            ]);
            return buildStats(ids, counts, likedFlags, feedback);
        }

        const likes = local.likes();
        const counts = ids.map(id => likes[id] ? 1 : 0);
        const likedFlags = ids.map(id => Boolean(likes[id]));
        return buildStats(ids, counts, likedFlags, local.feedback());
    }

    function buildStats(ids, counts, likedFlags, feedback) {
        const stats = {};
        ids.forEach((id, i) => {
            const rs = feedback.filter(f => f.projectId === id).map(f => f.rating);
            stats[id] = {
                likes: counts[i],
                userLiked: likedFlags[i],
                ratingCount: rs.length,
                rating: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0
            };
        });
        return stats;
    }

    // ------------------------------------------------------------- likes
    async function toggleLike(projectId) {
        const current = await isLiked(projectId);
        const want = !current;

        let newCount;
        if (mode === 'firestore') {
            newCount = await fsSetLike(projectId, want);
        } else {
            const likes = local.likes();
            if (want) likes[projectId] = Date.now(); else delete likes[projectId];
            local.saveLikes(likes);
            newCount = Object.keys(likes).includes(projectId) ? 1 : 0;
        }

        applyStats(projectId, { likes: newCount, userLiked: want });
        return { likes: newCount, userLiked: want };
    }

    async function isLiked(projectId) {
        if (mode === 'firestore') return fsHasLiked(projectId);
        return Boolean(local.likes()[projectId]);
    }

    // ---------------------------------------------------------- feedback
    async function fetchFeedback() {
        if (mode === 'firestore') {
            const snap = await db.collection('feedback')
                .orderBy('createdAt', 'desc')
                .limit(FEEDBACK_LIMIT)
                .get();
            return snap.docs.map(d => {
                const v = d.data();
                return normalizeFeedback(d.id, v);
            });
        }
        return local.feedback().map(f => normalizeFeedback(f.id, f));
    }

    function normalizeFeedback(id, v) {
        return {
            id: id,
            uid: v.uid || '',
            projectId: v.projectId || '',
            projectTitle: v.projectTitle || '',
            author: v.author || '',
            rating: Math.min(5, Math.max(1, parseInt(v.rating, 10) || 5)),
            comment: v.comment || '',
            createdAt: tsToMillis(v.createdAt)
        };
    }

    async function submitFeedback(payload) {
        const doc = {
            uid: uid,
            projectId: payload.projectId,
            projectTitle: payload.projectTitle,
            author: String(payload.author).slice(0, MAX_AUTHOR_LEN),
            rating: Math.min(5, Math.max(1, parseInt(payload.rating, 10) || DEFAULT_RATING)),
            comment: String(payload.comment).slice(0, MAX_COMMENT_LEN),
            createdAt: (mode === 'firestore')
                ? firebase.firestore.FieldValue.serverTimestamp()
                : Date.now()
        };

        if (mode === 'firestore') {
            const ref = await db.collection('feedback').add(doc);
            return normalizeFeedback(ref.id, Object.assign({}, doc, { createdAt: Date.now() }));
        }

        const mine = Object.assign({ id: newId() }, doc);
        const all = local.feedback();
        all.unshift(mine);
        local.saveFeedback(all);
        return normalizeFeedback(mine.id, mine);
    }

    // realtime feed — local mode ไม่มี listener ให้ return noop
    function subscribeFeedback(cb) {
        if (unsubscribeFeedback) { unsubscribeFeedback(); unsubscribeFeedback = null; }
        if (mode !== 'firestore') return function () {};

        unsubscribeFeedback = db.collection('feedback')
            .orderBy('createdAt', 'desc')
            .limit(FEEDBACK_LIMIT)
            .onSnapshot(snap => {
                cb(snap.docs.map(d => normalizeFeedback(d.id, d.data())));
            }, err => console.warn('[Store] feedback listener error:', err && err.message));

        return function () { if (unsubscribeFeedback) { unsubscribeFeedback(); unsubscribeFeedback = null; } };
    }

    // ---------------------------------------------------------- sync view
    function applyStats(projectId, patch) {
        const p = projectsData.find(x => x.id === projectId);
        if (!p) return;
        p.likes = patch.likes;
        p.userLiked = patch.userLiked;
    }

    return {
        init, getProjectStats, toggleLike, isLiked,
        submitFeedback, fetchFeedback, subscribeFeedback, applyStats,
        get mode() { return mode; },
        get uid() { return uid; }
    };
})();

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/config';
import { collection, addDoc, query, orderBy, limit, onSnapshot, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { LogOut, Activity } from 'lucide-react';
import AISupport from '../components/AISupport';
import { analyzeEmotionalTrends } from '../services/ai';

const emojis = [
  { score: 3, icon: '😊', label: 'Good' },
  { score: 2, icon: '😐', label: 'Okay' },
  { score: 1, icon: '😞', label: 'Struggling' }
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState(null);
  const [supportUsers, setSupportUsers] = useState([]);
  const [dbError, setDbError] = useState(null);

  // Note: For a real app, 'circleId' would be dynamic based on user membership
  // Keeping it static 'demo-circle' for simplicity in this MVP
  const circleId = 'demo-circle';

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to feed. 
    // We only order by timestamp to rely on the default single-field index.
    // This avoids forcing the user to build a composite index in the Firebase console.
    const q = query(
      collection(db, 'Moods'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const moods = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(m => m.circleId === circleId) // Filter locally instead
        .filter(m => m.timestamp && m.timestamp.toDate() >= threeDaysAgo); // Only last 3 days
      setFeed(moods);
    }, (error) => {
      console.error("Firestore Feed Error:", error);
      setDbError(`Failed to load feed: ${error.message}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Check personal trends
  useEffect(() => {
    const checkTrends = async () => {
      if(!user || feed.length === 0) return;
      
      // Instead of running a second database query that requires a composite index,
      // we can just derive the current user's recent moods from the feed we already downloaded!
      const recentMoods = feed.filter(m => m.userId === user.uid).slice(0, 7);
      
      if (recentMoods.length > 0) {
        try {
          const analysis = await analyzeEmotionalTrends(recentMoods);
          if (analysis.alert) {
            setAlertState(analysis);
          }
        } catch (error) {
          console.error("Gemini Trends Error:", error);
        }
      }
    };
    checkTrends();
  }, [feed, user]);

  // Find missing or struggling friends
  useEffect(() => {
    if (!user) return;
    
    const calculateSupportUsers = () => {
      // We look through the recent feed (which corresponds to recent circle activity)
      // to find out who is active but hasn't posted recently, or posted a struggling mood.
      const latestCheckIns = new Map();
      const now = new Date();
      
      feed.forEach(doc => {
        if (doc.userId !== user.uid) {
          if (!latestCheckIns.has(doc.userId)) {
            latestCheckIns.set(doc.userId, {
              userName: doc.userName,
              timestamp: doc.timestamp?.toDate ? doc.timestamp.toDate() : new Date(),
              score: doc.emoji_score
            });
          }
        }
      });

      const flagged = [];
      latestCheckIns.forEach((info) => {
        const hoursSinceLast = (now - info.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLast > 24) {
          flagged.push({ userName: info.userName, status: 'missing' });
        } else if (info.score === 1) {
          flagged.push({ userName: info.userName, status: 'struggling' });
        }
      });

      setSupportUsers(flagged);
    };

    calculateSupportUsers();
  }, [feed, user]);

  const handleCheckIn = async (score) => {
    try {
      setLoading(true);
      setDbError(null);
      await addDoc(collection(db, 'Moods'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL,
        emoji_score: score,
        circleId,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding check-in: ", error);
      setDbError(`Failed to save check-in: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-sage-light)] text-gray-800 p-4 font-sans pb-24">
      <header className="flex justify-between items-center mb-8 pt-4 px-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Real Talk ⭕
        </h1>
        <button onClick={logout} className="p-2 bg-white rounded-full shadow-sm text-gray-500">
          <LogOut size={20} />
        </button>
      </header>

      {/* Database Error Banner */}
      {dbError && (
        <div className="bg-red-50 border border-red-500 p-4 rounded-xl mb-6 mx-2 text-red-800 shadow-sm flex items-start gap-3">
          <Activity className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Database Connection Error</h3>
            <p className="text-sm">{dbError}</p>
            {dbError.toLowerCase().includes("permission") && (
              <p className="text-sm mt-2 font-medium">Please update your Firebase Firestore Security Rules to allow reads and writes.</p>
            )}
            {dbError.toLowerCase().includes("index") && (
               <p className="text-sm mt-2 font-medium">You need an index! Check your browser's dev console for a direct Firebase link to create it.</p>
            )}
          </div>
        </div>
      )}

      {/* Check In Section */}
      <section className="glass-light p-6 rounded-3xl mb-8">
        <h2 className="text-lg font-semibold mb-4 text-center">How are you feeling today?</h2>
        <div className="flex justify-center gap-4">
          {emojis.map((e) => (
            <button
              key={e.score}
              onClick={() => handleCheckIn(e.score)}
              disabled={loading}
              className="text-4xl hover:scale-110 transition-transform disabled:opacity-50 p-3 bg-white rounded-2xl shadow-sm"
              title={e.label}
            >
              {e.icon}
            </button>
          ))}
        </div>
      </section>

      {/* Personal AI Alerts */}
      {alertState && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-8 flex gap-3 text-red-800 shadow-sm items-start">
           <Activity className="shrink-0 mt-1" size={20} />
           <div>
             <h3 className="font-bold">Trend Alert</h3>
             <p className="text-sm">{alertState.explanation}</p>
           </div>
        </div>
      )}

      {/* Circle Feed */}
      <section>
        <h2 className="text-xl font-bold mb-4 px-2">Circle Feed</h2>
        
        {/* Render AI Support Component at top if any friends are struggling or missing */}
        {supportUsers.length > 0 && (
           <AISupport supportUsers={supportUsers} />
        )}

        <div className="space-y-4 className=mt-6">
          {feed.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No check-ins yet. Be the first!</p>
           ) : (
             feed.map(mood => {
               const emojiObj = emojis.find(e => e.score === mood.emoji_score);
               const emoji = emojiObj?.icon || '❓';
               const label = emojiObj?.label || 'Unknown';
               const isAlerting = mood.emoji_score === 1; // Basic trigger for friend support
               return (
                 <div key={mood.id} className="glass-light p-4 rounded-2xl flex items-center gap-4">
                   <img src={mood.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(mood.userName || 'U')}&background=839b81&color=fff&rounded=true`} alt="avatar" className="w-10 h-10 rounded-full bg-gray-200" />
                   <div className="flex-1">
                     <p className="font-medium">{mood.userName}</p>
                     <p className="text-xs text-gray-500">
                       {mood.timestamp?.toDate ? new Date(mood.timestamp.toDate()).toLocaleString() : 'Just now'}
                     </p>
                   </div>
                   <div className="text-3xl cursor-help" title={label}>{emoji}</div>
                   
                   {/* Friend support suggestions if someone is struggling */}
                   {isAlerting && mood.userId !== user.uid && (
                     <div className="mt-2 w-full absolute invisible">
                       {/* Realistically would go below or open in modal */}
                     </div>
                   )}
                 </div>
               )
             })
          )}
        </div>
      </section>

      <footer className="mt-12 text-center text-[10px] text-gray-400 px-4 leading-relaxed">
        <strong>Disclaimer:</strong> This tool is for informational purposes only. Results are not medical advice. Consult highly qualified healthcare professionals for clinical diagnosis or medical treatment.
      </footer>
    </div>
  );
};

export default Dashboard;

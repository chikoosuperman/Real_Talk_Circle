import { useState, useEffect } from 'react';
import { suggestSupportiveMessage } from '../services/ai';
import { MessageCircleHeart, Loader2 } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AISupport = ({ supportUsers, userId }) => {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!supportUsers || supportUsers.length === 0 || !userId) return;
      
      setLoading(true);
      const contextItems = supportUsers.map(u => 
        `${u.userName} is ${u.status === 'missing' ? 'missing their check-in today' : 'struggling with their mood'}`
      );
      const context = contextItems.join('. ');
      
      const todayStr = new Date().toISOString().split('T')[0];
      const cacheKey = context;
      
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.aiCache && data.aiCache.date === todayStr && data.aiCache.key === cacheKey) {
             setSuggestion(data.aiCache.suggestion);
             setLoading(false);
             return;
          }
        }
        
        const message = await suggestSupportiveMessage(context);
        setSuggestion(message);
        
        await setDoc(userRef, {
          aiCache: {
            date: todayStr,
            key: cacheKey,
            suggestion: message
          }
        }, { merge: true });

      } catch (error) {
        console.error("AI Cache setup error:", error);
        const fbMessage = await suggestSupportiveMessage(context);
        setSuggestion(fbMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestion();
  }, [supportUsers, userId]);

  if (!supportUsers || supportUsers.length === 0) return null;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-[var(--color-sage-light)] rounded-3xl shadow-sm border border-[var(--color-sage-medium)]">
      <div className="flex items-center gap-3 mb-3 text-[var(--color-sage-dark)]">
        <MessageCircleHeart size={24} />
        <h3 className="font-bold text-lg">AI Support Suggestion</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        {supportUsers.map(u => u.userName).join(', ')} might need some support right now. Here's a suggestion on what to say:
      </p>

      <div className="bg-white p-4 rounded-2xl relative min-h-[80px] flex items-center shadow-sm">
        {loading ? (
          <div className="flex w-full justify-center">
             <Loader2 className="animate-spin text-[var(--color-sage-dark)]" />
          </div>
        ) : (
          <p className="text-gray-800 italic font-medium relative z-10 w-full">"{suggestion}"</p>
        )}
      </div>
      
      <button 
        onClick={() => {
          navigator.clipboard.writeText(suggestion);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="w-full mt-4 bg-[var(--color-sage-dark)] hover:bg-[#6c876a] text-white py-3 rounded-xl shadow-md transition-colors font-medium flex justify-center items-center gap-2"
      >
        {copied ? 'Copied!' : 'Copy Message'}
      </button>
    </div>
  );
};

export default AISupport;

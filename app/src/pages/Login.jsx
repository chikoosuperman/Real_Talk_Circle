import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Leaf, Loader2 } from 'lucide-react';

const Login = () => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name || 'Anonymous');
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists!');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
       await loginWithGoogle();
    } catch(err) {
       setError(err.message || 'Google sign in failed');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[var(--color-sage-light)] to-[var(--color-cream-light)]">
      <div className="glass max-w-sm w-full p-8 rounded-3xl text-center space-y-6 glass-light">
        <div className="flex justify-center mb-2">
          <div className="bg-[var(--color-sage-medium)] text-white p-4 rounded-full shadow-lg">
            <Leaf size={40} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">Real Talk Circle ⭕</h1>
          <p className="text-gray-600 text-sm max-w-[250px] mx-auto text-balance leading-relaxed">
            Your private space for authentic emotional check-ins.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Display Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-medium)] text-gray-800"
              required
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-medium)] text-gray-800"
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-medium)] text-gray-800"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center bg-[var(--color-sage-dark)] text-white py-3 px-6 rounded-xl shadow-md hover:bg-opacity-90 transition-all font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="relative flex items-center py-2">
           <div className="flex-grow border-t border-gray-200"></div>
           <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
           <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-medium border border-gray-100 disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-gray-500 text-sm pt-2">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="ml-1 text-[var(--color-sage-dark)] font-medium hover:underline focus:outline-none"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>

      </div>

      <p className="max-w-xs text-center text-[10px] text-gray-400 mt-8 px-4 leading-relaxed text-balance">
        <strong>Disclaimer:</strong> This application is for informational purposes only. It is not medical advice nor a substitute for professional clinical treatment.
      </p>
    </div>
  );
};

export default Login;

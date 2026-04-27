import { useState, useEffect } from 'react';
import { User, Check, Edit2, AlertCircle } from 'lucide-react';
import { gasAuth, fetchFromGas } from '../services/gasService';

interface ProfileProps {
  onBack: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const [fullName, setFullName] = useState(gasAuth.getFullName());
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const handleSave = async () => {
    if (!fullName.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      await fetchFromGas('updateProfile', { fullName: fullName.trim() });
      const currentSession = JSON.parse(localStorage.getItem('gas_session') || '{}');
      currentSession.fullName = fullName.trim();
      localStorage.setItem('gas_session', JSON.stringify(currentSession));
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Your Profile</h1>
        
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-cyan-900 text-cyan-400 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                {fullName.substring(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                <p className="text-sm text-neutral-400">Update your details</p>
              </div>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-900/50 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Full Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                />
              ) : (
                <div className="text-white text-lg">{fullName}</div>
              )}
            </div>
            
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(gasAuth.getFullName());
                    setError('');
                  }}
                  className="px-4 py-2 text-neutral-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !fullName.trim()}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

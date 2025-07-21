import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeClubName, parseNumber, formatInteger } from './clubOrdering';

const ProfilePage = ({ user }) => {
  const [profile, setProfile] = useState({
    handicap: '',
    age: '',
    homeCourseElevation: '',
    myBag: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newClub, setNewClub] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    // Type safety for numbers
    const handicap = parseNumber(profile.handicap, '');
    const age = parseNumber(profile.age, '');
    const homeCourseElevation = parseNumber(profile.homeCourseElevation, '');
    if (handicap === '' || age === '' || homeCourseElevation === '') {
      setMessage('Error: Handicap, Age, and Elevation must be numbers.');
      return;
    }
    // Type safety for clubs
    const myBag = profile.myBag.map(normalizeClubName);
    setSaving(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), { ...profile, handicap, age, homeCourseElevation, myBag });
      setMessage('Profile saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddClub = () => {
    if (newClub.trim()) {
      setProfile(prev => ({
        ...prev,
        myBag: [...prev.myBag, newClub.trim()]
      }));
      setNewClub('');
    }
  };

  const handleRemoveClub = (index) => {
    setProfile(prev => ({
      ...prev,
      myBag: prev.myBag.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-12 animate-fade-in">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-300 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Neo-Brutalism Header */}
        <div className="mb-12">
          <div className="chunky-card bg-gradient-to-r from-pink-500 to-red-600">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  👤 PROFILE
                </h1>
                <p className="text-white/90 text-lg font-medium">
                  Manage Your Account Settings
                </p>
              </div>
              <div className="text-6xl">
                ⚙️
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') 
              ? 'text-red-300' 
              : 'text-green-300'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Info Form */}
          <div className="chunky-card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handicap
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.handicap}
                  onChange={(e) => handleInputChange('handicap', e.target.value)}
                  placeholder="e.g., 12.5"
                  className="chunky-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="e.g., 35"
                  className="chunky-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Course Elevation (ft)
                </label>
                <input
                  type="number"
                  value={profile.homeCourseElevation}
                  onChange={(e) => handleInputChange('homeCourseElevation', e.target.value)}
                  placeholder="e.g., 1200"
                  className="chunky-input w-full"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="chunky-button chunky-button-primary w-full"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* My Bag Component */}
          <div className="chunky-card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Bag</h2>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newClub}
                  onChange={(e) => setNewClub(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddClub()}
                  placeholder="e.g., TaylorMade Stealth 2 Driver"
                  className="chunky-input flex-1"
                />
                <button
                  onClick={handleAddClub}
                  className="chunky-button chunky-button-secondary"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {profile.myBag.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No clubs added yet</p>
                ) : (
                  profile.myBag.map((club, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 rounded-lg p-3 border border-gray-300">
                      <span className="text-gray-800">{club}</span>
                      <button
                        onClick={() => handleRemoveClub(index)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {profile.myBag.length > 0 && (
                <div className="text-sm text-gray-400 text-center">
                  {profile.myBag.length} club{profile.myBag.length !== 1 ? 's' : ''} in bag
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="mt-8 chunky-card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2 font-sans">
                {profile.handicap ? formatInteger(profile.handicap) : ' '}
              </div>
              <div className="text-gray-600">Handicap</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2 font-sans">
                {profile.age ? formatInteger(profile.age) : ' '}
              </div>
              <div className="text-gray-600">Age</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2 font-sans">
                {formatInteger(profile.myBag.length)}
              </div>
              <div className="text-gray-600">Clubs in Bag</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 
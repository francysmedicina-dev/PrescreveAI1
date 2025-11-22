
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Editor from './components/Editor';
import Preview from './components/Preview';
import CertificateGenerator from './components/CertificateGenerator';
import HistoryModal from './components/HistoryModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import { PrescriptionState, Doctor, SavedPrescription, Institution } from './types';
import { savePrescriptionToHistory, getHeaderImage, getHeaderSettings, getCurrentInstitution } from './services/storageService';
import { getSession, logout } from './services/authService';

// Mock Doctor Data for Guest Mode Initial State
const MOCK_DOCTOR: Doctor = {
  name: "Visitante (Exemplo)",
  crm: "00000-UF",
  specialty: "Clínica Médica"
};

const INITIAL_STATE: PrescriptionState = {
  patient: {
    name: "",
    age: "",
    document: "",
    address: "",
    isPregnant: false,
    isPediatric: false,
    pediatricData: "",
  },
  medications: [],
  customInstructions: "",
  includeCustomInstructions: true,
  diagnosis: "",
  cid: "",
  includeCid: false,
  includeAddress: false,
  date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  certificate: {
    type: 'medical',
    days: '1',
    period: '',
    includeCid: false,
    includeCompanion: false,
    companionName: '',
    companionDocument: ''
  }
};

function App() {
  // Authentication State
  const [user, setUser] = useState<Doctor | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  // Guest Mode Editable State
  const [guestDoctor, setGuestDoctor] = useState<Doctor>(MOCK_DOCTOR);

  // App State
  const [state, setState] = useState<PrescriptionState>(INITIAL_STATE);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'certificate' | 'profile'>('editor');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Global Settings State
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [hideTextHeader, setHideTextHeader] = useState(false);
  const [institution, setInstitution] = useState<Institution>({ id: '', name: '', address: '', city: '', state: '', phone: '' });

  // Initial Load & Session Check
  useEffect(() => {
    // Dark Mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load stored settings
    setHeaderImage(getHeaderImage());
    setHideTextHeader(getHeaderSettings());
    setInstitution(getCurrentInstitution());

    // Check Auth Session
    const sessionUser = getSession();
    if (sessionUser) {
      setUser(sessionUser);
    }
  }, [isDarkMode]);

  // --- Auth Handlers ---

  const handleLoginSuccess = (loggedInUser: Doctor) => {
    setUser(loggedInUser);
    setIsGuest(false);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsGuest(false);
    setAuthView('login');
    // Reset guest doctor to default
    setGuestDoctor(MOCK_DOCTOR);
    // Optional: Reset app state
    setState(INITIAL_STATE);
    setViewMode('editor');
  };

  const handleSkipLogin = () => {
    setIsGuest(true);
    setUser(null);
  };
  
  const handleProfileUpdate = (updatedUser: Doctor) => {
    setUser(updatedUser);
  };

  // --- App Logic ---

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSaveHistory = () => {
    if (!state.diagnosis && state.medications.length === 0) {
      alert("Preencha o diagnóstico ou medicamentos antes de salvar.");
      return;
    }
    savePrescriptionToHistory(state);
    alert("Modelo salvo no histórico com sucesso!");
  };

  const handleLoadHistory = (saved: SavedPrescription) => {
    if (confirm("Carregar este modelo substituirá os dados atuais. Deseja continuar?")) {
      // Load the state but update the date to today, as we are reusing the template
      const today = new Date().toISOString().split('T')[0];
      
      setState({
        ...saved.state,
        date: today
      });
      
      setIsHistoryOpen(false);
      setViewMode('editor');
    }
  };

  const renderContent = () => {
    // Determine effective doctor profile: User (if logged in) OR Guest Editable Doctor (if guest)
    const activeDoctor = user || guestDoctor;

    switch (viewMode) {
      case 'editor':
        return (
          <div className="h-full max-w-4xl mx-auto animate-in fade-in duration-300">
            <Editor 
              state={state} 
              setState={setState} 
              onPreview={() => setViewMode('preview')} 
              onCertificate={() => setViewMode('certificate')}
              onSave={handleSaveHistory}
              // Guest Mode Props
              isGuest={isGuest}
              guestDoctor={guestDoctor}
              onUpdateGuestDoctor={setGuestDoctor}
            />
          </div>
        );
      case 'preview':
        return (
          <div className="h-full animate-in fade-in duration-300">
             <Preview 
              state={state} 
              setState={setState}
              doctor={activeDoctor} 
              institution={institution}
              onBack={() => setViewMode('editor')} 
              customHeaderImage={headerImage}
              hideTextHeader={hideTextHeader}
             />
          </div>
        );
      case 'certificate':
        return (
          <div className="h-full animate-in fade-in duration-300">
            <CertificateGenerator
              state={state}
              setState={setState}
              doctor={activeDoctor}
              institution={institution}
              onBack={() => setViewMode('editor')}
              customHeaderImage={headerImage}
              hideTextHeader={hideTextHeader}
            />
          </div>
        );
      case 'profile':
        return (
          <div className="h-full animate-in fade-in duration-300">
             {user ? (
               <Profile 
                 user={user} 
                 onUpdateUser={handleProfileUpdate} 
                 onBack={() => setViewMode('editor')} 
               />
             ) : (
                <div className="text-center p-10">
                   <p>Acesso de visitante não permite edição de perfil.</p>
                   <button onClick={() => setViewMode('editor')} className="mt-4 text-blue-600 hover:underline">Voltar</button>
                </div>
             )}
          </div>
        );
      default:
        return null;
    }
  };

  // --- Conditional Rendering: Auth vs Main App ---

  // If not authenticated and not in guest mode, show Auth Screens
  if (!user && !isGuest) {
    return authView === 'login' ? (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onSwitchToRegister={() => setAuthView('register')} 
        onSkipLogin={handleSkipLogin}
      />
    ) : (
      <Register 
        onRegisterSuccess={handleLoginSuccess} 
        onSwitchToLogin={() => setAuthView('login')}
        onSkipLogin={handleSkipLogin}
      />
    );
  }

  // Main Application View
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setViewMode('profile')}
        onOpenHelp={() => setIsHelpOpen(true)}
        onLogout={handleLogout}
        user={user} // Pass user to header to display name/avatar
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-[calc(100vh-140px)] min-h-[600px]">
          {renderContent()}
        </div>
      </main>

      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onLoad={handleLoadHistory}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentImage={headerImage}
        onUpdateImage={setHeaderImage}
        hideTextHeader={hideTextHeader}
        onUpdateHideTextHeader={setHideTextHeader}
        institution={institution}
        onUpdateInstitution={setInstitution}
      />

      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isGuest={isGuest}
        onNavigate={(view) => {
           setViewMode(view);
           setIsHelpOpen(false);
        }}
      />
    </div>
  );
}

export default App;

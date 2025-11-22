
import React from 'react';
import { Stethoscope, Sun, Moon, History, Settings, LogOut, User, HelpCircle } from 'lucide-react';
import { Doctor } from '../types';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  user: Doctor | null;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, onOpenHistory, onOpenSettings, onOpenProfile, onOpenHelp, onLogout, user }) => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 no-print transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-medical-500 p-2 rounded-lg shadow-sm">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Prescreve AI</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Assistente de Prescrição Médica</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={onOpenHelp}
              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all"
              title="Como usar o aplicativo?"
            >
              <HelpCircle className="h-5 w-5" />
              <span className="hidden md:inline text-sm font-medium">Ajuda</span>
            </button>

             <button
              onClick={onOpenSettings}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
              title="Configurações de Impressão (Logo)"
            >
              <Settings className="h-5 w-5" />
            </button>
            
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-all"
              title="Histórico de Prescrições"
            >
              <History className="h-4 w-4" />
              <span className="hidden md:inline text-sm font-medium">Histórico</span>
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1">
                <button 
                  onClick={onOpenProfile}
                  className="h-9 w-9 rounded-full flex items-center justify-center font-bold border border-medical-200 dark:border-medical-800 overflow-hidden hover:ring-2 hover:ring-medical-400 transition-all focus:outline-none"
                  title={user?.name || "Meu Perfil"}
                >
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-medical-100 dark:bg-medical-900 text-medical-600 dark:text-medical-300 flex items-center justify-center">
                      {user ? user.name.substring(0,2).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                  )}
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React, { useState } from 'react';
import { Stethoscope, ArrowRight, Loader2, AlertCircle, UserX } from 'lucide-react';
import { login } from '../services/authService';
import { Doctor } from '../types';

interface LoginProps {
  onLoginSuccess: (user: Doctor) => void;
  onSwitchToRegister: () => void;
  onSkipLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister, onSkipLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const user = login(email, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
      }
    }, 800);
  };

  const handleForgotPassword = () => {
    alert("Recurso de recuperação de senha simulado.\n\nUm e-mail seria enviado para resetar sua senha.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-medical-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-6">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Acesse sua conta para gerenciar prescrições.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 animate-in slide-in-from-top-2">
             <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
             <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endereço de e-mail
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-900 transition-colors"
                placeholder="medico@exemplo.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                 <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                 </label>
                 <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-medical-600 dark:text-medical-400 hover:text-medical-500"
                 >
                    Esqueceu a senha?
                 </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-900 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 dark:bg-medical-600 dark:hover:bg-medical-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                   Entrar
                   <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>

             {/* Skip Login Button */}
            <button
              type="button"
              onClick={onSkipLogin}
              className="w-full flex justify-center py-3 px-4 border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold rounded-lg text-gray-600 dark:text-gray-300 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 transition-all focus:outline-none"
            >
               <span className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Pular login (Acesso Visitante)
               </span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ainda não tem uma conta?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-medium text-medical-600 dark:text-medical-400 hover:text-medical-500 hover:underline transition-colors"
            >
              Cadastre-se gratuitamente
            </button>
          </p>
        </div>
      </div>
      
      {/* Simple Footer Signature */}
      <div className="fixed bottom-4 text-center w-full text-xs text-gray-400 dark:text-gray-500">
        &copy; {new Date().getFullYear()} Prescreve AI. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default Login;
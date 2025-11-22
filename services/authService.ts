import { Doctor } from '../types';

const USERS_KEY = 'prescriber_users_db';
const SESSION_KEY = 'prescriber_active_session';

interface AuthResult {
  success: boolean;
  user?: Doctor;
  message?: string;
}

const getUsers = (): Doctor[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveUsers = (users: Doctor[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = (doctor: Doctor): AuthResult => {
  const users = getUsers();
  
  // Simple check if email exists
  if (doctor.email && users.some(u => u.email === doctor.email)) {
    return { success: false, message: "E-mail já cadastrado." };
  }

  const newUser = { 
    ...doctor, 
  };

  users.push(newUser);
  saveUsers(users);
  
  // Auto login
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  
  return { success: true, user: newUser };
};

export const login = (email: string, password: string): Doctor | null => {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
};

export const updateProfile = (updatedDoctor: Doctor): AuthResult => {
  const session = getSession();
  if (!session) return { success: false, message: "Sessão expirada." };

  const users = getUsers();
  // Find the user based on the original session email (before update)
  const index = users.findIndex(u => u.email === session.email);

  if (index === -1) {
    return { success: false, message: "Usuário não encontrado." };
  }

  // Check if new email is taken by someone else
  if (updatedDoctor.email !== session.email && users.some((u, i) => u.email === updatedDoctor.email && i !== index)) {
    return { success: false, message: "Este e-mail já está em uso por outra conta." };
  }

  // Update user
  users[index] = { ...updatedDoctor };
  saveUsers(users);

  // Update session
  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedDoctor));

  return { success: true, user: updatedDoctor };
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): Doctor | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};
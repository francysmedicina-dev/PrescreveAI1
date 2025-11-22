import { PrescriptionState, SavedPrescription, Institution } from "../types";
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'prescriber_ai_history';
const HEADER_IMAGE_KEY = 'prescriber_ai_header_image';
const HIDE_TEXT_HEADER_KEY = 'prescriber_ai_hide_text_header';
const SAVED_INSTITUTIONS_KEY = 'prescriber_ai_saved_institutions';
const CURRENT_INSTITUTION_KEY = 'prescriber_ai_current_institution';

// --- History Management ---

export const savePrescriptionToHistory = (state: PrescriptionState): SavedPrescription => {
  const history = getHistory();
  
  const diagnosisText = state.diagnosis || 'Prescrição Geral / Sem Diagnóstico';
  const patientRef = state.patient.name ? `(Ref: ${state.patient.name})` : '';

  const newEntry: SavedPrescription = {
    id: uuidv4(),
    timestamp: Date.now(),
    previewText: `${diagnosisText} ${patientRef}`.trim(),
    state: state
  };

  const updatedHistory = [newEntry, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return newEntry;
};

export const getHistory = (): SavedPrescription[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading history", error);
    return [];
  }
};

export const deleteFromHistory = (id: string): SavedPrescription[] => {
  const history = getHistory();
  const updatedHistory = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// --- Custom Header Management ---

export const saveHeaderImage = (base64Image: string): void => {
  try {
    localStorage.setItem(HEADER_IMAGE_KEY, base64Image);
  } catch (e) {
    console.error("Error saving image (likely too large)", e);
    alert("Erro ao salvar imagem. O arquivo pode ser muito grande para o armazenamento local.");
  }
};

export const getHeaderImage = (): string | null => {
  return localStorage.getItem(HEADER_IMAGE_KEY);
};

export const removeHeaderImage = (): void => {
  localStorage.removeItem(HEADER_IMAGE_KEY);
};

export const saveHeaderSettings = (hideText: boolean): void => {
  localStorage.setItem(HIDE_TEXT_HEADER_KEY, JSON.stringify(hideText));
};

export const getHeaderSettings = (): boolean => {
  const val = localStorage.getItem(HIDE_TEXT_HEADER_KEY);
  return val ? JSON.parse(val) : false;
};

// --- Institution Management ---

export const getSavedInstitutions = (): Institution[] => {
  try {
    const stored = localStorage.getItem(SAVED_INSTITUTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const saveInstitutionsList = (list: Institution[]): void => {
  localStorage.setItem(SAVED_INSTITUTIONS_KEY, JSON.stringify(list));
};

export const getCurrentInstitution = (): Institution => {
  try {
    const stored = localStorage.getItem(CURRENT_INSTITUTION_KEY);
    return stored ? JSON.parse(stored) : { id: '', name: '', address: '', city: '', state: '', phone: '' };
  } catch (error) {
    return { id: '', name: '', address: '', city: '', state: '', phone: '' };
  }
};

export const saveCurrentInstitution = (inst: Institution): void => {
  localStorage.setItem(CURRENT_INSTITUTION_KEY, JSON.stringify(inst));
};
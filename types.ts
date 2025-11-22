
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  quantity: string;
  unit: string;
  frequency: string;
  duration: string;
  instructions: string;
  isAiSuggested?: boolean;
}

export interface Patient {
  name: string;
  age: string;
  document: string; // CPF
  address?: string;
  isPregnant?: boolean;
  isPediatric?: boolean;
  pediatricData?: string; // Specific age/weight for pediatrics
}

export interface Doctor {
  name: string;
  crm: string;
  specialty: string;
  email?: string;
  password?: string;
  profileImage?: string; // Base64 string of the profile picture
}

export interface Institution {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
}

export interface CertificateConfig {
  type: 'medical' | 'attendance';
  days: string; // For medical certificate
  period: string; // For attendance declaration (e.g. "das 08:00 às 10:00")
  includeCid: boolean;
  includeCompanion: boolean;
  companionName: string;
  companionDocument: string;
}

export interface PrescriptionState {
  patient: Patient;
  medications: Medication[];
  customInstructions: string; // Personalized patient instructions
  includeCustomInstructions: boolean; // Toggle for printing instructions
  diagnosis: string; // Used for AI context
  cid: string; // Specific ICD code for printing
  includeCid: boolean; // Authorize CID printing on Prescription
  includeAddress: boolean; // Authorize Address printing
  date: string;
  certificate: CertificateConfig; // Configuration for the certificate view
}

export interface SavedPrescription {
  id: string;
  timestamp: number;
  previewText: string;
  state: PrescriptionState;
}

export interface AiSuggestionResponse {
  medications: {
    name: string;
    dosage: string;
    quantity: string;
    unit: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
}


import React, { useState, useRef } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Search, Calendar, MapPin, Eye, ShieldAlert, Baby, Users, Save, AlertCircle, AlertTriangle, FileText, UserCog, RefreshCw, ChevronDown, ChevronUp, Wand2, RotateCcw, X, Check } from 'lucide-react';
import { PrescriptionState, Medication, AiSuggestionResponse, Doctor } from '../types';
import { suggestPrescription, checkInteractions, generatePatientInstructions } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface EditorProps {
  state: PrescriptionState;
  setState: React.Dispatch<React.SetStateAction<PrescriptionState>>;
  onPreview: () => void;
  onSave: () => void;
  onCertificate: () => void;
  // Guest Mode Props
  isGuest?: boolean;
  guestDoctor?: Doctor;
  onUpdateGuestDoctor?: (doctor: Doctor) => void;
}

// Standard unit options
const UNIT_OPTIONS = [
  "Caixa(s)",
  "Frasco(s)",
  "Comprimido(s)",
  "Ampola(s)",
  "Bisnaga(s)",
  "Envelope(s)",
  "Unidade(s)",
  "Lata(s)",
  "Pacote(s)",
  "Uso Contínuo"
];

const AI_INSTRUCTION_CATEGORIES = [
  "Ortopédicas",
  "Fisioterápicas",
  "Repouso",
  "Exercícios",
  "Alimentação",
  "Hidratação",
  "Cuidados com Feridas",
  "Sinais de Alerta",
  "Outros"
];

// Helper to check if quantity is excessive based on unit
const isQuantityExcessive = (quantity: string, unit: string): boolean => {
  const qty = parseInt(quantity);
  if (isNaN(qty)) return false;

  switch (unit) {
    case "Caixa(s)":
      return qty > 3; // Warn on 4+ (Standard 3 month treatment usually max 3 boxes)
    case "Comprimido(s)":
      return qty > 90; // Warn on 91+
    case "Frasco(s)":
    case "Bisnaga(s)":
    case "Lata(s)":
    case "Pacote(s)":
      return qty > 5; // Warn on 6+
    case "Ampola(s)":
      return qty > 10;
    case "Envelope(s)":
    case "Unidade(s)":
      return qty > 30;
    default:
      return qty > 10;
  }
};

const Editor: React.FC<EditorProps> = ({ 
  state, 
  setState, 
  onPreview, 
  onSave, 
  onCertificate,
  isGuest,
  guestDoctor,
  onUpdateGuestDoctor
}) => {
  const [loading, setLoading] = useState(false);
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Custom Instructions State
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);
  const [showAiInstructionModal, setShowAiInstructionModal] = useState(false);
  const [aiInstructionCategories, setAiInstructionCategories] = useState<string[]>([]);
  const [aiInstructionContext, setAiInstructionContext] = useState("");
  const [aiInstructionDraft, setAiInstructionDraft] = useState("");
  const [aiInstructionHistory, setAiInstructionHistory] = useState<string[]>([]);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof PrescriptionState) => {
    setState(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PrescriptionState) => {
    setState(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PrescriptionState['patient']) => {
    setState(prev => ({
      ...prev,
      patient: { ...prev.patient, [field]: e.target.value }
    }));
  };

  const handlePatientCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PrescriptionState['patient']) => {
     setState(prev => ({
      ...prev,
      patient: { ...prev.patient, [field]: e.target.checked }
    }));
  };
  
  // Guest Doctor Updates
  const handleGuestDoctorChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Doctor) => {
    if (onUpdateGuestDoctor && guestDoctor) {
      onUpdateGuestDoctor({
        ...guestDoctor,
        [field]: e.target.value
      });
    }
  };
  
  const handleResetGuestDoctor = () => {
     if (onUpdateGuestDoctor) {
       onUpdateGuestDoctor({
         name: "Visitante (Exemplo)",
         crm: "00000-UF",
         specialty: "Clínica Médica"
       });
     }
  };

  const addMedication = () => {
    setState(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        { id: uuidv4(), name: '', dosage: '', quantity: '', unit: 'Caixa(s)', frequency: '', duration: '', instructions: '', isAiSuggested: false }
      ]
    }));
  };

  const removeMedication = (id: string) => {
    setState(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id)
    }));
    setInteractionWarning(null); // Clear warning on change
  };

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    setState(prev => ({
      ...prev,
      medications: prev.medications.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
    setInteractionWarning(null); // Clear warning on change
  };

  const handleAiSuggest = async () => {
    if (!state.diagnosis) return;
    setLoading(true);
    try {
      const result: AiSuggestionResponse | null = await suggestPrescription(
        state.diagnosis, 
        state.patient.age || "30",
        state.patient.isPediatric,
        state.patient.pediatricData
      );
      if (result && result.medications) {
        const newMeds = result.medications.map(m => ({
          id: uuidv4(),
          ...m,
          // Ensure new fields are present if AI omits them (fallback)
          quantity: m.quantity || "1",
          unit: m.unit || "Caixa(s)",
          isAiSuggested: true // Mark as AI suggested
        }));
        setState(prev => ({
          ...prev,
          medications: newMeds
        }));
      }
    } catch (err) {
      alert("Erro ao gerar sugestão. Verifique sua chave de API ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInteractions = async () => {
    if (state.medications.length === 0) return;
    setCheckingInteractions(true);
    // Include dosage/freq in the check for better pediatric analysis
    const medsInfo = state.medications.map(m => `${m.name} ${m.dosage} (${m.frequency})`).filter(Boolean);
    const warning = await checkInteractions(
      medsInfo, 
      state.patient.isPregnant || false,
      state.patient.isPediatric || false,
      state.patient.pediatricData || ""
    );
    setInteractionWarning(warning);
    setCheckingInteractions(false);
  };

  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch (error) {
      // Fallback for browsers that don't support showPicker
      dateInputRef.current?.focus();
    }
  };

  // --- Custom Instructions Logic ---

  const toggleAiCategory = (cat: string) => {
    setAiInstructionCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerateInstructions = async () => {
    setGeneratingInstructions(true);
    try {
      const context = `Diagnóstico: ${state.diagnosis}. ${aiInstructionContext}`;
      const result = await generatePatientInstructions(aiInstructionCategories, context);
      if (result) {
        setAiInstructionDraft(result);
        setAiInstructionHistory(prev => [result, ...prev].slice(0, 3));
      }
    } catch (e) {
      alert("Erro ao gerar orientações.");
    } finally {
      setGeneratingInstructions(false);
    }
  };

  const applyAiInstructions = () => {
    setState(prev => ({ ...prev, customInstructions: aiInstructionDraft }));
    setShowAiInstructionModal(false);
    setAiInstructionDraft("");
  };

  const insertFormatting = (char: string) => {
    // Simple appending for now, a real rich text editor needs complex ref handling
    setState(prev => ({ ...prev, customInstructions: prev.customInstructions + char }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col transition-colors duration-200 relative">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <span className="bg-blue-600 w-1 h-6 rounded-full block"></span>
          Dados da Prescrição
        </h2>
      </div>
      
      <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* Guest Mode Doctor Customization */}
        {isGuest && guestDoctor && (
           <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                   <UserCog className="h-4 w-4" />
                   Identificação do Profissional (Modo Visitante)
                </h3>
                <button 
                   onClick={handleResetGuestDoctor}
                   className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1"
                   title="Restaurar padrão"
                >
                   <RefreshCw className="h-3 w-3" /> Restaurar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                    <label className="block text-xs text-indigo-700 dark:text-indigo-300 mb-1 font-medium">Nome do Médico</label>
                    <input
                        type="text"
                        value={guestDoctor.name}
                        onChange={(e) => handleGuestDoctorChange(e, 'name')}
                        className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Dr. Nome Sobrenome"
                    />
                 </div>
                 <div>
                    <label className="block text-xs text-indigo-700 dark:text-indigo-300 mb-1 font-medium">Especialidade</label>
                    <input
                        type="text"
                        value={guestDoctor.specialty}
                        onChange={(e) => handleGuestDoctorChange(e, 'specialty')}
                        className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ex: Cardiologista"
                    />
                 </div>
                 <div>
                    <label className="block text-xs text-indigo-700 dark:text-indigo-300 mb-1 font-medium">CRM / UF</label>
                    <input
                        type="text"
                        value={guestDoctor.crm}
                        onChange={(e) => handleGuestDoctorChange(e, 'crm')}
                        className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ex: 12345-SP"
                    />
                 </div>
              </div>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-2 italic">
                 Como visitante, você pode alterar estes dados livremente. Para salvar seu perfil permanentemente, crie uma conta.
              </p>
           </div>
        )}

        {/* Patient Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Paciente</label>
            <input
              type="text"
              value={state.patient.name}
              onChange={(e) => handlePatientChange(e, 'name')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
               Data da Prescrição
            </label>
            <div className="relative cursor-pointer" onClick={openDatePicker}>
              <input
                ref={dateInputRef}
                type="date"
                value={state.date}
                onChange={(e) => handleInputChange(e, 'date')}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none pr-10 dark:[color-scheme:dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idade (Anos)</label>
            <input
              type="number"
              value={state.patient.age}
              onChange={(e) => handlePatientChange(e, 'age')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="30"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF (Opcional)</label>
            <input
              type="text"
              value={state.patient.document}
              onChange={(e) => handlePatientChange(e, 'document')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="000.000.000-00"
            />
          </div>

          {/* Special Conditions: Pregnancy & Pediatric */}
          <div className="md:col-span-5 flex flex-col gap-2">
             {/* Pregnancy */}
            <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 px-3 py-2 rounded-lg border border-pink-100 dark:border-pink-900/30 w-full">
                <input
                    id="isPregnant"
                    type="checkbox"
                    checked={state.patient.isPregnant || false}
                    onChange={(e) => handlePatientCheckboxChange(e, 'isPregnant')}
                    className="w-4 h-4 text-pink-600 border-gray-300 dark:border-gray-600 rounded focus:ring-pink-500 bg-white dark:bg-gray-700"
                />
                <label htmlFor="isPregnant" className="font-medium text-pink-700 dark:text-pink-300 text-sm cursor-pointer select-none flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Paciente Gestante
                </label>
            </div>

            {/* Pediatric */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-900/30 w-full">
                  <input
                      id="isPediatric"
                      type="checkbox"
                      checked={state.patient.isPediatric || false}
                      onChange={(e) => handlePatientCheckboxChange(e, 'isPediatric')}
                      className="w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="isPediatric" className="font-medium text-orange-700 dark:text-orange-300 text-sm cursor-pointer select-none flex items-center gap-1.5">
                      <Baby className="h-4 w-4" />
                      Paciente Pediátrico
                  </label>
              </div>
              
              {state.patient.isPediatric && (
                <div className="mt-2 ml-4 animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-orange-800 dark:text-orange-300 mb-1">Idade Detalhada / Peso</label>
                  <input
                    type="text"
                    value={state.patient.pediatricData || ''}
                    onChange={(e) => handlePatientChange(e, 'pediatricData')}
                    className="w-full p-2 border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:ring-1 focus:ring-orange-500 outline-none placeholder-orange-300 dark:placeholder-orange-500/50"
                    placeholder="Ex: 2 anos, 12kg"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="md:col-span-12">
            <div className="flex items-center gap-2 mb-2">
              <input
                id="includeAddress"
                type="checkbox"
                checked={state.includeAddress}
                onChange={(e) => handleCheckboxChange(e, 'includeAddress')}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <label htmlFor="includeAddress" className="font-medium text-gray-700 dark:text-gray-300 text-sm cursor-pointer select-none flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Incluir Endereço
              </label>
            </div>
            
            {state.includeAddress && (
              <input
                type="text"
                value={state.patient.address || ''}
                onChange={(e) => handlePatientChange(e, 'address')}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none placeholder-gray-400 dark:placeholder-gray-500 animate-in slide-in-from-top-1 fade-in duration-200"
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            )}
          </div>
        </div>

        {/* AI Diagnosis Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <label className="block text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Diagnóstico / Condição Clínica (IA)
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={state.diagnosis}
              onChange={(e) => handleInputChange(e, 'diagnosis')}
              className="flex-1 p-2 border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-blue-300 dark:placeholder-blue-500/50"
              placeholder="Ex: Amigdalite Bacteriana"
            />
            <button
              onClick={handleAiSuggest}
              disabled={loading || !state.diagnosis}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Sugerir Prescrição
            </button>
          </div>
        </div>

        {/* Medication List */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Medicamentos</h3>
            <div className="flex gap-2">
               {(state.medications.length > 0) && (
                <button
                  onClick={handleCheckInteractions}
                  disabled={checkingInteractions}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 transition flex items-center gap-1"
                >
                  {checkingInteractions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                  Verificar Segurança
                </button>
              )}
              <button
                onClick={addMedication}
                className="text-sm text-medical-600 dark:text-medical-400 hover:text-medical-700 dark:hover:text-medical-300 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-medical-50 dark:hover:bg-medical-900/30 transition"
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </button>
            </div>
          </div>

          {interactionWarning && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 rounded-r-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-full shrink-0">
                  <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-red-800 dark:text-red-200 flex items-center gap-2">
                    Alerta de Segurança / Interação
                  </h4>
                  <div className="mt-1 text-sm text-red-700 dark:text-red-300 leading-relaxed whitespace-pre-line">
                     {interactionWarning}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 px-3 py-1.5 rounded w-fit">
                    ⚠️ Recomendada revisão clínica detalhada antes da prescrição.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {state.medications.map((med, index) => (
              <div key={med.id} className="group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-medical-300 dark:hover:border-medical-600 hover:shadow-sm transition bg-white dark:bg-gray-900 relative">
                <div className="absolute -left-3 top-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 z-10">
                  {index + 1}
                </div>
                <button
                  onClick={() => removeMedication(med.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Row 1: Name, Dosage, Qty, Unit */}
                  <div className="md:col-span-6">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      Medicamento (Genérico)
                      {med.isAiSuggested && (
                        <span className="inline-flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-medium select-none" title="Sugerido por Inteligência Artificial">
                          <Sparkles size={10} /> IA
                        </span>
                      )}
                    </label>
                    <input
                      className="w-full text-sm font-medium p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="Nome do fármaco"
                      value={med.name}
                      onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Concentração</label>
                    <div className="relative">
                      <input
                        className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 pr-7"
                        placeholder="ex: 500mg"
                        value={med.dosage}
                        onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                      />
                      {!med.dosage && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400" title="Por segurança, informe a concentração (ex: 500mg, 5ml)">
                          <AlertCircle size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qtd</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 pr-7"
                        placeholder="1"
                        value={med.quantity}
                        onChange={(e) => updateMedication(med.id, 'quantity', e.target.value)}
                      />
                      {!med.quantity ? (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400" title="Quantidade obrigatória">
                          <AlertCircle size={16} />
                        </div>
                      ) : isQuantityExcessive(med.quantity, med.unit) ? (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-500 dark:text-amber-400" title="Quantidade parece elevada para a unidade selecionada. Verifique.">
                          <AlertTriangle size={16} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unidade</label>
                     <select
                      className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100"
                      value={med.unit}
                      onChange={(e) => updateMedication(med.id, 'unit', e.target.value)}
                     >
                       {UNIT_OPTIONS.map(opt => (
                         <option key={opt} value={opt} className="text-gray-900 bg-white dark:bg-gray-800">{opt}</option>
                       ))}
                     </select>
                  </div>

                  {/* Row 2: Posology, Duration, Instructions */}
                  <div className="md:col-span-4">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Posologia (Frequência)</label>
                    <input
                      className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="ex: 8/8h"
                      value={med.frequency}
                      onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duração</label>
                    <input
                      className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="ex: 7 dias"
                      value={med.duration}
                      onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Instruções Especiais</label>
                    <input
                      className="w-full text-sm p-1.5 border-b border-gray-200 dark:border-gray-700 focus:border-medical-500 dark:focus:border-medical-400 outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="ex: Tomar com água"
                      value={med.instructions}
                      onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {state.medications.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <p>Nenhum medicamento adicionado.</p>
                <p className="text-sm">Use o botão acima ou a IA para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Instructions Section */}
        <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-6 mt-6">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
              className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-200 hover:text-medical-600 dark:hover:text-medical-400 transition-colors"
            >
               {isInstructionsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
               Orientações Personalizadas
            </button>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={state.includeCustomInstructions}
                  onChange={(e) => handleCheckboxChange(e, 'includeCustomInstructions')}
                  className="rounded border-gray-300 dark:border-gray-600 text-medical-600 focus:ring-medical-500"
                />
                Imprimir na Receita
              </label>
            </div>
          </div>

          {!isInstructionsExpanded && state.customInstructions && (
             <div className="pl-6 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xl italic">
               {state.customInstructions}
             </div>
          )}

          {isInstructionsExpanded && (
            <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
               <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => insertFormatting('• ')}
                    className="p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 text-xs font-medium"
                    title="Inserir Marcador"
                  >
                    • Lista
                  </button>
                  <button 
                    onClick={() => insertFormatting('*')}
                    className="p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 text-xs font-bold"
                    title="Negrito (Envolver texto)"
                  >
                    B
                  </button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button 
                    onClick={() => setShowAiInstructionModal(true)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium shadow-sm transition-colors ml-auto"
                  >
                    <Wand2 size={12} />
                    IA Gerador
                  </button>
               </div>

               <textarea
                  value={state.customInstructions}
                  onChange={(e) => handleInputChange(e, 'customInstructions')}
                  className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-medical-500 outline-none text-sm leading-relaxed font-mono"
                  placeholder="Digite as orientações aqui..."
               />
               <div className="flex justify-end mt-1">
                 <button 
                   onClick={() => setState(prev => ({ ...prev, customInstructions: '' }))}
                   className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                 >
                   <Trash2 size={12} /> Limpar orientações
                 </button>
               </div>
            </div>
          )}
        </div>

      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex justify-end gap-3">
        <button
          onClick={onCertificate}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-5 py-3 rounded-lg font-semibold text-lg shadow-sm transition-all flex items-center gap-2 mr-auto"
        >
          <FileText className="h-5 w-5" />
          Gerar Atestado
        </button>

        <button
          onClick={onSave}
          className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-5 py-3 rounded-lg font-semibold text-lg shadow-sm transition-all flex items-center gap-2"
        >
          <Save className="h-5 w-5" />
          Salvar
        </button>
        <button
          onClick={onPreview}
          className="bg-medical-600 hover:bg-medical-700 dark:bg-medical-600 dark:hover:bg-medical-500 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
        >
           <Eye className="h-5 w-5" />
           Pré-visualizar Receita
        </button>
      </div>

      {/* AI Instructions Generator Modal */}
      {showAiInstructionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl">
                 <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Gerador de Orientações com IA</h3>
                 </div>
                 <button onClick={() => setShowAiInstructionModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                   <X size={20} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 {!aiInstructionDraft ? (
                    <div className="space-y-4">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecione as Categorias:</label>
                          <div className="flex flex-wrap gap-2">
                             {AI_INSTRUCTION_CATEGORIES.map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => toggleAiCategory(cat)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                     aiInstructionCategories.includes(cat)
                                       ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                                       : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                  }`}
                                >
                                   {cat} {aiInstructionCategories.includes(cat) && <Check size={10} className="inline ml-1" />}
                                </button>
                             ))}
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contexto Clínico Adicional:</label>
                          <input
                            type="text"
                            value={aiInstructionContext}
                            onChange={(e) => setAiInstructionContext(e.target.value)}
                            placeholder="Ex: Entorse de tornozelo esquerdo, adulto jovem, atleta."
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                       </div>
                       
                       {aiInstructionHistory.length > 0 && (
                         <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Histórico Recente</label>
                            <div className="flex flex-col gap-2">
                               {aiInstructionHistory.map((hist, idx) => (
                                  <div key={idx} className="text-xs p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setAiInstructionDraft(hist)}>
                                     {hist.substring(0, 80)}...
                                  </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 ) : (
                    <div className="space-y-4 h-full flex flex-col">
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rascunho Gerado (Editável):</label>
                       <textarea
                          value={aiInstructionDraft}
                          onChange={(e) => setAiInstructionDraft(e.target.value)}
                          className="w-full flex-1 min-h-[200px] p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/30 dark:bg-indigo-900/10 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                       />
                       <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                          <AlertCircle size={12} />
                          A inteligência artificial é apenas uma ferramenta auxiliar. Revise todo o conteúdo.
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
                 {!aiInstructionDraft ? (
                    <>
                      <button onClick={() => setShowAiInstructionModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">Cancelar</button>
                      <button 
                        onClick={handleGenerateInstructions}
                        disabled={generatingInstructions}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-70"
                      >
                        {generatingInstructions ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                        Gerar Orientações
                      </button>
                    </>
                 ) : (
                    <>
                      <button 
                         onClick={() => setAiInstructionDraft("")}
                         className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                      >
                         <RotateCcw size={14} /> Voltar
                      </button>
                      <div className="flex gap-2">
                         <button 
                            onClick={() => setShowAiInstructionModal(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                         >
                            Cancelar
                         </button>
                         <button 
                            onClick={applyAiInstructions}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
                         >
                            <Check size={16} /> Inserir no Documento
                         </button>
                      </div>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Editor;

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Settings, Building, MapPin, Phone, Save, Plus, Search, Loader2 } from 'lucide-react';
import { saveHeaderImage, removeHeaderImage, saveHeaderSettings, getSavedInstitutions, saveInstitutionsList, saveCurrentInstitution } from '../services/storageService';
import { findInstitutionDetails } from '../services/geminiService';
import { Institution } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string | null;
  onUpdateImage: (img: string | null) => void;
  hideTextHeader: boolean;
  onUpdateHideTextHeader: (hide: boolean) => void;
  institution: Institution;
  onUpdateInstitution: (inst: Institution) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentImage, 
  onUpdateImage,
  hideTextHeader,
  onUpdateHideTextHeader,
  institution,
  onUpdateInstitution
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Saved Locations State
  const [savedLocations, setSavedLocations] = useState<Institution[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSavedLocations(getSavedInstitutions());
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      saveHeaderImage(base64String);
      onUpdateImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    removeHeaderImage();
    onUpdateImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleToggleHideText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onUpdateHideTextHeader(checked);
    saveHeaderSettings(checked);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Institution Handlers
  const handleInstitutionChange = (field: keyof Institution, value: string) => {
    const updated = { ...institution, [field]: value };
    onUpdateInstitution(updated);
    saveCurrentInstitution(updated);
    if (selectedLocationId) setSelectedLocationId(""); // Deselect if modified manually
  };

  const handleSaveLocation = () => {
    if (!institution.name) {
      alert("Digite ao menos o nome do local para salvar.");
      return;
    }
    
    const newLocation: Institution = { ...institution, id: uuidv4() };
    const updatedList = [...savedLocations, newLocation];
    
    setSavedLocations(updatedList);
    saveInstitutionsList(updatedList);
    setSelectedLocationId(newLocation.id);
    
    // Update current to include the new ID
    onUpdateInstitution(newLocation);
    saveCurrentInstitution(newLocation);
    
    alert("Local salvo com sucesso!");
  };

  const handleDeleteLocation = () => {
    if (!selectedLocationId) return;
    
    if (confirm("Deseja excluir este local salvo?")) {
      const updatedList = savedLocations.filter(l => l.id !== selectedLocationId);
      setSavedLocations(updatedList);
      saveInstitutionsList(updatedList);
      setSelectedLocationId("");
      
      // Optional: Clear fields or keep them? Let's keep them but clear ID
      onUpdateInstitution({ ...institution, id: '' });
    }
  };

  const handleSelectLocation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedLocationId(id);
    
    if (id) {
      const location = savedLocations.find(l => l.id === id);
      if (location) {
        onUpdateInstitution(location);
        saveCurrentInstitution(location);
      }
    } else {
      // Clear fields if "Novo/Selecionar" chosen
      const empty = { id: '', name: '', address: '', city: '', state: '', phone: '' };
      onUpdateInstitution(empty);
      saveCurrentInstitution(empty);
    }
  };

  const handleSearchInstitution = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await findInstitutionDetails(searchQuery);
      if (result) {
        // Update form with found details
        const updated = { ...institution, ...result };
        onUpdateInstitution(updated);
        saveCurrentInstitution(updated);
        // Reset selection as we modified data
        if (selectedLocationId) setSelectedLocationId("");
      } else {
        alert("Local não encontrado ou erro na busca.");
      }
    } catch (e) {
      alert("Erro ao buscar informações.");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <Settings className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações de Impressão</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Institution Details Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <label className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-500" />
                        Dados da Instituição / Local de Atendimento
                    </label>
                    
                    <div className="flex gap-2">
                        <select 
                        value={selectedLocationId}
                        onChange={handleSelectLocation}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px]"
                        >
                        <option value="">-- Novo / Limpar --</option>
                        {savedLocations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                        </select>
                        
                        {selectedLocationId ? (
                        <button 
                            onClick={handleDeleteLocation}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-transparent hover:border-red-200 transition"
                            title="Excluir local salvo"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        ) : (
                        <button
                            onClick={handleSaveLocation}
                            disabled={!institution.name}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <Save className="h-3.5 w-3.5" /> Salvar
                        </button>
                        )}
                    </div>
                </div>

                 {/* Search Bar */}
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchInstitution()}
                        placeholder="Buscar local e preencher (ex: Hospital Santa Casa de SP)..."
                        className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                   </div>
                   <button
                     onClick={handleSearchInstitution}
                     disabled={isSearching || !searchQuery}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                   >
                     {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                   </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nome da Instituição / Clínica</label>
                <input 
                  type="text" 
                  value={institution.name}
                  onChange={(e) => handleInstitutionChange('name', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Hospital Santa Clara"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Endereço Completo (Rua, Nº, Bairro, CEP)</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={institution.address}
                    onChange={(e) => handleInstitutionChange('address', e.target.value)}
                    className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Rua das Flores, 123 - Centro, CEP 00000-000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                <input 
                  type="text" 
                  value={institution.city}
                  onChange={(e) => handleInstitutionChange('city', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estado (UF)</label>
                <input 
                  type="text" 
                  value={institution.state}
                  onChange={(e) => handleInstitutionChange('state', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="SP"
                />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telefone / Contato</label>
                 <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={institution.phone}
                      onChange={(e) => handleInstitutionChange('phone', e.target.value)}
                      className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="(11) 99999-9999"
                    />
                 </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 italic mt-2">
              Estas informações aparecerão no cabeçalho do documento (se a opção "Ocultar texto" estiver desmarcada).
            </p>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Header Image Upload */}
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-500" />
              Cabeçalho de Imagem (Logo/Timbre)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Carregue uma imagem para substituir ou complementar o texto.
            </p>

            {!currentImage ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Carregar imagem</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 p-2">
                  <img src={currentImage} alt="Preview Header" className="w-full h-auto object-contain max-h-24" />
                </div>
                <button 
                  onClick={handleRemoveImage}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition border border-red-100 dark:border-red-900 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover Imagem
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {/* Settings Toggle */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
             <div className="flex items-center gap-3">
                <input
                  id="hideTextHeader"
                  type="checkbox"
                  checked={hideTextHeader}
                  onChange={handleToggleHideText}
                  className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 bg-white dark:bg-gray-600"
                />
                <label htmlFor="hideTextHeader" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer select-none">
                   Ocultar dados do médico (Nome, CRM, Especialidade)
                </label>
             </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-8">
                Oculta apenas a identificação do médico no cabeçalho. Os dados da instituição e a imagem (se houver) permanecerão visíveis.
             </p>
          </div>

        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
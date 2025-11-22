import React, { useEffect, useState } from 'react';
import { X, Clock, Trash2, Upload, Calendar, User, FileText, Activity } from 'lucide-react';
import { SavedPrescription } from '../types';
import { getHistory, deleteFromHistory, clearHistory } from '../services/storageService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (prescription: SavedPrescription) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [history, setHistory] = useState<SavedPrescription[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteFromHistory(id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
      clearHistory();
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Prescrições</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Selecione pelo diagnóstico para reutilizar protocolos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-center">
              <Clock className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">Nenhuma prescrição salva.</p>
              <p className="text-sm">Salve suas receitas no editor para criar modelos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer flex justify-between items-center"
                  onClick={() => onLoad(item)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                       <Activity className="h-4 w-4 text-blue-500" />
                      <span className="font-bold text-gray-900 dark:text-white text-lg">
                        {item.state.diagnosis || "Diagnóstico não informado"}
                      </span>
                      {item.state.patient.isPediatric && (
                         <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Ped</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[250px]">
                        <User className="h-3.5 w-3.5" />
                        <span>Ref: {item.state.patient.name || "Sem nome"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {item.state.medications.slice(0, 3).map((med, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                          {med.name}
                        </span>
                      ))}
                      {item.state.medications.length > 3 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 py-1">+ {item.state.medications.length - 3} mais</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-4 border-l border-gray-100 dark:border-gray-700 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onLoad(item); }}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Usar este modelo"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir do Histórico"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex justify-between items-center">
           <button
             onClick={handleClearAll}
             disabled={history.length === 0}
             className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:no-underline"
           >
             Limpar Histórico Completo
           </button>
           <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
           >
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
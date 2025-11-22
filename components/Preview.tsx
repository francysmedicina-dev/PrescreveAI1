
import React, { useState, useEffect } from 'react';
import { PrescriptionState, Doctor, Institution, Medication } from '../types';
import { Printer, Copy, FileDown, Loader2, ArrowLeft, X, FileText } from 'lucide-react';

interface PreviewProps {
  state: PrescriptionState;
  setState: React.Dispatch<React.SetStateAction<PrescriptionState>>;
  doctor: Doctor;
  institution: Institution;
  onBack: () => void;
  customHeaderImage: string | null;
  hideTextHeader: boolean;
}

// --- Pagination Helper Constants ---
const MAX_CHARS_PER_LINE = 95; // Estimate for A4 width with margins
const MAX_LINES_PER_PAGE = 22; // Safe number of lines per page (accounting for header/footer)
const MEDS_PER_PAGE = 5; // Max medications per A4 page

const paginateText = (text: string): string[] => {
  if (!text) return [];
  
  const paragraphs = text.split('\n');
  const pages: string[] = [];
  let currentPageLines: string[] = [];
  let currentLineCount = 0;

  paragraphs.forEach(paragraph => {
    // Estimate lines for this paragraph
    // If empty string (newline), it counts as 1 line
    const length = paragraph.length || 1; 
    const estimatedLines = Math.ceil(length / MAX_CHARS_PER_LINE);

    // If a single paragraph is huge (larger than a page), we just let it break naturally (CSS) 
    // or we would need character-level splitting. 
    // For now, assuming paragraphs aren't massive blocks of text without breaks.
    
    if (currentLineCount + estimatedLines > MAX_LINES_PER_PAGE && currentPageLines.length > 0) {
      // Push current page
      pages.push(currentPageLines.join('\n'));
      // Reset for new page
      currentPageLines = [paragraph];
      currentLineCount = estimatedLines;
    } else {
      currentPageLines.push(paragraph);
      currentLineCount += estimatedLines;
    }
  });

  if (currentPageLines.length > 0) {
    pages.push(currentPageLines.join('\n'));
  }

  return pages;
};

// Internal reusable component for the paper content
const PrescriptionPaper: React.FC<{ 
  state: PrescriptionState; 
  doctor: Doctor; 
  institution: Institution;
  id?: string; 
  label?: string;
  customHeaderImage: string | null;
  hideTextHeader: boolean;
  pageType: 'prescription' | 'instructions';
  // Props for Prescription Mode Pagination
  medicationsToRender?: Medication[];
  startIndex?: number;
  // Props for Instructions Mode Pagination
  customContent?: string; 
  paginationInfo?: string; // e.g., "Página 1/2"
}> = ({ 
  state, 
  doctor, 
  institution, 
  id, 
  label, 
  customHeaderImage, 
  hideTextHeader, 
  pageType, 
  medicationsToRender,
  startIndex = 0,
  customContent, 
  paginationInfo 
}) => {
  // Format date from YYYY-MM-DD to display format
  const displayDate = state.date 
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Determine if we should show the header block
  const showHeaderBlock = institution.name || (!hideTextHeader || !customHeaderImage);
  const showDoctorText = !hideTextHeader || !customHeaderImage;

  // Determine which medications to render (pagination vs all)
  const meds = medicationsToRender || state.medications;

  return (
    <div id={id} className="prescription-paper bg-white w-full max-w-[210mm] min-h-[297mm] p-[2cm] shadow-xl text-gray-900 relative flex flex-col font-serif">
      
      {/* Header Area */}
      <div className="mb-8">
        {customHeaderImage && (
          <div className="mb-4 flex justify-center w-full">
             <img 
               src={customHeaderImage} 
               alt="Cabeçalho" 
               style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '140px' }} 
             />
          </div>
        )}

        {showHeaderBlock && (
          <div className="border-b-4 border-gray-900 pb-6">
            {institution.name && (
              <div className="text-center mb-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">{institution.name}</h2>
                <p className="text-xs text-gray-600">
                  {institution.address}
                  {institution.city && ` - ${institution.city}`}
                  {institution.state && `/${institution.state}`}
                  {institution.phone && ` • Tel: ${institution.phone}`}
                </p>
              </div>
            )}

            <div className="flex justify-between items-start mt-2">
              <div>
                {showDoctorText ? (
                  <>
                    <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">Dr. {doctor.name}</h1>
                    <p className="text-gray-700 font-bold text-lg mt-1">{doctor.specialty}</p>
                    <p className="text-sm text-gray-600 mt-1 font-medium">CRM: {doctor.crm}</p>
                  </>
                ) : (
                  <div className="h-16"></div>
                )}
              </div>
              
              <div className="text-right flex flex-col items-end">
                {label && (
                  <div className="mb-2 border-2 border-gray-800 px-3 py-1 inline-block rounded text-xs font-black uppercase tracking-widest bg-gray-50">
                    {label}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!showHeaderBlock && customHeaderImage && label && (
           <div className="absolute top-[2cm] right-[2cm]">
             <div className="border-2 border-gray-800 px-3 py-1 inline-block rounded text-xs font-black uppercase tracking-widest bg-gray-50">
               {label}
             </div>
           </div>
        )}
      </div>

      {/* Patient Details - Always visible to identify who the paper belongs to */}
      <div className="mb-10 bg-gray-50 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-bold text-gray-900 uppercase text-sm tracking-wider">Paciente:</span>
          <span className="text-xl font-bold text-gray-900 border-b-2 border-dotted border-gray-400 flex-1 px-2">
            {state.patient.name || "_______________________________________"}
          </span>
        </div>
        <div className="flex justify-between items-start mt-2">
            {state.patient.document && (
                <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-800 uppercase text-xs">CPF:</span>
                <span className="text-sm text-gray-700 font-mono">{state.patient.document}</span>
                </div>
            )}
        </div>
        {state.includeAddress && state.patient.address && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-baseline gap-2">
             <span className="font-bold text-gray-800 uppercase text-xs">Endereço:</span>
             <span className="text-sm text-gray-700">{state.patient.address}</span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1">
        
        {pageType === 'prescription' && (
          <div className="space-y-8">
            {meds.map((med, index) => (
              <div key={med.id} className="relative">
                <div className="flex items-baseline gap-2 mb-2">
                  {/* Index calculation handles pagination offset */}
                  <span className="text-2xl font-black text-gray-900">{startIndex + index + 1}.</span>
                  <div className="border-b border-gray-300 flex-1 pb-1 flex justify-between items-end">
                    <div className="flex items-baseline">
                      <span className="text-xl font-bold text-gray-900 mr-3">
                        {med.name || "Medicamento"}
                      </span>
                      <span className="text-lg font-semibold text-gray-700">
                        {med.dosage}
                      </span>
                    </div>
                    {(med.quantity || med.unit) && (
                       <div className="flex items-baseline gap-1 border-b-2 border-dotted border-gray-400 px-2">
                          <span className="text-lg font-bold text-gray-900">{med.quantity}</span>
                          <span className="text-sm font-medium text-gray-700 uppercase">{med.unit}</span>
                       </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-8 space-y-2">
                  {(med.frequency || med.duration) && (
                    <p className="mt-1 text-lg font-bold text-gray-900 uppercase leading-snug">
                      {med.frequency}
                      {med.frequency && med.duration && " - "}
                      {med.duration}
                    </p>
                  )}
                  {med.instructions && (
                    <div className="mt-1 text-gray-800 leading-relaxed">
                       <span className="font-bold text-gray-500 text-xs uppercase mr-1">Obs:</span>
                       <span className="font-medium">{med.instructions}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {meds.length === 0 && (
              <div className="text-center text-gray-300 italic mt-20 border-2 border-dashed border-gray-200 p-10 rounded-xl">
                Área de Prescrição Médica
              </div>
            )}
          </div>
        )}

        {pageType === 'instructions' && customContent && (
           <div className="h-full">
              <h3 className="text-center font-black text-gray-900 uppercase tracking-widest mb-8 text-sm border-2 border-gray-900 inline-block px-6 py-2 rounded-full mx-auto block w-fit">
                 Orientações ao Paciente
              </h3>
              <div className="text-gray-800 leading-loose whitespace-pre-wrap text-justify text-lg">
                 {customContent.split('\n').map((line, i) => {
                    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                       return <div key={i} className="ml-6 pl-2 -indent-4 mb-2">{line}</div>;
                    }
                    if (line.includes('*')) {
                       const parts = line.split('*');
                       return (
                         <div key={i} className="mb-3">
                           {parts.map((part, idx) => (idx % 2 === 1 ? <span key={idx} className="font-bold">{part}</span> : part))}
                         </div>
                       );
                    }
                    if (line === line.toUpperCase() && line.length > 4 && /^[A-Z\sÁÉÍÓÚÃÕÇ]+$/.test(line)) {
                       return <h4 key={i} className="font-bold text-gray-900 mt-6 mb-3 underline uppercase tracking-wide">{line}</h4>
                    }
                    return <div key={i} className="mb-3">{line}</div>;
                 })}
              </div>
           </div>
        )}

      </div>

      {/* Footer - Signatures */}
      <div className="mt-auto pt-8 border-t-2 border-gray-200">
        <div className="mb-8 text-sm text-gray-500 flex justify-between items-center">
          <p className="font-medium capitalize">{displayDate}</p>
          {/* Show pagination info if provided */}
          {paginationInfo && (
             <p className="text-xs uppercase tracking-widest font-bold text-gray-400">
               {paginationInfo}
             </p>
          )}
        </div>

        <div className="flex justify-between items-end gap-8">
            <div></div>
            <div className="text-center min-w-[240px]">
                <div className="w-full border-b border-gray-900 mb-2 mx-auto"></div>
                <p className="font-bold text-sm uppercase tracking-wide text-gray-900">Dr. {doctor.name}</p>
                <p className="text-xs text-gray-600 uppercase">{doctor.specialty} - CRM {doctor.crm}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

const Preview: React.FC<PreviewProps> = ({ state, setState, doctor, institution, onBack, customHeaderImage, hideTextHeader }) => {
  const [printCopies, setPrintCopies] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const toggleCopies = () => {
    setPrintCopies(prev => prev === 1 ? 2 : 1);
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleToggleInstructions = () => {
     setState(prev => ({ ...prev, includeCustomInstructions: !prev.includeCustomInstructions }));
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const container = document.getElementById('pdf-source-container');
    
    if (container) {
        // 1. Styles for PDF generation
        const originalGap = container.style.gap;
        container.style.gap = '0'; // Remove visual gap for PDF

        const papers = container.querySelectorAll('.prescription-paper');
        const paperBackups: { boxShadow: string, height: string, minHeight: string, margin: string }[] = [];

        papers.forEach((paper) => {
            const p = paper as HTMLElement;
            paperBackups.push({
                boxShadow: p.style.boxShadow,
                height: p.style.height,
                minHeight: p.style.minHeight,
                margin: p.style.margin
            });
            p.style.boxShadow = 'none';
            p.style.height = '296.5mm'; 
            p.style.minHeight = 'unset';
            p.style.margin = '0';
        });

        // @ts-ignore
        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 0,
                filename: `receita_${state.patient.name || 'paciente'}_${state.date}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            try {
                // @ts-ignore
                await html2pdf().set(opt).from(container).save();
            } catch (error) {
                console.error("PDF Generation failed", error);
                alert("Erro ao gerar PDF.");
            }
        } else {
             alert("Biblioteca de PDF não carregada.");
        }

        // 2. Restore Styles
        container.style.gap = originalGap;
        papers.forEach((paper, index) => {
            const p = paper as HTMLElement;
            const backup = paperBackups[index];
            if (backup) {
                p.style.boxShadow = backup.boxShadow;
                p.style.height = backup.height;
                p.style.minHeight = backup.minHeight;
                p.style.margin = backup.margin;
            }
        });
    }
    setIsGeneratingPdf(false);
  };

  // Build list of pages to render
  const renderPages = () => {
    const pages = [];
    const showInstructions = state.customInstructions && state.includeCustomInstructions;
    
    // Prepare Instruction Pages
    const instructionPages = showInstructions ? paginateText(state.customInstructions) : [];

    // Prepare Medication Pages (Chunks of 5)
    const medicationChunks: Medication[][] = [];
    if (state.medications.length > 0) {
      for (let i = 0; i < state.medications.length; i += MEDS_PER_PAGE) {
        medicationChunks.push(state.medications.slice(i, i + MEDS_PER_PAGE));
      }
    } else {
      // Even if empty, show one page
      medicationChunks.push([]);
    }

    for (let i = 0; i < printCopies; i++) {
        const copyLabel = printCopies === 2 ? (i === 0 ? "1ª VIA" : "2ª VIA") : undefined;
        
        // 1. Render Medication Pages
        medicationChunks.forEach((chunk, pageIdx) => {
           const isFirstPage = pages.length === 0;
           const pageInfo = medicationChunks.length > 1 ? `Página ${pageIdx + 1}/${medicationChunks.length}` : undefined;

           pages.push(
             <div key={`med-${i}-${pageIdx}`} className={!isFirstPage ? "break-before-page mt-8 print:mt-0" : ""}>
                <PrescriptionPaper 
                    state={state} 
                    doctor={doctor}
                    institution={institution}
                    label={copyLabel}
                    customHeaderImage={customHeaderImage}
                    hideTextHeader={hideTextHeader}
                    pageType="prescription"
                    medicationsToRender={chunk}
                    startIndex={pageIdx * MEDS_PER_PAGE}
                    paginationInfo={pageInfo}
                />
             </div>
           );
        });

        // 2. Render Instructions Pages (Separate Sheets after meds)
        if (showInstructions && instructionPages.length > 0) {
           instructionPages.forEach((chunk, pageIdx) => {
             pages.push(
                <div key={`instr-${i}-${pageIdx}`} className="break-before-page mt-8 print:mt-0">
                    <PrescriptionPaper 
                        state={state} 
                        doctor={doctor}
                        institution={institution}
                        label={copyLabel}
                        customHeaderImage={customHeaderImage}
                        hideTextHeader={hideTextHeader}
                        pageType="instructions"
                        customContent={chunk}
                        paginationInfo={`Página ${pageIdx + 1}/${instructionPages.length}`}
                    />
                </div>
             );
           });
        }
    }
    return pages;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                title="Voltar para Edição"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Pré-visualização</h2>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 justify-end">
           {state.customInstructions && (
              <button
                 onClick={handleToggleInstructions}
                 className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border whitespace-nowrap ${
                   state.includeCustomInstructions 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                 }`}
              >
                 {state.includeCustomInstructions ? <FileText className="h-4 w-4" /> : <X className="h-4 w-4" />}
                 {state.includeCustomInstructions ? 'Com Orientações' : 'Sem Orientações'}
              </button>
           )}

           <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="bg-medical-50 dark:bg-medical-900/20 hover:bg-medical-100 dark:hover:bg-medical-900/40 text-medical-700 dark:text-medical-300 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-medical-200 dark:border-medical-800 whitespace-nowrap"
           >
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="hidden sm:inline">Baixar PDF</span>
           </button>

           <button
            onClick={toggleCopies}
            className={`px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border whitespace-nowrap ${
              printCopies === 2 
                ? "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" 
                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            }`}
          >
            {printCopies === 2 ? (
              <>
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Remover 2ª Via</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar 2ª Via</span>
              </>
            )}
          </button>
          
          <button
            onClick={handlePrint}
            className="bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-200 dark:bg-gray-900 overflow-y-auto rounded-xl p-4 md:p-8 flex flex-col items-center gap-8 shadow-inner no-print-bg transition-colors duration-200">
        
        <div id="pdf-source-container" className="w-full flex flex-col items-center">
           {renderPages()}
        </div>
        
      </div>
      
      <style>{`
        @media print {
          .break-before-page {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default Preview;

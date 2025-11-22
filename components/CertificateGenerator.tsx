import React, { useState } from 'react';
import { ArrowLeft, Printer, FileText, Clock, FileDown, Loader2, Users } from 'lucide-react';
import { PrescriptionState, Doctor, Institution } from '../types';

interface CertificateGeneratorProps {
  state: PrescriptionState;
  setState: React.Dispatch<React.SetStateAction<PrescriptionState>>;
  doctor: Doctor;
  institution: Institution;
  onBack: () => void;
  customHeaderImage: string | null;
  hideTextHeader: boolean;
}

// Helper to convert numbers 0-31 to text (common for days of leave)
const getNumberInFull = (numStr: string): string => {
  const n = parseInt(numStr);
  if (isNaN(n)) return "";
  
  const map = [
    "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
    "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
    "vinte", "vinte e um", "vinte e dois", "vinte e três", "vinte e quatro", "vinte e cinco", 
    "vinte e seis", "vinte e sete", "vinte e oito", "vinte e nove", "trinta", "trinta e um"
  ];

  return map[n] || "";
};

// Internal Reusable Paper Component
interface CertificatePaperProps {
  title: string;
  doctor: Doctor;
  institution: Institution;
  dateStr: string;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
  typeLabel: string; // AM (Atestado Médico) or DC (Declaração)
  customHeaderImage: string | null;
  hideTextHeader: boolean;
  id?: string;
}

const CertificatePaper: React.FC<CertificatePaperProps> = ({ title, doctor, institution, dateStr, children, footerExtra, typeLabel, customHeaderImage, hideTextHeader, id }) => {
  
  const showHeaderBlock = institution.name || (!hideTextHeader || !customHeaderImage);
  const showDoctorText = !hideTextHeader || !customHeaderImage;

  return (
    <div id={id} className="prescription-paper bg-white w-full max-w-[210mm] min-h-[297mm] p-[2cm] shadow-xl text-gray-900 relative flex flex-col font-serif mx-auto">
      
      {/* Header Area */}
      <div className="mb-12">
        {/* Custom Image Header */}
          {customHeaderImage && (
            <div className="mb-4 flex justify-center w-full">
              <img 
                src={customHeaderImage} 
                alt="Cabeçalho" 
                style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '140px' }} 
              />
            </div>
          )}

          {/* Text Header */}
          {showHeaderBlock && (
            <div className="border-b-4 border-gray-900 pb-6">
              {/* Institution Info */}
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
              </div>
            </div>
          )}
      </div>

      {/* Document Title */}
      <div className="text-center mb-12">
        <h2 className="text-2xl font-black uppercase tracking-widest border-b-2 border-gray-300 inline-block pb-1">
          {title}
        </h2>
      </div>

      {/* Content Body */}
      <div className="flex-1 text-lg leading-loose text-justify">
        {children}
      </div>

      {/* Footer - Signatures */}
      <div className="mt-auto pt-8 border-t-2 border-gray-200">
        <div className="mb-12 text-sm text-gray-500">
          <p className="font-medium capitalize">{dateStr}</p>
        </div>

        <div className="flex justify-between items-end gap-8">
          {footerExtra ? footerExtra : <div></div>}
          
          {/* Doctor Signature */}
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


const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ state, setState, doctor, institution, onBack, customHeaderImage, hideTextHeader }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const handleTypeChange = (type: 'medical' | 'attendance') => {
    setState(prev => ({
      ...prev,
      certificate: { ...prev.certificate, type }
    }));
  };

  const handleInputChange = (field: keyof typeof state.certificate, value: any) => {
    setState(prev => ({
      ...prev,
      certificate: { ...prev.certificate, [field]: value }
    }));
  };

  const handleGlobalCidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setState(prev => ({
       ...prev,
       cid: e.target.value
     }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    // Use the container ID that wraps both papers
    const element = document.getElementById('certificate-print-container');
    
    if (element) {
        // 1. Backup Styles
        const originalGap = element.style.gap;
        
        // 2. Remove gaps to prevent page overflow
        element.style.gap = '0';

        // 3. Handle Children Styling (The Papers)
        const papers = element.querySelectorAll('.prescription-paper');
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
            // Enforce strict A4 height minus slight buffer
            p.style.height = '296.5mm'; 
            p.style.minHeight = 'unset';
            p.style.margin = '0';
            p.style.marginBottom = '0';
        });

        // @ts-ignore - html2pdf is loaded from CDN
        if (typeof html2pdf !== 'undefined') {
            const docType = state.certificate.type === 'medical' ? 'Atestado' : 'Declaracao';
            const opt = {
                margin: 0,
                filename: `${docType}_${state.patient.name || 'paciente'}_${state.date}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            try {
                // @ts-ignore
                await html2pdf().set(opt).from(element).save();
            } catch (error) {
                console.error("PDF Generation failed", error);
                alert("Erro ao gerar PDF.");
            }
        } else {
             alert("Biblioteca de PDF não carregada.");
        }

        // 4. Restore Styles
        element.style.gap = originalGap;
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

  // Derived display values
  const displayDate = state.date 
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Patient Auth Signature (Only if CID included)
  const PatientAuthSignature = (
      <div className="text-left max-w-[45%]">
          <p className="text-[10px] text-gray-500 italic mb-4 leading-tight text-justify">
              "Autorizo, por minha livre vontade, a inserção da Classificação Internacional de Doenças (CID) neste documento, estando ciente de que esta informação é confidencial."
          </p>
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold text-xs uppercase tracking-wide">Assinatura do Paciente</p>
      </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      
      {/* Left Column: Configuration Controls */}
      <div className="w-full md:w-1/3 flex flex-col gap-6 no-print">
        <div className="flex items-center gap-3">
            <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                title="Voltar para Edição"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Configurar Documento</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
            
            {/* Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tipo de Documento</label>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <button
                        onClick={() => handleTypeChange('medical')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            state.certificate.type === 'medical'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <FileText className="h-4 w-4" /> Atestado
                    </button>
                    <button
                        onClick={() => handleTypeChange('attendance')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            state.certificate.type === 'attendance'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <Clock className="h-4 w-4" /> Declaração
                    </button>
                </div>
            </div>

            {/* Conditional Inputs */}
            {state.certificate.type === 'medical' ? (
                 <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dias de Afastamento</label>
                    <input
                        type="number"
                        value={state.certificate.days}
                        onChange={(e) => handleInputChange('days', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ex: 1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Número de dias a partir da data de hoje.</p>
                 </div>
            ) : (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período / Horário</label>
                    <input
                        type="text"
                        value={state.certificate.period}
                        onChange={(e) => handleInputChange('period', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ex: das 08:00 às 11:30"
                    />
                </div>
            )}

            {/* CID Configuration */}
             <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        id="certIncludeCid"
                        type="checkbox"
                        checked={state.certificate.includeCid}
                        onChange={(e) => handleInputChange('includeCid', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="certIncludeCid" className="font-medium text-gray-700 dark:text-gray-300 text-sm cursor-pointer select-none">
                        Incluir CID no documento
                    </label>
                </div>

                {state.certificate.includeCid && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código CID</label>
                        <input
                            type="text"
                            value={state.cid}
                            onChange={handleGlobalCidChange}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                            placeholder="Ex: J03.9"
                        />
                        <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-800 dark:text-blue-200">
                            Ao incluir o CID, será adicionado um campo obrigatório para assinatura de autorização do paciente, conforme normas do CFM.
                        </div>
                    </div>
                )}
             </div>

             {/* Companion Declaration Config */}
             <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <input
                        id="certIncludeCompanion"
                        type="checkbox"
                        checked={state.certificate.includeCompanion}
                        onChange={(e) => handleInputChange('includeCompanion', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="certIncludeCompanion" className="font-medium text-gray-700 dark:text-gray-300 text-sm cursor-pointer select-none flex items-center gap-2">
                        <Users className="h-4 w-4" /> Declaração de Acompanhante
                    </label>
                </div>

                {state.certificate.includeCompanion && (
                    <div className="animate-in slide-in-from-top-2 duration-200 space-y-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome do Acompanhante</label>
                          <input
                              type="text"
                              value={state.certificate.companionName}
                              onChange={(e) => handleInputChange('companionName', e.target.value)}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                              placeholder="Nome Completo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">RG/CPF do Acompanhante</label>
                          <input
                              type="text"
                              value={state.certificate.companionDocument}
                              onChange={(e) => handleInputChange('companionDocument', e.target.value)}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                              placeholder="Documento"
                          />
                        </div>
                    </div>
                )}
             </div>

             <div className="mt-auto pt-6 flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex-1 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-indigo-700 dark:text-white border border-indigo-200 dark:border-gray-500 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                >
                    {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                    Gerar PDF
                </button>
                <button
                    onClick={handlePrint}
                    className="flex-1 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                >
                    <Printer className="h-5 w-5" />
                    Imprimir
                </button>
             </div>

        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="flex-1 bg-gray-200 dark:bg-gray-900 rounded-xl p-4 md:p-8 flex flex-col items-center shadow-inner overflow-y-auto custom-scrollbar transition-colors duration-200">
         
         <div id="certificate-print-container" className="w-full flex flex-col items-center gap-8">
            {/* Main Patient Certificate */}
            <CertificatePaper
              id="primary-certificate"
              title={state.certificate.type === 'medical' ? 'Atestado Médico' : 'Declaração de Comparecimento'}
              doctor={doctor}
              institution={institution}
              dateStr={displayDate}
              typeLabel={state.certificate.type === 'medical' ? 'AM' : 'DC'}
              footerExtra={state.certificate.includeCid ? PatientAuthSignature : undefined}
              customHeaderImage={customHeaderImage}
              hideTextHeader={hideTextHeader}
            >
               {state.certificate.type === 'medical' ? (
                    <p>
                        Atesto para os devidos fins que o(a) Sr(a). <span className="font-bold">{state.patient.name || "________________________________"}</span>
                        {state.patient.document && <>, inscrito(a) no CPF sob nº <span className="font-bold font-mono">{state.patient.document}</span>,</>} foi atendido(a) nesta data,
                        necessitando de <span className="font-bold border-b border-dotted border-gray-400 px-2">
                          {state.certificate.days} ({getNumberInFull(state.certificate.days)})
                        </span> dias de afastamento de suas atividades laborais e/ou escolares, a partir desta data.
                    </p>
                ) : (
                    <p>
                        Declaro para os devidos fins que o(a) Sr(a). <span className="font-bold">{state.patient.name || "________________________________"}</span>
                        {state.patient.document && <>, inscrito(a) no CPF sob nº <span className="font-bold font-mono">{state.patient.document}</span>,</>} compareceu a este serviço médico nesta data,
                        no período <span className="font-bold border-b border-dotted border-gray-400 px-2">{state.certificate.period || "__________________"}</span>, para realização de consulta e/ou exames.
                    </p>
                )}

                {/* CID Display in Body if selected */}
                {state.certificate.includeCid && state.cid && (
                    <div className="mt-8 p-4 border border-gray-300 rounded bg-gray-50 inline-block">
                        <span className="font-bold text-gray-800">Diagnóstico (CID): </span>
                        <span className="font-mono font-bold text-lg">{state.cid}</span>
                    </div>
                )}
            </CertificatePaper>

            {/* Companion Declaration (Conditional) */}
            {state.certificate.includeCompanion && (
               <div className="break-before-page w-full flex justify-center">
                  <CertificatePaper
                    title="Declaração de Comparecimento"
                    doctor={doctor}
                    institution={institution}
                    dateStr={displayDate}
                    typeLabel="DC"
                    customHeaderImage={customHeaderImage}
                    hideTextHeader={hideTextHeader}
                  >
                      <p>
                          Declaro para os devidos fins que o(a) Sr(a). <span className="font-bold">{state.certificate.companionName || "________________________________"}</span>
                          {state.certificate.companionDocument && <>, portador(a) do documento nº <span className="font-bold font-mono">{state.certificate.companionDocument}</span>,</>} compareceu a este serviço médico nesta data,
                          na condição de acompanhante do paciente <span className="font-bold">{state.patient.name || "________________________________"}</span>.
                      </p>
                      
                      {/* Companion declaration typically uses the same time period if attendance, or just the date */}
                      {state.certificate.period && (
                        <p className="mt-4">
                           Período: <span className="font-bold border-b border-dotted border-gray-400 px-2">{state.certificate.period}</span>.
                        </p>
                      )}
                  </CertificatePaper>
               </div>
            )}
         </div>

      </div>
      
      {/* Ensure break-before-page class works for printing */}
      <style>{`
        @media print {
          .break-before-page {
            page-break-before: always !important;
            break-before: page !important;
            display: block;
            margin-top: 0;
          }
        }
      `}</style>

    </div>
  );
};

export default CertificateGenerator;

import { GoogleGenAI, Type } from "@google/genai";
import { AiSuggestionResponse, Institution } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestPrescription = async (
  diagnosis: string, 
  age: string,
  isPediatric: boolean = false,
  pediatricData: string = ""
): Promise<AiSuggestionResponse | null> => {
  try {
    const ageContext = isPediatric 
      ? `PACIENTE PEDIÁTRICO. Idade/Detalhes: ${pediatricData || age}.` 
      : `Paciente adulto de ${age} anos.`;

    const specialtyContext = isPediatric
      ? "Atue como um PEDIATRA especialista experiente no Brasil."
      : "Atue como um médico clínico especialista experiente no Brasil.";

    const prompt = `
      ${specialtyContext}
      Com base no diagnóstico "${diagnosis}" para: ${ageContext}, sugira uma prescrição médica padrão.
      As sugestões devem seguir os protocolos clínicos brasileiros.
      
      ${isPediatric ? "IMPORTANTE: Calcule as dosagens estritamente baseadas na faixa etária/peso informados. Prefira formas farmacêuticas adequadas para crianças (xarope, gotas, suspensão)." : ""}
      
      Retorne APENAS os medicamentos sugeridos em formato JSON estruturado.
      Inclua:
      1. Nome do medicamento (genérico + apresentação).
      2. Concentração/Dose.
      3. Frequência (Posologia).
      4. Duração.
      5. Instruções especiais.
      6. Quantidade total estimada para o tratamento (ex: se for 7 dias de antibiótico, calcule quantos frascos ou comprimidos são necessários).
      7. Unidade de fornecimento (Caixa, Frasco, Comprimido, etc).
      
      AVISO: Isso é apenas uma sugestão para auxílio médico.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nome do medicamento e apresentação (ex: Amoxicilina 250mg/5ml)" },
                  dosage: { type: Type.STRING, description: "Dose calculada (ex: 5ml ou 500mg)" },
                  quantity: { type: Type.STRING, description: "Quantidade numérica total (ex: 1, 2, 21)" },
                  unit: { type: Type.STRING, description: "Unidade de dispensação (ex: Caixa, Frasco, Vidro)" },
                  frequency: { type: Type.STRING, description: "Frequência de uso (ex: de 8 em 8 horas)" },
                  duration: { type: Type.STRING, description: "Tempo de uso (ex: por 7 dias)" },
                  instructions: { type: Type.STRING, description: "Instruções adicionais (ex: agitar antes de usar)" },
                },
                required: ["name", "dosage", "quantity", "unit", "frequency", "duration", "instructions"],
              },
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AiSuggestionResponse;
    }
    return null;

  } catch (error) {
    console.error("Error generating prescription suggestion:", error);
    throw error;
  }
};

export const checkInteractions = async (
  medications: string[], 
  isPregnant: boolean,
  isPediatric: boolean = false,
  pediatricData: string = ""
): Promise<string> => {
  try {
    const list = medications.join(", ");
    
    let alertContext = "";
    if (isPregnant) {
      alertContext += " A paciente é GESTANTE. É CRUCIAL verificar a classificação de risco na gravidez (FDA/ANVISA). Alerte IMEDIATAMENTE se houver risco de teratogenicidade.";
    }
    if (isPediatric) {
      alertContext += ` O paciente é PEDIÁTRICO (Detalhes: ${pediatricData}). Verifique se os medicamentos, DOSAGENS e FORMAS FARMACÊUTICAS são seguros para esta faixa etária/peso. Alerte sobre contraindicações em crianças.`;
    }

    const prompt = `
      Analise a seguinte lista de medicamentos para possíveis interações medicamentosas graves, contraindicações importantes ou erros de dosagem óbvios: ${list}. 
      ${alertContext}
      Responda de forma breve e direta em Português do Brasil. 
      Se houver riscos para gestante ou crianças, destaque isso EM PRIMEIRO LUGAR.
      Se não houver interações graves conhecidas e for seguro, diga "Nenhuma interação grave detectada."
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Não foi possível verificar interações.";
  } catch (error) {
    console.error("Error checking interactions:", error);
    return "Erro ao verificar interações.";
  }
};

export const findInstitutionDetails = async (query: string): Promise<Partial<Institution> | null> => {
  try {
    const prompt = `
      Pesquise e encontre detalhes sobre a instituição de saúde: "${query}" no Brasil.
      Extraia as seguintes informações e retorne EXCLUSIVAMENTE em formato JSON:
      {
        "name": "Nome oficial da instituição",
        "address": "Endereço completo (Logradouro, Número, Bairro, CEP se disponível)",
        "city": "Cidade",
        "state": "Estado (Sigla UF)",
        "phone": "Telefone de contato"
      }
      Se não encontrar alguma informação específica, deixe o campo como string vazia.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) return null;

    // Simple cleaning of code blocks if present
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Find JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
        return JSON.parse(cleaned.substring(start, end + 1));
    }
    
    return null;
  } catch (error) {
    console.error("Error searching institution:", error);
    return null;
  }
};

export interface AppGuideContent {
  overview: string;
  steps: { title: string; description: string }[];
  faq: { question: string; answer: string }[];
  tips: string[];
}

export const generateAppGuide = async (userRole: 'doctor' | 'guest'): Promise<AppGuideContent | null> => {
  try {
    const features = [
      "Geração de Receitas Médicas",
      "Sugestões Clínicas via IA",
      "Verificação de Interações Medicamentosas (Gestante/Pediátrico)",
      "Editor de Orientações Personalizadas (Manual)",
      "Geração de Atestados e Declarações",
      "Modo Visitante (Edição de Cabeçalho)",
      "Perfil de Médico (Edição de Foto/Dados)",
      "Histórico Local de Prescrições",
      "Exportação PDF Multi-páginas"
    ];

    const prompt = `
      Gere um guia de uso "Como usar" para o aplicativo "Prescreve AI".
      Perfil do usuário atual: ${userRole === 'guest' ? 'Visitante (sem conta)' : 'Médico Logado'}.
      Funcionalidades ativas no sistema: ${features.join(', ')}.
      
      Retorne um JSON estruturado com os seguintes campos:
      1. 'overview': Uma visão geral curta e acolhedora do app.
      2. 'steps': Um array de objetos { title, description } com 5 a 6 passos principais para usar o app (ex: Preencher dados, Usar IA, Imprimir). Se for visitante, inclua como editar o cabeçalho manualmente. Se for logado, inclua como editar perfil.
      3. 'faq': Um array de objetos { question, answer } com 4 perguntas frequentes (ex: LGPD, Como salvar PDF, IA errou?).
      4. 'tips': Um array de strings com 3 dicas curtas e úteis.
      
      A linguagem deve ser profissional, porém acessível e em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            faq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                }
              }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AppGuideContent;
    }
    return null;
  } catch (error) {
    console.error("Error generating app guide:", error);
    return null;
  }
};

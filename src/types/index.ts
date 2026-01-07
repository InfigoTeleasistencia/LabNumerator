export interface Patient {
  id: string;
  code: string; // LabOSNro (código de barras)
  name: string; // Nombre
  cedula: string; // Cedula + Digito
  matricula: string; // Matricula
  usuario: string; // Usuario (Historia Clínica)
  dependencia: string; // Dependencia + DepDescripcion
  sector: string; // Sector
  sectorDescription: string; // SecDescripcion
  fecha: string; // Fecha de extracción
  horaInicial: string; // HoraInicial
  horaFinal: string; // HoraFinal
  timestamp: number;
  status: 'waiting' | 'called' | 'attending' | 'completed' | 'expired';
  calledAt?: number;
  completedAt?: number;
  position?: number;
  puesto?: number; // Número del puesto/lab que lo llamó
}

export interface QueueState {
  sectors: {
    [sectorId: string]: {
      waiting: Patient[];
      current: Patient | null;
      recent: Patient[];
    };
  };
}

export interface ValidationResponse {
  valid: boolean;
  patient?: {
    code: string;
    name: string;
    cedula: number;
    digito: number;
    matricula: number;
    usuario: number;
    dependencia: number;
    depDescripcion: string;
    sector: number;
    secDescripcion: string;
    fecha: string;
    horaInicial: string;
    horaFinal: string;
  };
  error?: string;
  errorDescription?: string;
}

export interface SocketEvents {
  'queue:update': (state: QueueState) => void;
  'patient:added': (patient: Patient) => void;
  'patient:called': (patient: Patient) => void;
}



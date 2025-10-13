import { Patient, QueueState } from '@/types';

// Store por sectores
class QueueStore {
  private patients: Map<string, Patient> = new Map();
  // Estructura: { sectorId: { waiting: [...], current: patientId, recent: [...] } }
  private sectors: Map<string, {
    waitingQueue: string[];
    currentPatientId: string | null;
    recentPatients: string[];
  }> = new Map();
  
  private maxRecent = 5;

  private initSector(sectorId: string) {
    if (!this.sectors.has(sectorId)) {
      this.sectors.set(sectorId, {
        waitingQueue: [],
        currentPatientId: null,
        recentPatients: [],
      });
    }
  }

  addPatient(patient: Omit<Patient, 'timestamp' | 'status'>): Patient {
    const newPatient: Patient = {
      ...patient,
      timestamp: Date.now(),
      status: 'waiting',
    };

    this.patients.set(patient.id, newPatient);
    
    // Agregar a la cola del sector correspondiente
    const sectorId = patient.sector;
    this.initSector(sectorId);
    
    const sector = this.sectors.get(sectorId)!;
    sector.waitingQueue.push(patient.id);
    
    return newPatient;
  }

  callNext(sectorId: string): Patient | null {
    this.initSector(sectorId);
    const sector = this.sectors.get(sectorId)!;
    
    if (sector.waitingQueue.length === 0) {
      return null;
    }

    // Mover el paciente actual a completado
    if (sector.currentPatientId) {
      const current = this.patients.get(sector.currentPatientId);
      if (current) {
        current.status = 'completed';
        current.completedAt = Date.now();
        this.addToRecent(sectorId, sector.currentPatientId);
      }
    }

    // Llamar al siguiente
    const nextId = sector.waitingQueue.shift()!;
    const patient = this.patients.get(nextId);
    
    if (patient) {
      patient.status = 'called';
      patient.calledAt = Date.now();
      sector.currentPatientId = nextId;
    }

    return patient || null;
  }

  private addToRecent(sectorId: string, patientId: string) {
    const sector = this.sectors.get(sectorId);
    if (!sector) return;

    sector.recentPatients.unshift(patientId);
    if (sector.recentPatients.length > this.maxRecent) {
      sector.recentPatients.pop();
    }
  }

  getState(): QueueState {
    const state: QueueState = {
      sectors: {},
    };

    // Construir estado para cada sector
    for (const [sectorId, sector] of this.sectors.entries()) {
      const waiting = sector.waitingQueue
        .map(id => this.patients.get(id))
        .filter(Boolean) as Patient[];

      // Asignar posiciones
      waiting.forEach((patient, index) => {
        patient.position = index + 1;
      });

      const current = sector.currentPatientId 
        ? this.patients.get(sector.currentPatientId) || null
        : null;

      const recent = sector.recentPatients
        .map(id => this.patients.get(id))
        .filter(Boolean) as Patient[];

      state.sectors[sectorId] = { waiting, current, recent };
    }

    return state;
  }

  getSectorState(sectorId: string) {
    this.initSector(sectorId);
    const state = this.getState();
    return state.sectors[sectorId] || { waiting: [], current: null, recent: [] };
  }

  hasPatient(code: string): boolean {
    return Array.from(this.patients.values()).some(p => p.code === code);
  }

  getPatientByCode(code: string): Patient | undefined {
    return Array.from(this.patients.values()).find(p => p.code === code);
  }

  markAsAttending(patientId: string): boolean {
    const patient = this.patients.get(patientId);
    if (patient && patient.status === 'called') {
      patient.status = 'attending';
      return true;
    }
    return false;
  }

  getAllSectors(): string[] {
    return Array.from(this.sectors.keys());
  }

  reset() {
    this.patients.clear();
    this.sectors.clear();
  }

  resetSector(sectorId: string) {
    this.sectors.delete(sectorId);
  }
}

export const queueStore = new QueueStore();
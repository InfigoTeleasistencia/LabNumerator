import { Patient, QueueState } from '@/types';
import fs from 'fs';
import path from 'path';

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
  private persistencePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Definir ruta de persistencia
    this.persistencePath = path.join(process.cwd(), 'data', 'queue-state.json');
    // Cargar estado al inicializar
    this.loadFromDisk();
  }

  private initSector(sectorId: string) {
    if (!this.sectors.has(sectorId)) {
      this.sectors.set(sectorId, {
        waitingQueue: [],
        currentPatientId: null,
        recentPatients: [],
      });
    }
  }

  /**
   * Convierte una hora en formato "HH:MM" a minutos desde medianoche
   * para facilitar la comparación
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Compara dos pacientes por su horario de turno (horaInicial)
   * Retorna: -1 si p1 va antes, 1 si p2 va antes, 0 si son iguales
   */
  private comparePatientsByTurn(p1: Patient, p2: Patient): number {
    const time1 = this.timeToMinutes(p1.horaInicial);
    const time2 = this.timeToMinutes(p2.horaInicial);
    
    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    
    // Si tienen la misma horaInicial, ordenar por fecha (si aplica)
    // o por timestamp de llegada al sistema
    return p1.timestamp - p2.timestamp;
  }

  /**
   * Ordena la cola de espera de un sector por horario de turno
   */
  private sortQueue(sectorId: string) {
    const sector = this.sectors.get(sectorId);
    if (!sector) return;

    // Ordenar los IDs basándose en los datos de los pacientes
    sector.waitingQueue.sort((idA, idB) => {
      const patientA = this.patients.get(idA);
      const patientB = this.patients.get(idB);
      
      if (!patientA || !patientB) return 0;
      
      return this.comparePatientsByTurn(patientA, patientB);
    });
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
    
    // Ordenar la cola por horario de turno
    this.sortQueue(sectorId);
    
    console.log(`📅 Paciente agregado y cola ordenada por turno. Turno del paciente: ${patient.horaInicial}-${patient.horaFinal}`);
    
    // Programar guardado en disco
    this.scheduleSave();
    
    return newPatient;
  }

  callNext(sectorId: string, puesto?: number): Patient | null {
    this.initSector(sectorId);
    const sector = this.sectors.get(sectorId)!;
    
    if (sector.waitingQueue.length === 0) {
      return null;
    }

    // Si hay un paciente actual en ESTE puesto específico, moverlo a completado
    if (puesto) {
      // Buscar el paciente que está actualmente en este puesto
      const currentPatientInPuesto = Array.from(this.patients.values())
        .find(p => p.sector === sectorId && p.status === 'called' && p.puesto === puesto);
      
      if (currentPatientInPuesto) {
        currentPatientInPuesto.status = 'completed';
        currentPatientInPuesto.completedAt = Date.now();
        this.addToRecent(sectorId, currentPatientInPuesto.id);
        console.log(`✅ Paciente ${currentPatientInPuesto.code} completado en Puesto ${puesto}`);
      }
    }

    // Llamar al siguiente
    const nextId = sector.waitingQueue.shift()!;
    const patient = this.patients.get(nextId);
    
    if (patient) {
      patient.status = 'called';
      patient.calledAt = Date.now();
      patient.puesto = puesto; // Asignar el número de puesto
      console.log(`📢 Paciente ${patient.code} llamado a Puesto ${puesto}`);
    }

    // Programar guardado en disco
    this.scheduleSave();

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
      // Asegurar que la cola esté ordenada antes de retornar el estado
      this.sortQueue(sectorId);
      
      const waiting = sector.waitingQueue
        .map(id => this.patients.get(id))
        .filter(Boolean) as Patient[];

      // Asignar posiciones
      waiting.forEach((patient, index) => {
        patient.position = index + 1;
      });

      // Obtener todos los pacientes en estado "called" para este sector
      const calledPatients = Array.from(this.patients.values())
        .filter(p => p.sector === sectorId && p.status === 'called')
        .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0)); // Más reciente primero

      // El "current" es el más recientemente llamado
      const current = calledPatients.length > 0 ? calledPatients[0] : null;

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

  /**
   * Obtiene todos los pacientes que están siendo llamados/atendidos en un sector
   */
  getCalledPatients(sectorId: string): Patient[] {
    return Array.from(this.patients.values())
      .filter(p => p.sector === sectorId && p.status === 'called')
      .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0)); // Más reciente primero
  }

  /**
   * Obtiene el paciente actual de un puesto específico
   */
  getCurrentPatientByPuesto(sectorId: string, puesto: number): Patient | null {
    return Array.from(this.patients.values())
      .find(p => p.sector === sectorId && p.status === 'called' && p.puesto === puesto) || null;
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
    this.scheduleSave();
  }

  resetSector(sectorId: string) {
    this.sectors.delete(sectorId);
    this.scheduleSave();
  }

  /**
   * Programa un guardado con debounce para evitar escrituras excesivas
   */
  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 1000); // Guardar 1 segundo después del último cambio
  }

  /**
   * Guarda el estado actual en disco
   */
  private saveToDisk() {
    try {
      // Crear directorio si no existe
      const dataDir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Serializar estado
      const state = {
        patients: Array.from(this.patients.entries()),
        sectors: Array.from(this.sectors.entries()),
        timestamp: Date.now(),
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(state, null, 2), 'utf-8');
      console.log('💾 Cola guardada en disco:', this.persistencePath);
    } catch (error) {
      console.error('❌ Error guardando cola en disco:', error);
    }
  }

  /**
   * Carga el estado desde disco si existe
   */
  private loadFromDisk() {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const state = JSON.parse(data);

        // Restaurar pacientes
        this.patients = new Map(state.patients);
        
        // Restaurar sectores
        this.sectors = new Map(state.sectors);

        const age = Date.now() - state.timestamp;
        console.log('📂 Cola cargada desde disco:', {
          patients: this.patients.size,
          sectors: this.sectors.size,
          ageMinutes: Math.round(age / 60000),
        });
      } else {
        console.log('ℹ️  No se encontró archivo de persistencia, iniciando cola vacía');
      }
    } catch (error) {
      console.error('❌ Error cargando cola desde disco:', error);
      console.log('ℹ️  Iniciando cola vacía');
    }
  }

  /**
   * Exporta el estado completo para backup
   */
  exportState() {
    return {
      patients: Array.from(this.patients.entries()),
      sectors: Array.from(this.sectors.entries()),
      timestamp: Date.now(),
    };
  }

  /**
   * Importa un estado completo desde backup
   */
  importState(state: any) {
    try {
      this.patients = new Map(state.patients);
      this.sectors = new Map(state.sectors);
      this.scheduleSave();
      console.log('✅ Estado importado correctamente');
    } catch (error) {
      console.error('❌ Error importando estado:', error);
    }
  }
}

export const queueStore = new QueueStore();
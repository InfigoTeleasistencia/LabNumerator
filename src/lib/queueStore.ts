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

  private cleanupInterval: NodeJS.Timeout | null = null;
  private midnightCheckInterval: NodeJS.Timeout | null = null;
  private lastCleanupDate: string = new Date().toISOString().split('T')[0];

  constructor() {
    // Definir ruta de persistencia
    this.persistencePath = path.join(process.cwd(), 'data', 'queue-state.json');
    // Cargar estado al inicializar
    this.loadFromDisk();
    // Iniciar tareas de limpieza automática
    this.startAutomaticCleanup();
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
   * Extrae información de turno (timestamp o minutos) desde horaInicial/fecha.
   * Maneja valores "HH:mm" y fechas completas ISO.
   */
  private getTurnInfo(patient: Patient): { timestamp: number | null; minutes: number | null } {
    const rawTime = patient.horaInicial?.trim();
    if (!rawTime) {
      return { timestamp: null, minutes: null };
    }

    const isTimeOnly = /^\d{2}:\d{2}(:\d{2})?$/.test(rawTime);
    if (isTimeOnly) {
      const minutes = this.timeToMinutes(rawTime);
      if (patient.fecha) {
        const timeWithSeconds = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
        const combined = `${patient.fecha}T${timeWithSeconds}`;
        const parsed = new Date(combined);
        const timestamp = Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
        return { timestamp, minutes };
      }
      return { timestamp: null, minutes };
    }

    const parsed = new Date(rawTime);
    if (!Number.isNaN(parsed.getTime())) {
      return { timestamp: parsed.getTime(), minutes: null };
    }

    return { timestamp: null, minutes: null };
  }

  /**
   * Compara dos pacientes por su horario de turno (horaInicial)
   * Retorna: -1 si p1 va antes, 1 si p2 va antes, 0 si son iguales
   */
  private comparePatientsByTurn(p1: Patient, p2: Patient): number {
    const info1 = this.getTurnInfo(p1);
    const info2 = this.getTurnInfo(p2);

    if (info1.timestamp !== null && info2.timestamp !== null) {
      if (info1.timestamp < info2.timestamp) return -1;
      if (info1.timestamp > info2.timestamp) return 1;
    } else if (info1.timestamp !== null && info2.timestamp === null) {
      return -1;
    } else if (info1.timestamp === null && info2.timestamp !== null) {
      return 1;
    }

    if (info1.minutes !== null && info2.minutes !== null) {
      if (info1.minutes < info2.minutes) return -1;
      if (info1.minutes > info2.minutes) return 1;
    }

    // Si tienen la misma horaInicial, ordenar por timestamp de llegada al sistema
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

    // Mover TODOS los pacientes llamados en este puesto a completado
    // (puede haber más de uno si se usó re-llamar)
    if (puesto) {
      const calledInPuesto = Array.from(this.patients.values())
        .filter(p => p.sector === sectorId && p.status === 'called' && p.puesto === puesto);
      
      for (const pat of calledInPuesto) {
        pat.status = 'completed';
        pat.completedAt = Date.now();
        this.addToRecent(sectorId, pat.id);
        console.log(`✅ Paciente ${pat.code} completado en Puesto ${puesto}`);
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

  /**
   * Re-llama a un paciente completado o expirado, poniéndolo de vuelta en estado "called".
   * Completa primero al paciente actual del puesto para que vuelva a recientes.
   */
  recallPatient(patientId: string, sectorId: string, puesto: number): Patient | null {
    const patient = this.patients.get(patientId);
    if (!patient) return null;

    if (patient.status !== 'completed' && patient.status !== 'expired') {
      return null;
    }

    // Completar los pacientes que ya estaban llamados en este puesto
    const calledInPuesto = Array.from(this.patients.values())
      .filter(p => p.sector === sectorId && p.status === 'called' && p.puesto === puesto);

    for (const pat of calledInPuesto) {
      pat.status = 'completed';
      pat.completedAt = Date.now();
      this.addToRecent(sectorId, pat.id);
      console.log(`✅ Paciente ${pat.code} completado en Puesto ${puesto} (por re-llamado)`);
    }

    // Ahora poner al paciente re-llamado como llamado
    patient.status = 'called';
    patient.calledAt = Date.now();
    patient.puesto = puesto;
    patient.completedAt = undefined;

    // Removerlo de recientes (ya que ahora está siendo atendido)
    const sector = this.sectors.get(sectorId);
    if (sector) {
      const idx = sector.recentPatients.indexOf(patientId);
      if (idx > -1) {
        sector.recentPatients.splice(idx, 1);
      }
    }

    this.scheduleSave();
    return patient;
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

  /**
   * Limpia pacientes que llevan más de 2 horas en la cola o en estado "called"
   */
  private cleanupStalePatients() {
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 horas
    let removedCount = 0;

    // Recorrer todos los pacientes
    Array.from(this.patients.entries()).forEach(([patientId, patient]) => {
      const age = now - patient.timestamp;
      
      // Remover si tiene más de 2 horas
      if (age > twoHoursInMs) {
        // Remover de la cola waiting si está ahí
        const sector = this.sectors.get(patient.sector);
        if (sector) {
          const index = sector.waitingQueue.indexOf(patientId);
          if (index > -1) {
            sector.waitingQueue.splice(index, 1);
            removedCount++;
            console.log(`🧹 Removido paciente obsoleto (waiting): ${patient.code} - ${Math.round(age / 60000)} minutos`);
          }
        }

        // Si está en "called", también removerlo
        if (patient.status === 'called') {
          patient.status = 'expired';
          removedCount++;
          console.log(`🧹 Marcado paciente como expirado (called): ${patient.code} - ${Math.round(age / 60000)} minutos`);
        }

        // Remover del mapa de pacientes
        this.patients.delete(patientId);
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Limpieza completada: ${removedCount} pacientes obsoletos removidos`);
      this.scheduleSave();
    }
  }

  /**
   * Limpia toda la cola si es un nuevo día
   */
  private cleanupIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    
    if (today !== this.lastCleanupDate) {
      console.log(`🌅 Nuevo día detectado (${this.lastCleanupDate} → ${today}). Limpiando cola...`);
      
      const beforeCount = this.patients.size;
      
      // Limpiar todo excepto pacientes recientes (completados hoy)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();
      
      Array.from(this.patients.entries()).forEach(([patientId, patient]) => {
        // Solo mantener pacientes completados hoy
        if (patient.status !== 'completed' || (patient.completedAt || 0) < todayStartMs) {
          this.patients.delete(patientId);
        }
      });
      
      // Limpiar colas de sectores
      this.sectors.forEach((sector, sectorId) => {
        sector.waitingQueue = [];
        sector.currentPatientId = null;
        // Mantener solo recientes del día
        sector.recentPatients = sector.recentPatients.filter(id => {
          const patient = this.patients.get(id);
          return patient && patient.status === 'completed' && (patient.completedAt || 0) >= todayStartMs;
        });
      });
      
      const afterCount = this.patients.size;
      console.log(`🌅 Limpieza diaria completada: ${beforeCount - afterCount} pacientes removidos, ${afterCount} mantenidos`);
      
      this.lastCleanupDate = today;
      this.scheduleSave();
    }
  }

  /**
   * Inicia tareas automáticas de limpieza
   */
  private startAutomaticCleanup() {
    // Limpieza de pacientes obsoletos cada 15 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePatients();
    }, 15 * 60 * 1000); // 15 minutos

    // Verificar cambio de día cada 5 minutos
    this.midnightCheckInterval = setInterval(() => {
      this.cleanupIfNewDay();
    }, 5 * 60 * 1000); // 5 minutos

    // Ejecutar limpieza inicial inmediatamente
    this.cleanupIfNewDay();
    this.cleanupStalePatients();
    
    console.log('🔄 Tareas automáticas de limpieza iniciadas');
    console.log('   - Pacientes obsoletos: cada 15 minutos');
    console.log('   - Cambio de día: cada 5 minutos');
  }

  /**
   * Detiene las tareas automáticas de limpieza (para testing/shutdown)
   */
  stopAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.midnightCheckInterval) {
      clearInterval(this.midnightCheckInterval);
      this.midnightCheckInterval = null;
    }
    console.log('🛑 Tareas automáticas de limpieza detenidas');
  }

  /**
   * Forzar limpieza manual (para testing o admin)
   */
  forceCleanup() {
    console.log('🔧 Limpieza forzada manualmente');
    this.cleanupStalePatients();
    this.cleanupIfNewDay();
  }
}

export const queueStore = new QueueStore();
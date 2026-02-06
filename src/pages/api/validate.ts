import type { NextApiRequest, NextApiResponse } from 'next';
import { validateCodeWithExternalAPI } from '@/lib/externalApi';
import { queueStore } from '@/lib/queueStore';
import { emitQueueUpdate } from '@/lib/socketManager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, testMode, testData } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código inválido' });
    }

    // Verificar si el código ya está en la cola
    if (queueStore.hasPatient(code)) {
      const existingPatient = queueStore.getPatientByCode(code);
      return res.status(409).json({ 
        error: 'Este código ya está en la cola',
        patient: existingPatient,
      });
    }

    let patientData;

    // Si es modo test, usar los datos de prueba
    if (testMode && testData) {
      console.log('🧪 Modo TEST - datos recibidos:', JSON.stringify(testData, null, 2));
      patientData = testData;
    } else {
      // Validar con el servicio SOAP
      console.log('📡 Llamando servicio SOAP para código:', code);
      const validation = await validateCodeWithExternalAPI(code);

      if (!validation.valid) {
        console.log('❌ Validación SOAP fallida:', validation.error, validation.errorDescription);
        return res.status(400).json({ 
          error: validation.error || 'Código no válido',
          errorDescription: validation.errorDescription,
        });
      }

      console.log('✅ Validación SOAP exitosa - datos del paciente:', JSON.stringify(validation.patient, null, 2));
      patientData = validation.patient!;
    }

    // Validar que la hora final del turno no haya pasado (aplica para todos los casos)
    // IMPORTANTE: Todas las horas del servicio SOAP vienen en timezone Uruguay (UTC-3)
    if (patientData.horaFinal) {
      // Obtener hora actual en Uruguay (UTC-3)
      // Usamos toLocaleString para obtener la fecha/hora en timezone Uruguay
      const nowUtc = new Date();
      const uruguayTimeStr = nowUtc.toLocaleString('en-CA', { 
        timeZone: 'America/Montevideo',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      // Formato: "2026-02-06, 15:30:00"
      const [ahoraDateStr, ahoraTimeStr] = uruguayTimeStr.split(', ');
      const [ahoraYear, ahoraMonth, ahoraDay] = ahoraDateStr.split('-').map(Number);
      const [ahoraHours, ahoraMinutes] = ahoraTimeStr.split(':').map(Number);
      
      // Crear timestamp de "ahora" en minutos desde epoch para comparación simple
      const ahoraEnMinutos = (ahoraYear * 525600) + (ahoraMonth * 43800) + (ahoraDay * 1440) + (ahoraHours * 60) + ahoraMinutes;
      
      let horaFinalHours: number;
      let horaFinalMinutes: number;
      let fechaTurnoYear: number;
      let fechaTurnoMonth: number;
      let fechaTurnoDay: number;
      let fechaTurno: string;
      
      // Manejar diferentes formatos de hora (todas vienen en timezone Uruguay)
      if (patientData.horaFinal.includes('T')) {
        // Formato ISO completo (ej: "2026-02-04T14:00:00")
        const [datePart, timePart] = patientData.horaFinal.split('T');
        fechaTurno = datePart;
        const [year, month, day] = datePart.split('-').map(Number);
        fechaTurnoYear = year;
        fechaTurnoMonth = month;
        fechaTurnoDay = day;
        [horaFinalHours, horaFinalMinutes] = timePart.split(':').map(Number);
      } else {
        // Formato solo hora "HH:mm" o "HH:mm:ss"
        [horaFinalHours, horaFinalMinutes] = patientData.horaFinal.split(':').map(Number);
        
        if (patientData.fecha) {
          fechaTurno = patientData.fecha;
          const [year, month, day] = patientData.fecha.split('-').map(Number);
          fechaTurnoYear = year;
          fechaTurnoMonth = month;
          fechaTurnoDay = day;
        } else {
          // Usar fecha de hoy en Uruguay
          fechaTurnoYear = ahoraYear;
          fechaTurnoMonth = ahoraMonth;
          fechaTurnoDay = ahoraDay;
          fechaTurno = ahoraDateStr;
        }
      }
      
      // Crear timestamp del turno en minutos para comparación simple
      const turnoEnMinutos = (fechaTurnoYear * 525600) + (fechaTurnoMonth * 43800) + (fechaTurnoDay * 1440) + (horaFinalHours * 60) + horaFinalMinutes;
      
      // Diferencia en minutos (positivo = turno ya pasó)
      const diferenciaMin = ahoraEnMinutos - turnoEnMinutos;
      
      // Log para diagnóstico
      console.log('🕐 Validación de turno (Uruguay):', {
        horaFinalRecibida: patientData.horaFinal,
        fechaRecibida: patientData.fecha,
        ahoraUruguay: `${ahoraDateStr} ${ahoraHours}:${String(ahoraMinutes).padStart(2, '0')}`,
        turnoUruguay: `${fechaTurno} ${horaFinalHours}:${String(horaFinalMinutes).padStart(2, '0')}`,
        diferenciaMin,
        turnoVencido: diferenciaMin > 1,
      });
      
      // Margen de tolerancia de 1 minuto
      if (diferenciaMin > 1) {
        const horaFormateada = `${String(horaFinalHours).padStart(2, '0')}:${String(horaFinalMinutes).padStart(2, '0')}`;
        const fechaFormateada = fechaTurno.split('-').reverse().join('/'); // "2026-02-04" -> "04/02/2026"
        console.log('❌ Turno vencido - rechazando paciente');
        return res.status(400).json({
          error: 'Turno vencido',
          errorDescription: `El horario de atención finalizó el ${fechaFormateada} a las ${horaFormateada}. Por favor, solicite un nuevo turno.`,
        });
      }
    }

    // Agregar a la cola del sector correspondiente
    const patient = queueStore.addPatient({
      id: `PAT-${Date.now()}`,
      code: patientData.code,
      name: patientData.name,
      cedula: `${patientData.cedula}-${patientData.digito}`,
      matricula: patientData.matricula.toString(),
      usuario: patientData.usuario.toString(),
      dependencia: `${patientData.dependencia} - ${patientData.depDescripcion}`,
      sector: patientData.sector.toString(),
      sectorDescription: patientData.secDescripcion,
      fecha: patientData.fecha,
      horaInicial: patientData.horaInicial,
      horaFinal: patientData.horaFinal,
    });

    console.log('✅ Paciente agregado a la cola:', {
      id: patient.id,
      code: patient.code,
      name: patient.name,
      sector: patient.sector,
      sectorDescription: patient.sectorDescription,
    });

    // Emitir actualización por WebSocket
    const currentState = queueStore.getState();
    console.log('📡 Emitiendo actualización de cola, sectores:', Object.keys(currentState.sectors));
    emitQueueUpdate(currentState);

    return res.status(200).json({ 
      success: true,
      patient,
      sector: patientData.secDescripcion,
      message: `Paciente agregado al ${patientData.secDescripcion}`,
    });
  } catch (error) {
    console.error('Error in validation:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
    });
  }
}
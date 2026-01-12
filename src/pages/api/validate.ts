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
      patientData = testData;
    } else {
      // Validar con el servicio SOAP
      const validation = await validateCodeWithExternalAPI(code);

      if (!validation.valid) {
        return res.status(400).json({ 
          error: validation.error || 'Código no válido',
          errorDescription: validation.errorDescription,
        });
      }

      patientData = validation.patient!;
    }

    // Validar que la hora final del turno no haya pasado (aplica para todos los casos)
    if (patientData.horaFinal) {
      // Obtener hora actual en Uruguay (UTC-3)
      const ahoraUruguay = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Montevideo' }));
      
      let horaFinalHours: number;
      let horaFinalMinutes: number;
      
      // Manejar diferentes formatos de hora
      if (patientData.horaFinal.includes('T')) {
        // Formato ISO completo - extraer solo la hora
        const timePart = patientData.horaFinal.split('T')[1];
        [horaFinalHours, horaFinalMinutes] = timePart.split(':').map(Number);
      } else {
        // Formato solo hora "HH:mm" o "HH:mm:ss"
        [horaFinalHours, horaFinalMinutes] = patientData.horaFinal.split(':').map(Number);
      }
      
      // Construir hora final como fecha de hoy en Uruguay
      const horaFinalUruguay = new Date(ahoraUruguay);
      horaFinalUruguay.setHours(horaFinalHours, horaFinalMinutes, 0, 0);
      
      // Log para diagnóstico
      console.log('🕐 Validación de hora (Uruguay):', {
        horaFinalRecibida: patientData.horaFinal,
        horaFinalParsed: `${horaFinalHours}:${String(horaFinalMinutes).padStart(2, '0')}`,
        ahoraUruguay: ahoraUruguay.toLocaleTimeString('es-UY'),
        horaFinalUruguay: horaFinalUruguay.toLocaleTimeString('es-UY'),
        diferenciaMin: Math.round((ahoraUruguay.getTime() - horaFinalUruguay.getTime()) / 60000),
      });
      
      // Margen de tolerancia de 5 minutos para evitar problemas de sincronización
      const margenToleranciaMs = 5 * 60 * 1000; // 5 minutos
      
      // Verificar que haya pasado más del margen de tolerancia
      if ((ahoraUruguay.getTime() - horaFinalUruguay.getTime()) > margenToleranciaMs) {
        const horaFormateada = `${String(horaFinalHours).padStart(2, '0')}:${String(horaFinalMinutes).padStart(2, '0')}`;
        console.log('❌ Turno vencido - rechazando paciente');
        return res.status(400).json({
          error: 'Turno vencido',
          errorDescription: `El horario de atención finalizó a las ${horaFormateada}. Por favor, solicite un nuevo turno.`,
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
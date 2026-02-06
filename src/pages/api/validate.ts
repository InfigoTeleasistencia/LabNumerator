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
    if (patientData.horaFinal) {
      // Obtener fecha/hora actual real (del servidor)
      const ahora = new Date();
      
      let horaFinalDate: Date;
      let horaFinalHours: number;
      let horaFinalMinutes: number;
      let fechaTurno: string;
      
      // Manejar diferentes formatos de hora
      if (patientData.horaFinal.includes('T')) {
        // Formato ISO completo (ej: "2026-02-04T14:00:00") - usar fecha y hora completas
        const [datePart, timePart] = patientData.horaFinal.split('T');
        fechaTurno = datePart;
        [horaFinalHours, horaFinalMinutes] = timePart.split(':').map(Number);
        
        // Construir la fecha/hora completa del turno (se interpreta como hora local del servidor)
        horaFinalDate = new Date(`${datePart}T${String(horaFinalHours).padStart(2, '0')}:${String(horaFinalMinutes).padStart(2, '0')}:00`);
      } else {
        // Formato solo hora "HH:mm" o "HH:mm:ss" - usar fecha del campo fecha o de hoy
        [horaFinalHours, horaFinalMinutes] = patientData.horaFinal.split(':').map(Number);
        
        if (patientData.fecha) {
          fechaTurno = patientData.fecha;
        } else {
          // Usar fecha de hoy
          fechaTurno = ahora.toISOString().split('T')[0];
        }
        
        // Construir hora final usando la fecha del turno
        horaFinalDate = new Date(`${fechaTurno}T${String(horaFinalHours).padStart(2, '0')}:${String(horaFinalMinutes).padStart(2, '0')}:00`);
      }
      
      const diferenciaMin = Math.round((ahora.getTime() - horaFinalDate.getTime()) / 60000);
      
      // Log para diagnóstico
      console.log('🕐 Validación de turno:', {
        horaFinalRecibida: patientData.horaFinal,
        fechaRecibida: patientData.fecha,
        fechaTurnoUsada: fechaTurno,
        horaFinalParsed: `${horaFinalHours}:${String(horaFinalMinutes).padStart(2, '0')}`,
        ahora: ahora.toISOString(),
        horaFinalDate: horaFinalDate.toISOString(),
        diferenciaMin,
        turnoVencido: diferenciaMin > 5,
      });
      
      // Margen de tolerancia de 5 minutos para evitar problemas de sincronización
      const margenToleranciaMs = 5 * 60 * 1000; // 5 minutos
      
      // Verificar que haya pasado más del margen de tolerancia
      if ((ahora.getTime() - horaFinalDate.getTime()) > margenToleranciaMs) {
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
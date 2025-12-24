import participanteReunionService from '../../services/Videoconferencia/participanteReunion.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para ParticipanteReunion
 * Gestiona participantes de videoconferencias
 * Documentado en español.
 */

export async function listarPorVideoconferencia(req, res, next) {
  try {
    const videoconferenciaId = Number(req.params.videoconferenciaId);
    const participantes = await participanteReunionService.listarPorVideoconferencia(videoconferenciaId);
    res.json(toJSONBigInt(participantes));
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    const participante = await participanteReunionService.obtenerPorId(id);
    res.json(toJSONBigInt(participante));
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevo = await participanteReunionService.crear(req.body);
    res.status(201).json(toJSONBigInt(nuevo));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actualizado = await participanteReunionService.actualizar(id, req.body);
    res.json(toJSONBigInt(actualizado));
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await participanteReunionService.eliminar(id);
    res.status(200).json(toJSONBigInt({ eliminado: true, id }));
  } catch (err) {
    next(err);
  }
}

export async function confirmar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const confirmado = await participanteReunionService.confirmar(id);
    res.json(toJSONBigInt(confirmado));
  } catch (err) {
    next(err);
  }
}

export async function registrarIngreso(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registrado = await participanteReunionService.registrarIngreso(id);
    res.json(toJSONBigInt(registrado));
  } catch (err) {
    next(err);
  }
}

export async function registrarSalida(req, res, next) {
  try {
    const id = Number(req.params.id);
    const registrado = await participanteReunionService.registrarSalida(id);
    res.json(toJSONBigInt(registrado));
  } catch (err) {
    next(err);
  }
}

export async function confirmarYObtenerInfo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const info = await participanteReunionService.confirmarYObtenerInfo(id);
    
    // Si es una petición desde el navegador (email), redirigir a Jitsi con página de confirmación
    if (req.headers.accept?.includes('text/html')) {
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de Asistencia</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #667eea;
              margin-bottom: 10px;
            }
            p {
              color: #6b7280;
              margin-bottom: 30px;
            }
            .info {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: left;
            }
            .spinner {
              border: 4px solid #f3f4f6;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>¡Asistencia Confirmada!</h1>
            <p>Tu asistencia ha sido confirmada exitosamente.</p>
            <div class="info">
              <strong>Reunión:</strong> ${info.videoconferencia.titulo}<br>
              <strong>Participante:</strong> ${info.personal.nombres} ${info.personal.apellidos}
            </div>
            <div class="spinner"></div>
            <p>Redirigiendo a la videoconferencia...</p>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '${info.videoconferencia.urlReunion}';
            }, 2000);
          </script>
        </body>
        </html>
      `;
      return res.send(htmlResponse);
    }
    
    // Si es una petición API (desde el frontend), devolver JSON
    res.json(toJSONBigInt(info));
  } catch (err) {
    next(err);
  }
}

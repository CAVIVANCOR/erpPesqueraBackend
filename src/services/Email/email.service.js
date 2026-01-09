import nodemailer from 'nodemailer';
import { DatabaseError } from '../../utils/errors.js';

/**
 * Servicio de Email con Nodemailer
 * Gestiona el envío de correos electrónicos
 * Documentado en español.
 */

/**
 * Configuración del transporter de Nodemailer
 * Usa variables de entorno para credenciales
 */
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  return nodemailer.createTransport(config);
};

/**
 * Envía un email
 * @param {Object} opciones - Opciones del email
 * @param {string} opciones.to - Destinatario
 * @param {string} opciones.subject - Asunto
 * @param {string} opciones.html - Contenido HTML
 * @param {string} opciones.text - Contenido texto plano (opcional)
 */
export const enviarEmail = async (opciones) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'ERP Megui'}" <${process.env.SMTP_USER}>`,
      to: opciones.to,
      subject: opciones.subject,
      html: opciones.html,
      text: opciones.text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error al enviar email:', err);
    throw new DatabaseError('Error al enviar email', err.message);
  }
};

/**
 * Envía email de invitación a videoconferencia
 */
export const enviarInvitacionVideoconferencia = async (participante, videoconferencia) => {
  const html = generarHTMLInvitacion(participante, videoconferencia);
  
  return await enviarEmail({
    to: participante.email,
    subject: `Invitación: ${videoconferencia.titulo}`,
    html,
  });
};

/**
 * Envía email de recordatorio de videoconferencia
 */
export const enviarRecordatorioVideoconferencia = async (participante, videoconferencia, tiempoAntes) => {
  const html = generarHTMLRecordatorio(participante, videoconferencia, tiempoAntes);
  
  return await enviarEmail({
    to: participante.email,
    subject: `Recordatorio: ${videoconferencia.titulo} - ${tiempoAntes}`,
    html,
  });
};

/**
 * Envía email de cancelación de videoconferencia
 */
export const enviarCancelacionVideoconferencia = async (participante, videoconferencia, motivo) => {
  const html = generarHTMLCancelacion(participante, videoconferencia, motivo);
  
  return await enviarEmail({
    to: participante.email,
    subject: `Cancelada: ${videoconferencia.titulo}`,
    html,
  });
};

/**
 * Genera HTML para invitación
 */
function generarHTMLInvitacion(participante, videoconferencia) {
  const fechaFormateada = new Date(videoconferencia.fechaInicio).toLocaleString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const urlReunion = `${process.env.JITSI_URL || 'https://meet.megui.com.pe'}/${videoconferencia.salaId}`;
  const urlConfirmar = `${process.env.BACKEND_URL || 'https://erp.megui.com.pe/api'}/participante-reunion/${participante.id}/confirmar-y-obtener-info`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; padding: 15px 30px; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 5px; }
        .button-primary { background: #667eea; }
        .button-success { background: #10b981; }
        .button-container { text-align: center; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📹 Invitación a Videoconferencia</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${participante.nombres} ${participante.apellidos}</strong>,</p>
          
          <p>Has sido invitado a participar en la siguiente videoconferencia:</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #667eea;">${videoconferencia.titulo}</h2>
            ${videoconferencia.descripcion ? `<p>${videoconferencia.descripcion}</p>` : ''}
            
            <p><strong>📅 Fecha y Hora:</strong><br>${fechaFormateada}</p>
            <p><strong>⏱️ Duración:</strong> ${videoconferencia.duracion} minutos</p>
            <p><strong>👤 Organizador:</strong> ${videoconferencia.organizador.nombres} ${videoconferencia.organizador.apellidos}</p>
          </div>
          
          <div class="button-container">
            <a href="${urlConfirmar}" class="button button-primary">🎥 Confirmar y Unirse a la Reunión</a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            <strong>Nota:</strong> Al hacer clic en el botón, confirmarás tu asistencia y accederás automáticamente a la videoconferencia.<br><br>
            También puedes copiar este enlace en tu navegador para unirte directamente:<br>
            <a href="${urlReunion}">${urlReunion}</a>
          </p>
        </div>
        
        <div class="footer">
          <p>Este es un correo automático del ERP Megui. Por favor no responder.</p>
          <p>&copy; ${new Date().getFullYear()} Megui. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera HTML para recordatorio
 */
function generarHTMLRecordatorio(participante, videoconferencia, tiempoAntes) {
  const fechaFormateada = new Date(videoconferencia.fechaInicio).toLocaleString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const urlReunion = `${process.env.JITSI_URL || 'https://meet.megui.com.pe'}/${videoconferencia.salaId}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .button { display: inline-block; padding: 15px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Recordatorio de Videoconferencia</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${participante.nombres} ${participante.apellidos}</strong>,</p>
          
          <p>Te recordamos que tienes una videoconferencia programada <strong>${tiempoAntes}</strong>:</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #f59e0b;">${videoconferencia.titulo}</h2>
            <p><strong>📅 Fecha y Hora:</strong><br>${fechaFormateada}</p>
            <p><strong>⏱️ Duración:</strong> ${videoconferencia.duracion} minutos</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${urlReunion}" class="button">🎥 Unirse Ahora</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Este es un correo automático del ERP Megui. Por favor no responder.</p>
          <p>&copy; ${new Date().getFullYear()} Megui. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera HTML para cancelación
 */
function generarHTMLCancelacion(participante, videoconferencia, motivo) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6b7280 0%, #374151 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Videoconferencia Cancelada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${participante.nombres} ${participante.apellidos}</strong>,</p>
          
          <p>Lamentamos informarte que la siguiente videoconferencia ha sido <strong>cancelada</strong>:</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #6b7280;">${videoconferencia.titulo}</h2>
            ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
          </div>
          
          <p>Disculpa las molestias ocasionadas.</p>
        </div>
        
        <div class="footer">
          <p>Este es un correo automático del ERP Megui. Por favor no responder.</p>
          <p>&copy; ${new Date().getFullYear()} Megui. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  enviarEmail,
  enviarInvitacionVideoconferencia,
  enviarRecordatorioVideoconferencia,
  enviarCancelacionVideoconferencia,
};

import api from './api';
import { toast } from 'react-hot-toast';

/**
 * Servicio para generar envíos de WhatsApp automáticos vía Backend
 */

export const sendWhatsAppReport = async (stats, user) => {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const goal = 2000;
  const percentage = Math.min(Math.round((stats.hoy / goal) * 10), 10);
  const bar = "🟩".repeat(percentage) + "⬜".repeat(10 - percentage);

  let message = `📊 *REPORTES DE VENTAS - EL POLLÓN*\n`;
  message += `📅 *Fecha:* ${today}\n`;
  message += `⏰ *Hora:* ${time}\n\n`;
  message += `👤 *Enviado por:* ${user?.nombre || user?.username || 'Sistema'}\n\n`;
  message += `💰 *TOTAL HOY:* Bs. ${Number(stats.hoy).toFixed(2)}\n`;
  message += `📈 [${bar}] ${Math.round((stats.hoy / goal) * 100)}%\n\n`;
  message += `🎟️ *Ticket Promedio:* Bs. ${Number(stats.ticketPromedio).toFixed(2)}\n`;
  message += `📅 *Ventas del Mes:* Bs. ${Number(stats.mes).toFixed(2)}\n\n`;

  if (stats.topProductos && stats.topProductos.length > 0) {
    message += `🏆 *PRODUCTOS MÁS VENDIDOS:*\n`;
    stats.topProductos.slice(0, 5).forEach((prod, index) => {
      message += `${index + 1}. ${prod.nombre} (${prod.cantidad} uni)\n`;
    });
    message += `\n`;
  }

  message += `🚀 _Enviado automáticamente desde el servidor POS._`;

  try {
    await api.post('/whatsapp/send', { message });
    toast.success('Reporte enviado automáticamente al dueño');
  } catch (error) {
    console.error('Error al enviar WhatsApp:', error);
    toast.error('Error al enviar WhatsApp: El servidor de WhatsApp no está listo.');
  }
};

/**
 * Notificación de inicio de sesión
 */
export const sendLoginNotification = async (user) => {
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('es-ES');
  
  const message = `🔓 *NOTIFICACIÓN DE INICIO DE SESIÓN*\n\n` +
                  `👤 *Usuario:* ${user.nombre || user.username}\n` +
                  `⏰ *Hora:* ${time}\n` +
                  `📅 *Fecha:* ${date}\n\n` +
                  `🚀 _El sistema POS está ahora en uso._`;
                  
  try {
    await api.post('/whatsapp/send', { message });
    console.log('Notificación de login enviada');
  } catch (error) {
    console.error('Error enviando notificación login:', error);
  }
};

/**
 * Notificación de cierre de caja / sesión
 */
export const sendLogoutNotification = async (user) => {
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('es-ES');
  
  const message = `🔒 *NOTIFICACIÓN DE CIERRE DE CAJA / SESIÓN*\n\n` +
                  `👤 *Usuario:* ${user.nombre || user.username}\n` +
                  `⏰ *Hora:* ${time}\n` +
                  `📅 *Fecha:* ${date}\n\n` +
                  `✅ _Sesión finalizada correctamente._`;
                  
  try {
    await api.post('/whatsapp/send', { message });
    console.log('Notificación de logout enviada');
  } catch (error) {
    console.error('Error enviando notificación logout:', error);
  }
};

/**
 * Envía el reporte diario resumido directamente desde el backend
 */
export const sendDailyReport = async () => {
  try {
    const response = await api.post('/whatsapp/reporte-diario');
    if (response.data.success) {
      toast.success('Reporte diario enviado a WhatsApp');
    } else {
      toast.error('WhatsApp no está conectado');
    }
    return response.data;
  } catch (error) {
    console.error('Error al enviar reporte diario:', error);
    toast.error('Error al conectar con WhatsApp');
  }
};

/**
 * Envía el backup de la base de datos por WhatsApp
 */
export const sendDirectBackup = async () => {
  try {
    toast.loading('Generando y enviando backup...', { id: 'backup-toast' });
    const response = await api.post('/whatsapp/backup');
    toast.dismiss('backup-toast');
    
    if (response.data.success) {
      toast.success('Backup enviado exitosamente');
    } else {
      toast.error('WhatsApp no está conectado');
    }
    return response.data;
  } catch (error) {
    toast.dismiss('backup-toast');
    console.error('Error al enviar backup:', error);
    toast.error('Error al procesar el backup');
  }
};

/**
 * Obtiene el estado de conexión de WhatsApp y el QR si está pendiente
 */
export const getWhatsAppStatus = async () => {
  try {
    const response = await api.get('/whatsapp/status');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estado de WhatsApp:', error);
    return { ready: false, state: 'DESCONECTADO', qr: null };
  }
};

/**
 * Cierra la sesión de WhatsApp para generar un nuevo QR
 */
export const logoutWhatsApp = async () => {
  try {
    const response = await api.post('/whatsapp/logout');
    if (response.data.success) {
      toast.success('Sesión de WhatsApp cerrada');
    }
    return response.data;
  } catch (error) {
    console.error('Error al cerrar sesión de WhatsApp:', error);
    toast.error('Error al cerrar sesión');
  }
};

/**
 * Reinicia el servicio de WhatsApp completamente
 */
export const resetWhatsApp = async () => {
  try {
    const response = await api.post('/whatsapp/reset');
    if (response.data.success) {
      toast.success('Servicio reiniciado. Espere el nuevo QR.');
    }
    return response.data;
  } catch (error) {
    console.error('Error al reiniciar WhatsApp:', error);
    toast.error('Error al reiniciar el servicio');
  }
};

/**
 * Genera y envía el reporte detallado en PDF por WhatsApp
 */
export const sendPDFReport = async () => {
  try {
    toast.loading('Generando y enviando PDF...', { id: 'pdf-toast' });
    const response = await api.post('/whatsapp/reporte-pdf');
    toast.dismiss('pdf-toast');
    
    if (response.data.success) {
      toast.success('Reporte PDF enviado exitosamente');
    } else {
      toast.error('WhatsApp no está conectado');
    }
    return response.data;
  } catch (error) {
    toast.dismiss('pdf-toast');
    console.error('Error al enviar PDF:', error);
    toast.error('Error al generar el reporte PDF');
  }
};

import api from './api';
import { toast } from 'react-hot-toast';

/**
 * Envía el PDF de reporte directamente a través del bot sin abrir WhatsApp Web
 */
export const sendPDFReportBot = async ({ pdf_base64, filename, caption }) => {
  return await api.post('/whatsapp/reporte-pdf', {
    pdf_base64,
    filename,
    caption
  });
};

/**
 * Normaliza y formatea un número de WhatsApp para enlace internacional (wa.me / api.whatsapp.com)
 * Por defecto en Bolivia antepone el código 591 si el número tiene 8 dígitos.
 */
export const formatWhatsAppNumber = (phone, countryCode = '591') => {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  if (!digits) return '';
  const code = (countryCode || '591').toString().replace(/\D/g, '');
  
  if (digits.startsWith(code) && digits.length >= 10) {
    return digits;
  }
  return `${code}${digits}`;
};

/**
 * Genera el enlace directo para enviar mensaje de WhatsApp
 */
export const getWhatsAppDirectUrl = (phone, message, countryCode = '591') => {
  const cleanPhone = formatWhatsAppNumber(phone, countryCode);
  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

/**
 * Abre directamente la conversación de WhatsApp con el número y mensaje especificado.
 */
export const openWhatsAppDirect = (phone, message, countryCode = '591') => {
  const url = getWhatsAppDirectUrl(phone, message, countryCode);
  window.open(url, '_blank');
};

/**
 * Obtener configuración actual de WhatsApp desde la base de datos
 */
export const getWhatsAppConfig = async () => {
  try {
    const res = await api.get('/whatsapp/config');
    return res.data?.config || null;
  } catch (error) {
    console.error('Error al obtener config de WhatsApp:', error);
    return null;
  }
};

/**
 * Guardar configuración de WhatsApp en la base de datos
 */
export const saveWhatsAppConfig = async (config) => {
  try {
    const res = await api.post('/whatsapp/config', config);
    return res.data;
  } catch (error) {
    console.error('Error al guardar config de WhatsApp:', error);
    throw error;
  }
};

/**
 * Subir reporte PDF al servidor para generar enlace de descarga público
 */
export const uploadPDFReport = async (pdfBase64, filename = 'reporte.pdf') => {
  try {
    const res = await api.post('/whatsapp/subir-pdf', {
      pdf_base64: pdfBase64,
      filename: filename
    });
    return res.data;
  } catch (error) {
    console.error('Error al subir PDF al servidor:', error);
    return null;
  }
};

/**
 * Comparte el archivo PDF real por WhatsApp o abre el chat con enlace
 */
export const shareOrOpenWhatsApp = async ({ phone, message, pdfBlob, filename, countryCode = '591' }) => {
  const cleanPhone = formatWhatsAppNumber(phone, countryCode);

  // 1. Intentar compartir archivo PDF nativo (móviles Android, iOS, Windows con soporte de Web Share API)
  if (navigator.share && pdfBlob && filename) {
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Reporte Oficial Pollería El Pollón',
          text: message
        });
        toast.success('Reporte PDF compartido exitosamente', { icon: '✅' });
        return true;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share no disponible o cancelado, usando fallback:', err);
      }
    }
  }

  // 2. Fallback estándar: abre WhatsApp directamente
  openWhatsAppDirect(phone, message, countryCode);
  return false;
};

/**
 * Obtiene el estado de conexión de WhatsApp
 */
export const getWhatsAppStatus = async () => {
  try {
    const response = await api.get('/whatsapp/status');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estado de WhatsApp:', error);
    return {
      ready: true,
      state: 'CONECTADO_DIRECTO',
      telefono: '63583775',
      codigo_pais: '591',
      destinatario: 'Dueño / Administración',
      platform: 'WhatsApp Direct API'
    };
  }
};

/**
 * Envío directo del reporte ejecutivo de ventas
 */
export const sendWhatsAppReport = async (stats, user) => {
  const today = new Date().toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const time = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  const goal = 2000;
  const hoyVal = Number(stats?.hoy || 0);
  const percentage = Math.min(Math.round((hoyVal / goal) * 10), 10);
  const bar = "🟩".repeat(percentage) + "⬜".repeat(10 - percentage);

  let message = `🍗 *POLLERÍA EL POLLÓN — REPORTE DE VENTAS*\n`;
  message += `📅 *Fecha:* ${today}\n`;
  message += `⏰ *Hora:* ${time}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *TOTAL HOY:* Bs. ${hoyVal.toFixed(2)}\n`;
  message += `📈 [${bar}] ${Math.round((hoyVal / goal) * 100)}%\n\n`;

  if (stats?.ticketPromedio) {
    message += `🎟️ *Ticket Promedio:* Bs. ${Number(stats.ticketPromedio).toFixed(2)}\n`;
  }
  if (stats?.mes) {
    message += `📅 *Ventas del Mes:* Bs. ${Number(stats.mes).toFixed(2)}\n`;
  }

  if (stats?.topProductos && stats.topProductos.length > 0) {
    message += `\n🏆 *PRODUCTOS DESTACADOS:*\n`;
    stats.topProductos.slice(0, 5).forEach((prod, index) => {
      message += `${index + 1}. ${prod.nombre} (${prod.cantidad} uni)\n`;
    });
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *Enviado por:* ${user?.nombre || user?.username || 'Administración'}\n`;
  message += `🚀 _Sistema POS El Pollón_`;

  try {
    const cfg = await getWhatsAppConfig();
    const phone = cfg?.telefono || '63583775';
    const code = cfg?.codigo_pais || '591';

    openWhatsAppDirect(phone, message, code);
    toast.success('Abriendo WhatsApp con el reporte...', { icon: '📲' });
  } catch (error) {
    console.error('Error al enviar WhatsApp:', error);
    openWhatsAppDirect('63583775', message, '591');
  }
};

/**
 * Notificación de inicio de sesión
 */
export const sendLoginNotification = async (user) => {
  const time = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('es-BO');
  
  const message = `🔓 *NOTIFICACIÓN DE INICIO DE SESIÓN*\n\n` +
                  `👤 *Usuario:* ${user.nombre || user.username}\n` +
                  `⏰ *Hora:* ${time}\n` +
                  `📅 *Fecha:* ${date}\n\n` +
                  `🚀 _El sistema POS está ahora en uso._`;
                  
  try {
    await api.post('/whatsapp/send', { message });
  } catch (error) {
    console.error('Error enviando notificación login:', error);
  }
};

/**
 * Notificación de cierre de caja / sesión
 */
export const sendLogoutNotification = async (user) => {
  const time = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('es-BO');
  
  const message = `🔒 *NOTIFICACIÓN DE CIERRE DE CAJA / SESIÓN*\n\n` +
                  `👤 *Usuario:* ${user.nombre || user.username}\n` +
                  `⏰ *Hora:* ${time}\n` +
                  `📅 *Fecha:* ${date}\n\n` +
                  `✅ _Sesión finalizada correctamente._`;
                  
  try {
    await api.post('/whatsapp/send', { message });
  } catch (error) {
    console.error('Error enviando notificación logout:', error);
  }
};

/**
 * Enviar reporte diario resumido
 */
export const sendDailyReport = async () => {
  try {
    const response = await api.post('/whatsapp/reporte-diario');
    return response.data;
  } catch (error) {
    console.error('Error al enviar reporte diario:', error);
  }
};

/**
 * Envía el backup de la base de datos por WhatsApp
 */
export const sendDirectBackup = async () => {
  try {
    toast.loading('Generando backup...', { id: 'backup-toast' });
    const response = await api.post('/whatsapp/backup');
    toast.dismiss('backup-toast');
    toast.success('Backup generado exitosamente');
    return response.data;
  } catch (error) {
    toast.dismiss('backup-toast');
    console.error('Error al enviar backup:', error);
    toast.error('Error al procesar el backup');
  }
};

/**
 * Compatibilidad con interfaz anterior
 */
export const logoutWhatsApp = async () => {
  try {
    const response = await api.post('/whatsapp/logout');
    toast.success('Configuración reiniciada');
    return response.data;
  } catch (error) {
    toast.error('Error al reiniciar');
  }
};

export const resetWhatsApp = async () => {
  try {
    const response = await api.post('/whatsapp/reset');
    toast.success('Servicio de WhatsApp sincronizado');
    return response.data;
  } catch (error) {
    toast.error('Error al sincronizar');
  }
};

export const sendPDFReport = async () => {
  try {
    const response = await api.post('/whatsapp/reporte-pdf');
    return response.data;
  } catch (error) {
    console.error('Error al procesar PDF:', error);
  }
};

export const fullResetWhatsApp = async () => {
  try {
    const response = await api.post('/whatsapp/full-reset');
    toast.success('Sincronización completa');
    return response.data;
  } catch (error) {
    toast.error('Error al reiniciar');
  }
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers de formateo para el reporte ─────────────────────────────────
export const extraerHora = (f) => {
    if (!f) return '—';
    if (f.includes(' ')) {
        const parts = f.split(' ');
        if (parts[1]) return parts[1].substring(0, 5);
    }
    if (f.includes('T')) {
        const parts = f.split('T');
        if (parts[1]) return parts[1].substring(0, 5);
    }
    return f;
};

export const formatearMetodo = (v) => {
    if (v.metodo_pago === 'mixto') {
        const ef = Math.round(Number(v.monto_efectivo || 0));
        const qr = Math.round(Number(v.monto_tarjeta || 0));
        return `MIXTO (E:${ef}/Q:${qr})`;
    }
    if (v.metodo_pago === 'efectivo') {
        return 'EFECTIVO';
    }
    if (v.metodo_pago === 'qr' || v.metodo_pago === 'tarjeta') {
        return 'QR';
    }
    return (v.metodo_pago || 'EFECTIVO').toUpperCase();
};

/**
 * Genera el documento PDF idéntico al diseño oficial solicitado
 */
export const generarReportePDF = ({ stats = {}, historial = [], fechaInicio = '', fechaFin = '' }) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const now = new Date();
    const fechaBol = now.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' });
    const horaBol = now.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit' });

    // 1. Título Centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('POLLER\u00CDA "EL POLL\u00D3N"', pageW / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text('REPORTE DETALLADO DE VENTAS DIARIAS', pageW / 2, 29, { align: 'center' });

    // 2. Fecha y Hora
    doc.setFontSize(9.5);
    doc.text(`Fecha: ${fechaBol} | Hora: ${horaBol} (Bolivia)`, 14, 40);

    // 3. Resumen de Caja
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN DE CAJA:', 14, 49);
    const textWidth = doc.getTextWidth('RESUMEN DE CAJA:');
    doc.setLineWidth(0.3);
    doc.line(14, 50, 14 + textWidth, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Ventas: Bs. ${Number(stats.hoy || 0).toFixed(2)}`, 14, 56);
    doc.text(`Total Efectivo: Bs. ${Number(stats.totalEfectivo || 0).toFixed(2)}`, 14, 62);
    doc.text(`Total QR: Bs. ${Number(stats.totalQR || 0).toFixed(2)}`, 14, 68);

    // 4. Detalle de Ventas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DETALLE DE VENTAS', 14, 79);

    // 5. Tabla de Ventas idéntica a la imagen
    const filas = (historial || []).map(v => [
        v.nota ? v.nota.toString() : '—',
        extraerHora(v.fecha),
        v.cliente || 'Cliente Mostrador',
        formatearMetodo(v),
        v.vendedor || 'Administrador',
        `Bs. ${Number(v.total).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 83,
        head: [['Ticket', 'Hora', 'Cliente', 'M\u00E9todo', 'Vendedor', 'Total']],
        body: filas,
        theme: 'plain',
        headStyles: {
            fillColor: [243, 244, 246],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            lineColor: [229, 231, 235],
            lineWidth: { top: 0.4, bottom: 0.4 },
            cellPadding: 2.5
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 9,
            lineColor: [229, 231, 235],
            lineWidth: { bottom: 0.3 },
            cellPadding: 2.5
        },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 22 },
            2: { cellWidth: 55 },
            3: { cellWidth: 42 },
            4: { cellWidth: 35 },
            5: { cellWidth: 20, halign: 'right' }
        }
    });

    return doc;
};

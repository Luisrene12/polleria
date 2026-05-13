const ventaModel = require('../models/ventaModel');

exports.registrar = async (req, res) => {
    try {
        const { items, cliente, metodo_pago, monto_efectivo, monto_tarjeta } = req.body;
        const usuario_id = req.usuario.id;

        let total = 0;
        const detalles = items.map(item => {
            const subtotal = item.cantidad * item.precio_unitario;
            total += subtotal;
            return {
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal
            };
        });

        const ventaId = await ventaModel.create({
            usuario_id,
            total,
            cliente,
            metodo_pago,
            monto_efectivo,
            monto_tarjeta,
            items: detalles
        });

        res.status(201).json({ ventaId, total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        await ventaModel.delete(id);
        res.json({ message: 'Venta eliminada y stock restaurado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.editar = async (req, res) => {
    try {
        const { id } = req.params;
        const { cliente, metodo_pago } = req.body;
        await ventaModel.updateMetadata(id, { cliente, metodo_pago });
        res.json({ message: 'Venta actualizada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
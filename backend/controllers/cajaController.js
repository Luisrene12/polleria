const CajaModel = require('../models/cajaModel');

exports.getEstado = async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const estado = await CajaModel.getEstado(usuario_id);
        res.json(estado || { estado: 'cerrado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.abrir = async (req, res) => {
    try {
        const { monto_inicial } = req.body;
        const usuario_id = req.usuario.id;

        const abierto = await CajaModel.getEstado(usuario_id);
        if (abierto) {
            return res.status(400).json({ message: 'Ya tienes una caja abierta' });
        }

        const id = await CajaModel.abrir(usuario_id, monto_inicial);
        res.status(201).json({ id, message: 'Caja abierta correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cerrar = async (req, res) => {
    try {
        const { id, monto_final_real } = req.body;
        const usuario_id = req.usuario.id;

        const caja = await CajaModel.getEstado(usuario_id);
        if (!caja || caja.id !== id) {
            return res.status(404).json({ message: 'Caja no encontrada o ya cerrada' });
        }

        const monto_ventas = await CajaModel.getVentasSubtotal(usuario_id, caja.fecha_apertura);
        const monto_final_calculado = parseFloat(caja.monto_inicial) + parseFloat(monto_ventas);
        
        await CajaModel.cerrar(id, monto_final_calculado, monto_final_real);
        
        res.json({ 
            message: 'Caja cerrada correctamente',
            resumen: {
                inicial: caja.monto_inicial,
                ventas: monto_ventas,
                esperado: monto_final_calculado,
                real: monto_final_real,
                diferencia: parseFloat(monto_final_real) - monto_final_calculado
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const express = require('express');
const cors = require('cors');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const productoRoutes = require('./routes/productoRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/whatsapp', whatsappRoutes);


// Health check endpoint para verificar conexión Frontend-Backend
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '¡Backend conectado correctamente!', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
const usuarioModel = require('./models/usuarioModel');

// Seed admin user if not exists
(async () => {
  try {
    const admin = await usuarioModel.findByUsername('admin');
    if (!admin) {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('1234', 10); // default PIN 1234
      await usuarioModel.create({ nombre: 'Administrador', username: 'admin', pin_hash: hashed, rol: 'admin' });
      console.log('✅ Admin user created: username "admin", PIN "1234"');
    }
  } catch (e) {
    console.error('Error seeding admin user:', e);
  }
})();

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

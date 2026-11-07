import { createContext, useContext, useState } from 'react';

const CarritoContext = createContext();

export const useCarrito = () => useContext(CarritoContext);

export const CarritoProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  const agregarProducto = (producto, parte = '') => {
    const precioBase = Number(producto.precio_venta) || 0;
    const desc = Number(producto.descuento) || 0;
    const precioEfectivo = Math.max(0, precioBase - desc);

    setCarrito(prev => {
      // Buscamos por ID y también por la presa/nota elegida
      const existente = prev.find(p => p.id === producto.id && p.parte === parte);
      if (existente) {
        return prev.map(p =>
          (p.id === producto.id && p.parte === parte) 
            ? { ...p, cantidad: p.cantidad + 1 } 
            : p
        );
      }
      return [
        ...prev, 
        { 
          ...producto, 
          precio_venta: precioBase,
          descuento: desc,
          precio_efectivo: precioEfectivo,
          cantidad: 1, 
          parte 
        }
      ];
    });
  };

  const quitarProducto = (id, parte = '') => {
    setCarrito(prev => prev.filter(p => !(p.id === id && p.parte === parte)));
  };

  const actualizarCantidad = (id, parte, cantidad) => {
    if (cantidad <= 0) {
      quitarProducto(id, parte);
      return;
    }
    setCarrito(prev =>
      prev.map(p => (p.id === id && p.parte === parte ? { ...p, cantidad } : p))
    );
  };

  const actualizarNota = (id, parteOriginal, nuevaNota) => {
    setCarrito(prev =>
      prev.map(p => (p.id === id && p.parte === parteOriginal ? { ...p, parte: nuevaNota } : p))
    );
  };

  const limpiarCarrito = () => setCarrito([]);

  // Cálculos de totales y descuentos
  const subtotal = carrito.reduce((sum, p) => sum + (p.cantidad * (Number(p.precio_venta) || 0)), 0);
  const totalDescuento = carrito.reduce((sum, p) => sum + (p.cantidad * (Number(p.descuento) || 0)), 0);
  const total = Math.max(0, subtotal - totalDescuento);

  return (
    <CarritoContext.Provider value={{
      carrito,
      agregarProducto,
      quitarProducto,
      actualizarCantidad,
      actualizarNota,
      limpiarCarrito,
      subtotal,
      totalDescuento,
      total
    }}>
      {children}
    </CarritoContext.Provider>
  );
};
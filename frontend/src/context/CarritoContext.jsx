import { createContext, useContext, useState } from 'react';

const CarritoContext = createContext();

export const useCarrito = () => useContext(CarritoContext);

export const CarritoProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  const agregarProducto = (producto, parte = '') => {
    setCarrito(prev => {
      // Ahora buscamos por ID y también por la parte elegida
      const existente = prev.find(p => p.id === producto.id && p.parte === parte);
      if (existente) {
        return prev.map(p =>
          (p.id === producto.id && p.parte === parte) ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }
      return [...prev, { ...producto, cantidad: 1, parte }];
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

  const total = carrito.reduce((sum, p) => sum + p.cantidad * p.precio_venta, 0);

  return (
    <CarritoContext.Provider value={{
      carrito,
      agregarProducto,
      quitarProducto,
      actualizarCantidad,
      actualizarNota,
      limpiarCarrito,
      total
    }}>
      {children}
    </CarritoContext.Provider>
  );
};
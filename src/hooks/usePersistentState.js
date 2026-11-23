import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'logisticaspa:filtros:';

const readStored = (key, initial) => {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    return raw === null ? initial : JSON.parse(raw);
  } catch {
    // almacenamiento bloqueado o valor dañado: se usa el valor inicial
    return initial;
  }
};

/**
 * Como useState, pero recuerda el valor mientras dure la pestaña (sessionStorage): al volver a una pantalla
 * los filtros y la búsqueda siguen donde el usuario los dejó. Nunca falla si el almacenamiento no está disponible.
 * Solo se guardan valores simples (texto, números, booleanos); los datos de negocio no pasan por aquí.
 */
export default function usePersistentState(key, initial) {
  const initialRef = useRef(initial);
  const [value, setValue] = useState(() => readStored(key, initial));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // sin almacenamiento: el estado sigue funcionando, solo no se recuerda
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initialRef.current), []);

  return [value, setValue, reset];
}

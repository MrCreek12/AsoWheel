import React from 'react';

const faqs = [
  {
    q: '¿Es justo este sorteo?',
    a: `Sí. El resultado del sorteo se define usando un sistema de aleatoriedad seguro, transparente y verificable.`
  },
  {
    q: '¿Cómo se elige al ganador?',
    a: `Antes de que la ruleta empiece a girar, el sistema selecciona un índice ganador al azar usando la función: crypto.getRandomValues().\n\nEste método:\n\n- Es parte del estándar web (Se usa en Wheel of Names)\n- Es usado en aplicaciones de seguridad y criptografía\n- No depende de animaciones, tiempo ni interacción humana\n\nCada participante tiene exactamente la misma probabilidad de salir ganador.`
  },
  {
    q: '¿Qué es crypto.getRandomValues()?',
    a: `crypto.getRandomValues() genera números aleatorios usando un generador pseudoaleatorio criptográficamente seguro, inicializado con entropía del sistema operativo.\n\nEsto significa que:\n\n- No puede ser predecido\n- No puede ser manipulado\n- No depende del navegador ni del usuario\n\nCuando esta función no está disponible (navegadores muy antiguos), el sistema usa Math.random() como respaldo.`
  },
  {
    q: '¿Se puede revisar el código?',
    a: `Sí.\nEl código fuente del sistema está disponible públicamente en GitHub para quien desee revisarlo:\n\n Repositorio:\nhttps://github.com/MrCreek12/AsoWheel\n\n(El sistema no tiene lógica oculta ni dependencias externas para decidir ganadores)`
  }
];

export default function InfoModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-[94%] max-w-3xl p-6 shadow-2xl" style={{ maxHeight: '86vh', overflow: 'auto', animation: 'modalPop 420ms cubic-bezier(.2,.8,.2,1)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Información sobre el sorteo</h2>
          <button aria-label="Cerrar" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-3">
          {faqs.map((item, i) => (
            <details key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3 hover:bg-neutral-100" >
              <summary className="cursor-pointer list-none text-gray-800 font-medium">{item.q}</summary>
              <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{item.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-5 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-full">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

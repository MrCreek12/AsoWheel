import React, { useState, useEffect, useRef } from 'react';
import CanvasWheelSpin from './CanvasWheelSpin'



// --- Componentes de Estilo y Layout -------------------------------------------
// Estos componentes se encargan únicamente de la apariencia visual general.

/**
 * Componente para el fondo animado con gradiente.
 * No contiene lógica, solo estilos.
 */
const FestiveBackground = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: 'linear-gradient(45deg, #ff8a80, #ff80ab, #8c9eff, #80d8ff, #a7ffeb, #ffff8d)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
    }}
  />
);

/**
 * Componente que inyecta los keyframes para la animación del fondo.
 * Mantiene los estilos globales separados.
 */
const GlobalStyles = () => (
  <style jsx global>{`
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    /* Animación para la aparición del modal */
    @keyframes modalPop {
      0% { transform: scale(0.85); opacity: 0; }
      60% { transform: scale(1.03); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    `}</style>
);


/**
 * Componente de encabezado simple.
 */
const Header = () => (
  <header className="absolute top-0 left-0 p-8">
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
      </div>
      <span className="text-2xl font-bold text-blue-600">asohp</span>
      <span className="text-sm text-gray-500">Sorteos</span>
    </div>
  </header>
);


// --- Componente Principal de la Aplicación -----------------------------------

export default function App() {
  // --- Estados Principales ---
  // Estado para el texto del área de participantes. Es la "fuente de la verdad".
  const [participantsText, setParticipantsText] = useState('');
  // Estado para la lista de participantes procesada, con nombres y colores.
  const [participants, setParticipants] = useState([]);
  // Estado para almacenar el nombre del ganador actual.
  const [winner, setWinner] = useState(null);
  // Estado para controlar la visibilidad del modal del ganador.
  const [showModal, setShowModal] = useState(false);
  // Estado para la lista de ganadores.
  const [winners, setWinners] = useState([]);

  const [winningIndex, setWinningIndex] = useState(null);

  // Responsive wheel sizing: reference to the container and current wheel size in px
  const wheelContainerRef = useRef(null)
  const [wheelSize, setWheelSize] = useState(480)


  // Paleta de colores para asignar a los segmentos de la ruleta.
  const colors = ['#E53E3E', '#F6E05E', '#48BB78', '#4299E1', '#9F7AEA', '#ED8936', '#F56565', '#4FD1C5', '#FC8181', '#63B3ED'];


  const handleSpin = () => {
    if (!participants || participants.length === 0) return;
    // usar crypto si está disponible
    let index;
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      index = a[0] % participants.length;
    } else {
      index = Math.floor(Math.random() * participants.length);
    }
    // No fijar el ganador hasta que la rueda termine; la librería notificará en onSpinEnd.
    console.log('App: handleSpin chosen index', index)
    setWinner(null);
    setWinningIndex(index);
  }


  // --- Efectos Secundarios (Hooks useEffect) ---

  /**
   * Efecto para sincronizar el estado `participants` con el `participantsText`.
   * Se ejecuta cada vez que el texto del área de participantes cambia.
   * Procesa el texto para crear un array de objetos de participante.
   */
  useEffect(() => {
    // 1. Divide el texto en líneas.
    const lines = participantsText
      .split('\n')
      .map(line => line.trim()) // 2. Elimina espacios en blanco.
      .filter(line => line.length > 0); // 3. Filtra líneas vacías.

    // 4. Mapea las líneas a objetos con nombre y color.
    const newParticipants = lines.map((name, index) => ({
      name,
      color: colors[index % colors.length] // Asigna un color de forma cíclica.
    }));

    // 5. Actualiza el estado de los participantes.
    setParticipants(newParticipants);
  }, [participantsText]); // Dependencia: se ejecuta solo si participantsText cambia.

  // ResizeObserver para ajustar el tamaño de la ruleta según el ancho del contenedor
  useEffect(() => {
    if (!wheelContainerRef.current) {
      // establecer tamaño inicial prudente
      setWheelSize(Math.min(800, Math.max(240, Math.floor(window.innerWidth * 0.5))))
      return
    }

    const el = wheelContainerRef.current
    const minSize = 200
    const maxSize = 900

    const resize = () => {
      try {
        const w = el.clientWidth || el.offsetWidth || Math.floor(window.innerWidth * 0.5)
        // dejar un pequeño margen y limitar
        const target = Math.max(minSize, Math.min(maxSize, Math.floor(w * 0.95)))
        setWheelSize(target)
      } catch (e) { /* ignore */ }
    }

    resize()

    let ro
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize)
      ro.observe(el)
    } else {
      window.addEventListener('resize', resize)
    }

    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', resize)
    }
  }, [wheelContainerRef])

  // Cuando cambia el ganador, abrir el modal inmediatamente.
  useEffect(() => {
    if (winner) {
      setShowModal(true);
    }
  }, [winner]);


  // --- Funciones de Lógica ---

  /**
   * Elimina un participante de la lista activa y del área de texto.
   * @param {string} winnerName - El nombre del ganador a eliminar.
   */
  const removeWinnerFromParticipants = (winnerName) => {
    // Actualiza la lista de participantes en el estado.
    setParticipants(prev =>
      prev.filter(p => p.name !== winnerName)
    );

    // Actualiza el área de texto para reflejar la eliminación.
    setParticipantsText(prev =>
      prev
        .split('\n')
        .filter(name => name.trim() !== winnerName)
        .join('\n')
    );
  };

  /**
   * Maneja la acción cuando el ganador es marcado como "Presente".
   */
  const handlePresent = () => {
    // Validar winner y evitar duplicados.
    if (!winner) return;
    setWinners(prev => (prev.includes(winner) ? prev : [...prev, winner])); // Añade solo si no existe.
    removeWinnerFromParticipants(winner);  // Lo elimina de la lista de participantes.
    setShowModal(false);                   // Oculta el modal.
    setWinner(null);                       // Limpia el estado del ganador.
  };




  // --- Renderizado del Componente ---

  return (
    <div className="flex h-screen relative" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <GlobalStyles />
      <FestiveBackground />
      <Header />

      {/* Contenedor principal para la ruleta */}
      <div className="w-2/3 flex flex-col items-center justify-center relative z-10">
        {participants.length > 0 ? (
          <>
            {/* Contenedor responsivo para la ruleta (medido por ResizeObserver) */}
            <div ref={wheelContainerRef} className="w-full flex justify-center items-center relative">
              <CanvasWheelSpin
                items={participants.map(p => p.name)}
                winningIndex={winningIndex}
                config={{ size: wheelSize, pointerSize: Math.max(18, Math.round(wheelSize * 0.045)), rotations: 20 }}
                onSpinEnd={(index) => {
                  // Cuando la librería indica que la rueda descansó, fijar ganador y mostrar modal.
                  const name = participants?.[index]?.name;
                  if (name) setWinner(name);
                  setShowModal(true);
                  // Resetear para permitir futuros giros
                  setWinningIndex(null);
                }}
              />

              {/* Botones discretos para cambiar tamaño */}
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 30 }}>
                <button
                  aria-label="Aumentar ruleta"
                  title="Aumentar"
                  onClick={() => setWheelSize(s => Math.min(900, Math.round(s * 1.15)))}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow-sm hover:scale-105 transition-transform"
                >
                  +
                </button>
                <button
                  aria-label="Disminuir ruleta"
                  title="Disminuir"
                  onClick={() => setWheelSize(s => Math.max(200, Math.round(s / 1.15)))}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow-sm hover:scale-95 transition-transform"
                >
                  −
                </button>
              </div>
            </div>

            <button
              onClick={handleSpin}
              className="mt-6 px-6 py-3 bg-white/80 backdrop-blur-sm border border-orange-500/50 rounded-full text-orange-600 font-bold text-lg hover:bg-white transition-colors shadow-lg"
            >
              Girar Ruleta
            </button>

            {/* winner label removed per design - no inline winner tag below the wheel */}
          </>
        ) : (
          <div className="text-white text-center">
            <p className="text-2xl mb-2">No hay participantes</p>
            <p className="text-sm">Agrega participantes en el panel derecho</p>
          </div>
        )}
      </div>

      {/* Panel lateral de controles */}
      <div className="w-1/3 bg-gray-50/80 backdrop-blur-sm p-8 border-l border-gray-200/50 z-10">
        <Controls
          participants={participants}
          participantsText={participantsText}
          setParticipantsText={setParticipantsText}
          participantCount={participants.length}
          winners={winners}
        />
      </div>

      {/* Modal del ganador (renderizado condicional) */}
      <WinnerModal
        show={showModal}
        winner={winner}
        onPresent={handlePresent}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}


// --- Componente del Modal del Ganador ----------------------------------------
/**
 * Modal que aparece cuando se selecciona un ganador.
 * Contiene una cuenta regresiva y opciones para marcar como presente.
 * @param {{show: boolean, winner: string, onPresent: Function, onClose: Function}} props
 */
const WinnerModal = ({ show, winner, onPresent, onClose }) => {
  const [countdown, setCountdown] = useState(15);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!show || !winner) return;

    setCountdown(15);
    setTimedOut(false);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, winner]);

  // If modal should not show, render nothing
  if (!show) return null;

  // Button state and label
  const btnDisabled = timedOut;
  const btnLabel = timedOut ? 'Sin Reclamo' : 'Confirmar Presencia';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-2xl px-20 py-40 w-[92%] max-w-[1000px] shadow-2xl flex gap-2 relative"
        style={{ animation: 'modalPop 600ms cubic-bezier(.2,.8,.2,1)' }}
      >
        {/* Left column: congratulations and name */}
        <div className="flex-1 pl-4 pr-2.5 py-6">
          <div className="text-sm text-gray-600 mb-4"> ¡Muchas Felicidades!</div>
          <div className="text-7xl font-extrabold leading-tight mb-8">{winner}</div>

          <div className="mt-6">
            <button
              onClick={() => { if (!btnDisabled) onPresent(); }}
              disabled={btnDisabled}
              className={`px-6 py-3 rounded-full text-white font-semibold shadow-md transition ${btnDisabled ? 'bg-gray-300 text-gray-600 cursor-default' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {btnLabel}
            </button>
          </div>
        </div>

        {/* Right column: time info */}
        <div className="w-1/3 flex flex-col items-center justify-center px-8 py-6">
          <div className="text-sm text-gray-600 mb-2">Tiempo:</div>
          {!timedOut ? (
            <div className="text-6xl font-extrabold text-black">{countdown}</div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-extrabold text-red-600 mb-2">¡Se Acabó el tiempo!</div>
              <div className="text-sm text-red-400">¡Atento al tiempo la próxima vez!</div>
            </div>
          )}
        </div>

        {/* Bottom-right link to continue (only visible after timeout) */}
        <div style={{ position: 'absolute', right: 32, bottom: 28 }}>
          {timedOut && (
            <button onClick={onClose} className="text-sm text-gray-800 flex items-center gap-2 hover:underline">
              Continuar con el sorteo <span style={{ transform: 'translateY(2px)' }}>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Componente de la Ruleta (Canvas) ----------------------------------------





// --- Componente del Panel de Controles ---------------------------------------

/**
 * Panel lateral para gestionar participantes y ver ganadores.
 * @param {{participantsText: string, setParticipantsText: Function, participantCount: number, winners: Array<string>}} props
 */
const Controls = ({
  participants,
  participantsText,
  setParticipantsText,
  participantCount,
  winners
}) => {
  // Estado para la pestaña activa (participantes, ganadores).
  const [activeTab, setActiveTab] = useState('participantes');
  // Estado para el término de búsqueda.
  const [searchTerm, setSearchTerm] = useState('');

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los participantes?')) {
      setParticipantsText('');
    }
  };

  const handleAddExample = () => {
    setParticipantsText('Pablo\nNathan\nSofia\nJenna\nSam\nAlex\nMaria\nCarlos');
  };

  // Filtra las listas según el término de búsqueda.
  const filteredWinners = winners.filter(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredParticipants = (participants || []).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-light text-blue-600 mb-8">AsoWheel</h1>

      {/* Navegación por pestañas */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('participantes')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'participantes' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          Participantes <span className="bg-blue-500 text-white rounded-full px-2.5 py-0.5 ml-2 text-xs">{participantCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('ganadores')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'ganadores' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          Ganadores <span className="bg-green-500 text-white rounded-full px-2.5 py-0.5 ml-2 text-xs">{winners.length}</span>
        </button>
      </div>

      <div className="relative mb-6">
        {/* Barra de búsqueda */}
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-full py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
        />
        <svg className="w-5 h-5 text-gray-400 absolute top-1/2 left-4 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      {/* Contenido de las pestañas */}
      <div className="bg-white rounded-2xl p-4 flex-1 border border-gray-200 mb-6 overflow-y-auto flex flex-col">
        {activeTab === 'participantes' && (
          <>
            <label className="text-sm text-gray-600 mb-2 font-medium">Lista (uno por línea):</label>
            <textarea
              value={participantsText}
              onChange={(e) => setParticipantsText(e.target.value)}
              placeholder="Escribe un nombre por línea...&#10;Ejemplo:&#10;Juan&#10;María&#10;Pedro"
              className="flex-1 w-full resize-none focus:outline-none text-sm font-mono p-2 border border-gray-200 rounded-lg"
            />
            <div className="mt-2 text-xs text-gray-500">
              {participantCount} participante{participantCount !== 1 ? 's' : ''}
            </div>
            {/* Mostrar resultados filtrados cuando hay término de búsqueda */}
            {searchTerm.trim() !== '' && (
              <div className="mt-3 p-2 bg-gray-50 rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-gray-500 mb-2">Participantes que coinciden:</div>
                {filteredParticipants.length > 0 ? (
                  <ul className="space-y-1 max-h-48 overflow-auto">
                    {filteredParticipants.map((p, i) => (
                      <li key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-md flex items-center justify-between">
                        <span className="text-gray-700">{p.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">No se encontraron participantes.</div>
                )}
              </div>
            )}
          </>
        )}
        {activeTab === 'ganadores' && (
          <ul className="text-sm space-y-2 p-2">
            {filteredWinners.length > 0 ? filteredWinners.map((r, i) => (
              <li key={i} className="text-green-600 font-medium">✔ {r}</li>
            )) : <p className="text-gray-500">No hay ganadores.</p>}
          </ul>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-3">
        <button onClick={handleAddExample} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Ejemplo
        </button>
        <button onClick={handleClear} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          Limpiar
        </button>
      </div>
    </div>
  );
};
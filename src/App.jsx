import React, { useState, useEffect, useRef } from 'react';
import CanvasWheelSpin from './CanvasWheelSpin'

/*
 Module: App.jsx
 Purpose: Interfaz principal para el sorteo. Mantiene el estado de los
 participantes, controla el tamaño responsivo de la ruleta y gestiona
 la interacción (giro, modal de ganador, lista de ganadores).
 Nota: Sólo se añaden comentarios y organización; la lógica se mantiene
 exactamente igual para no afectar el comportamiento o la apariencia.
*/

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
      background: 'linear-gradient(45deg, #FFBB80, #FF952B, #8CF5FF, #1C7EFF, #FFAC75, #FF852B)',
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
      <img src="https://asohp.cr/public/images/asohp-logo-nav.png" alt="AsoHp" />
    </div>
  </header>
);


// --- Componente Principal de la Aplicación -----------------------------------

/**
 * Componente principal de la aplicación.
 * - Mantiene el estado central (participantsText, participants, winners).
 * - Controla el tamaño responsivo de la ruleta y dispara giros.
 */
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

  // Bandera que indica si la ruleta está girando. Usada para deshabilitar controles/zoom.
  const [isSpinning, setIsSpinning] = useState(false);

  // Notification state for subtle toasts (used when confirming presence)
  const [notification, setNotification] = useState(null);
  // Stage for toast animation: 'idle' | 'pre-enter' | 'entering' | 'visible' | 'exiting'
  const [notificationStage, setNotificationStage] = useState('idle');
  // Mini configuration (JSON) for animation directions/durations/easings
  const [toastConfig, setToastConfig] = useState({
    // directions can be 'left' or 'right' (entry: from this side -> center, exit: to this side)
    entryDirection: 'left',
    exitDirection: 'left',
    entryDuration: 260, // ms
    exitDuration: 260, // ms
    entryEasing: 'ease-in',
    exitEasing: 'ease-out',
    visibleDuration: 3000 // how long toast stays before exit starts
  });

  // Ajustes configurables de la aplicación
  const [settings, setSettings] = useState({
    claimTime: 15, // segundos para reclamar (por defecto 15)
    enableClear: true,
    enableExample: true,
    enableSearch: true
  });
  // Responsive wheel sizing: reference to the container and current wheel size in px
  const wheelContainerRef = useRef(null)
  const [wheelSize, setWheelSize] = useState(480)
  // autoSize = true => ResizeObserver controls wheelSize
  // autoSize = false => user adjusted manually (buttons/slider)
  const [autoSize, setAutoSize] = useState(true)
  // Mostrar/ocultar controles de tamaño (colapsable)
  const [showSizeControls, setShowSizeControls] = useState(false)


  // Paleta de colores para asignar a los segmentos de la ruleta.
  const colors = ['#E53E3E', '#F6E05E', '#48BB78', '#4299E1', '#9F7AEA', '#ED8936', '#F56565', '#4FD1C5', '#FC8181', '#63B3ED'];


  const handleSpin = () => {
    if (!participants || participants.length === 0) return;
    // Marcar que se inició la animación (evita clicks repetidos antes del inicio en el child)
    setIsSpinning(true);
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
    // Si el usuario está en modo manual, NO dejamos que el ResizeObserver cambie el tamaño
    if (!autoSize) return

    if (!wheelContainerRef.current) {
      // establecer tamaño inicial prudente basado en ancho de ventana
      setWheelSize(Math.min(800, Math.max(220, Math.floor(window.innerWidth * 0.5))))
      return
    }

    const el = wheelContainerRef.current
    const minSize = 180
    const maxSize = 800

    const resize = () => {
      try {
        // preferir el ancho del contenedor, caer a innerWidth
        const w = el.clientWidth || el.offsetWidth || Math.floor(window.innerWidth * 0.5)
        // En pantallas pequeñas queremos que la rueda sea ligeramente más pequeña
        const smallScreenFactor = window.innerWidth <= 1280 ? 0.85 : 0.95
        const target = Math.max(minSize, Math.min(maxSize, Math.floor(w * smallScreenFactor)))
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
  }, [wheelContainerRef, autoSize])

  // Cuando cambia el ganador, abrir el modal inmediatamente.
  useEffect(() => {
    if (winner) {
      setShowModal(true);
    }
  }, [winner]);

  // Notification lifecycle: handle enter, visible and exit stages using toastConfig
  useEffect(() => {
    if (!notification) {
      setNotificationStage('idle');
      return;
    }

    let enterTimer = null;
    let visibleTimer = null;
    let exitTimer = null;

    // start pre-enter then go to entering to trigger transition
    setNotificationStage('pre-enter');
    // small delay to allow initial style to apply
    enterTimer = setTimeout(() => setNotificationStage('entering'), 16);

    // once entering, wait visibleDuration then start exiting
    visibleTimer = setTimeout(() => {
      setNotificationStage('exiting');
      // after exitDuration clear the notification
      exitTimer = setTimeout(() => setNotification(null), toastConfig.exitDuration || 260);
    }, (toastConfig.visibleDuration || 3000) + (toastConfig.entryDuration || 260));

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(visibleTimer);
      clearTimeout(exitTimer);
    };
  }, [notification, toastConfig]);


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
    // Mostrar notificación sutil indicando el añadido exitoso
    setNotification(`¡${winner} ya es ganador!`);
    removeWinnerFromParticipants(winner);  // Lo elimina de la lista de participantes.
    setShowModal(false);                   // Oculta el modal.
    setWinner(null);                       // Limpia el estado del ganador.
  };




  // --- Renderizado del Componente ---

  return (
    <div className="flex flex-col md:flex-row h-screen relative" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <GlobalStyles />
      <FestiveBackground />
      <Header />

      {/* Notification toast (subtle) */}
      {notification && (() => {
        // compute transform based on notificationStage and config
        const entryFrom = (toastConfig.entryDirection === 'left') ? '-120%' : '120%';
        const exitTo = (toastConfig.exitDirection === 'left') ? '-120%' : '120%';

        let transform = 'translateX(0)';
        let opacity = 2;
        let transition = '';

        if (notificationStage === 'pre-enter') {
          transform = `translateX(${entryFrom})`;
          opacity = 0;
          transition = 'none';
        } else if (notificationStage === 'entering') {
          transform = 'translateX(0)';
          opacity = 1;
          transition = `transform ${toastConfig.entryDuration}ms ${toastConfig.entryEasing}, opacity ${toastConfig.entryDuration}ms ${toastConfig.entryEasing}`;
        } else if (notificationStage === 'exiting') {
          transform = `translateX(${exitTo})`;
          opacity = 0;
          transition = `transform ${toastConfig.exitDuration}ms ${toastConfig.exitEasing}, opacity ${toastConfig.exitDuration}ms ${toastConfig.exitEasing}`;
        } else {
          // visible
          transform = 'translateX(0)';
          opacity = 1;
          transition = `transform ${toastConfig.entryDuration}ms ${toastConfig.entryEasing}, opacity ${toastConfig.entryDuration}ms ${toastConfig.entryEasing}`;
        }

        return (
          <div
            role="status"
            aria-live="polite"
            className="
    fixed bottom-10 left-10 z-[60]
    bg-green-100 text-green-800
    opacity-70
    backdrop-blur-lg
    px-3.5 py-2.5
    rounded-sm
    shadow-[0_6px_18px_rgba(6,95,70,0.08)]
    font-medium
    transition-all
    text-md
  "
            style={{
              transform,
              opacity,
              transition,
            }}
          >
            {notification}
          </div>

        );
      })()}

      {/* Contenedor principal para la ruleta */}
      <div className="w-full md:w-2/3 flex flex-col items-center justify-center relative z-10 px-4 md:px-0">
        {participants.length > 0 ? (
          <>
            {/* Contenedor responsivo para la ruleta (medido por ResizeObserver) */}
            <div ref={wheelContainerRef} className="w-full flex justify-center items-center relative lg:mt-10 sm:mt-0">
              <CanvasWheelSpin
                items={participants.map(p => p.name)}
                winningIndex={winningIndex}
                config={{ size: wheelSize, pointerSize: Math.max(18, Math.round(wheelSize * 0.040)), rotations: 20 }}
                onSpinStart={() => setIsSpinning(true)}
                onSpinEnd={(index) => {
                  // La animación terminó: reactivar controles
                  setIsSpinning(false);
                  // Cuando la librería indica que la rueda descansó, fijar ganador y mostrar modal.
                  const name = participants?.[index]?.name;
                  if (name) setWinner(name);
                  setShowModal(true);
                  // Resetear para permitir futuros giros
                  setWinningIndex(null);
                }}
              />
            </div>

            {/* Controles de tamaño: botón que muestra/oculta los controles en un pequeño popover */}
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
              <button
                aria-label={showSizeControls ? 'Ocultar controles' : 'Mostrar controles'}
                title={showSizeControls ? 'Cerrar' : 'Ajustes de tamaño'}
                onClick={() => { if (!isSpinning) setShowSizeControls(v => !v) }}
                role="button"
                aria-disabled={isSpinning}
                className="bg-white/90 backdrop-blur-sm border flex justify-center border-gray-200 p-2 rounded-full mx-5 my-5 backdrop-blur-3xl text-neutral-400 shadow-sm hover:scale-105 transition-transform "
              >
                <span className='material-symbols-outlined mx-0.5'>{showSizeControls ? 'close' : 'linear_scale'}</span>
                <p className='text-sm font-regular m-0.5'>{showSizeControls ? 'cerrar' : 'Tamaño '}</p> 
              </button>

              {showSizeControls && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Aumentar ruleta"
                      title="Aumentar"
                      onClick={() => { if (!isSpinning) { setAutoSize(false); setWheelSize(s => Math.min(800, Math.round(s * 1.15))); } }}
                      disabled={isSpinning}
                      className={`bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow-sm ${isSpinning ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
                    >
                      +
                    </button>
                    <button
                      onClick={() => { if (!isSpinning) { setAutoSize(false); setWheelSize(s => Math.max(140, Math.round(s / 1.15))); } }}
                      disabled={isSpinning}
                      className={`bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow-sm ${isSpinning ? 'opacity-60 cursor-not-allowed' : 'hover:scale-95 transition-transform'}`}
                    >
                      −
                    </button>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <label className="text-xs text-gray-600">Tamaño: <strong>{wheelSize}px</strong></label>
                      <button
                        title="Modo automático"
                        onChange={(e) => { if (!isSpinning) { setAutoSize(false); setWheelSize(Number(e.target.value)); } }}
                        disabled={isSpinning}
                        className={`px-2 py-1 text-xs rounded ${autoSize ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                      >Auto</button>
                    </div>
                    {/* Slider eliminado a petición del usuario: control de tamaño ahora solo mediante botones y modo Auto */}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSpin}
              className="mt-6 mb-10 px-6 py-3 bg-white/80 backdrop-blur-sm border border-orange-500/50 rounded-full text-orange-600 font-bold text-lg hover:bg-white transition-colors shadow-lg"
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
      <div className="w-full md:w-1/3 bg-gray-50/80 backdrop-blur-sm p-6 md:p-8 border-l border-gray-200/50 z-10">
        <Controls
          participants={participants}
          participantsText={participantsText}
          setParticipantsText={setParticipantsText}
          participantCount={participants.length}
          winners={winners}
          setWinners={setWinners}
          settings={settings}
          setSettings={setSettings}
          isSpinning={isSpinning}
        />
      </div>

      {/* Modal del ganador (renderizado condicional) */}
      <WinnerModal
        show={showModal}
        winner={winner}
        onPresent={handlePresent}
        onClose={() => setShowModal(false)}
        claimTime={settings.claimTime}
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
const WinnerModal = ({ show, winner, onPresent, onClose, claimTime = 15 }) => {
  const [countdown, setCountdown] = useState(claimTime);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!show || !winner) return;

    setCountdown(claimTime);
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
  }, [show, winner, claimTime]);

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

          <div className="text-xl text-gray-600 mb-4">
            {/* <img className="scale-60 h-100 m-0 p-3" src="https://img.freepik.com/free-vector/trophy_78370-345.jpg" alt="" /> */}
            <p>¡Felicidades!</p>
          </div>
          <div className="text-6xl font-extrabold leading-tight mb-8">{winner}</div>

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
        <div className="w-1/3 flex flex-col items-center justify-center px-2.5 py-6">
          <div className="text-sm text-gray-600 mb-2">Tiempo:</div>
          {!timedOut ? (
            <div className="text-9xl  font-extrabold text-black">{countdown}</div>
          ) : (
            <div className="text-center">
              <div className="text-5xl font-extrabold text-red-600 mb-2">¡Se Acabó el tiempo!</div>
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
  winners,
  setWinners,
  settings,
  setSettings,
  isSpinning
}) => {
  // Estado para la pestaña activa (participantes, ganadores).
  const [activeTab, setActiveTab] = useState('participantes');
  // Estado para el término de búsqueda.
  const [searchTerm, setSearchTerm] = useState('');

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los participantes?')) {
      setParticipantsText('');
      // Also clear winners when user clears the participants list
      if (typeof setWinners === 'function') setWinners([]);
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
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-light text-blue-600">AsoWheel</h1>
        <span
          onClick={() => setActiveTab('settings')}
          title="Ajustes"
          aria-label="Abrir ajustes"
          className={`p-2 rounded-lg transition ${activeTab === 'settings' ? 'bg-blue-200 text-blue-800 material-symbols-outlined' : 'text-gray-400 hover:bg-gray-200 material-symbols-outlined'}`}
        >
          settings
        </span>
      </div>

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
        {/* Barra de búsqueda (puede desactivarse desde ajustes) */}
        {settings?.enableSearch !== false && (
          <>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSpinning}
              className="w-full bg-white border border-gray-300 rounded-full py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute top-1/2 left-4 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </>
        )}
      </div>

      {/* Contenido de las pestañas */}
      <div className="bg-white rounded-2xl p-4 flex-1 border border-gray-200 mb-6 overflow-y-auto flex flex-col">
        {activeTab === 'participantes' && (
          <>
            <label className="text-sm text-gray-600 mb-2 font-medium">Lista (uno por línea):</label>
            <textarea
              value={participantsText}
              onChange={(e) => { if (!isSpinning) setParticipantsText(e.target.value) }}
              disabled={isSpinning}
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
        {activeTab === 'settings' && (
          <div className="text-sm p-2 space-y-3">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Ajustes</h3>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Tiempo de reclamo (segundos)</label>
              <input
                type="number"
                min={1}
                value={settings?.claimTime ?? 15}
                onChange={(e) => setSettings(prev => ({ ...prev, claimTime: Math.max(1, Number(e.target.value)) }))}
                className="w-20 px-2 py-1 border rounded text-sm"
              />
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings?.enableClear !== false}
                onChange={(e) => setSettings(prev => ({ ...prev, enableClear: e.target.checked }))}
              />
              <span className="text-gray-600 text-sm">Habilitar botón "Limpiar"</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings?.enableExample !== false}
                onChange={(e) => setSettings(prev => ({ ...prev, enableExample: e.target.checked }))}
              />
              <span className="text-gray-600 text-sm">Habilitar botón "Ejemplo"</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings?.enableSearch !== false}
                onChange={(e) => setSettings(prev => ({ ...prev, enableSearch: e.target.checked }))}
              />
              <span className="text-gray-600 text-sm">Habilitar barra de "Buscar"</span>
            </label>

            <div className="pt-2">
              <label className="text-xs text-gray-500">Rotaciones por defecto</label>
              <select disabled={isSpinning} className="mt-1 w-full border border-gray-200 rounded px-3 py-2 text-sm">
                <option>8</option>
                <option selected>20</option>
                <option>30</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-3">
        {settings?.enableExample !== false && (
          <button onClick={() => { if (!isSpinning) handleAddExample() }} disabled={isSpinning} className={`flex items-center justify-center gap-2 bg-white border border-gray-200 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium ${isSpinning ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-50 transition-colors'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            Ejemplo
          </button>
        )}
        {settings?.enableClear !== false && (
          <button onClick={() => { if (!isSpinning) handleClear() }} disabled={isSpinning} className={`flex items-center justify-center gap-2 bg-white border border-gray-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium ${isSpinning ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50 transition-colors'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
};
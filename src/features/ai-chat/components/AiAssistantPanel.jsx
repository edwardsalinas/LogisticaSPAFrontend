import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import AiRouteCard from './AiRouteCard';
import AiSuggestionButtons from './AiSuggestionButtons';

const MOCK_CONVERSATIONS = [
  { id: 'conv-001', title: 'Ruta RT-001', timestamp: 'Hace 2 min' },
  { id: 'conv-002', title: 'Paquete SPA-7749', timestamp: 'Hace 15 min' },
  { id: 'conv-003', title: 'Retraso en entrega', timestamp: 'Hace 1 h' },
  { id: 'conv-004', title: 'Vehiculos disponibles', timestamp: 'Ayer' },
];

const MOCK_MESSAGES = {
  'conv-001': [
    { role: 'user', content: 'Cual es el estado de la ruta RT-001?' },
    {
      role: 'assistant',
      content:
        'La ruta RT-001 de La Paz a Oruro esta en progreso. El vehiculo Volvo FH16 mantiene 65% de avance y su llegada estimada es a las 14:30.',
      route: {
        name: 'RT-001',
        status: 'active',
        destination: 'La Paz -> Oruro',
        vehicle: 'Volvo FH16',
        eta: '14:30',
      },
    },
  ],
};

const COMMON_SUGGESTIONS = [
  { icon: 'PK', label: 'Estado de paquete', value: 'Cual es el estado del paquete SPA-7749202394?' },
  { icon: 'RT', label: 'Rutas activas', value: 'Que rutas estan activas actualmente?' },
  { icon: 'AL', label: 'Retrasos', value: 'Hay algun retraso reportado hoy?' },
  { icon: 'VH', label: 'Ubicacion vehiculo', value: 'Donde esta el vehiculo INT-1234?' },
];

function AiAssistantPanel({ mode = 'panel', onClose = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hola. Soy tu copiloto operativo. Puedo ayudarte con rutas, paquetes, ETA, incidencias y disponibilidad de flota.',
    },
  ]);
  const [conversations] = useState(MOCK_CONVERSATIONS);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  const isPanel = mode === 'panel';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickInsights = useMemo(
    () => [
      { label: 'Rutas activas', value: '24' },
      { label: 'Alertas', value: '3' },
      { label: 'ETA promedio', value: '18m' },
    ],
    []
  );

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const lowerMessage = messageText.toLowerCase();

      let aiResponse = {
        role: 'assistant',
        content:
          'Puedo ayudarte mejor si indicas una ruta, un vehiculo o un paquete concreto.',
        suggestions: COMMON_SUGGESTIONS.slice(0, 2),
      };

      if (lowerMessage.includes('ruta') || lowerMessage.includes('rt-')) {
        aiResponse = {
          role: 'assistant',
          content:
            'La ruta RT-001 sigue operativa. Mantiene 65% de progreso, sin incidencias criticas y con llegada estimada a las 14:30.',
          route: {
            name: 'RT-001',
            status: 'active',
            destination: 'La Paz -> Oruro',
            vehicle: 'Volvo FH16',
            eta: '14:30',
          },
          suggestions: [
            { icon: 'MP', label: 'Abrir mapa', value: 'Abrir el mapa de la RT-001' },
            { icon: 'DR', label: 'Llamar conductor', value: 'Necesito contactar al conductor de la RT-001' },
          ],
        };
      } else if (lowerMessage.includes('paquete') || lowerMessage.includes('spa-')) {
        aiResponse = {
          role: 'assistant',
          content:
            'El paquete SPA-7749202394 esta en transito y fue registrado hace 2 minutos en Checkpoint El Alto. No se detectan demoras por ahora.',
          suggestions: [
            { icon: 'UB', label: 'Ver ubicacion', value: 'Muestrame la ubicacion del paquete SPA-7749202394' },
            { icon: 'HS', label: 'Ver historial', value: 'Dame el historial del paquete SPA-7749202394' },
          ],
        };
      } else if (lowerMessage.includes('retraso') || lowerMessage.includes('demora') || lowerMessage.includes('alerta')) {
        aiResponse = {
          role: 'assistant',
          content:
            'Se detecta 1 ruta con retraso: RT-002. La causa reportada es trafico pesado en la zona de Colomi y el ETA ajustado es 16:00.',
          suggestions: [
            { icon: 'RT', label: 'Ver ruta RT-002', value: 'Quiero ver la RT-002' },
            { icon: 'NT', label: 'Crear alerta', value: 'Crear una alerta para la RT-002' },
          ],
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Hubo un problema al procesar tu consulta. Intenta nuevamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (value) => {
    handleSend(value);
  };

  const handleRouteCardClick = () => {
    window.open('/logistics/routes/route-001/map', '_blank');
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessages([
      {
        role: 'assistant',
        content:
          'Nueva conversacion iniciada. Puedes pedirme estado de rutas, paquetes, unidades o incidencias.',
      },
    ]);
    setShowSuggestions(true);
  };

  const handleLoadConversation = (convId) => {
    setCurrentConversation(convId);
    const convMessages = MOCK_MESSAGES[convId] || [
      { role: 'assistant', content: 'Conversacion cargada. Continua tu consulta.' },
    ];
    setMessages(convMessages);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/88 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl ${
        isPanel ? '' : 'min-h-[calc(100vh-8rem)]'
      }`}
    >
      <div className="border-b border-surface-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-surface-500">Asistente operativo</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-primary-700">Copiloto IA LogisticaSPA</h2>
            <p className="mt-1 text-xs text-surface-500">Chat contextual para operacion, trazabilidad y soporte en ruta.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.68rem] font-semibold text-emerald-700 sm:block">Sistema en linea</div>
            {onClose && (
              <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800">x</button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {quickInsights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-surface-100 bg-surface-50 px-3 py-3">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-surface-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-primary-700">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleNewConversation} className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 transition-colors hover:bg-primary-100">Nueva consulta</button>
          {conversations.slice(0, 3).map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleLoadConversation(conv.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentConversation === conv.id
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 ${msg.role === 'user' ? 'rounded-br-md bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white shadow-[0_18px_40px_-24px_rgba(19,127,236,0.75)]' : 'rounded-bl-md border border-surface-100 bg-surface-50 text-surface-800'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                {msg.route && <AiRouteCard route={msg.route} onViewMap={handleRouteCardClick} />}
                {msg.suggestions && <AiSuggestionButtons suggestions={msg.suggestions} onSelect={handleSuggestionClick} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-[17rem] rounded-[1.35rem] rounded-bl-md border border-surface-100 bg-surface-50 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-surface-500">
                  <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
                  Pensando respuesta
                </div>
                <Skeleton className="mt-4 h-3 w-11/12" />
                <Skeleton className="mt-2 h-3 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {showSuggestions && messages.length === 1 && (
        <div className="border-t border-surface-100 px-4 pb-4 pt-4 sm:px-5">
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Sugerencias rapidas</p>
          <AiSuggestionButtons suggestions={COMMON_SUGGESTIONS} onSelect={handleSuggestionClick} />
        </div>
      )}

      <div className="border-t border-surface-100 bg-white/85 px-4 py-4 sm:px-5">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta por rutas, paquetes, incidencias o disponibilidad..."
            className="min-h-[3.2rem] flex-1 resize-none rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
            disabled={loading}
            rows={1}
          />

          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} className="min-w-[6.5rem] self-end">Enviar</Button>
        </div>

        <p className="mt-2 text-center text-[0.72rem] text-surface-400">Verifica informacion critica antes de tomar decisiones operativas.</p>
      </div>
    </div>
  );
}

export default AiAssistantPanel;

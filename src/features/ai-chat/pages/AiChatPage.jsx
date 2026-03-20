import { useState, useRef, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Spinner from '../../../components/atoms/Spinner';
import AiRouteCard from '../components/AiRouteCard';
import AiSuggestionButtons from '../components/AiSuggestionButtons';
import apiService from '../../../services/apiService';

// Datos mock para conversaciones
const MOCK_CONVERSATIONS = [
  { id: 'conv-001', title: 'Consulta de ruta RT-001', timestamp: 'Hace 2 minutos' },
  { id: 'conv-002', title: 'Estado del paquete SPA-7749', timestamp: 'Hace 15 minutos' },
  { id: 'conv-003', title: 'Retraso en entrega', timestamp: 'Hace 1 hora' },
  { id: 'conv-004', title: 'Vehículos disponibles', timestamp: 'Ayer' },
];

// Datos mock para mensajes de una conversación
const MOCK_MESSAGES = {
  'conv-001': [
    { role: 'user', content: '¿Cuál es el estado de la ruta RT-001?' },
    {
      role: 'assistant',
      content: 'La ruta RT-001 de La Paz a Oruro está actualmente en progreso. El vehículo Volvo FH16 (placa INT-1234) va con un 65% de avance.',
      route: {
        name: 'RT-001',
        status: 'active',
        destination: 'La Paz → Oruro',
        vehicle: 'Volvo FH16',
        eta: '14:30',
      }
    },
  ],
};

// Sugerencias comunes
const COMMON_SUGGESTIONS = [
  { icon: '📦', label: 'Estado de paquete', value: '¿Cuál es el estado del paquete SPA-7749202394?' },
  { icon: '🚛', label: 'Rutas activas', value: '¿Qué rutas están activas actualmente?' },
  { icon: '⚠️', label: 'Retrasos', value: '¿Hay algún retraso reportado?' },
  { icon: '📍', label: 'Ubicación de vehículo', value: '¿Dónde está el vehículo INT-1234?' },
];

function AiChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente logístico IA. Puedo ayudarte a consultar el estado de paquetes y rutas de transporte. ¿En qué te puedo ayudar?',
    },
  ]);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      // Simular respuesta del AI (mock)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Respuesta inteligente según el mensaje
      let aiResponse = {
        role: 'assistant',
        content: 'Gracias por tu consulta. Estoy procesando la información...',
      };

      const lowerMessage = messageText.toLowerCase();

      if (lowerMessage.includes('ruta') || lowerMessage.includes('rt-')) {
        aiResponse = {
          role: 'assistant',
          content: 'La ruta RT-001 de La Paz a Oruro está actualmente en progreso. El vehículo Volvo FH16 (placa INT-1234) va con un 65% de avance y se estima que llegue a su destino a las 14:30.',
          route: {
            name: 'RT-001',
            status: 'active',
            destination: 'La Paz → Oruro',
            vehicle: 'Volvo FH16',
            eta: '14:30',
          },
          suggestions: [
            { icon: '📍', label: 'Ver en mapa' },
            { icon: '📞', label: 'Contactar conductor' },
          ],
        };
      } else if (lowerMessage.includes('paquete') || lowerMessage.includes('spa-')) {
        aiResponse = {
          role: 'assistant',
          content: 'El paquete SPA-7749202394 está actualmente en tránsito desde La Paz hacia Oruro. Última actualización: hace 2 minutos en Checkpoint El Alto.',
          suggestions: [
            { icon: '📍', label: 'Ver ubicación' },
            { icon: '📊', label: 'Ver historial' },
          ],
        };
      } else if (lowerMessage.includes('retraso') || lowerMessage.includes('demora')) {
        aiResponse = {
          role: 'assistant',
          content: 'Actualmente hay 1 ruta con retraso reportado: RT-002 (Santa Cruz → Cochabamba) debido a tráfico pesado en la zona de Colomi. ETA actualizado: 16:00.',
          suggestions: [
            { icon: '📍', label: 'Ver ruta' },
            { icon: '🔔', label: 'Notificar jefe de almacén' },
          ],
        };
      } else {
        aiResponse = {
          role: 'assistant',
          content: 'Gracias por tu consulta. Para brindarte información más precisa, ¿podrías especificar si te refieres a una ruta, paquete o vehículo en particular?',
          suggestions: COMMON_SUGGESTIONS.slice(0, 2),
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.' },
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
        content: '¡Hola! Soy el asistente logístico IA. ¿En qué puedo ayudarte hoy?',
      },
    ]);
    setShowSuggestions(true);
  };

  const handleLoadConversation = (convId) => {
    setCurrentConversation(convId);
    const convMessages = MOCK_MESSAGES[convId] || [];
    setMessages(convMessages.length > 0 ? convMessages : [
      { role: 'assistant', content: 'Cargando conversación...' },
    ]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4">
      {/* ========================================
          SIDEBAR IZQUIERDO - Historial
      ======================================== */}
      <div
        ref={sidebarRef}
        className="w-[280px] flex-shrink-0 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden"
      >
        {/* Botón Nueva Consulta */}
        <div className="p-4 border-b border-surface-200">
          <Button onClick={handleNewConversation} className="w-full">
            ➕ Nueva Consulta
          </Button>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Recientes */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
              Reciente
            </h3>
            <div className="space-y-1">
              {conversations.slice(0, 2).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                    currentConversation === conv.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-surface-50 text-surface-700'
                  }`}
                >
                  <p className="font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{conv.timestamp}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Últimos 7 días */}
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
              Últimos 7 Días
            </h3>
            <div className="space-y-1">
              {conversations.slice(2).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                    currentConversation === conv.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-surface-50 text-surface-700'
                  }`}
                >
                  <p className="font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{conv.timestamp}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          PANEL CENTRAL - Chat
      ======================================== */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                LogisticaSPA AI Agent
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                ● Sistema en línea
              </p>
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-surface-100 text-surface-800 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                {/* Card embebida de ruta */}
                {msg.route && (
                  <AiRouteCard route={msg.route} onViewMap={handleRouteCardClick} />
                )}

                {/* Sugerencias */}
                {msg.suggestions && (
                  <AiSuggestionButtons
                    suggestions={msg.suggestions}
                    onSelect={handleSuggestionClick}
                  />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-surface-100 rounded-2xl rounded-bl-sm p-4">
                <Spinner size="sm" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias iniciales */}
        {showSuggestions && messages.length === 1 && (
          <div className="px-4 pb-4">
            <p className="text-xs text-surface-500 mb-2">Sugerencias rápidas:</p>
            <AiSuggestionButtons
              suggestions={COMMON_SUGGESTIONS}
              onSelect={handleSuggestionClick}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-surface-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta logística aquí..."
              className="flex-1 px-4 py-2.5 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="button"
              className="px-4 py-2.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
              title="Usar micrófono"
            >
              🎤
            </button>
            <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
              Enviar
            </Button>
          </div>
          <p className="text-xs text-surface-400 mt-2 text-center">
            LogisticaSPA AI puede cometer errores. Verifica la información crítica.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AiChatPage;

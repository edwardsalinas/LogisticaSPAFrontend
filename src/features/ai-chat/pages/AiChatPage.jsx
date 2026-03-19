import { useState, useRef, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Spinner from '../../../components/atoms/Spinner';
import api from '../../../services/api';

function AiChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente logístico IA. Puedo ayudarte a consultar el estado de paquetes y rutas de transporte. ¿En qué te puedo ayudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai-agent/chat', { message: input });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-surface-200">
        <h2 className="text-lg font-semibold text-surface-800">🤖 Asistente Logístico IA</h2>
        <p className="text-xs text-surface-400 mt-0.5">Consulta el estado de paquetes y rutas en lenguaje natural</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-xl text-sm ${msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-surface-100 text-surface-800 rounded-bl-sm'
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-100 p-3 rounded-xl rounded-bl-sm">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-surface-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta..."
            className="form-field__input flex-1"
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AiChatPage;

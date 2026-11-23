import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAiMode } from '../../app/AiModeContext';
import { useAuth } from '../../app/AuthContext';
import useRole from '../../app/useRole';
import { getNavItems } from './Sidebar';

const TRK = /^trk-[a-z0-9-]+$/i;

/**
 * Paleta de comandos (Ctrl+K): ir a una pantalla, preguntarle algo al asistente o buscar un paquete por su código.
 * Solo ofrece las pantallas que el rol del usuario puede ver. Preguntar al asistente nunca ejecuta nada:
 * deja la pregunta escrita en el chat para que el usuario la envíe.
 */
export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { aiMode, toggleAiMode } = useAiMode();
  const { hasRole } = useRole();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');

  const items = getNavItems(aiMode).filter((item) => hasRole(item.roles));
  const assistantPath = aiMode ? '/' : '/assistant';
  const q = query.trim();
  const isCode = TRK.test(q);

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };
  const run = (action) => () => {
    close();
    action();
  };
  const askAssistant = (text) => navigate(assistantPath, { state: { prefill: text } });

  return (
    <CommandDialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setQuery('');
      }}
      title="Buscar o ir a"
      description="Escribe para ir a una pantalla, buscar un paquete por su código o preguntarle al asistente."
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Ir a una pantalla, buscar un paquete (TRK-…) o preguntar…" />
      <CommandList>
        <CommandEmpty>Sin coincidencias. Prueba con otra palabra o pregúntale al asistente.</CommandEmpty>

        {q ? (
          <CommandGroup heading="Asistente">
            {isCode ? (
              <CommandItem value={`donde esta ${q}`} onSelect={run(() => askAssistant(`¿Dónde está el paquete ${q.toUpperCase()}?`))}>
                <Sparkles aria-hidden="true" /> ¿Dónde está el paquete {q.toUpperCase()}?
              </CommandItem>
            ) : null}
            <CommandItem value={`preguntar ${q}`} onSelect={run(() => askAssistant(q))}>
              <Sparkles aria-hidden="true" /> Preguntar al asistente: “{q}”
            </CommandItem>
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Ir a">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.path} value={`${item.label} ${item.eyebrow}`} onSelect={run(() => navigate(item.path))}>
                <Icon aria-hidden="true" /> {item.label}
                <CommandShortcut>{item.eyebrow}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Acciones">
          <CommandItem
            value="modo ia asistente"
            onSelect={run(() => {
              toggleAiMode();
              if (!aiMode) navigate('/');
            })}
          >
            <Sparkles aria-hidden="true" /> {aiMode ? 'Desactivar el Modo IA' : 'Activar el Modo IA'}
          </CommandItem>
          <CommandItem value="cerrar sesion salir" onSelect={run(logout)}>
            <LogOut aria-hidden="true" /> Cerrar sesión
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

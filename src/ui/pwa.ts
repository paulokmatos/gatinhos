import { registerSW } from 'virtual:pwa-register';

/**
 * Atualização discreta do PWA:
 *  - o navegador baixa a versão nova em segundo plano (ao abrir, ao voltar para o app e de hora em hora);
 *  - ela só entra em uso quando o app vai para segundo plano (ou na próxima abertura), sem recarregar a partida;
 *  - o progresso e a partida ficam no aparelho (localStorage) e continuam valendo.
 */
export function setupUpdates(): void {
  let needRefresh = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => void reg.update().catch(() => undefined);
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && needRefresh) void updateSW(true);
        else if (document.visibilityState === 'visible') check();
      });
    },
  });
}

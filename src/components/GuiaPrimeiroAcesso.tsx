// Tour em tooltip no primeiro acesso: overlay, destaque do alvo e balão.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AncoraGuia,
  PASSOS_GUIA,
  jaViuGuia,
  marcarGuiaVisto,
  resetarGuia,
} from '../onboarding/guiaPrimeiroAcesso';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';

export type RetAngulo = { x: number; y: number; width: number; height: number };

type GuiaCtx = {
  ativo: boolean;
  indice: number;
  ancoraAtiva: AncoraGuia | null;
  registrar: (id: AncoraGuia, rect: RetAngulo | null) => void;
  iniciar: () => void;
  pular: () => void;
};

const Ctx = createContext<GuiaCtx | null>(null);

export function useGuiaPrimeiroAcesso() {
  const c = useContext(Ctx);
  if (!c) {
    return {
      ativo: false,
      indice: 0,
      ancoraAtiva: null as AncoraGuia | null,
      registrar: () => {},
      iniciar: () => {},
      pular: () => {},
    };
  }
  return c;
}

/**
 * @param habilitado Só arma o guia quando a pessoa já entrou e está no app
 *   principal. Sem isto o provider montava junto com a raiz, ou seja, antes do
 *   login: os seis passos apareciam por cima da tela de entrar, apontando para
 *   âncoras (`tab-hoje`, `tab-mais`) que só existem depois. E pior — quem
 *   tocasse em "Pular" ali gastava o guia sem nunca ter visto o app.
 */
export function GuiaPrimeiroAcessoProvider({
  children,
  habilitado = false,
}: { children: React.ReactNode; habilitado?: boolean }) {
  const [ativo, setAtivo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [rects, setRects] = useState<Partial<Record<AncoraGuia, RetAngulo>>>({});
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!habilitado) {
      // Saiu do app (logout, ou voltou para o onboarding): o guia não fica
      // aberto por cima de uma tela que não é a dele.
      setAtivo(false);
      return;
    }
    let vivo = true;
    jaViuGuia().then((viu) => {
      if (!vivo || viu) return;
      // Espera a Hoje montar e medir os alvos.
      setTimeout(() => {
        if (vivo) setAtivo(true);
      }, 700);
    });
    return () => { vivo = false; };
  }, [habilitado]);

  const registrar = useCallback((id: AncoraGuia, rect: RetAngulo | null) => {
    setRects((prev) => {
      if (!rect) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const antigo = prev[id];
      if (
        antigo
        && Math.abs(antigo.x - rect.x) < 1
        && Math.abs(antigo.y - rect.y) < 1
        && Math.abs(antigo.width - rect.width) < 1
        && Math.abs(antigo.height - rect.height) < 1
      ) {
        return prev;
      }
      return { ...prev, [id]: rect };
    });
  }, []);

  const encerrar = useCallback(async () => {
    setAtivo(false);
    await marcarGuiaVisto();
  }, []);

  const iniciar = useCallback(async () => {
    await resetarGuia();
    setIndice(0);
    setAtivo(true);
  }, []);

  const pular = useCallback(() => {
    void encerrar();
  }, [encerrar]);

  const passo = PASSOS_GUIA[indice];
  const total = PASSOS_GUIA.length;
  const alvo = passo ? rects[passo.ancora] : undefined;
  const ultimo = indice >= total - 1;

  const avancar = () => {
    if (ultimo) {
      void encerrar();
      return;
    }
    setIndice((i) => Math.min(total - 1, i + 1));
  };

  const voltar = () => setIndice((i) => Math.max(0, i - 1));

  const ctx = useMemo<GuiaCtx>(
    () => ({
      ativo,
      indice,
      ancoraAtiva: ativo && passo ? passo.ancora : null,
      registrar,
      iniciar,
      pular,
    }),
    [ativo, indice, passo, registrar, iniciar, pular]
  );

  // Posição do balão: perto do alvo, sem sair da tela.
  const baloon = (() => {
    const pad = 16;
    const cardW = Math.min(winW - pad * 2, 340);
    const cardH = 210;
    if (!alvo) {
      return {
        left: (winW - cardW) / 2,
        top: winH * 0.42,
        width: cardW,
        seta: passo?.seta ?? 'baixo' as const,
        setaLeft: cardW / 2 - 8,
      };
    }
    if (passo.seta === 'baixo') {
      // Balão acima do alvo (tab bar).
      const top = Math.max(insets.top + 12, alvo.y - cardH - 18);
      const left = Math.min(
        Math.max(pad, alvo.x + alvo.width / 2 - cardW / 2),
        winW - cardW - pad
      );
      const setaLeft = Math.min(
        Math.max(20, alvo.x + alvo.width / 2 - left - 8),
        cardW - 28
      );
      return { left, top, width: cardW, seta: 'baixo' as const, setaLeft };
    }
    // Balão abaixo do alvo (header).
    const top = Math.min(alvo.y + alvo.height + 14, winH - cardH - insets.bottom - 24);
    const left = Math.min(
      Math.max(pad, alvo.x + alvo.width / 2 - cardW / 2),
      winW - cardW - pad
    );
    const setaLeft = Math.min(
      Math.max(20, alvo.x + alvo.width / 2 - left - 8),
      cardW - 28
    );
    return { left, top, width: cardW, seta: 'cima' as const, setaLeft };
  })();

  const holster = alvo
    ? {
        left: Math.max(0, alvo.x - 6),
        top: Math.max(0, alvo.y - 6),
        width: alvo.width + 12,
        height: alvo.height + 12,
        borderRadius: Math.min(18, (alvo.height + 12) / 2),
      }
    : null;

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Modal visible={ativo} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Escurece a tela; o "buraco" do destaque fica por cima com borda. */}
          <View style={styles.scrim} />
          {holster ? (
            <View style={[styles.destaque, holster]} pointerEvents="none" />
          ) : null}

          <View
            style={[
              styles.balao,
              {
                left: baloon.left,
                top: baloon.top,
                width: baloon.width,
              },
            ]}
          >
            {baloon.seta === 'cima' ? (
              <View style={[styles.setaCima, { left: baloon.setaLeft }]} />
            ) : null}

            <View style={styles.balaoTopo}>
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>
                  {indice + 1} de {total}
                </Text>
              </View>
              <Pressable onPress={pular} hitSlop={10} accessibilityLabel="Pular guia">
                <Text style={styles.pular}>Pular</Text>
              </Pressable>
            </View>

            <Text style={styles.titulo}>{passo?.titulo}</Text>
            <Text style={styles.texto}>{passo?.texto}</Text>

            <View style={styles.rodape}>
              {indice > 0 ? (
                <Pressable onPress={voltar} hitSlop={10} accessibilityLabel="Voltar">
                  <Text style={styles.voltar}>Voltar</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                onPress={avancar}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel={ultimo ? 'Concluir' : 'Avançar'}
              >
                <Text style={styles.ctaTexto}>{ultimo ? 'Concluir' : 'Avançar'}</Text>
              </Pressable>
            </View>

            {baloon.seta === 'baixo' ? (
              <View style={[styles.setaBaixo, { left: baloon.setaLeft }]} />
            ) : null}
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

/** Marca um alvo do guia medindo a posição na janela. */
export function AncoraDoGuia({
  id,
  children,
  style,
}: {
  id: AncoraGuia;
  children: React.ReactNode;
  style?: object;
}) {
  const { registrar, ancoraAtiva } = useGuiaPrimeiroAcesso();
  const destacado = ancoraAtiva === id;

  return (
    <View
      style={style}
      collapsable={false}
      onLayout={(e) => {
        const t = e.target as any;
        if (typeof t?.measureInWindow === 'function') {
          t.measureInWindow((x: number, y: number, width: number, height: number) => {
            registrar(id, { x, y, width, height });
          });
        } else {
          const { x, y, width, height } = e.nativeEvent.layout;
          // Fallback: layout relativo (pior no web, mas evita crash).
          registrar(id, { x, y, width, height });
        }
      }}
    >
      {children}
      {destacado ? <View style={styles.anelLocal} pointerEvents="none" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 14, 8, 0.55)',
  },
  destaque: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.warmWhite,
    backgroundColor: 'transparent',
    ...(shadows.md as object),
  },
  balao: {
    position: 'absolute',
    backgroundColor: colors.warmWhite,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    ...(shadows.md as object),
  },
  setaCima: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    backgroundColor: colors.warmWhite,
    transform: [{ rotate: '45deg' }],
    borderTopLeftRadius: 3,
  },
  setaBaixo: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    backgroundColor: colors.warmWhite,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 3,
  },
  balaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.ambar08,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.earth,
  },
  pular: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.mist,
  },
  titulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 18,
    lineHeight: 24,
    color: colors.earth,
    marginBottom: 8,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.warmGray,
    marginBottom: 18,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voltar: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.charcoal,
    paddingVertical: 8,
    paddingRight: 12,
  },
  cta: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.warmWhite,
  },
  anelLocal: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.warmWhite,
  },
});

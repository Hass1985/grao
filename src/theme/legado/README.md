# Visual legado (campo escuro)

Cópia do design system anterior ao redesign “planner claro”
(Guia Visual Grão App, set/2026).

## Como voltar ao visual antigo

### Opção A: branch git (recomendado)

```bash
git checkout visual/legado-campo-escuro
```

Essa branch aponta para o estado do app antes deste redesign.

### Opção B: restaurar estes arquivos

Copie de volta para `src/theme/` e `src/components/ui/`:

- `colors.ts`, `typography.ts`, `glass.ts`, `shadows.ts`, `radius.ts`
- `ScreenBackground.tsx`, `Button.tsx`

Depois restaure fundos fotográficos e `StatusBar` `light-content` nas telas.

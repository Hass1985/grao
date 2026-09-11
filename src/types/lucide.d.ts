// Os ícones do Lucide importados um a um.
//
// `lucide-react-native` publica os tipos só no índice do pacote; os arquivos
// individuais em dist/esm/icons não têm .d.ts. Como importamos por ali de
// propósito — importar do índice arrastava 2.056 ícones para dentro do pacote
// publicado — o `tsc` reclamava de 27 módulos "inexistentes" que o bundler
// resolve sem nenhum problema.
//
// Vinte e sete erros falsos em toda rodada é o que faz um typecheck deixar de
// ser lido. E um typecheck que ninguém lê foi exatamente como uma função usada
// sem import sobreviveu até a tela do usuário, em Campo.tsx.
declare module 'lucide-react-native/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';
  const icone: LucideIcon;
  export default icone;
}

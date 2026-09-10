// Só os ícones que o Grão usa.
//
// `import { Sprout } from 'lucide-react-native'` traz o índice do pacote
// inteiro: 2.056 ícones foram parar no pacote publicado para desenhar 24. Cada
// pessoa que abria o app baixava a biblioteca completa antes da primeira tela
// aparecer — e num celular em rede lenta isso é justamente o tempo em que um
// aplicativo deixa de parecer caro.
//
// Importar pelo caminho do próprio ícone corta isso sem mudar um pixel. Quando
// precisar de um ícone novo, acrescente a linha dele aqui: o nome do arquivo é
// o nome do ícone em minúsculas com hífen (Music2 → music-2).

export { default as BookMarked } from 'lucide-react-native/dist/esm/icons/book-marked';
export { default as BookOpen } from 'lucide-react-native/dist/esm/icons/book-open';
export { default as CalendarDays } from 'lucide-react-native/dist/esm/icons/calendar-days';
export { default as Camera } from 'lucide-react-native/dist/esm/icons/camera';
export { default as ChevronLeft } from 'lucide-react-native/dist/esm/icons/chevron-left';
export { default as ChevronRight } from 'lucide-react-native/dist/esm/icons/chevron-right';
export { default as Circle } from 'lucide-react-native/dist/esm/icons/circle';
export { default as Clock } from 'lucide-react-native/dist/esm/icons/clock';
export { default as CreditCard } from 'lucide-react-native/dist/esm/icons/credit-card';
export { default as Eye } from 'lucide-react-native/dist/esm/icons/eye';
export { default as EyeOff } from 'lucide-react-native/dist/esm/icons/eye-off';
export { default as Heart } from 'lucide-react-native/dist/esm/icons/heart';
export { default as Info } from 'lucide-react-native/dist/esm/icons/info';
export { default as Lock } from 'lucide-react-native/dist/esm/icons/lock';
export { default as Mail } from 'lucide-react-native/dist/esm/icons/mail';
export { default as MessageCircle } from 'lucide-react-native/dist/esm/icons/message-circle';
export { default as Mic } from 'lucide-react-native/dist/esm/icons/mic';
export { default as Music2 } from 'lucide-react-native/dist/esm/icons/music-2';
export { default as Pause } from 'lucide-react-native/dist/esm/icons/pause';
export { default as Play } from 'lucide-react-native/dist/esm/icons/play';
export { default as Share2 } from 'lucide-react-native/dist/esm/icons/share-2';
export { default as Shield } from 'lucide-react-native/dist/esm/icons/shield';
export { default as Smartphone } from 'lucide-react-native/dist/esm/icons/smartphone';
export { default as Sprout } from 'lucide-react-native/dist/esm/icons/sprout';
export { default as Star } from 'lucide-react-native/dist/esm/icons/star';
export { default as Store } from 'lucide-react-native/dist/esm/icons/store';
export { default as Trash2 } from 'lucide-react-native/dist/esm/icons/trash-2';

// Tipo apenas: some na compilação, não entra no pacote.
export type { LucideIcon } from 'lucide-react-native';

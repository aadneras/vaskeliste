// Innstillinger for Vaskelista. Endre her, commit og push, så oppdateres siden.

// Rekkefølgen her er rekkefølgen i rotasjonen.
// id brukes i databasen og kan bare inneholde a–z (ingen æ/ø/å).
export const PEOPLE = [
  { id: 'adne', name: 'Ådne', color: '#1F9E7A' },
  { id: 'kasper', name: 'Kasper', color: '#3E7CC4' },
  { id: 'benjamin', name: 'Benjamin', color: '#D0703A' },
  { id: 'jonas', name: 'Jonas', color: '#8B63C9' },
];

// Første uke får person nr. 1 oppgave nr. 1, person nr. 2 oppgave nr. 2 osv.
// Hver uke flytter alle én oppgave nedover i lista.
export const TASKS = [
  {
    id: 'kjokken',
    name: 'Kjøkken',
    short: 'Kjøkken',
    icon: 'pan',
    desc: 'Tørk av benker og komfyr, vask oppvaskkummen og ta kjøkkengulvet.',
  },
  {
    id: 'bad',
    name: 'Bad',
    short: 'Bad',
    icon: 'drop',
    desc: 'Toalett, servant, dusj, speil og gulv.',
  },
  {
    id: 'stovsuging',
    name: 'Støvsuging',
    short: 'Støvsug',
    icon: 'vacuum',
    desc: 'Støvsug gulvet i hele leiligheten, også gangen og under sofaen.',
  },
  {
    id: 'oppvask',
    name: 'Oppvaskmaskin',
    short: 'Oppvask',
    icon: 'plate',
    desc: 'Ta ut av oppvaskmaskinen hver gang den er ferdig, hele uka.',
  },
];

// Mandagen rotasjonen starter (uke 40, 2026).
export const START_MONDAY = '2026-09-28';

// Lim inn firebaseConfig fra Firebase-konsollen her (se README.md).
// Så lenge apiKey er 'LIM_INN_HER' kjører siden i demomodus,
// og avkrysninger lagres bare i nettleseren du bruker.
export const firebaseConfig = {
  apiKey: 'LIM_INN_HER',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

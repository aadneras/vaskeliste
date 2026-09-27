# Vaskelista

Vaskerotasjonen i kollektivet til Ådne, Kasper, Benjamin og Jonas.

- Alle har én oppgave per uke: **Kjøkken**, **Bad**, **Støvsuging** (hele leiligheten) eller **Oppvaskmaskin og søppel** (ta ut av maskinen, og tøm og kast søppelet når det er fullt).
- Oppgavene roterer hver mandag. Rotasjonen startet uke 40 (28. sep. 2026) med Ådne på kjøkken, Kasper på bad, Benjamin på støvsuging og Jonas på oppvaskmaskin.
- Du krysser av når oppgaven din er gjort, og alle ser live hva som er gjort.
- Scoreboardet viser hvem som har fullført flest uker. Oversikten viser de siste ukene og de neste.

Siden er ren HTML, CSS og JavaScript uten byggesteg. Den hostes gratis på **GitHub Pages**, og avkrysningene lagres i **Firebase Firestore** (gratis).

## Sett opp databasen (Firebase), ca. 10 minutter

Uten Firebase kjører siden i *demomodus*, og avkrysninger lagres bare i nettleseren du bruker. Slik kobler du den til en delt database:

1. Gå til [console.firebase.google.com](https://console.firebase.google.com) og logg inn med Google-kontoen din.
2. Trykk **Create a project** (Opprett prosjekt) og gi det et navn, for eksempel `vaskelista`. Google Analytics kan du skru av.
3. Velg **Build → Firestore Database** i menyen til venstre, og trykk **Create database**.
   - Location: `eur3 (europe-west)`.
   - Velg **Start in production mode**.
4. Åpne fanen **Rules** og erstatt alt som står der med innholdet i [`firestore.rules`](firestore.rules). Trykk **Publish**.
5. Gå til **Project settings** (tannhjulet øverst til venstre). Under *Your apps* trykker du på web-ikonet **`</>`**.
   - Gi appen et kallenavn (for eksempel `vaskelista`). Hosting trenger du ikke.
   - Kopier verdiene i `firebaseConfig` (apiKey, authDomain, projectId osv.).
6. Lim verdiene inn i `firebaseConfig` nederst i [`config.js`](config.js), og commit og push (se under).

> Er det trygt å legge Firebase-nøkkelen i et offentlig repo?
> Ja. Web-nøkkelen til Firebase er laget for å ligge i nettleseren. Det er reglene i `firestore.rules` som bestemmer hva som er lov: alle kan lese og krysse av, men bare for gyldige navn og oppgaver, og ingen kan slette. Alle som har lenken kan altså krysse av, så del den bare med kollektivet.

## Legg siden ut gratis (GitHub Pages)

Repoet må være **public** for at Pages skal være gratis.

**Med terminalen** (anbefalt):

```bash
brew install gh
gh auth login
gh repo create vaskeliste --public --source . --push
gh api -X POST repos/{owner}/vaskeliste/pages -f "source[branch]=main" -f "source[path]=/"
```

**I nettleseren**, uten terminal:

1. Opprett et nytt, offentlig repo på [github.com/new](https://github.com/new) med navnet `vaskeliste`.
2. Trykk **uploading an existing file** og dra inn alle filene i denne mappen. Trykk **Commit changes**.
3. Gå til **Settings → Pages**. Under *Build and deployment* velger du **Deploy from a branch**, deretter `main` og `/ (root)`. Trykk **Save**.

Etter et minutt eller to ligger siden på `https://<github-brukernavn>.github.io/vaskeliste/`. Send lenken til de andre.

### Oppdatere siden senere

```bash
git add -A
git commit -m "Beskriv endringen"
git push
```

GitHub Pages oppdaterer seg selv etter et minutt.

## Legg den på hjemskjermen

- **iPhone:** åpne lenken i Safari → Del-knappen → **Legg til på Hjem-skjerm**.
- **Android:** åpne lenken i Chrome → ⋮ → **Legg til på startskjermen**.

Første gang velger hver person hvem de er under **Jeg er**. Valget huskes på telefonen.

## Endre ting

Alt ligger i [`config.js`](config.js):

- **Navn eller farger:** `PEOPLE`. `id` må bare inneholde a–z. Oppdaterer du id-ene, må du også oppdatere lista i `firestore.rules` og publisere reglene på nytt.
- **Oppgaver og beskrivelser:** `TASKS`. Rekkefølgen er rotasjonsrekkefølgen.
- **Startuke:** `START_MONDAY`. Den første uka får person nr. 1 oppgave nr. 1, person nr. 2 oppgave nr. 2 osv.

## Kjøre lokalt

```bash
python3 -m http.server 8000
```

Åpne deretter `http://localhost:8000`. Legger du til `?dato=2026-10-14` i adressen, later siden som om det er den datoen. Det er nyttig for å teste rotasjonen.

# 🌍 Flagi i Stolice / Flags & Capitals

**🇵🇱 Polski / 🇬🇧 English** — język przełączasz przyciskiem PL/EN w prawym górnym rogu lub w ustawieniach.

Prosta gra przeglądarkowa (HTML + CSS + JavaScript, bez instalacji i bez frameworków) do nauki flag i stolic państw świata — 190+ państw.

## Tryby gry

| Tryb | Co widzisz | Co odpowiadasz |
|---|---|---|
| **Flaga → Państwo** | flagę | nazwę państwa |
| **Stolica → Państwo** | nazwę stolicy | państwo (opcje z flagami) |
| **Flaga → Stolica** | flagę | stolicę |

Każdy tryb działa na dwa sposoby: **wybór z listy** (4 odpowiedzi) albo **wpisywanie**. Przy wpisywaniu akceptowane są nazwy w obu językach (np. `Węgry` i `Hungary`), brak polskich znaków (`wegry`) i drobne literówki.

## Ustawienia ⚙️

- Język: polski / angielski (domyślnie według języka przeglądarki)
- Czas na odpowiedź: **10 s** (domyślnie), 20 s, 30 s, 1 min
- Sposób odpowiadania: wybór z listy / wpisywanie
- Liczba pytań: 10, 20, 50 lub wszystkie
- Regiony: Europa, Azja, Afryka, Ameryka Płn. i Śr., Ameryka Płd., Oceania
- Dźwięki wł./wył.

Ustawienia i rekordy zapisują się w przeglądarce (localStorage).

## 📱 Na telefonie (aplikacja)

Gra jest **PWA** – po wgraniu na GitHub Pages można ją zainstalować jak aplikację, z ikoną na ekranie i bez paska przeglądarki:

- **iPhone / iPad:** otwórz link w **Safari** → stuknij **Udostępnij** (kwadrat ze strzałką) → **„Do ekranu początkowego”**.
- **Android:** otwórz link w **Chrome** → przycisk **„Zainstaluj”** w grze albo menu ⋮ → **„Zainstaluj aplikację”**.

Gra działa **offline** po pierwszym uruchomieniu. Flagi zapisują się w miarę grania, a w **Ustawieniach → Gra offline** można pobrać wszystkie od razu (ok. 5 MB).

> Po zmianie plików gry podnieś `VERSION` w `sw.js` (np. `"v2"`), żeby zainstalowane aplikacje pobrały nowe pliki. Aktualizacja pojawia się przy kolejnym uruchomieniu.

## Punktacja

100 pkt za poprawną odpowiedź + do 100 pkt premii za szybkość + premia za serię 🔥. Po grze widać listę pomyłek do powtórki.

## Skróty klawiszowe

`1`–`4` — wybór odpowiedzi, `Enter` — następne pytanie.

## Uruchomienie

Wystarczy otworzyć `index.html` w przeglądarce (flagi ładowane są z [flagcdn.com](https://flagcdn.com), więc potrzebny jest internet).

## Publikacja na GitHub Pages

1. Utwórz nowe repozytorium na GitHubie, np. `flagi-stolice`.
2. Wgraj wszystkie pliki z tego folderu (przycisk **Add file → Upload files** albo przez git):
   ```bash
   git init
   git add .
   git commit -m "Gra Flagi i Stolice"
   git branch -M main
   git remote add origin https://github.com/TWOJ_LOGIN/flagi-stolice.git
   git push -u origin main
   ```
3. W repozytorium wejdź w **Settings → Pages**, w „Source” wybierz **Deploy from a branch**, gałąź `main`, folder `/ (root)` i zapisz.
4. Po minucie gra będzie dostępna pod `https://TWOJ_LOGIN.github.io/flagi-stolice/`.

## Struktura

```
index.html      – ekrany: menu, gra, wynik, ustawienia
css/style.css   – wygląd
js/data.js      – lista państw i stolic (PL + EN) oraz regionów
js/i18n.js      – teksty interfejsu po polsku i angielsku
js/app.js       – logika gry
sw.js           – tryb offline (service worker)
manifest.webmanifest – dane aplikacji (nazwa, ikony)
icons/          – ikony aplikacji
```

Aby dodać lub poprawić państwo, edytuj `js/data.js`:
`["kod_ISO", "Nazwa", "Stolica", "region", ["inne nazwy"], ["inne nazwy stolicy"]]`
a angielską wersję w `COUNTRIES_EN` w tym samym pliku:
`kod: ["Name", "Capital", ["aliases"], ["capital aliases"]]`

## English

A simple browser quiz for learning world flags and capitals (195 countries). Three modes: Flag → Country, Capital → Country, Flag → Capital. Answer by multiple choice or by typing (both English and Polish names are accepted, small typos are forgiven). Time per answer: 10 s by default, changeable to 20 s, 30 s or 1 min in Settings. Switch the language with the PL/EN button in the top bar.

**On your phone:** it is a PWA – open the GitHub Pages link and use *Share → Add to Home Screen* (iPhone, Safari) or *Install app* (Android, Chrome). It then runs full-screen and works offline; all flags can be downloaded in Settings → Offline play.

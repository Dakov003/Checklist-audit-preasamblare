# CLAUDE.md - Context permanent al proiectului

Citeste acest fisier la inceputul fiecarei sesiuni. Contine regulile care nu se
negociaza. Detaliile functionale sunt in SPEC.md, etapele in PLAN.md.

## Ce construim

O aplicatie web (PWA) care inlocuieste checklistul de preaudit pe hartie dintr-o
zona de preasamblare, la o fabrica de componente auto.

Auditul se face **in picioare, langa masina, pe telefon sau tableta**, de catre
reglori si sefi de linie. Nu de catre programatori. Nu la birou.

## Utilizatorul real

- Reglor sau sef de linie, 25-55 ani, cu manusi pe maini, in zgomot de linie.
- Foloseste telefonul personal sau o tableta de linie, cu o mana.
- Nu are timp si nu are rabdare de meniuri. Vrea sa termine in 10 minute.
- Nu stie engleza tehnica. Interfata este **exclusiv in limba romana, fara
  diacritice** (fonturile de pe unele tablete vechi le stalcesc).

Daca o functie cere doua atingeri unde ar fi ajuns una, este gresit proiectata.

## Reguli tehnice care nu se schimba

1. **Fara backend.** Nimic server-side in aceasta etapa. Fara conturi, fara login,
   fara baza de date remote.
2. **Fara framework, fara build step.** HTML + CSS + JavaScript vanilla. Nu
   instala React, Vue, Tailwind, Vite, npm packages. Fisiere care se deschid
   direct in browser.
3. **Offline complet.** Service worker care cache-uieste tot. Aplicatia trebuie sa
   porneasca si sa functioneze integral cu telefonul pe mod avion.
4. **Datele stau pe dispozitiv.** IndexedDB pentru audituri si poze, localStorage
   doar pentru preferinte mici. Nimic nu pleaca automat nicaieri.
5. **Fara secrete in cod.** Niciun token de bot, nicio parola, niciun webhook
   hardcodat. Daca o functie ar cere asta, opreste-te si intreaba.
6. **Continutul checklistului sta in `data/checklist.json`**, niciodata in cod.
   Utilizatorul trebuie sa poata adauga sau modifica itemi editand doar JSON-ul.
7. **iOS Safari este platforma de referinta.** Este cea mai restrictiva. Daca
   merge acolo, merge peste tot. Testeaza mental fiecare API pe Safari inainte
   sa il folosesti.

## Reguli de lucru cu mine

- Lucreaza **o etapa din PLAN.md pe rand**. Nu sari inainte. La finalul fiecarei
  etape opreste-te si spune-mi ce sa testez pe telefon.
- **Nu modifica `data/checklist.json`** - textele sunt validate de un auditor si
  aprobate. Daca vezi o problema in ele, semnaleaz-o, nu o corecta.
- **Nu adauga functii pe care nu le-am cerut.** Fara analytics, fara teme,
  fara animatii decorative, fara "ar fi frumos si...".
- Cand ai o alegere de arhitectura cu doua variante rezonabile, **intreaba-ma
  inainte**, nu dupa ce ai scris 300 de linii.
- Cod comentat in romana, fara diacritice. Nume de variabile in engleza.
- Spune-mi direct cand ceva ce cer nu se poate sau e o idee proasta. Prefer sa
  aud asta acum, nu dupa ce cade in productie.

## Ce inseamna "gata"

O etapa e gata cand am putut sa o deschid pe telefonul meu, sa o folosesc cu o
mana, si sa nu ma opresc niciunde ca sa ma intreb ce trebuie sa fac.

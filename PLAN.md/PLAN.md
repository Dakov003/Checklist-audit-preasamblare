# PLAN.md - Etape de constructie

Se lucreaza o etapa pe rand. La finalul fiecareia, Claude Code se opreste si
spune exact ce trebuie testat pe telefon. Nu se trece mai departe pana nu confirm.

Motivul: daca se construieste tot dintr-o data si ceva nu merge pe iOS, nu se
mai stie care din cele sase lucruri noi a stricat-o.

---

## Etapa 1 - Scheletul si parcurgerea checklistului

- structura de fisiere din SPEC.md
- citirea `data/checklist.json` si constructia dinamica a itemilor
- ecranul de start cu campurile de identificare
- ecranul de item, cu OK / NOK / N/A si avansare automata
- formularul de NOK si cel de N/A, cu campuri obligatorii
- navigare inapoi si editarea unui item deja completat
- **fara** poze, **fara** PDF, **fara** offline

**Test:** parcurg toti cei 56 de itemi pe telefon, cu o mana. Cronometrez.
Daca dureaza peste 15 minute sau ma opresc undeva nedumerit, refacem ecranul.

---

## Etapa 2 - Salvare pe dispozitiv

- IndexedDB: schema pentru audituri
- salvare dupa fiecare item
- reluarea unui audit intrerupt
- ecranul `Audituri salvate`, cu deschidere si stergere

**Test:** incep un audit, ajung la itemul 20, inchid complet browserul,
il redeschid. Trebuie sa continui de la 20, cu tot ce am completat.

---

## Etapa 3 - Sumar si calculul verdictului

- ecranul de sumar cu toate contoarele
- defalcarea pe categorii
- verdictul dupa regulile din SPEC.md
- lista NOK-urilor
- avertizarea pentru itemi necompletati
- semnatura pe ecran

**Test:** compar rezultatele cu foaia `Sumar_Scor` din Excel, pe acelasi set de
raspunsuri. Trebuie sa iasa identic, inclusiv un NOK critic care da BLOCAT
la 98% conformitate.

---

## Etapa 4 - Poze la NOK

- buton de camera, 0-3 poze per item
- compresie la 1280px si JPEG 0.7
- preview si stergere
- stocarea in IndexedDB ca blob

**Test:** adaug 3 poze la doua NOK-uri diferite, inchid, redeschid.
Pozele trebuie sa fie acolo si aplicatia sa nu incetineasca.

---

## Etapa 5 - Raportul PDF

- jsPDF si jspdf-autotable, incluse local
- structura de raport din SPEC.md
- pozele integrate in sectiunea NOK
- export CSV

**Test:** generez raportul, il deschid pe telefon si pe laptop. Verific ca
incape pe A4, ca nu se taie textul lung si ca pozele se vad.

---

## Etapa 6 - Trimiterea

- Web Share API cu fisier atasat
- fallback pe descarcare

**Test:** trimit raportul catre Telegram si catre Outlook, de pe Android
si de pe iPhone.

---

## Etapa 7 - PWA si offline

- `manifest.json`, iconite
- service worker care cache-uieste tot
- instalare pe Home Screen

**Test:** instalez aplicatia, pun telefonul pe mod avion si fac un audit
complet, inclusiv generarea PDF-ului.

---

## Dupa etapa 7

Doua saptamani de folosire reala cu reglorii, apoi decidem daca merita:
trimitere automata prin releu, sincronizare, sau statistici de trend.
Nu inainte.

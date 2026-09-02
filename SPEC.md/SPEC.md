# SPEC.md - Specificatie functionala

## 1. Structura de fisiere

```
audit-preasamblare/
├── CLAUDE.md
├── SPEC.md
├── PLAN.md
├── index.html
├── app.js
├── style.css
├── sw.js
├── manifest.json
├── data/
│   └── checklist.json
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 2. Formatul checklistului

`data/checklist.json` are aceasta structura si nu se modifica:

```json
{
  "versiune": "V7",
  "categorii": [
    {
      "nume": "1. Curatenie si Standardizare (5S)",
      "itemi": [
        { "nr": 1, "risc": "Minor", "cerinta": "Baza masinii curata: ..." }
      ]
    }
  ]
}
```

56 de itemi, 3 categorii. `risc` are trei valori: `Critic`, `Major`, `Minor`.
Aplicatia citeste fisierul la pornire si construieste checklistul dinamic. Daca
maine sunt 62 de itemi si 4 categorii, aplicatia trebuie sa mearga neschimbata.

## 3. Ecranul 1 - Start audit

Campuri:

| Camp | Tip | Obligatoriu | Observatii |
|---|---|---|---|
| Aria | text | da | se retine de la auditul anterior |
| Nr. masina | text | da | se retine |
| PN | text | da | |
| Schimb | 1 / 2 / 3 | da | butoane, nu dropdown |
| Auditor | text | da | se retine |
| Data si ora | auto | - | nu se editeaza |

Buton mare jos: **Incepe auditul**. Nu porneste pana nu sunt completate campurile
obligatorii - campul lipsa se marcheaza rosu, fara popup.

Sub el, daca exista un audit neterminat: **Continua auditul din 12:40** si un
buton discret **Audituri salvate**.

## 4. Ecranul 2 - Parcurgerea checklistului

Un singur item pe ecran. Structura de sus in jos:

1. Bara de progres si contorul: `Item 18 din 56`
2. Numele categoriei, text mic
3. Eticheta de risc: `CRITIC` rosu / `MAJOR` portocaliu / `MINOR` gri
4. Textul cerintei, font mare, minim 18px, cu spatiu in jur
5. Trei butoane late, pe toata latimea, minim 56px inaltime:
   **OK** (verde) | **NOK** (rosu) | **N/A** (gri)
6. Jos: sageata inapoi la itemul anterior

Comportament:

- **OK** salveaza si trece automat la itemul urmator. O singura atingere.
- **NOK** deschide in aceeasi pagina, sub butoane:
  - `Ce ai gasit` - text, obligatoriu
  - `Actiune imediata` - text, obligatoriu
  - `Actiune necesara` - text, obligatoriu
  - `Responsabil` - text, obligatoriu
  - `Termen` - date picker, obligatoriu
  - buton **Adauga poza** - deschide camera, permite 0-3 poze, cu preview si
    posibilitate de stergere
  - buton **Salveaza si continua**
- **N/A** deschide un singur camp `De ce nu se aplica`, obligatoriu, apoi continua.
- La revenire pe un item deja completat, raspunsul si textele se reincarca si pot
  fi modificate.

Salvare dupa **fiecare** item. Daca telefonul moare la itemul 40, la redeschidere
auditul continua de la 40.

Pozele se comprima inainte de salvare: maxim 1280px pe latura lunga, JPEG
calitate 0.7. Fara compresie, 10 poze umplu memoria si blocheaza generarea PDF.

## 5. Ecranul 3 - Sumar si finalizare

Se afiseaza dupa ultimul item, dar accesibil oricand printr-un buton `Sumar`.

- Verdict mare, colorat, calculat astfel, in aceasta ordine (asa e formula reala
  din foaia `Sumar_Scor`):
  1. daca `OK + NOK = 0` (niciun item evaluat inca) → **NEEVALUAT** (gri)
  2. altfel, orice NOK pe un item `Critic` → **BLOCAT** (rosu), indiferent de procent
  3. altfel `>= 95%` → **CONFORM** (verde)
  4. `85% - 94.9%` → **CONFORM CU OBSERVATII** (galben)
  5. `< 85%` → **NECONFORM** (rosu)
- Procent de conformitate = `OK / (OK + NOK)`. **Itemii N/A si cei necompletati
  se exclud din calcul.** Aceasta este regula din Excel si nu se schimba.
- Contoare: total, OK, NOK, N/A, necompletati
- Contor separat: `NOK critice`, `NOK major / minor`
- Defalcare pe cele 3 categorii: total, OK, NOK, N/A, % conformitate
- Lista tuturor NOK-urilor, cu nr., text scurt, responsabil si termen
- Avertizare rosie daca au ramas itemi necompletati, cu buton care sare la primul
- Semnatura: zona de desen cu degetul, salvata ca imagine
- Butoane: **Genereaza raport** si **Trimite**

## 6. Raportul

PDF A4 portret, generat pe dispozitiv. Structura:

1. Antet: titlu, aria, nr. masina, PN, schimb, auditor, data si ora
2. Verdictul, mare, cu fundal colorat
3. Tabel sumar: contoarele si defalcarea pe categorii
4. **Sectiunea NOK** - pentru fiecare: nr., cerinta, ce s-a gasit, actiune
   imediata, actiune necesara, responsabil, termen, pozele atasate
5. Tabelul complet al celor 56 de itemi cu statusul fiecaruia
6. Semnatura si data generarii

Nume fisier: `Audit_[Aria]_[NrMasina]_[AAAA-LL-ZZ]_[HHMM].pdf`

Biblioteca: jsPDF plus jspdf-autotable, incluse **local** in folderul proiectului,
nu de pe CDN - altfel nu merge offline.

Al doilea buton: **Export CSV**, un rand per item, pentru trend in Excel.

## 7. Trimiterea

Un singur buton **Trimite**, care apeleaza Web Share API cu PDF-ul atasat:

```js
navigator.share({ files: [pdfFile], title: ..., text: ... })
```

Deschide meniul nativ al telefonului: Telegram, Teams, Outlook, WhatsApp, Drive -
orice are utilizatorul instalat. Fara token, fara configurare.

Daca `navigator.canShare({files})` returneaza false (browser vechi, desktop),
butonul descarca PDF-ul si afiseaza un mesaj scurt: descarcat, atasati-l manual.

## 8. Istoric local

Ecran `Audituri salvate`: lista cu data, aria, nr. masina, verdict si procent.
Pentru fiecare: **Deschide**, **Regenereaza PDF**, **Sterge** (cu confirmare).
Se pastreaza ultimele 50, cele mai vechi se sterg automat.

## 9. Cerinte de interfata

- Zona de atingere minima 48x48px. Butoanele de status 56px inaltime.
- Contrast mare: se foloseste in hala, cu lumina puternica sau slaba.
- Fara scroll orizontal pe niciun ecran, la 360px latime.
- Blocare a inchiderii accidentale: confirmare la parasirea unui audit in curs.
- Fara diacritice nicaieri in interfata sau in raport.
- Fara animatii, tranzitii, splash screens. Cine deschide aplicatia vrea sa
  lucreze, nu sa se uite.

## 10. Ce NU face aceasta versiune

Notate explicit ca sa nu fie implementate din reflex:

- fara sincronizare intre dispozitive
- fara conturi si autentificare
- fara trimitere automata in Telegram sau Teams
- fara editarea checklistului din interfata
- fara statistici si grafice de trend
- fara mod multi-lingv

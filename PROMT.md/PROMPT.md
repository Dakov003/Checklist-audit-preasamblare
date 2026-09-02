# Prompt de pornire pentru Claude Code

## Pasul 1 - pregatirea folderului

```bash
mkdir audit-preasamblare && cd audit-preasamblare
mkdir data icons
```

Pune in folder:
- `CLAUDE.md`, `SPEC.md`, `PLAN.md` in radacina
- `checklist.json` in `data/`

Optional, dar recomandat:

```bash
git init && git add -A && git commit -m "Documentatie si checklist initial"
```

Asa poti reveni oricand la o versiune care mergea.

## Pasul 2 - pornirea

```bash
claude
```

## Pasul 3 - promptul de pornire

Copiaza mesajul de mai jos ca prima comanda:

---

Citeste CLAUDE.md, SPEC.md si PLAN.md din acest folder, in ordinea asta, plus
data/checklist.json.

Construim o aplicatie web pentru un checklist de preaudit dintr-o zona de
preasamblare auto. Se foloseste pe telefon, in hala, de catre reglori.

Inainte sa scrii cod:

1. Spune-mi in cel mult 10 randuri cum ai inteles proiectul si ce vei face
   in Etapa 1. Vreau sa verific ca am aceeasi imagine.
2. Spune-mi daca gasesti ceva contradictoriu sau imposibil in specificatie.
   Prefer sa aflu acum.
3. Pune-mi orice intrebare la care raspunsul ar schimba arhitectura.

Dupa ce confirm, lucreaza **doar Etapa 1** din PLAN.md. Te opresti la finalul
ei si imi spui exact ce sa testez pe telefon.

Reguli: fara framework, fara npm, fara build step, fara backend. HTML, CSS si
JavaScript simplu. Nu modifica data/checklist.json. Interfata in romana, fara
diacritice.

---

## Pasul 4 - testarea pe telefon

Din folderul proiectului:

```bash
python3 -m http.server 8000
```

Afla IP-ul laptopului (`ipconfig` pe Windows, `ip a` pe Linux/Mac) si deschide
pe telefon `http://IP-UL-TAU:8000`. Telefonul si laptopul trebuie sa fie pe
acelasi WiFi.

Atentie: camera si instalarea pe Home Screen cer HTTPS. Pe HTTP simplu vei
testa doar etapele 1-3. Pentru etapele 4-7 pui proiectul pe GitHub Pages,
care da HTTPS gratuit.

## Prompturi pentru etapele urmatoare

Dupa ce ai testat si esti multumit:

```
Etapa 1 e confirmata, merge cum trebuie. Treci la Etapa 2 din PLAN.md.
```

Daca ceva nu merge:

```
Etapa 1, problema: [ce ai facut] -> [ce s-a intamplat] -> [ce te asteptai].
Repara doar asta, nu schimba altceva.
```

## Doua sfaturi

**Nu cere mai multe etape odata.** Tentatia e mare, dar cand ceva se strica
pe iOS vrei sa stii exact care schimbare a facut-o.

**Cand adaugi itemi noi in checklist**, editezi doar `data/checklist.json`
si nu atingi codul. Daca ai nevoie de cod ca sa adaugi un item, inseamna ca
aplicatia a fost construita gresit - spune-i lui Claude Code sa repare asta.

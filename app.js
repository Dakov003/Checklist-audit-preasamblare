// Aplicatie audit preasamblare - Etapa 2
// Fara backend, fara framework. Auditul curent se salveaza in IndexedDB dupa
// fiecare item. Doar cateva preferinte mici (aria, masina, auditor) stau in
// localStorage. Fara poze, fara PDF, fara offline (vin in etapele urmatoare).

(function () {
  "use strict";

  var CHEIE_PREFERINTE = "auditPreferinte";
  var NUME_BAZA_DATE = "auditPreasamblareDB";
  var NUME_MAGAZIE = "audituri";
  var LIMITA_AUDITURI_PASTRATE = 50;
  var TIMP_REVENIRE_STERGERE_MS = 5000;

  // stare aplicatie
  var itemi = [];        // lista plata: { nr, risc, cerinta, categorie }
  var raspunsuri = [];   // paralela cu itemi: null sau obiect de raspuns
  var indexCurent = 0;
  var schimbSelectat = null;
  var bazaDate = null;
  var auditCurent = null;          // { id, aria, masina, pn, schimb, auditor, dataStart }
  var auditNefinalizatRecent = null;

  // elemente ecran start
  var ecranStart = document.getElementById("ecran-start");
  var inputAria = document.getElementById("input-aria");
  var inputMasina = document.getElementById("input-masina");
  var inputPn = document.getElementById("input-pn");
  var grupSchimb = document.getElementById("grup-schimb");
  var inputAuditor = document.getElementById("input-auditor");
  var dataOraAuto = document.getElementById("data-ora-auto");
  var butonIncepe = document.getElementById("buton-incepe");
  var butonContinua = document.getElementById("buton-continua");
  var continuaOra = document.getElementById("continua-ora");
  var butonAudituriSalvate = document.getElementById("buton-audituri-salvate");

  // elemente ecran item
  var ecranItem = document.getElementById("ecran-item");
  var baraProgresUmplere = document.getElementById("bara-progres-umplere");
  var contorItem = document.getElementById("contor-item");
  var numeCategorie = document.getElementById("nume-categorie");
  var etichetaRisc = document.getElementById("eticheta-risc");
  var textCerinta = document.getElementById("text-cerinta");
  var butonOk = document.getElementById("buton-ok");
  var butonNok = document.getElementById("buton-nok");
  var butonNa = document.getElementById("buton-na");
  var formularNok = document.getElementById("formular-nok");
  var formularNa = document.getElementById("formular-na");
  var nokGasit = document.getElementById("nok-gasit");
  var nokActiune = document.getElementById("nok-actiune");
  var nokActiuneNecesara = document.getElementById("nok-actiune-necesara");
  var nokResponsabil = document.getElementById("nok-responsabil");
  var nokTermen = document.getElementById("nok-termen");
  var butonSalveazaNok = document.getElementById("buton-salveaza-nok");
  var naMotiv = document.getElementById("na-motiv");
  var butonContinuaNa = document.getElementById("buton-continua-na");
  var butonInapoi = document.getElementById("buton-inapoi");

  // ecran final
  var ecranFinal = document.getElementById("ecran-final");
  var butonInapoiFinal = document.getElementById("buton-inapoi-final");

  // ecran audituri salvate
  var ecranAudituriSalvate = document.getElementById("ecran-audituri-salvate");
  var listaAudituri = document.getElementById("lista-audituri");
  var butonInapoiAudituri = document.getElementById("buton-inapoi-audituri");

  // ---------- pornire ----------

  function init() {
    incarcaPreferinte();
    actualizeazaDataOra();
    setInterval(actualizeazaDataOra, 30000);

    grupSchimb.addEventListener("click", pePeClicSchimb);
    butonIncepe.addEventListener("click", peClicIncepe);
    butonContinua.addEventListener("click", function () {
      if (auditNefinalizatRecent) deschideAudit(auditNefinalizatRecent);
    });
    butonAudituriSalvate.addEventListener("click", function () {
      ecranStart.hidden = true;
      ecranAudituriSalvate.hidden = false;
      randeazaListaAudituri();
    });
    butonInapoiAudituri.addEventListener("click", function () {
      ecranAudituriSalvate.hidden = true;
      ecranStart.hidden = false;
      verificaAudituriExistente();
    });

    inputAria.addEventListener("input", curataInvalid);
    inputMasina.addEventListener("input", curataInvalid);
    inputPn.addEventListener("input", curataInvalid);
    inputAuditor.addEventListener("input", curataInvalid);

    butonOk.addEventListener("click", function () { peClicStatus("OK"); });
    butonNok.addEventListener("click", function () { peClicStatus("NOK"); });
    butonNa.addEventListener("click", function () { peClicStatus("N/A"); });
    butonSalveazaNok.addEventListener("click", salveazaNok);
    butonContinuaNa.addEventListener("click", salveazaNa);
    butonInapoi.addEventListener("click", itemAnterior);
    butonInapoiFinal.addEventListener("click", function () {
      ecranFinal.hidden = true;
      ecranItem.hidden = false;
      indexCurent = itemi.length - 1;
      randeazaItem(indexCurent);
    });

    nokGasit.addEventListener("input", curataInvalid);
    nokActiune.addEventListener("input", curataInvalid);
    nokActiuneNecesara.addEventListener("input", curataInvalid);
    nokResponsabil.addEventListener("input", curataInvalid);
    nokTermen.addEventListener("input", curataInvalid);
    naMotiv.addEventListener("input", curataInvalid);

    var incarcareChecklist = fetch("data/checklist.json")
      .then(function (raspuns) { return raspuns.json(); })
      .then(function (date) {
        itemi = [];
        date.categorii.forEach(function (categorie) {
          categorie.itemi.forEach(function (item) {
            itemi.push({
              nr: item.nr,
              risc: item.risc,
              cerinta: item.cerinta,
              categorie: categorie.nume
            });
          });
        });
      })
      .catch(function (eroare) {
        alert("Nu s-a putut incarca checklistul (data/checklist.json). Verifica ca pornesti aplicatia printr-un server local, nu direct din fisier.");
        console.error(eroare);
      });

    var deschidereDB = deschideBazaDeDate()
      .then(function (db) { bazaDate = db; })
      .catch(function (eroare) {
        console.error("Nu s-a putut deschide baza de date locala", eroare);
      });

    Promise.all([incarcareChecklist, deschidereDB]).then(function () {
      verificaAudituriExistente();
    });
  }

  function actualizeazaDataOra() {
    dataOraAuto.textContent = formatDataOra(new Date().toISOString());
  }

  function doiDigiti(numar) {
    return numar < 10 ? "0" + numar : "" + numar;
  }

  function formatDataOra(isoString) {
    var data = new Date(isoString);
    var zi = doiDigiti(data.getDate());
    var luna = doiDigiti(data.getMonth() + 1);
    var an = data.getFullYear();
    var ora = doiDigiti(data.getHours());
    var minut = doiDigiti(data.getMinutes());
    return zi + "." + luna + "." + an + " " + ora + ":" + minut;
  }

  function formatOraScurta(isoString) {
    var data = new Date(isoString);
    return doiDigiti(data.getHours()) + ":" + doiDigiti(data.getMinutes());
  }

  // ---------- IndexedDB ----------

  function deschideBazaDeDate() {
    return new Promise(function (resolve, reject) {
      var cerere = indexedDB.open(NUME_BAZA_DATE, 1);
      cerere.onupgradeneeded = function (eveniment) {
        var db = eveniment.target.result;
        if (!db.objectStoreNames.contains(NUME_MAGAZIE)) {
          db.createObjectStore(NUME_MAGAZIE, { keyPath: "id", autoIncrement: true });
        }
      };
      cerere.onsuccess = function () { resolve(cerere.result); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function adaugaAudit(record) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE, "readwrite");
      var cerere = tx.objectStore(NUME_MAGAZIE).add(record);
      cerere.onsuccess = function () { resolve(cerere.result); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function actualizeazaAudit(record) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE, "readwrite");
      var cerere = tx.objectStore(NUME_MAGAZIE).put(record);
      cerere.onsuccess = function () { resolve(); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function obtineToateAudituri() {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE, "readonly");
      var cerere = tx.objectStore(NUME_MAGAZIE).getAll();
      cerere.onsuccess = function () { resolve(cerere.result); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function stergeAudit(id) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE, "readwrite");
      var cerere = tx.objectStore(NUME_MAGAZIE).delete(id);
      cerere.onsuccess = function () { resolve(); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function pruneazaAudituriVechi() {
    return obtineToateAudituri().then(function (toate) {
      if (toate.length <= LIMITA_AUDITURI_PASTRATE) return;
      toate.sort(function (a, b) { return new Date(a.dataStart) - new Date(b.dataStart); });
      var deSters = toate.slice(0, toate.length - LIMITA_AUDITURI_PASTRATE);
      return Promise.all(deSters.map(function (a) { return stergeAudit(a.id); }));
    });
  }

  function verificaAudituriExistente() {
    if (!bazaDate) return;
    obtineToateAudituri().then(function (toate) {
      var nefinalizate = toate.filter(function (a) { return !a.finalizat; });
      if (nefinalizate.length > 0) {
        nefinalizate.sort(function (a, b) { return new Date(b.dataUltimaModificare) - new Date(a.dataUltimaModificare); });
        auditNefinalizatRecent = nefinalizate[0];
        continuaOra.textContent = formatOraScurta(auditNefinalizatRecent.dataUltimaModificare);
        butonContinua.hidden = false;
      } else {
        auditNefinalizatRecent = null;
        butonContinua.hidden = true;
      }
      butonAudituriSalvate.hidden = toate.length === 0;
    });
  }

  function salveazaProgresInDB() {
    if (!auditCurent || !auditCurent.id) return;
    var finalizat = raspunsuri.every(function (r) { return r !== null; });
    actualizeazaAudit({
      id: auditCurent.id,
      aria: auditCurent.aria,
      masina: auditCurent.masina,
      pn: auditCurent.pn,
      schimb: auditCurent.schimb,
      auditor: auditCurent.auditor,
      dataStart: auditCurent.dataStart,
      dataUltimaModificare: new Date().toISOString(),
      raspunsuri: raspunsuri,
      finalizat: finalizat
    }).catch(function (eroare) {
      console.error("Nu s-a putut salva progresul auditului", eroare);
    });
  }

  // ---------- preferinte (localStorage) ----------

  function incarcaPreferinte() {
    var bruta = localStorage.getItem(CHEIE_PREFERINTE);
    if (!bruta) return;
    try {
      var preferinte = JSON.parse(bruta);
      if (preferinte.aria) inputAria.value = preferinte.aria;
      if (preferinte.masina) inputMasina.value = preferinte.masina;
      if (preferinte.auditor) inputAuditor.value = preferinte.auditor;
    } catch (eroare) {
      console.error("Preferinte invalide in localStorage", eroare);
    }
  }

  function salveazaPreferinte() {
    var preferinte = {
      aria: inputAria.value.trim(),
      masina: inputMasina.value.trim(),
      auditor: inputAuditor.value.trim()
    };
    localStorage.setItem(CHEIE_PREFERINTE, JSON.stringify(preferinte));
  }

  // ---------- ecran start ----------

  function pePeClicSchimb(eveniment) {
    var buton = eveniment.target.closest(".buton-optiune");
    if (!buton) return;
    schimbSelectat = buton.getAttribute("data-schimb");
    var toateButoanele = grupSchimb.querySelectorAll(".buton-optiune");
    toateButoanele.forEach(function (b) {
      b.classList.remove("selectat");
      b.classList.remove("invalid");
    });
    buton.classList.add("selectat");
  }

  function curataInvalid(eveniment) {
    eveniment.target.classList.remove("invalid");
  }

  function peClicIncepe() {
    var valid = true;

    if (!inputAria.value.trim()) { inputAria.classList.add("invalid"); valid = false; }
    if (!inputMasina.value.trim()) { inputMasina.classList.add("invalid"); valid = false; }
    if (!inputPn.value.trim()) { inputPn.classList.add("invalid"); valid = false; }
    if (!inputAuditor.value.trim()) { inputAuditor.classList.add("invalid"); valid = false; }
    if (!schimbSelectat) {
      grupSchimb.querySelectorAll(".buton-optiune").forEach(function (b) {
        b.classList.add("invalid");
      });
      valid = false;
    }

    if (!valid) return;

    if (itemi.length === 0) {
      alert("Checklistul inca se incarca sau nu a putut fi citit. Mai asteapta o clipa si incearca din nou.");
      return;
    }

    if (!bazaDate) {
      alert("Memoria telefonului inca se initializeaza. Mai asteapta o clipa si incearca din nou.");
      return;
    }

    salveazaPreferinte();

    var acum = new Date().toISOString();
    var recordNou = {
      aria: inputAria.value.trim(),
      masina: inputMasina.value.trim(),
      pn: inputPn.value.trim(),
      schimb: schimbSelectat,
      auditor: inputAuditor.value.trim(),
      dataStart: acum,
      dataUltimaModificare: acum,
      raspunsuri: itemi.map(function () { return null; }),
      finalizat: false
    };

    adaugaAudit(recordNou).then(function (idNou) {
      auditCurent = {
        id: idNou,
        aria: recordNou.aria,
        masina: recordNou.masina,
        pn: recordNou.pn,
        schimb: recordNou.schimb,
        auditor: recordNou.auditor,
        dataStart: recordNou.dataStart
      };
      raspunsuri = recordNou.raspunsuri;
      indexCurent = 0;

      ecranStart.hidden = true;
      ecranItem.hidden = false;
      randeazaItem(indexCurent);

      pruneazaAudituriVechi();
    }).catch(function (eroare) {
      console.error(eroare);
      alert("Nu s-a putut salva auditul in memoria telefonului. Incearca din nou.");
    });
  }

  // ---------- deschiderea unui audit existent ----------

  function deschideAudit(record) {
    auditCurent = {
      id: record.id,
      aria: record.aria,
      masina: record.masina,
      pn: record.pn,
      schimb: record.schimb,
      auditor: record.auditor,
      dataStart: record.dataStart
    };
    raspunsuri = record.raspunsuri.slice();

    var indexNecompletat = raspunsuri.findIndex(function (r) { return r === null; });
    indexCurent = indexNecompletat === -1 ? 0 : indexNecompletat;

    ecranStart.hidden = true;
    ecranAudituriSalvate.hidden = true;
    ecranFinal.hidden = true;
    ecranItem.hidden = false;
    randeazaItem(indexCurent);
  }

  // ---------- ecran item ----------

  function randeazaItem(index) {
    var item = itemi[index];

    baraProgresUmplere.style.width = Math.round(((index + 1) / itemi.length) * 100) + "%";
    contorItem.textContent = "Item " + (index + 1) + " din " + itemi.length;
    numeCategorie.textContent = item.categorie;
    textCerinta.textContent = item.cerinta;

    etichetaRisc.className = "eticheta-risc " + item.risc.toLowerCase();
    etichetaRisc.textContent = item.risc.toUpperCase();

    ascundeFormulare();
    marcheazaStatusSelectat(null);

    var raspunsExistent = raspunsuri[index];
    if (raspunsExistent) {
      marcheazaStatusSelectat(raspunsExistent.status);
      if (raspunsExistent.status === "NOK") {
        afiseazaFormularNok(raspunsExistent);
      } else if (raspunsExistent.status === "N/A") {
        afiseazaFormularNa(raspunsExistent);
      }
    }

    butonInapoi.disabled = index === 0;
  }

  function marcheazaStatusSelectat(status) {
    butonOk.classList.toggle("selectat", status === "OK");
    butonNok.classList.toggle("selectat", status === "NOK");
    butonNa.classList.toggle("selectat", status === "N/A");
  }

  function ascundeFormulare() {
    formularNok.hidden = true;
    formularNa.hidden = true;
  }

  function peClicStatus(status) {
    if (status === "OK") {
      raspunsuri[indexCurent] = { status: "OK" };
      mergiUrmatorul();
      return;
    }

    if (status === "NOK") {
      marcheazaStatusSelectat("NOK");
      afiseazaFormularNok(raspunsuri[indexCurent]);
      return;
    }

    if (status === "N/A") {
      marcheazaStatusSelectat("N/A");
      afiseazaFormularNa(raspunsuri[indexCurent]);
      return;
    }
  }

  function afiseazaFormularNok(raspunsExistent) {
    formularNa.hidden = true;
    formularNok.hidden = false;
    nokGasit.value = (raspunsExistent && raspunsExistent.gasit) || "";
    nokActiune.value = (raspunsExistent && raspunsExistent.actiune) || "";
    nokActiuneNecesara.value = (raspunsExistent && raspunsExistent.actiuneNecesara) || "";
    nokResponsabil.value = (raspunsExistent && raspunsExistent.responsabil) || "";
    nokTermen.value = (raspunsExistent && raspunsExistent.termen) || "";
  }

  function afiseazaFormularNa(raspunsExistent) {
    formularNok.hidden = true;
    formularNa.hidden = false;
    naMotiv.value = (raspunsExistent && raspunsExistent.motivNA) || "";
  }

  function salveazaNok() {
    var valid = true;
    if (!nokGasit.value.trim()) { nokGasit.classList.add("invalid"); valid = false; }
    if (!nokActiune.value.trim()) { nokActiune.classList.add("invalid"); valid = false; }
    if (!nokActiuneNecesara.value.trim()) { nokActiuneNecesara.classList.add("invalid"); valid = false; }
    if (!nokResponsabil.value.trim()) { nokResponsabil.classList.add("invalid"); valid = false; }
    if (!nokTermen.value) { nokTermen.classList.add("invalid"); valid = false; }
    if (!valid) return;

    raspunsuri[indexCurent] = {
      status: "NOK",
      gasit: nokGasit.value.trim(),
      actiune: nokActiune.value.trim(),
      actiuneNecesara: nokActiuneNecesara.value.trim(),
      responsabil: nokResponsabil.value.trim(),
      termen: nokTermen.value
    };
    mergiUrmatorul();
  }

  function salveazaNa() {
    if (!naMotiv.value.trim()) {
      naMotiv.classList.add("invalid");
      return;
    }
    raspunsuri[indexCurent] = {
      status: "N/A",
      motivNA: naMotiv.value.trim()
    };
    mergiUrmatorul();
  }

  function mergiUrmatorul() {
    salveazaProgresInDB();
    if (indexCurent + 1 >= itemi.length) {
      ecranItem.hidden = true;
      ecranFinal.hidden = false;
      return;
    }
    indexCurent++;
    randeazaItem(indexCurent);
  }

  function itemAnterior() {
    if (indexCurent === 0) return;
    indexCurent--;
    randeazaItem(indexCurent);
  }

  // ---------- ecran audituri salvate ----------

  function randeazaListaAudituri() {
    listaAudituri.innerHTML = "";

    if (!bazaDate) return;

    obtineToateAudituri().then(function (toate) {
      if (toate.length === 0) {
        var gol = document.createElement("div");
        gol.className = "text-gol";
        gol.textContent = "Nu exista audituri salvate.";
        listaAudituri.appendChild(gol);
        return;
      }

      toate.sort(function (a, b) { return new Date(b.dataUltimaModificare) - new Date(a.dataUltimaModificare); });

      toate.forEach(function (audit) {
        listaAudituri.appendChild(construiesteRandAudit(audit));
      });
    });
  }

  function construiesteRandAudit(audit) {
    var completate = audit.raspunsuri.filter(function (r) { return r !== null; }).length;
    var total = audit.raspunsuri.length;

    var rand = document.createElement("div");
    rand.className = "rand-audit";

    var info = document.createElement("div");
    info.className = "rand-audit-info";

    var titlu = document.createElement("div");
    titlu.className = "rand-audit-titlu";
    titlu.textContent = audit.aria + " - " + audit.masina;

    var detalii = document.createElement("div");
    detalii.className = "rand-audit-detalii" + (audit.finalizat ? " finalizat" : "");
    detalii.textContent = formatDataOra(audit.dataUltimaModificare) + " - " + completate + "/" + total +
      (audit.finalizat ? " - Finalizat" : "");

    info.appendChild(titlu);
    info.appendChild(detalii);

    var actiuni = document.createElement("div");
    actiuni.className = "rand-audit-actiuni";

    var butonDeschide = document.createElement("button");
    butonDeschide.type = "button";
    butonDeschide.className = "buton-deschide";
    butonDeschide.textContent = "Deschide";
    butonDeschide.addEventListener("click", function () { deschideAudit(audit); });

    var zonaSterge = document.createElement("div");
    zonaSterge.className = "zona-sterge";
    randeazaButonStergeInitial(zonaSterge, audit.id);

    actiuni.appendChild(butonDeschide);
    actiuni.appendChild(zonaSterge);

    rand.appendChild(info);
    rand.appendChild(actiuni);

    return rand;
  }

  function randeazaButonStergeInitial(zona, id) {
    zona.innerHTML = "";
    var buton = document.createElement("button");
    buton.type = "button";
    buton.className = "buton-sterge";
    buton.textContent = "Sterge";
    buton.addEventListener("click", function () {
      randeazaConfirmareStergere(zona, id);
    });
    zona.appendChild(buton);
  }

  function randeazaConfirmareStergere(zona, id) {
    zona.innerHTML = "";

    var butonNu = document.createElement("button");
    butonNu.type = "button";
    butonNu.className = "buton-sterge-nu";
    butonNu.textContent = "Nu";

    var butonDa = document.createElement("button");
    butonDa.type = "button";
    butonDa.className = "buton-sterge-da";
    butonDa.textContent = "Da";

    var timeoutRevenire = setTimeout(function () {
      randeazaButonStergeInitial(zona, id);
    }, TIMP_REVENIRE_STERGERE_MS);

    butonNu.addEventListener("click", function () {
      clearTimeout(timeoutRevenire);
      randeazaButonStergeInitial(zona, id);
    });

    butonDa.addEventListener("click", function () {
      clearTimeout(timeoutRevenire);
      stergeAudit(id).then(function () {
        randeazaListaAudituri();
        verificaAudituriExistente();
      });
    });

    zona.appendChild(butonNu);
    zona.appendChild(butonDa);
  }

  init();
})();

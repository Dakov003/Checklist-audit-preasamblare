// Aplicatie audit preasamblare - Etapa 2
// Fara backend, fara framework. Auditul curent se salveaza in IndexedDB dupa
// fiecare item. Doar cateva preferinte mici (aria, masina, auditor) stau in
// localStorage. Fara poze, fara PDF, fara offline (vin in etapele urmatoare).

(function () {
  "use strict";

  var CHEIE_PREFERINTE = "auditPreferinte";
  var NUME_BAZA_DATE = "auditPreasamblareDB";
  var VERSIUNE_BAZA_DATE = 2;
  var NUME_MAGAZIE = "audituri";
  var NUME_MAGAZIE_POZE = "poze";
  var LIMITA_AUDITURI_PASTRATE = 50;
  var TIMP_REVENIRE_STERGERE_MS = 5000;
  var LATURA_MAXIMA_POZA = 1280;
  var CALITATE_JPEG_POZA = 0.7;
  var LIMITA_POZE_PER_ITEM = 3;
  var DELIMITATOR_CSV = ";";

  // stare aplicatie
  var itemi = [];        // lista plata: { nr, risc, cerinta, categorie }
  var raspunsuri = [];   // paralela cu itemi: null sau obiect de raspuns
  var indexCurent = 0;
  var schimbSelectat = null;
  var bazaDate = null;
  var auditCurent = null;          // { id, aria, masina, pn, schimb, auditor, dataStart }
  var auditNefinalizatRecent = null;
  var semnaturaCurenta = null;     // data URL PNG sau null
  var primulNecompletatIndex = null;
  var desenandSemnatura = false;
  var urlPozeActive = [];          // object URL-uri create pentru miniaturile curente
  var librariiPdfIncarcate = false;
  var promisiuneLibrariiPdf = null;

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
  var pozePreview = document.getElementById("poze-preview");
  var inputPoza = document.getElementById("input-poza");
  var butonAdaugaPoza = document.getElementById("buton-adauga-poza");
  var butonSalveazaNok = document.getElementById("buton-salveaza-nok");
  var naMotiv = document.getElementById("na-motiv");
  var butonContinuaNa = document.getElementById("buton-continua-na");
  var butonInapoi = document.getElementById("buton-inapoi");
  var butonSumar = document.getElementById("buton-sumar");

  // ecran sumar
  var ecranSumar = document.getElementById("ecran-sumar");
  var verdictMare = document.getElementById("verdict-mare");
  var avertizareNecompletate = document.getElementById("avertizare-necompletate");
  var textAvertizareNecompletate = document.getElementById("text-avertizare-necompletate");
  var butonSariNecompletat = document.getElementById("buton-sari-necompletat");
  var contorTotal = document.getElementById("contor-total");
  var contorOk = document.getElementById("contor-ok");
  var contorNok = document.getElementById("contor-nok");
  var contorNa = document.getElementById("contor-na");
  var contorNecompletati = document.getElementById("contor-necompletati");
  var contorNokCritice = document.getElementById("contor-nok-critice");
  var contorNokMajorMinor = document.getElementById("contor-nok-major-minor");
  var listaCategorii = document.getElementById("lista-categorii");
  var listaNok = document.getElementById("lista-nok");
  var canvasSemnatura = document.getElementById("canvas-semnatura");
  var ctxSemnatura = canvasSemnatura.getContext("2d");
  var butonStergeSemnatura = document.getElementById("buton-sterge-semnatura");
  var butonTrimite = document.getElementById("buton-trimite");
  var butonDescarcaPdf = document.getElementById("buton-descarca-pdf");
  var butonExportCsv = document.getElementById("buton-export-csv");
  var butonInapoiSumar = document.getElementById("buton-inapoi-sumar");

  // ecran audituri salvate
  var ecranAudituriSalvate = document.getElementById("ecran-audituri-salvate");
  var listaAudituri = document.getElementById("lista-audituri");
  var butonInapoiAudituri = document.getElementById("buton-inapoi-audituri");

  // ---------- pornire ----------

  function init() {
    inregistreazaServiceWorker();
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
    butonSumar.addEventListener("click", deschideSumar);
    butonInapoiSumar.addEventListener("click", function () {
      ecranSumar.hidden = true;
      ecranItem.hidden = false;
      randeazaItem(indexCurent);
    });
    butonSariNecompletat.addEventListener("click", function () {
      if (primulNecompletatIndex === null) return;
      ecranSumar.hidden = true;
      ecranItem.hidden = false;
      indexCurent = primulNecompletatIndex;
      randeazaItem(indexCurent);
    });

    nokGasit.addEventListener("input", curataInvalid);
    nokActiune.addEventListener("input", curataInvalid);
    nokActiuneNecesara.addEventListener("input", curataInvalid);
    nokResponsabil.addEventListener("input", curataInvalid);
    nokTermen.addEventListener("input", curataInvalid);
    naMotiv.addEventListener("input", curataInvalid);

    butonAdaugaPoza.addEventListener("click", function () { inputPoza.click(); });
    inputPoza.addEventListener("change", peSchimbareInputPoza);

    butonTrimite.addEventListener("click", peClicTrimite);
    butonDescarcaPdf.addEventListener("click", peClicDescarcaPdf);
    butonExportCsv.addEventListener("click", peClicExportCsv);

    initializeazaSemnatura();

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

  function inregistreazaServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(function (eroare) {
      console.error("Nu s-a putut inregistra service worker-ul", eroare);
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
      var cerere = indexedDB.open(NUME_BAZA_DATE, VERSIUNE_BAZA_DATE);
      cerere.onupgradeneeded = function (eveniment) {
        var db = eveniment.target.result;
        if (!db.objectStoreNames.contains(NUME_MAGAZIE)) {
          db.createObjectStore(NUME_MAGAZIE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(NUME_MAGAZIE_POZE)) {
          var magaziePoze = db.createObjectStore(NUME_MAGAZIE_POZE, { keyPath: "id", autoIncrement: true });
          magaziePoze.createIndex("auditId", "auditId", { unique: false });
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
      return Promise.all(deSters.map(function (a) {
        return Promise.all([stergeAudit(a.id), stergePozeAudit(a.id)]);
      }));
    });
  }

  // ---------- IndexedDB - poze (magazie separata, ca salvarea unui simplu
  // OK sa nu rescrie de fiecare data toate pozele acumulate) ----------

  function adaugaPoza(record) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE_POZE, "readwrite");
      var cerere = tx.objectStore(NUME_MAGAZIE_POZE).add(record);
      cerere.onsuccess = function () { resolve(cerere.result); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function obtinePozeAudit(auditId) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE_POZE, "readonly");
      var index = tx.objectStore(NUME_MAGAZIE_POZE).index("auditId");
      var cerere = index.getAll(auditId);
      cerere.onsuccess = function () { resolve(cerere.result); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function obtinePozeItem(auditId, itemIndex) {
    return obtinePozeAudit(auditId).then(function (toate) {
      return toate.filter(function (p) { return p.itemIndex === itemIndex; });
    });
  }

  function stergePoza(id) {
    return new Promise(function (resolve, reject) {
      var tx = bazaDate.transaction(NUME_MAGAZIE_POZE, "readwrite");
      var cerere = tx.objectStore(NUME_MAGAZIE_POZE).delete(id);
      cerere.onsuccess = function () { resolve(); };
      cerere.onerror = function () { reject(cerere.error); };
    });
  }

  function stergePozeAudit(auditId) {
    return obtinePozeAudit(auditId).then(function (poze) {
      return Promise.all(poze.map(function (p) { return stergePoza(p.id); }));
    });
  }

  function comprimaImagine(fisier) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(fisier);
      var imagine = new Image();

      imagine.onload = function () {
        var latimeOriginala = imagine.naturalWidth;
        var inaltimeOriginala = imagine.naturalHeight;
        var laturaMaxima = Math.max(latimeOriginala, inaltimeOriginala);
        var scala = laturaMaxima > LATURA_MAXIMA_POZA ? LATURA_MAXIMA_POZA / laturaMaxima : 1;
        var latimeFinala = Math.round(latimeOriginala * scala);
        var inaltimeFinala = Math.round(inaltimeOriginala * scala);

        var canvas = document.createElement("canvas");
        canvas.width = latimeFinala;
        canvas.height = inaltimeFinala;
        canvas.getContext("2d").drawImage(imagine, 0, 0, latimeFinala, inaltimeFinala);

        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob); else reject(new Error("Compresie esuata"));
        }, "image/jpeg", CALITATE_JPEG_POZA);
      };

      imagine.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Nu s-a putut citi imaginea"));
      };

      imagine.src = url;
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
      finalizat: finalizat,
      semnatura: semnaturaCurenta
    }).catch(function (eroare) {
      console.error("Nu s-a putut salva progresul auditului", eroare);
    });
  }

  function salveazaSemnaturaInDB(dataUrlSauNull) {
    semnaturaCurenta = dataUrlSauNull;
    salveazaProgresInDB();
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
      finalizat: false,
      semnatura: null
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
      semnaturaCurenta = null;
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
    semnaturaCurenta = record.semnatura || null;

    ecranStart.hidden = true;
    ecranAudituriSalvate.hidden = true;

    var indexNecompletat = raspunsuri.findIndex(function (r) { return r === null; });
    if (indexNecompletat === -1) {
      indexCurent = itemi.length - 1;
      deschideSumar();
    } else {
      indexCurent = indexNecompletat;
      ecranItem.hidden = false;
      randeazaItem(indexCurent);
    }
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
    randeazaPozePentruItemCurent();
  }

  function randeazaPozePentruItemCurent() {
    urlPozeActive.forEach(function (url) { URL.revokeObjectURL(url); });
    urlPozeActive = [];
    pozePreview.innerHTML = "";

    if (!auditCurent || !auditCurent.id) {
      butonAdaugaPoza.hidden = false;
      return;
    }

    obtinePozeItem(auditCurent.id, indexCurent).then(function (poze) {
      poze.forEach(function (poza) {
        var url = URL.createObjectURL(poza.blob);
        urlPozeActive.push(url);

        var miniatura = document.createElement("div");
        miniatura.className = "miniatura-poza";

        var img = document.createElement("img");
        img.src = url;

        var butonSterge = document.createElement("button");
        butonSterge.type = "button";
        butonSterge.className = "buton-sterge-poza";
        butonSterge.setAttribute("aria-label", "Sterge poza");
        butonSterge.textContent = "×";
        butonSterge.addEventListener("click", function () {
          stergePoza(poza.id).then(randeazaPozePentruItemCurent);
        });

        miniatura.appendChild(img);
        miniatura.appendChild(butonSterge);
        pozePreview.appendChild(miniatura);
      });

      butonAdaugaPoza.hidden = poze.length >= LIMITA_POZE_PER_ITEM;
    });
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

  function peSchimbareInputPoza() {
    var fisier = inputPoza.files && inputPoza.files[0];
    inputPoza.value = "";
    if (!fisier || !auditCurent || !auditCurent.id) return;

    comprimaImagine(fisier).then(function (blob) {
      return adaugaPoza({ auditId: auditCurent.id, itemIndex: indexCurent, blob: blob });
    }).then(function () {
      randeazaPozePentruItemCurent();
    }).catch(function (eroare) {
      console.error("Nu s-a putut adauga poza", eroare);
      alert("Poza nu a putut fi adaugata. Incearca din nou.");
    });
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
      deschideSumar();
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

  // ---------- ecran sumar ----------

  function deschideSumar() {
    ecranStart.hidden = true;
    ecranAudituriSalvate.hidden = true;
    ecranItem.hidden = true;
    ecranSumar.hidden = false;
    redaSemnatura();
    randeazaSumar();
  }

  function calculeazaSumar() {
    var ok = 0, nok = 0, na = 0, nokCritice = 0, nokMajor = 0, nokMinor = 0;
    var listaNokCalculata = [];
    var necompletateIndex = [];
    var categoriiMap = {};
    var ordineCategorii = [];

    itemi.forEach(function (item, index) {
      if (!categoriiMap[item.categorie]) {
        categoriiMap[item.categorie] = { nume: item.categorie, total: 0, ok: 0, nok: 0, na: 0 };
        ordineCategorii.push(item.categorie);
      }
      var cat = categoriiMap[item.categorie];
      cat.total++;

      var raspuns = raspunsuri[index];
      if (!raspuns) {
        necompletateIndex.push(index);
        return;
      }

      if (raspuns.status === "OK") {
        ok++;
        cat.ok++;
      } else if (raspuns.status === "NOK") {
        nok++;
        cat.nok++;
        if (item.risc === "Critic") nokCritice++;
        else if (item.risc === "Major") nokMajor++;
        else nokMinor++;
        listaNokCalculata.push({
          nr: item.nr,
          indexItem: index,
          cerinta: item.cerinta,
          gasit: raspuns.gasit,
          actiune: raspuns.actiune,
          actiuneNecesara: raspuns.actiuneNecesara,
          responsabil: raspuns.responsabil,
          termen: raspuns.termen
        });
      } else if (raspuns.status === "N/A") {
        na++;
        cat.na++;
      }
    });

    var bazaCalcul = ok + nok;
    var procent = bazaCalcul === 0 ? 0 : ok / bazaCalcul;

    var verdict;
    if (bazaCalcul === 0) {
      verdict = "NEEVALUAT";
    } else if (nokCritice > 0) {
      verdict = "BLOCAT";
    } else if (procent >= 0.95) {
      verdict = "CONFORM";
    } else if (procent >= 0.85) {
      verdict = "CONFORM CU OBSERVATII";
    } else {
      verdict = "NECONFORM";
    }

    var categorii = ordineCategorii.map(function (nume) {
      var cat = categoriiMap[nume];
      var catBaza = cat.ok + cat.nok;
      return {
        nume: nume,
        total: cat.total,
        ok: cat.ok,
        nok: cat.nok,
        na: cat.na,
        necompletat: cat.total - cat.ok - cat.nok - cat.na,
        procent: catBaza === 0 ? 0 : cat.ok / catBaza
      };
    });

    return {
      total: itemi.length,
      ok: ok,
      nok: nok,
      na: na,
      necompletati: necompletateIndex.length,
      primulNecompletat: necompletateIndex.length > 0 ? necompletateIndex[0] : null,
      nokCritice: nokCritice,
      nokMajor: nokMajor,
      nokMinor: nokMinor,
      procent: procent,
      verdict: verdict,
      categorii: categorii,
      listaNok: listaNokCalculata
    };
  }

  function claseVerdict(verdict) {
    if (verdict === "NEEVALUAT") return "neevaluat";
    if (verdict === "BLOCAT") return "blocat";
    if (verdict === "CONFORM") return "conform";
    if (verdict === "CONFORM CU OBSERVATII") return "conform-observatii";
    return "neconform";
  }

  function formatProcent(fractie) {
    return (fractie * 100).toFixed(1) + "%";
  }

  function formatDataScurta(dataISO) {
    if (!dataISO) return "-";
    var parti = dataISO.split("-");
    if (parti.length !== 3) return dataISO;
    return parti[2] + "." + parti[1] + "." + parti[0];
  }

  function trunchiazaText(text, maxim) {
    if (!text || text.length <= maxim) return text || "";
    return text.slice(0, maxim - 1).trim() + "...";
  }

  function randeazaSumar() {
    var sumar = calculeazaSumar();
    primulNecompletatIndex = sumar.primulNecompletat;

    verdictMare.className = "verdict-mare " + claseVerdict(sumar.verdict);
    verdictMare.textContent = sumar.verdict === "NEEVALUAT"
      ? sumar.verdict
      : sumar.verdict + " (" + formatProcent(sumar.procent) + ")";

    if (sumar.necompletati > 0) {
      avertizareNecompletate.hidden = false;
      textAvertizareNecompletate.textContent = "Au ramas " + sumar.necompletati + " itemi necompletati.";
    } else {
      avertizareNecompletate.hidden = true;
    }

    contorTotal.textContent = sumar.total;
    contorOk.textContent = sumar.ok;
    contorNok.textContent = sumar.nok;
    contorNa.textContent = sumar.na;
    contorNecompletati.textContent = sumar.necompletati;
    contorNokCritice.textContent = sumar.nokCritice;
    contorNokMajorMinor.textContent = sumar.nokMajor + " / " + sumar.nokMinor;

    listaCategorii.innerHTML = "";
    sumar.categorii.forEach(function (cat) {
      var rand = document.createElement("div");
      rand.className = "rand-categorie";

      var titlu = document.createElement("div");
      titlu.className = "rand-categorie-titlu";
      titlu.textContent = cat.nume;

      var detalii = document.createElement("div");
      detalii.className = "rand-categorie-detalii";
      detalii.textContent = "Total " + cat.total + " - OK " + cat.ok + " - NOK " + cat.nok +
        " - N/A " + cat.na + " - Necompletat " + cat.necompletat + " - " + formatProcent(cat.procent);

      rand.appendChild(titlu);
      rand.appendChild(detalii);
      listaCategorii.appendChild(rand);
    });

    listaNok.innerHTML = "";
    if (sumar.listaNok.length === 0) {
      var gol = document.createElement("div");
      gol.className = "text-gol";
      gol.textContent = "Niciun NOK inregistrat.";
      listaNok.appendChild(gol);
    } else {
      sumar.listaNok.forEach(function (nokItem) {
        var rand = document.createElement("div");
        rand.className = "rand-nok";

        var titlu = document.createElement("div");
        titlu.className = "rand-nok-titlu";
        titlu.textContent = "Nr. " + nokItem.nr + " - " + trunchiazaText(nokItem.cerinta, 70);

        var detalii = document.createElement("div");
        detalii.className = "rand-nok-detalii";
        detalii.textContent = "Responsabil: " + (nokItem.responsabil || "-") +
          " - Termen: " + formatDataScurta(nokItem.termen);

        rand.appendChild(titlu);
        rand.appendChild(detalii);
        listaNok.appendChild(rand);
      });
    }
  }

  // ---------- semnatura ----------

  function initializeazaSemnatura() {
    ctxSemnatura.lineWidth = 2.5;
    ctxSemnatura.lineCap = "round";
    ctxSemnatura.strokeStyle = "#111111";

    canvasSemnatura.addEventListener("pointerdown", function (eveniment) {
      desenandSemnatura = true;
      var pozitie = pozitieInCanvas(eveniment);
      ctxSemnatura.beginPath();
      ctxSemnatura.moveTo(pozitie.x, pozitie.y);
      canvasSemnatura.setPointerCapture(eveniment.pointerId);
    });

    canvasSemnatura.addEventListener("pointermove", function (eveniment) {
      if (!desenandSemnatura) return;
      var pozitie = pozitieInCanvas(eveniment);
      ctxSemnatura.lineTo(pozitie.x, pozitie.y);
      ctxSemnatura.stroke();
    });

    canvasSemnatura.addEventListener("pointerup", opresteDesenSemnatura);
    canvasSemnatura.addEventListener("pointercancel", opresteDesenSemnatura);

    butonStergeSemnatura.addEventListener("click", function () {
      ctxSemnatura.clearRect(0, 0, canvasSemnatura.width, canvasSemnatura.height);
      salveazaSemnaturaInDB(null);
    });
  }

  function pozitieInCanvas(eveniment) {
    var dreptunghi = canvasSemnatura.getBoundingClientRect();
    var scaleX = canvasSemnatura.width / dreptunghi.width;
    var scaleY = canvasSemnatura.height / dreptunghi.height;
    return {
      x: (eveniment.clientX - dreptunghi.left) * scaleX,
      y: (eveniment.clientY - dreptunghi.top) * scaleY
    };
  }

  function opresteDesenSemnatura() {
    if (!desenandSemnatura) return;
    desenandSemnatura = false;
    salveazaSemnaturaInDB(canvasSemnatura.toDataURL("image/png"));
  }

  function redaSemnatura() {
    ctxSemnatura.clearRect(0, 0, canvasSemnatura.width, canvasSemnatura.height);
    if (!semnaturaCurenta) return;
    var imagine = new Image();
    imagine.onload = function () {
      ctxSemnatura.drawImage(imagine, 0, 0, canvasSemnatura.width, canvasSemnatura.height);
    };
    imagine.src = semnaturaCurenta;
  }

  // ---------- raport PDF si export CSV (Etapa 5) ----------

  function incarcaScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Nu s-a putut incarca " + src)); };
      document.body.appendChild(script);
    });
  }

  function incarcaLibrariiPDF() {
    if (librariiPdfIncarcate) return Promise.resolve();
    if (promisiuneLibrariiPdf) return promisiuneLibrariiPdf;
    promisiuneLibrariiPdf = incarcaScript("lib/jspdf.umd.min.js")
      .then(function () { return incarcaScript("lib/jspdf.plugin.autotable.min.js"); })
      .then(function () { librariiPdfIncarcate = true; });
    return promisiuneLibrariiPdf;
  }

  function blobLaDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var cititor = new FileReader();
      cititor.onload = function () { resolve(cititor.result); };
      cititor.onerror = function () { reject(cititor.error); };
      cititor.readAsDataURL(blob);
    });
  }

  function obtinePozeNokCaDataUrl(auditId, sumar) {
    var pozePerNr = {};
    return Promise.all(sumar.listaNok.map(function (nokItem) {
      return obtinePozeItem(auditId, nokItem.indexItem).then(function (poze) {
        return Promise.all(poze.map(function (p) { return blobLaDataUrl(p.blob); }));
      }).then(function (dataUrls) {
        pozePerNr[nokItem.nr] = dataUrls;
      });
    })).then(function () { return pozePerNr; });
  }

  function culoareVerdictRGB(verdict) {
    if (verdict === "NEEVALUAT") return [117, 117, 117];
    if (verdict === "CONFORM") return [46, 125, 50];
    if (verdict === "CONFORM CU OBSERVATII") return [249, 168, 37];
    return [198, 40, 40]; // BLOCAT sau NECONFORM
  }

  function sanitizeazaPentruNumeFisier(text) {
    return (text || "").trim().replace(/[^a-zA-Z0-9\-]+/g, "_");
  }

  function construiesteNumeDeBaza() {
    var data = new Date(auditCurent.dataStart);
    return "Audit_" + sanitizeazaPentruNumeFisier(auditCurent.aria) + "_" +
      sanitizeazaPentruNumeFisier(auditCurent.masina) + "_" +
      data.getFullYear() + "-" + doiDigiti(data.getMonth() + 1) + "-" + doiDigiti(data.getDate()) +
      "_" + doiDigiti(data.getHours()) + doiDigiti(data.getMinutes());
  }

  function peClicDescarcaPdf() {
    if (!auditCurent || !auditCurent.id) return;
    ruleazaCuButonBlocat(butonDescarcaPdf, "Se genereaza...", function () {
      return incarcaLibrariiPDF()
        .then(function () { return construiesteDocumentRaport(); })
        .then(function (doc) { doc.save(construiesteNumeDeBaza() + ".pdf"); });
    }, "Raportul nu a putut fi generat. Incearca din nou.");
  }

  function peClicTrimite() {
    if (!auditCurent || !auditCurent.id) return;

    if (typeof navigator.share !== "function") {
      alert("Trimiterea directa nu e disponibila pe acest dispozitiv sau browser. Foloseste Descarca PDF.");
      return;
    }

    ruleazaCuButonBlocat(butonTrimite, "Se pregateste...", function () {
      return incarcaLibrariiPDF()
        .then(function () { return construiesteDocumentRaport(); })
        .then(function (doc) {
          var numeFisier = construiesteNumeDeBaza() + ".pdf";
          var blobPdf = doc.output("blob");
          var fisier = new File([blobPdf], numeFisier, { type: "application/pdf" });

          if (!navigator.canShare || !navigator.canShare({ files: [fisier] })) {
            alert("Trimiterea directa nu e disponibila pe acest dispozitiv sau browser. Foloseste Descarca PDF.");
            return;
          }

          return navigator.share({
            files: [fisier],
            title: "Audit " + auditCurent.aria + " " + auditCurent.masina,
            text: "Raport audit preasamblare"
          }).catch(function (eroare) {
            if (eroare && eroare.name === "AbortError") return;
            throw eroare;
          });
        });
    }, "Raportul nu a putut fi trimis. Incearca din nou, sau foloseste Descarca PDF.");
  }

  function ruleazaCuButonBlocat(buton, textInTimpulRularii, actiune, mesajEroare) {
    var textOriginal = buton.textContent;
    buton.disabled = true;
    buton.textContent = textInTimpulRularii;

    actiune()
      .catch(function (eroare) {
        console.error(mesajEroare, eroare);
        alert(mesajEroare);
      })
      .then(function () {
        buton.disabled = false;
        buton.textContent = textOriginal;
      });
  }

  function construiesteDocumentRaport() {
    var sumar = calculeazaSumar();

    return obtinePozeNokCaDataUrl(auditCurent.id, sumar).then(function (pozeNok) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });

      var latimePagina = doc.internal.pageSize.getWidth();
      var inaltimePagina = doc.internal.pageSize.getHeight();
      var margine = 15;
      var latimeUtila = latimePagina - margine * 2;
      var y = margine;

      function verificaPagina(inaltimeNecesara) {
        if (y + inaltimeNecesara > inaltimePagina - margine) {
          doc.addPage();
          y = margine;
        }
      }

      // 1. Antet
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("Audit Preasamblare", margine, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      doc.text("Aria: " + auditCurent.aria + "   Nr. masina: " + auditCurent.masina, margine, y);
      y += 6;
      doc.text("PN: " + auditCurent.pn + "   Schimb: " + auditCurent.schimb, margine, y);
      y += 6;
      doc.text("Auditor: " + auditCurent.auditor, margine, y);
      y += 6;
      doc.text("Data si ora: " + formatDataOra(auditCurent.dataStart), margine, y);
      y += 10;

      // 2. Verdict
      var culoare = culoareVerdictRGB(sumar.verdict);
      doc.setFillColor(culoare[0], culoare[1], culoare[2]);
      doc.rect(margine, y, latimeUtila, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      var textVerdict = sumar.verdict === "NEEVALUAT"
        ? sumar.verdict
        : sumar.verdict + " (" + formatProcent(sumar.procent) + ")";
      doc.text(textVerdict, latimePagina / 2, y + 8, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      y += 20;

      // 3. Tabel sumar
      doc.autoTable({
        startY: y,
        margin: { left: margine, right: margine },
        head: [["Total", "OK", "NOK", "N/A", "Necompletati", "NOK critice", "NOK major/minor"]],
        body: [[sumar.total, sumar.ok, sumar.nok, sumar.na, sumar.necompletati, sumar.nokCritice, sumar.nokMajor + "/" + sumar.nokMinor]],
        theme: "grid",
        styles: { fontSize: 9, halign: "center" }
      });
      y = doc.lastAutoTable.finalY + 8;

      verificaPagina(20);
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Defalcare pe categorii", margine, y);
      y += 4;
      doc.setFont(undefined, "normal");

      doc.autoTable({
        startY: y,
        margin: { left: margine, right: margine },
        head: [["Categorie", "Total", "OK", "NOK", "N/A", "Necompletat", "% Conformitate"]],
        body: sumar.categorii.map(function (cat) {
          return [cat.nume, cat.total, cat.ok, cat.nok, cat.na, cat.necompletat, formatProcent(cat.procent)];
        }),
        theme: "grid",
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 10;

      // 4. Sectiunea NOK
      verificaPagina(10);
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text("Itemi NOK", margine, y);
      y += 8;
      doc.setFont(undefined, "normal");

      if (sumar.listaNok.length === 0) {
        doc.setFontSize(10);
        doc.text("Niciun NOK inregistrat.", margine, y);
        y += 8;
      } else {
        sumar.listaNok.forEach(function (nokItem) {
          var poze = pozeNok[nokItem.nr] || [];
          verificaPagina(45 + (poze.length > 0 ? 40 : 0));

          doc.setFontSize(11);
          doc.setFont(undefined, "bold");
          var liniiTitlu = doc.splitTextToSize("Nr. " + nokItem.nr + " - " + nokItem.cerinta, latimeUtila);
          liniiTitlu.forEach(function (linie) {
            doc.text(linie, margine, y);
            y += 5;
          });
          doc.setFont(undefined, "normal");
          doc.setFontSize(9);

          var campuri = [
            "Ce s-a gasit: " + (nokItem.gasit || "-"),
            "Actiune imediata: " + (nokItem.actiune || "-"),
            "Actiune necesara: " + (nokItem.actiuneNecesara || "-"),
            "Responsabil: " + (nokItem.responsabil || "-") + "   Termen: " + formatDataScurta(nokItem.termen)
          ];
          campuri.forEach(function (camp) {
            var liniiImpartite = doc.splitTextToSize(camp, latimeUtila);
            liniiImpartite.forEach(function (linie) {
              doc.text(linie, margine, y);
              y += 5;
            });
          });

          if (poze.length > 0) {
            var latimePoza = 40;
            var xPoza = margine;
            poze.slice(0, LIMITA_POZE_PER_ITEM).forEach(function (dataUrl) {
              try {
                doc.addImage(dataUrl, "JPEG", xPoza, y, latimePoza, 35);
              } catch (eroareImagine) {
                console.error("Nu s-a putut adauga poza in PDF", eroareImagine);
              }
              xPoza += latimePoza + 5;
            });
            y += 40;
          }

          y += 6;
        });
      }

      // 5. Tabelul complet
      doc.addPage();
      y = margine;
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text("Toti itemii", margine, y);
      y += 4;
      doc.setFont(undefined, "normal");

      doc.autoTable({
        startY: y,
        margin: { left: margine, right: margine },
        head: [["Nr", "Categorie", "Cerinta", "Risc", "Status"]],
        body: itemi.map(function (item, index) {
          var raspuns = raspunsuri[index];
          return [item.nr, item.categorie, item.cerinta, item.risc, raspuns ? raspuns.status : "Necompletat"];
        }),
        theme: "grid",
        styles: { fontSize: 7 },
        columnStyles: { 2: { cellWidth: 75 } }
      });
      y = doc.lastAutoTable.finalY + 10;

      // 6. Semnatura
      verificaPagina(40);
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Semnatura", margine, y);
      y += 6;
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      if (semnaturaCurenta) {
        doc.addImage(semnaturaCurenta, "PNG", margine, y, 60, 28);
        y += 32;
      } else {
        doc.text("(fara semnatura)", margine, y);
        y += 8;
      }
      doc.text("Generat la: " + formatDataOra(new Date().toISOString()), margine, y);

      return doc;
    });
  }

  function escapeCSV(valoare) {
    var text = valoare || "";
    if (text.indexOf(DELIMITATOR_CSV) !== -1 || text.indexOf("\"") !== -1 || text.indexOf("\n") !== -1) {
      return "\"" + text.replace(/"/g, "\"\"") + "\"";
    }
    return text;
  }

  function peClicExportCsv() {
    if (!auditCurent || !auditCurent.id) return;
    try {
      genereazaExportCSV();
    } catch (eroare) {
      console.error("Nu s-a putut exporta CSV", eroare);
      alert("Exportul CSV nu a putut fi generat. Incearca din nou.");
    }
  }

  function genereazaExportCSV() {
    var randuri = [];
    randuri.push("sep=" + DELIMITATOR_CSV);
    randuri.push([
      "Nr", "Categorie", "Risc", "Cerinta", "Status", "Ce_ai_gasit",
      "Actiune_imediata", "Actiune_necesara", "Responsabil", "Termen", "Motiv_NA"
    ].join(DELIMITATOR_CSV));

    itemi.forEach(function (item, index) {
      var raspuns = raspunsuri[index];
      var linie = [
        item.nr,
        escapeCSV(item.categorie),
        item.risc,
        escapeCSV(item.cerinta),
        raspuns ? raspuns.status : "Necompletat",
        escapeCSV(raspuns && raspuns.gasit),
        escapeCSV(raspuns && raspuns.actiune),
        escapeCSV(raspuns && raspuns.actiuneNecesara),
        escapeCSV(raspuns && raspuns.responsabil),
        raspuns && raspuns.termen ? formatDataScurta(raspuns.termen) : "",
        escapeCSV(raspuns && raspuns.motivNA)
      ];
      randuri.push(linie.join(DELIMITATOR_CSV));
    });

    var continut = "\uFEFF" + randuri.join("\r\n");
    var blob = new Blob([continut], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = construiesteNumeDeBaza() + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      Promise.all([stergeAudit(id), stergePozeAudit(id)]).then(function () {
        randeazaListaAudituri();
        verificaAudituriExistente();
      });
    });

    zona.appendChild(butonNu);
    zona.appendChild(butonDa);
  }

  init();
})();

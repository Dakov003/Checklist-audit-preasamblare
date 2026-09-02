// Aplicatie audit preasamblare - Etapa 1
// Fara backend, fara framework. Stare tinuta in memorie pentru un audit in curs.
// Doar cateva preferinte mici (aria, masina, auditor) se retin in localStorage.

(function () {
  "use strict";

  var CHEIE_PREFERINTE = "auditPreferinte";

  // stare aplicatie
  var itemi = [];        // lista plata: { nr, risc, cerinta, categorie }
  var raspunsuri = [];   // paralela cu itemi: null sau obiect de raspuns
  var indexCurent = 0;
  var schimbSelectat = null;

  // elemente ecran start
  var ecranStart = document.getElementById("ecran-start");
  var inputAria = document.getElementById("input-aria");
  var inputMasina = document.getElementById("input-masina");
  var inputPn = document.getElementById("input-pn");
  var grupSchimb = document.getElementById("grup-schimb");
  var inputAuditor = document.getElementById("input-auditor");
  var dataOraAuto = document.getElementById("data-ora-auto");
  var butonIncepe = document.getElementById("buton-incepe");

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

  // ---------- pornire ----------

  function init() {
    incarcaPreferinte();
    actualizeazaDataOra();
    setInterval(actualizeazaDataOra, 30000);

    grupSchimb.addEventListener("click", pePeClicSchimb);
    butonIncepe.addEventListener("click", peClicIncepe);

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

    fetch("data/checklist.json")
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
  }

  function actualizeazaDataOra() {
    var acum = new Date();
    var zi = doiDigiti(acum.getDate());
    var luna = doiDigiti(acum.getMonth() + 1);
    var an = acum.getFullYear();
    var ora = doiDigiti(acum.getHours());
    var minut = doiDigiti(acum.getMinutes());
    dataOraAuto.textContent = zi + "." + luna + "." + an + " " + ora + ":" + minut;
  }

  function doiDigiti(numar) {
    return numar < 10 ? "0" + numar : "" + numar;
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

    salveazaPreferinte();

    raspunsuri = itemi.map(function () { return null; });
    indexCurent = 0;

    ecranStart.hidden = true;
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

  init();
})();

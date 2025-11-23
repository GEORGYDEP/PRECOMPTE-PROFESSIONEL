// --- GESTION DE L'ETAT DU JEU ---
let gameState = {
    studentName: "",
    studentEmail: "",
    scenario: { name: "", role: "", gross: 0 },
    results: {}
};

// --- FONCTIONS UTILES ---
// Arrondi mathématique à 2 décimales pour éviter les erreurs de calcul JS
function round2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Normalise une entrée utilisateur en nombre (accepte virgule et point)
function parseUserFloat(value) {
    if (typeof value === 'number') return value;
    if (!value) return NaN;

    // Supprime les espaces et remplace la virgule par un point
    const normalized = value.toString().trim().replace(/\s/g, '').replace(',', '.');
    return parseFloat(normalized);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function setFeedback(elementId, message, isError) {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    el.className = isError ? 'feedback error' : 'feedback success';
    el.innerText = message;
}

// --- LOGIQUE CALCULETTE ---
let calcInput = "";
function appendCalc(val) {
    calcInput += val;
    document.getElementById('calc-display').value = calcInput;
}
function clearCalc() {
    calcInput = "";
    document.getElementById('calc-display').value = "";
}
function calculate() {
    try {
        let res = eval(calcInput); 
        res = Math.round(res * 10000) / 10000; 
        document.getElementById('calc-display').value = res;
        calcInput = res.toString();
    } catch (e) {
        document.getElementById('calc-display').value = "Err";
        calcInput = "";
    }
}

// --- LOGIQUE DU JEU ---

// Validation Etape 0 : Login
function validateLogin() {
    const email = document.getElementById('student-email').value;
    const errorDiv = document.getElementById('login-error');
    
    // Regex pour vérifier l'email @istlm.org
    const regex = /^[a-zA-Z0-9._-]+@istlm\.org$/;
    
    if (regex.test(email)) {
        gameState.studentEmail = email;
        const parts = email.split('@')[0].split('.');
        let name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        if(parts.length > 1) name += " " + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        
        gameState.studentName = name;
        document.getElementById('display-name').innerText = name;
        
        showScreen('screen-scenario');
    } else {
        errorDiv.style.display = 'block';
    }
}

// Lancement Scénario
function startGame(name, role, gross) {
    gameState.scenario = { name, role, gross };
    
    document.querySelectorAll('.current-name').forEach(el => el.innerText = name);
    document.querySelectorAll('.current-role').forEach(el => el.innerText = role);
    document.querySelectorAll('.current-salary').forEach(el => el.innerText = gross.toLocaleString('fr-BE'));
    
    showScreen('screen-step1');
}

// Validation Etape 1 : Brut -> Brut Annuel
function checkStep1() {
    const gross = gameState.scenario.gross;

    // Récupération des éléments du DOM
    const inputOnss = document.getElementById('input-onss');
    const inputMonthlyTaxable = document.getElementById('input-monthly-taxable');
    const inputAnnualGross = document.getElementById('input-annual-gross');

    // Retirer toutes les classes d'erreur précédentes
    inputOnss.classList.remove('input-error');
    inputMonthlyTaxable.classList.remove('input-error');
    inputAnnualGross.classList.remove('input-error');

    const userOnss = parseUserFloat(inputOnss.value);
    const userMonthlyTaxable = parseUserFloat(inputMonthlyTaxable.value);
    const userAnnualGross = parseUserFloat(inputAnnualGross.value);

    // Vérifier si tous les champs sont remplis
    if (isNaN(userOnss) || isNaN(userMonthlyTaxable) || isNaN(userAnnualGross)) {
        let emptyFields = [];
        if (isNaN(userOnss)) {
            emptyFields.push("ONSS mensuel");
            inputOnss.classList.add('input-error');
        }
        if (isNaN(userMonthlyTaxable)) {
            emptyFields.push("Salaire Mensuel Imposable");
            inputMonthlyTaxable.classList.add('input-error');
        }
        if (isNaN(userAnnualGross)) {
            emptyFields.push("Revenu Annuel Brut");
            inputAnnualGross.classList.add('input-error');
        }
        setFeedback('feedback-step1', "⚠️ Veuillez remplir tous les champs : " + emptyFields.join(", "), true);
        return;
    }

    // ONSS = 13.07% (+ facteur 1.08 pour les ouvriers)
    const isWorker = gameState.scenario.role.toLowerCase().includes('ouvrier');
    const correctOnss = isWorker ? round2(gross * 0.1307 * 1.08) : round2(gross * 0.1307);
    const correctMonthlyTaxable = round2(gross - correctOnss);
    // Annuel = Mensuel imposable * 12
    const correctAnnualGross = round2(correctMonthlyTaxable * 12);

    let err = false;
    let msg = "";

    if (Math.abs(userOnss - correctOnss) > 0.05) {
        msg += "❌ ONSS (13,07%) incorrect. ";
        inputOnss.classList.add('input-error');
        err = true;
    }
    if (Math.abs(userMonthlyTaxable - correctMonthlyTaxable) > 0.05) {
        msg += "❌ Salaire imposable mensuel incorrect. ";
        inputMonthlyTaxable.classList.add('input-error');
        err = true;
    }
    if (Math.abs(userAnnualGross - correctAnnualGross) > 0.05) {
        msg += "❌ Revenu annuel (x 12) incorrect. ";
        inputAnnualGross.classList.add('input-error');
        err = true;
    }

    if (err) {
        setFeedback('feedback-step1', msg + "Vérifie les champs en rouge.", true);
    } else {
        gameState.results.annualGross = correctAnnualGross;
        document.querySelectorAll('.val-annual-gross').forEach(el => el.innerText = correctAnnualGross.toLocaleString('fr-BE'));
        setFeedback('feedback-step1', "✅ Correct ! Passons à la suite...", false);
        setTimeout(() => showScreen('screen-step2'), 1500);
    }
}

// Validation Etape 2 : Frais forfaitaires
function checkStep2() {
    const annualGross = gameState.results.annualGross;

    // Récupération des éléments du DOM
    const inputExpenses = document.getElementById('input-expenses');
    const inputNetTaxable = document.getElementById('input-net-taxable');

    // Retirer toutes les classes d'erreur précédentes
    inputExpenses.classList.remove('input-error');
    inputNetTaxable.classList.remove('input-error');

    const userExpenses = parseUserFloat(inputExpenses.value);
    const userNetTaxable = parseUserFloat(inputNetTaxable.value);

    // Vérifier si tous les champs sont remplis
    if (isNaN(userExpenses) || isNaN(userNetTaxable)) {
        let emptyFields = [];
        if (isNaN(userExpenses)) {
            emptyFields.push("Frais professionnels");
            inputExpenses.classList.add('input-error');
        }
        if (isNaN(userNetTaxable)) {
            emptyFields.push("Revenu Annuel Net Imposable");
            inputNetTaxable.classList.add('input-error');
        }
        setFeedback('feedback-step2', "⚠️ Veuillez remplir tous les champs : " + emptyFields.join(", "), true);
        return;
    }

    // Tableau frais forfaitaires
    let correctExpenses = 0;
    if (annualGross > 19166.67) {
        correctExpenses = 5750.00;
    } else {
        correctExpenses = round2(annualGross * 0.30);
    }
    const correctNetTaxable = round2(annualGross - correctExpenses);

    let err = false;
    let msg = "";

    if (Math.abs(userExpenses - correctExpenses) > 0.05) {
        msg += "❌ Frais forfaitaires incorrects. (Max 5.750 € si > 19.166,67 €) ";
        inputExpenses.classList.add('input-error');
        err = true;
    }
    if (Math.abs(userNetTaxable - correctNetTaxable) > 0.05) {
        msg += "❌ Soustraction (Brut annuel - Frais) incorrecte. ";
        inputNetTaxable.classList.add('input-error');
        err = true;
    }

    if (err) {
        setFeedback('feedback-step2', msg + "Vérifie les champs en rouge.", true);
        return;
    }

    gameState.results.netTaxable = correctNetTaxable;
    gameState.results.expenses = correctExpenses;
    document.querySelectorAll('.val-net-taxable').forEach(el => el.innerText = correctNetTaxable.toLocaleString('fr-BE'));

    setFeedback('feedback-step2', "✅ Parfait ! Revenu net imposable validé.", false);
    setTimeout(() => showScreen('screen-step3'), 1500);
}

// Validation Etape 3 : Impôt de base (Barème)
function checkStep3() {
    const netTaxable = gameState.results.netTaxable;

    // Récupération des éléments du DOM
    const inputBaseTax = document.getElementById('input-base-tax');

    // Retirer toutes les classes d'erreur précédentes
    inputBaseTax.classList.remove('input-error');

    const userBaseTax = parseUserFloat(inputBaseTax.value);

    // Vérifier si le champ est rempli
    if (isNaN(userBaseTax)) {
        inputBaseTax.classList.add('input-error');
        setFeedback('feedback-step3', "⚠️ Veuillez remplir le montant de l'impôt de base.", true);
        return;
    }

    // Barème de base
    let correctBaseTax = 0;
    if (netTaxable <= 15830) {
        correctBaseTax = netTaxable * 0.2675;
    } else if (netTaxable <= 27940) {
        correctBaseTax = 4234.53 + ((netTaxable - 15830) * 0.4280);
    } else if (netTaxable <= 48350) {
        correctBaseTax = 9417.61 + ((netTaxable - 27940) * 0.4815);
    } else {
        correctBaseTax = 19245.03 + ((netTaxable - 48350) * 0.5350);
    }
    correctBaseTax = round2(correctBaseTax);

    if (Math.abs(userBaseTax - correctBaseTax) > 0.10) {
        inputBaseTax.classList.add('input-error');
        setFeedback('feedback-step3', "❌ Erreur. Vérifie bien la tranche utilisée dans le barème.", true);
    } else {
        gameState.results.baseTax = correctBaseTax;
        document.querySelectorAll('.val-base-tax').forEach(el => el.innerText = correctBaseTax.toLocaleString('fr-BE'));
        setFeedback('feedback-step3', "✅ Excellent calcul d'impôt !", false);
        setTimeout(() => showScreen('screen-step4'), 1500);
    }
}

// Validation Etape 4 : Finalisation
function checkStep4() {
    const baseTax = gameState.results.baseTax;

    // Récupération des éléments du DOM
    const inputAnnualTax = document.getElementById('input-annual-tax');
    const inputFinalPrp = document.getElementById('input-final-prp');

    // Retirer toutes les classes d'erreur précédentes
    inputAnnualTax.classList.remove('input-error');
    inputFinalPrp.classList.remove('input-error');

    const userAnnualTax = parseUserFloat(inputAnnualTax.value);
    const userFinalPrp = parseUserFloat(inputFinalPrp.value);

    // Vérifier si tous les champs sont remplis
    if (isNaN(userAnnualTax) || isNaN(userFinalPrp)) {
        let emptyFields = [];
        if (isNaN(userAnnualTax)) {
            emptyFields.push("Impôt Annuel");
            inputAnnualTax.classList.add('input-error');
        }
        if (isNaN(userFinalPrp)) {
            emptyFields.push("Précompte Professionnel Mensuel");
            inputFinalPrp.classList.add('input-error');
        }
        setFeedback('feedback-step4', "⚠️ Veuillez remplir tous les champs : " + emptyFields.join(", "), true);
        return;
    }

    // Quotité exemptée (Impôt = 2830.15)
    const reduction = 2830.15;
    const correctAnnualTax = round2(baseTax - reduction);

    // Mensuel = Annuel / 12
    const correctFinalPrp = round2(correctAnnualTax / 12);

    let err = false;
    let msg = "";

    if (Math.abs(userAnnualTax - correctAnnualTax) > 0.05) {
        msg += "❌ Impôt annuel (Base - 2.830,15 €) incorrect. ";
        inputAnnualTax.classList.add('input-error');
        err = true;
    }
    if (Math.abs(userFinalPrp - correctFinalPrp) > 0.05) {
        msg += "❌ Précompte mensuel (/ 12) incorrect. ";
        inputFinalPrp.classList.add('input-error');
        err = true;
    }

    if (err) {
        setFeedback('feedback-step4', msg + "Vérifie les champs en rouge.", true);
        return;
    }

    gameState.results.finalPrp = correctFinalPrp;
    gameState.results.annualTax = correctAnnualTax;

    fillFinalReport();
    setFeedback('feedback-step4', "✅ Calcul terminé avec succès !", false);
    setTimeout(() => showScreen('screen-end'), 1500);
}

// Remplissage fiche finale
function fillFinalReport() {
    document.querySelector('.final-student-name').innerText = gameState.studentName;
    document.querySelector('.final-student-email').innerText = gameState.studentEmail;
    
    const r = gameState.results;
    const gross = gameState.scenario.gross;
    const isWorker = gameState.scenario.role.toLowerCase().includes('ouvrier');
    const onss = isWorker ? round2(gross * 0.1307 * 1.08) : round2(gross * 0.1307);
    const monthlyTax = round2(gross - onss);

    // Formatage affichage
    document.querySelector('.res-onss').innerText = onss.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-monthly-taxable').innerText = monthlyTax.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-annual-gross').innerText = r.annualGross.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-expenses').innerText = r.expenses.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-net-taxable').innerText = r.netTaxable.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-base-tax').innerText = r.baseTax.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-annual-tax').innerText = r.annualTax.toLocaleString('fr-BE', {minimumFractionDigits: 2});
    document.querySelector('.res-final-prp').innerText = r.finalPrp.toLocaleString('fr-BE', {minimumFractionDigits: 2});
}
import { url } from "inspector";

var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var fs = require('fs');
const async = require('async');

var forEachTimeout = require('foreach-timeout');

class GetAllMatchUrl {

    private domainUrl = "https://www.flashscore.com";
    private timeAtLaunch;
    private urlError = [];
    private timeOut; // en ms

    constructor(timeout) {
        this.timeAtLaunch = Date.now();
        this.timeOut = timeout;
        this.getAllTournamentUrl((allTournamentUrl) => {
            this.getAllTournamentYearUrl(allTournamentUrl);
        });
    }

    /**
     * Récupération des urls de tout les tournois ATP
     * Retourne une liste de 99 URLs
     */
    getAllTournamentUrl(callback) {
        let that = this;
        let url = this.domainUrl + "/tennis";
        request(url, function (err, res, body) {
            if (err)
                this.displayARequestError(url, err, -1);
            // Load le HTML body avec cheerio
            let $ = cheerio.load(body);

            let tournoisListSingleTab = [];
            $('#lmenu_5724 li').each(function(index, element){
                tournoisListSingleTab[index] = that.domainUrl + $(element).find('a').attr('href') + 'archive';
            });
            callback(tournoisListSingleTab);
        });
    }

    /**
     * Récupération des urls de toutes les éditions de tout les tournois ATP
     * @param urls en entré toutes les urls pointant vers tout les pages archive des tournois
     * Retourne un peu plus de 1k urls
     */
    getAllTournamentYearUrl(urls) {
        let promises = [];
        let nbRequest = 0;

        forEachTimeout(
            urls,
            url => Promise.resolve(
                // Effectue la requète
                rp({
                    uri: url,
                    transform: (body) => {return cheerio.load(body)}
                })
                // Le $ correspond au retour de cherrio.load(body)
                .then(($) => {
                    let tournoisListYearSingleTab = [];
                    $('tbody tr').each((index, element) => {
                        tournoisListYearSingleTab[index] = this.domainUrl + $(element).find('a').attr('href') + 'results';
                    });
                    this.displayARequestSucces(url, nbRequest++);
                    return tournoisListYearSingleTab;
                })
                .catch((err) => this.displayARequestError(url, err, nbRequest++)) 
            ),
            this.timeOut
        ).then((tournoisListYearDoubleTab) => {
            // Une fois toutes les promises résolues le code dans la then est exécuté
            this.displayTimeAndMsg("allTournamentYearUrl");
            let tournoisListYearTab = this.convertDoubleToSingleTab(tournoisListYearDoubleTab);
            this.saveAsFile(tournoisListYearTab, "allTournamentYearUrl");
            this.saveAsFile(this.urlError, "allTournamentYearUrlERROR");
            this.flushUrlErr();
            // Lance l'étape 3
            this.getAllMatchUrl(tournoisListYearTab);
        });
    }

    // TODO les matchs de qualif dans certains tournois quand il y a beacoup de match

    /**
     * Récupération des urls de tout les match de toutes les éditions de tout les tournois ATP
     * @param urls en entré toutes les urls de toutes les éditions de tout les tournois aTP
     * Retournera (on sait pas encore) entre 60k et 90k urls
     */
    getAllMatchUrl(urls) {
        let promises = [];
        let nbRequest = 0;

        forEachTimeout(
            urls,
            url => Promise.resolve(
                // Effectue la requète
                rp({
                    uri: url,
                    transform: (body) => {return cheerio.load(body)}
                })
                // Le $ correspond au retour de cherrio.load(body)
                .then(($) => {
                    let matchsList = [];

                    let baseMatchUrl = 'https://www.flashscore.com/match/';
                    let stringImmonde = $('#tournament-page-data-results').html();
                    // ... hard¬ZEE÷6NGC5uGN¬ZB÷3473162 ... [sur 12k]
            
                    let idPrefix = "AA&#xF7;" // String.fromCharCode(247); //"AA÷"; ==> &#xF7;
                    // taille avant 7
                    // taille match 9

                    let i = stringImmonde.indexOf(idPrefix);
                    let j = 0;
                    while (i > 0) {
                        matchsList[j] = baseMatchUrl + stringImmonde.substring(i + 8, i + 7 + 9);
                        j++;
                        i = stringImmonde.indexOf(idPrefix, i + 7 + 9);
                    }

                    this.displayARequestSucces(url, nbRequest++)
                    return matchsList;
                })
                .catch((err) => {
                    this.displayARequestError(url, err, nbRequest++);
                    this.stockUrlError(url);
                }) 
            ),
            this.timeOut
        ).then((matchsListDoubleTab) => {
            // Une fois toutes les promises résolues le code dans la then est exécuté
            this.displayTimeAndMsg("allMatchUrl");
            let matchsListTab = this.convertDoubleToSingleTab(matchsListDoubleTab);
            this.saveAsFile(matchsListTab, "matchUrl");
            this.saveAsFile(this.urlError, "matchUrlERROR");
        });
    }

    /*
    Utils
    */

    displayARequestSucces(url, nbRequest) {
        console.log("[ " + (nbRequest + 1) + " ] OK - " + url);
    }

    displayARequestError(url, err, nbRequest) {
        console.error("[ " + (nbRequest + 1) + " ] ERR - " + url);
        console.error(err);
    }

    displayTimeAndMsg(stape) {
        let t2 = Date.now()
        let dif = (t2 - this.timeAtLaunch) / 1000;
        console.log("\n\tEtape : [" + stape + "] effectué en : " + dif + "\n");  
    }
    
    stockUrlError(url) {
        this.urlError.push(url);
    }

    flushUrlErr() {
        this.urlError = [];
    }

    convertDoubleToSingleTab(doubleTab) {
        let singleTab = [];
        doubleTab.forEach(element => {
            element.forEach(element2 => {
                singleTab.push(element2);
            });
        });
        return singleTab;
    }

    saveAsFile(tab, fileName) {
        fs.writeFile("output/" + fileName + ".json", JSON.stringify(tab), function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file " + fileName + " was saved with " +  tab.length + " entries !\n");
        }); 
    }
}

// Avec 5 s de timeout entre deux requètes
let getAllMatchUrl = new GetAllMatchUrl(1000);
"use strict";
exports.__esModule = true;
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var fs = require('fs');
var async = require('async');
var forEachTimeout = require('foreach-timeout');
var GetAllMatchUrl = /** @class */ (function () {
    function GetAllMatchUrl(timeout) {
        var _this = this;
        this.domainUrl = "https://www.flashscore.com";
        this.urlError = [];
        this.timeAtLaunch = Date.now();
        this.timeOut = timeout;
        this.getAllTournamentUrl(function (allTournamentUrl) {
            _this.getAllTournamentYearUrl(allTournamentUrl);
        });
    }
    /**
     * Récupération des urls de tout les tournois ATP
     * Retourne une liste de 99 URLs
     */
    GetAllMatchUrl.prototype.getAllTournamentUrl = function (callback) {
        var that = this;
        var url = this.domainUrl + "/tennis";
        request(url, function (err, res, body) {
            if (err)
                this.displayARequestError(url, err, -1);
            // Load le HTML body avec cheerio
            var $ = cheerio.load(body);
            var tournoisListSingleTab = [];
            $('#lmenu_5724 li').each(function (index, element) {
                tournoisListSingleTab[index] = that.domainUrl + $(element).find('a').attr('href') + 'archive';
            });
            callback(tournoisListSingleTab);
        });
    };
    /**
     * Récupération des urls de toutes les éditions de tout les tournois ATP
     * @param urls en entré toutes les urls pointant vers tout les pages archive des tournois
     * Retourne un peu plus de 1k urls
     */
    GetAllMatchUrl.prototype.getAllTournamentYearUrl = function (urls) {
        var _this = this;
        var promises = [];
        var nbRequest = 0;
        forEachTimeout(urls, function (url) { return Promise.resolve(
        // Effectue la requète
        rp({
            uri: url,
            transform: function (body) { return cheerio.load(body); }
        })
            // Le $ correspond au retour de cherrio.load(body)
            .then(function ($) {
            var tournoisListYearSingleTab = [];
            $('tbody tr').each(function (index, element) {
                tournoisListYearSingleTab[index] = _this.domainUrl + $(element).find('a').attr('href') + 'results';
            });
            _this.displayARequestSucces(url, nbRequest++);
            return tournoisListYearSingleTab;
        })["catch"](function (err) { return _this.displayARequestError(url, err, nbRequest++); })); }, this.timeOut).then(function (tournoisListYearDoubleTab) {
            // Une fois toutes les promises résolues le code dans la then est exécuté
            _this.displayTimeAndMsg("allTournamentYearUrl");
            var tournoisListYearTab = _this.convertDoubleToSingleTab(tournoisListYearDoubleTab);
            _this.saveAsFile(tournoisListYearTab, "allTournamentYearUrl");
            _this.saveAsFile(_this.urlError, "allTournamentYearUrlERROR");
            _this.flushUrlErr();
            // Lance l'étape 3
            _this.getAllMatchUrl(tournoisListYearTab);
        });
    };
    // TODO les matchs de qualif dans certains tournois quand il y a beacoup de match
    /**
     * Récupération des urls de tout les match de toutes les éditions de tout les tournois ATP
     * @param urls en entré toutes les urls de toutes les éditions de tout les tournois aTP
     * Retournera (on sait pas encore) entre 60k et 90k urls
     */
    GetAllMatchUrl.prototype.getAllMatchUrl = function (urls) {
        var _this = this;
        var promises = [];
        var nbRequest = 0;
        forEachTimeout(urls, function (url) { return Promise.resolve(
        // Effectue la requète
        rp({
            uri: url,
            transform: function (body) { return cheerio.load(body); }
        })
            // Le $ correspond au retour de cherrio.load(body)
            .then(function ($) {
            var matchsList = [];
            var baseMatchUrl = 'https://www.flashscore.com/match/';
            var stringImmonde = $('#tournament-page-data-results').html();
            // ... hard¬ZEE÷6NGC5uGN¬ZB÷3473162 ... [sur 12k]
            var idPrefix = "AA&#xF7;"; // String.fromCharCode(247); //"AA÷"; ==> &#xF7;
            // taille avant 7
            // taille match 9
            var i = stringImmonde.indexOf(idPrefix);
            var j = 0;
            while (i > 0) {
                matchsList[j] = baseMatchUrl + stringImmonde.substring(i + 8, i + 7 + 9);
                j++;
                i = stringImmonde.indexOf(idPrefix, i + 7 + 9);
            }
            _this.displayARequestSucces(url, nbRequest++);
            return matchsList;
        })["catch"](function (err) {
            _this.displayARequestError(url, err, nbRequest++);
            _this.stockUrlError(url);
        })); }, this.timeOut).then(function (matchsListDoubleTab) {
            // Une fois toutes les promises résolues le code dans la then est exécuté
            _this.displayTimeAndMsg("allMatchUrl");
            var matchsListTab = _this.convertDoubleToSingleTab(matchsListDoubleTab);
            _this.saveAsFile(matchsListTab, "matchUrl");
            _this.saveAsFile(_this.urlError, "matchUrlERROR");
        });
    };
    /*
    Utils
    */
    GetAllMatchUrl.prototype.displayARequestSucces = function (url, nbRequest) {
        console.log("[ " + (nbRequest + 1) + " ] OK - " + url);
    };
    GetAllMatchUrl.prototype.displayARequestError = function (url, err, nbRequest) {
        console.error("[ " + (nbRequest + 1) + " ] ERR - " + url);
        console.error(err);
    };
    GetAllMatchUrl.prototype.displayTimeAndMsg = function (stape) {
        var t2 = Date.now();
        var dif = (t2 - this.timeAtLaunch) / 1000;
        console.log("\n\tEtape : [" + stape + "] effectué en : " + dif + "\n");
    };
    GetAllMatchUrl.prototype.stockUrlError = function (url) {
        this.urlError.push(url);
    };
    GetAllMatchUrl.prototype.flushUrlErr = function () {
        this.urlError = [];
    };
    GetAllMatchUrl.prototype.convertDoubleToSingleTab = function (doubleTab) {
        var singleTab = [];
        doubleTab.forEach(function (element) {
            element.forEach(function (element2) {
                singleTab.push(element2);
            });
        });
        return singleTab;
    };
    GetAllMatchUrl.prototype.saveAsFile = function (tab, fileName) {
        fs.writeFile("output/" + fileName + ".json", JSON.stringify(tab), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file " + fileName + " was saved with " + tab.length + " entries !\n");
        });
    };
    return GetAllMatchUrl;
}());
// Avec 5 s de timeout entre deux requètes
var getAllMatchUrl = new GetAllMatchUrl(1000);

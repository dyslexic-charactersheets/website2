#!/usr/bin/env nodejs

const express = require('express');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');

const conf = require('./src/conf');
const message = require('./src/message');

// set up the http engine
const app = express();
app.use(cookieParser());
app.set('view engine', 'hbs');
app.use(express.static('../public'));

// engines
const gameData = require('./src/gamedata');
const pathfinder2 = require('./src/pathfinder2-server');

// i18n
const i18n = require('./src/i18n')(conf);
hbs.registerHelper('__', function(str) {
    return i18n.translate(str, this.lang);
});

hbs.registerHelper('eq', (params) => params[0] == params[1]);

// notes
const quotes = require('./src/quotes');
hbs.registerHelper('note',  function() {
    var quote = quotes();

    return `<aside class='float right top'>
        <aside class='note'>
        <blockquote class='${quote.noteClass}'>${quote.quote}</blockquote>
        <cite>&mdash; ${quote.author}</cite>
        </aside>
    </aside>`;
});

// login
const auth = require('./src/auth')(conf);

function renderLogin(req, res, lang) {
    auth.setup();
    return res.render('login', {
        title: 'Dyslexic Character Sheets',
        lang: lang,
        translators_login_url: auth.translatorsLoginURL(),
        patreon_login_url: auth.patreonLoginURL(),
        allow_just_login: auth.allowJustLogin,
    });
}

// app.get('/oauth/redirect', auth.oauthRedirect);
app.get('/auth/patreon-redirect', auth.patreonRedirect);

app.get('/auth/login', (req, res) => renderLogin(req, res, 'en'));
app.get('/:lang/auth/login', (req, res) => renderLogin(req, res, req.params.lang));

app.get('/auth/translators-login', auth.translatorsLogin);
app.get('/auth/token-login', auth.tokenLogin);

var loginGuard = function (req, res, lang, fn) {
    if (conf('require_login') && !auth.isLoggedIn(req)) {
        return renderLogin(req, res, lang);
    }
    return fn();
};

// ordinary pages
app.get('/howto', (req, res) => loginGuard(req, res, 'en', () => res.render('howto', { title: 'How to', lang: 'en' })));
app.get('/:lang/howto', (req, res) => loginGuard(req, res, req.params.lang, () => res.render('howto', { title: 'How to', lang: req.params.lang })));

app.get('/legal', (req, res) => loginGuard(req, res, 'en', () => res.render('legal', { title: 'Legal information', lang: 'en' })));
app.get('/:lang/legal', (req, res) => loginGuard(req, res, req.params.lang, () => res.render('legal', { title: 'Legal information', lang: req.params.lang })));

app.get('/opensource', (req, res) => loginGuard(req, res, 'en', () => res.render('opensource', { title: 'Open source', lang: 'en' })));
app.get('/:lang/opensource', (req, res) => loginGuard(req, res, req.params.lang, () => res.render('opensource', { title: 'Open source', lang: req.params.lang })));

app.get('/', (req, res) => loginGuard(req, res, 'en', () => res.render('index', { title: 'Dyslexic Character Sheets', lang: 'en', isLoggedIn: auth.isLoggedIn(req) })));
app.get('/:lang', (req, res) => loginGuard(req, res, req.params.lang, () => res.render('index', { title: 'Dyslexic Character Sheets', lang: req.params.lang })));

app.post('/message', (req, res) => {
    sendMessage(res);
    res.redirect('/message/sent');
    console.log("Message!");

    var message = req.query.message;
    var author = req.query.author;
    var email = req.query.email;
});

// character sheet builder forms
function renderBuildForm(req, res, lang) {
    var game = req.params.game;
    var data = gameData(game);

    var buildForm = "build-form";
    if (game == "pathfinder2") buildForm = "build-pathfinder2";

    res.render(buildForm, {
        lang: lang,
        gameData: data,
    });
}

app.get('/build/:game', (req, res) => loginGuard(req, res, 'en', () => renderBuildForm(req, res, 'en')));
app.get('/:lang/build/:game', (req, res) => loginGuard(req, res, req.params.lang, () => renderBuildForm(req, res, req.params.lang)));

// let's build a character sheet
app.post('/render/pathfinder2', (req, res) => loginGuard(req, res, 'en', () => pathfinder2.render(req, res, 'en')));

app.post('/:lang/render/pathfinder2', (req, res) => loginGuard(req, res, req.params.lang, () => pathfinder2.render(req, res, req.params.lang)));

// go!
app.listen(3000, () => console.log('Listening on port 3000'));
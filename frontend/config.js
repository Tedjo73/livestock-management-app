/* Livestock App config — auto-detects local dev vs production */
(function () {
  var h = location.hostname;
  var local = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(h) || location.protocol === 'file:';
  var host = (location.protocol === 'file:' || !h) ? 'localhost' : h;
  var PRODUCTION_API = 'https://YOUR-BACKEND-URL/api'; // replace before deploying
  window.AGRI_CONFIG = {
    API_URL: local ? 'http://' + host + ':4001/api' : PRODUCTION_API,
    MAIN_APP_URL: '',
  };
})();

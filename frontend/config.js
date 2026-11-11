/* Livestock App config — auto-detects local dev vs production */
(function () {
  var h = location.hostname;
  var local = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(h) || location.protocol === 'file:';
  var host = (location.protocol === 'file:' || !h) ? 'localhost' : h;

  // 1. Allow runtime override via localStorage or window global
  var runtimeOverride = (typeof localStorage !== 'undefined' && localStorage.getItem('AGRI_API_URL')) || window.__AGRI_API_URL__;

  // 2. Production API endpoint:
  // Replace with your actual Render backend URL once deployed, e.g.:
  // 'https://livestock-management-api.onrender.com/api'
  // Or leave as '/api' if routing through Vercel's rewrite proxy in vercel.json.
  var PRODUCTION_API = runtimeOverride || 'https://livestock-management-api.onrender.com/api';

  window.AGRI_CONFIG = {
    API_URL: local ? 'http://' + host + ':4001/api' : PRODUCTION_API,
    MAIN_APP_URL: '',
  };
})();

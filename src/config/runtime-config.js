(function (global) {
  var defaults = {
    demoAuthMode: true,
    demoEmailCode: "246810",
    supabaseFunctionsUrl: "https://luantbqqzftcgyuedtmf.functions.supabase.co"
  };
  global.MindPulseConfig = Object.assign(defaults, global.MindPulseConfig || {});
})(window);

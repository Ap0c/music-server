function pug_attr(t,e,n,r){if(e===!1||null==e||!e&&("class"===t||"style"===t))return"";if(e===!0)return" "+(r?t:t+'="'+t+'"');if("function"==typeof e.toISOString)e=e.toISOString();else if("string"!=typeof e&&(e=JSON.stringify(e),!n&&-1!==e.indexOf('"')))return" "+t+"='"+e.replace(/'/g,"&#39;")+"'";return n&&(e=pug_escape(e))," "+t+'="'+e+'"'}
function pug_escape(e){var a=""+e,t=pug_match_html.exec(a);if(!t)return e;var r,c,n,s="";for(r=t.index,c=0;r<a.length;r++){switch(a.charCodeAt(r)){case 34:n="&quot;";break;case 38:n="&amp;";break;case 60:n="&lt;";break;case 62:n="&gt;";break;default:continue}c!==r&&(s+=a.substring(c,r)),c=r+1,s+=n}return c!==r?s+a.substring(c,r):s}
var pug_match_html=/["&<>]/;
function pug_rethrow(n,e,r,t){if(!(n instanceof Error))throw n;if(!("undefined"==typeof window&&e||t))throw n.message+=" on line "+r,n;try{t=t||require("fs").readFileSync(e,"utf8")}catch(i){pug_rethrow(n,null,r)}var a=3,o=t.split("\n"),h=Math.max(r-a,0),s=Math.min(o.length,r+a),a=o.slice(h,s).map(function(n,e){var t=e+h+1;return(t==r?"  > ":"    ")+t+"| "+n}).join("\n");throw n.path=e,n.message=(e||"Pug")+":"+r+"\n"+a+"\n\n"+n.message,n}function listTemplate(locals) {var pug_html = "", pug_mixins = {}, pug_interp;var pug_debug_filename, pug_debug_line;try {;var locals_for_with = (locals || {});(function (list, url) {;pug_debug_line = 1;pug_debug_filename = "views\u002Flist.pug";
if (list) {
;pug_debug_line = 2;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cul\u003E";
;pug_debug_line = 3;pug_debug_filename = "views\u002Flist.pug";
// iterate list
var pug_obj0 = list;
if ('number' == typeof pug_obj0.length) {

  for (var pug_index0 = 0, pug_length0 = pug_obj0.length; pug_index0 < pug_length0; pug_index0++) {
    var val = pug_obj0[pug_index0];

;pug_debug_line = 4;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cli" + (pug_attr("data-id", val.id, true, false)) + "\u003E";
;pug_debug_line = 5;pug_debug_filename = "views\u002Flist.pug";
if (url) {
;pug_debug_line = 6;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Ca" + (" class=\"list-name\""+pug_attr("href", url(val.id), true, false)) + "\u003E";
;pug_debug_line = 6;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = val.name) ? "" : pug_interp)) + "\u003C\u002Fa\u003E";
}
else {
;pug_debug_line = 8;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cspan class=\"list-name song\"\u003E";
;pug_debug_line = 8;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = val.name) ? "" : pug_interp)) + "\u003C\u002Fspan\u003E";
}
;pug_debug_line = 9;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cspan class=\"plus\"\u003E";
;pug_debug_line = 9;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "+\u003C\u002Fspan\u003E\u003C\u002Fli\u003E";
  }

} else {
  var pug_length0 = 0;
  for (var pug_index0 in pug_obj0) {
    pug_length0++;
    var val = pug_obj0[pug_index0];

;pug_debug_line = 4;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cli" + (pug_attr("data-id", val.id, true, false)) + "\u003E";
;pug_debug_line = 5;pug_debug_filename = "views\u002Flist.pug";
if (url) {
;pug_debug_line = 6;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Ca" + (" class=\"list-name\""+pug_attr("href", url(val.id), true, false)) + "\u003E";
;pug_debug_line = 6;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = val.name) ? "" : pug_interp)) + "\u003C\u002Fa\u003E";
}
else {
;pug_debug_line = 8;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cspan class=\"list-name song\"\u003E";
;pug_debug_line = 8;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + (pug_escape(null == (pug_interp = val.name) ? "" : pug_interp)) + "\u003C\u002Fspan\u003E";
}
;pug_debug_line = 9;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "\u003Cspan class=\"plus\"\u003E";
;pug_debug_line = 9;pug_debug_filename = "views\u002Flist.pug";
pug_html = pug_html + "+\u003C\u002Fspan\u003E\u003C\u002Fli\u003E";
  }

}

pug_html = pug_html + "\u003C\u002Ful\u003E";
}}.call(this,"list" in locals_for_with?locals_for_with.list:typeof list!=="undefined"?list:undefined,"url" in locals_for_with?locals_for_with.url:typeof url!=="undefined"?url:undefined));} catch (err) {pug_rethrow(err, pug_debug_filename, pug_debug_line);};return pug_html;}

function escapeHTML(html){
  return new Option(html).innerHTML
}

function page_getProperties () {
  var showcss=function(){function e(e){return function(s){'string'==typeof s&&(s=document.getElementById(s)),'object'==typeof s&&s&&s.cssdom&&(s=s.cssdom),s||(s=$0);var t=s.sheet||s.styleSheet;if(t && t.cssText)return t.cssText;if(t)for(var n='',o=t.cssRules||t.rules,r=0,c=o.length;r<c;r++)n+=o[r].cssText+'\n';return e?e(n):console.log(n)}}return e}();
  var copy = { __proto__: null }
  if($0 && $0.tagName=='STYLE')
    showcss(css=>copy.text = css)($0)
  return copy
}

function update(){
  chrome.devtools.inspectedWindow.eval(
    '(' + page_getProperties.toString() + ')()',
    (result, isError)=>{
      const {text} = result
      root.innerHTML = text
      ? '<pre>'+ escapeHTML(text) +'</pre>'
      : tips
    }
  )
}

const root = document.getElementById('container')
const button = document.getElementById('button')
const tips = root.innerHTML

update()

button.onclick = update


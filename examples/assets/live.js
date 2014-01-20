var templateInput = document.getElementById('template'),
    jsInput = document.getElementById('js'),
    output = document.getElementById('result');

var templateEdit = CodeMirror.fromTextArea(templateInput, {
  mode: "text/html"
});

var jsEdit = CodeMirror.fromTextArea(jsInput, {
  mode: "text/javascript"
});

function render() {
  var template = jsx2.transform(templateEdit.getValue());
  var tpl_fn = new Function(template);
  tpl_fn();

  var js_fn = new Function(jsEdit.getValue());
  var View = js_fn();

  React.renderComponent(
    View(),
    output
  );
}



render();

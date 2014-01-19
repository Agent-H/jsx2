var utils = require('./utils');

/* Template object's prototype */
var templateProto = {
  componentWillMount: function(){
    this.templateContext = this;
  },

  getTemplateContext: function(ctx) {
    return this.templateContext;
  }
}

exports.template = function(render, template) {
  template = template || {};

  utils.extend(templateProto, template);
  template.render = function() {
    return render.call(this, this.getTemplateContext());
  }
}

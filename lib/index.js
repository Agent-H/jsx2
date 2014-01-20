
var transformer = require('./transformer');

if (typeof window !== 'undefined') {
  console.warn("JSX2 templates should be precompiled in production.");
}

module.exports = transformer;

/*
  transformer API:
  - jsxify(text) returns a JSX-able text representation for the given template text
  - transform(text) transforms a template text into plain javascript ready to run

  Template object:
    React tip:
      include your templates as mixins
      ```javascript
      React.createClass({
        mixins: [myTemplate]
        // Don't define any render method
      });
      ```
    - getTemplateContext(): This method is called to get template's ctx object before rendering
      By default it returns this.templateContext. If you wish to use a static context such
      as this.state, directly set this.templateContext, if you want more control, override
      this method and return your context.
    - templateContext: context sent to the template by the default implementation of
      getTemplateContext(). Refers to "this" by default.
*/

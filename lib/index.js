
var transformer = require('./transformer');
var runtime = require('./runtime');
var extend = require('./utils').extend;

if (typeof window !== 'undefined') {
  console.warn("You are using the full react_templates lib in your browser. " +
        "You should use the runtime library instead for production and " +
        "in development too if you pre-render your templates.");
}

extend(transformer, exports);
/*
  transformer API:
  - jsxify(text) returns a JSX-able text representation for the given template text
  - transform(text) transforms a template text into plain javascript ready to run
*/

extend(runtime, exports);
/*
  runtime API:
    - tempalte(render) constructs a template with the provided render function.
      The constructor is invoked by the generated templates, you don't need to use it.

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

module.exports =
class TemplateHelper
  @addTemplate: (parent, htmlString) ->
    template = document.createElement('template')
    template.innerHTML = htmlString
    parent.appendChild(template)
    template

  @renderTemplate: (template) ->
    document.importNode(template.content, true)
